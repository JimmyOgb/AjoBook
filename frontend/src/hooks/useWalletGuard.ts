import { useAccount, useConnect, useSwitchChain, useChainId } from 'wagmi';
import { xLayerTestnet } from '../config/chains';

export function useWalletGuard() {
  const { address, isConnected, connector } = useAccount();
  const { connectAsync, connectors } = useConnect();
  const { switchChainAsync } = useSwitchChain();
  const currentChainId = useChainId();

  const requireReadyWallet = async (): Promise<{
    account: `0x${string}`;
    chain: typeof xLayerTestnet;
  }> => {
    let activeAddress = address;
    let activeConnector = connector;

    // 1. Verify isConnected && address (if not, connect first and wait for user's account)
    if (!isConnected || !activeAddress) {
      const targetConnector = activeConnector || connectors[0];
      if (!targetConnector) {
        throw new Error('No wallet connector available. Please install an EIP-6963 compatible wallet such as OKX Wallet or MetaMask.');
      }
      const connectResult = await connectAsync({ connector: targetConnector });
      activeAddress = connectResult.accounts[0];
      activeConnector = targetConnector;
    }

    if (!activeAddress) {
      throw new Error('Wallet connection failed: No authorized account returned by wallet.');
    }

    // 2. Verify chainId === 1952 (X Layer Testnet)
    if (currentChainId !== xLayerTestnet.id) {
      try {
        await switchChainAsync({ chainId: xLayerTestnet.id });
      } catch (switchErr: any) {
        console.warn('switchChainAsync failed, attempting wallet_addEthereumChain:', switchErr);
        let provider: any = null;
        if (activeConnector && typeof activeConnector.getProvider === 'function') {
          try {
            provider = await activeConnector.getProvider();
          } catch {}
        }
        if (!provider && typeof window !== 'undefined') {
          provider = (window as any).okxwallet || (window as any).ethereum;
        }

        if (provider && typeof provider.request === 'function') {
          try {
            await provider.request({
              method: 'wallet_addEthereumChain',
              params: [
                {
                  chainId: '0x7a0', // 1952 in hex
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
            // Await switch after adding
            try {
              await switchChainAsync({ chainId: xLayerTestnet.id });
            } catch {}
          } catch (addErr: any) {
            console.error('wallet_addEthereumChain failed:', addErr);
            throw new Error(addErr?.message || 'Failed to add X Layer Testnet to wallet.');
          }
        } else {
          throw switchErr;
        }
      }
    }

    return {
      account: activeAddress as `0x${string}`,
      chain: xLayerTestnet,
    };
  };

  return {
    requireReadyWallet,
    address,
    isConnected,
  };
}
