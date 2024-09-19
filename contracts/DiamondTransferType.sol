// SPDX-License-Identifier: MIT
pragma solidity ^0.7.6;
pragma abicoder v2;

import "./DiamondCaller.sol";
import "./Enums/DiamondEnums.sol";
import "./Structs/DiamondStructs.sol";
import "./Interfaces/IDiamondTransferType.sol";



contract DiamondTransferType is DiamondCaller, IDiamondTransferType {

    mapping(address => bool) public uni_supportedPoolAddresses;
    mapping(address => bool) public uni_supportedPositionManagerAddresses;
    mapping(address => bool) public uni_supportedSwapRouterAddresses;

    constructor() DiamondCaller() 
    {
    }

    function addSupportedPoolAddress(address _address, DexType _dexType) external onlyOwner{
        if(_dexType == DexType.Uniswap){
            uni_supportedPoolAddresses[_address] = true;
        }
    }

    function removeSupportedPoolAddress(address _address, DexType _dexType) external onlyOwner{
        if(_dexType == DexType.Uniswap){
            delete uni_supportedPoolAddresses[_address];
        }
    }

    function addSupportedPositionManagerAddresses(address _address, DexType _dexType) external onlyOwner{
        if(_dexType == DexType.Uniswap){
            uni_supportedPositionManagerAddresses[_address] = true;
        }
    }

    function removeSupportedPositionManagerAddresses(address _address, DexType _dexType) external onlyOwner{
        if(_dexType == DexType.Uniswap){
            delete uni_supportedPositionManagerAddresses[_address];
        }
        
    }

    function addSupportedSwapRouterAddresses(address _address, DexType _dexType) external onlyOwner{
        if(_dexType == DexType.Uniswap){
            uni_supportedSwapRouterAddresses[_address] = true;
        }
    }

    function removeSupportedSwapRouterAddresses(address _address, DexType _dexType) external onlyOwner{
        if(_dexType == DexType.Uniswap){
            delete uni_supportedSwapRouterAddresses[_address];
        }
    }

    function functionCheckType(address _txSender, address _sender, address _recipient) external override view returns(TransferType){
    //function functionCheckType(address _txSender, address _sender, address _recipient) external override view onlyDiamond returns(TransferType){
        TransferType transferType = TransferType.RegularTransfer;

        if(uni_supportedPositionManagerAddresses[_txSender] == true || uni_supportedSwapRouterAddresses[_txSender] == true){
            //uniswap TX
            if(uni_supportedPositionManagerAddresses[_txSender] == true){
                //Add or remove liquidity
                if(uni_supportedPoolAddresses[_recipient] == true){
                    //Adding liquidity
                    transferType = TransferType.AddingLiquidity;
                }
                else if(uni_supportedPoolAddresses[_sender] == true){
                    //Removing liquidity
                    transferType = TransferType.RemovingLiquidity;
                }
            }
            else{
                if(uni_supportedPoolAddresses[_recipient]){
                    //Selling to a liquidity pool
                    transferType = TransferType.SellToLiquidityPool;
                }
                else if(uni_supportedPoolAddresses[_sender]){
                    //Buying from a liquidity pool
                    transferType = TransferType.BuyFromLiquidityPool;
                }
            }
        }
        else if (uni_supportedPoolAddresses[_txSender] == true && uni_supportedPoolAddresses[_sender]){
            //Buying from a liquidity pool
            transferType = TransferType.BuyFromLiquidityPool;
        }

        return transferType;
    }
}