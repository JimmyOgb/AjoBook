import React, { useState } from 'react';
import { useAccount, useConnect, useDisconnect, useChainId, useSwitchChain, useWriteContract } from 'wagmi';
import { ShieldCheck, Coins, Wallet, LogOut, CheckCircle2, ChevronDown, Cpu, X } from 'lucide-react';
import { xLayerMainnet, xLayerTestnet } from '../config/chains';
import { Erc20Abi } from '../contracts/abis';
import { getDeployment } from '../config/deployments';
import { useWalletGuard } from '../hooks/useWalletGuard';

interface HeaderProps {
  onOpenTapeOutDrawer: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenTapeOutDrawer }) => {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const chainId = useChainId();
  const { switchChain, switchChainAsync } = useSwitchChain();
  const [isMinting, setIsMinting] = useState(false);
  const [mintSuccess, setMintSuccess] = useState(false);
  const [showWalletModal, setShowWalletModal] = useState(false);

  const { writeContractAsync } = useWriteContract();
  const activeDeployments = getDeployment(chainId);
  const { requireReadyWallet } = useWalletGuard();

  const handleMintTestUsdt = async () => {
    try {
      setIsMinting(true);
      setMintSuccess(false);
      const { account, chain } = await requireReadyWallet();

      // Mint 1,000 USDT (6 decimals = 1,000,000,000 units)
      await writeContractAsync({
        account,
        chain,
        address: activeDeployments.testUsdt as `0x${string}`,
        abi: Erc20Abi,
        functionName: 'mint',
        args: [account, BigInt(1_000 * 1e6)],
      });
      setMintSuccess(true);
      setTimeout(() => setMintSuccess(false), 4000);
    } catch (err) {
      console.error('Faucet mint failed:', err);
    } finally {
      setIsMinting(false);
    }
  };

  const handleSwitchNetwork = async (targetChainId: number) => {
    try {
      if (switchChainAsync) {
        await switchChainAsync({ chainId: targetChainId });
      } else {
        switchChain({ chainId: targetChainId });
      }
    } catch (err: any) {
      if (targetChainId === 1952 && typeof window !== 'undefined') {
        const provider = (window as any).okxwallet || (window as any).ethereum;
        if (provider?.request) {
          try {
            await provider.request({
              method: 'wallet_addEthereumChain',
              params: [
                {
                  chainId: '0x7a0',
                  chainName: 'X Layer Testnet',
                  nativeCurrency: { name: 'OKB', symbol: 'OKB', decimals: 18 },
                  rpcUrls: ['https://testrpc.xlayer.tech'],
                  blockExplorerUrls: ['https://www.oklink.com/x-layer-testnet'],
                },
              ],
            });
            if (switchChainAsync) {
              await switchChainAsync({ chainId: 1952 });
            }
          } catch {}
        }
      }
    }
  };

  const isTestnetOrLocal = chainId === xLayerTestnet.id || chainId === 31337;

  return (
    <header className="sticky top-0 z-40 border-b border-slate-800 bg-[#0B0E14]/90 backdrop-blur-md px-4 lg:px-8 py-3.5">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        
        {/* Brand & Zero-Human-Custody Badge */}
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center font-black text-white text-lg tracking-wider shadow-lg shadow-blue-500/20">
              A
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg text-white tracking-tight">AjoChain</span>
                <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  X Layer
                </span>
              </div>
              <p className="text-xs text-slate-400">Non-Custodial Nigerian ROSCA</p>
            </div>
          </div>

          {/* Zero Human Custody Proof Badge */}
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>0% Human Custody • Verified on X Layer</span>
          </div>
        </div>

        {/* Action Controls & Wallet */}
        <div className="flex items-center gap-2.5 flex-wrap">
          
          {/* TapeOut Protocol Drawer Toggle */}
          <button
            onClick={onOpenTapeOutDrawer}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-300 hover:text-white hover:border-slate-500 text-xs font-medium transition cursor-pointer"
            title="Inspect TapeOut Circuit Container & TAP-10 Messaging"
          >
            <Cpu className="w-3.5 h-3.5 text-blue-400" />
            <span className="hidden sm:inline">TapeOut</span> Container
          </button>

          {/* Faucet Button (Testnet only) */}
          {isTestnetOrLocal && (
            <button
              onClick={handleMintTestUsdt}
              disabled={isMinting}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 text-xs font-medium transition disabled:opacity-50 cursor-pointer"
            >
              {mintSuccess ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>+1,000 USDT Minted!</span>
                </>
              ) : (
                <>
                  <Coins className="w-3.5 h-3.5" />
                  <span>{isMinting ? 'Minting...' : 'Faucet +1k USDT'}</span>
                </>
              )}
            </button>
          )}

          {/* Network Switcher */}
          <div className="relative group">
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-medium transition cursor-pointer">
              <span className={`w-2 h-2 rounded-full ${chainId === xLayerMainnet.id ? 'bg-blue-400' : 'bg-amber-400'}`} />
              <span>{chainId === xLayerMainnet.id ? 'X Layer Mainnet' : chainId === xLayerTestnet.id ? 'X Layer Testnet' : 'Local Anvil (31337)'}</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>
            <div className="absolute right-0 mt-1 w-44 rounded-xl bg-slate-900 border border-slate-800 p-1 shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
              <button
                onClick={() => handleSwitchNetwork(xLayerMainnet.id)}
                className="w-full text-left px-3 py-2 text-xs text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg flex items-center justify-between cursor-pointer"
              >
                <span>X Layer Mainnet</span>
                <span className="text-[10px] text-slate-500 font-mono">196</span>
              </button>
              <button
                onClick={() => handleSwitchNetwork(xLayerTestnet.id)}
                className="w-full text-left px-3 py-2 text-xs text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg flex items-center justify-between cursor-pointer"
              >
                <span>X Layer Testnet</span>
                <span className="text-[10px] text-slate-500 font-mono">1952</span>
              </button>
            </div>
          </div>

          {/* Wallet Connect & EIP-6963 Selector */}
          {isConnected && address ? (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-600/10 border border-blue-500/30 text-blue-300 text-xs font-mono">
              <span>{address.substring(0, 6)}...{address.substring(address.length - 4)}</span>
              <button
                onClick={() => disconnect()}
                className="text-slate-400 hover:text-rose-400 transition cursor-pointer"
                title="Disconnect Wallet"
              >
                <LogOut className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <div className="relative">
              <button
                onClick={() => setShowWalletModal(!showWalletModal)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-600/25 transition active:scale-95 cursor-pointer"
              >
                <Wallet className="w-3.5 h-3.5" />
                <span>Connect Wallet</span>
                <ChevronDown className="w-3 h-3 ml-0.5 opacity-70" />
              </button>

              {/* EIP-6963 Detected Wallets Dropdown */}
              {showWalletModal && (
                <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-[#121824] border border-slate-800 p-2 shadow-2xl z-50 space-y-1 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between px-2 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800/80 mb-1">
                    <span>Select Wallet</span>
                    <button
                      onClick={() => setShowWalletModal(false)}
                      className="text-slate-500 hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  {connectors && connectors.length > 0 ? (
                    connectors.map((connector) => (
                      <button
                        key={connector.uid || connector.id}
                        onClick={() => {
                          connect({ connector });
                          setShowWalletModal(false);
                        }}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs text-white hover:bg-slate-800/80 transition cursor-pointer group"
                      >
                        <div className="flex items-center gap-2.5">
                          {connector.icon ? (
                            <img src={connector.icon} alt={connector.name} className="w-4 h-4 rounded" />
                          ) : (
                            <Wallet className="w-4 h-4 text-blue-400" />
                          )}
                          <span className="font-semibold text-slate-200 group-hover:text-white">{connector.name}</span>
                        </div>
                        <span className="text-[10px] text-slate-500 font-mono">EIP-6963</span>
                      </button>
                    ))
                  ) : (
                    <div className="p-3 text-center text-xs text-slate-400">
                      No web3 extension detected. Please install OKX Wallet or MetaMask.
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </header>
  );
};
