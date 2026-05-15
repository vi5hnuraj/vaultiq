'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Vaultiq Global Layout Error:', error);
  }, [error]);

  const isWalletError = error.message?.toLowerCase().includes('metamask') || 
                        error.message?.toLowerCase().includes('wallet');

  return (
    <html lang="en">
      <body className="bg-slate-950">
        <div className="min-h-screen flex items-center justify-center p-6 text-white text-center font-sans tracking-tight leading-relaxed antialiased">
          <div className="max-w-md w-full space-y-8 p-12 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl">
            <div className="flex justify-center">
              <div className="p-4 rounded-full bg-red-500/10 border border-red-500/20">
                <AlertCircle className="h-12 w-12 text-red-500" />
              </div>
            </div>
            
            <div className="space-y-2">
              <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
                {isWalletError ? 'Wallet Connection Gap' : 'Infrastructure Issue'}
              </h2>
              <p className="text-slate-400">
                {isWalletError 
                  ? "MetaMask is currently locked or rejecting the connection. Please unlock your wallet and refresh."
                  : "We've encountered a runtime issue. Your session is safe, please refresh to resync."}
              </p>
            </div>

            <div className="pt-4 space-y-4">
              <Button
                onClick={() => reset()}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 h-auto text-lg transition-all"
              >
                Sync Protocol
              </Button>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
