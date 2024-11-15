// SPDX-License-Identifier: MIT
pragma solidity ^0.7.6;
pragma abicoder v2;


import "./MarketStatus.sol";
import "./Interfaces/IDiamondHelper.sol";
import "@openzeppelin/contracts/access/Ownable.sol";


contract DiamondHelper is IDiamondHelper, Ownable {
    IMarketStatus public msC;

    constructor() Ownable()
    {
    }

    function setMarketStatusC(address _C) external onlyOwner {
        msC = IMarketStatus(_C);
    }

    function getLiquidityPIncentives(uint256 pumpingIncentivesSupply, address diamondAdd) external view override returns(uint256){
        LiquidityPoolToMCAP memory poolRatio = msC.getPoolToCap(diamondAdd);
        uint256 incentives = 0;

        if(poolRatio.ratio > 10){
            incentives = pumpingIncentivesSupply / 100;
        }
        else if(poolRatio.ratio > 5){
            incentives = pumpingIncentivesSupply / 1000 * 5;
        }
        else{
            incentives = pumpingIncentivesSupply / 1000 * 3;
        }

        return incentives;
    }

    // function getLiquidityPIncentives(uint256 pumpingIncentivesSupply, LiquidityPoolToMCAP calldata poolRatio) external pure override returns(uint256){
    //     uint256 incentives = 0;

    //     if(poolRatio.ratio > 10){
    //         incentives = pumpingIncentivesSupply / 100;
    //     }
    //     else if(poolRatio.ratio > 5){
    //         incentives = pumpingIncentivesSupply / 1000 * 5;
    //     }
    //     else{
    //         incentives = pumpingIncentivesSupply / 1000 * 3;
    //     }

    //     return incentives;
    // }


    function getAirDropSize(uint256 _accountSize, Status calldata _status) external pure override returns(uint256){
        if(_status.status > 2){
            return _accountSize / 100 * 5;
        }
        else{
            return _accountSize / 100 * 15;
        }
    }

    function applyWhaleHandicap(uint256 _holderBalance, uint256 _totalSupply) external pure override returns(uint256){
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

    function getCAADivider(uint256 _creationTime) external view override returns(uint256){
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

    function getBuyerFee(uint256 _amount, Status calldata _status) external pure override returns(uint256){
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

    function getSellerFee(uint256 _amount, Status calldata _status) external pure override returns(uint256){
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

    function getDipPoints(Status calldata _status) external pure override returns(uint256){
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