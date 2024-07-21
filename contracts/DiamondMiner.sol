// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "./MarketStatus.sol";
import "./DiamondCaller.sol";
import "./Diamond.sol";

struct LotteryParticipant{
    address participant;
    uint256 tickets;
}

struct WinningResult{
    bool winning;
    uint256 winner;
}


interface IDiamondMiner{
    function balanceOf(address _account) external view returns (uint256);
}

contract DiamondMiner is ERC20, DiamondCaller {
    using SafeMath for uint256;

    IMarketStatus marketStatusContract;
    address public wethAddress;

    LotteryParticipant[] public nextLotteryParticipants;
    uint256 public totalTickets;
    uint256 ethMaxBalance;

    constructor(address _owner, address _marketStatusAddress) ERC20("DiamondMiner", "DIAMM") DiamondCaller(_owner) 
    {
        marketStatusContract = IMarketStatus(_marketStatusAddress);
        totalTickets = 0;
    }

    function setETHMinMaxBalance(uint256 _amount) external onlyOwner {
        ethMaxBalance = _amount;
    }

    function refundDiamondWithETH() external onlyOwner {
        if (address(this).balance >= ethMaxBalance) {
            uint256 toTransfer = address(this).balance.sub(ethMaxBalance);
            (bool success, ) = diamontContractAddress.call{value: toTransfer}("");
            require(success, "Gas reimbursement failed");
        }
    }

    function executeLottery(uint256 _seed) external onlyOwner {
        uint256 jackpotTotal = diamondContract.balanceOf(address(this));
        if(jackpotTotal > 0){
            uint256 burnAmount = jackpotTotal.div(20); // 5% burn
            diamondContract.burn(address(this), burnAmount);

            uint256 distributeAmount = jackpotTotal.div(20); // 5% distribute
            diamondContract.transferFromLottery(address(this), distributeAmount);

            WinningResult memory dailyWinner = getWinner(1, totalTickets, _seed);
            WinningResult memory jackpotWinner = getWinner(1, totalTickets.mul(20), _seed);

            if(dailyWinner.winning){
                uint256 dailyPrize = jackpotTotal.div(10); // 10% daily prize
                diamondContract.transferFromLottery(nextLotteryParticipants[dailyWinner.winner].participant, dailyPrize);
            }

            if(jackpotWinner.winning){
                uint256 jackpotPrize = jackpotTotal.mul(8).div(10); // 80% jackpot prize
                diamondContract.transferFromLottery(nextLotteryParticipants[jackpotWinner.winner].participant, jackpotPrize);
            }
        }

        totalTickets = 0;
        delete nextLotteryParticipants;
    }

    function getWinner(uint256 _min, uint256 _max, uint256 _seed) internal returns(WinningResult memory){
        uint256 ticketWinnerNumber = getRandomNumber(_min, _max, _seed);
        uint256 currentTicketNumberMax = 0;
        for(uint256 i = 0; i < nextLotteryParticipants.length; i++){
            if(ticketWinnerNumber <  currentTicketNumberMax.add(nextLotteryParticipants[i].tickets)){
                return WinningResult(true ,i);
            }
            currentTicketNumberMax = currentTicketNumberMax.add(nextLotteryParticipants[i].tickets);
        }

        return WinningResult(false, 0);
    }

    function payForLottery(uint256 _amount) external {
        uint256 ethFee = getETHFee();
        require(msg.value >= ethFee, "Insufficient ETH sent");
        payable(address(this)).transfer(ethFee);
        diamondContract.transferToLottery(msg.sender, address(this), _amount);
        nextLotteryParticipants.push(LotteryParticipant(msg.sender, _amount));
        totalTickets = totalTickets.add(_amount);
        _mint(msg.sender, _amount);
    }

    function burnDiamonds(uint256 _amount) external {
        uint256 ethFee = getETHFee();
        require(msg.value >= ethFee, "Insufficient ETH sent");
        payable(address(this)).transfer(ethFee);
        diamondContract.burn(msg.sender, _amount);
        _mint(msg.sender, _amount.mul(5));
    }

    function getETHFee() internal view returns(uint256){
        Status memory s_weth = marketStatusContract.getMarketStatus(wethAddress);
        uint256 ethFee = (10 ** 18).div(s_weth.price);
        return ethFee;
    }

    function getRandomNumber(uint256 _min, uint256 _max, uint256 _seed) internal view returns (uint256) {
        require(max > min, "max must be greater than min");

        // Get a pseudo-random value
        uint256 randomValue = uint256(keccak256(abi.encodePacked(
            block.timestamp, // Current block timestamp
            block.difficulty, // Current block difficulty
            msg.sender, // Sender address
            _seed // Owner-set seed
        )));

        // Compute the random number in the range [min, max]
        uint256 randomInRange = (randomValue % (max - min + 1)) + min;

        return randomInRange;
    }

    // Allow the contract to receive ETH
    receive() external payable {}
}

//For generating seed
// const { ethers } = require('ethers');

// // Your Ethereum provider URL
// const providerUrl = 'https://mainnet.infura.io/v3/YOUR_INFURA_PROJECT_ID';

// // Connect to the Ethereum network
// const provider = new ethers.providers.JsonRpcProvider(providerUrl);

// // Your wallet's private key
// const privateKey = 'YOUR_WALLET_PRIVATE_KEY';

// // Create a wallet instance
// const wallet = new ethers.Wallet(privateKey, provider);

// // Your contract's ABI and address
// const contractAbi = [/* Your contract ABI here */];
// const contractAddress = 'YOUR_CONTRACT_ADDRESS';

// // Create a contract instance
// const contract = new ethers.Contract(contractAddress, contractAbi, wallet);

// // Convert the seed to a BigNumber
// const seedBigNumber = ethers.BigNumber.from(`0x${seed}`);

// // Execute the lottery with the generated seed
// async function executeLottery() {
//   const tx = await contract.executeLottery(seedBigNumber);
//   console.log('Transaction sent:', tx.hash);
  
//   // Wait for the transaction to be mined
//   const receipt = await tx.wait();
//   console.log('Transaction mined:', receipt.transactionHash);
// }

// executeLottery().catch(console.error);