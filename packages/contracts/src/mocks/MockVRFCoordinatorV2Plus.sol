// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {VRFV2PlusClient} from "@chainlink/contracts/src/v0.8/vrf/dev/libraries/VRFV2PlusClient.sol";

interface ICoinFlipCasinoCallback {
    function rawFulfillRandomWords(uint256 requestId, uint256[] calldata randomWords) external;
}

/// @notice Minimal local/test VRF coordinator mock used by Foundry tests and Anvil E2E.
contract MockVRFCoordinatorV2Plus {
    uint256 public nextRequestId = 1;

    mapping(uint256 requestId => address consumer) public consumers;

    error UnknownRequest(uint256 requestId);

    event RandomWordsRequested(uint256 indexed requestId, address indexed consumer);
    event RandomWordsFulfilled(uint256 indexed requestId, address indexed consumer, uint256 randomWord);

    function requestRandomWords(VRFV2PlusClient.RandomWordsRequest calldata) external returns (uint256 requestId) {
        requestId = nextRequestId++;
        consumers[requestId] = msg.sender;

        emit RandomWordsRequested(requestId, msg.sender);
    }

    function fulfill(uint256 requestId, uint256 randomWord) external {
        address consumer = consumers[requestId];
        if (consumer == address(0)) revert UnknownRequest(requestId);

        uint256[] memory randomWords = new uint256[](1);
        randomWords[0] = randomWord;

        ICoinFlipCasinoCallback(consumer).rawFulfillRandomWords(requestId, randomWords);

        emit RandomWordsFulfilled(requestId, consumer, randomWord);
    }
}
