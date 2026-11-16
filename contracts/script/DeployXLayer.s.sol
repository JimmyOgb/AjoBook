// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {TestUSDT} from "../src/mocks/TestUSDT.sol";
import {AjoFactory} from "../src/AjoFactory.sol";
import {AjoCircle} from "../src/AjoCircle.sol";

contract DeployXLayer is Script {
    // Official USDT on X Layer Mainnet (OKX zkEVM)
    address public constant XLAYER_MAINNET_USDT = 0x1E4a5963aBFD975d8c9021ce480b42188849D41d;

    // TapeOut Circuit ID & Metadata for Lagos Founders Ajo
    bytes32 public constant TAPE_CIRCUIT_ID = 0x89c7d413eaf725cf920a6122d64a098862f6b3b55239a5ecbcda6d6a8b1a3299;
    bytes32 public constant TAPE_PROCESSOR = bytes32(bytes("LAGOS_ARM"));
    address public constant TAPE_CONTAINER = 0x4012000000000000000000000000000000004012; // #4012.lagos.arm.tape

    function run() external {
        uint256 deployerPrivateKey;
        address deployer;

        try vm.envUint("PRIVATE_KEY") returns (uint256 pk) {
            deployerPrivateKey = pk;
            deployer = vm.addr(pk);
        } catch {
            try vm.envBytes32("PRIVATE_KEY") returns (bytes32 pkBytes) {
                deployerPrivateKey = uint256(pkBytes);
                deployer = vm.addr(deployerPrivateKey);
            } catch {
                // Default Anvil key for local runs
                deployerPrivateKey = 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80;
                deployer = vm.addr(deployerPrivateKey);
            }
        }

        console2.log("Deployer address:", deployer);
        console2.log("Chain ID:", block.chainid);

        vm.startBroadcast(deployerPrivateKey);

        address usdtAddress;
        if (block.chainid == 196) {
            console2.log("Deploying on X Layer Mainnet (196)");
            usdtAddress = XLAYER_MAINNET_USDT;
        } else {
            console2.log("Deploying TestUSDT on test/dev network:", block.chainid);
            TestUSDT mockUsdt = new TestUSDT();
            usdtAddress = address(mockUsdt);
            // Mint 50,000 USDT to deployer for testing
            mockUsdt.mint(deployer, 50_000e6);
        }

        // Deploy AjoFactory
        AjoFactory factory = new AjoFactory();
        console2.log("AjoFactory deployed at:", address(factory));

        // Create Seed Demo Circle: "Lagos Founders Ajo — 100 USDT / Turn"
        uint256 contributionAmount = 100e6; // 100 USDT
        uint256 turnDuration = 300; // 5 minutes (Live Demo cadence)
        uint256 maxMembers = 4;
        bool requireDeposit = true; // 1x contribution security deposit
        uint256 protocolFeeBps = 50; // 0.5%
        address feeCollector = deployer;

        address seedCircle = factory.createCircle(
            "Lagos Founders Ajo",
            "Tunde (Host)",
            usdtAddress,
            contributionAmount,
            turnDuration,
            maxMembers,
            requireDeposit,
            protocolFeeBps,
            feeCollector,
            TAPE_CIRCUIT_ID,
            TAPE_PROCESSOR,
            TAPE_CONTAINER
        );

        console2.log("Seed AjoCircle deployed at:", seedCircle);

        vm.stopBroadcast();

        // Write frontend deployment configuration
        string memory jsonObj = "deployments";
        vm.serializeUint(jsonObj, "chainId", block.chainid);
        vm.serializeAddress(jsonObj, "usdt", usdtAddress);
        vm.serializeAddress(jsonObj, "factory", address(factory));
        vm.serializeAddress(jsonObj, "seedCircle", seedCircle);
        vm.serializeBytes32(jsonObj, "tapeOutCircuitId", TAPE_CIRCUIT_ID);
        vm.serializeBytes32(jsonObj, "tapeOutProcessor", TAPE_PROCESSOR);
        string memory finalJson = vm.serializeAddress(jsonObj, "tapeOutContainer", TAPE_CONTAINER);

        string memory outputPath = "../frontend/src/config/deployments.json";
        try vm.writeJson(finalJson, outputPath) {
            console2.log("Successfully wrote deployments to", outputPath);
        } catch {
            console2.log("Warning: Could not write json to disk directly, outputting to console:");
            console2.log(finalJson);
        }
    }
}
