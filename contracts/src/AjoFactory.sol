// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AjoCircle} from "./AjoCircle.sol";

/// @title AjoFactory — Permissionless Creator for AjoCircle Exercise Books
/// @notice Deploys and indexes AjoCircle instances on X Layer, tracking human
///         metadata and TapeOut Circuit ID bindings.
contract AjoFactory {
    // ─── State ───────────────────────────────────────────────────────────
    address[] internal _allCircles;

    // user => circles they created
    mapping(address => address[]) internal _userCircles;

    // circle address => TapeOut container address
    mapping(address => address) public circleContainer;

    // ─── Events ──────────────────────────────────────────────────────────
    event CircleCreated(
        address indexed circle,
        address indexed host,
        string circleName,
        string hostName,
        uint256 contributionAmount,
        uint256 turnDuration,
        bool requireDeposit,
        bytes32 tapeOutCircuitId,
        address tapeOutContainer
    );

    // ─── Create Circle ────────────────────────────────────────────────────
    /// @notice Deploy a new AjoCircle exercise book.
    function createCircle(
        string memory _circleName,
        string memory _hostName,
        address _token,
        uint256 _contributionAmount,
        uint256 _turnDuration,
        uint256 _maxMembers,
        bool _requireDeposit,
        uint256 _protocolFeeBps,
        address _feeCollector,
        bytes32 _tapeOutCircuitId,
        bytes32 _tapeOutProcessor,
        address _tapeOutContainer
    ) external returns (address) {
        AjoCircle circle = new AjoCircle(
            _circleName,
            msg.sender,
            _hostName,
            _token,
            _contributionAmount,
            _turnDuration,
            _maxMembers,
            _requireDeposit,
            _protocolFeeBps,
            _feeCollector,
            _tapeOutCircuitId,
            _tapeOutProcessor
        );

        address addr = address(circle);
        _allCircles.push(addr);
        _userCircles[msg.sender].push(addr);
        circleContainer[addr] = _tapeOutContainer;

        emit CircleCreated(
            addr,
            msg.sender,
            _circleName,
            _hostName,
            _contributionAmount,
            _turnDuration,
            _requireDeposit,
            _tapeOutCircuitId,
            _tapeOutContainer
        );

        return addr;
    }

    // ─── Views ───────────────────────────────────────────────────────────
    function getAllCircles() external view returns (address[] memory) {
        return _allCircles;
    }

    function getUserCircles(address user) external view returns (address[] memory) {
        return _userCircles[user];
    }

    function totalCircles() external view returns (uint256) {
        return _allCircles.length;
    }
}
