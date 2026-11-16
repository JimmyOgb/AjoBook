import React, { useState, useEffect } from 'react';
import { useAccount, useWriteContract, usePublicClient, useChainId, useSwitchChain } from 'wagmi';
import {
  Clock,
  Coins,
  ArrowLeft,
  CheckCircle2,
  Cpu,
  Share2,
  AlertCircle,
  Play,
  UserPlus,
  Coins as MoneyIcon,
  ExternalLink,
  BookOpen,
  X
} from 'lucide-react';
import { AjoCircleAbi, Erc20Abi } from '../contracts/abis';
import { QRCodeSvg } from './QRCodeSvg';
import { getDeployment } from '../config/deployments';
import { useWalletGuard } from '../hooks/useWalletGuard';

interface MemberData {
  address: string;
  slot: number;
  name: string;
  deposit: number; // in USDT
  paidCurrentTurn: boolean;
  missedCurrentTurn: boolean;
}

interface LedgerEvent {
  title: string;
  desc: string;
  timestamp: string;
  txHash?: string;
}

interface CircleDashboardProps {
  circleAddress: string;
  onBack: () => void;
  onOpenTapeSend: (targetContainer?: string) => void;
}

export const CircleDashboard: React.FC<CircleDashboardProps> = ({
  circleAddress,
  onBack,
  onOpenTapeSend,
}) => {
  const { address } = useAccount();
  const chainId = useChainId();
  const { switchChain, isPending: isSwitching } = useSwitchChain();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const activeDeployments = getDeployment(chainId);
  const { requireReadyWallet } = useWalletGuard();

  // On-chain state
  const [circleName, setCircleName] = useState<string>('Ajo Exercise Book');
  const [hostAddr, setHostAddr] = useState<string>('');
  const [hostName, setHostName] = useState<string>('');
  const [contributionAmount, setContributionAmount] = useState<number>(100);
  const [turnDuration, setTurnDuration] = useState<number>(300);
  const [requireDeposit, setRequireDeposit] = useState<boolean>(true);
  const [status, setStatus] = useState<'OPEN' | 'ACTIVE' | 'COMPLETED'>('OPEN');
  const [currentTurn, setCurrentTurn] = useState<number>(1);
  const [turnDeadline, setTurnDeadline] = useState<number>(0);
  const [totalSlots, setTotalSlots] = useState<number>(0);
  const [lateJoinOpen, setLateJoinOpen] = useState<boolean>(true);
  const [tapeOutCircuitId, setTapeOutCircuitId] = useState<string>('');
  const [tapeOutProcessor, setTapeOutProcessor] = useState<string>('');

  const [members, setMembers] = useState<MemberData[]>([]);
  const [userClaimable, setUserClaimable] = useState<number>(0);
  const [escrowedPot, setEscrowedPot] = useState<number>(0);
  const [myMemberData, setMyMemberData] = useState<MemberData | null>(null);

  // UI state
  const [joinName, setJoinName] = useState<string>('');
  const [lateJoinName, setLateJoinName] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);
  const [showInviteModal, setShowInviteModal] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [secondsLeft, setSecondsLeft] = useState<number>(0);
  const [ledgerLogs, setLedgerLogs] = useState<LedgerEvent[]>([]);

  const explorerBase = chainId === 1952 || chainId === 31337
    ? 'https://www.oklink.com/x-layer-testnet'
    : 'https://www.oklink.com/xlayer';

  // Read Circle Contract State directly from RPC
  const fetchCircleData = async () => {
    if (!publicClient || !circleAddress) return;
    try {
      const cAddr = circleAddress as `0x${string}`;

      // Verify contract exists on active network before executing reads
      const activeChainId = publicClient.chain?.id || chainId || 1952;
      if (activeChainId !== 1952 && activeChainId !== 31337) {
        setErrorNotice(`Active wallet is on Chain ${activeChainId}. Please switch to X Layer Testnet (1952) to read circle state.`);
        return;
      }

      const bytecode = await publicClient.getBytecode({ address: cAddr });
      if (!bytecode || bytecode === '0x') {
        console.warn(`No contract bytecode at circle address ${cAddr} on chain ${activeChainId}`);
        setErrorNotice(`Circle contract not found on this network. Please switch to X Layer Testnet (Chain ID 1952).`);
        return;
      }

      const [
        cName,
        hAddr,
        hName,
        cAmount,
        tDuration,
        rDeposit,
        cStatus,
        cTurn,
        tDeadline,
        tSlots,
        lJoinOpen,
        cId,
        cProc,
        allMemberAddrs,
      ] = await Promise.all([
        publicClient.readContract({ address: cAddr, abi: AjoCircleAbi, functionName: 'circleName' }),
        publicClient.readContract({ address: cAddr, abi: AjoCircleAbi, functionName: 'host' }),
        publicClient.readContract({ address: cAddr, abi: AjoCircleAbi, functionName: 'hostName' }),
        publicClient.readContract({ address: cAddr, abi: AjoCircleAbi, functionName: 'contributionAmount' }),
        publicClient.readContract({ address: cAddr, abi: AjoCircleAbi, functionName: 'turnDuration' }),
        publicClient.readContract({ address: cAddr, abi: AjoCircleAbi, functionName: 'requireDeposit' }),
        publicClient.readContract({ address: cAddr, abi: AjoCircleAbi, functionName: 'status' }),
        publicClient.readContract({ address: cAddr, abi: AjoCircleAbi, functionName: 'currentTurn' }),
        publicClient.readContract({ address: cAddr, abi: AjoCircleAbi, functionName: 'turnDeadline' }),
        publicClient.readContract({ address: cAddr, abi: AjoCircleAbi, functionName: 'totalSlots' }),
        publicClient.readContract({ address: cAddr, abi: AjoCircleAbi, functionName: 'lateJoinOpen' }),
        publicClient.readContract({ address: cAddr, abi: AjoCircleAbi, functionName: 'tapeOutCircuitId' }),
        publicClient.readContract({ address: cAddr, abi: AjoCircleAbi, functionName: 'tapeOutProcessor' }),
        publicClient.readContract({ address: cAddr, abi: AjoCircleAbi, functionName: 'getAllMembers' }),
      ]);

      setCircleName(cName || 'Ajo Exercise Book');
      setHostAddr(hAddr);
      setHostName(hName);
      setContributionAmount(Number(cAmount) / 1e6);
      setTurnDuration(Number(tDuration));
      setRequireDeposit(rDeposit);
      setStatus(cStatus === 0 ? 'OPEN' : cStatus === 1 ? 'ACTIVE' : 'COMPLETED');
      const activeTurn = Number(cTurn);
      setCurrentTurn(activeTurn);
      setTurnDeadline(Number(tDeadline));
      setTotalSlots(Number(tSlots));
      setLateJoinOpen(lJoinOpen);
      setTapeOutCircuitId(cId);
      setTapeOutProcessor(cProc);

      // Read live escrowed pot for current turn
      try {
        const escrowBal = (await publicClient.readContract({
          address: cAddr,
          abi: AjoCircleAbi,
          functionName: 'turnCollected',
          args: [cTurn],
        })) as bigint;
        setEscrowedPot(Number(escrowBal) / 1e6);
      } catch {
        setEscrowedPot(0);
      }

      // Fetch member records
      const memberList: MemberData[] = [];
      for (const mAddr of allMemberAddrs) {
        const [mDetails, mTurnStatus] = await Promise.all([
          publicClient.readContract({
            address: cAddr,
            abi: AjoCircleAbi,
            functionName: 'getMemberDetails',
            args: [mAddr],
          }),
          publicClient.readContract({
            address: cAddr,
            abi: AjoCircleAbi,
            functionName: 'getTurnMemberStatus',
            args: [BigInt(activeTurn || 1), mAddr],
          }),
        ]);

        const mItem: MemberData = {
          address: mAddr,
          slot: Number(mDetails[0]),
          name: mDetails[1],
          deposit: Number(mDetails[2]) / 1e6,
          paidCurrentTurn: mTurnStatus[0],
          missedCurrentTurn: mTurnStatus[1],
        };
        memberList.push(mItem);

        if (address && mAddr.toLowerCase() === address.toLowerCase()) {
          setMyMemberData(mItem);
        }
      }
      setMembers(memberList);

      // Check connected user claimable balance
      if (address) {
        const claimable = await publicClient.readContract({
          address: cAddr,
          abi: AjoCircleAbi,
          functionName: 'claimableBalance',
          args: [address],
        });
        setUserClaimable(Number(claimable) / 1e6);
      }

      // Read real contract event logs
      try {
        const logs = await publicClient.getLogs({
          address: cAddr,
          fromBlock: 0n,
          toBlock: 'latest',
        });
        const parsedEvents: LedgerEvent[] = logs.slice(-15).reverse().map((l) => ({
          title: `On-Chain Ledger Entry`,
          desc: `Block #${l.blockNumber?.toString() || 'Confirmed'}`,
          timestamp: new Date().toLocaleTimeString(),
          txHash: l.transactionHash || undefined,
        }));
        setLedgerLogs(parsedEvents);
      } catch {
        // Fallback gracefully
      }
    } catch (err) {
      console.error('Failed to load on-chain circle data:', err);
    }
  };

  useEffect(() => {
    fetchCircleData();
    const interval = setInterval(fetchCircleData, 6000);
    return () => clearInterval(interval);
  }, [circleAddress, address, publicClient]);

  // Turn countdown timer
  useEffect(() => {
    const tick = () => {
      const now = Math.floor(Date.now() / 1000);
      const remaining = turnDeadline > now ? turnDeadline - now : 0;
      setSecondsLeft(remaining);
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [turnDeadline]);

  const formatCountdown = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}m ${s.toString().padStart(2, '0')}s`;
  };

  // Actions
  const handleJoinCircle = async () => {
    if (!joinName.trim()) {
      setErrorNotice('Please enter your name to sign the exercise book');
      return;
    }
    try {
      setIsSubmitting(true);
      setErrorNotice(null);
      const { account, chain } = await requireReadyWallet();

      // Approve deposit if required
      if (requireDeposit) {
        await writeContractAsync({
          address: activeDeployments.usdt as `0x${string}`,
          abi: Erc20Abi,
          functionName: 'approve',
          args: [circleAddress as `0x${string}`, BigInt(contributionAmount * 1e6)],
          account,
          chain,
        });
      }

      await writeContractAsync({
        address: circleAddress as `0x${string}`,
        abi: AjoCircleAbi,
        functionName: 'joinCircle',
        args: [joinName.trim()],
        account,
        chain,
      });

      setActionNotice(`Welcome, ${joinName}! Added to the exercise book.`);
      setJoinName('');
      await fetchCircleData();
    } catch (err: any) {
      setErrorNotice(err?.shortMessage || err?.message || 'Join failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartCircle = async () => {
    try {
      setIsSubmitting(true);
      setErrorNotice(null);
      const { account, chain } = await requireReadyWallet();

      await writeContractAsync({
        address: circleAddress as `0x${string}`,
        abi: AjoCircleAbi,
        functionName: 'startCircle',
        account,
        chain,
      });
      setActionNotice('Exercise book started! Turn #1 is live.');
      await fetchCircleData();
    } catch (err: any) {
      setErrorNotice(err?.shortMessage || err?.message || 'Failed to start circle');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleContribute = async () => {
    try {
      setIsSubmitting(true);
      setErrorNotice(null);
      const { account, chain } = await requireReadyWallet();

      // Approve contribution
      await writeContractAsync({
        address: activeDeployments.usdt as `0x${string}`,
        abi: Erc20Abi,
        functionName: 'approve',
        args: [circleAddress as `0x${string}`, BigInt(contributionAmount * 1e6)],
        account,
        chain,
      });

      await writeContractAsync({
        address: circleAddress as `0x${string}`,
        abi: AjoCircleAbi,
        functionName: 'contribute',
        account,
        chain,
      });

      setActionNotice(`Turn #${currentTurn} contribution of ${contributionAmount} USDT paid!`);
      await fetchCircleData();
    } catch (err: any) {
      setErrorNotice(err?.shortMessage || err?.message || 'Contribution failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReleasePayout = async () => {
    try {
      setIsSubmitting(true);
      setErrorNotice(null);
      const { account, chain } = await requireReadyWallet();

      await writeContractAsync({
        address: circleAddress as `0x${string}`,
        abi: AjoCircleAbi,
        functionName: 'releaseTurnPayout',
        account,
        chain,
      });
      setActionNotice(`Turn #${currentTurn} scheduled pot disbursed to collector! Next turn timer started.`);
      await fetchCircleData();
    } catch (err: any) {
      // Fallback to closeTurn if contract was deployed with older ABI alias
      try {
        const { account, chain } = await requireReadyWallet();
        await writeContractAsync({
          address: circleAddress as `0x${string}`,
          abi: AjoCircleAbi,
          functionName: 'closeTurn',
          account,
          chain,
        });
        setActionNotice(`Turn #${currentTurn} settled! Pot disbursed and advanced.`);
        await fetchCircleData();
      } catch (err2: any) {
        setErrorNotice(err2?.shortMessage || err2?.message || err?.shortMessage || err?.message || 'Failed to release payout');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLateJoin = async () => {
    if (!lateJoinName.trim()) {
      setErrorNotice('Please enter your name');
      return;
    }
    try {
      setIsSubmitting(true);
      setErrorNotice(null);
      const { account, chain } = await requireReadyWallet();

      const completedTurns = currentTurn - 1;
      const catchUpAmount = completedTurns * contributionAmount;
      const depositAmount = requireDeposit ? contributionAmount : 0;
      const totalDue = catchUpAmount + depositAmount;

      if (totalDue > 0) {
        await writeContractAsync({
          address: activeDeployments.usdt as `0x${string}`,
          abi: Erc20Abi,
          functionName: 'approve',
          args: [circleAddress as `0x${string}`, BigInt(totalDue * 1e6)],
          account,
          chain,
        });
      }

      await writeContractAsync({
        address: circleAddress as `0x${string}`,
        abi: AjoCircleAbi,
        functionName: 'joinLate',
        args: [lateJoinName.trim()],
        account,
        chain,
      });

      setActionNotice(`Welcome late joiner ${lateJoinName}! Catch-up paid to prior turn collectors.`);
      setLateJoinName('');
      await fetchCircleData();
    } catch (err: any) {
      setErrorNotice(err?.shortMessage || err?.message || 'Late join failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClaimPending = async () => {
    try {
      setIsSubmitting(true);
      setErrorNotice(null);
      const { account, chain } = await requireReadyWallet();

      await writeContractAsync({
        address: circleAddress as `0x${string}`,
        abi: AjoCircleAbi,
        functionName: 'claimPending',
        account,
        chain,
      });
      setActionNotice('Claimed pending catch-up balance to your wallet!');
      await fetchCircleData();
    } catch (err: any) {
      setErrorNotice(err?.shortMessage || err?.message || 'Claim failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleWithdrawDeposit = async () => {
    try {
      setIsSubmitting(true);
      setErrorNotice(null);
      const { account, chain } = await requireReadyWallet();

      await writeContractAsync({
        address: circleAddress as `0x${string}`,
        abi: AjoCircleAbi,
        functionName: 'withdrawDeposit',
        account,
        chain,
      });
      setActionNotice('Unused security deposit returned to your wallet!');
      await fetchCircleData();
    } catch (err: any) {
      setErrorNotice(err?.shortMessage || err?.message || 'Withdraw failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const inviteUrl = typeof window !== 'undefined'
    ? `${window.location.origin}${window.location.pathname}?circle=${circleAddress}`
    : `https://ajochain.vercel.app/?circle=${circleAddress}`;

  const copyInvite = () => {
    navigator.clipboard.writeText(inviteUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const isHost = address && hostAddr && address.toLowerCase() === hostAddr.toLowerCase();
  const isMember = !!myMemberData;
  const completedTurns = Math.max(0, currentTurn - 1);
  const lateCatchUpCost = completedTurns * contributionAmount;
  const lateDepositCost = requireDeposit ? contributionAmount : 0;
  const lateTotalDue = lateCatchUpCost + lateDepositCost;

  return (
    <div className="space-y-6 animate-in fade-in duration-300 max-w-6xl mx-auto">
      
      {/* Top Breadcrumb & Share Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition w-fit"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to All Exercise Books</span>
        </button>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => setShowInviteModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-blue-300 text-xs font-semibold transition"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Invite via Link / QR</span>
          </button>

          <button
            onClick={() => onOpenTapeSend(activeDeployments.tapeOutContainer)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-indigo-300 text-xs font-semibold transition"
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>TapeOut Netlist Status</span>
          </button>
        </div>
      </div>

      {/* Claimable Balance Banner (No Stuck Money Invariant) */}
      {userClaimable > 0 && (
        <div className="p-4 rounded-2xl bg-emerald-950/60 border border-emerald-500/40 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
              <MoneyIcon className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white">Pending Catch-Up Funds Waiting for You</h4>
              <p className="text-[11px] text-emerald-300">
                You have <span className="font-bold">{userClaimable} USDT</span> from late-join catch-up distributions waiting in the vault.
              </p>
            </div>
          </div>
          <button
            onClick={handleClaimPending}
            disabled={isSubmitting}
            className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg transition active:scale-95 disabled:opacity-50"
          >
            Collect {userClaimable} USDT
          </button>
        </div>
      )}

      {/* Circle Exercise Book Header Card */}
      <div className="p-6 rounded-3xl bg-gradient-to-br from-[#121824] via-[#161F30] to-[#0D131F] border border-slate-800 shadow-2xl relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider border ${
                status === 'OPEN' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                'bg-blue-500/10 text-blue-400 border-blue-500/20'
              }`}>
                {status === 'OPEN' ? 'Book Forming (Open for Joins)' : status === 'ACTIVE' ? `Turn ${currentTurn} of ${totalSlots}` : 'Completed'}
              </span>
              <span className="text-xs text-slate-400 font-mono">
                Host: {hostName} ({hostAddr ? `${hostAddr.substring(0, 6)}...${hostAddr.substring(hostAddr.length - 4)}` : ''})
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-blue-400" />
              <span>{circleName}</span>
            </h1>

            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 font-mono">
              <span>
                Contract: <a href={`${explorerBase}/address/${circleAddress}`} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline inline-flex items-center gap-1">{circleAddress} <ExternalLink className="w-3 h-3" /></a>
              </span>
              {tapeOutCircuitId && (
                <span className="inline-flex items-center gap-1 text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-full border border-purple-500/20">
                  <Cpu className="w-3 h-3" /> TapeOut Circuit: #{tapeOutCircuitId.substring(0, 8)}... ({tapeOutProcessor})
                </span>
              )}
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 min-w-[130px]">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Contribution</span>
              <span className="text-xl font-black text-white font-mono">{contributionAmount} USDT</span>
              <span className="text-[10px] text-slate-500 block">per turn</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 min-w-[130px]">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Turn Cadence</span>
              <span className="text-xl font-black text-blue-400 font-mono">
                {turnDuration === 300 ? '5 Mins' : turnDuration === 86400 ? 'Daily' : turnDuration === 604800 ? 'Weekly' : 'Monthly'}
              </span>
              <span className="text-[10px] text-slate-500 block">{turnDuration === 300 ? 'Demo Mode' : 'Standard'}</span>
            </div>

            {status === 'ACTIVE' && (
              <>
                <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-emerald-500/30 min-w-[150px]">
                  <span className="text-[10px] uppercase font-bold text-emerald-400 block mb-0.5 flex items-center gap-1">
                    <Coins className="w-3 h-3" /> Escrowed in Contract
                  </span>
                  <span className="text-xl font-black text-emerald-300 font-mono">
                    {escrowedPot} USDT
                  </span>
                  <span className="text-[10px] text-slate-500 block">
                    Turn #{currentTurn} Pot in Vault
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 min-w-[150px]">
                  <span className="text-[10px] uppercase font-bold text-amber-400 block mb-0.5 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Turn Deadline
                  </span>
                  <span className="text-xl font-black text-white font-mono">
                    {secondsLeft > 0 ? formatCountdown(secondsLeft) : 'Expired'}
                  </span>
                  <span className="text-[10px] text-slate-500 block">
                    {secondsLeft === 0 ? 'Ready to Disburse' : 'Remaining in Period'}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Notices */}
        {actionNotice && (
          <div className="mt-4 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-blue-400 flex-shrink-0" />
            <span>{actionNotice}</span>
          </div>
        )}
        {errorNotice && (
          <div className="mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
              <span>{errorNotice}</span>
            </div>
            {chainId !== 1952 && chainId !== 31337 && (
              <button
                onClick={() => switchChain({ chainId: 1952 })}
                disabled={isSwitching}
                className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs whitespace-nowrap transition cursor-pointer"
              >
                {isSwitching ? 'Switching...' : 'Switch to X Layer Testnet (1952)'}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Host Controls / Action Panels */}
      {status === 'OPEN' && isHost && members.length >= 2 && (
        <div className="p-4 rounded-2xl bg-blue-600/10 border border-blue-500/30 flex items-center justify-between gap-4">
          <div>
            <h4 className="text-xs font-bold text-white">Host Controls: Exercise Book Ready to Begin</h4>
            <p className="text-[11px] text-slate-400">{members.length} members have signed their names. Click to lock the order and begin Turn #1.</p>
          </div>
          <button
            onClick={handleStartCircle}
            disabled={isSubmitting}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg transition disabled:opacity-50"
          >
            <Play className="w-3.5 h-3.5" />
            <span>Start Circle (Turn #1)</span>
          </button>
        </div>
      )}

      {/* Non-Member Join Form (Open Phase) */}
      {status === 'OPEN' && !isMember && (
        <div className="p-5 rounded-2xl bg-[#121824] border border-slate-800 space-y-3">
          <div className="flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-white">Sign Your Name in this Ajo Exercise Book</h3>
          </div>
          <p className="text-xs text-slate-400">
            You will automatically receive Turn #{members.length + 1}.
            {requireDeposit && ` Requires ${contributionAmount} USDT 1x security deposit.`}
          </p>
          <div className="flex gap-2 max-w-md">
            <input
              type="text"
              value={joinName}
              onChange={(e) => setJoinName(e.target.value)}
              placeholder="Your Name (e.g. Chidi)"
              className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
            />
            <button
              onClick={handleJoinCircle}
              disabled={isSubmitting || !joinName.trim()}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg transition disabled:opacity-50"
            >
              Join (Slot #{members.length + 1})
            </button>
          </div>
        </div>
      )}

      {/* Active Turn Scheduled Payout Bar (Visible to everyone) */}
      {status === 'ACTIVE' && (
        <div className="p-4 rounded-2xl bg-[#121824] border border-slate-800 flex flex-wrap items-center justify-between gap-3 shadow-lg">
          <div>
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${secondsLeft === 0 ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'}`} />
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                Turn #{currentTurn} Scheduled Payout ({turnDuration === 300 ? '5-Min Live Demo' : turnDuration === 86400 ? 'Daily' : turnDuration === 604800 ? 'Weekly' : 'Monthly'})
              </h4>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {secondsLeft > 0 ? (
                <>Contributions are held in contract escrow. Payout triggers automatically at the end of the period ({formatCountdown(secondsLeft)} remaining).</>
              ) : (
                <span className="text-amber-300 font-medium">Turn deadline expired! Ready to disburse {escrowedPot} USDT accumulated pot to collector.</span>
              )}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {secondsLeft === 0 ? (
              <button
                onClick={handleReleasePayout}
                disabled={isSubmitting}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-black shadow-lg shadow-amber-500/20 transition disabled:opacity-50 cursor-pointer animate-pulse"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Release Scheduled Payout ({escrowedPot} USDT)</span>
              </button>
            ) : (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-[11px] text-slate-400 font-mono">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span>Unlocks in {formatCountdown(secondsLeft)}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Member Turn Contribution Actions */}
      {status === 'ACTIVE' && isMember && (
        <div className="p-4 rounded-2xl bg-[#121824] border border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h4 className="text-xs font-bold text-white">Your Payout Turn: #{myMemberData?.slot} ({myMemberData?.name})</h4>
            <p className="text-[11px] text-slate-400">
              {myMemberData?.paidCurrentTurn
                ? `You have paid your ${contributionAmount} USDT contribution. Funds are held in escrow for Turn #${currentTurn}.`
                : `Turn #${currentTurn} contribution of ${contributionAmount} USDT is due for escrow.`}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {!myMemberData?.paidCurrentTurn && (
              <button
                onClick={handleContribute}
                disabled={isSubmitting}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 text-white text-xs font-bold shadow-lg transition disabled:opacity-50 cursor-pointer"
              >
                <Coins className="w-4 h-4" />
                <span>Pay {contributionAmount} USDT to Escrow (Turn #{currentTurn})</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Late Joiner Catch-Up Calculator & Form */}
      {status === 'ACTIVE' && !isMember && lateJoinOpen && (
        <div className="p-5 rounded-2xl bg-indigo-950/40 border border-indigo-500/30 space-y-3">
          <div className="flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-indigo-400" />
            <h3 className="text-sm font-bold text-white">Join Late with Fair Mathematical Catch-Up</h3>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Because {completedTurns} turn(s) have already disbursed, you can join at the end of the line (Turn #{totalSlots + 1}) by paying your catch-up share ({lateCatchUpCost} USDT) plus 1x deposit ({lateDepositCost} USDT).
            The {lateCatchUpCost} USDT is split equally to prior turn collectors so everyone stays 100% square.
          </p>

          <div className="flex gap-2 max-w-md pt-1">
            <input
              type="text"
              value={lateJoinName}
              onChange={(e) => setLateJoinName(e.target.value)}
              placeholder="Your Name (e.g. Emeka)"
              className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
            />
            <button
              onClick={handleLateJoin}
              disabled={isSubmitting || !lateJoinName.trim()}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg transition disabled:opacity-50"
            >
              Pay {lateTotalDue} USDT & Join Late
            </button>
          </div>
        </div>
      )}

      {/* Completed Circle Deposit Refund */}
      {status === 'COMPLETED' && isMember && (myMemberData?.deposit || 0) > 0 && (
        <div className="p-4 rounded-2xl bg-blue-950/60 border border-blue-500/30 flex items-center justify-between gap-3">
          <div>
            <h4 className="text-xs font-bold text-white">All Turns Completed! Reclaim Your Security Deposit</h4>
            <p className="text-[11px] text-slate-300">You have {myMemberData?.deposit} USDT remaining deposit to withdraw.</p>
          </div>
          <button
            onClick={handleWithdrawDeposit}
            disabled={isSubmitting}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg transition"
          >
            Withdraw {myMemberData?.deposit} USDT
          </button>
        </div>
      )}

      {/* ─── THE EXERCISE BOOK LEDGER TABLE ─── */}
      <div className="bg-[#121824] border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-blue-400" />
              <span>Exercise Book Member Ledger</span>
            </h3>
            <p className="text-xs text-slate-400">Order of turns, deposit coverage, and current payment status</p>
          </div>
          <span className="text-xs font-mono text-slate-400">
            {members.length} {members.length === 1 ? 'member' : 'members'} signed
          </span>
        </div>

        {members.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500">
            No members have signed this exercise book yet. Share the invite link to get started!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900/80 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="px-5 py-3 font-semibold">Turn #</th>
                  <th className="px-5 py-3 font-semibold">Member Name & Address</th>
                  <th className="px-5 py-3 font-semibold">Security Deposit</th>
                  <th className="px-5 py-3 font-semibold">Turn #{currentTurn} Status</th>
                  <th className="px-5 py-3 font-semibold text-right">Payout Turn Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {members.map((m) => {
                  const isCurrentCollector = status === 'ACTIVE' && m.slot === currentTurn;
                  const isPastCollector = m.slot < currentTurn;

                  return (
                    <tr key={m.slot} className="hover:bg-slate-900/40 transition">
                      <td className="px-5 py-3.5 font-bold font-mono text-white">
                        Turn #{m.slot}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="font-bold text-white text-xs">{m.name}</div>
                        <a
                          href={`${explorerBase}/address/${m.address}`}
                          target="_blank"
                          rel="noreferrer"
                          className="font-mono text-[10px] text-slate-400 hover:text-blue-400 transition"
                        >
                          {m.address.substring(0, 8)}...{m.address.substring(m.address.length - 6)}
                        </a>
                      </td>
                      <td className="px-5 py-3.5 font-mono">
                        <span className="text-slate-200">{m.deposit} USDT</span>
                        {requireDeposit && m.deposit === 0 && (
                          <span className="block text-[10px] text-rose-400">Used for missed turn</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        {status === 'OPEN' ? (
                          <span className="text-slate-500 italic">Book forming</span>
                        ) : m.paidCurrentTurn ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[11px] font-semibold">
                            <CheckCircle2 className="w-3 h-3" /> Paid
                          </span>
                        ) : m.missedCurrentTurn ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[11px] font-semibold">
                            Missed
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[11px] font-semibold">
                            Pending
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-right font-semibold">
                        {status === 'COMPLETED' ? (
                          <span className="text-blue-400">All Completed</span>
                        ) : isCurrentCollector ? (
                          <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[10px] font-bold uppercase animate-pulse">
                            Collecting Now
                          </span>
                        ) : isPastCollector ? (
                          <span className="text-slate-500 text-[11px]">Disbursed</span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">Queued</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ─── REAL ON-CHAIN LEDGER TRANSACTION LOG ─── */}
      <div className="bg-[#121824] border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Clock className="w-4 h-4 text-blue-400" />
          <span>On-Chain Exercise Book Event History</span>
        </h3>

        {ledgerLogs.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-500 font-mono">
            No transactions recorded in the book yet.
          </div>
        ) : (
          <div className="space-y-2">
            {ledgerLogs.map((log, idx) => (
              <div key={idx} className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80 flex items-center justify-between text-xs">
                <div>
                  <span className="font-semibold text-white block">{log.title}</span>
                  <span className="text-[10px] text-slate-400">{log.desc}</span>
                </div>
                {log.txHash && (
                  <a
                    href={`${explorerBase}/tx/${log.txHash}`}
                    target="_blank"
                    rel="noreferrer"
                    className="font-mono text-blue-400 hover:underline flex items-center gap-1 text-[11px]"
                  >
                    <span>{log.txHash.substring(0, 10)}...</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Share / Invite Modal with SVG QR Code */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#121824] border border-slate-800 rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-2xl text-center">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold text-white">Invite Members to Sign</h3>
              <button onClick={() => setShowInviteModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex justify-center py-2">
              <QRCodeSvg value={inviteUrl} size={180} />
            </div>

            <p className="text-[11px] text-slate-400">
              Scan with OKX Wallet or share the link to join directly with a chosen display name.
            </p>

            <div className="flex items-center gap-2 bg-slate-900 p-2 rounded-xl border border-slate-800 text-[10px] font-mono text-slate-300">
              <span className="truncate flex-1 text-left">{inviteUrl}</span>
              <button
                onClick={copyInvite}
                className="px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white font-sans font-semibold transition"
              >
                {copiedLink ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
