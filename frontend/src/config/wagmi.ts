import { createConfig, http } from 'wagmi';
import { injected } from 'wagmi/connectors';
import { xLayerMainnet, xLayerTestnet, localhostChain } from './chains';

export const config = createConfig({
  chains: [xLayerMainnet, xLayerTestnet, localhostChain],
  connectors: [
    injected({
      target() {
        return {
          id: 'okxWallet',
          name: 'OKX Wallet',
          provider: (typeof window !== 'undefined' ? (window as any).okxwallet : undefined) || 
                    (typeof window !== 'undefined' ? (window as any).ethereum : undefined),
        };
      },
    }),
  ],
  transports: {
    [xLayerMainnet.id]: http('https://rpc.xlayer.tech'),
    [xLayerTestnet.id]: http('https://testrpc.xlayer.tech'),
    [localhostChain.id]: http('http://127.0.0.1:8545'),
  },
});
