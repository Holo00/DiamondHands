// SPDX-License-Identifier: MIT
pragma solidity ^0.7.6;
pragma abicoder v2;

import '@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol';
import '@uniswap/v3-periphery/contracts/interfaces/INonfungiblePositionManager.sol';
import '@uniswap/v3-periphery/contracts/libraries/TransferHelper.sol';
import '@uniswap/v3-core/contracts/interfaces/IERC20Minimal.sol';
//import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
//import "@openzeppelin/contracts/token/ERC721/IERC721Enumerable.sol";

contract DiamondLiquidityProvider {
    ISwapRouter public immutable swapRouter;
    INonfungiblePositionManager public immutable positionManager;
    address public immutable baseToken;

    constructor(address _baseToken, address _swapRouter, address _positionManager) {
        swapRouter = ISwapRouter(_swapRouter);
        positionManager = INonfungiblePositionManager(_positionManager);
        baseToken = _baseToken;
    }

    function addLiquidity(
        address quoteToken,
        uint24 fee,
        uint256 amountBase,
        uint256 amountQuote
    ) external {
        // Transfer tokens to this contract
        TransferHelper.safeTransferFrom(baseToken, msg.sender, address(this), amountBase);
        TransferHelper.safeTransferFrom(quoteToken, msg.sender, address(this), amountQuote);

        // Approve the position manager
        TransferHelper.safeApprove(baseToken, address(positionManager), amountBase);
        TransferHelper.safeApprove(quoteToken, address(positionManager), amountQuote);

        // Mint the liquidity position
        INonfungiblePositionManager.MintParams memory params = INonfungiblePositionManager.MintParams({
            token0: baseToken,
            token1: quoteToken,
            fee: fee,
            tickLower: -887272, // The lowest tick (represents min price)
            tickUpper: 887272,  // The highest tick (represents max price)
            amount0Desired: amountBase,
            amount1Desired: amountQuote,
            amount0Min: 0,
            amount1Min: 0,
            recipient: msg.sender,
            deadline: block.timestamp
        });

        positionManager.mint(params);
    }


    function removeLiquidity(
        uint256 tokenId,
        uint128 liquidity,
        uint256 amount0Min,
        uint256 amount1Min
    ) external {
        INonfungiblePositionManager.DecreaseLiquidityParams memory params = INonfungiblePositionManager.DecreaseLiquidityParams({
            tokenId: tokenId,
            liquidity: liquidity,
            amount0Min: amount0Min,
            amount1Min: amount1Min,
            deadline: block.timestamp
        });

        positionManager.decreaseLiquidity(params);

        INonfungiblePositionManager.CollectParams memory collectParams = INonfungiblePositionManager.CollectParams({
            tokenId: tokenId,
            recipient: msg.sender,
            amount0Max: type(uint128).max,
            amount1Max: type(uint128).max
        });

        positionManager.collect(collectParams);
    }
}