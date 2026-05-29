// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {console2} from "forge-std/console2.sol";
import {CoinFlipCasino} from "../src/CoinFlipCasino.sol";

interface VmDeploy {
    function addr(uint256 privateKey) external returns (address keyAddr);
    function envAddress(string calldata name) external view returns (address value);
    function envBool(string calldata name) external view returns (bool value);
    function envBytes32(string calldata name) external view returns (bytes32 value);
    function envUint(string calldata name) external view returns (uint256 value);
    function startBroadcast(uint256 privateKey) external;
    function stopBroadcast() external;
}

/// @notice Deploys CoinFlipCasino to Sepolia using environment-provided VRF settings.
contract DeployCoinFlipCasino {
    VmDeploy private constant vm = VmDeploy(address(uint160(uint256(keccak256("hevm cheat code")))));

    error ConfigValueTooLarge(string name, uint256 value);

    function run() external returns (CoinFlipCasino casino) {
        uint256 privateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(privateKey);

        address vrfCoordinator = vm.envAddress("VRF_COORDINATOR");
        bytes32 vrfKeyHash = vm.envBytes32("VRF_KEY_HASH");
        uint256 vrfSubscriptionId = vm.envUint("VRF_SUBSCRIPTION_ID");
        uint32 callbackGasLimit = _envUint32("VRF_CALLBACK_GAS_LIMIT");
        uint16 requestConfirmations = _envUint16("VRF_REQUEST_CONFIRMATIONS");
        bool nativePayment = vm.envBool("VRF_NATIVE_PAYMENT");
        uint256 initialBankroll = vm.envUint("INITIAL_BANKROLL_WEI");

        CoinFlipCasino.VrfConfig memory config = CoinFlipCasino.VrfConfig({
            keyHash: vrfKeyHash,
            subscriptionId: vrfSubscriptionId,
            callbackGasLimit: callbackGasLimit,
            requestConfirmations: requestConfirmations,
            nativePayment: nativePayment
        });

        vm.startBroadcast(privateKey);
        casino = new CoinFlipCasino(deployer, vrfCoordinator, config);

        if (initialBankroll > 0) {
            casino.fundBankroll{value: initialBankroll}();
        }
        vm.stopBroadcast();

        console2.log("CoinFlipCasino deployed", address(casino));
        console2.log("Owner", deployer);
        console2.log("VRF coordinator", vrfCoordinator);
        console2.log("VRF subscription id", vrfSubscriptionId);
        console2.log("VRF callback gas limit", callbackGasLimit);
        console2.log("VRF request confirmations", requestConfirmations);
        console2.log("VRF native payment", nativePayment);
        console2.log("Initial bankroll wei", initialBankroll);
        console2.log("VRF key hash");
        console2.logBytes32(vrfKeyHash);
    }

    function _envUint32(string memory name) private view returns (uint32 value) {
        uint256 rawValue = vm.envUint(name);
        if (rawValue > type(uint32).max) revert ConfigValueTooLarge(name, rawValue);

        // casting to uint32 is safe because the env value is range-checked above.
        // forge-lint: disable-next-line(unsafe-typecast)
        return uint32(rawValue);
    }

    function _envUint16(string memory name) private view returns (uint16 value) {
        uint256 rawValue = vm.envUint(name);
        if (rawValue > type(uint16).max) revert ConfigValueTooLarge(name, rawValue);

        // casting to uint16 is safe because the env value is range-checked above.
        // forge-lint: disable-next-line(unsafe-typecast)
        return uint16(rawValue);
    }
}
