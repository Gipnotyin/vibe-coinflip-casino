// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {console2} from "forge-std/console2.sol";
import {CoinFlipCasino} from "../src/CoinFlipCasino.sol";
import {MockVRFCoordinatorV2Plus} from "../src/mocks/MockVRFCoordinatorV2Plus.sol";

interface VmLocalDeploy {
    function addr(uint256 privateKey) external returns (address keyAddr);
    function envUint(string calldata name) external view returns (uint256 value);
    function startBroadcast(uint256 privateKey) external;
    function stopBroadcast() external;
}

/// @notice Deploys a local Anvil-only casino with mock VRF for UI E2E testing.
contract DeployLocal {
    VmLocalDeploy private constant vm = VmLocalDeploy(address(uint160(uint256(keccak256("hevm cheat code")))));

    uint256 private constant LOCAL_CHAIN_ID = 31_337;
    uint256 private constant LOCAL_INITIAL_BANKROLL = 100 ether;
    bytes32 private constant LOCAL_KEY_HASH = bytes32(uint256(1));
    uint256 private constant LOCAL_SUBSCRIPTION_ID = 1;
    uint32 private constant LOCAL_CALLBACK_GAS_LIMIT = 250_000;
    uint16 private constant LOCAL_REQUEST_CONFIRMATIONS = 3;

    error WrongChain(uint256 actual, uint256 expected);

    function run() external returns (MockVRFCoordinatorV2Plus coordinator, CoinFlipCasino casino) {
        if (block.chainid != LOCAL_CHAIN_ID) {
            revert WrongChain(block.chainid, LOCAL_CHAIN_ID);
        }

        uint256 privateKey = vm.envUint("LOCAL_ANVIL_PRIVATE_KEY");
        address deployer = vm.addr(privateKey);

        CoinFlipCasino.VrfConfig memory config = CoinFlipCasino.VrfConfig({
            keyHash: LOCAL_KEY_HASH,
            subscriptionId: LOCAL_SUBSCRIPTION_ID,
            callbackGasLimit: LOCAL_CALLBACK_GAS_LIMIT,
            requestConfirmations: LOCAL_REQUEST_CONFIRMATIONS,
            nativePayment: false
        });

        vm.startBroadcast(privateKey);
        coordinator = new MockVRFCoordinatorV2Plus();
        casino = new CoinFlipCasino(deployer, address(coordinator), config);
        casino.fundBankroll{value: LOCAL_INITIAL_BANKROLL}();
        vm.stopBroadcast();

        console2.log("Local CoinFlipCasino deployed", address(casino));
        console2.log("Local MockVRFCoordinatorV2Plus deployed", address(coordinator));
        console2.log("Owner", deployer);
        console2.log("Chain id", block.chainid);
        console2.log("Initial bankroll wei", LOCAL_INITIAL_BANKROLL);
        console2.log("Frontend env:");
        console2.log("NEXT_PUBLIC_ENABLE_LOCAL_ANVIL=true");
        console2.log("NEXT_PUBLIC_COIN_FLIP_CASINO_ADDRESS=", address(casino));
        console2.log("Fulfill env:");
        console2.log("LOCAL_MOCK_VRF_COORDINATOR=", address(coordinator));
        console2.log("LOCAL_VRF_REQUEST_ID=<request id from pending bet UI>");
        console2.log("LOCAL_RANDOM_WORD=2 # even=heads, odd=tails");
    }
}
