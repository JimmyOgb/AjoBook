import { usePublicClient, useAccount } from 'wagmi';
import { encodeFunctionData } from 'viem';
import { xLayerTestnet } from '../config/chains';
import { useWallet } from '../context/WalletContext';

export interface SendContractTxParams {
  address: `0x${string}`;
  abi: any;
  functionName: string;
  args?: any[];
  value?: bigint;
}

export function useWalletGuard() {
  const { address: wagmiAddress, isConnected: wagmiConnected } = useAccount();
  const publicClient = usePublicClient();
  const {
    providers,
    selectedRdns,
    activeProvider,
    activeAccount,
    activeChainId,
    isConnected,
    selectWallet,
    disconnectWallet,
    resetWalletSession,
    getActiveProvider,
  } = useWallet();

  const ensureAuthorizedWallet = async (): Promise<{
    provider: any;
    account: `0x${string}`;
    chain: typeof xLayerTestnet;
  }> => {
    const { provider } = await getActiveProvider();

    // 1. Explicitly call eth_requestAccounts directly on the shared provider
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

    // 2. Check eth_chainId and switch/add if needed
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

    // 3. Re-read eth_accounts after chain switch
    let authorizedAccount = accounts[0];
    try {
      const reRead = (await provider.request({ method: 'eth_accounts' })) as string[];
      if (reRead && reRead.length > 0 && reRead[0]) {
        authorizedAccount = reRead[0];
      }
    } catch {}

    return {
      provider,
      account: authorizedAccount as `0x${string}`,
      chain: xLayerTestnet,
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

    // 2. Estimate gas against public X Layer Testnet RPC (fallback to 650,000 on estimate failure)
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

  const effectiveAddress = activeAccount || wagmiAddress;
  const effectiveConnected = isConnected || wagmiConnected;

  return {
    ensureAuthorizedWallet,
    requireReadyWallet: ensureAuthorizedWallet, // alias for backwards compatibility
    sendContractTx,
    address: effectiveAddress,
    isConnected: effectiveConnected,
    currentChainId: activeChainId || 1952,
    providers,
    selectedRdns,
    activeProvider,
    selectWallet,
    disconnectWallet,
    resetWalletSession,
  };
}
