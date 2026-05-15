'use client';

import { useState } from 'react';
import { LayoutGrid, List, Inbox } from 'lucide-react';
import { ethers, BrowserProvider } from 'ethers';
import vaultManagerABI from '@/lib/vaulltManager';
import { toast } from 'sonner';
import InvoiceNFTCard from './InvoiceNFTCard';

const explorer = 'https://sepolia.etherscan.io/tx';
const VAULT_MANAGER_ADDRESS = '0x35e59EEA201d2c6290Fe3cf3ED41b20e4F3E2F09'; // <- replace with actual contract address
const USDC_CONTRACT_ADDRESS = '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238';
const ERC20_ABI = [
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function allowance(address owner, address spender) external view returns (uint256)',
];

type Invoice = {
  id: string;
  nft_id: number;
  customerName: string;
  invoiceAmount: number;
  preferredTokenSymbol: string;
  status: 'Pending Funding' | 'Funded' | 'Repaid';
  txHash: string;
  txFundedHash?: string;
  txRepaidHash?: string;
  ipfsHash: string;
  createdAt: string;
};

interface Props {
  invoices: Invoice[];
  getStatusBadge: (status: Invoice['status']) => JSX.Element;
}

export default function InvoiceTableCard({ invoices, getStatusBadge }: Props) {
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'gallery'>('gallery');

  async function repayInvoice(tokenId: number, amount: number){
    try {
      if (!window.ethereum) throw new Error('No wallet detected');

      setLoadingId(tokenId.toString());

      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();

      // 1. Check & Approve USDC
      const usdcContract = new ethers.Contract(USDC_CONTRACT_ADDRESS, ERC20_ABI, signer);
      const repaymentAmountRaw = ethers.parseUnits(amount.toString(), 6); // USDC has 6 decimals

      console.log("Checking USDC allowance...");
      const currentAllowance = await usdcContract.allowance(address, VAULT_MANAGER_ADDRESS);

      if (currentAllowance < repaymentAmountRaw) {
        toast.info("Approving USDC spending...");
        const approveTx = await usdcContract.approve(VAULT_MANAGER_ADDRESS, ethers.MaxUint256);
        await approveTx.wait();
        toast.success("USDC approved!");
      }

      // 2. Perform Repayment
      const contract = new ethers.Contract(
        VAULT_MANAGER_ADDRESS,
        vaultManagerABI,
        signer
      );

      toast.info("Processing repayment...");
      const tx = await contract.repayInvoice(BigInt(tokenId));
      await tx.wait();

      // ✅ Update DB after success
      await fetch('http://localhost:5050/api/v1/invoices/mark-repaid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nftId: tokenId, txHash: tx.hash }),
      });

      toast.success('Repayment successful!');
      window.location.reload();

    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Repayment failed.');
    } finally {
      setLoadingId(null);
    }
  }

  if (!invoices?.length) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-white/5 border border-white/10 rounded-3xl text-slate-500">
        <Inbox className="h-16 w-16 mb-4 opacity-20" />
        <p className="text-lg font-medium">No active invoices found.</p>
        <p className="text-sm opacity-60 mt-1">Upload your first invoice to begin tokenization.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* View Toggle Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 px-1 py-1 bg-white/5 border border-white/10 rounded-xl transition-all duration-300">
          <button
            onClick={() => setViewMode('gallery')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-300 ${
              viewMode === 'gallery' ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/20' : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            NFT GALLERY
          </button>
          <button
            onClick={() => setViewMode('table')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-300 ${
              viewMode === 'table' ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/20' : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <List className="h-3.5 w-3.5" />
            DATA TABLE
          </button>
        </div>
        <p className="text-xs font-bold text-slate-500 tracking-widest uppercase">
            Total Assets: {invoices.length}
        </p>
      </div>

      {viewMode === 'gallery' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {invoices.map((inv) => (
            <div key={inv.id} className="relative group">
                <InvoiceNFTCard invoice={inv} />
                
                {/* Repay Overlay for Gallery View */}
                {inv.status === 'Funded' && (
                  <div className="absolute top-4 right-4 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => repayInvoice(Number(inv.nft_id), inv.invoiceAmount)}
                      disabled={loadingId === inv.nft_id?.toString()}
                      className="bg-green-600 hover:bg-green-500 text-white text-[10px] font-bold px-3 py-1.5 rounded-full shadow-xl transition-all disabled:opacity-50"
                    >
                      {loadingId === inv.nft_id?.toString() ? '...' : 'REPAY'}
                    </button>
                  </div>
                )}
            </div>
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto bg-white/5 p-4 rounded-3xl border border-white/10 backdrop-blur-md">
          <table className="min-w-full text-sm text-white">
            <thead>
              <tr className="text-slate-500 text-[10px] uppercase tracking-widest border-b border-white/5">
                <th className="p-4 text-left font-black">Invoice ID</th>
                <th className="p-4 text-left font-black">Customer</th>
                <th className="p-4 text-left font-black">Value</th>
                <th className="p-4 text-left font-black">Asset</th>
                <th className="p-4 text-left font-black">History</th>
                <th className="p-4 text-left font-black">Status</th>
                <th className="p-4 text-left font-black">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {invoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="p-4 font-mono text-xs">{inv.id}</td>
                  <td className="p-4 font-bold">{inv.customerName}</td>
                  <td className="p-4">
                    {Number(inv.invoiceAmount).toLocaleString()} {inv.preferredTokenSymbol}
                  </td>
                  <td className="p-4">
                    <a
                      href={`https://ipfs.io/ipfs/${inv.ipfsHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-purple-400 hover:text-purple-300 font-bold flex items-center gap-1"
                    >
                      IPFS
                    </a>
                  </td>
                  <td className="p-4">
                    <a
                      href={`${explorer}/${inv.txRepaidHash || inv.txFundedHash || inv.txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:text-blue-300 truncate max-w-[80px] block"
                    >
                      {inv.txRepaidHash ? 'Repaid' : inv.txFundedHash ? 'Funded' : 'Minted'}
                    </a>
                  </td>
                  <td className="p-4">{getStatusBadge(inv.status)}</td>
                  <td className="p-4 text-right">
                    {inv.status === 'Funded' ? (
                      <button
                        className="bg-green-600 hover:bg-green-700 text-white text-[10px] font-black px-4 py-1.5 rounded-xl transition-all"
                        disabled={loadingId === inv.nft_id?.toString()}
                        onClick={() => repayInvoice(Number(inv.nft_id), inv.invoiceAmount)}
                      >
                        {loadingId === inv.nft_id?.toString() ? 'REPAYING...' : 'REPAY NOW'}
                      </button>
                    ) : inv.status === 'Repaid' ? (
                      <span className="text-emerald-400 text-[10px] font-black uppercase tracking-widest">Completed</span>
                    ) : (
                      <span className="text-slate-600 text-[10px] font-black uppercase tracking-widest">Active</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
