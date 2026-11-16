import { useAccount, useConnect, useChainId, usePublicClient } from 'wagmi';
import { createWalletClient, custom, encodeFunctionData } from 'viem';
import { xLayerTestnet } from '../config/chains';

export interface SendContractTxParams {
  address: `0x${string}`;
  abi: any;
  functionName: string;
  args?: any[];
  value?: bigint;
}

export function useWalletGuard() {
  const { address, isConnected, connector } = useAccount();
  const { connectAsync, connectors } = useConnect();
  const publicClient = usePublicClient();
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

    // 2. Obtain exact EIP-1193 provider from active connector (never let secondary extensions hijack)
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

    // 5. Construct dedicated Viem WalletClient for standard client operations if needed
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

  /**
   * Pure direct contract transaction executor:
   * 1. Encodes calldata locally via encodeFunctionData (zero wallet capability queries)
   * 2. Estimates gas via public X Layer RPC (never querying the browser extension)
   * 3. Sends ONLY standard eth_sendTransaction directly to provider.request
   * 4. Awaits confirmation via publicClient.waitForTransactionReceipt
   */
  const sendContractTx = async ({
    address: to,
    abi,
    functionName,
    args = [],
    value,
  }: SendContractTxParams): Promise<{ txHash: `0x${string}`; receipt?: any }> => {
    const { provider, account: sender } = await ensureAuthorizedWallet();

    // 1. Encode function call data locally
    const data = encodeFunctionData({
      abi,
      functionName,
      args,
    });

    // 2. Estimate gas against public X Layer Testnet RPC (fallback to 600,000 on estimate failure)
    let estimatedGas = 350000n;
    if (publicClient) {
      try {
        const est = await publicClient.estimateGas({
          account: sender,
          to,
          data,
          ...(value ? { value } : {}),
        });
        estimatedGas = (est * 125n) / 100n; // 25% safety buffer
      } catch (estErr) {
        console.warn('publicClient.estimateGas failed, using safe fallback:', estErr);
        estimatedGas = 650000n;
      }
    }

    // 3. Send pure eth_sendTransaction RPC directly to provider.request
    const txHash = (await provider.request({
      method: 'eth_sendTransaction',
      params: [
        {
          from: sender,
          to,
          data,
          gas: `0x${estimatedGas.toString(16)}`,
          ...(value ? { value: `0x${value.toString(16)}` } : {}),
        },
      ],
    })) as `0x${string}`;

    // 4. Await transaction receipt via public client
    let receipt: any = null;
    if (publicClient) {
      try {
        receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
      } catch (receiptErr) {
        console.warn('waitForTransactionReceipt warning:', receiptErr);
      }
    }

    return { txHash, receipt };
  };

  return {
    ensureAuthorizedWallet,
    requireReadyWallet: ensureAuthorizedWallet, // alias for backwards compatibility
    sendContractTx,
    address,
    isConnected,
    currentChainId,
  };
}
