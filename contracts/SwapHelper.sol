// SPDX-License-Identifier: MIT
pragma solidity ^0.7.6;
pragma abicoder v2;

import "@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@uniswap/v3-periphery/contracts/libraries/TransferHelper.sol";
import "./DiamondCaller.sol";
import "./Interfaces/ISwaperHelper.sol";


contract SwapHelper is DiamondCaller, ISwaperHelper {
    ISwapRouter public swapRouter;
    IERC20 public wethContract;

    address public wethAddress;
    uint24 public poolFee;

    constructor() DiamondCaller() {}

    function setRouterForBuyBacks(address _router, address _wethAddress, uint24 _poolFee) external override onlyOwner{
        swapRouter = ISwapRouter(_router);
        wethAddress = _wethAddress;
        poolFee = _poolFee;
        wethContract = IERC20(_wethAddress);
    }

    // Function to sell tokens for ETH
    function sellForETHInETH(uint256 _ethAmount,  uint256 _maxTokenAmount) external override onlyDiamond returns(uint256){
        // Approve the router to spend the token
        TransferHelper.safeApprove(diamontContractAddress, address(swapRouter), _maxTokenAmount);

        // Set up the parameters for the swap
        ISwapRouter.ExactOutputSingleParams memory params =
            ISwapRouter.ExactOutputSingleParams({
                tokenIn: diamontContractAddress,
                tokenOut: wethAddress,
                fee: poolFee,
                recipient: diamontContractAddress, // Swap WETH to the contract
                deadline: block.timestamp + 15,
                amountOut: _ethAmount,
                amountInMaximum: _maxTokenAmount,
                sqrtPriceLimitX96: 0
            });

        // Execute the swap
        uint256 amountIn = swapRouter.exactOutputSingle(params);

        // Reset approval
        TransferHelper.safeApprove(diamontContractAddress, address(swapRouter), 0);
        return amountIn;
    }

    // Function to sell a specified amount of tokens for ETH
    function sellForETH(uint256 _tokenAmount) external override onlyDiamond returns(uint256){
        // Approve the router to spend the token
        TransferHelper.safeApprove(diamontContractAddress, address(swapRouter), _tokenAmount);

        // Set up the parameters for the swap
        ISwapRouter.ExactInputSingleParams memory params = ISwapRouter.ExactInputSingleParams({
            tokenIn: diamontContractAddress,
            tokenOut: wethAddress,
            fee: poolFee,
            recipient: diamontContractAddress, // Swap WETH to the contract
            deadline: block.timestamp + 15,
            amountIn: _tokenAmount,
            amountOutMinimum: 0, // Accept any amount of WETH
            sqrtPriceLimitX96: 0
        });

        // Execute the swap
        uint256 amountOut = swapRouter.exactInputSingle(params);
        TransferHelper.safeApprove(diamontContractAddress, address(swapRouter), 0);

        return amountOut;
    }

    function buyBack(uint256 _AmountInWETH) external override onlyDiamond returns(uint256) {
        // Approve the router to spend WETH
        TransferHelper.safeApprove(wethAddress, address(swapRouter), _AmountInWETH);
        uint256 amountOut = 0;

        if(_AmountInWETH > 100000000000000){
            ISwapRouter.ExactInputSingleParams memory params = ISwapRouter.ExactInputSingleParams({
                tokenIn: wethAddress,
                tokenOut: diamontContractAddress,
                fee: poolFee,
                recipient: diamontContractAddress,
                deadline: block.timestamp,
                amountIn: _AmountInWETH,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
            });

            amountOut = swapRouter.exactInputSingle(params);
        }

        TransferHelper.safeApprove(wethAddress, address(swapRouter), 0);
        return amountOut;
    }

    receive() external payable {}
}