import React, { useState, useEffect } from 'react';
import { usePublicClient, useChainId, useSwitchChain } from 'wagmi';
import { Header } from './components/Header';
import { CircleCard, CircleData } from './components/CircleCard';
import { CircleDashboard } from './components/CircleDashboard';
import { CreateCircleModal } from './components/CreateCircleModal';
import { TapeSendDrawer } from './components/TapeSendDrawer';
import { Plus, Shield, Cpu, Sparkles, BookOpen, RefreshCw, AlertTriangle, ArrowRight } from 'lucide-react';
import { AjoFactoryAbi, AjoCircleAbi } from './contracts/abis';
import { getDeployment } from './config/deployments';

export const App: React.FC = () => {
  const publicClient = usePublicClient();
  const chainId = useChainId();
  const { switchChain, isPending: isSwitching } = useSwitchChain();

  const [selectedCircleAddress, setSelectedCircleAddress] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isTapeSendOpen, setIsTapeSendOpen] = useState(false);
  const [targetContainer, setTargetContainer] = useState<string | undefined>(undefined);

  // 100% Zero-Mock: State populated purely from on-chain RPC reads
  const [circles, setCircles] = useState<CircleData[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isWrongNetwork, setIsWrongNetwork] = useState<boolean>(false);
  const [wrongNetworkName, setWrongNetworkName] = useState<string>('');

  // Check URL query param ?circle=0x...
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const circleParam = params.get('circle');
      if (circleParam && circleParam.startsWith('0x')) {
        setSelectedCircleAddress(circleParam);
      }
    }
  }, []);

  // Fetch real on-chain circles from AjoFactory with network-aware verification
  const fetchAllCirclesFromChain = async () => {
    if (!publicClient) return;
    try {
      setIsLoading(true);
      const activeChainId = publicClient.chain?.id || chainId || 1952;
      const activeDeployment = getDeployment(activeChainId);
      const factoryAddr = activeDeployment.factory;

      // Detect chain mismatch before calling contracts
      if (activeChainId !== 1952 && activeChainId !== 31337) {
        setIsWrongNetwork(true);
        setWrongNetworkName(activeChainId === 196 ? 'X Layer Mainnet (196)' : `Chain ID ${activeChainId}`);
        setCircles([]);
        setIsLoading(false);
        return;
      }

      // Check if factory contract bytecode exists to prevent ContractFunctionZeroDataError
      const bytecode = await publicClient.getBytecode({ address: factoryAddr });
      if (!bytecode || bytecode === '0x') {
        console.warn(`No contract bytecode at factory address ${factoryAddr} on chain ${activeChainId}`);
        setIsWrongNetwork(true);
        setWrongNetworkName(`Chain ID ${activeChainId}`);
        setCircles([]);
        setIsLoading(false);
        return;
      }

      setIsWrongNetwork(false);

      // Safe to call getAllCircles on factory
      const allCircleAddrs = (await publicClient.readContract({
        address: factoryAddr,
        abi: AjoFactoryAbi,
        functionName: 'getAllCircles',
      })) as `0x${string}`[];

      // Fallback: If factory list is empty (e.g. freshly deployed before any created), include seedCircle
      const uniqueAddrs = Array.from(
        new Set(
          [activeDeployment.seedCircle, ...(allCircleAddrs || [])].filter(
            (a) => a && a !== '0x0000000000000000000000000000000000000000'
          )
        )
      ) as `0x${string}`[];

      const loadedCircles: CircleData[] = [];

      for (const cAddr of uniqueAddrs) {
        try {
          const cBytecode = await publicClient.getBytecode({ address: cAddr });
          if (!cBytecode || cBytecode === '0x') continue;

          const [
            name,
            hostName,
            cAmount,
            tDuration,
            maxM,
            mCount,
            cTurn,
            cStatus,
            rDeposit,
            cProcessor,
          ] = await Promise.all([
            publicClient.readContract({ address: cAddr, abi: AjoCircleAbi, functionName: 'circleName' }),
            publicClient.readContract({ address: cAddr, abi: AjoCircleAbi, functionName: 'hostName' }),
            publicClient.readContract({ address: cAddr, abi: AjoCircleAbi, functionName: 'contributionAmount' }),
            publicClient.readContract({ address: cAddr, abi: AjoCircleAbi, functionName: 'turnDuration' }),
            publicClient.readContract({ address: cAddr, abi: AjoCircleAbi, functionName: 'maxMembers' }),
            publicClient.readContract({ address: cAddr, abi: AjoCircleAbi, functionName: 'memberCount' }),
            publicClient.readContract({ address: cAddr, abi: AjoCircleAbi, functionName: 'currentTurn' }),
            publicClient.readContract({ address: cAddr, abi: AjoCircleAbi, functionName: 'status' }),
            publicClient.readContract({ address: cAddr, abi: AjoCircleAbi, functionName: 'requireDeposit' }),
            publicClient.readContract({ address: cAddr, abi: AjoCircleAbi, functionName: 'tapeOutProcessor' }),
          ]);

          loadedCircles.push({
            address: cAddr,
            name: name || 'Ajo Exercise Book',
            hostName: hostName || 'Host',
            contributionAmount: Number(cAmount) / 1e6,
            turnDuration: Number(tDuration),
            maxMembers: Number(maxM),
            currentMembers: Number(mCount),
            currentTurn: Number(cTurn || 1),
            status: cStatus === 0 ? 'OPEN' : cStatus === 1 ? 'ACTIVE' : 'COMPLETED',
            requireDeposit: rDeposit,
            tapeOutProcessor: cProcessor ? String(cProcessor) : 'LAGOS_ARM',
          });
        } catch (e) {
          console.warn(`Could not load circle ${cAddr}:`, e);
        }
      }

      setCircles(loadedCircles);
    } catch (err) {
      console.error('Failed to load on-chain circles:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAllCirclesFromChain();
    const interval = setInterval(fetchAllCirclesFromChain, 12000);
    return () => clearInterval(interval);
  }, [publicClient, chainId]);

  const handleCircleCreated = (newCircleAddress: string) => {
    fetchAllCirclesFromChain();
    setSelectedCircleAddress(newCircleAddress);
  };

  const openTapeSendWithContainer = (container?: string) => {
    const activeDeployment = getDeployment(chainId);
    setTargetContainer(container || activeDeployment.tapeOutContainer);
    setIsTapeSendOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#0B0E14] text-slate-100 flex flex-col font-sans">
      {/* Header */}
      <Header onOpenTapeOutDrawer={() => setIsTapeSendOpen(true)} />

      {/* Network Switch Banner if on non-1952 network */}
      {isWrongNetwork && (
        <div className="bg-amber-500/10 border-b border-amber-500/30 px-4 py-3.5">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5 text-amber-300">
              <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0" />
              <div>
                <span className="font-bold">Chain Mismatch Detected:</span> Your client/wallet is currently on{' '}
                <span className="underline font-semibold">{wrongNetworkName || 'another network'}</span>. AjoChain contracts are actively deployed on{' '}
                <span className="font-bold text-white">X Layer Testnet (Chain ID: 1952)</span>.
              </div>
            </div>
            <button
              onClick={() => switchChain && switchChain({ chainId: 1952 })}
              disabled={isSwitching}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold font-sans transition shadow-lg flex-shrink-0 disabled:opacity-50 cursor-pointer"
            >
              <span>{isSwitching ? 'Switching...' : 'Switch Wallet to X Layer Testnet (1952)'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 lg:px-8 py-8">
        {selectedCircleAddress ? (
          <CircleDashboard
            circleAddress={selectedCircleAddress}
            onBack={() => {
              setSelectedCircleAddress(null);
              // Clean query param
              if (typeof window !== 'undefined' && window.history.pushState) {
                const url = window.location.protocol + '//' + window.location.host + window.location.pathname;
                window.history.pushState({ path: url }, '', url);
              }
            }}
            onOpenTapeSend={openTapeSendWithContainer}
          />
        ) : (
          <div className="space-y-8">
            
            {/* Hero / Value Proposition Banner */}
            <div className="relative rounded-3xl p-8 lg:p-10 bg-gradient-to-r from-blue-950/40 via-indigo-950/30 to-slate-900 border border-slate-800 shadow-2xl overflow-hidden">
              <div className="relative z-10 max-w-2xl space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Powered by X Layer & TapeOut Protocol (tapeout.net)</span>
                </div>
                <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
                  One Exercise Book. Zero Collector Pockets.
                </h1>
                <p className="text-sm text-slate-300 leading-relaxed">
                  Decentralized Nigerian rotational savings (Ajo / Esusu) on X Layer. Sign your name in the on-chain book, contribute in 1-click, and let deterministic boolean logic disburse the pot with 0% human custody.
                </p>

                <div className="pt-2 flex flex-wrap items-center gap-4">
                  <button
                    onClick={() => setIsCreateOpen(true)}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-600/30 transition active:scale-95"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Host New Exercise Book</span>
                  </button>

                  <div className="flex items-center gap-4 text-xs text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <Shield className="w-4 h-4 text-emerald-400" />
                      1x Deposit Protected
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Cpu className="w-4 h-4 text-blue-400" />
                      DeWEB On-Chain Hosted
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Circles Section Header */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-blue-400" />
                    <span>Active Ajo Exercise Books on X Layer</span>
                  </h2>
                  <p className="text-xs text-slate-400">Live rotational savings circles running directly on-chain</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={fetchAllCirclesFromChain}
                    disabled={isLoading}
                    className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition"
                    title="Refresh Live Data"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-blue-400' : ''}`} />
                  </button>
                  <button
                    onClick={() => setIsCreateOpen(true)}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Host Ajo</span>
                  </button>
                </div>
              </div>

              {isLoading && circles.length === 0 ? (
                <div className="p-12 text-center text-xs text-slate-500 font-mono">
                  Loading live exercise books from X Layer...
                </div>
              ) : circles.length === 0 ? (
                <div className="p-12 rounded-2xl bg-[#121824] border border-slate-800 text-center space-y-3">
                  <BookOpen className="w-10 h-10 text-slate-600 mx-auto" />
                  <h3 className="text-sm font-bold text-white">No exercise books hosted yet</h3>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    Be the first host to create an Ajo exercise book on X Layer. Sign names, invite friends, and save together safely.
                  </p>
                  <button
                    onClick={() => setIsCreateOpen(true)}
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition shadow-lg"
                  >
                    Host First Exercise Book
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {circles.map((circle) => (
                    <CircleCard
                      key={circle.address}
                      circle={circle}
                      onSelect={(addr) => setSelectedCircleAddress(addr)}
                    />
                  ))}
                </div>
              )}
            </div>

          </div>
        )}
      </main>

      {/* Footer with DeWEB On-Chain Proof */}
      <footer className="border-t border-slate-800 py-6 px-4 lg:px-8 mt-auto text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-400">AjoChain</span>
            <span>•</span>
            <span>Digital Exercise Book on X Layer</span>
            <span>•</span>
            <span className="text-blue-400 font-mono">100% Zero-Mock RPC Live Reads</span>
          </div>
          <div className="flex items-center gap-4 text-slate-400">
            <span>zkEVM Rollup</span>
            <span>•</span>
            <span>Gas: OKB</span>
            <span>•</span>
            <span>Settlement: USDT</span>
          </div>
        </div>
      </footer>

      {/* Modals & Drawers */}
      <CreateCircleModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreated={handleCircleCreated}
      />

      <TapeSendDrawer
        isOpen={isTapeSendOpen}
        onClose={() => setIsTapeSendOpen(false)}
        targetContainer={targetContainer}
      />
    </div>
  );
};
