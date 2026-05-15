'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { ethers, BrowserProvider } from 'ethers';
import { useAccount, useWalletClient, useBalance } from 'wagmi';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { supportedTokens } from '@/config/supportedTokens';
import { ArrowLeft, AlertCircle, Inbox, Loader2, LayoutGrid } from 'lucide-react';
import vaultManagerABI from '@/lib/vaulltManager';
import InvoiceNFTCard from '@/app/enterprise/components/InvoiceNFTCard';

// Sepolia USDC contract address
const USDC_CONTRACT_ADDRESS = '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238';
const ERC20_ABI = [
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function allowance(address owner, address spender) external view returns (uint256)',
  'function decimals() view returns (uint8)',
];

type Invoice = {
  id: string;
  nft_id: number; 
  customerName: string;
  invoiceAmount: number;
  fundingAmount: number;
  repaymentAmount: number;
  preferredTokenSymbol: string;
  status: 'Pending Funding' | 'Funded' | 'Repaid';
  dueDate: string;
  yieldPercent: string;
  txHash: string;
  txFundedHash?: string;
  txRepaidHash?: string;
  createdAt: string;
};

type Balances = Record<string, string>;


export default function InvestorDashboard() {
  const { address, isConnected, status, isReconnecting, isConnecting } = useAccount();
  const { data: ethBalance } = useBalance({ address });
  const [isMounted, setIsMounted] = useState(false);
  const { data: walletClient } = useWalletClient();

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoadingInvoices, setIsLoadingInvoices] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const [isApproving, setIsApproving] = useState(false);
  const [approvalDone, setApprovalDone] = useState(false);

  const [balances, setBalances] = useState<Balances | null>(null);
  const [isLoadingBalances, setIsLoadingBalances] = useState(false);
  const [balanceError, setBalanceError] = useState<string | null>(null);

  const API_BASE = process.env.NEXT_PUBLIC_API_URL;
  const VAULT_MANAGER_ADDRESS = process.env.NEXT_PUBLIC_VAULT_MANAGER_ADDRESS || '';


  // Create ethers provider/signer from wagmi walletClient
  const provider = walletClient ? new BrowserProvider(walletClient) : undefined;

  const getSigner = async () => {
    if (!provider) return undefined;
    return provider.getSigner();
  };

  // Load invoices from backend filtered by USDC token
  const fetchInvoices = async () => {
    if (!address || !API_BASE) {
      setIsLoadingInvoices(false);
      setInvoices([]);
      return;
    }
    setIsLoadingInvoices(true);
    try {
      const res = await axios.get(`${API_BASE}/api/v1/investor/available`);

      const filteredInvoices = res.data.invoices
        .filter((inv: any) => inv.preferred_token_symbol === 'USDC')
        .map((inv: any) => {
          const fundingAmount = Number(inv.funded_amount);
          const repaymentAmount = Number(inv.invoice_amount);
          const invoiceAmount = Number(inv.invoice_amount);
          let yieldPercent = '0%';
          if (!isNaN(fundingAmount) && !isNaN(repaymentAmount) && fundingAmount > 0) {
            const yieldRatio = ((repaymentAmount - fundingAmount) / fundingAmount) * 100;
            yieldPercent = yieldRatio.toFixed(2) + '%';
          }
          return {
            id: String(inv.id),
            nft_id: Number(inv.nft_id), // 🔥 FORCE FIX
            customerName: inv.customer_name,
            invoiceAmount,
            fundingAmount,
            repaymentAmount,
            preferredTokenSymbol: inv.preferred_token_symbol,
            status:
              inv.status?.toLowerCase() === 'repaid'
              ? 'Repaid'
              : inv.status?.toLowerCase() === 'funded'
              ? 'Funded'
              : 'Pending Funding',
            dueDate: new Date(inv.due_date).toLocaleDateString(),
            yieldPercent,
            txHash: inv.tx_hash,
            txFundedHash: inv.tx_funded_hash,
            txRepaidHash: inv.tx_repaid_hash,
            createdAt: inv.created_at || new Date().toISOString(),
          } as Invoice;
        });

      setInvoices(filteredInvoices);
      if (!selectedInvoiceId) {
        const firstPending = filteredInvoices.find((inv: Invoice) => inv.status === 'Pending Funding');
        if (firstPending) setSelectedInvoiceId(firstPending.id);
      }
      setError(null);
    } catch (err: any) {
      console.error('Failed to fetch invoices:', err?.response?.data || err?.message || err);
      setError('Failed to load invoices.');
      setInvoices([]);
      setSelectedInvoiceId(null);
    } finally {
      setIsLoadingInvoices(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, [address, API_BASE]);

  const selectedInvoice = invoices.find((inv) => inv.id === selectedInvoiceId);

  // FAKE depositAmount hardcoded to match exact amount contract expects, for test
  const depositAmount = selectedInvoice?.fundingAmount?.toString() || "0";

  // Check USDC allowance - returns a boolean
  const checkAllowance = async (signer: ethers.Signer): Promise<boolean> => {
    if (!address || !selectedInvoice) return false;
    try {
      const usdcContract = new ethers.Contract(USDC_CONTRACT_ADDRESS, ERC20_ABI, signer);
      const allowance: bigint = await usdcContract.allowance(address, VAULT_MANAGER_ADDRESS);
      const requiredAllowance = ethers.parseUnits(
  (Number(depositAmount)).toString(),
  6
);
      return allowance >= requiredAllowance;
    } catch (err) {
      console.error('Error checking allowance:', err);
      return false;
    }
  };

  // Approve VaultManager contract to spend USDC tokens
  const approveUSDC = async () => {
    if (!address || !selectedInvoice) {
      alert('Connect wallet and select an invoice first.');
      return;
    }
    setIsApproving(true);
    try {
      const signer = await getSigner();
      if (!signer) {
        alert('Cannot get signer. Please reconnect wallet.');
        setIsApproving(false);
        return;
      }

      const usdcContract = new ethers.Contract(USDC_CONTRACT_ADDRESS, ERC20_ABI, signer);
        const amountToApprove = ethers.parseUnits(
        Number(depositAmount).toString(),
        6
      );

      const tx = await usdcContract.approve(VAULT_MANAGER_ADDRESS, amountToApprove);
      await tx.wait();

      setApprovalDone(true);
      alert('✅ USDC approved successfully!');
    } catch (err: any) {
      console.error('Approval failed:', err);
      alert('❌ Approval failed: ' + (err.message || err));
    } finally {
      setIsApproving(false);
    }
  };

  const handleDeposit = async () => {
  if (!depositAmount || !address || !API_BASE || !selectedInvoice) {
    alert('Please connect wallet and select an invoice.');
    return;
  }

  if (!approvalDone) {
    alert('Please approve USDC spending before funding.');
    return;
  }


  try {
    // 🔥 STEP 1: Trigger blockchain transaction from frontend
    const signer = await getSigner();
    if (!signer) {
      alert('Cannot get signer. Please reconnect wallet.');
      return;
    }

    const vaultContract = new ethers.Contract(
      VAULT_MANAGER_ADDRESS,
      vaultManagerABI,
      signer
    );

    console.log("Funding invoice on-chain... NFT ID:", selectedInvoice.nft_id);
    const tx = await vaultContract.fundInvoice(BigInt(selectedInvoice.nft_id));
    await tx.wait();
    console.log("✅ On-chain funding successful. Tx:", tx.hash);

    // 🔥 STEP 2: Notify backend to update database
    await axios.post(
      `${API_BASE}/api/v1/investor/fund/${selectedInvoice.id}`,
      {
        investorAddress: address,
        amount: (Number(depositAmount)).toString(),
        txHash: tx.hash
      }
    );

    alert('✅ Successfully funded invoice.');

    setApprovalDone(false);

    // 🔥 refresh real data from backend
    fetchInvoices();

  } catch (err: any) {
    console.error('Funding error:', err);
    alert('❌ Failed to fund: ' + (err?.response?.data?.message || err.message));
  }
};
  


  const getStatusBadge = (status: Invoice['status']) => {
    switch (status) {
      case 'Funded':
        return (
          <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">Funded</Badge>
        );
      case 'Pending Funding':
        return (
          <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Pending</Badge>
        );
      case 'Repaid':
        return (
          <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Repaid</Badge>
        );
      default:
        return (
          <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30">Unknown</Badge>
        );
    }
  };

  useEffect(() => {
      if (!address || !isConnected) {
        setBalances(null);
        setBalanceError(null);
        setIsLoadingBalances(false);
        return;
      }
      const fetchBalances = async () => {
        setIsLoadingBalances(true);
        setBalanceError(null);
        try {
          const res = await axios.get<Balances>(
  `http://localhost:5050/api/balances/balance?chainId=11155111&walletAddress=${address}`
);
          setBalances(res.data);
        } catch (err) {
          console.error('Failed to fetch balances:', err);
          setBalanceError('Failed to load balances.');
          setBalances(null);
        } finally {
          setIsLoadingBalances(false);
        }
      };
      fetchBalances();
    }, [address, isConnected]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    // Only redirect if we are definitively disconnected AND the component is fully mounted 
    // AND the wallet is NOT currently attempting to connect or reconnect.
    if (isMounted && !isReconnecting && !isConnecting && status === 'disconnected') {
      window.location.href = '/';
    }
  }, [isMounted, status, isReconnecting, isConnecting]);

  return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <nav className="flex items-center justify-between p-6 backdrop-blur-sm border-b border-white/10">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="sm" className="text-slate-300 hover:text-white">
                <ArrowLeft className="h-4 w-4 mr-2" /> Back to Home
              </Button>
            </Link>
            <div className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              Investor Dashboard (USDC Only)
            </div>
          </div>
          <div className="flex items-center gap-4">
            <ConnectButton />
          </div>
        </nav>

        {isConnected && (
          <div className="p-4 md:p-6 max-w-7xl mx-auto">
            <Card className="bg-white/5 backdrop-blur-sm border-white/10">
              <CardHeader>
                <CardTitle>Your Token Balances</CardTitle>
                <CardDescription className="text-slate-400 break-words">
                  Balances for wallet: {address}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingBalances ? (
                  <div className="flex items-center gap-2 text-slate-400">
                    <Loader2 className="animate-spin h-4 w-4" />
                    Loading balances...
                  </div>
                ) : balanceError ? (
                  <div className="flex items-center gap-2 text-red-400">
                    <AlertCircle className="h-4 w-4" />
                    {balanceError}
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {/* 1. Always show native Sepolia ETH */}
                    <Badge
                      variant="outline"
                      className="bg-purple-600/10 text-purple-300 border-purple-600/30 px-3 py-1 text-sm"
                    >
                      {ethBalance ? Number(ethBalance.formatted).toFixed(4) : "0.0000"} ETH
                    </Badge>

                    {/* 2. Show all other tokens, filtered by supportedTokens */}
                    {supportedTokens
                      .filter(t => t.symbol !== 'ETH') // already handled above
                      .map((token) => {
                        const tokenAddress = token.address.toLowerCase();
                        const rawBal = balances?.[tokenAddress] || '0';
                        const formattedBal = ethers.formatUnits(rawBal, token.decimals);
                        
                        const displayBal = parseFloat(formattedBal).toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 6,
                        });

                        return (
                          <Badge
                            key={tokenAddress}
                            variant="outline"
                            className="bg-purple-600/10 text-purple-300 border-purple-600/30 px-3 py-1 text-sm"
                          >
                            {displayBal} {token.symbol}
                          </Badge>
                        );
                      })}

                    {/* 3. Show any extra tokens from the API that AREN'T in our supportedTokens list but have balance */}
                    {balances && Object.entries(balances)
                      .filter(([tokenAddress]) => 
                        !supportedTokens.some(t => t.address.toLowerCase() === tokenAddress.toLowerCase())
                      )
                      .filter(([, bal]) => bal !== '0')
                      .map(([tokenAddress, bal]) => {
                        const formattedBal = ethers.formatUnits(bal, 18);
                        return (
                          <Badge
                            key={tokenAddress}
                            variant="outline"
                            className="bg-slate-800 text-slate-400 border-white/10 px-3 py-1 text-sm"
                          >
                            {parseFloat(formattedBal).toFixed(2)} Token ({tokenAddress.slice(0, 6)}...)
                          </Badge>
                        );
                      })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        <div className="max-w-7xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-2 gap-8">

          {/* Invoice Select */}
          <Card className="bg-white/5 backdrop-blur-sm border-white/10">
            <CardHeader>
              <CardTitle className="text-white">Select Invoice to Fund (USDC)</CardTitle>
              <CardDescription className="text-slate-300">
                Choose an invoice to fund with USDC
              </CardDescription>
            </CardHeader>
            <CardContent>
              <select
                className="w-full bg-white/5 border-white/10 text-white p-2 rounded"
                value={selectedInvoiceId || ''}
                onChange={(e) => {
                  setSelectedInvoiceId(e.target.value || null);
                  setApprovalDone(false); // reset approval on invoice change
                }}
              >
                {invoices.filter(inv => inv.status === 'Pending Funding').length > 0 ? (
                  invoices
                    .filter(inv => inv.status === 'Pending Funding')
                    .map((inv) => (
                      <option key={inv.id} value={inv.id}>
                        {inv.id} - {inv.customerName} - ${inv.invoiceAmount.toLocaleString()}
                      </option>
                    ))
                ) : (
                  <option disabled value="">
                    No pending USDC invoices available
                  </option>
                )}
              </select>
            </CardContent>
          </Card>

          {/* Deposit Form */}
          <Card className="bg-white/5 backdrop-blur-sm border-white/10">
            <CardHeader>
              <CardTitle className="text-white">Deposit to Fund Invoice</CardTitle>
              <CardDescription className="text-slate-300">
                Provide the required liquidity to fund this enterprise invoice.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="amount" className="text-slate-300">
                  Required Deposit ({selectedInvoice?.preferredTokenSymbol || 'USDC'})
                </Label>
                <Input
                  id="amount"
                  type="text"
                  value={selectedInvoice ? `${selectedInvoice.fundingAmount.toLocaleString()} ${selectedInvoice.preferredTokenSymbol}` : 'Select an invoice'}
                  readOnly
                  className="bg-white/5 border-white/10 text-white font-mono placeholder:text-slate-400"
                />
              </div>
              {selectedInvoice && (
                <div className="text-slate-300 text-sm">
                  Estimated Yield: <strong>{selectedInvoice.yieldPercent}</strong>
                  <br />
                  Repayment Amount after Due Date: $
                  {selectedInvoice.repaymentAmount.toLocaleString()}
                </div>
              )}
              {!approvalDone && (
                <Button
                  onClick={approveUSDC}
                  className="w-full mb-3 bg-yellow-600 hover:bg-yellow-700 text-white"
                  disabled={isApproving || !isConnected || !provider || !selectedInvoice}
                >
                  {isApproving ? 'Approving...' : 'Approve USDC Spending'}
                </Button>
              )}
              <Button
                onClick={handleDeposit}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                disabled={!depositAmount || !isConnected || !selectedInvoice || !approvalDone}
              >
                Fund Invoice
              </Button>
            </CardContent>
          </Card>

          {/* Total Assets Header */}
          <div className="col-span-1 lg:col-span-2 flex items-center justify-between mb-2">
            <h2 className="text-xl font-bold text-white tracking-tight uppercase">
                Active Invoices <span className="text-slate-500 text-sm ml-2">({invoices.length})</span>
            </h2>
          </div>

          <div className="col-span-1 lg:col-span-2 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {invoices.length > 0 ? (
                invoices.map((inv) => (
                    <div key={inv.id} className="relative group cursor-pointer" onClick={() => setSelectedInvoiceId(inv.id)}>
                        <InvoiceNFTCard invoice={inv} />
                        {selectedInvoiceId === inv.id && (
                            <div className="absolute -inset-2 border-2 border-blue-500 rounded-[32px] pointer-events-none animate-pulse"></div>
                        )}
                    </div>
                ))
            ) : (
                <div className="col-span-1 lg:col-span-3 flex flex-col items-center justify-center p-12 bg-white/5 border border-white/10 rounded-3xl text-slate-500">
                    <Inbox className="h-16 w-16 mb-4 opacity-20" />
                    <p className="text-lg font-medium">No USDC invoices available for funding.</p>
                </div>
            )}
          </div>
        </div>
      </div>
  );
}
