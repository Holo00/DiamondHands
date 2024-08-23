// SPDX-License-Identifier: MIT
pragma solidity ^0.7.6;

enum DexType{
    Uniswap
}

enum TransferType { 
    AddingLiquidity, 
    RemovingLiquidity, 
    BuyFromLiquidityPool, 
    SellToLiquidityPool, 
    RegularTransfer 
}