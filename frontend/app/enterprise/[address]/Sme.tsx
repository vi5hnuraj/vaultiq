'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useChainId, useBalance } from 'wagmi';
import { ArrowLeft, AlertCircle, Inbox, Loader2 } from 'lucide-react';
import Link from 'next/link';
import axios from 'axios';
import ExtractedMetadata from '../components/ExtractedMetadata';
import InvoiceTableCard from '../components/InvoiceTableCard';
import { ethers } from 'ethers';
import { supportedTokens } from '@/config/supportedTokens';

// Types
type Invoice = {
  id: string;
  nft_id: number;
  customerName: string;
  invoiceAmount: number;
  preferredTokenSymbol: string;
  status: 'Pending Funding' | 'Funded' | 'Repaid';
  txHash: string;
  ipfsHash: string;
  createdAt: string;
};

// Define the structure of the balances object received from the API
type Balances = Record<string, string>;

export default function SMEDashboard() {
  const { address, isConnected, status, isReconnecting, isConnecting } = useAccount();
  const { data: ethBalance } = useBalance({ address }); // 🔥 Fetch native ETH balance
  const [isMounted, setIsMounted] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [extractedMetadata, setExtractedMetadata] = useState<any>(null);
  const [preferredToken, setPreferredToken] = useState(supportedTokens[0]);
  const [isMinting, setIsMinting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoadingInvoices, setIsLoadingInvoices] = useState(true);
  const [convertedAmount, setConvertedAmount] = useState<string | null>(null);

  // State for token balances
  const [balances, setBalances] = useState<Balances | null>(null);
  const [isLoadingBalances, setIsLoadingBalances] = useState(false);
  const [balanceError, setBalanceError] = useState<string | null>(null);

  const chainId = useChainId();
  const API_BASE = process.env.NEXT_PUBLIC_API_URL;

  // Hydration check
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // useEffect for fetching balances
  useEffect(() => {
    if (!isMounted || !address || !isConnected) {
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


  // Fetch converted amount from /api/quote
  const fetchConvertedAmount = async (
    fromSymbol: string,
    toSymbol: string,
    amount: string
  ) => {
    try {
      const fromToken = supportedTokens.find((t) => t.symbol === fromSymbol);
      const toToken = supportedTokens.find((t) => t.symbol === toSymbol);
      if (!fromToken || !toToken) return;

      const normalized = String(amount || '').replace(/[^0-9.]/g, '');
      if (!normalized || fromSymbol === toSymbol) {
        setConvertedAmount(normalized);
        return;
      }
      const decimals = fromToken.decimals ?? 18;
      const amountInWei = ethers.parseUnits(normalized, decimals);
      const res = await axios.get('/api/quote', {
        params: {
          fromTokenAddress: fromToken.address,
          toTokenAddress: toToken.address,
          amount: amountInWei.toString(),
          chainId: '1',
        },
      });
      const { dstAmount } = res.data;
      if (!dstAmount) {
        setConvertedAmount(null);
        return;
      }
      const toDecimals = toToken.decimals ?? 18;
      const convertedFormatted = ethers.formatUnits(dstAmount, toDecimals);
      setConvertedAmount(convertedFormatted);
      setExtractedMetadata((prev: any) => ({
        ...prev,
        convertedAmount: convertedFormatted,
        preferredToken: toSymbol,
      }));
    } catch (err) {
      console.error('1inch price fetch failed:', err);
      setConvertedAmount(null);
    }
  };

  const isReadyToMint = (() => {
    if (!extractedMetadata || !extractedMetadata.customerName || !extractedMetadata.dueDate || !extractedMetadata.issueDate) return false;

    const amountValid = String(extractedMetadata.amount || '').replace(/[^0-9.]/g, '').length > 0;
    if (!amountValid) return false;

    // 🛡️ DOUBLE-DATE VALIDATION:
    // 1. Issue Date Match
    if (extractedMetadata.invoiceDate && extractedMetadata.invoiceDate !== "Not Found") {
      if (extractedMetadata.issueDate !== extractedMetadata.invoiceDate) return false;
    }
    // 2. Due Date Match
    if (extractedMetadata.scannedDueDate && extractedMetadata.scannedDueDate !== "Not Found") {
      if (extractedMetadata.dueDate !== extractedMetadata.scannedDueDate) return false;
    }

    return true;
  })();

  const fetchInvoices = async () => {
    if (!address || !API_BASE) {
      setIsLoadingInvoices(false);
      setInvoices([]);
      return;
    }
    setIsLoadingInvoices(true);
    try {
      const token = localStorage.getItem('jwt') || '';
      const res = await axios.get(`${API_BASE}/api/v1/invoices/sme/${address}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log("🔥 API DATA 👉", res.data.invoices); // ✅ ADD HERE
      setInvoices(
        res.data.invoices.map((inv: any) => ({
          id: inv.id,
          nft_id: inv.nft_id ? Number(inv.nft_id) : 0,
          customerName: inv.customer_name || "N/A",
          invoiceAmount: Number(inv.invoice_amount) || 0,
          preferredTokenSymbol: inv.preferred_token_symbol || "N/A",
          status:
            inv.status?.toLowerCase() === 'repaid'
              ? 'Repaid'
              : inv.status?.toLowerCase() === 'funded'
                ? 'Funded'
                : 'Pending Funding',
          txHash: inv.tx_hash,
          txFundedHash: inv.tx_funded_hash,
          txRepaidHash: inv.tx_repaid_hash,
          ipfsHash: inv.ipfs_cid,
          createdAt: inv.created_at,
        }))
      );
    } catch (err: any) {
      setError('Failed to load invoices.');
    } finally {
      setIsLoadingInvoices(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, [address, API_BASE]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setError(null);
      const file = e.target.files?.[0] || null;
      setSelectedFile(file);
      setExtractedMetadata(null);

      if (!file) return;

      // ✅ Convert file → base64
      const fileToBase64 = (file: File): Promise<string> =>
        new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
        });

      const base64 = await fileToBase64(file);

      // ✅ Call your OCR FastAPI
      const res = await axios.post("http://localhost:8000/analyze", {
        file_b64: base64,
      });

      // ✅ Map OCR response to your UI
      setExtractedMetadata({
        customerName: res.data?.customer_name || "",
        amount: res.data?.total_amount || "",
        invoiceDate: res.data?.invoice_date || "", // 🔥 Captured from OCR
        dueDate: "",
      });

      if (res.data?.total_amount) {
        fetchConvertedAmount('USDC', preferredToken.symbol, res.data.total_amount);
      }

    } catch (err: any) {
      console.error(err);
      setError('Failed to parse the invoice.');
    }
  };
  const handleMintNFT = async () => {
    if (!selectedFile || !extractedMetadata || !address || !isReadyToMint || !API_BASE) return;
    setIsMinting(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('smeAddress', address);
      //formData.append('chainId', String(chainId));
      formData.append('chainId', "11155111"); // Sepolia FIXED
      const amountToSend = convertedAmount ?? String(extractedMetadata.amount || '').replace(/[^0-9.]/g, '0');
      formData.append('invoiceAmount', amountToSend);
      //formData.append('dueDate', extractedMetadata.dueDate || '');
      const fixedDueDate =
        extractedMetadata.dueDate &&
          extractedMetadata.dueDate.length <= 10
          ? extractedMetadata.dueDate
          : "2026-04-30"; // fallback

      formData.append('dueDate', fixedDueDate);
      const customerName = (extractedMetadata.customerName || '').trim();
      formData.append('customerName', customerName);
      formData.append('preferredTokenSymbol', preferredToken.symbol);
      console.log("FINAL DATA:", {
        smeAddress: address,
        chainId: "11155111",
        invoiceAmount: amountToSend,
        dueDate: fixedDueDate,
        customerName,
        preferredTokenSymbol: preferredToken.symbol
      });
      const token = localStorage.getItem('jwt') || '';
      await axios.post(`${API_BASE}/api/v1/enterprise/mint`, formData, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' },
        maxBodyLength: Infinity,
      });
      await fetchInvoices();
      setSelectedFile(null);
      setExtractedMetadata(null);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Minting failed.');
    } finally {
      setIsMinting(false);
    }
  };

  const getStatusBadge = (status: Invoice['status']) => {
    switch (status) {
      case 'Funded':
        return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">Funded</Badge>;
      case 'Pending Funding':
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Pending</Badge>;
      case 'Repaid':
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Repaid</Badge>;
      default:
        return <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30">Unknown</Badge>;
    }
  };

  const router = useRouter();

  useEffect(() => {
    // Only redirect if we are definitively disconnected AND the component is fully mounted 
    // AND the wallet is NOT currently attempting to connect or reconnect.
    if (isMounted && !isReconnecting && !isConnecting && status === 'disconnected') {
      router.push('/');
    }
  }, [isMounted, status, isReconnecting, isConnecting, router]);

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* --- Balances Card --- */}

      <nav className="flex items-center justify-between p-4 md:p-6 backdrop-blur-sm border-b border-white/10 sticky top-0 z-50 bg-slate-900/80">
        <div className="flex items-center gap-4">
          <Link href="/">
            <Button variant="ghost" size="sm" className="text-slate-300 hover:text-white">
              <ArrowLeft className="h-4 w-4 md:mr-2" />
              <span className="hidden md:inline">Back to Home</span>
            </Button>
          </Link>
          <h1 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            SME Dashboard
          </h1>
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
                      const formattedBal = ethers.formatUnits(bal, 18); // Default 18 for unknown
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

      <main className="p-4 md:p-6 max-w-7xl mx-auto space-y-8">
        {error && (
          <div className="flex items-center gap-3 text-red-400 bg-red-400/10 p-4 rounded-lg border border-red-400/30">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          <Card className="lg:col-span-3 bg-white/5 backdrop-blur-sm border-white/10">
            <CardHeader>
              <CardTitle>Tokenize a New Invoice</CardTitle>
              <CardDescription className="text-slate-400">
                Upload an invoice to turn it into a yield-bearing NFT.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label htmlFor="invoice-file" className="text-slate-300 mb-2 block">
                  Invoice Document
                </Label>
                <Input
                  id="invoice-file"
                  type="file"
                  accept=".pdf,.jpg,.png"
                  onChange={handleFileSelect}
                  className="bg-slate-800 border-white/20 text-slate-300 file:bg-purple-600 file:text-white file:border-0 file:rounded-md file:px-4 file:py-2 file:mr-4 hover:file:bg-purple-700"
                />
                <p className="text-xs text-slate-500 mt-2">Supported: PDF, JPG, PNG (Max 10MB)</p>
              </div>

              <div>
                <Label htmlFor="token-select" className="text-slate-300 mb-2 block">
                  Token to Receive Funds In
                </Label>
                <select
                  id="token-select"
                  value={preferredToken.symbol}
                  onChange={(e) => {
                    const token = supportedTokens.find(t => t.symbol === e.target.value);
                    if (token) {
                      setPreferredToken(token);
                      if (extractedMetadata?.amount) {
                        fetchConvertedAmount('USDC', token.symbol, extractedMetadata.amount);
                      }
                    }
                  }}
                  className="w-full bg-slate-800 text-white p-2 rounded-md border border-white/20 focus:ring-2 focus:ring-purple-500"
                >
                  {supportedTokens.map((token) => (
                    <option key={token.symbol} value={token.symbol}>
                      {token.symbol}
                    </option>
                  ))}
                </select>
              </div>

              <Button
                onClick={handleMintNFT}
                disabled={!isConnected || isMinting || !isReadyToMint}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isMinting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Minting Invoice NFT...
                  </>
                ) : (
                  <>Mint Invoice NFT</>
                )}
              </Button>
            </CardContent>
          </Card>
          <ExtractedMetadata
            extractedMetadata={extractedMetadata}
            selectedFile={selectedFile}
            isReadyToMint={isReadyToMint}
            setExtractedMetadata={setExtractedMetadata}
          />
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Minted Invoices</h2>
          {isLoadingInvoices ? (
            <div className="flex items-center gap-2 text-slate-400">
              <Loader2 className="animate-spin h-4 w-4" />
              Loading invoices...
            </div>
          ) : invoices.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 bg-white/5 border border-white/10 rounded-lg">
              <Inbox className="h-16 w-16 text-slate-500 mb-4" />
              <p className="text-slate-400">No invoices found. Upload one to get started!</p>
            </div>
          ) : (
            <InvoiceTableCard invoices={invoices} getStatusBadge={getStatusBadge} />
          )}
        </div>
      </main>
    </div>
  );
}