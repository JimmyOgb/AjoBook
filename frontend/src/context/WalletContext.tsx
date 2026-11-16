import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useDisconnect } from 'wagmi';

export interface EIP6963ProviderInfo {
  uuid: string;
  name: string;
  icon: string;
  rdns: string;
}

export interface EIP6963ProviderDetail {
  info: EIP6963ProviderInfo;
  provider: any;
}

export interface WalletContextType {
  providers: EIP6963ProviderDetail[];
  selectedRdns: string | null;
  activeProvider: any | null;
  activeAccount: string | null;
  activeChainId: number | null;
  isConnected: boolean;
  selectWallet: (rdns: string) => Promise<string | null>;
  disconnectWallet: () => void;
  resetWalletSession: () => void;
  getActiveProvider: () => Promise<{ provider: any; account: string }>;
}

const WalletContext = createContext<WalletContextType | null>(null);

const STORAGE_KEY = 'ajochain_selected_rdns';

export const WalletProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { disconnect } = useDisconnect();
  const [providers, setProviders] = useState<EIP6963ProviderDetail[]>([]);
  const [selectedRdns, setSelectedRdns] = useState<string | null>(() => {
    try {
      return typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
    } catch {
      return null;
    }
  });
  const [activeAccount, setActiveAccount] = useState<string | null>(null);
  const [activeChainId, setActiveChainId] = useState<number | null>(null);

  // 1. EIP-6963 Provider Discovery
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const discoveredMap = new Map<string, EIP6963ProviderDetail>();

    const handleAnnounce = (event: any) => {
      const detail = event?.detail as EIP6963ProviderDetail;
      if (!detail?.info?.rdns || !detail?.provider) return;

      discoveredMap.set(detail.info.rdns, detail);
      setProviders(Array.from(discoveredMap.values()));
    };

    window.addEventListener('eip6963:announceProvider', handleAnnounce);
    window.dispatchEvent(new Event('eip6963:requestProvider'));

    // Secondary fallback: check known injected globals if not announced via EIP-6963
    setTimeout(() => {
      const win = window as any;

      // OKX Wallet
      if (win.okxwallet && !discoveredMap.has('com.okex.wallet')) {
        const okxDetail: EIP6963ProviderDetail = {
          info: {
            uuid: 'okx-fallback',
            name: 'OKX Wallet',
            icon: 'https://raw.githubusercontent.com/MetaMask/contract-metadata/master/images/okx.svg',
            rdns: 'com.okex.wallet',
          },
          provider: win.okxwallet,
        };
        discoveredMap.set('com.okex.wallet', okxDetail);
      }

      // Check window.ethereum.providers array if multiple extensions injected
      if (Array.isArray(win.ethereum?.providers)) {
        win.ethereum.providers.forEach((p: any) => {
          if (p.isMetaMask && !p.isPortal && !discoveredMap.has('io.metamask')) {
            discoveredMap.set('io.metamask', {
              info: {
                uuid: 'metamask-array-fallback',
                name: 'MetaMask',
                icon: 'https://raw.githubusercontent.com/MetaMask/brand-resources/master/SVG/metamask-fox.svg',
                rdns: 'io.metamask',
              },
              provider: p,
            });
          }
          if (p.isOkxWallet && !discoveredMap.has('com.okex.wallet')) {
            discoveredMap.set('com.okex.wallet', {
              info: {
                uuid: 'okx-array-fallback',
                name: 'OKX Wallet',
                icon: '',
                rdns: 'com.okex.wallet',
              },
              provider: p,
            });
          }
        });
      } else if (win.ethereum && win.ethereum.isMetaMask && !win.ethereum.isPortal && !discoveredMap.has('io.metamask')) {
        discoveredMap.set('io.metamask', {
          info: {
            uuid: 'metamask-fallback',
            name: 'MetaMask',
            icon: 'https://raw.githubusercontent.com/MetaMask/brand-resources/master/SVG/metamask-fox.svg',
            rdns: 'io.metamask',
          },
          provider: win.ethereum,
        });
      }

      setProviders(Array.from(discoveredMap.values()));
    }, 200);

    return () => {
      window.removeEventListener('eip6963:announceProvider', handleAnnounce);
    };
  }, []);

  // 2. Resolve Active Provider from selectedRdns or first non-portal available provider
  const resolveActiveDetail = useCallback((): EIP6963ProviderDetail | null => {
    if (providers.length === 0) return null;

    if (selectedRdns) {
      const match = providers.find((p) => p.info.rdns === selectedRdns);
      if (match) return match;
    }

    // Default preference: MetaMask -> OKX Wallet -> any non-portal extension
    const preferredMetaMask = providers.find((p) => p.info.rdns === 'io.metamask');
    if (preferredMetaMask) return preferredMetaMask;

    const preferredOkx = providers.find((p) => p.info.rdns === 'com.okex.wallet');
    if (preferredOkx) return preferredOkx;

    const nonPortal = providers.find((p) => !p.info.rdns.toLowerCase().includes('portal') && !p.provider?.isPortal);
    return nonPortal || providers[0] || null;
  }, [providers, selectedRdns]);

  const activeDetail = resolveActiveDetail();
  const activeProvider = activeDetail?.provider || null;

  // 3. Listen to account & chain change events on activeProvider
  useEffect(() => {
    if (!activeProvider) return;

    let isMounted = true;

    // Check existing accounts
    activeProvider
      .request({ method: 'eth_accounts' })
      .then((accounts: string[]) => {
        if (isMounted && accounts && accounts.length > 0) {
          setActiveAccount(accounts[0]);
        }
      })
      .catch(() => {});

    // Check existing chain
    activeProvider
      .request({ method: 'eth_chainId' })
      .then((hexChain: string) => {
        if (isMounted && hexChain) {
          setActiveChainId(parseInt(hexChain, 16));
        }
      })
      .catch(() => {});

    const handleAccountsChanged = (accounts: string[]) => {
      if (!isMounted) return;
      if (accounts && accounts.length > 0) {
        setActiveAccount(accounts[0]);
      } else {
        setActiveAccount(null);
      }
    };

    const handleChainChanged = (hexChain: string) => {
      if (!isMounted) return;
      setActiveChainId(parseInt(hexChain, 16));
    };

    activeProvider.on?.('accountsChanged', handleAccountsChanged);
    activeProvider.on?.('chainChanged', handleChainChanged);

    return () => {
      isMounted = false;
      activeProvider.removeListener?.('accountsChanged', handleAccountsChanged);
      activeProvider.removeListener?.('chainChanged', handleChainChanged);
    };
  }, [activeProvider]);

  // 4. Explicitly select wallet & request accounts
  const selectWallet = async (rdns: string): Promise<string | null> => {
    const target = providers.find((p) => p.info.rdns === rdns);
    if (!target) {
      throw new Error(`Wallet extension ${rdns} is not available in this browser.`);
    }

    const provider = target.provider;
    let accounts: string[] = [];
    try {
      accounts = (await provider.request({ method: 'eth_requestAccounts' })) as string[];
    } catch (err: any) {
      if (err?.code === 4001) {
        throw new Error('Connection request rejected by user in wallet.');
      }
      throw err;
    }

    if (!accounts || accounts.length === 0 || !accounts[0]) {
      throw new Error('Please unlock your wallet and approve account access for this site.');
    }

    const account = accounts[0];
    setSelectedRdns(rdns);
    try {
      localStorage.setItem(STORAGE_KEY, rdns);
    } catch {}

    setActiveAccount(account);

    try {
      const hexChain = (await provider.request({ method: 'eth_chainId' })) as string;
      setActiveChainId(parseInt(hexChain, 16));
    } catch {}

    return account;
  };

  // 5. Clean disconnect
  const disconnectWallet = () => {
    setActiveAccount(null);
    try {
      disconnect();
    } catch {}
  };

  // 6. Reset all sessions, wipe wagmi & custom localStorage
  const resetWalletSession = () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith('wagmi') || key.startsWith('@wagmi') || key.startsWith('wc@') || key.startsWith('ajochain_')) {
          localStorage.removeItem(key);
        }
      });
    } catch {}

    setSelectedRdns(null);
    setActiveAccount(null);
    setActiveChainId(null);

    try {
      disconnect();
    } catch {}
  };

  // 7. Get guaranteed active provider with authorized account
  const getActiveProvider = async (): Promise<{ provider: any; account: string }> => {
    const detail = resolveActiveDetail();
    if (!detail || !detail.provider) {
      throw new Error('No compatible web3 wallet found. Please install MetaMask or OKX Wallet.');
    }

    const provider = detail.provider;

    // Request accounts explicitly
    let accounts: string[] = [];
    try {
      accounts = (await provider.request({ method: 'eth_requestAccounts' })) as string[];
    } catch (reqErr: any) {
      if (reqErr?.code === 4001) {
        throw new Error('Connection request rejected by user in wallet.');
      }
      throw reqErr;
    }

    if (!accounts || accounts.length === 0 || !accounts[0]) {
      throw new Error('Please unlock your wallet and approve account access for this site.');
    }

    setActiveAccount(accounts[0]);
    return { provider, account: accounts[0] };
  };

  return (
    <WalletContext.Provider
      value={{
        providers,
        selectedRdns,
        activeProvider,
        activeAccount,
        activeChainId,
        isConnected: !!activeAccount,
        selectWallet,
        disconnectWallet,
        resetWalletSession,
        getActiveProvider,
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
