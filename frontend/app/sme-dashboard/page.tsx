"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAccount } from "wagmi"

export default function Page() {
  const router = useRouter()
  const { address, isConnected } = useAccount()

  useEffect(() => {
    if (isConnected && address) {
      router.push(`/enterprise/${address}`)
    }
  }, [isConnected, address])

  if (!isConnected) {
    return <div>Please connect wallet.</div>
  }

  return <div>Redirecting to SME Dashboard...</div>
}