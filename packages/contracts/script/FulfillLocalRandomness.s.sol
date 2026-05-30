// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {console2} from "forge-std/console2.sol";
import {MockVRFCoordinatorV2Plus} from "../src/mocks/MockVRFCoordinatorV2Plus.sol";

interface VmLocalFulfill {
    function envAddress(string calldata name) external view returns (address value);
    function envUint(string calldata name) external view returns (uint256 value);
    function startBroadcast(uint256 privateKey) external;
    function stopBroadcast() external;
}

/// @notice Resolves a local Anvil pending bet through the mock VRF coordinator.
contract FulfillLocalRandomness {
    VmLocalFulfill private constant vm = VmLocalFulfill(address(uint160(uint256(keccak256("hevm cheat code")))));

    uint256 private constant LOCAL_CHAIN_ID = 31_337;

    error WrongChain(uint256 actual, uint256 expected);

    function run() external {
        if (block.chainid != LOCAL_CHAIN_ID) {
            revert WrongChain(block.chainid, LOCAL_CHAIN_ID);
        }

        uint256 privateKey = vm.envUint("LOCAL_ANVIL_PRIVATE_KEY");
        address coordinatorAddress = vm.envAddress("LOCAL_MOCK_VRF_COORDINATOR");
        uint256 requestId = vm.envUint("LOCAL_VRF_REQUEST_ID");
        uint256 randomWord = vm.envUint("LOCAL_RANDOM_WORD");

        vm.startBroadcast(privateKey);
        MockVRFCoordinatorV2Plus(coordinatorAddress).fulfill(requestId, randomWord);
        vm.stopBroadcast();

        console2.log("Local VRF fulfilled");
        console2.log("Mock coordinator", coordinatorAddress);
        console2.log("Request id", requestId);
        console2.log("Random word", randomWord);
        console2.log("Result side", randomWord % 2 == 0 ? "HEADS" : "TAILS");
    }
}
