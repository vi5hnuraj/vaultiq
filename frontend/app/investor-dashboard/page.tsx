"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAccount } from "wagmi"

export default function Page() {
  const router = useRouter()
  const { address, isConnected } = useAccount()

  useEffect(() => {
    if (isConnected && address) {
      router.push(`/investor/${address}`)
    }
  }, [isConnected, address])

  if (!isConnected) {
    return <div>Please connect your wallet first.</div>
  }

  return <div>Redirecting to Investor Dashboard...</div>
}