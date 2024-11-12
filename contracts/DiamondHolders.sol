// SPDX-License-Identifier: MIT
pragma solidity ^0.7.6;
pragma abicoder v2;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./Structs/DiamondStructs.sol";
import "./DiamondCaller.sol";
import "./Interfaces/IDiamondHolders.sol";

contract DiamondHolders is DiamondCaller, IDiamondHolders {
    IDiamondHelper public override diamondHelperContract;

    HolderInfo[] public holdersinfo;
    mapping(address => uint256) public override holderIndex;
    mapping(address => bool) public override isIndexedHolderIndex;

    uint256 public override totalPoints = 0;

    //event HolderAdded(uint256 hIndex, address add);
    //event TransactionAdd(uint256 hIndex, uint256 qty, uint256 dipP);
    //event TransactionRemove(uint256 hIndex, uint256 qty, bool remove);

    constructor() DiamondCaller()
    {

    }

    function setDiamondHelperContract(address _Contract) external override onlyOwner {
        diamondHelperContract = IDiamondHelper(_Contract);
    }

    function getHolderByIndex(uint256 _index) external view override onlyDiamond returns(HolderInfo memory) {
        return holdersinfo[_index];
    }

    function findOrAddHolder(address _address) external override onlyDiamond returns(uint256){
        if(isIndexedHolderIndex[_address] == false){
            holdersinfo.push();
            holdersinfo[holdersinfo.length - 1].isDefined = true;
            holdersinfo[holdersinfo.length - 1].add = _address;
            holderIndex[_address] = holdersinfo.length - 1;
            isIndexedHolderIndex[_address] = true;
            emit HolderAdded(holdersinfo.length - 1, _address);
        }
        
        return holderIndex[_address];
    }

    function addHolderTx(uint256 _index, uint256 _amount, Status memory _status) external override onlyDiamond {
        holdersinfo[_index].txs.push();
        uint256 dipoints = diamondHelperContract.getDipPoints(_status);
        holdersinfo[_index].txs[holdersinfo[_index].txs.length - 1].qty = _amount;
        holdersinfo[_index].txs[holdersinfo[_index].txs.length - 1].dipPointsPerUnit = dipoints;
        holdersinfo[_index].txs[holdersinfo[_index].txs.length - 1].ts = block.timestamp;
        holdersinfo[_index].dipPoints += dipoints * _amount;
        totalPoints +=  dipoints * _amount;
        emit TransactionAdd(_index, _amount, dipoints);
    }


    function removeHolderTxs(uint256 _index, uint256 _amount, bool removeDipPoints) external override onlyDiamond {
        uint256 remaining = _amount;
        if(holdersinfo[_index].isDefined){
            for(uint256 i = 0; i < holdersinfo[_index].txs.length; i++){
                if(holdersinfo[_index].txs[i].qty > 0){
                    if(remaining > holdersinfo[_index].txs[i].qty){
                        remaining -= holdersinfo[_index].txs[i].qty;
                        if(removeDipPoints){
                            holdersinfo[_index].dipPoints -= holdersinfo[_index].txs[i].qty * holdersinfo[_index].txs[i].dipPointsPerUnit;
                            totalPoints -= holdersinfo[_index].txs[i].qty * holdersinfo[_index].txs[i].dipPointsPerUnit;
                        }

                        holdersinfo[_index].txs[i].qty = 0;
                    }
                    else{
                        holdersinfo[_index].txs[i].qty -= remaining;
                        if(removeDipPoints){
                            holdersinfo[_index].dipPoints -= remaining * holdersinfo[_index].txs[i].dipPointsPerUnit;
                            totalPoints -= remaining * holdersinfo[_index].txs[i].dipPointsPerUnit;
                        }
                        break;
                    }
                }
            }
                
            emit TransactionRemove(_index, _amount, removeDipPoints);
        }
    }
}