export interface MempoolFees {
  fastestFee: number;
  halfHourFee: number;
  hourFee: number;
  minimumFee: number;
}

export interface BitcoinNetworkInfo {
  tipHeight: number;
  fees: MempoolFees;
  network: 'mainnet' | 'signet';
  lastUpdated: number;
}

const DEFAULT_FEES: MempoolFees = {
  fastestFee: 3,
  halfHourFee: 1,
  hourFee: 1,
  minimumFee: 1
};

export async function fetchBitcoinNetworkInfo(useSignet = false): Promise<BitcoinNetworkInfo> {
  const baseUrl = useSignet ? 'https://mempool.space/signet/api' : 'https://mempool.space/api';
  
  let tipHeight = 976385;
  let fees = DEFAULT_FEES;

  try {
    const heightRes = await fetch(`${baseUrl}/blocks/tip/height`, { signal: AbortSignal.timeout(3000) });
    if (heightRes.ok) {
      const text = await heightRes.text();
      const parsed = parseInt(text, 10);
      if (!isNaN(parsed) && parsed > 0) {
        tipHeight = parsed;
      }
    }
  } catch {}

  try {
    const feesRes = await fetch(`${baseUrl}/v1/fees/recommended`, { signal: AbortSignal.timeout(3000) });
    if (feesRes.ok) {
      const data = await feesRes.json();
      if (data && typeof data.fastestFee === 'number') {
        fees = {
          fastestFee: data.fastestFee,
          halfHourFee: data.halfHourFee,
          hourFee: data.hourFee,
          minimumFee: data.minimumFee
        };
      }
    }
  } catch {}

  return {
    tipHeight,
    fees,
    network: useSignet ? 'signet' : 'mainnet',
    lastUpdated: Date.now()
  };
}
