'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Vaultiq Runtime Error:', error);
  }, [error]);

  const isWalletError = error.message?.toLowerCase().includes('metamask') || 
                        error.message?.toLowerCase().includes('wallet');

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 text-white text-center">
      <div className="max-w-md w-full space-y-8 p-12 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl">
        <div className="flex justify-center">
          <div className="p-4 rounded-full bg-red-500/10 border border-red-500/20">
            <AlertCircle className="h-12 w-12 text-red-500" />
          </div>
        </div>
        
        <div className="space-y-2">
          <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
            {isWalletError ? 'Wallet Connection Issue' : 'Something went wrong'}
          </h2>
          <p className="text-slate-400">
            {isWalletError 
              ? "We couldn't connect to your wallet. Please make sure MetaMask is unlocked and try again."
              : "An unexpected error occurred. Don't worry, your data is safe."}
          </p>
        </div>

        <div className="pt-4 space-y-4">
          <Button
            onClick={() => reset()}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 h-auto text-lg transition-all"
          >
            Refresh Protocol
          </Button>
          
          <Button
            variant="ghost"
            onClick={() => window.location.href = '/'}
            className="w-full text-slate-500 hover:text-white"
          >
            Return to Landing Page
          </Button>
        </div>
        
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-8 p-4 rounded bg-black/40 text-left overflow-auto max-h-32 border border-white/5">
            <code className="text-xs text-slate-500 font-mono">
              {error.message}
            </code>
          </div>
        )}
      </div>
    </div>
  );
}
