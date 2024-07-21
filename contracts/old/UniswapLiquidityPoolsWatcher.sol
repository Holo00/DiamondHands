// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@uniswap/v3-core/contracts/interfaces/IUniswapV3Pool.sol";

interface IUniswapLiquidityPoolWatcher {
    function uniswapV3Pools(uint256 index) external view returns (address pool);
}

contract UniswapLiquidityPoolWatcher is OwnableUpgradeable {
    address[] public uniswapV3Pools;

    function addNewUniswapPool(address _pool) external onlyOwner {
        uniswapV3Pools.push(_pool);
    }

    function removeUniswapPool(address _pool) external onlyOwner {
        uint256 poolIndex = findPoolIndex(_pool);
        if (poolIndex < uniswapV3Pools.length) {
            uniswapV3Pools[poolIndex] = uniswapV3Pools[uniswapV3Pools.length - 1];
            uniswapV3Pools.pop();
        }
    }

    function findPoolIndex(address _pool) internal view returns (uint256) {
        for (uint256 i = 0; i < uniswapV3Pools.length; i++) {
            if (uniswapV3Pools[i] == _pool) {
                return i;
            }
        }
        return uniswapV3Pools.length;
    }

    function getUniswapPoolReserves(address pool) internal view returns (uint256 liquidity) {
        IUniswapV3Pool uniswapV3Pool = IUniswapV3Pool(pool);
        return uniswapV3Pool.liquidity();
    }
}
