import { useAccount, useConnect, useChainId } from 'wagmi';
import { createWalletClient, custom } from 'viem';
import { xLayerTestnet } from '../config/chains';

export function useWalletGuard() {
  const { address, isConnected, connector } = useAccount();
  const { connectAsync, connectors } = useConnect();
  const currentChainId = useChainId();

  const ensureAuthorizedWallet = async () => {
    let activeConnector = connector;

    // 1. If not connected, connect via preferred or first connector
    if (!isConnected || !activeConnector) {
      const preferred = connectors.find(
        (c) => c.id === 'com.okex.wallet' || c.id === 'io.metamask' || c.type === 'injected'
      ) || connectors[0];

      if (!preferred) {
        throw new Error('No web3 wallet detected. Please install OKX Wallet or MetaMask to continue.');
      }

      await connectAsync({ connector: preferred });
      activeConnector = preferred;
    }

    // 2. Obtain exact EIP-1193 provider from active connector
    let provider: any = null;
    if (activeConnector && typeof activeConnector.getProvider === 'function') {
      try {
        provider = await activeConnector.getProvider();
      } catch (e) {
        console.warn('Failed to get provider from active connector:', e);
      }
    }

    if (!provider && typeof window !== 'undefined') {
      provider = (window as any).okxwallet || (window as any).ethereum;
    }

    if (!provider || typeof provider.request !== 'function') {
      throw new Error('EIP-1193 provider not found. Please unlock your wallet and refresh.');
    }

    // 3. Explicitly request accounts on this exact provider so origin authorization is granted
    let accounts: string[] = [];
    try {
      accounts = (await provider.request({ method: 'eth_requestAccounts' })) as string[];
    } catch (reqErr: any) {
      if (reqErr?.code === 4001) {
        throw new Error('Wallet connection rejected by user.');
      }
      throw reqErr;
    }

    if (!accounts || accounts.length === 0 || !accounts[0]) {
      throw new Error('No authorized account returned by wallet. Please authorize the dApp in your wallet extension.');
    }

    const authorizedAccount = accounts[0] as `0x${string}`;

    // 4. Verify chain ID on this exact provider
    try {
      const currentChainHex = (await provider.request({ method: 'eth_chainId' })) as string;
      const chainIdNum = parseInt(currentChainHex, 16);

      if (chainIdNum !== xLayerTestnet.id) {
        try {
          await provider.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: '0x7a0' }], // 1952 in hex
          });
        } catch (switchErr: any) {
          if (
            switchErr?.code === 4902 ||
            switchErr?.message?.includes('4902') ||
            switchErr?.message?.includes('Unrecognized chain ID')
          ) {
            await provider.request({
              method: 'wallet_addEthereumChain',
              params: [
                {
                  chainId: '0x7a0',
                  chainName: 'X Layer Testnet',
                  nativeCurrency: {
                    name: 'OKB',
                    symbol: 'OKB',
                    decimals: 18,
                  },
                  rpcUrls: ['https://testrpc.xlayer.tech'],
                  blockExplorerUrls: ['https://www.oklink.com/x-layer-testnet'],
                },
              ],
            });
            try {
              await provider.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: '0x7a0' }],
              });
            } catch {}
          } else {
            throw switchErr;
          }
        }
      }
    } catch (chainErr) {
      console.warn('Chain verification on provider warning:', chainErr);
    }

    // 5. Construct dedicated Viem WalletClient bound directly to custom(provider)
    const walletClient = createWalletClient({
      account: authorizedAccount,
      chain: xLayerTestnet,
      transport: custom(provider),
    });

    return {
      walletClient,
      account: authorizedAccount,
      chain: xLayerTestnet,
      provider,
    };
  };

  return {
    ensureAuthorizedWallet,
    requireReadyWallet: ensureAuthorizedWallet, // alias for backwards compatibility
    address,
    isConnected,
    currentChainId,
  };
}
