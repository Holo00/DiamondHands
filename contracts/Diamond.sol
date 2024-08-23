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
import "./Interfaces/IWETH.sol";


contract Diamond is ERC20, Ownable {
    IMarketStatus public marketStatusContract;
    ISwaperHelper public swapHelperContract;
    IDiamondMiner public diamondMinerContract;
    IDiamondHelper public diamondHelperContract;
    IDiamondTransferType public diamondTransferTypeContract;
    IWETH wethContract;

    uint256 public constant INITIAL_SUPPLY = 10_000_000 * 10**18;
    uint256 public constant TEAM_ALLOCATION = INITIAL_SUPPLY * 10 / 100;
    uint256 public pumpingIncentivesSupply = INITIAL_SUPPLY * 90 / 100;
    uint256 public holdersAirdropAccount = 0;
    uint256 public liquidityProvidersAirdropAccount = 0;
    uint256 public diamondMinersAirdropAccount = 0;
    uint256 public lastDistributionTS = 0;
    uint256 public totalPoints = 0;
    uint256 public creationTime;
    uint256 ethMinBalance = 0;

    LiquidityPoolToMCAP public poolRatio;
    Status public status;

    HolderInfo[] public holdersinfo;
    mapping(address => uint256) public holderIndex;
    mapping(address => bool) public isIndexedHolderIndex;

    event DiamondTransfer(TransferType indexed transferType, address sender, address indexed from, address indexed to, uint256 value);


    constructor(address _marketStatusAddress, address _wethAddress) ERC20("Diamond", "DIAM") Ownable()
    {
        creationTime = block.timestamp;
        marketStatusContract = IMarketStatus(_marketStatusAddress);
        wethContract = IWETH(_wethAddress);
        _mint(msg.sender, TEAM_ALLOCATION);
        _mint(address(this), pumpingIncentivesSupply);

        //uint256 sup = 10_000_000 * 10**18;
        //_mint(msg.sender, sup * 10 / 100);
        //_mint(address(this),sup * 90 / 100);
    }

    modifier onlyDiamondMiner() {
        require(msg.sender == address(diamondMinerContract), "Only the DiamondMiner contract can call this function");
        _;
    }

    function setDiamondMinerContract(address _Contract) external onlyOwner {
        diamondMinerContract = IDiamondMiner(_Contract);
    }

    function setDiamondHelperContract(address _Contract) external onlyOwner {
        diamondHelperContract = IDiamondHelper(_Contract);
    }

    function setSwapHelperContract(address _Contract) external onlyOwner {
        swapHelperContract = ISwaperHelper(_Contract);
    }

    function setTransferHelperContract(address _Contract) external onlyOwner {
        diamondTransferTypeContract = IDiamondTransferType(_Contract);
    }

    function setETHMinBalance(uint256 _min) external onlyOwner{
        ethMinBalance = _min;
    }

    function refundGas(uint256 gasStart) internal {
        uint256 gasUsed = gasStart - gasleft();
        uint256 gasCost = gasUsed * tx.gasprice;
        if (address(this).balance >= gasCost) {
            (bool success, ) = msg.sender.call{value: gasCost}("");
            require(success, "Gas reimbursement failed");
        }
    }

    function moveToAirdropAccounts() external onlyOwner{
        require(block.timestamp - lastDistributionTS > 82800, "Too soon for Airdrop");
        uint256 gasStart = gasleft();

        poolRatio = marketStatusContract.getPoolToCap(address(this));
        status = marketStatusContract.getMarketStatus(address(this));

        if(status.status != 0){
            buyETHForMinimumBalanceRequired();

            if(status.status <= 2){
                //if the market is bullish an amount of the token is sold for ETH
                buyETHFromSupply();
                // move the tokens from the pumpingincentives to the airdrop accounts
                moveToLiquidityProvidersAccount();
                moveToDiamondMinerHoldersAccount();
                moveToHoldersAccount();
            }
            else {
                buyBackAndBurn();
            }

            lastDistributionTS =  block.timestamp;
        }

        refundGas(gasStart);
    }

    function buyETHForMinimumBalanceRequired() internal {
        //refund the ETH balance of the contract if too low
        if(balanceOf(address(this)) < ethMinBalance){
            uint256 ethToBuy = ethMinBalance - address(this).balance;
            uint256 maxTokensSpent = pumpingIncentivesSupply / 1000;
            uint256 spent = swapHelperContract.sellForETHInETH(ethToBuy, maxTokensSpent);
            pumpingIncentivesSupply -=spent;
            unwrapWETH();
        }
    }

    function buyETHFromSupply() internal {
        uint256 amountToSell = pumpingIncentivesSupply / 100 / diamondHelperContract.getContractAgeAirdropDivider(creationTime);
        swapHelperContract.sellForETH(amountToSell);
        pumpingIncentivesSupply -= amountToSell;
    }

    function buyBackAndBurn() internal {
        if(address(this).balance - address(this).balance / 10 > ethMinBalance){
            //buy back with 10% of the ETH balance
            uint256 ethToBuy = address(this).balance / 10;
            wethContract.deposit{value: ethToBuy}();
            uint256 boughtTokens = swapHelperContract.buyBack(ethToBuy);
            //burn half of the token bought
            _burn(address(this), boughtTokens / 2);
            pumpingIncentivesSupply += boughtTokens / 2;
        }
    }

    function moveToLiquidityProvidersAccount() internal{
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

        incentives = incentives / diamondHelperContract.getContractAgeAirdropDivider(creationTime);

        pumpingIncentivesSupply -= incentives;
        liquidityProvidersAirdropAccount += incentives;
    }

    function moveToHoldersAccount() internal{
        uint256 incentives = pumpingIncentivesSupply / 100 / diamondHelperContract.getContractAgeAirdropDivider(creationTime);
        pumpingIncentivesSupply -= incentives;
        holdersAirdropAccount += incentives;
    }

    function moveToDiamondMinerHoldersAccount() internal{
        uint256 incentives = pumpingIncentivesSupply / 1000 * 5 / diamondHelperContract.getContractAgeAirdropDivider(creationTime);
        pumpingIncentivesSupply -= incentives;
        diamondMinersAirdropAccount += incentives;
    }

    function airdropToLiquidityProviders(address[] calldata recipients, uint256[] calldata deposits, uint256 totalDeposits, bool isLast) external onlyOwner {
        uint256 gasStart = gasleft();
        uint256 quantity = diamondHelperContract.getAirDropSize(liquidityProvidersAirdropAccount, status);
        
        for(uint256 i = 0; i < recipients.length; i++){
            uint256 amount = quantity * deposits[i] / totalDeposits;
            super._transfer(address(this), recipients[i], amount);
        }

        if(isLast){
            liquidityProvidersAirdropAccount -= quantity;
        }
        refundGas(gasStart);
    }

    function airDropToHolders(uint256[] calldata _recipientsIndex, uint256 _adjustedTotalPoints, bool _isLast) external onlyOwner {
        require(_adjustedTotalPoints <= totalPoints, "Adjusted total points cannot be higher than total points");
        uint256 gasStart = gasleft();
        uint256 quantity = diamondHelperContract.getAirDropSize(holdersAirdropAccount, status);

        for(uint256 i = 0; i < _recipientsIndex.length; i++){
            HolderInfo memory holder = holdersinfo[_recipientsIndex[i]];
            uint256 whaleRealPoints = holder.dipPoints / diamondHelperContract.applyWhaleHandicap(balanceOf(holder.add), totalSupply());
            uint256 amount = quantity * (whaleRealPoints / _adjustedTotalPoints);

            super._transfer(address(this), holder.add, amount);
        }

        if(_isLast){
            holdersAirdropAccount -= quantity;
        }
        refundGas(gasStart);
    }

    function airdropToDiamondMiners(address[] calldata _recipients, bool _isLast) external onlyOwner {
        uint256 gasStart = gasleft();
        uint256 quantity = diamondHelperContract.getAirDropSize(diamondMinersAirdropAccount, status);

        for(uint256 i = 0; i < _recipients.length; i++){
            uint256 dMiners = diamondMinerContract.balanceOf(_recipients[i]);
            uint256 amount = quantity * dMiners / diamondMinerContract.totalSupply();

            super._transfer(address(this), _recipients[i], amount);
        }

        if(_isLast){
            diamondMinersAirdropAccount -= quantity;
        }
        refundGas(gasStart);
    }


    function _transfer(address _sender, address _recipient, uint256 _amount) internal override {
        require(address(marketStatusContract) != address(0), "MarketStatus contract not initialized");
        require(address(diamondHelperContract) != address(0), "DiamondHelperContract contract not initialized");
        require(address(diamondTransferTypeContract) != address(0), "DiamondTransferTypeContract contract not initialized");

        TransferType tType = diamondTransferTypeContract.functionCheckType(msg.sender, _sender, _recipient);

        if(tType == TransferType.AddingLiquidity || tType == TransferType.RemovingLiquidity){
            super._transfer(_sender,_recipient, _amount);
        }
        else if(tType == TransferType.BuyFromLiquidityPool){
            //recipient is a buyer, buyer pays fee
            status = marketStatusContract.getMarketStatus(address(this));
            uint256 buyerFee = diamondHelperContract.getBuyerFee(_amount, status);
            uint256 amountAfterFee = _amount - buyerFee;

            if(buyerFee > 0){
                super._transfer(_sender , address(this), buyerFee);
            }

            super._transfer(_sender, _recipient, amountAfterFee);
            uint256 buyer = findOrAddHolder(_recipient);
            addHolderTx(buyer, amountAfterFee);
        }
        else if(tType == TransferType.SellToLiquidityPool){
            //sender is a seller, seller pays fee
            status = marketStatusContract.getMarketStatus(address(this));
            uint256 sellerFee = diamondHelperContract.getSellerFee(_amount, status);
            uint256 amountAfterFee = _amount - sellerFee;

            if(sellerFee > 0){
                super._transfer(_sender, address(this), sellerFee);
            }

            super._transfer(_sender, _recipient, amountAfterFee);
            uint256 seller = findOrAddHolder(_sender);
            removeHolderTxs(seller, _amount, true);
        }
        else{
            //regular transfer, both sender and receipient pays fee
            uint256 sellerFee = diamondHelperContract.getSellerFee(_amount, status);
            uint256 buyerFee = diamondHelperContract.getBuyerFee(_amount, status);
            uint256 totalFees = sellerFee + buyerFee;
            uint256 amountAfterFee = _amount - totalFees;

            if(totalFees > 0){
                super._transfer(_sender , address(this), totalFees);
            }

            super._transfer(_sender, _recipient, amountAfterFee);

            uint256 seller = findOrAddHolder(_sender);
            uint256 buyer = findOrAddHolder(_recipient);
            removeHolderTxs(seller, _amount, true);
            addHolderTx(buyer, amountAfterFee);
        }

        emit DiamondTransfer(tType, msg.sender, _sender, _recipient, _amount);
    }

    function findOrAddHolder(address _address) internal returns(uint256){
        if(isIndexedHolderIndex[_address]){
            return holderIndex[_address];
        }

        HolderInfo storage info = holdersinfo[holdersinfo.length];
        info.isDefined = true;
        holderIndex[_address] = holdersinfo.length - 1;
        return holderIndex[_address];
    }

    function addHolderTx(uint256 _index, uint256 _amount) internal {
        Transaction memory txs = Transaction(_amount, diamondHelperContract.getDipPoints(status), block.timestamp);
        holdersinfo[_index].txs.push(txs);
        holdersinfo[_index].dipPoints = txs.dipPointsPerUnit * txs.qty;
        totalPoints +=  txs.dipPointsPerUnit * txs.qty;
    }

    function removeHolderTxs(uint256 _index, uint256 _amount, bool removeDipPoints) internal {
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
        }
    }

    function burn(address _sender, uint256 _amount) external {
        _burn(_sender, _amount);
        //remove the empty transactions, but keeps the points
        removeHolderTxs(holderIndex[_sender], _amount, false);
    }

    function transferToLottery(address _from, uint256 _amount) external onlyDiamondMiner {
        super._transfer(_from, address(diamondMinerContract), _amount);
        //remove the empty transactions, but keeps the points
        removeHolderTxs(holderIndex[_from], _amount, false);
    }

    function transferFromLottery(address _to, uint256 _amount) external onlyDiamondMiner {
        super._transfer(address(diamondMinerContract), _to, _amount);
    }

    function unwrapWETH() internal {
        uint256 wethBalance = wethContract.balanceOf(address(this));
        if (wethBalance > 0) {
            wethContract.withdraw(wethBalance);
        }
    }

    // Allow the contract to receive ETH
    receive() external payable {}
}