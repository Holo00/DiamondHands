// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
import "@openzeppelin/contracts/access/Ownable.sol";


interface ITokenAttributesWatcher {
    function setTokenAddress(address _tokenAddress) external returns (bool);
    function setOracle_1DayVWAP(address _oracle) external returns (bool);
    function setOracle_20DayVWAP(address _oracle) external returns (bool);
    function setOracle_stDev20Days(address _oracle) external returns (bool);
    function setTokenAttributes() external returns (uint256, MarketState);
    function token() external view returns (address);
    function vwapOracle() external view returns (address);
    function totalSupply() external view returns (uint256);
    function vwap() external view returns (uint256);
    function marketCap() external view returns (uint256);
    function marketState() external view returns (MarketState);
}

contract TokenAttributesWatcher is Ownable {
    enum MarketState { Overbought, Bullish, Neutral, Bearish, Oversold }

    address public vwapOracle_1Day;
    address public vwapOracle_20Days;
    address public stdevOracle_20Days;
    IERC20 public token;
    uint256 public totalSupply;
    uint256 public vwap;
    uint256 public marketCap;
    MarketState public marketState;

    constructor(address _tokenAddress, address _vwapOracle_1Day, address _vwapOracle_20Days, address _stdevOracle_20Days) {
        token = IERC20(_tokenAddress);
        vwapOracle_1Day = _vwapOracle_1Day;
        vwapOracle_20Days = _vwapOracle_20Days;
        stdevOracle_20Days = _stdevOracle_20Days;
        totalSupply = 0;
        vwap = 0;
        marketCap = 0;
        marketState = MarketState.Neutral;
    }

    function setTokenAddress(address _tokenAddress) external onlyOwner returns (bool) {
        token = IERC20(_tokenAddress);
        return true;
    }

    function setOracle_1DayVWAP(address _oracle) external onlyOwner returns (bool) {
        vwapOracle_1Day = _oracle;
        return true;
    }

    function setOracle_20DayVWAP(address _oracle) external onlyOwner returns (bool) {
        vwapOracle_20Days = _oracle;
        return true;
    }

    function setOracle_stDev20Days(address _oracle) external onlyOwner returns (bool) {
        stdevOracle_20Days = _oracle;
        return true;
    }

    function getLatestVWAP_1Day() internal returns (uint256) {
        // Assuming the VWAP oracle contract has a function to get the latest VWAP
        (,int vwap,,,) = AggregatorV3Interface(vwapOracle_1Day).latestRoundData();
        return uint256(vwap);
    }

    function getLatestVWAP_20Days() internal returns (uint256) {
        // Assuming the VWAP oracle contract has a function to get the latest VWAP
        (,int vwap,,,) = AggregatorV3Interface(vwapOracle_20Days).latestRoundData();
        return uint256(vwap);
    }

    function getLatestDTDEV_20Days() internal returns (uint256) {
        // Assuming the VWAP oracle contract has a function to get the latest VWAP
        (,int vwap,,,) = AggregatorV3Interface(stdevOracle_20Days).latestRoundData();
        return uint256(vwap);
    }

    function getTokenTotalSupply() internal returns (uint256) {
        return token.totalSupply();
    }

    function setTokenAttributes() external returns (uint256, MarketState) {
        vwap = getLatestVWAP();
        totalSupply = getTokenTotalSupply();
        marketCap = vwap * totalSupply;

        memory vwap20 = getLatestVWAP_20Days();
        memory stdev20 = getLatestDTDEV_20Days();

        if(vwap > vwap20 + stdev20){
            marketState = MarketState.Overbought;
        }
        else if(vwap > vwap20){
            marketState = MarketState.Bullish;
        }
        else if(vwap < vwap20 - stdev20){
            marketState = MarketState.Oversold;
        }
        else{
            marketState = MarketState.Bearish;
        }

        return (marketCap, marketState);
    }
}
