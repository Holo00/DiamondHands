// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "./MarketStatus.sol";
import "./Diamond.sol";

interface IDiamondHelper {
    function applyWhaleHandicap(address _holderBalance, uint256 _totalSupply) external view returns(uint256);
    function getContractAgeAirdropDivider(uint256 _creationTime) external view returns(uint256);
    function getBuyerFee(uint256 _amount, MarketStatus calldata _status) external view returns(uint256);
    function getSellerFee(uint256 _amount, MarketStatus calldata _status) external view returns(uint256);
    function getDipPoints(MarketStatus calldata _status) external view returns(uint256);
    function getAirDropSize(uint256 _accountSize, MarketStatus calldata _status) external view returns(uint256);
}

contract DiamondHelper {
    using SafeMath for uint256;

    function getAirDropSize(uint256 _accountSize, MarketStatus calldata _status) external view returns(uint256){
        if(_status.status > 2){
            return _accountSize.div(100).mul(5);
        }
        else{
            return _accountSize.div(100).mul(15);
        }
    }

    function applyWhaleHandicap(uint256 _holderBalance, uint256 _totalSupply) external view returns(uint256){
        uint256 divider = 1;

        if(_holderBalance > _totalSupply.div(100)){
            divider = divider.mul(2);
        }

        if(_holderBalance > _totalSupply.div(1000).mul(5)){
            divider = divider.mul(2);
        }

        if(_holderBalance > _totalSupply.div(1000)){
            divider = divider.mul(2);
        }

        return divider;
    }

    function getContractAgeAirdropDivider(uint256 _creationTime) external view returns(uint256){
        if(block.timestamp - _creationTime > 90 days){
            return 1;
        }
        else if(block.timestamp - _creationTime > 60 days){
            return 2;
        }
        else if(block.timestamp - _creationTime > 30 days){
            return 3;
        }
            
        return 4;
    }

    function getBuyerFee(uint256 _amount, MarketStatus calldata _status) external view returns(uint256){
        if(_status.status == 1){
            return _amount / 1000 * 40;
        }
        else if (_status.status == 2){
            return _amount / 1000 * 10;
        }
        else if (_status.status == 3){
            return _amount / 1000 * 5;
        }
        else if (_status.status == 4){
            return _amount / 1000 * 0;
        }

        return 0
    }

    function getSellerFee(uint256 _amount, MarketStatus calldata _status) external view returns(uint256){
        if(_status.status == 1){
            return _amount / 1000 * 5;
        }
        else if (_status.status == 2){
            return _amount / 1000 * 10;
        }
        else if (_status.status == 3){
            return _amount / 1000 * 15;
        }
        else if (_status.status == 4){
            return _amount / 1000 * 40;
        }

        return 0;
    }

    function getDipPoints(MarketStatus calldata _status) external view returns(uint256){
        uint256 dipPoints = 100;

        if(_status.drawDown1 > 10){
            if(_status.drawDown1 > 50){
                dipPoints += 500;
            }
            else{
                dipPoints += 100 + (_status.drawDown1 - 10) * 100;
            }
        }

        if(_status.drawDown7 > 20){
            if(_status.drawDown7 > 70){
                dipPoints += 800;
            }
            else{
                dipPoints += 150 + ((_status.drawDown7 - 20) * (800 - 150)) / (70 - 20);
            }
        }

        if(_status.drawDown30 > 30){
            if(_status.drawDown30 > 90){
                dipPoints += 1200;
            }
            else{
                dipPoints += 300 + ((_status.drawDown30 - 30) * (1200 - 300)) / (90 - 30);
            }
        }

        return dipPoints;
    }
}