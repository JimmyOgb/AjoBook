// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @title TestUSDT — Open-mint mock USDT for X Layer Testnet (1952) and local Anvil testing.
/// @dev 6-decimal ERC-20 with a public `mint()` faucet. NOT for mainnet deployment.
contract TestUSDT is ERC20 {
    constructor() ERC20("Test USDT", "USDT") {}

    function decimals() public pure override returns (uint8) {
        return 6;
    }

    /// @notice Open faucet — anyone can mint any amount. Testnet / local use only.
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
