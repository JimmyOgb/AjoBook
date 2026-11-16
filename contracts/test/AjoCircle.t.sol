// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test, console2} from "forge-std/Test.sol";
import {AjoCircle} from "../src/AjoCircle.sol";
import {AjoFactory} from "../src/AjoFactory.sol";
import {TestUSDT} from "../src/mocks/TestUSDT.sol";

contract AjoCircleTest is Test {
    TestUSDT public usdt;
    AjoFactory public factory;
    AjoCircle public circle;

    address public feeCollector = makeAddr("feeCollector");
    address public host = makeAddr("host");

    address public chidi = makeAddr("chidi");   // slot 1
    address public ngozi = makeAddr("ngozi");   // slot 2
    address public amaka = makeAddr("amaka");   // slot 3
    address public emeka = makeAddr("emeka");   // late joiner

    uint256 public constant CONTRIBUTION = 100e6; // 100 USDT (6 decimals)
    uint256 public constant TURN_DURATION = 300;  // 5 minutes (Live Demo cadence)
    uint256 public constant MAX_MEMBERS = 3;
    uint256 public constant FEE_BPS = 50;        // 0.5%

    bytes32 public constant CIRCUIT_ID = bytes32(uint256(0x89c7d413));
    bytes32 public constant PROCESSOR  = bytes32(bytes("LAGOS_ARM"));

    function setUp() public {
        usdt = new TestUSDT();
        factory = new AjoFactory();

        vm.prank(host);
        address circleAddr = factory.createCircle(
            "Lagos Founders Ajo",
            "Tunde (Host)",
            address(usdt),
            CONTRIBUTION,
            TURN_DURATION,
            MAX_MEMBERS,
            true, // requireDeposit = true (1x flat deposit)
            FEE_BPS,
            feeCollector,
            CIRCUIT_ID,
            PROCESSOR,
            address(0x4012)
        );
        circle = AjoCircle(circleAddr);

        // Mint test tokens
        usdt.mint(chidi, 10_000e6);
        usdt.mint(ngozi, 10_000e6);
        usdt.mint(amaka, 10_000e6);
        usdt.mint(emeka, 10_000e6);

        // Approvals
        vm.prank(chidi);
        usdt.approve(address(circle), type(uint256).max);
        vm.prank(ngozi);
        usdt.approve(address(circle), type(uint256).max);
        vm.prank(amaka);
        usdt.approve(address(circle), type(uint256).max);
        vm.prank(emeka);
        usdt.approve(address(circle), type(uint256).max);
    }

    // ─── Join Order & Identity ────────────────────────────────────────────
    function test_JoinOrderAndDepositLock() public {
        uint256 chidiBalBefore = usdt.balanceOf(chidi);

        vm.prank(chidi);
        circle.joinCircle("Chidi");

        (uint256 slot, string memory name, uint256 deposit, bool exists) = circle.getMemberDetails(chidi);
        assertEq(slot, 1);
        assertEq(name, "Chidi");
        assertEq(deposit, CONTRIBUTION); // 1x deposit locked
        assertTrue(exists);
        assertEq(usdt.balanceOf(chidi), chidiBalBefore - CONTRIBUTION);

        // Second member joins in order
        vm.prank(ngozi);
        circle.joinCircle("Ngozi");

        (uint256 slot2, string memory name2,,) = circle.getMemberDetails(ngozi);
        assertEq(slot2, 2);
        assertEq(name2, "Ngozi");
        assertEq(circle.memberCount(), 2);
    }

    // ─── Host Start (Minimum 2 Members) ───────────────────────────────────
    function test_HostCanStartWithTwoMembers() public {
        vm.prank(chidi);
        circle.joinCircle("Chidi");

        // Host cannot start with only 1 member
        vm.prank(host);
        vm.expectRevert(AjoCircle.NeedAtLeastTwoMembers.selector);
        circle.startCircle();

        vm.prank(ngozi);
        circle.joinCircle("Ngozi");

        // Host starts circle with 2 members
        vm.prank(host);
        circle.startCircle();

        assertEq(uint256(circle.status()), uint256(AjoCircle.Status.ACTIVE));
        assertEq(circle.currentTurn(), 1);
        assertEq(circle.totalSlots(), 2);
        assertGt(circle.turnDeadline(), block.timestamp);
    }

    // ─── Auto-Start When Max Members Join ─────────────────────────────────
    function test_AutoStartAtMaxMembers() public {
        vm.prank(chidi);
        circle.joinCircle("Chidi");
        vm.prank(ngozi);
        circle.joinCircle("Ngozi");
        vm.prank(amaka);
        circle.joinCircle("Amaka");

        // Reached maxMembers (3) -> auto-started
        assertEq(uint256(circle.status()), uint256(AjoCircle.Status.ACTIVE));
        assertEq(circle.currentTurn(), 1);
        assertEq(circle.totalSlots(), 3);
    }

    // ─── Turn Contribution & Immediate Payout ─────────────────────────────
    function test_TurnContributionAndPayout() public {
        _joinThreeMembers();

        // Turn 1 pot: 3 * 100e6 = 300e6. Fee: 1.5e6 (0.5%). Net: 298.5e6
        uint256 chidiBalBefore = usdt.balanceOf(chidi);

        vm.prank(chidi);
        circle.contribute();
        vm.prank(ngozi);
        circle.contribute();
        vm.prank(amaka);
        circle.contribute();

        // Turn 1 completes immediately and disburses to Chidi (slot 1)
        uint256 netPayout = 300e6 - (300e6 * FEE_BPS / 10_000);
        assertEq(usdt.balanceOf(chidi), chidiBalBefore - CONTRIBUTION + netPayout);
        assertEq(circle.currentTurn(), 2);
    }

    // ─── Missed Turn Covered by 1x Deposit ────────────────────────────────
    function test_MissedTurnDeductedFromDeposit() public {
        _joinThreeMembers();

        // Turn 1: everyone pays -> Chidi gets paid
        vm.prank(chidi);
        circle.contribute();
        vm.prank(ngozi);
        circle.contribute();
        vm.prank(amaka);
        circle.contribute();

        assertEq(circle.currentTurn(), 2);

        // Turn 2: Chidi and Ngozi pay, but Amaka misses!
        vm.prank(chidi);
        circle.contribute();
        vm.prank(ngozi);
        circle.contribute();

        // Warp past turn deadline
        vm.warp(circle.turnDeadline() + 1);

        // Check Amaka's deposit before
        (,, uint256 amakaDepositBefore,) = circle.getMemberDetails(amaka);
        assertEq(amakaDepositBefore, CONTRIBUTION);

        // Anyone calls closeTurn()
        circle.closeTurn();

        // Amaka's deposit was deducted to cover her share
        (,, uint256 amakaDepositAfter,) = circle.getMemberDetails(amaka);
        assertEq(amakaDepositAfter, 0);

        // Ngozi (slot 2) still received full pot on schedule!
        assertEq(circle.currentTurn(), 3);
    }

    // ─── Late Joining With Fair Catch-Up Math ─────────────────────────────
    function test_LateJoinCatchUpDistribution() public {
        _joinThreeMembers();

        // Turn 1: Chidi gets paid
        vm.prank(chidi);
        circle.contribute();
        vm.prank(ngozi);
        circle.contribute();
        vm.prank(amaka);
        circle.contribute();

        // Circle is now on Turn 2 (completedTurns = 1)
        assertEq(circle.currentTurn(), 2);

        uint256 chidiClaimableBefore = circle.claimableBalance(chidi);

        // Emeka joins late at Turn 2!
        // Completed turns = 1 -> Catch-up amount = 1 * 100e6 = 100e6
        // Plus 1x deposit = 100e6. Total due = 200e6
        uint256 emekaBalBefore = usdt.balanceOf(emeka);

        vm.prank(emeka);
        circle.joinLate("Emeka");

        assertEq(usdt.balanceOf(emeka), emekaBalBefore - (2 * CONTRIBUTION));
        assertEq(circle.totalSlots(), 4);

        // Chidi (past collector) was credited 100e6 in claimableBalance!
        assertEq(circle.claimableBalance(chidi), chidiClaimableBefore + CONTRIBUTION);

        // Chidi claims his pending catch-up payment
        uint256 chidiBal = usdt.balanceOf(chidi);
        vm.prank(chidi);
        circle.claimPending();
        assertEq(usdt.balanceOf(chidi), chidiBal + CONTRIBUTION);
    }

    // ─── Deposit Refund at Completion ─────────────────────────────────────
    function test_DepositRefundAtCompletion() public {
        _joinThreeMembers();

        // Turn 1
        vm.prank(chidi);
        circle.contribute();
        vm.prank(ngozi);
        circle.contribute();
        vm.prank(amaka);
        circle.contribute();

        // Turn 2
        vm.prank(chidi);
        circle.contribute();
        vm.prank(ngozi);
        circle.contribute();
        vm.prank(amaka);
        circle.contribute();

        // Turn 3
        vm.prank(chidi);
        circle.contribute();
        vm.prank(ngozi);
        circle.contribute();
        vm.prank(amaka);
        circle.contribute();

        // All 3 turns completed!
        assertEq(uint256(circle.status()), uint256(AjoCircle.Status.COMPLETED));

        // Honest members withdraw their unused security deposit
        uint256 chidiBefore = usdt.balanceOf(chidi);
        vm.prank(chidi);
        circle.withdrawDeposit();
        assertEq(usdt.balanceOf(chidi), chidiBefore + CONTRIBUTION);
    }

    // ─── Helpers ──────────────────────────────────────────────────────────
    function _joinThreeMembers() internal {
        vm.prank(chidi);
        circle.joinCircle("Chidi");
        vm.prank(ngozi);
        circle.joinCircle("Ngozi");
        vm.prank(amaka);
        circle.joinCircle("Amaka");
    }
}
