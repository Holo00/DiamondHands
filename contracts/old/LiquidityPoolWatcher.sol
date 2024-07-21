// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@uniswap/v3-core/contracts/interfaces/IUniswapV3Pool.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./AirnodePriceFeed.sol";
import "./UniswapLiquidityPoolWatcher.sol";

interface ILiquidityPoolWatcher {
    function getAllPoolsValueInUSD() external returns (uint256 totalValueInUSD);
    function uniswapV3Pools(uint256 index) external view returns (address pool);
    function allPoolsValue() external view returns (uint256 totalValueInUSD);
}

contract LiquidityPoolWatcher is Initializable, OwnableUpgradeable, AirnodePriceFeed, UniswapLiquidityPoolWatcher {
    address[] public uniswapV3Pools;
    uint256 public allPoolsValue;

    function initialize(address airnodeRrpAddress) public initializer {
        __Ownable_init();
        __AirnodeBase_init();
    }

    function getUniswapPoolValueInUSD(address pool, address token0, address token1) internal returns (uint256 valueInUSD) {
        uint256 liquidity = getUniswapPoolReserves(pool);

        // Get token prices in USD
        uint256 price0 = getPrice(token0);
        uint256 price1 = getPrice(token1);

        // Assume equal distribution of liquidity for simplicity
        valueInUSD = liquidity * uint256(price0 + price1) / 2;
    }

    function getAllPoolsValueInUSD() external returns (uint256 totalValueInUSD) {
        uint256 totalValueInUSD = 0;
        for (uint256 i = 0; i < uniswapV3Pools.length; i++) {
            address pool = uniswapV3Pools[i];
            address token0 = IUniswapV3Pool(pool).token0();
            address token1 = IUniswapV3Pool(pool).token1();
            totalValueInUSD += getUniswapPoolValueInUSD(pool, token0, token1);
        }

        allPoolsValue = totalValueInUSD;
        return totalValueInUSD;
    }
}
