// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "./MarketStatus.sol";
import "./SwapHelper.sol";
import "./DiamondHelper.sol";
import "./DiamondMiner.sol";


struct HolderInfo{
    address add;
    Transaction[] txs;
    uint256 dipPoints;
}

struct Transaction{
    uint256 qty;
    uint256 dipPointsPerUnit;
    uint256 ts;
}

interface IDiamond{
    function burn(address _sender, uint256 _amount) external;
    function balanceOf(address _account) external view returns (uint256);
    function transferToLottery(address _from, address _to, uint256 _amount) external;
    function transferFromLottery(address _to, uint256 _amount) external;
}


contract Diamond is ERC20, Ownable {

    using SafeMath for uint256;

    IMarketStatus public marketStatusContract;
    ISwaperHelper public swapHelperContract;
    IDiamondMiner public diamondMinerContract;
    IDiamondHelper public diamondHelperContract;

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

    mapping(address => uint256) public holderIndex;
    HolderInfo[] public holdersinfo;

    mapping(address => bool) supportedPoolAddresses;


    constructor(address _owner, address _marketStatusAddress) ERC20("Diamond", "DIAM") Ownable(_owner) 
    {
        creationTime = block.timestamp;
        marketStatusContract = IMarketStatus(_marketStatusAddress);
        _mint(msg.sender, TEAM_ALLOCATION);
        _mint(address(this), pumpingIncentivesSupply);
    }

    modifier onlyDiamondMiner() {
        require(msg.sender == address(diamondMinerContract), "Only the DiamondMiner contract can call this function");
        _;
    }

    function setDiamondMinerContract(address _diamondMinerContract) external onlyOwner {
        diamondMinerContract = IDiamondMiner(_diamondMinerContract);
    }

    function setDiamondHelperContract(address _diamondHelperContract) external onlyOwner {
        diamondHelperContract = IDiamondHelper(_diamondHelperContract);
    }

    function setSwapHelperContract(address _swapHelperContract) external onlyOwner {
        swapHelperContract = ISwaperHelper(_swapHelperContract);
    }

    function addSupportedPoolAddress(address _address) external onlyOwner{
        supportedPoolAddresses[_address] = true;
    }

    function removeSupportedPoolAddress(address _address) external onlyOwner{
        delete supportedPoolAddresses[_address];
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
            ethToBuy = ethMinBalance.sub(address(this).balance);
            maxTokensSpent = pumpingIncentivesSupply.div(1000);
            uint256 spent = swapHelper.sellForETHInETH(ethToBuy, maxTokensSpent);
            pumpingIncentivesSupply = pumpingIncentivesSupply.sub(spent);
            unwrapWETH();
        }
    }

    function buyETHFromSupply() internal {
        uint256 amountToSell = pumpingIncentivesSupply.div(100).div(diamondHelperContract.getContractAgeAirdropDivider(creationTime));
        swapHelper.sellForETH(amountToSell);
        pumpingIncentivesSupply = pumpingIncentivesSupply.sub(amountToSell);
    }

    function buyBackAndBurn() internal {
        if(address(this).balance - address(this).balance.div(10) > ethMinBalance){
            //buy back with 10% of the ETH balance
            ethToBuy = address(this).balance.div(10);
            WETH.deposit{value: ethToBuy}();
            uint256 boughtTokens= swapHelperContract.buyBack(ethToBuy);
            //burn half of the token bought
            _burn(boughtTokens.div(2));
            pumpingIncentivesSupply += boughtTokens.div(2);
        }
    }

    function moveToLiquidityProvidersAccount() internal{
        uint256 incentives = 0;

        if(poolRatio.ratio > 10){
            incentives = pumpingIncentivesSupply.div(100);
        }
        else if(poolRatio.ratio > 5){
            incentives = pumpingIncentivesSupply.div(1000).mul(5);
        }
        else{
            incentives = pumpingIncentivesSupply.div(1000).mul(3);
        }

        incentives = incentives.div(diamondHelperContract.getContractAgeAirdropDivider(creationTime));

        pumpingIncentivesSupply = pumpingIncentivesSupply.sub(incentives);
        liquidityProvidersAirdropAccount = liquidityProvidersAirdropAccount.add(incentives);
    }

    function moveToHoldersAccount() internal{
        uint256 incentives = pumpingIncentivesSupply.div(100).div(diamondHelperContract.getContractAgeAirdropDivider(creationTime));
        pumpingIncentivesSupply = pumpingIncentivesSupply.sub(incentives);
        holdersAirdropAccount = holdersAirdropAccount.add(incentives);
    }

    function moveToDiamondMinerHoldersAccount() internal{
        uint256 incentives = pumpingIncentivesSupply.div(1000).mul(5).div(diamondHelperContract.getContractAgeAirdropDivider(creationTime));
        pumpingIncentivesSupply = pumpingIncentivesSupply.sub(incentives);
        diamondMinersAirdropAccount = diamondMinersAirdropAccount.add(incentives);
    }

    function airdropToLiquidityProviders(address[] calldata recipients, uint256[] calldata deposits, uint256 totalDeposits, bool isLast) external onlyOwner {
        uint256 gasStart = gasleft();
        uint256 quantity = diamondHelperContract.getAirDropSize(liquidityProvidersAirdropAccount, status);
        
        for(uint256 i = 0; i < recipients.length; i++){
            uint256 amount = quantity * deposits[i] / totalDeposits;
            require(super._transfer(address(this), recipients[i], amount), "Token transfer failed");
        }

        if(isLast){
            liquidityProvidersAirdropAccount = liquidityProvidersAirdropAccount.sub(quantity);
        }
        refundGas(gasStart);
    }

    function airDropToHolders(uint256[] _recipientsIndex, uint256 _adjustedTotalPoints, bool _isLast) external onlyOwner {
        require(_adjustedTotalPoints <= totalPoints, "Adjusted total points cannot be higher than total points")
        uint256 gasStart = gasleft();
        uint256 quantity = diamondHelperContract.getAirDropSize(holdersAirdropAccount, status);

        for(uint256 i = 0; i < _recipients.length; i++){
            HolderInfo holder = holdersinfo[_recipientsIndex[i]]
            uint256 whaleRealPoints = holder.dipPoints.div(diamondHelperContract.applyWhaleHandicap(balanceOf(holder.add), totalSupply));
            uint256 amount = quantity * (whaleRealPoints / _adjustedTotalPoints);

            require(super._transfer(address(this), holder.add, remaining), "Token transfer failed");
        }

        if(_isLast){
            holdersAirdropAccount = holdersAirdropAccount.sub(quantity);
        }
        refundGas(gasStart);
    }

    function airdropToDiamondMiners(address[] calldata _recipients, bool _isLast) external onlyOwner {
        uint256 gasStart = gasleft();
        uint256 quantity = diamondHelperContract.getAirDropSize(diamondMinersAirdropAccount, status);

        for(uint256 i = 0; i < _recipients.length; i++){
            uint256 dMiners = diamondMinerContract.balanceOf(_recipients[i]);
            uint256 amount = quantity * dMiners.div(diamondMinerContract.totalSupply);

            require(super._transfer(address(this), _recipients[i], amount), "Token transfer failed");
        }

        if(isLast){
            diamondMinersAirdropAccount -= quantity;
        }
        refundGas(gasStart);
    }

    function _transfer(address _sender, address _recipient, uint256 _amount) internal override {
        status = marketStatusContract.getMarketStatus(address(this));
        if(supportedPositionManagerAddresses[msg.sender]){
            //Adding or removing liquidity to a pool
            super._transfer(_sender,_recipient, _amount);
        }
        else if(supportedPoolAddresses[_recipient]){
            //sender is a seller, seller pays fee
            uint256 sellerFee = diamondHelperContract.getSellerFee(_amount, status);
            uint256 amountAfterFee = _amount - sellerFee;

            if(sellerFee > 0){
                super._transfer(_sender, address(this), sellerFee);
            }

            super._transfer(_sender, _recipient, amountAfterFee);
            uint256 seller = findOrAddHolder(_sender);
            removeHolderTxs(seller, _amount, true);
        }
        else if(supportedPoolAddresses[_sender]){
            //recipient is a buyer, buyer pays fee
            uint256 buyerFee = diamondHelperContract.getBuyerFee(_amount, status);
            uint256 amountAfterFee = _amount - buyerFee;

            if(buyerFee > 0){
                super._transfer(_sender , address(this), buyerFee);
            }

            super._transfer(_sender, _recipient, amountAfterFee);
            uint256 buyer = findOrAddHolder(_recipient);
            addHolderTx(buyer, amountAfterFee);
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
    }

    function findOrAddHolder(address _address) internal returns(uint256){
        if(holderIndex[_address]){
            return holderIndex[_address];
        }

        HolderInfo info = HolderInfo(_address, , 0);
        holdersinfo.push(info);
        holderIndex[_address] = holdersinfo.length - 1;
        return holderIndex[_address];
    }

    function addHolderTx(uint256 _index, uint256 _amount) internal {
        Transaction txs = Transaction(_amount, diamondHelperContract.getDipPoints(status), block.timeStamp);
        holdersinfo[_index].txs.push(txs);
        holdersinfo[_index].dipPoints = txs.dipPointsPerUnit * txs.qty;
        totalPoints += txs.dipPointsPerUnit * txs.qty;
    }

    function removeHolderTxs(uint256 _index, uint256 _amount, bool removeDipPoints) internal {
        HolderInfo holder = holdersinfo[_index];
        uint256 remaining = _amount;
        uint256[] toRemove; 
        if(holder){
            for(uint256 i = 0; i < holder.txs.length; i++){
                if(remaining > holder.txs[i].qty){
                    remaining -= holder.txs[i].qty;
                    if(removeDipPoints){
                        holder.dipPoints -= holder.txs[i].qty * holder.txs[i].dipPointsPerUnit;
                        totalPoints -= holder.txs[i].qty * holder.txs[i].dipPointsPerUnit;
                    }
                    holder.txs[i].qty = 0;
                    toRemove.push(i);
                }
                else{
                    holder.txs[i].qty -= remaining;
                    if(removeDipPoints){
                        holder.dipPoints -= remaining * holder.txs[i].dipPointsPerUnit;
                        totalPoints -= remaining * holder.txs[i].dipPointsPerUnit;
                    }
                    break;
                }
            }

            removeHolderTx(holder, toRemove);
        }
    }

    function removeHolderTx(HolderInfo _holder, uint256[] _toRemove) internal {
        //remove transactions that have no value
        if(_toRemove.length > 0){
            Transaction[] memory newTransactionsArray = new Transaction[](_holder.txs.length - _toRemove.length);
            uint256 newIndex = 0;
            for (uint256 i = 0; i < _holder.txs.length; i++) {
                if (!_toRemove[i]) {
                    newTransactionsArray[newIndex] = _holder.txs[i];
                    newIndex++;
                }
            }
            holder.txs = newTransactionsArray;
        } 
    }

    function burn(address _sender, uint256 _amount) external onlyDiamondMiner {
        _burn(_sender, _amount);
        //remove the empty transactions, but keeps the points
        removeHolderTxs(holderIndex[_sender], _amount, false);
    }

    function transferToLottery(address _from, uint256 _amount) external onlyDiamondMiner {
        super._transfer(_from, address(diamondMinerContract), _amount);
        //remove the empty transactions, but keeps the points
        removeHolderTxs(holderIndex[_sender], _amount, false);
    }

    function transferFromLottery(address _to, uint256 _amount) external onlyDiamondMiner {
        super._transfer(address(diamondMinerContract), _to, _amount);
    }

    function unwrapWETH() internal {
        uint256 wethBalance = WETH.balanceOf(address(this));
        if (wethBalance > 0) {
            WETH.withdraw(wethBalance);
        }
    }

    // Allow the contract to receive ETH
    receive() external payable {}
}