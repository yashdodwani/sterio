'use client';

import { useProfile } from './profile';
import { useQuery } from '@tanstack/react-query';


const MANTLE_SEPOLIA_RPC = 'https://rpc.sepolia.mantle.xyz';

async function fetchTokenBalance(walletAddress: string): Promise<string> {
  const res = await fetch(MANTLE_SEPOLIA_RPC, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'eth_getBalance',
      params: [walletAddress, 'latest'],
    }),
  });
  const json = await res.json();
  if (json.error) throw new Error(json.error.message);
  const raw = BigInt(json.result);
  return (Number(raw) / 1e18).toFixed(4);
}

export function useMntBalance() {
  const { data: profile } = useProfile();
  const walletAddress = profile?.walletAddress;

  return useQuery({
    queryKey: ['wallet', 'balance', 'mnt', walletAddress],
    queryFn: () => fetchTokenBalance(walletAddress!),
    enabled: !!walletAddress,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}
