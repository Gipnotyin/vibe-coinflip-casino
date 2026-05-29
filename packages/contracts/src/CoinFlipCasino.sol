// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @dev Minimal Chainlink VRF v2.5 client structs needed for requestRandomWords.
library VRFV2PlusClient {
    struct ExtraArgsV1 {
        bool nativePayment;
    }

    struct RandomWordsRequest {
        bytes32 keyHash;
        uint256 subId;
        uint16 requestConfirmations;
        uint32 callbackGasLimit;
        uint32 numWords;
        bytes extraArgs;
    }

    bytes4 internal constant EXTRA_ARGS_V1_TAG = bytes4(keccak256("VRF ExtraArgsV1"));

    function _argsToBytes(ExtraArgsV1 memory extraArgs) internal pure returns (bytes memory) {
        return abi.encodeWithSelector(EXTRA_ARGS_V1_TAG, extraArgs);
    }
}

/// @dev Minimal Chainlink VRF v2.5 coordinator interface used by this contract.
interface IVRFCoordinatorV2Plus {
    function requestRandomWords(VRFV2PlusClient.RandomWordsRequest calldata req) external returns (uint256 requestId);
}

/// @title CoinFlipCasino
/// @notice Sepolia testnet coin flip casino with internal balances,
/// a funded bankroll, and Chainlink VRF v2.5 randomness.
contract CoinFlipCasino is Ownable, Pausable, ReentrancyGuard {
    uint256 private constant PAYOUT_NUMERATOR = 190;
    uint256 private constant PAYOUT_DENOMINATOR = 100;
    uint32 private constant RANDOM_WORDS_COUNT = 1;

    /// @notice Coin side selected by a player or produced by randomness.
    enum Side {
        HEADS,
        TAILS
    }

    /// @notice Lifecycle state for a recorded bet.
    enum BetState {
        NONE,
        PENDING,
        RESOLVED
    }

    /// @notice VRF request settings used when placing bets.
    struct VrfConfig {
        bytes32 keyHash;
        uint256 subscriptionId;
        uint32 callbackGasLimit;
        uint16 requestConfirmations;
        bool nativePayment;
    }

    /// @notice Bet data kept for the player's latest pending or resolved bet.
    struct Bet {
        address player;
        Side side;
        Side result;
        BetState state;
        uint256 amount;
        uint256 maxPayout;
        uint256 requestId;
    }

    error ZeroAmount();
    error ZeroAddress();
    error InvalidVrfConfig();
    error InsufficientBalance(uint256 requested, uint256 available);
    error BankrollUnavailable(uint256 requested, uint256 available);
    error PendingBetExists(address player);
    error UnauthorizedCoordinator(address caller, address expected);
    error UnknownRequest(uint256 requestId);
    error MissingRandomWords();
    error TransferFailed(address recipient, uint256 amount);

    event Deposited(address indexed player, uint256 amount, uint256 balance);
    event Withdrawn(address indexed player, uint256 amount, uint256 balance);
    event BetPlaced(
        address indexed player, uint256 indexed requestId, Side indexed side, uint256 amount, uint256 maxPayout
    );
    event BetResolved(
        address indexed player,
        uint256 indexed requestId,
        Side indexed chosenSide,
        Side result,
        uint256 amount,
        uint256 payout,
        bool won
    );
    event BankrollFunded(address indexed owner, uint256 amount, uint256 totalBankroll);
    event BankrollWithdrawn(address indexed owner, uint256 amount, uint256 totalBankroll);

    /// @notice Chainlink VRF v2.5 coordinator used for randomness requests.
    IVRFCoordinatorV2Plus public immutable vrfCoordinator;

    /// @notice Current Chainlink VRF v2.5 request configuration.
    VrfConfig public vrfConfig;

    /// @notice Casino-owned ETH available for current and future payouts.
    uint256 public totalBankroll;

    /// @notice Sum of all user internal balances.
    uint256 public totalPlayerBalances;

    /// @notice Sum of player bet stakes currently awaiting VRF settlement.
    uint256 public totalPendingStakes;

    /// @notice Sum of maximum pending payouts currently reserved from the bankroll.
    uint256 public reservedMaximumPayouts;

    mapping(address player => uint256 balance) private _balances;
    mapping(address player => Bet bet) private _bets;
    mapping(uint256 requestId => address player) private _requestPlayers;

    constructor(address initialOwner, address vrfCoordinator_, VrfConfig memory vrfConfig_) Ownable(initialOwner) {
        if (vrfCoordinator_ == address(0)) revert ZeroAddress();
        if (
            vrfConfig_.keyHash == bytes32(0) || vrfConfig_.subscriptionId == 0 || vrfConfig_.callbackGasLimit == 0
            || vrfConfig_.requestConfirmations == 0
        ) {
            revert InvalidVrfConfig();
        }

        vrfCoordinator = IVRFCoordinatorV2Plus(vrfCoordinator_);
        vrfConfig = vrfConfig_;
    }

    /// @notice Deposits ETH into the caller's internal casino balance.
    function deposit() external payable whenNotPaused {
        if (msg.value == 0) revert ZeroAmount();

        _balances[msg.sender] += msg.value;
        totalPlayerBalances += msg.value;

        emit Deposited(msg.sender, msg.value, _balances[msg.sender]);
    }

    /// @notice Withdraws ETH from the caller's internal balance to the caller's wallet.
    /// @param amount Amount of wei to withdraw from the caller's internal balance.
    function withdraw(uint256 amount) external nonReentrant whenNotPaused {
        if (amount == 0) revert ZeroAmount();

        uint256 currentBalance = _balances[msg.sender];
        if (amount > currentBalance) revert InsufficientBalance(amount, currentBalance);

        _balances[msg.sender] = currentBalance - amount;
        totalPlayerBalances -= amount;

        (bool success,) = payable(msg.sender).call{value: amount}("");
        if (!success) revert TransferFailed(msg.sender, amount);

        emit Withdrawn(msg.sender, amount, _balances[msg.sender]);
    }

    /// @notice Places a coin flip bet, reserves the maximum payout, and requests Chainlink VRF randomness.
    /// @param side The side selected by the caller: HEADS or TAILS.
    /// @param amount Amount of wei to stake from the caller's internal balance.
    /// @return requestId Chainlink VRF request id that will be used to resolve the bet.
    function placeBet(Side side, uint256 amount) external nonReentrant whenNotPaused returns (uint256 requestId) {
        if (amount == 0) revert ZeroAmount();

        Bet storage existingBet = _bets[msg.sender];
        if (existingBet.state == BetState.PENDING) revert PendingBetExists(msg.sender);

        uint256 currentBalance = _balances[msg.sender];
        if (amount > currentBalance) revert InsufficientBalance(amount, currentBalance);

        uint256 maxPayout = calculatePayout(amount);
        uint256 available = availableBankroll();
        if (maxPayout > available) revert BankrollUnavailable(maxPayout, available);

        _balances[msg.sender] = currentBalance - amount;
        totalPlayerBalances -= amount;
        totalPendingStakes += amount;
        reservedMaximumPayouts += maxPayout;

        _bets[msg.sender] = Bet({
            player: msg.sender,
            side: side,
            result: Side.HEADS,
            state: BetState.PENDING,
            amount: amount,
            maxPayout: maxPayout,
            requestId: 0
        });

        requestId = vrfCoordinator.requestRandomWords(
            VRFV2PlusClient.RandomWordsRequest({
                keyHash: vrfConfig.keyHash,
                subId: vrfConfig.subscriptionId,
                requestConfirmations: vrfConfig.requestConfirmations,
                callbackGasLimit: vrfConfig.callbackGasLimit,
                numWords: RANDOM_WORDS_COUNT,
                extraArgs: VRFV2PlusClient._argsToBytes(
                    VRFV2PlusClient.ExtraArgsV1({nativePayment: vrfConfig.nativePayment})
                )
            })
        );

        _bets[msg.sender].requestId = requestId;
        _requestPlayers[requestId] = msg.sender;

        emit BetPlaced(msg.sender, requestId, side, amount, maxPayout);
    }

    /// @notice Chainlink VRF v2.5 callback entry point that resolves a pending bet.
    /// @param requestId VRF request id returned by placeBet.
    /// @param randomWords Random words supplied by the VRF coordinator.
    function rawFulfillRandomWords(uint256 requestId, uint256[] calldata randomWords) external {
        address coordinator = address(vrfCoordinator);
        if (msg.sender != coordinator) revert UnauthorizedCoordinator(msg.sender, coordinator);

        fulfillRandomWords(requestId, randomWords);
    }

    /// @notice Adds owner-supplied ETH to the casino bankroll used to cover payouts.
    function fundBankroll() external payable onlyOwner {
        if (msg.value == 0) revert ZeroAmount();

        totalBankroll += msg.value;

        emit BankrollFunded(msg.sender, msg.value, totalBankroll);
    }

    /// @notice Withdraws available casino bankroll ETH to the current owner.
    /// @param amount Amount of wei to withdraw from the unreserved bankroll.
    function withdrawBankroll(uint256 amount) external onlyOwner nonReentrant {
        if (amount == 0) revert ZeroAmount();

        uint256 available = availableBankroll();
        if (amount > available) revert BankrollUnavailable(amount, available);

        totalBankroll -= amount;

        address recipient = owner();
        (bool success,) = payable(recipient).call{value: amount}("");
        if (!success) revert TransferFailed(recipient, amount);

        emit BankrollWithdrawn(recipient, amount, totalBankroll);
    }

    /// @notice Pauses deposits, withdrawals, and new bets during an emergency.
    function pause() external onlyOwner {
        _pause();
    }

    /// @notice Unpauses deposits, withdrawals, and new bets after an emergency.
    function unpause() external onlyOwner {
        _unpause();
    }

    /// @notice Returns the internal casino balance for a player.
    /// @param player Address whose internal balance should be read.
    /// @return balance Internal balance denominated in wei.
    function balanceOf(address player) external view returns (uint256 balance) {
        return _balances[player];
    }

    /// @notice Returns the latest bet recorded for a player.
    /// @param player Address whose latest bet should be read.
    /// @return bet Latest pending or resolved bet for the player.
    function betOf(address player) external view returns (Bet memory bet) {
        return _bets[player];
    }

    /// @notice Returns the player associated with a VRF request id.
    /// @param requestId VRF request id to inspect.
    /// @return player Address of the player whose bet is awaiting that request.
    function playerForRequest(uint256 requestId) external view returns (address player) {
        return _requestPlayers[requestId];
    }

    /// @notice Returns the casino bankroll not currently reserved for maximum pending payouts.
    /// @return amount Available bankroll denominated in wei.
    function availableBankroll() public view returns (uint256 amount) {
        return totalBankroll - reservedMaximumPayouts;
    }

    /// @notice Calculates the maximum payout for a bet amount at 1.9x odds.
    /// @param amount Bet stake denominated in wei.
    /// @return payout Maximum payout denominated in wei.
    function calculatePayout(uint256 amount) public pure returns (uint256 payout) {
        return (amount * PAYOUT_NUMERATOR) / PAYOUT_DENOMINATOR;
    }

    function fulfillRandomWords(uint256 requestId, uint256[] calldata randomWords) internal {
        if (randomWords.length == 0) revert MissingRandomWords();

        address player = _requestPlayers[requestId];
        if (player == address(0)) revert UnknownRequest(requestId);

        Bet storage bet = _bets[player];
        if (bet.state != BetState.PENDING || bet.requestId != requestId) revert UnknownRequest(requestId);

        uint256 amount = bet.amount;
        uint256 maxPayout = bet.maxPayout;
        Side result = randomWords[0] % 2 == 0 ? Side.HEADS : Side.TAILS;
        bool won = bet.side == result;
        uint256 payout;

        totalPendingStakes -= amount;
        reservedMaximumPayouts -= maxPayout;
        delete _requestPlayers[requestId];

        bet.result = result;
        bet.state = BetState.RESOLVED;

        if (won) {
            payout = maxPayout;
            totalBankroll -= payout - amount;
            _balances[player] += payout;
            totalPlayerBalances += payout;
        } else {
            totalBankroll += amount;
        }

        emit BetResolved(player, requestId, bet.side, result, amount, payout, won);
    }
}
