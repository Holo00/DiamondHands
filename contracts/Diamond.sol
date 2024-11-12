// SPDX-License-Identifier: MIT
pragma solidity ^0.7.6;
pragma abicoder v2;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./Enums/DiamondEnums.sol";
import "./Structs/DiamondStructs.sol";
import "./Structs/Status.sol";
import "./Interfaces/IMarketStatus.sol";
import "./Interfaces/ISwaperHelper.sol";
import "./Interfaces/IDiamondMiner.sol";
import "./Interfaces/IDiamondHelper.sol";
import "./Interfaces/IDiamondTransferType.sol";
import "./Interfaces/IDiamondHolders.sol";
import "./Interfaces/IWETH.sol";


contract Diamond is ERC20, Ownable {
    IMarketStatus public msC;
    ISwaperHelper public shC;
    IDiamondMiner public dmC;
    IDiamondHelper public dhC;
    IDiamondTransferType public dTTC;
    IDiamondHolders public dHoldersC; 
    IWETH wethC;

    uint256 public constant INITIAL_SUPPLY = 10_000_000 * 10**18;
    uint256 public constant TEAM_ALLOCATION = INITIAL_SUPPLY * 10 / 100;
    uint256 public incentivesSupply = INITIAL_SUPPLY * 90 / 100;
    uint256 public holdersAirdropA = 0;
    uint256 public liquidityPAirdropA = 0;
    uint256 public dMinersAirdropA = 0;
    uint256 public lastDistributionTS = 0;
    uint256 public creationTime;
    uint256 public ethMinBalance = 0;

    Status public status;

    event DiamondTransfer(TransferType indexed transferType, address sender, address indexed from, address indexed to, uint256 value);

    constructor(address _wethAddress) ERC20("Diamond", "DIAM") Ownable()
    {
        creationTime = block.timestamp;
        wethC = IWETH(_wethAddress);
        _mint(msg.sender, TEAM_ALLOCATION);
        _mint(address(this), incentivesSupply);
    }

    modifier onlyDM() {
        require(msg.sender == address(dmC), "ODM"); //Only the DiamondMiner contract can call this function
        _;
    }

    function setMarketStatusC(address _C) external onlyOwner {
        msC = IMarketStatus(_C);
    }

    function setDiamondMinerC(address _C) external onlyOwner {
        dmC = IDiamondMiner(_C);
    }

    function setDiamondHelperC(address _C) external onlyOwner {
        dhC = IDiamondHelper(_C);
    }

    function setSwapHelperC(address _C) external onlyOwner {
        shC = ISwaperHelper(_C);
    }

    function setTransferHelperC(address _C) external onlyOwner {
        dTTC = IDiamondTransferType(_C);
    }

    function setDiamondHolderC(address _C) external onlyOwner {
        dHoldersC = IDiamondHolders(_C);
    }

    function setETHMinBalance(uint256 _min) external onlyOwner{
        ethMinBalance = _min;
    }

    function refundGas(uint256 gasStart) internal {
        uint256 gasUsed = gasStart - gasleft();
        uint256 gasCost = gasUsed * tx.gasprice;
        if (address(this).balance >= gasCost) {
            address payable ref = payable(msg.sender);
            bool success = ref.send(gasCost);
            require(success, "GRF"); // Gas reimbursement failed
        }
    }

    function moveToAirdropAccounts() external onlyOwner{
        require(block.timestamp - lastDistributionTS > 82800, "TSA"); //Too soon for Airdrop
        uint256 gasStart = gasleft();

        //poolRatio = msC.getPoolToCap(address(this));
        status = msC.getMarketStatus(address(this));

        if(status.status != 0){
            buyETHForMinimumBalanceRequired();

            if(status.status <= 2){
                //if the market is bullish an amount of the token is sold for ETH
                buyETHFromSupply();
                // move the tokens from the pumpingincentives to the airdrop accounts
                //moveToLiquidityProvidersAccount();
                //moveToDiamondMinerHoldersAccount();
                //moveToHoldersAccount();
                moveToAirdropAccounts2();
            }
            else {
                buyBackAndBurn();
            }

            lastDistributionTS =  block.timestamp;
        }

        refundGas(gasStart);
    }

    function buyETHForMinimumBalanceRequired() public {
        //refund the ETH balance of the contract if too low
        if(balanceOf(address(this)) < ethMinBalance * 9 / 10){
            uint256 ethToBuy = ethMinBalance - balanceOf(address(this));
            uint256 maxTokensSpent = incentivesSupply / 1000;
            uint256 spent = shC.sellForETHInETH(ethToBuy, maxTokensSpent);
            incentivesSupply -=spent;
            unwrapWETH();
        }
    }

    function buyETHFromSupply() internal {
        uint256 amountToSell = incentivesSupply / 100 / dhC.getCAADivider(creationTime);
        shC.sellForETH(amountToSell);
        incentivesSupply -= amountToSell;
    }

    function buyBackAndBurn() internal {
        if(address(this).balance - address(this).balance / 10 > ethMinBalance){
            //buy back with 10% of the ETH balance
            uint256 ethToBuy = address(this).balance / 10;
            wethC.deposit{value: ethToBuy}();
            uint256 boughtTokens = shC.buyBack(ethToBuy);
            //burn half of the token bought
            _burn(address(this), boughtTokens / 2);
            incentivesSupply += boughtTokens / 2;
        }
    }

    function moveToAirdropAccounts2() internal {
        uint256 divider = dhC.getCAADivider(creationTime);
        uint256 incLP = dhC.getLiquidityPIncentives(incentivesSupply, address(this)) / divider;
        uint256 incH = incentivesSupply / 100 / divider;
        uint256 incDM = incentivesSupply / 1000 * 5 / divider;

        incentivesSupply -= (incLP + incH + incDM);
        liquidityPAirdropA += incLP;
        holdersAirdropA += incH;
        dMinersAirdropA += incDM;
    }

    // function moveToLiquidityProvidersAccount() internal{
    //     uint256 inc = dhC.getLiquidityPIncentives(incentivesSupply, poolRatio);
    //     inc = inc / dhC.getCAADivider(creationTime);
    //     incentivesSupply -= inc;
    //     liquidityPAirdropA += inc;
    // }

    // function moveToHoldersAccount() internal{
    //     uint256 inc = incentivesSupply / 100 / dhC.getCAADivider(creationTime);
    //     incentivesSupply -= inc;
    //     holdersAirdropA += inc;
    // }

    // function moveToDiamondMinerHoldersAccount() internal{
    //     uint256 inc = incentivesSupply / 1000 * 5 / dhC.getCAADivider(creationTime);
    //     incentivesSupply -= inc;
    //     dMinersAirdropA += inc;
    // }

    function airdropToLiquidityProviders(address[] calldata recipients, uint256[] calldata deposits, uint256 totalDeposits, bool isLast) external onlyOwner {
        uint256 gasStart = gasleft();
        uint256 quantity = dhC.getAirDropSize(liquidityPAirdropA, status);
        
        for(uint256 i = 0; i < recipients.length; i++){
            uint256 amount = quantity * deposits[i] / totalDeposits;
            super._transfer(address(this), recipients[i], amount);
        }

        if(isLast){
            liquidityPAirdropA -= quantity;
        }
        refundGas(gasStart);
    }

    function airDropToHolders(uint256[] calldata _recipientsIndex, uint256 _adjustedTotalPoints, bool _isLast) external onlyOwner {
        require(_adjustedTotalPoints <= dHoldersC.totalPoints(), "ATPHTP"); //Adjusted total points cannot be higher than total points
        uint256 gasStart = gasleft();
        uint256 quantity = dhC.getAirDropSize(holdersAirdropA, status);

        for(uint256 i = 0; i < _recipientsIndex.length; i++){
            HolderInfo memory holder = dHoldersC.getHolderByIndex(_recipientsIndex[i]);
            uint256 whaleRealPoints = holder.dipPoints / dhC.applyWhaleHandicap(balanceOf(holder.add), totalSupply());
            uint256 amount = quantity * (whaleRealPoints / _adjustedTotalPoints);

            super._transfer(address(this), holder.add, amount);
        }

        if(_isLast){
            holdersAirdropA -= quantity;
        }
        refundGas(gasStart);
    }

    function airdropToDiamondMiners(address[] calldata _recipients, bool _isLast) external onlyOwner {
        uint256 gasStart = gasleft();
        uint256 quantity = dhC.getAirDropSize(dMinersAirdropA, status);

        for(uint256 i = 0; i < _recipients.length; i++){
            uint256 dMiners = dmC.balanceOf(_recipients[i]);
            uint256 amount = quantity * dMiners / dmC.totalSupply();

            super._transfer(address(this), _recipients[i], amount);
        }

        if(_isLast){
            dMinersAirdropA -= quantity;
        }
        refundGas(gasStart);
    }


    function _transfer(address _sender, address _recipient, uint256 _amount) internal override {
        require(address(msC) != address(0) && address(dhC) != address(0) && address(dTTC) != address(0), "CNI"); //Contract not initialized
        require(balanceOf(_sender) >= _amount, "IB"); //Balance does not cover amount + fees

        TransferType tType = dTTC.functionCheckType(msg.sender, _sender, _recipient);
        status = msC.getMarketStatus(address(this));

        if(tType == TransferType.AddingLiquidity || tType == TransferType.RemovingLiquidity){
            super._transfer(_sender,_recipient, _amount);
        }
        else if(tType == TransferType.BuyFromLiquidityPool){
            //recipient is a buyer, buyer pays fee
            uint256 buyerFee = dhC.getBuyerFee(_amount, status);
            uint256 amountAfterFee = _amount - buyerFee;

            if(buyerFee > 0){
                super._transfer(_sender , address(this), buyerFee);
            }

            super._transfer(_sender, _recipient, amountAfterFee);
            uint256 buyer = dHoldersC.findOrAddHolder(_recipient);
            dHoldersC.addHolderTx(buyer, amountAfterFee, status);
        }
        else if(tType == TransferType.SellToLiquidityPool){
            //sender is a seller, seller pays fee
            uint256 sellerFee = dhC.getSellerFee(_amount, status);
            require(balanceOf(_sender) >= _amount + sellerFee, "BNCAF"); //Balance does not cover amount + fees

            if(sellerFee > 0){
               super._transfer(_sender, address(this), sellerFee);
            }

            super._transfer(_sender, _recipient, _amount);
            uint256 seller = dHoldersC.findOrAddHolder(_sender);
            dHoldersC.removeHolderTxs(seller, _amount, true);
        }
        else{
            //regular transfer, both sender and receipient pays fee
            uint256 sellerFee = dhC.getSellerFee(_amount, status);
            uint256 buyerFee = dhC.getBuyerFee(_amount, status);
            uint256 totalFees = sellerFee + buyerFee;
            uint256 amountAfterFee = _amount - totalFees;

            if(totalFees > 0){
                super._transfer(_sender , address(this), totalFees);
            }

            super._transfer(_sender, _recipient, amountAfterFee);

            uint256 seller = dHoldersC.findOrAddHolder(_sender);
            uint256 buyer = dHoldersC.findOrAddHolder(_recipient);
            dHoldersC.removeHolderTxs(seller, _amount, true);
            dHoldersC.addHolderTx(buyer, amountAfterFee, status);
        }

        emit DiamondTransfer(tType, msg.sender, _sender, _recipient, _amount);
    }


    function burn(address _sender, uint256 _amount) external {
        _burn(_sender, _amount);
        //remove the empty transactions, but keeps the points
        uint256 hIndex = dHoldersC.findOrAddHolder(_sender);
        dHoldersC.removeHolderTxs(hIndex, _amount, false);
    }

    function transferToLottery(address _from, uint256 _amount) external onlyDM {
        super._transfer(_from, address(dmC), _amount);
        //remove the empty transactions, but keeps the points
        uint256 hIndex = dHoldersC.findOrAddHolder(_from);
        dHoldersC.removeHolderTxs(hIndex, _amount, false);
    }

    function transferFromLottery(address _to, uint256 _amount) external onlyDM {
        super._transfer(address(dmC), _to, _amount);
    }

    function unwrapWETH() internal {
        uint256 wethBalance = wethC.balanceOf(address(this));
        if (wethBalance > 0) {
            wethC.withdraw(wethBalance);
        }
    }

    // Allow the contract to receive ETH
    receive() external payable {}
}