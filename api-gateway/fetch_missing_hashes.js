import { ethers } from 'ethers';
import 'dotenv/config';

const RPC_URL = process.env.RPC_URL;
const VAULT_ADDRESS = process.env.VAULT_MANAGER_ADDRESS;

const ABI = [
    "event InvoiceFunded(uint256 indexed nftId, address indexed investor, uint256 amount)",
    "event InvoiceRepaid(uint256 indexed nftId, address indexed sme, address indexed investor, uint256 amount)"
];

async function main() {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const contract = new ethers.Contract(VAULT_ADDRESS, ABI, provider);

    console.log("Searching for events on contract:", VAULT_ADDRESS);

    const fundingEvents = await contract.queryFilter("InvoiceFunded", 0); // Search from beginning
    const repaymentEvents = await contract.queryFilter("InvoiceRepaid", 0);

    const results = {};

    fundingEvents.forEach(event => {
        const tokenId = event.args.nftId.toString();
        results[tokenId] = results[tokenId] || {};
        results[tokenId].fundedHash = event.transactionHash;
    });

    repaymentEvents.forEach(event => {
        const tokenId = event.args.nftId.toString();
        results[tokenId] = results[tokenId] || {};
        results[tokenId].repaidHash = event.transactionHash;
    });

    console.log(JSON.stringify(results, null, 2));
}

main().catch(console.error);
