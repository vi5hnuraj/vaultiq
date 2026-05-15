import express from "express";
import { ethers } from "ethers";
import dotenv from "dotenv";

dotenv.config();

const router = express.Router();

const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)"
];

const USDC_ADDRESS = "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238";

router.get("/balance", async (req, res) => {
  try {
    const { walletAddress } = req.query;

    if (!walletAddress) {
      return res.status(400).json({ error: "Wallet address required" });
    }

    // Connect to blockchain
    const provider = new ethers.JsonRpcProvider(process.env.RPC_URL || "https://rpc.ankr.com/eth_sepolia");
    
    // Fetch USDC balance
    const usdcContract = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, provider);
    const balance = await usdcContract.balanceOf(walletAddress);

    // Return the balance in the mapped format
    // Keys are lowercase to match frontend expectations
    return res.json({
      [USDC_ADDRESS.toLowerCase()]: balance.toString(),
    });

  } catch (error) {
    console.error("Balance fetch error:", error);
    res.status(500).json({ error: "Blockchain query failed" });
  }
});

export default router;