// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol";
import "@uniswap/v3-periphery/contracts/interfaces/INonfungiblePositionManager.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./DiamondCaller.sol";
import "./Diamond.sol";

contract DiamondLiquidityProvider is DiamondCaller {
    INonfungiblePositionManager public positionManager;
    ISwapRouter public swapRouter;
    address public baseToken;

    constructor(address _owner) DiamondCaller(_owner) {
        
    }

    setPositionManager(){
        
    }

    ) {
        positionManager = INonfungiblePositionManager(_positionManager);
        swapRouter = ISwapRouter(_swapRouter);
        baseToken = _baseToken;
        owner = msg.sender;
    }


}