const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("DiamondLiquidityProvider", function () {
  let DiamondLiquidityProvider, diamondLiquidityProvider, liquidProviderAdd;
  let owner, addr1;
  let baseToken, quoteToken;
  let baseAddress, quoteAddress;
  let whale;
  const swapRouterAddressStr =  "0x94cC0AaC535CCDB3C01d6787D6413C739ae12bc4"; // Uniswap V3 SwapRouter
  const positionManagerAddressStr =  "0x27F971cb582BF9E50F397e4d29a5C7A34f11faA2"; // Uniswap V3 NonfungiblePositionManager
  const whaleStr = "0x6EbB1DA02aD4423579469b91e68f767D07542c64";


  before(async function () {
    [owner, addr1] = await ethers.getSigners();

    await hre.network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [whaleStr],
    });

    const swapRouterAddress =  await ethers.getAddress(swapRouterAddressStr); // Uniswap V3 SwapRouter
    const positionManagerAddress =  await ethers.getAddress(positionManagerAddressStr); // Uniswap V3 NonfungiblePositionManager
    whale = await ethers.getAddress(whaleStr); 
    console.log("swapRouterAddress", swapRouterAddress);
    console.log("positionManagerAddress", positionManagerAddress);
    console.log("whale", whale);

    // Fund the whale account with ETH for gas fees
    await owner.sendTransaction({
      to: whaleStr,
      value: ethers.parseEther("1.0"), // 1 ETH
    });

    console.log("Deploying contracts with the account:", owner.address);
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    baseToken = await MockERC20.deploy("Base Token", "BASE", ethers.parseEther("1000000"), whale);
    await baseToken.deploymentTransaction().wait();
    baseAddress = await baseToken.getAddress();
    console.log("Base Token deployed to:", baseAddress);
    quoteToken = await MockERC20.deploy("Quote Token", "QUOTE", ethers.parseEther("1000000"), whale);
    await quoteToken.deploymentTransaction().wait();
    quoteAddress =  await quoteToken.getAddress();
    console.log("Quote Token deployed to:", quoteAddress);

    // Use common tokens
    //baseToken = await ethers.getContractAt("IERC20", "0x940181a94a35a4569e4529a3cdfb74e38fd98631"); // AERO
    //quoteToken = await ethers.getContractAt("IERC20", "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913"); // USDC

    DiamondLiquidityProvider = await ethers.getContractFactory("DiamondLiquidityProvider");
    diamondLiquidityProvider = await DiamondLiquidityProvider.deploy(baseAddress, swapRouterAddress, positionManagerAddress);
    await diamondLiquidityProvider.deploymentTransaction().wait();
    liquidProviderAdd = await diamondLiquidityProvider.getAddress();
    console.log("DiamondLiquidityProvider deployed to:", liquidProviderAdd);
  });

  it("should add liquidity correctly", async function () {
    const amountBase = ethers.parseUnits("1", 18); // 10 token0
    const amountQuote = ethers.parseUnits("1", 18); // 10 token1

    const whaleSigner = await ethers.getSigner(whaleStr);

     // Verify whale balance
     const whaleBaseBalance = await baseToken.balanceOf(whaleStr);
     const whaleQuoteBalance = await quoteToken.balanceOf(whaleStr);
 
     console.log("Whale Base Token Balance:", whaleBaseBalance.toString());
     console.log("Whale Quote Token Balance:", whaleQuoteBalance.toString());
 
     expect(whaleBaseBalance).to.be.gte(amountBase);
     expect(whaleQuoteBalance).to.be.gte(amountQuote);

    console.log("1", whaleStr);
    console.log("2", await baseToken.getAddress());
    console.log("3", await diamondLiquidityProvider.getAddress());
    console.log("4", amountBase);
    await baseToken.connect(whaleSigner).approve(liquidProviderAdd, amountBase);
    await quoteToken.connect(whaleSigner).approve(liquidProviderAdd, amountQuote);
    console.log("5");

    //await baseToken.connect(whaleSigner).transfer(liquidProviderAdd, amountBase);
    //await quoteToken.connect(whaleSigner).transfer(liquidProviderAdd, amountQuote);
    console.log("6");
    console.log("7", 79228162514264337593543950336n);
    // Use 2^96 for sqrtPriceX96 which represents a 1:1 price ratio
    const sqrtPriceX96 =  79228162514264337593543950336n; // 2^96

    // Ensure all addresses are valid contract addresses
    const baseTokenCode = await ethers.provider.getCode(await baseToken.getAddress());
    const quoteTokenCode = await ethers.provider.getCode(await quoteToken.getAddress());
    const positionManagerCode = await ethers.provider.getCode(positionManagerAddressStr);

    console.log("Base Token Code:", baseTokenCode);
    console.log("Quote Token Code:", quoteTokenCode);
    console.log("Position Manager Code:", positionManagerCode);

    expect(baseTokenCode).to.not.equal("0x");
    expect(quoteTokenCode).to.not.equal("0x");
    expect(positionManagerCode).to.not.equal("0x");

    // await expect(diamondLiquidityProvider.addLiquidity(
    //   quoteAddress,
    //   3000, // fee tier
    //   amountBase,
    //   amountQuote
    // )).to.emit(diamondLiquidityProvider, "LiquidityAdded");
    // Adding liquidity by calling the function from whaleSigner
    const addLiquidityTx = await diamondLiquidityProvider.connect(whaleSigner).addLiquidity(
      quoteAddress,
      3000, // fee tier
      amountBase,
      amountQuote
    );

    const receipt = await addLiquidityTx.wait();
    const liquidityAddedEvent = receipt.events.find(event => event.event === 'LiquidityAdded');
    const tokenId = liquidityAddedEvent.args.tokenId;

    expect(tokenId).to.be.a('number');
  });

  it("should remove liquidity correctly", async function () {
    const tokenId = 1;
    const liquidity = 1000;
    const amount0Min = ethers.parseUnits("1", 18); // 1 token0
    const amount1Min = ethers.parseUnits("1", 18); // 1 token1

    await expect(diamondLiquidityProvider.removeLiquidity(
      tokenId,
      liquidity,
      amount0Min,
      amount1Min
    )).to.emit(diamondLiquidityProvider, "LiquidityRemoved");
  });
});