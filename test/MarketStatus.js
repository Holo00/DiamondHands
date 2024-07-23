const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("MarketStatus", function () {
    let MarketStatus, marketStatus, owner, addr1;
  
    before(async function () {
        [owner, addr1] = await ethers.getSigners();
        MarketStatus = await ethers.getContractFactory("MarketStatus");
        marketStatus = await MarketStatus.deploy(owner.address);
        await marketStatus.deploymentTransaction().wait();
    });
  
    it("should set and get market status correctly", async function () {
        const status = {
            status: 1,
            price: ethers.parseEther("1.0"),
            drawDown1: 5,
            drawDown7: 10,
            drawDown30: 15,
            timeStamp: Math.floor(Date.now() / 1000)
        };

        await marketStatus.setMarketStatus(
            addr1.address,
            status.status,
            status.price,
            status.drawDown1,
            status.drawDown7,
            status.drawDown30,
            status.timeStamp
        );

        const result = await marketStatus.getMarketStatus(addr1.address);

        expect(result.status).to.equal(status.status);
        expect(result.price).to.equal(status.price);
        expect(result.drawDown1).to.equal(status.drawDown1);
        expect(result.drawDown7).to.equal(status.drawDown7);
        expect(result.drawDown30).to.equal(status.drawDown30);
        expect(result.timeStamp).to.equal(status.timeStamp);
    });
  
    it("should set and get liquidity pool to market cap ratio correctly", async function () {
        const ratio = {
            ratio: 50,
            liquidityProvidersAddresses: [addr1.address],
            timeStamp: Math.floor(Date.now() / 1000)
        };

        await marketStatus.setLiquidityPoolToMCAP(
            addr1.address,
            ratio.ratio,
            ratio.liquidityProvidersAddresses,
            ratio.timeStamp
        );

        const result = await marketStatus.getPoolToCap(addr1.address);

        expect(result.ratio).to.equal(ratio.ratio);
        expect(result.liquidityProvidersAddresses).to.deep.equal(ratio.liquidityProvidersAddresses);
        expect(result.timeStamp).to.equal(ratio.timeStamp);
    });
});