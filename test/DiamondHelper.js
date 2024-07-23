const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("DiamondHelper", function () {
    let DiamondHelper, diamondHelper;
  
    before(async function () {
        DiamondHelper = await ethers.getContractFactory("DiamondHelper");
        diamondHelper = await DiamondHelper.deploy();
        await diamondHelper.deploymentTransaction().wait();
    });
  
    it("should return correct airdrop size", async function () {
        const status = { status: 3, price: 123456, drawDown1: 0, drawDown7: 0, drawDown30: 0, timeStamp: 123456 };
        const accountSize = ethers.parseEther("100");
        const airdropSize = await diamondHelper.getAirDropSize(accountSize, status);
        expect(airdropSize).to.equal(ethers.parseEther("5"));
    });

    it("should return correct airdrop size", async function () {
        const status = { status: 1, price: 123456, drawDown1: 0, drawDown7: 0, drawDown30: 0, timeStamp: 123456 };
        const accountSize = ethers.parseEther("100");
        const airdropSize = await diamondHelper.getAirDropSize(accountSize, status);
        expect(airdropSize).to.equal(ethers.parseEther("15"));
    });
  
    it("should return correct whale handicap", async function () {
        const holderBalance = ethers.parseEther("1");
        const totalSupply = ethers.parseEther("10000");
        const handicap = await diamondHelper.applyWhaleHandicap(holderBalance, totalSupply);
        expect(handicap).to.equal(1);
    });

    it("should return correct whale handicap", async function () {
        const holderBalance = ethers.parseEther("50");
        const totalSupply = ethers.parseEther("10000");
        const handicap = await diamondHelper.applyWhaleHandicap(holderBalance, totalSupply);
        expect(handicap).to.equal(2);
    });

    it("should return correct whale handicap", async function () {
        const holderBalance = ethers.parseEther("100");
        const totalSupply = ethers.parseEther("10000");
        const handicap = await diamondHelper.applyWhaleHandicap(holderBalance, totalSupply);
        expect(handicap).to.equal(4);
    });

    it("should return correct whale handicap", async function () {
        const holderBalance = ethers.parseEther("200");
        const totalSupply = ethers.parseEther("10000");
        const handicap = await diamondHelper.applyWhaleHandicap(holderBalance, totalSupply);
        expect(handicap).to.equal(8);
    });
  
    it("should return correct contract age airdrop divider", async function () {
        const creationTime = (await ethers.provider.getBlock()).timestamp - 91 * 24 * 60 * 60;
        const divider = await diamondHelper.getContractAgeAirdropDivider(creationTime);
        expect(divider).to.equal(1);
    });

    it("should return correct contract age airdrop divider", async function () {
        const creationTime = (await ethers.provider.getBlock()).timestamp - 61 * 24 * 60 * 60;
        const divider = await diamondHelper.getContractAgeAirdropDivider(creationTime);
        expect(divider).to.equal(2);
    });

    it("should return correct contract age airdrop divider", async function () {
        const creationTime = (await ethers.provider.getBlock()).timestamp - 31 * 24 * 60 * 60;
        const divider = await diamondHelper.getContractAgeAirdropDivider(creationTime);
        expect(divider).to.equal(3);
    });

    it("should return correct contract age airdrop divider", async function () {
        const creationTime = (await ethers.provider.getBlock()).timestamp - 10 * 24 * 60 * 60;
        const divider = await diamondHelper.getContractAgeAirdropDivider(creationTime);
        expect(divider).to.equal(4);
    });
  
    it("should return correct buyer fee", async function () {
        const amount = ethers.parseEther("100");
        const status = { status: 1, price: 123456, drawDown1: 0, drawDown7: 0, drawDown30: 0, timeStamp: 123456 };
        const fee = await diamondHelper.getBuyerFee(amount, status);
        expect(fee).to.equal(ethers.parseEther("4"));
    });

    it("should return correct buyer fee", async function () {
        const amount = ethers.parseEther("100");
        const status = { status: 2, price: 123456, drawDown1: 0, drawDown7: 0, drawDown30: 0, timeStamp: 123456 };
        const fee = await diamondHelper.getBuyerFee(amount, status);
        expect(fee).to.equal(ethers.parseEther("1"));
    });

    it("should return correct buyer fee", async function () {
        const amount = ethers.parseEther("1000");
        const status = { status: 3, price: 123456, drawDown1: 0, drawDown7: 0, drawDown30: 0, timeStamp: 123456 };
        const fee = await diamondHelper.getBuyerFee(amount, status);
        expect(fee).to.equal(ethers.parseEther("5"));
    });

    it("should return correct buyer fee", async function () {
        const amount = ethers.parseEther("100");
        const status = { status: 4, price: 123456, drawDown1: 0, drawDown7: 0, drawDown30: 0, timeStamp: 123456 };
        const fee = await diamondHelper.getBuyerFee(amount, status);
        expect(fee).to.equal(0);
    });

    it("should return correct seller fee", async function () {
        const amount = ethers.parseEther("1000");
        const status = { status: 1, price: 123456, drawDown1: 0, drawDown7: 0, drawDown30: 0, timeStamp: 123456 };
        const fee = await diamondHelper.getSellerFee(amount, status);
        expect(fee).to.equal(ethers.parseEther("5"));
    });

    it("should return correct seller fee", async function () {
        const amount = ethers.parseEther("1000");
        const status = { status: 2, price: 123456, drawDown1: 0, drawDown7: 0, drawDown30: 0, timeStamp: 123456 };
        const fee = await diamondHelper.getSellerFee(amount, status);
        expect(fee).to.equal(ethers.parseEther("10"));
    });

    it("should return correct seller fee", async function () {
        const amount = ethers.parseEther("1000");
        const status = { status: 3, price: 123456, drawDown1: 0, drawDown7: 0, drawDown30: 0, timeStamp: 123456 };
        const fee = await diamondHelper.getSellerFee(amount, status);
        expect(fee).to.equal(ethers.parseEther("15"));
    });

    it("should return correct seller fee", async function () {
        const amount = ethers.parseEther("1000");
        const status = { status: 4, price: 123456, drawDown1: 0, drawDown7: 0, drawDown30: 0, timeStamp: 123456 };
        const fee = await diamondHelper.getSellerFee(amount, status);
        expect(fee).to.equal(ethers.parseEther("40"));
    });

    it("should return correct seller fee", async function () {
        const amount = ethers.parseEther("1000");
        const status = { status: 0, price: 123456, drawDown1: 0, drawDown7: 0, drawDown30: 0, timeStamp: 123456 };
        const fee = await diamondHelper.getSellerFee(amount, status);
        expect(fee).to.equal(ethers.parseEther("0"));
    });
  
  
    it("should return correct dip points", async function () {
        const status = { status: 1, price: 123456, drawDown1: 0, drawDown7: 0, drawDown30: 0, timeStamp: 123456 };
        const dipPoints = await diamondHelper.getDipPoints(status);
        expect(dipPoints).to.equal(100);
    });

    it("should return correct dip points", async function () {
        const status = { status: 1, price: 123456, drawDown1: 10, drawDown7: 20, drawDown30: 30, timeStamp: 123456 };
        const dipPoints = await diamondHelper.getDipPoints(status);
        expect(dipPoints).to.equal(650);
    });

    it("should return correct dip points", async function () {
        const status = { status: 1, price: 123456, drawDown1: 60, drawDown7: 80, drawDown30: 99, timeStamp: 123456 };
        const dipPoints = await diamondHelper.getDipPoints(status);
        expect(dipPoints).to.equal(2600);
    });

    it("should return correct dip points", async function () {
        const status = { status: 1, price: 123456, drawDown1: 40, drawDown7: 0, drawDown30: 0, timeStamp: 123456 };
        const dipPoints = await diamondHelper.getDipPoints(status);
        expect(dipPoints).to.equal(500);
    });

    it("should return correct dip points", async function () {
        const status = { status: 1, price: 123456, drawDown1: 0, drawDown7: 40, drawDown30: 0, timeStamp: 123456 };
        const dipPoints = await diamondHelper.getDipPoints(status);
        expect(dipPoints).to.equal(510);
    });

    it("should return correct dip points", async function () {
        const status = { status: 1, price: 123456, drawDown1: 0, drawDown7: 0, drawDown30: 70, timeStamp: 123456 };
        const dipPoints = await diamondHelper.getDipPoints(status);
        expect(dipPoints).to.equal(1000);
    });
  });