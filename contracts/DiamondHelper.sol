// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./MarketStatus.sol";

interface IDiamondHelper {
    function applyWhaleHandicap(address _holderBalance, uint256 _totalSupply) external view returns(uint256);
    function getContractAgeAirdropDivider(uint256 _creationTime) external view returns(uint256);
    function getBuyerFee(uint256 _amount, Status calldata _status) external view returns(uint256);
    function getSellerFee(uint256 _amount, Status calldata _status) external view returns(uint256);
    function getDipPoints(Status calldata _status) external view returns(uint256);
    function getAirDropSize(uint256 _accountSize, Status calldata _status) external view returns(uint256);
}

contract DiamondHelper {

    function getAirDropSize(uint256 _accountSize, Status calldata _status) external pure returns(uint256){
        if(_status.status > 2){
            return _accountSize / 100 * 5;
        }
        else{
            return _accountSize / 100 * 15;
        }
    }

    function applyWhaleHandicap(uint256 _holderBalance, uint256 _totalSupply) external pure returns(uint256){
        uint256 divider = 1;

        if(_holderBalance > _totalSupply / 100){
            divider = divider * 2;
        }

        if(_holderBalance > _totalSupply / 1000 * 5){
            divider = divider * 2;
        }

        if(_holderBalance > _totalSupply / 1000){
            divider = divider * 2;
        }

        return divider;
    }

    function getContractAgeAirdropDivider(uint256 _creationTime) external view returns(uint256){
        uint256 createdLength = block.timestamp - _creationTime;
        if(createdLength > 90 days){
            return 1;
        }
        else if(createdLength > 60 days){
            return 2;
        }
        else if(createdLength > 30 days){
            return 3;
        }
            
        return 4;
    }

    function getBuyerFee(uint256 _amount, Status calldata _status) external pure returns(uint256){
        if(_status.status == 1){
            return _amount / 1000 * 40;
        }
        else if (_status.status == 2){
            return _amount / 100;
        }
        else if (_status.status == 3){
            return _amount / 1000 * 5;
        }

        return 0;
    }

    function getSellerFee(uint256 _amount, Status calldata _status) external pure returns(uint256){
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

    function getDipPoints(Status calldata _status) external pure returns(uint256){
        uint256 dipPoints = 100;

        if(_status.drawDown1 >= 10){
            if(_status.drawDown1 >= 50){
                dipPoints += 500;
            }
            else{
                dipPoints += 100 + (_status.drawDown1 - 10) * 10;
            }
        }

        if(_status.drawDown7 >= 20){
            if(_status.drawDown7 >= 70){
                dipPoints += 800;
            }
            else{
                dipPoints += 150 + (_status.drawDown7 - 20) * (800 - 150) / (70 - 20);
            }
        }

        if(_status.drawDown30 >= 30){
            if(_status.drawDown30 >= 90){
                dipPoints += 1200;
            }
            else{
                dipPoints += 300 + (_status.drawDown30 - 30) * (1200 - 300) / (90 - 30);
            }
        }

        return dipPoints;
    }
}