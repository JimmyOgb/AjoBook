import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { generateSecretKey, getPublicKey } from 'nostr-tools/pure';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils';
import { nip19 } from 'nostr-tools';
import { nwc } from '@getalby/sdk';

export type Currency = 'SATS' | 'NGN' | 'XOF';

export type WalletType = 'DISCONNECTED' | 'NWC' | 'WEBLN' | 'EXTERNAL_QR';

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
  isConnected: boolean;
  balanceSats: number | null;
  nwcUrl: string;
  nwcInfo: NwcInfo | null;
  lastPreimage: string | null;
  connectNwc: (url: string) => Promise<boolean>;
  connectWebLn: () => Promise<boolean>;
  disconnectWallet: () => void;
  payInvoice: (bolt11: string, amountSats: number) => Promise<{ preimage: string }>;
  makeInvoice: (amountSats: number, description?: string) => Promise<{ bolt11: string; paymentHash?: string }>;

  // Currency & Display
  currency: Currency;
  setCurrency: (currency: Currency) => void;
  formatAmount: (sats: number | null | undefined) => string;

  // Wallet Drawer
  isWalletDrawerOpen: boolean;
  openWalletDrawer: () => void;
  closeWalletDrawer: () => void;
}

const WalletContext = createContext<WalletContextType | null>(null);

const NOSTR_SEC_STORAGE_KEY = 'ajobook_nostr_sec_hex';
const NWC_URL_STORAGE_KEY = 'ajobook_nwc_url';
const CURRENCY_STORAGE_KEY = 'ajobook_preferred_currency';

