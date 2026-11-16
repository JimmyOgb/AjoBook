// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title AjoCircle — Non-Custodial Rotational Savings (Ajo / Esusu) Exercise Book
/// @notice Implements on-chain ROSCA with human member names, 1x deposit safety,
///         late-join catch-up math, pull-claim fallbacks, and zero admin custody.
contract AjoCircle is ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ─── Types ───────────────────────────────────────────────────────────
    enum Status { OPEN, ACTIVE, COMPLETED }

    struct Member {
        uint256 slot;           // 1-indexed payout turn
        string name;            // Human display name in the exercise book
        uint256 deposit;        // Remaining locked security deposit
        bool exists;
    }

    // ─── Immutables & Config ─────────────────────────────────────────────
    string  public circleName;
    address public immutable host;
    string  public hostName;

    IERC20  public immutable token;
    uint256 public immutable contributionAmount;
    uint256 public immutable turnDuration;        // in seconds (e.g. 300 for 5m demo, 86400 for daily)
    uint256 public maxMembers;
    bool    public immutable requireDeposit;      // flat 1x contribution security deposit
    uint256 public immutable protocolFeeBps;      // e.g. 50 = 0.5%
    address public immutable feeCollector;

    // TapeOut metadata
    bytes32 public immutable tapeOutCircuitId;
    bytes32 public immutable tapeOutProcessor;

    // ─── State ───────────────────────────────────────────────────────────
    Status  public status;
    uint256 public currentTurn;                   // 1-indexed once ACTIVE
    uint256 public turnDeadline;                  // timestamp ceiling for current turn
    uint256 public memberCount;
    uint256 public totalSlots;                    // equals memberCount or expands on late-join
    bool    public lateJoinOpen;                  // host can toggle late joining

    // Ordered member registry
    address[] public memberAddresses;
    // slot => member address (1-indexed)
    mapping(uint256 => address) public slotToMember;
    // member address => Member data
    mapping(address => Member) public members;

    // turn => member => paid?
    mapping(uint256 => mapping(address => bool)) public hasContributed;
    // turn => member => missed without deposit coverage?
    mapping(uint256 => mapping(address => bool)) public hasMissed;
    // turn => total contributions collected
    mapping(uint256 => uint256) public turnCollected;
    // turn => payout already disbursed?
    mapping(uint256 => bool) public turnDisbursed;

    // Pull payments (no stuck funds / catch-up balances)
    mapping(address => uint256) public claimableBalance;
    uint256 public totalFeesCollected;

    // ─── Events (Exercise Book History) ──────────────────────────────────
    event MemberJoined(address indexed member, string name, uint256 slot, uint256 depositLocked);
    event CircleStarted(uint256 totalMembers, uint256 firstTurnDeadline);
    event TurnPaid(address indexed member, uint256 indexed turn, uint256 amount);
    event TurnMissed(address indexed member, uint256 indexed turn);
    event DepositUsedToCover(address indexed member, uint256 indexed turn, uint256 amount);
    event PotPaidOut(uint256 indexed turn, address indexed recipient, string recipientName, uint256 netAmount, uint256 fee);
    event LateJoinCatchUp(address indexed newMember, string name, uint256 newSlot, uint256 catchUpAmount, uint256 completedTurns);
    event DepositRefunded(address indexed member, uint256 amount);
    event ClaimedPending(address indexed member, uint256 amount);
    event CircleCompleted();
    event LateJoinToggled(bool isOpen);

    // ─── Errors ──────────────────────────────────────────────────────────
    error InvalidParams();
    error CircleNotOpen();
    error CircleNotActive();
    error CircleNotCompleted();
    error AlreadyMember();
    error MemberNotFound();
    error NotHost();
    error NeedAtLeastTwoMembers();
    error AlreadyContributed();
    error TurnNotExpired();
    error TurnAlreadyDisbursed();
    error LateJoinClosed();
    error NothingToClaim();

    // ─── Constructor ─────────────────────────────────────────────────────
    constructor(
        string memory _circleName,
        address _host,
        string memory _hostName,
        address _token,
        uint256 _contributionAmount,
        uint256 _turnDuration,
        uint256 _maxMembers,
        bool _requireDeposit,
        uint256 _protocolFeeBps,
        address _feeCollector,
        bytes32 _tapeOutCircuitId,
        bytes32 _tapeOutProcessor
    ) {
        if (_token == address(0)) revert InvalidParams();
        if (_contributionAmount == 0) revert InvalidParams();
        if (_turnDuration == 0) revert InvalidParams();
        if (_maxMembers < 2 || _maxMembers > 50) revert InvalidParams();
        if (_protocolFeeBps > 1000) revert InvalidParams(); // max 10%
        if (_feeCollector == address(0)) revert InvalidParams();

        circleName = _circleName;
        host = _host;
        hostName = _hostName;
        token = IERC20(_token);
        contributionAmount = _contributionAmount;
        turnDuration = _turnDuration;
        maxMembers = _maxMembers;
        requireDeposit = _requireDeposit;
        protocolFeeBps = _protocolFeeBps;
        feeCollector = _feeCollector;
        tapeOutCircuitId = _tapeOutCircuitId;
        tapeOutProcessor = _tapeOutProcessor;

        status = Status.OPEN;
        lateJoinOpen = true;
    }

    // ─── Join Circle (Open Phase) ─────────────────────────────────────────
    /// @notice Join the circle in order (assigns next available turn).
    /// @param memberName Display name for the exercise book (e.g. "Chidi", "Ngozi").
    function joinCircle(string calldata memberName) external nonReentrant {
        if (status != Status.OPEN) revert CircleNotOpen();
        if (members[msg.sender].exists) revert AlreadyMember();
        if (memberCount >= maxMembers) revert InvalidParams();

        uint256 newSlot = memberCount + 1;
        uint256 depositAmount = requireDeposit ? contributionAmount : 0;

        members[msg.sender] = Member({
            slot: newSlot,
            name: memberName,
            deposit: depositAmount,
            exists: true
        });

        memberAddresses.push(msg.sender);
        slotToMember[newSlot] = msg.sender;
        memberCount++;
        totalSlots = memberCount;

        if (depositAmount > 0) {
            token.safeTransferFrom(msg.sender, address(this), depositAmount);
        }

        emit MemberJoined(msg.sender, memberName, newSlot, depositAmount);

        // Auto-start if all initial slots filled
        if (memberCount == maxMembers) {
            _start();
        }
    }

    // ─── Host Start Circle ────────────────────────────────────────────────
    /// @notice Host can start circle once at least 2 members have joined.
    function startCircle() external nonReentrant {
        if (msg.sender != host) revert NotHost();
        if (status != Status.OPEN) revert CircleNotOpen();
        if (memberCount < 2) revert NeedAtLeastTwoMembers();

        totalSlots = memberCount;
        _start();
    }

    function _start() internal {
        status = Status.ACTIVE;
        currentTurn = 1;
        turnDeadline = block.timestamp + turnDuration;
        emit CircleStarted(memberCount, turnDeadline);
    }

    // ─── Contribute (Active Turn) ─────────────────────────────────────────
    /// @notice Contribute contributionAmount for current active turn.
    function contribute() external nonReentrant {
        if (status != Status.ACTIVE) revert CircleNotActive();
        if (!members[msg.sender].exists) revert MemberNotFound();
        if (hasContributed[currentTurn][msg.sender]) revert AlreadyContributed();

        hasContributed[currentTurn][msg.sender] = true;
        turnCollected[currentTurn] += contributionAmount;

        token.safeTransferFrom(msg.sender, address(this), contributionAmount);

        emit TurnPaid(msg.sender, currentTurn, contributionAmount);

        // If everyone has paid for current turn, auto-payout immediately
        if (_allPaid(currentTurn)) {
            _disburseTurn(currentTurn);
        }
    }

    // ─── Close Turn (Deadline Fallback & Slashing) ─────────────────────────
    /// @notice When turn deadline expires, anyone can close the turn.
    ///         Unpaid members with deposit have their deposit deducted.
    ///         Unpaid members without deposit are marked MISSED.
    ///         Collected funds are immediately disbursed to turn recipient.
    function closeTurn() external nonReentrant {
        if (status != Status.ACTIVE) revert CircleNotActive();
        if (block.timestamp <= turnDeadline) revert TurnNotExpired();
        if (turnDisbursed[currentTurn]) revert TurnAlreadyDisbursed();

        uint256 turn = currentTurn;

        // Check each member's contribution for this turn
        for (uint256 i = 0; i < memberAddresses.length; i++) {
            address mAddr = memberAddresses[i];
            if (!hasContributed[turn][mAddr]) {
                Member storage m = members[mAddr];
                if (m.deposit >= contributionAmount) {
                    // Deduct from security deposit to cover turn
                    m.deposit -= contributionAmount;
                    hasContributed[turn][mAddr] = true;
                    turnCollected[turn] += contributionAmount;
                    emit DepositUsedToCover(mAddr, turn, contributionAmount);
                } else {
                    // Record as missed in the on-chain exercise book
                    hasMissed[turn][mAddr] = true;
                    emit TurnMissed(mAddr, turn);
                }
            }
        }

        _disburseTurn(turn);
    }

    // ─── Late Joining With Fair Catch-Up ──────────────────────────────────
    /// @notice Join an already-running circle at the end of the line.
    /// @dev Newcomer pays 1x deposit (if required) + (completedTurns * contributionAmount) catch-up.
    ///      The catch-up amount is credited equally to each prior turn's collector!
    function joinLate(string calldata memberName) external nonReentrant {
        if (status != Status.ACTIVE) revert CircleNotActive();
        if (!lateJoinOpen) revert LateJoinClosed();
        if (members[msg.sender].exists) revert AlreadyMember();

        uint256 completedTurns = currentTurn - 1;
        uint256 catchUpAmount = completedTurns * contributionAmount;
        uint256 depositAmount = requireDeposit ? contributionAmount : 0;
        uint256 totalDue = catchUpAmount + depositAmount;

        // Assign next slot at end of queue
        totalSlots++;
        uint256 newSlot = totalSlots;

        members[msg.sender] = Member({
            slot: newSlot,
            name: memberName,
            deposit: depositAmount,
            exists: true
        });

        memberAddresses.push(msg.sender);
        slotToMember[newSlot] = msg.sender;
        memberCount++;

        // Collect funds from newcomer
        if (totalDue > 0) {
            token.safeTransferFrom(msg.sender, address(this), totalDue);
        }

        // Credit catch-up funds to prior turn collectors (1 contribution each)
        for (uint256 t = 1; t <= completedTurns; t++) {
            address pastRecipient = slotToMember[t];
            if (pastRecipient != address(0)) {
                claimableBalance[pastRecipient] += contributionAmount;
            }
        }

        emit MemberJoined(msg.sender, memberName, newSlot, depositAmount);
        emit LateJoinCatchUp(msg.sender, memberName, newSlot, catchUpAmount, completedTurns);
    }

    // ─── Disburse Turn Pot ────────────────────────────────────────────────
    function _disburseTurn(uint256 turn) internal {
        turnDisbursed[turn] = true;

        address recipient = slotToMember[turn];
        uint256 grossPot = turnCollected[turn];
        uint256 fee = (grossPot * protocolFeeBps) / 10_000;
        uint256 netPayout = grossPot - fee;

        totalFeesCollected += fee;

        if (fee > 0) {
            token.safeTransfer(feeCollector, fee);
        }

        // Transfer payout to recipient; if transfer fails, credit claimableBalance
        if (netPayout > 0 && recipient != address(0)) {
            _safeTransferWithPullFallback(recipient, netPayout);
        }

        string memory recName = members[recipient].name;
        emit PotPaidOut(turn, recipient, recName, netPayout, fee);

        // Advance turn or complete circle
        if (turn >= totalSlots) {
            status = Status.COMPLETED;
            emit CircleCompleted();
        } else {
            currentTurn = turn + 1;
            turnDeadline = block.timestamp + turnDuration;
        }
    }

    // ─── Pull Payment / Claim Pending ─────────────────────────────────────
    /// @notice Reclaim any pending catch-up distributions or fallback balances.
    function claimPending() external nonReentrant {
        uint256 amount = claimableBalance[msg.sender];
        if (amount == 0) revert NothingToClaim();

        claimableBalance[msg.sender] = 0;
        token.safeTransfer(msg.sender, amount);

        emit ClaimedPending(msg.sender, amount);
    }

    // ─── Refund Unused Deposit (At Completion) ────────────────────────────
    /// @notice Members reclaim remaining security deposits once all turns complete.
    function withdrawDeposit() external nonReentrant {
        if (status != Status.COMPLETED) revert CircleNotCompleted();
        if (!members[msg.sender].exists) revert MemberNotFound();

        uint256 amount = members[msg.sender].deposit;
        if (amount == 0) revert NothingToClaim();

        members[msg.sender].deposit = 0;
        token.safeTransfer(msg.sender, amount);

        emit DepositRefunded(msg.sender, amount);
    }

    // ─── Host Toggles ─────────────────────────────────────────────────────
    function setLateJoinOpen(bool _open) external {
        if (msg.sender != host) revert NotHost();
        lateJoinOpen = _open;
        emit LateJoinToggled(_open);
    }

    // ─── View Helpers (Exercise Book Ledger) ──────────────────────────────
    function _allPaid(uint256 turn) internal view returns (bool) {
        for (uint256 i = 0; i < memberAddresses.length; i++) {
            if (!hasContributed[turn][memberAddresses[i]]) {
                return false;
            }
        }
        return true;
    }

    function _safeTransferWithPullFallback(address to, uint256 amount) internal {
        // Safe transfer attempt
        (bool success, bytes memory data) = address(token).call(
            abi.encodeWithSelector(IERC20.transfer.selector, to, amount)
        );
        if (success && (data.length == 0 || abi.decode(data, (bool)))) {
            // success
        } else {
            // Fallback to pull balance so circle never halts
            claimableBalance[to] += amount;
        }
    }

    function getAllMembers() external view returns (address[] memory) {
        return memberAddresses;
    }

    function getMemberDetails(address addr)
        external
        view
        returns (
            uint256 slot,
            string memory name,
            uint256 deposit,
            bool exists
        )
    {
        Member storage m = members[addr];
        return (m.slot, m.name, m.deposit, m.exists);
    }

    function getTurnMemberStatus(uint256 turn, address addr)
        external
        view
        returns (
            bool paid,
            bool missed
        )
    {
        return (hasContributed[turn][addr], hasMissed[turn][addr]);
    }
}
