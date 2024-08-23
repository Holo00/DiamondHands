// SPDX-License-Identifier: MIT
pragma solidity ^0.7.6;
pragma abicoder v2;

import "@uniswap/v3-core/contracts/interfaces/IUniswapV3Factory.sol";
import "@uniswap/v3-core/contracts/interfaces/IUniswapV3Pool.sol";
import '@uniswap/v3-periphery/contracts/interfaces/INonfungiblePositionManager.sol';
import '@uniswap/v3-periphery/contracts/libraries/TransferHelper.sol';
import "@uniswap/v3-core/contracts/libraries/TickMath.sol";


contract DiamondLiquidityProvider {
    IUniswapV3Factory public immutable factory;
    //ISwapRouter public immutable swapRouter;
    INonfungiblePositionManager public immutable positionManager;
    address public immutable baseToken;

    event PoolCreated(address tokenA, address tokenB, uint24 fee, address pool);
    event LiquidityAdded(uint256 tokenId, uint128 liquidity, uint256 amount0, uint256 amount1);

    // constructor(address _baseToken, address _swapRouter, address _positionManager) {
    //     swapRouter = ISwapRouter(_swapRouter);
    //     positionManager = INonfungiblePositionManager(_positionManager);
    //     baseToken = _baseToken;
    // }

    constructor(address _baseToken, address _factory, address _positionManager) {
        factory = IUniswapV3Factory(_factory);
        positionManager = INonfungiblePositionManager(_positionManager);
        baseToken = _baseToken;
    }

    function createPool(address _quoteToken, uint24 _fee, uint160 _sqrtPriceX96) external returns(address pool) {
        pool = factory.createPool(baseToken, _quoteToken, _fee);
        IUniswapV3Pool(pool).initialize(_sqrtPriceX96);
        emit PoolCreated(baseToken, _quoteToken, _fee, pool);
        return pool;
    }

    // function swapInputExact(uint256 amount, address pool) external {
    //     IUniswapV3Pool(pool).swap();
    // }

    function addLiquidity(
        address quoteToken,
        uint24 fee,
        uint256 amountBase,
        uint256 amountQuote
    ) external 
        returns (
            uint256 tokenId,
            uint128 liquidity,
            uint256 amount0,
            uint256 amount1
        ) 
    {
        require(amountBase > 0, "Amount A desired must be greater than 0");
        require(amountQuote > 0, "Amount B desired must be greater than 0");
        //emit LogAddLiquidity(baseToken, quoteToken, amountBase, amountQuote, 0, 0, msg.sender, block.timestamp);
        // Transfer tokens to this contract
        TransferHelper.safeTransferFrom(baseToken, msg.sender, address(this), amountBase);
        TransferHelper.safeTransferFrom(quoteToken, msg.sender, address(this), amountQuote);

        // Approve the position manager
        TransferHelper.safeApprove(baseToken, address(positionManager), amountBase);
        TransferHelper.safeApprove(quoteToken, address(positionManager), amountQuote);

        //Mint the liquidity position
        INonfungiblePositionManager.MintParams memory params = INonfungiblePositionManager.MintParams({
            token0: baseToken,
            token1: quoteToken,
            fee: fee,
            tickLower: -60000, // The lowest tick (represents min price)
            tickUpper: 60000,  // The highest tick (represents max price)
            amount0Desired: amountBase,
            amount1Desired: amountQuote,
            amount0Min: 0,
            amount1Min: 0,
            recipient: msg.sender,
            deadline: block.timestamp
        });

        (tokenId, liquidity, amount0, amount1) = positionManager.mint(params);
        emit LiquidityAdded(tokenId, liquidity, amount0, amount1);
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