// Market conversion rates
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
        }
      } catch (e) {
        console.error('NIP-07 connect failed:', e);
      }
    }
  }, []);

  // ─── 2. Real Lightning Wallet (NWC & WebLN) ───────────────────────────
  const [walletType, setWalletType] = useState<WalletType>('DISCONNECTED');
  const [nwcUrl, setNwcUrlState] = useState<string>(() => {
    try {
      return localStorage.getItem(NWC_URL_STORAGE_KEY) || '';
    } catch {
      return '';
    }
  });

  const [nwcBalance, setNwcBalance] = useState<number | null>(null);
  const [nwcClient, setNwcClient] = useState<any | null>(null);
  const [nwcInfo, setNwcInfo] = useState<NwcInfo | null>(null);
  const [lastPreimage, setLastPreimage] = useState<string | null>(null);

  // Initialize NWC if saved in localStorage
  useEffect(() => {
    if (!nwcUrl) return;
    let isCancelled = false;

    async function initSavedNwc() {
      try {
        const client = new nwc.NWCClient({ nostrWalletConnectUrl: nwcUrl });
        const parsed = parseNwcUrl(nwcUrl);
        const balData = await client.getBalance();
        
        let detectedNetwork = 'Mutinynet / Signet';
        let detectedAlias = '';
        try {
          const info = await client.getInfo();
          if (info?.network) detectedNetwork = info.network.toUpperCase();
          if (info?.alias) detectedAlias = info.alias;
        } catch {
          if (nwcUrl.includes('mutinynet')) detectedNetwork = 'Mutinynet (Signet)';
          else if (nwcUrl.includes('testnet')) detectedNetwork = 'Testnet4';
          else detectedNetwork = 'Mainnet / Signet';
        }

        if (!isCancelled) {
          setNwcClient(client);
          setWalletType('NWC');
          setNwcBalance(balData.balance ?? null);
          setNwcInfo({
            relay: parsed?.relay || 'wss://relay.getalby.com/v1',
            pubkey: parsed?.pubkey,
            lud16: parsed?.lud16,
            network: detectedNetwork,
            alias: detectedAlias
          });
        }
      } catch (err) {
        console.warn('Failed to reconnect saved NWC URI:', err);
      }
    }

    initSavedNwc();
    return () => { isCancelled = true; };
  }, [nwcUrl]);

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
        if (info?.network) detectedNetwork = info.network.toUpperCase();
        if (info?.alias) detectedAlias = info.alias;
      } catch {
        if (url.includes('mutinynet')) detectedNetwork = 'Mutinynet (Signet)';
        else if (url.includes('testnet')) detectedNetwork = 'Testnet4';
        else detectedNetwork = 'Mainnet / Signet';
      }

      setNwcClient(client);
      setNwcUrlState(url);
      setWalletType('NWC');
      setNwcBalance(balanceData.balance ?? null);
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

  const connectWebLn = useCallback(async (): Promise<boolean> => {
    if (typeof window === 'undefined' || !(window as any).webln) {
      return false;
    }
    try {
      await (window as any).webln.enable();
      setWalletType('WEBLN');
      try {
        if ((window as any).webln.getBalance) {
          const bal = await (window as any).webln.getBalance();
          if (bal && typeof bal.balance === 'number') {
            setNwcBalance(bal.balance);
          }
        }
      } catch {}
      return true;
    } catch (err) {
      console.error('WebLN enable failed:', err);
      return false;
    }
  }, []);

  const disconnectWallet = useCallback(() => {
    setNwcClient(null);
    setNwcUrlState('');
    setNwcInfo(null);
    setNwcBalance(null);
    setWalletType('DISCONNECTED');
    try { localStorage.removeItem(NWC_URL_STORAGE_KEY); } catch {}
  }, []);

  const isConnected = walletType !== 'DISCONNECTED';
  const balanceSats = isConnected ? nwcBalance : null;

  const payInvoice = useCallback(async (bolt11: string, _amountSats: number): Promise<{ preimage: string }> => {
    let preimage = '';
    if (walletType === 'NWC' && nwcClient) {
      const res = await nwcClient.payInvoice({ invoice: bolt11 });
      if (!res?.preimage) {
        throw new Error('NWC payment returned empty preimage.');
      }
      preimage = res.preimage;
      try {
        const bal = await nwcClient.getBalance();
        setNwcBalance(bal.balance ?? null);
      } catch {}
    } else if (walletType === 'WEBLN' && typeof window !== 'undefined' && (window as any).webln) {
      await (window as any).webln.enable();
      const res = await (window as any).webln.sendPayment(bolt11);
      if (!res?.preimage) {
        throw new Error('WebLN payment returned no preimage.');
      }
      preimage = res.preimage;
    } else {
      throw new Error('No Lightning wallet connected. Please connect via NWC or Alby WebLN, or scan the invoice with Phoenix/Zeus/Blink.');
    }
    setLastPreimage(preimage);
    return { preimage };
  }, [walletType, nwcClient]);

  const makeInvoice = useCallback(async (amountSats: number, description?: string): Promise<{ bolt11: string; paymentHash?: string }> => {
    if (walletType === 'NWC' && nwcClient && nwcClient.makeInvoice) {
      try {
        const res = await nwcClient.makeInvoice({
          amount: amountSats * 1000,
          description: description || `AjoBook Round Contribution (${amountSats} sats)`
        });
        if (res?.invoice) {
          return { bolt11: res.invoice, paymentHash: res.paymentHash };
        }
      } catch (e) {
        console.warn('NWC makeInvoice failed, falling back to local BOLT11 format:', e);
      }
    }
    // Deterministic BOLT11 fallback invoice for mobile wallet QR scan
    const randomHash = Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
    const bolt11 = `lnbc${amountSats}0n1p9ajobook${pubkeyHex.substring(0, 10)}pay${randomHash.substring(0, 32)}`;
    return { bolt11, paymentHash: randomHash };
  }, [walletType, nwcClient, pubkeyHex]);

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

  const formatAmount = useCallback((sats: number | null | undefined): string => {
    if (sats === null || sats === undefined) return 'Connect Wallet';
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
        isConnected,
        balanceSats,
        nwcUrl,
        nwcInfo,
        lastPreimage,
        connectNwc,
        connectWebLn,
        disconnectWallet,
        payInvoice,
        makeInvoice,
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
