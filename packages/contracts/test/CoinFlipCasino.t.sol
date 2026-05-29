// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {CoinFlipCasino, IVRFCoordinatorV2Plus, VRFV2PlusClient} from "../src/CoinFlipCasino.sol";

interface Vm {
    function deal(address account, uint256 newBalance) external;
    function expectEmit(bool checkTopic1, bool checkTopic2, bool checkTopic3, bool checkData, address emitter) external;
    function expectRevert(bytes4 revertData) external;
    function expectRevert(bytes calldata revertData) external;
    function prank(address sender) external;
    function startPrank(address sender) external;
    function stopPrank() external;
}

interface ICoinFlipCasinoCallback {
    function rawFulfillRandomWords(uint256 requestId, uint256[] calldata randomWords) external;
}

contract MockVRFCoordinatorV2Plus is IVRFCoordinatorV2Plus {
    uint256 public nextRequestId = 1;

    mapping(uint256 requestId => address consumer) public consumers;

    function requestRandomWords(VRFV2PlusClient.RandomWordsRequest calldata)
        external
        override
        returns (uint256 requestId)
    {
        requestId = nextRequestId++;
        consumers[requestId] = msg.sender;
    }

    function fulfill(uint256 requestId, uint256 randomWord) external {
        uint256[] memory randomWords = new uint256[](1);
        randomWords[0] = randomWord;

        ICoinFlipCasinoCallback(consumers[requestId]).rawFulfillRandomWords(requestId, randomWords);
    }
}

