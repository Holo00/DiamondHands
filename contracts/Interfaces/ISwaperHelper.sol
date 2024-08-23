// SPDX-License-Identifier: MIT
pragma solidity ^0.7.6;

interface ISwaperHelper{
    function setRouterForBuyBacks(address _router, address _wethAddress, uint24 _poolFee) external;
    function sellForETH(uint256 _tokenAmount) external returns(uint256);
    function sellForETHInETH(uint256 _ethAmount,  uint256 _maxTokenAmount) external returns(uint256);
    function buyBack(uint256 _AmountInWETH) external returns(uint256);
}
