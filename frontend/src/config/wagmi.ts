import { createConfig, http } from 'wagmi';
import { injected } from 'wagmi/connectors';
import { xLayerTestnet, xLayerMainnet, localhostChain } from './chains';

export const config = createConfig({
  // X Layer Testnet (1952) is the primary default chain for all initial loads and unauthenticated reads
  chains: [xLayerTestnet, xLayerMainnet, localhostChain],
  connectors: [
    injected(),
  ],
  transports: {
    [xLayerTestnet.id]: http('https://testrpc.xlayer.tech'),
    [xLayerMainnet.id]: http('https://rpc.xlayer.tech'),
    [localhostChain.id]: http('http://127.0.0.1:8545'),
  },
});