contract CoinFlipCasinoTest {
    Vm internal constant vm = Vm(address(uint160(uint256(keccak256("hevm cheat code")))));

    address internal constant OWNER = address(0xA11CE);
    address internal constant PLAYER = address(0xB0B);
    address internal constant OTHER_PLAYER = address(0xCAFE);
    address internal constant ATTACKER = address(0xBAD);

    uint256 internal constant STARTING_ETH = 1_000 ether;
    uint256 internal constant BANKROLL = 100 ether;
    uint256 internal constant DEPOSIT = 2 ether;
    uint256 internal constant BET = 1 ether;
    bytes32 internal constant KEY_HASH = bytes32(uint256(1));
    bytes4 internal constant ENFORCED_PAUSE_SELECTOR = bytes4(keccak256("EnforcedPause()"));

    MockVRFCoordinatorV2Plus internal coordinator;
    CoinFlipCasino internal casino;

    event Deposited(address indexed player, uint256 amount, uint256 balance);

    error AssertionFailed();

    receive() external payable {}

    function setUp() public {
        coordinator = new MockVRFCoordinatorV2Plus();
        casino = new CoinFlipCasino(
            OWNER,
            address(coordinator),
            CoinFlipCasino.VrfConfig({
                keyHash: KEY_HASH,
                subscriptionId: 1,
                callbackGasLimit: 250_000,
                requestConfirmations: 3,
                nativePayment: false
            })
        );

        vm.deal(OWNER, STARTING_ETH);
        vm.deal(PLAYER, STARTING_ETH);
        vm.deal(OTHER_PLAYER, STARTING_ETH);
        vm.deal(ATTACKER, STARTING_ETH);
    }

    function testDepositIncreasesInternalBalanceAndEmitsEvent() public {
        vm.expectEmit(true, false, false, true, address(casino));
        emit Deposited(PLAYER, DEPOSIT, DEPOSIT);

        _deposit(PLAYER, DEPOSIT);

        assertEq(casino.balanceOf(PLAYER), DEPOSIT);
        assertAccountingInvariant();
    }

    function testWithdrawDecreasesInternalBalanceAndTransfersEth() public {
        _deposit(PLAYER, DEPOSIT);

        uint256 walletBefore = PLAYER.balance;

        vm.prank(PLAYER);
        casino.withdraw(BET);

        assertEq(casino.balanceOf(PLAYER), DEPOSIT - BET);
        assertEq(PLAYER.balance, walletBefore + BET);
        assertAccountingInvariant();
    }

    function testCannotWithdrawMoreThanInternalBalance() public {
        _deposit(PLAYER, BET);

        vm.expectRevert(abi.encodeWithSelector(CoinFlipCasino.InsufficientBalance.selector, BET + 1, BET));
        vm.prank(PLAYER);
        casino.withdraw(BET + 1);
    }

    function testCannotPlaceZeroBet() public {
        _fundBankroll(BANKROLL);
        _deposit(PLAYER, DEPOSIT);

        vm.expectRevert(CoinFlipCasino.ZeroAmount.selector);
        vm.prank(PLAYER);
        casino.placeBet(CoinFlipCasino.Side.HEADS, 0);
    }

    function testCannotPlaceBetAboveUserBalance() public {
        _fundBankroll(BANKROLL);
        _deposit(PLAYER, BET);

        vm.expectRevert(abi.encodeWithSelector(CoinFlipCasino.InsufficientBalance.selector, BET + 1, BET));
        vm.prank(PLAYER);
        casino.placeBet(CoinFlipCasino.Side.HEADS, BET + 1);
    }

    function testCannotPlaceBetIfCasinoCannotCoverMaximumPayout() public {
        _fundBankroll(1 ether);
        _deposit(PLAYER, BET);

        vm.expectRevert(abi.encodeWithSelector(CoinFlipCasino.BankrollUnavailable.selector, 1.9 ether, 1 ether));
        vm.prank(PLAYER);
        casino.placeBet(CoinFlipCasino.Side.HEADS, BET);
    }

    function testPlacingBetDeductsBetAmountFromUserBalance() public {
        _fundBankroll(BANKROLL);
        _deposit(PLAYER, DEPOSIT);

        _placeBet(PLAYER, CoinFlipCasino.Side.HEADS, BET);

        assertEq(casino.balanceOf(PLAYER), DEPOSIT - BET);
        assertAccountingInvariant();
    }

    function testPlacingBetCreatesExactlyOnePendingBetForUser() public {
        _fundBankroll(BANKROLL);
        _deposit(PLAYER, DEPOSIT);

        uint256 requestId = _placeBet(PLAYER, CoinFlipCasino.Side.TAILS, BET);
        CoinFlipCasino.Bet memory bet = casino.betOf(PLAYER);

        assertEq(casino.playerForRequest(requestId), PLAYER);
        assertEq(uint256(bet.state), uint256(CoinFlipCasino.BetState.PENDING));
        assertEq(uint256(bet.side), uint256(CoinFlipCasino.Side.TAILS));
        assertEq(bet.amount, BET);
        assertEq(bet.maxPayout, 1.9 ether);
        assertEq(bet.requestId, requestId);
        assertEq(coordinator.nextRequestId(), requestId + 1);
        assertAccountingInvariant();
    }

    function testCannotPlaceSecondBetWhileOneIsPending() public {
        _fundBankroll(BANKROLL);
        _deposit(PLAYER, DEPOSIT);
        _placeBet(PLAYER, CoinFlipCasino.Side.HEADS, BET);

        vm.expectRevert(abi.encodeWithSelector(CoinFlipCasino.PendingBetExists.selector, PLAYER));
        vm.prank(PLAYER);
        casino.placeBet(CoinFlipCasino.Side.TAILS, BET);
    }

    function testResolvingWinningBetCreditsOnePointNineTimesPayout() public {
        _fundBankroll(BANKROLL);
        _deposit(PLAYER, DEPOSIT);
        uint256 requestId = _placeBet(PLAYER, CoinFlipCasino.Side.HEADS, BET);

        coordinator.fulfill(requestId, 2);

        assertEq(casino.balanceOf(PLAYER), DEPOSIT - BET + 1.9 ether);
        assertEq(casino.totalBankroll(), BANKROLL - 0.9 ether);
        assertAccountingInvariant();
    }

    function testResolvingLosingBetDoesNotCreditPayout() public {
        _fundBankroll(BANKROLL);
        _deposit(PLAYER, DEPOSIT);
        uint256 requestId = _placeBet(PLAYER, CoinFlipCasino.Side.HEADS, BET);

        coordinator.fulfill(requestId, 1);

        assertEq(casino.balanceOf(PLAYER), DEPOSIT - BET);
        assertEq(casino.totalBankroll(), BANKROLL + BET);
        assertAccountingInvariant();
    }

    function testResolvingWinningBetReleasesReservedPayout() public {
        _fundBankroll(BANKROLL);
        _deposit(PLAYER, DEPOSIT);
        uint256 requestId = _placeBet(PLAYER, CoinFlipCasino.Side.HEADS, BET);

        assertEq(casino.reservedMaximumPayouts(), 1.9 ether);

        coordinator.fulfill(requestId, 2);

        assertEq(casino.reservedMaximumPayouts(), 0);
        assertAccountingInvariant();
    }

    function testResolvingLosingBetReleasesReservedPayout() public {
        _fundBankroll(BANKROLL);
        _deposit(PLAYER, DEPOSIT);
        uint256 requestId = _placeBet(PLAYER, CoinFlipCasino.Side.HEADS, BET);

        assertEq(casino.reservedMaximumPayouts(), 1.9 ether);

        coordinator.fulfill(requestId, 1);

        assertEq(casino.reservedMaximumPayouts(), 0);
        assertAccountingInvariant();
    }

    function testCannotResolveSameBetTwice() public {
        _fundBankroll(BANKROLL);
        _deposit(PLAYER, DEPOSIT);
        uint256 requestId = _placeBet(PLAYER, CoinFlipCasino.Side.HEADS, BET);

        coordinator.fulfill(requestId, 2);

        vm.expectRevert(abi.encodeWithSelector(CoinFlipCasino.UnknownRequest.selector, requestId));
        coordinator.fulfill(requestId, 2);
    }

    function testOnlyVrfCoordinatorCanResolveRandomness() public {
        _fundBankroll(BANKROLL);
        _deposit(PLAYER, DEPOSIT);
        uint256 requestId = _placeBet(PLAYER, CoinFlipCasino.Side.HEADS, BET);

        uint256[] memory randomWords = new uint256[](1);
        randomWords[0] = 2;

        vm.expectRevert(
            abi.encodeWithSelector(CoinFlipCasino.UnauthorizedCoordinator.selector, ATTACKER, address(coordinator))
        );
        vm.prank(ATTACKER);
        casino.rawFulfillRandomWords(requestId, randomWords);
    }

    function testOwnerCanFundBankroll() public {
        _fundBankroll(BANKROLL);

        assertEq(casino.totalBankroll(), BANKROLL);
        assertEq(address(casino).balance, BANKROLL);
        assertAccountingInvariant();
    }

    function testOwnerCannotWithdrawBankrollNeededForUserBalancesAndReservedPayouts() public {
        _fundBankroll(BANKROLL);
        _deposit(PLAYER, DEPOSIT);
        _placeBet(PLAYER, CoinFlipCasino.Side.HEADS, BET);

        uint256 withdrawable = casino.withdrawableBankroll();

        vm.expectRevert(
            abi.encodeWithSelector(CoinFlipCasino.BankrollUnavailable.selector, withdrawable + 1, withdrawable)
        );
        vm.prank(OWNER);
        casino.withdrawBankroll(withdrawable + 1);
    }

    function testPauseBlocksDepositAndPlaceBet() public {
        _fundBankroll(BANKROLL);
        _deposit(PLAYER, DEPOSIT);

        vm.prank(OWNER);
        casino.pause();

        vm.expectRevert(ENFORCED_PAUSE_SELECTOR);
        vm.prank(OTHER_PLAYER);
        casino.deposit{value: BET}();

        vm.expectRevert(ENFORCED_PAUSE_SELECTOR);
        vm.prank(PLAYER);
        casino.placeBet(CoinFlipCasino.Side.HEADS, BET);
    }

    function testWithdrawIsBlockedWhilePaused() public {
        _deposit(PLAYER, DEPOSIT);

        vm.prank(OWNER);
        casino.pause();

        vm.expectRevert(ENFORCED_PAUSE_SELECTOR);
        vm.prank(PLAYER);
        casino.withdraw(BET);
    }

    function testAccountingInvariantWithPendingBet() public {
        _fundBankroll(BANKROLL);
        _deposit(PLAYER, DEPOSIT);
        _placeBet(PLAYER, CoinFlipCasino.Side.HEADS, BET);

        assertAccountingInvariant();
    }

    function testFuzzDepositWithdraw(uint96 depositSeed, uint96 withdrawSeed) public {
        uint256 depositAmount = _bound(depositSeed, 1 wei, 10 ether);
        uint256 withdrawAmount = _bound(withdrawSeed, 1 wei, depositAmount);

        _deposit(PLAYER, depositAmount);

        uint256 walletBefore = PLAYER.balance;

        vm.prank(PLAYER);
        casino.withdraw(withdrawAmount);

        assertEq(casino.balanceOf(PLAYER), depositAmount - withdrawAmount);
        assertEq(PLAYER.balance, walletBefore + withdrawAmount);
        assertAccountingInvariant();
    }

    function testFuzzPlaceBetResolveMaintainsAccounting(uint96 depositSeed, uint96 betSeed, bool playerWins) public {
        uint256 depositAmount = _bound(depositSeed, 1 wei, 10 ether);
        uint256 betAmount = _bound(betSeed, 1 wei, depositAmount);
        uint256 payout = casino.calculatePayout(betAmount);

        _fundBankroll(BANKROLL);
        _deposit(PLAYER, depositAmount);

        uint256 requestId = _placeBet(PLAYER, CoinFlipCasino.Side.HEADS, betAmount);
        coordinator.fulfill(requestId, playerWins ? 2 : 1);

        uint256 expectedBalance = depositAmount - betAmount;
        if (playerWins) expectedBalance += payout;

        assertEq(casino.balanceOf(PLAYER), expectedBalance);
        assertEq(casino.reservedMaximumPayouts(), 0);
        assertAccountingInvariant();
    }

    function _fundBankroll(uint256 amount) internal {
        vm.prank(OWNER);
        casino.fundBankroll{value: amount}();
    }

    function _deposit(address player, uint256 amount) internal {
        vm.prank(player);
        casino.deposit{value: amount}();
    }

    function _placeBet(address player, CoinFlipCasino.Side side, uint256 amount) internal returns (uint256 requestId) {
        vm.prank(player);
        requestId = casino.placeBet(side, amount);
    }

    function assertAccountingInvariant() internal view {
        assertGe(address(casino).balance, casino.totalPlayerBalances() + casino.reservedMaximumPayouts());
    }

    function _bound(uint256 value, uint256 min, uint256 max) internal pure returns (uint256) {
        if (min == max) return min;

        return min + (value % (max - min + 1));
    }

    function assertEq(uint256 actual, uint256 expected) internal pure {
        if (actual != expected) revert AssertionFailed();
    }

    function assertEq(address actual, address expected) internal pure {
        if (actual != expected) revert AssertionFailed();
    }

    function assertGe(uint256 actual, uint256 minimum) internal pure {
        if (actual < minimum) revert AssertionFailed();
    }
}
