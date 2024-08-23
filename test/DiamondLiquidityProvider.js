const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("DiamondLiquidityProvider", function () {
  let DiamondLiquidityProvider, diamondLiquidityProvider, liquidProviderAdd;
  //let factory, factoryAdd;
  let owner, addr1;
  let baseToken, quoteToken;
  let baseAddress, quoteAddress, poolAddress;
  let whale, whaleSigner;
  let tokenId, liquidity, amount0, amount1;
  const uniswapV3FactoryAddress = "0x4752ba5DBc23f44D87826276BF6Fd6b1C372aD24";
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

    DiamondLiquidityProvider = await ethers.getContractFactory("DiamondLiquidityProvider");
    diamondLiquidityProvider = await DiamondLiquidityProvider.deploy(baseAddress, uniswapV3FactoryAddress, positionManagerAddress);
    await diamondLiquidityProvider.deploymentTransaction().wait();
    liquidProviderAdd = await diamondLiquidityProvider.getAddress();
    console.log("DiamondLiquidityProvider deployed to:", liquidProviderAdd);

    whaleSigner = await ethers.getSigner(whaleStr);
  });

  it('should create pool correctly', async function () {
    const sqrt1 = BigInt(Math.sqrt(1));
    const twoPow96 = BigInt(2) ** BigInt(96);
    const sqrtPriceX96 = twoPow96 / sqrt1;
    console.log("sqrtPriceX96:", sqrtPriceX96.toString());

    const txCreatePool = await diamondLiquidityProvider.connect(whaleSigner).createPool(
      quoteAddress,
      3000,
      sqrtPriceX96
    );
    const receipt = await txCreatePool.wait();

    // Find the PoolCreated event in the logs
    const poolCreatedEvent = receipt.logs.find(log => log.topics[0] === ethers.id("PoolCreated(address,address,uint24,address)"));
    if (poolCreatedEvent) {
      const iface = new ethers.Interface(["event PoolCreated(address tokenA, address tokenB, uint24 fee, address pool)"]);
      const decodedEvent = iface.decodeEventLog("PoolCreated", poolCreatedEvent.data, poolCreatedEvent.topics);
      poolAddress = decodedEvent.pool;
      console.log("Pool Address:", poolAddress);
    } else {
      console.log("PoolCreated event not found");
    }

    // You can also add assertions to verify the pool address
    expect(poolAddress).to.be.properAddress;
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

    await baseToken.connect(whaleSigner).approve(liquidProviderAdd, amountBase);
    await quoteToken.connect(whaleSigner).approve(liquidProviderAdd, amountQuote);

    //await baseToken.connect(whaleSigner).transfer(liquidProviderAdd, amountBase);
    //await quoteToken.connect(whaleSigner).transfer(liquidProviderAdd, amountQuote);

    // Ensure all addresses are valid contract addresses
    const baseTokenCode = await ethers.provider.getCode(await baseToken.getAddress());
    const quoteTokenCode = await ethers.provider.getCode(await quoteToken.getAddress());
    const positionManagerCode = await ethers.provider.getCode(positionManagerAddressStr);

    //console.log("Base Token Code:", baseTokenCode);
    //console.log("Quote Token Code:", quoteTokenCode);
    //console.log("Position Manager Code:", positionManagerCode);

    expect(baseTokenCode).to.not.equal("0x");
    expect(quoteTokenCode).to.not.equal("0x");
    expect(positionManagerCode).to.not.equal("0x");

    // Adding liquidity by calling the function from whaleSigner
    const addLiquidityTx = await diamondLiquidityProvider.connect(whaleSigner).addLiquidity(
      quoteAddress,
      3000, // fee tier
      amountBase,
      amountQuote//,
      //{ gasLimit: 5000000 } // Set a higher gas limit
    );

    const receipt = await addLiquidityTx.wait();
    //console.log("receipt.logs", receipt.logs);

    // Find the LiquidityAdded event in the logs
    const liquidityAddedEvent = receipt.logs.find(log => log.topics[0] === ethers.id("LiquidityAdded(uint256,uint128,uint256,uint256)"));
    if (liquidityAddedEvent) {
        const iface = new ethers.Interface(["event LiquidityAdded(uint256 tokenId, uint128 liquidity, uint256 amount0, uint256 amount1)"]);
        const decodedEvent = iface.decodeEventLog("LiquidityAdded", liquidityAddedEvent.data, liquidityAddedEvent.topics);
        tokenId = decodedEvent.tokenId;
        liquidity = decodedEvent.liquidity;
        amount0 = decodedEvent.amount0;
        amount1 = decodedEvent.amount1;

        console.log(`LiquidityAdded event:
            tokenId: ${tokenId}
            liquidity: ${liquidity}
            amount0: ${amount0}
            amount1: ${amount1}`);
    } else {
        console.log("LiquidityAdded event not found");
    }

    expect(tokenId).to.be.a('BigInt');
    expect(liquidity).to.be.a('BigInt');
    expect(amount0).to.equal(ethers.parseUnits("1", 18));
    expect(amount1).to.equal(ethers.parseUnits("1", 18));
  });

  // it("should remove liquidity correctly", async function () {
  //   const amount0Min = ethers.parseUnits("1", 18); // 1 token0
  //   const amount1Min = ethers.parseUnits("1", 18); // 1 token1

  //   await expect(diamondLiquidityProvider.removeLiquidity(
  //     tokenId,
  //     liquidity,
  //     amount0Min,
  //     amount1Min
  //   )).to.emit(diamondLiquidityProvider, "LiquidityRemoved");
  // });
});