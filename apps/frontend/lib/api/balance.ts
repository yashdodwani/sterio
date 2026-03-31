'use client';

import { useProfile } from './profile';
import { useQuery } from '@tanstack/react-query';

const TOKEN_CONTRACT = '0x14196f08a4fa0b66b7331bc40dd6bcd8a1deea9f';
const BASE_SEPOLIA_RPC = 'https://sepolia.base.org';

async function fetchTokenBalance(walletAddress: string): Promise<string> {
  // balanceOf(address) selector = 0x70a08231
  const data = '0x70a08231' + walletAddress.replace('0x', '').padStart(64, '0');

  const res = await fetch(BASE_SEPOLIA_RPC, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'eth_call',
      params: [{ to: TOKEN_CONTRACT, data }, 'latest'],
    }),
  });

  const json = await res.json();
  if (json.error) throw new Error(json.error.message);

  const raw = BigInt(json.result);
  // 18 decimals
  return (Number(raw) / 1e6).toFixed(2);
}

export function useUsdxmBalance() {
  const { data: profile } = useProfile();
  const walletAddress = profile?.walletAddress;

  return useQuery({
    queryKey: ['wallet', 'balance', 'usdxm', walletAddress],
    queryFn: () => fetchTokenBalance(walletAddress!),
    enabled: !!walletAddress,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}
