'use client';

import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { ExternalLink, Calendar, Hash } from 'lucide-react';

interface Invoice {
  id: string;
  nft_id: number;
  customerName: string;
  invoiceAmount: number;
  preferredTokenSymbol: string;
  status: 'Pending Funding' | 'Funded' | 'Repaid';
  txHash: string;
  createdAt: string;
}

interface InvoiceNFTCardProps {
  invoice: Invoice;
}

export default function InvoiceNFTCard({ invoice }: InvoiceNFTCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Funded': return 'from-blue-500/20 to-cyan-500/20 text-cyan-400 border-cyan-500/30';
      case 'Repaid': return 'from-green-500/20 to-emerald-500/20 text-emerald-400 border-emerald-500/30';
      default: return 'from-yellow-500/20 to-orange-500/20 text-yellow-400 border-yellow-500/30';
    }
  };

  const getGlowColor = (status: string) => {
    switch (status) {
      case 'Funded': return 'bg-cyan-500/20';
      case 'Repaid': return 'bg-emerald-500/20';
      default: return 'bg-yellow-500/20';
    }
  };

  return (
    <motion.div
      whileHover={{ scale: 1.02, rotateY: 5, rotateX: -5 }}
      transition={{ type: "spring", stiffness: 300 }}
      className="relative group"
    >
      {/* Dynamic Glow Background */}
      <div className={`absolute -inset-0.5 rounded-3xl blur opacity-30 group-hover:opacity-60 transition duration-500 ${getGlowColor(invoice.status)}`}></div>
      
      <Card className="relative h-[380px] w-full bg-[#0d0d12]/80 backdrop-blur-xl border-white/10 rounded-3xl overflow-hidden flex flex-col">
        {/* NFT Header Section */}
        <div className="p-6 pb-0 flex justify-between items-start">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              <Hash className="h-3 w-3" />
              NFT ID: {invoice.nft_id || '---'}
            </div>
            <h3 className="text-xl font-bold text-white truncate max-w-[180px]">
              {invoice.customerName}
            </h3>
          </div>
          <Badge className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider backdrop-blur-md border ${getStatusColor(invoice.status)}`}>
            {invoice.status}
          </Badge>
        </div>

        {/* Visual Asset Section (Glassmorphism Art) */}
        <div className="flex-1 px-6 flex items-center justify-center">
            <div className="relative w-full h-32 rounded-2xl bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 flex flex-col items-center justify-center overflow-hidden">
                {/* Decorative background shapes */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-purple-600/10 blur-2xl rounded-full -mr-16 -mt-16"></div>
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-600/10 blur-2xl rounded-full -ml-16 -mb-16"></div>
                
                <span className="text-4xl font-extrabold bg-gradient-to-r from-white to-white/40 bg-clip-text text-transparent tracking-tighter">
                    V-NFT
                </span>
                <div className="mt-2 flex items-center gap-2">
                    <div className="h-1 w-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"></div>
                    <div className="h-1 w-1 bg-white/20 rounded-full"></div>
                    <div className="h-1 w-1 bg-white/20 rounded-full"></div>
                </div>
            </div>
        </div>

        {/* NFT Pricing Section */}
        <div className="p-6 pt-0 space-y-4">
          <div className="flex justify-between items-end">
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Value</p>
              <p className="text-2xl font-black text-white">
                {invoice.invoiceAmount.toLocaleString()} <span className="text-sm font-medium text-slate-400">{invoice.preferredTokenSymbol}</span>
              </p>
            </div>
            <a 
              href={`https://sepolia.etherscan.io/tx/${invoice.txHash}`} 
              target="_blank" 
              rel="noopener noreferrer"
              className="p-2 bg-white/5 hover:bg-white/10 rounded-xl transition-colors border border-white/10 group/link"
            >
              <ExternalLink className="h-4 w-4 text-slate-400 group-hover/link:text-white" />
            </a>
          </div>

          <div className="h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>

          <div className="flex justify-between items-center text-xs text-slate-400 font-medium">
            <div className="flex items-center gap-2">
              <Calendar className="h-3 w-3" />
              {new Date(invoice.createdAt).toLocaleDateString()}
            </div>
            <div className="text-[10px] text-slate-600 font-mono italic">
                Vaultiq Protocol v1.0
            </div>
          </div>
        </div>

        {/* Hover Shine Effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
      </Card>
    </motion.div>
  );
}
