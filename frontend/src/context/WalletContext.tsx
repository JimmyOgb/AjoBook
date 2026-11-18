import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { generateSecretKey, getPublicKey } from 'nostr-tools/pure';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils';
import { nip19 } from 'nostr-tools';
import { nwc } from '@getalby/sdk';

export type Currency = 'SATS' | 'NGN' | 'XOF';

export type WalletType = 'DEMO' | 'NWC' | 'NIP07';

export interface NwcInfo {
  relay: string;
  pubkey?: string;
  lud16?: string;
  network?: string;
  alias?: string;
}

export function parseNwcUrl(rawUrl: string): { pubkey?: string; relay?: string; lud16?: string } | null {
  try {
    const clean = rawUrl.trim();
    if (!clean.startsWith('nostr+walletconnect://')) return null;
    const dummyHttp = clean.replace('nostr+walletconnect://', 'http://');
    const parsed = new URL(dummyHttp);
    const pubkey = parsed.hostname || parsed.pathname.replace(/^\/\//, '');
    const relay = parsed.searchParams.get('relay') || undefined;
    const lud16 = parsed.searchParams.get('lud16') || undefined;
    return { pubkey, relay, lud16 };
  } catch {
    return null;
  }
}

export interface WalletContextType {
  // Nostr Identity
  npub: string;
  nsec: string;
  pubkeyHex: string;
  isNip07Available: boolean;
  connectNip07: () => Promise<void>;
  generateNewIdentity: () => void;
  importNsec: (nsecKey: string) => boolean;

  // Lightning Wallet
  walletType: WalletType;
  setWalletType: (type: WalletType) => void;
  balanceSats: number;
  nwcUrl: string;
  nwcInfo: NwcInfo | null;
  lastPreimage: string | null;
  setNwcUrl: (url: string) => void;
  connectNwc: (url: string) => Promise<boolean>;
  disconnectNwc: () => void;
  resetDemoWallet: () => void;
  payInvoice: (bolt11: string, amountSats: number) => Promise<{ preimage: string }>;

  // Currency & Display
  currency: Currency;
  setCurrency: (currency: Currency) => void;
  formatAmount: (sats: number) => string;

  // Wallet Drawer
  isWalletDrawerOpen: boolean;
  openWalletDrawer: () => void;
  closeWalletDrawer: () => void;
}

const WalletContext = createContext<WalletContextType | null>(null);

const NOSTR_SEC_STORAGE_KEY = 'ajobook_nostr_sec_hex';
const DEMO_BALANCE_STORAGE_KEY = 'ajobook_demo_wallet_sats';
const NWC_URL_STORAGE_KEY = 'ajobook_nwc_url';
const CURRENCY_STORAGE_KEY = 'ajobook_preferred_currency';

const DEFAULT_DEMO_SATS = 100000; // 100,000 sats initial test balance

// Realistic market conversion rates
// 1 BTC ≈ $95,000 USD = 100M sats -> 1 sat ≈ $0.00095 USD
// 1 USD ≈ 1,500 NGN -> 1 sat ≈ 1.425 NGN
// 1 USD ≈ 620 XOF (CFA) -> 1 sat ≈ 0.589 XOF
const SATS_TO_NGN_RATE = 1.425;
const SATS_TO_XOF_RATE = 0.589;

export const WalletProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // ─── 1. Nostr Identity ────────────────────────────────────────────────
  const [secHex, setSecHex] = useState<string>(() => {
    try {
      const stored = localStorage.getItem(NOSTR_SEC_STORAGE_KEY);
      if (stored && stored.length === 64) return stored;
    } catch {}
    const fresh = generateSecretKey();
    const hex = bytesToHex(fresh);
    try { localStorage.setItem(NOSTR_SEC_STORAGE_KEY, hex); } catch {}
    return hex;
  });

  const [npub, setNpub] = useState<string>('');
  const [nsec, setNsec] = useState<string>('');
  const [pubkeyHex, setPubkeyHex] = useState<string>('');
  const [isNip07Available, setIsNip07Available] = useState<boolean>(false);

  useEffect(() => {
    try {
      const secBytes = hexToBytes(secHex);
      const pk = getPublicKey(secBytes);
      setPubkeyHex(pk);
      setNpub(nip19.npubEncode(pk));
      setNsec(nip19.nsecEncode(secBytes));
    } catch (e) {
      console.error('Error deriving Nostr keys:', e);
    }
  }, [secHex]);

  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).nostr) {
      setIsNip07Available(true);
    }
  }, []);

  const generateNewIdentity = useCallback(() => {
    const fresh = generateSecretKey();
    const hex = bytesToHex(fresh);
    setSecHex(hex);
    try { localStorage.setItem(NOSTR_SEC_STORAGE_KEY, hex); } catch {}
  }, []);

  const importNsec = useCallback((imported: string): boolean => {
    try {
      let hex = '';
      if (imported.startsWith('nsec1')) {
        const decoded = nip19.decode(imported);
        if (decoded.type === 'nsec' && decoded.data instanceof Uint8Array) {
          hex = bytesToHex(decoded.data);
        }
      } else if (imported.length === 64) {
        hex = imported;
      }
      if (hex) {
        setSecHex(hex);
        localStorage.setItem(NOSTR_SEC_STORAGE_KEY, hex);
        return true;
      }
    } catch (err) {
      console.error('Failed to import nsec:', err);
    }
    return false;
  }, []);

  const connectNip07 = useCallback(async () => {
    if (typeof window !== 'undefined' && (window as any).nostr) {
      try {
        const pk = await (window as any).nostr.getPublicKey();
        if (pk) {
          setPubkeyHex(pk);
          setNpub(nip19.npubEncode(pk));
          setWalletType('NIP07');
        }
      } catch (e) {
        console.error('NIP-07 connect failed:', e);
      }
    }
  }, []);

  // ─── 2. Lightning Wallet (Demo & NWC) ─────────────────────────────────
  const [walletType, setWalletType] = useState<WalletType>('DEMO');
  const [demoBalance, setDemoBalance] = useState<number>(() => {
    try {
      const stored = localStorage.getItem(DEMO_BALANCE_STORAGE_KEY);
      const parsed = stored ? Number(stored) : NaN;
      if (!isNaN(parsed) && parsed > 0) return parsed;
      return DEFAULT_DEMO_SATS;
    } catch {
      return DEFAULT_DEMO_SATS;
    }
  });

  const [nwcUrl, setNwcUrlState] = useState<string>(() => {
    try {
      return localStorage.getItem(NWC_URL_STORAGE_KEY) || '';
    } catch {
      return '';
    }
  });

  const [nwcBalance, setNwcBalance] = useState<number>(0);
  const [nwcClient, setNwcClient] = useState<any | null>(null);
  const [nwcInfo, setNwcInfo] = useState<NwcInfo | null>(() => {
    try {
      const stored = localStorage.getItem(NWC_URL_STORAGE_KEY);
      if (stored) {
        const parsed = parseNwcUrl(stored);
        if (parsed) {
          return {
            relay: parsed.relay || 'wss://relay.getalby.com/v1',
            pubkey: parsed.pubkey,
            lud16: parsed.lud16,
            network: stored.includes('mutinynet') ? 'Mutinynet (Signet)' : stored.includes('testnet') ? 'Testnet4' : 'Mainnet / Signet'
          };
        }
      }
    } catch {}
    return null;
  });
  const [lastPreimage, setLastPreimage] = useState<string | null>(null);

  const connectNwc = useCallback(async (url: string): Promise<boolean> => {
    if (!url || !url.startsWith('nostr+walletconnect://')) return false;
    try {
      const parsed = parseNwcUrl(url);
      const client = new nwc.NWCClient({ nostrWalletConnectUrl: url });
      const balanceData = await client.getBalance();

      let detectedNetwork = 'Mutinynet / Signet';
      let detectedAlias = '';
      try {
        const info = await client.getInfo();
        if (info) {
          if (info.network) detectedNetwork = info.network.toUpperCase();
          if (info.alias) detectedAlias = info.alias;
        }
      } catch {
        if (url.includes('mutinynet') || (parsed?.relay && parsed.relay.includes('mutiny'))) {
          detectedNetwork = 'Mutinynet (Signet)';
        } else if (url.includes('testnet')) {
          detectedNetwork = 'Testnet4';
        } else {
          detectedNetwork = 'Mainnet / Signet';
        }
      }

      setNwcClient(client);
      setNwcUrlState(url);
      setWalletType('NWC');
      setNwcBalance(balanceData.balance || 0);
      setNwcInfo({
        relay: parsed?.relay || 'wss://relay.getalby.com/v1',
        pubkey: parsed?.pubkey,
        lud16: parsed?.lud16,
        network: detectedNetwork,
        alias: detectedAlias
      });
      try { localStorage.setItem(NWC_URL_STORAGE_KEY, url); } catch {}
      return true;
    } catch (err) {
      console.error('NWC connection error:', err);
      return false;
    }
  }, []);

  const disconnectNwc = useCallback(() => {
    setNwcClient(null);
    setNwcUrlState('');
    setNwcInfo(null);
    setWalletType('DEMO');
    try { localStorage.removeItem(NWC_URL_STORAGE_KEY); } catch {}
  }, []);

  const resetDemoWallet = useCallback(() => {
    setDemoBalance(DEFAULT_DEMO_SATS);
    try { localStorage.setItem(DEMO_BALANCE_STORAGE_KEY, String(DEFAULT_DEMO_SATS)); } catch {}
  }, []);

  const balanceSats = walletType === 'NWC' ? nwcBalance : demoBalance;

  const payInvoice = useCallback(async (bolt11: string, amountSats: number): Promise<{ preimage: string }> => {
    let preimage = '';
    if (walletType === 'NWC' && nwcClient) {
      const res = await nwcClient.payInvoice({ invoice: bolt11 });
      preimage = res.preimage || '00000000000000000000000000000000';
      // Refresh balance
      try {
        const bal = await nwcClient.getBalance();
        setNwcBalance(bal.balance || 0);
      } catch {}
    } else if (walletType === 'NIP07' && typeof window !== 'undefined' && (window as any).webln) {
      try {
        await (window as any).webln.enable();
        const res = await (window as any).webln.sendPayment(bolt11);
        preimage = res.preimage || Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
      } catch (err: any) {
        throw new Error(err.message || 'WebLN payment failed');
      }
    } else {
      // Demo Wallet mode: deduct local balance and generate valid preimage
      if (demoBalance < amountSats) {
        throw new Error(`Insufficient demo balance. You have ${demoBalance.toLocaleString()} sats, need ${amountSats.toLocaleString()} sats.`);
      }
      const newBal = demoBalance - amountSats;
      setDemoBalance(newBal);
      try { localStorage.setItem(DEMO_BALANCE_STORAGE_KEY, String(newBal)); } catch {}

      // Generate random 32-byte hex preimage
      preimage = Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
    }
    setLastPreimage(preimage);
    return { preimage };
  }, [walletType, nwcClient, demoBalance]);

  // ─── 3. Currency Formatting ──────────────────────────────────────────
  const [currency, setCurrencyState] = useState<Currency>(() => {
    try {
      const stored = localStorage.getItem(CURRENCY_STORAGE_KEY) as Currency;
      if (['SATS', 'NGN', 'XOF'].includes(stored)) return stored;
    } catch {}
    return 'SATS';
  });

  const setCurrency = (c: Currency) => {
    setCurrencyState(c);
    try { localStorage.setItem(CURRENCY_STORAGE_KEY, c); } catch {}
  };

  const formatAmount = useCallback((sats: number): string => {
    if (currency === 'NGN') {
      const ngn = Math.round(sats * SATS_TO_NGN_RATE);
      return `₦${ngn.toLocaleString()}`;
    }
    if (currency === 'XOF') {
      const xof = Math.round(sats * SATS_TO_XOF_RATE);
      return `${xof.toLocaleString()} CFA`;
    }
    return `${sats.toLocaleString()} sats`;
  }, [currency]);

  // ─── 4. Wallet Drawer Visibility ──────────────────────────────────────
  const [isWalletDrawerOpen, setIsWalletDrawerOpen] = useState(false);
  const openWalletDrawer = () => setIsWalletDrawerOpen(true);
  const closeWalletDrawer = () => setIsWalletDrawerOpen(false);

  return (
    <WalletContext.Provider
      value={{
        npub,
        nsec,
        pubkeyHex,
        isNip07Available,
        connectNip07,
        generateNewIdentity,
        importNsec,
        walletType,
        setWalletType,
        balanceSats,
        nwcUrl,
        nwcInfo,
        lastPreimage,
        setNwcUrl: setNwcUrlState,
        connectNwc,
        disconnectNwc,
        resetDemoWallet,
        payInvoice,
        currency,
        setCurrency,
        formatAmount,
        isWalletDrawerOpen,
        openWalletDrawer,
        closeWalletDrawer
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};

export const useWallet = (): WalletContextType => {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
};
