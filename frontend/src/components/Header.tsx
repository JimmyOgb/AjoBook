import React, { useState } from 'react';
import { useAccount, useConnect, useDisconnect, useChainId, useSwitchChain, useWriteContract } from 'wagmi';
import { ShieldCheck, Coins, Wallet, LogOut, CheckCircle2, ChevronDown, Cpu } from 'lucide-react';
import { xLayerMainnet, xLayerTestnet } from '../config/chains';
import { Erc20Abi } from '../contracts/abis';
import deployments from '../config/deployments.json';

interface HeaderProps {
  onOpenTapeOutDrawer: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenTapeOutDrawer }) => {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const [isMinting, setIsMinting] = useState(false);
  const [mintSuccess, setMintSuccess] = useState(false);

  const { writeContractAsync } = useWriteContract();

  const handleMintTestUsdt = async () => {
    if (!address) return;
    try {
      setIsMinting(true);
      setMintSuccess(false);
      // Mint 1,000 USDT (6 decimals = 1,000,000,000 units)
      await writeContractAsync({
        address: deployments.usdt as `0x${string}`,
        abi: Erc20Abi,
        functionName: 'mint',
        args: [address, BigInt(1_000 * 1e6)],
      });
      setMintSuccess(true);
      setTimeout(() => setMintSuccess(false), 4000);
    } catch (err) {
      console.error('Faucet mint failed:', err);
    } finally {
      setIsMinting(false);
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
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-300 hover:text-white hover:border-slate-500 text-xs font-medium transition"
            title="Inspect TapeOut Circuit Container & TAP-10 Messaging"
          >
            <Cpu className="w-3.5 h-3.5 text-blue-400" />
            <span className="hidden sm:inline">TapeOut</span> Container
          </button>

          {/* Faucet Button (Testnet only) */}
          {isTestnetOrLocal && (
            <button
              onClick={handleMintTestUsdt}
              disabled={!isConnected || isMinting}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 text-xs font-medium transition disabled:opacity-50"
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
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-medium transition">
              <span className={`w-2 h-2 rounded-full ${chainId === xLayerMainnet.id ? 'bg-blue-400' : 'bg-amber-400'}`} />
              <span>{chainId === xLayerMainnet.id ? 'X Layer Mainnet' : chainId === xLayerTestnet.id ? 'X Layer Testnet' : 'Local Anvil (31337)'}</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>
            <div className="absolute right-0 mt-1 w-44 rounded-xl bg-slate-900 border border-slate-800 p-1 shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
              <button
                onClick={() => switchChain({ chainId: xLayerMainnet.id })}
                className="w-full text-left px-3 py-2 text-xs text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg flex items-center justify-between"
              >
                <span>X Layer Mainnet</span>
                <span className="text-[10px] text-slate-500 font-mono">196</span>
              </button>
              <button
                onClick={() => switchChain({ chainId: xLayerTestnet.id })}
                className="w-full text-left px-3 py-2 text-xs text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg flex items-center justify-between"
              >
                <span>X Layer Testnet</span>
                <span className="text-[10px] text-slate-500 font-mono">1952</span>
              </button>
            </div>
          </div>

          {/* Wallet Connect */}
          {isConnected && address ? (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-600/10 border border-blue-500/30 text-blue-300 text-xs font-mono">
              <span>{address.substring(0, 6)}...{address.substring(address.length - 4)}</span>
              <button
                onClick={() => disconnect()}
                className="text-slate-400 hover:text-rose-400 transition"
                title="Disconnect"
              >
                <LogOut className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => connect({ connector: connectors[0] })}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-600/25 transition active:scale-95"
            >
              <Wallet className="w-3.5 h-3.5" />
              <span>Connect OKX Wallet</span>
            </button>
          )}

        </div>
      </div>
    </header>
  );
};
