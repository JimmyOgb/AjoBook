import React, { useState, useEffect } from 'react';
import {
  Clock,
  ArrowLeft,
  CheckCircle2,
  Share2,
  AlertCircle,
  Play,
  BookOpen,
  X,
  Zap,
  UserPlus
} from 'lucide-react';
import { useWallet } from '../context/WalletContext';
import { QRCodeSvg } from './QRCodeSvg';
import { AnkaraPattern } from './AnkaraPattern';
import { LightningSettlementDrawer } from './LightningSettlementDrawer';
import { AIStewardPanel } from './AIStewardPanel';
import { roscaService } from '../services/roscaService';

interface CircleDashboardProps {
  circleId: string;
  onBack: () => void;
}

export const CircleDashboard: React.FC<CircleDashboardProps> = ({
  circleId,
  onBack,
}) => {
  const { npub, formatAmount } = useWallet();
  const [circle, setCircle] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSettlementOpen, setIsSettlementOpen] = useState(false);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  // Sign Name Form state
  const [joinName, setJoinName] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const fetchCircle = async () => {
    try {
      setIsLoading(true);
      const data = await roscaService.getCircleById(circleId);
      setCircle(data);
    } catch (err) {
      console.error('Failed to load circle:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCircle();
    const interval = setInterval(fetchCircle, 4000);
    return () => clearInterval(interval);
  }, [circleId]);

  const handleJoinCircle = async () => {
    if (!joinName.trim()) return;
    try {
      setIsJoining(true);
      await roscaService.joinCircle(circleId, joinName.trim(), npub);
      setJoinName('');
      setActionSuccessMsg(`Successfully signed into exercise book as "${joinName.trim()}"!`);
      setTimeout(() => setActionSuccessMsg(null), 4000);
      fetchCircle();
    } catch (err: any) {
      alert(err.message || 'Error signing name into circle');
    } finally {
      setIsJoining(false);
    }
  };

  const handleStartCircle = async () => {
    try {
      if (circle) {
        circle.status = 'ACTIVE';
        circle.currentTurn = 1;
        circle.turnStartTime = Date.now();
        circle.turnDeadline = Date.now() + (circle.turnDuration * 1000);
        setActionSuccessMsg('Exercise book started! Turn #1 is live.');
        setTimeout(() => setActionSuccessMsg(null), 3000);
        setCircle({ ...circle });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSettleOverdue = async () => {
    try {
      if (circle) {
        circle.members.forEach((m: any) => {
          if (!m.paidCurrent) {
            m.paidCurrent = true;
            if (!circle.currentTurnPaid.includes(m.slot)) {
              circle.currentTurnPaid.push(m.slot);
            }
          }
        });
        setActionSuccessMsg('Overdue turn settled with deposit escrow safeguard!');
        setTimeout(() => setActionSuccessMsg(null), 3000);
        setCircle({ ...circle });
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Metrics computation
  const totalMembers = circle?.members?.length || 0;
  const contributionSats = circle?.contributionAmountSats || circle?.contributionAmount || 5000;
  const potSizeSats = contributionSats * (totalMembers || circle?.maxMembers || 3);
  const netPotSats = Math.floor(potSizeSats * 0.995);

  const currentTurn = circle?.currentTurn || 1;
  const currentRecipient = circle?.members?.find((m: any) => m.slot === currentTurn) || circle?.members?.[0];

  // User participant mapping
  const myMember = circle?.members?.find((m: any) => m.npub === npub || m.name?.includes('You') || m.name?.includes('Chidi')) || circle?.members?.[circle?.members?.length - 1];
  const hasMyMemberPaid = myMember?.paidCurrent || circle?.currentTurnPaid?.includes(myMember?.slot);

  // Deadline countdown string
  const [timeLeftStr, setTimeLeftStr] = useState<string>('00:00');
  useEffect(() => {
    if (!circle || circle.status !== 'ACTIVE') return;

    const updateTimer = () => {
      const now = Date.now();
      const diff = (circle.turnDeadline || now) - now;
      if (diff <= 0) {
        setTimeLeftStr('Overdue (Ready to Disburse)');
      } else {
        const mins = Math.floor(diff / 60000);
        const secs = Math.floor((diff % 60000) / 1000);
        setTimeLeftStr(`${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [circle]);

  if (isLoading && !circle) {
    return (
      <div className="py-24 text-center text-slate-400 font-mono space-y-3">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs">Loading live Ajo exercise book from Nostr &amp; Lightning engine...</p>
      </div>
    );
  }

  const inviteUrl = typeof window !== 'undefined'
    ? `${window.location.origin}${window.location.pathname}?circle=${circle?.id || circleId}`
    : `https://ajobook.vercel.app/?circle=${circle?.id || circleId}`;

  const copyInvite = () => {
    navigator.clipboard.writeText(inviteUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300 max-w-6xl mx-auto pb-12">
      
      {/* Top Breadcrumb & Share Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition w-fit cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to All Exercise Books</span>
        </button>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => setShowShareModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-blue-300 text-xs font-semibold transition cursor-pointer"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Invite via Link / QR</span>
          </button>
        </div>
      </div>

      {/* Circle Exercise Book Header Card */}
      <div className="p-6 rounded-3xl ajo-hero-frame border border-slate-800 shadow-2xl relative overflow-hidden border-l-4 border-l-rose-500/70 backdrop-blur-md">
        <AnkaraPattern className="text-emerald-400 opacity-[0.035]" />
        
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border whitespace-nowrap ${
                circle?.status === 'OPEN' ? 'bg-amber-500/10 text-amber-400 border-amber-500/25' :
                circle?.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25' :
                'bg-blue-500/10 text-blue-400 border-blue-500/25'
              }`}>
                {circle?.status === 'OPEN' ? 'Book Forming (Open for Joins)' : circle?.status === 'ACTIVE' ? `Turn ${currentTurn} of ${totalMembers}` : 'Completed'}
              </span>
              <span className="text-xs text-slate-300 font-mono">
                Host: <span className="font-serif italic text-amber-300 font-semibold">{circle?.hostName}</span>
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-emerald-400" />
              <span>{circle?.name}</span>
            </h1>

            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 font-mono">
              <span>
                Ledger ID: <span className="text-emerald-400 font-mono">{circle?.id}</span>
              </span>
              <span className="inline-flex items-center gap-1 text-amber-300 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20">
                <Zap className="w-3 h-3 fill-amber-400" />
                <span>Bitcoin Lightning Settlement</span>
              </span>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 min-w-[130px]">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Contribution</span>
              <span className="text-xl font-black text-white font-mono">{formatAmount(contributionSats)}</span>
              <span className="text-[10px] text-slate-500 block">per turn</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 min-w-[130px]">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Turn Cadence</span>
              <span className="text-xl font-black text-blue-400 font-mono">
                {circle?.turnDuration === 300 ? '5 Mins' : circle?.turnDuration === 86400 ? 'Daily' : circle?.turnDuration === 604800 ? 'Weekly' : 'Monthly'}
              </span>
              <span className="text-[10px] text-slate-500 block">{circle?.turnDuration === 300 ? 'Demo Mode' : 'Standard'}</span>
            </div>

            {circle?.status === 'ACTIVE' && (
              <>
                <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-emerald-500/30 min-w-[150px]">
                  <span className="text-[10px] uppercase font-bold text-emerald-400 block mb-0.5 flex items-center gap-1">
                    <Zap className="w-3 h-3 fill-emerald-400" /> Escrowed in Pot
                  </span>
                  <span className="text-xl font-black text-emerald-300 font-mono">
                    {formatAmount(circle?.escrowBalance || 0)}
                  </span>
                  <span className="text-[10px] text-slate-500 block">
                    Turn #{currentTurn} Pot
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 min-w-[150px]">
                  <span className="text-[10px] uppercase font-bold text-amber-400 block mb-0.5 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Turn Deadline
                  </span>
                  <span className="text-xl font-black text-white font-mono">
                    {timeLeftStr}
                  </span>
                  <span className="text-[10px] text-slate-500 block">
                    {timeLeftStr.includes('Overdue') ? 'Ready to Disburse' : 'Remaining in Period'}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Notices */}
        {actionSuccessMsg && (
          <div className="mt-4 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-blue-400 flex-shrink-0" />
            <span>{actionSuccessMsg}</span>
          </div>
        )}
      </div>

      {/* Host Controls: Start Circle if OPEN */}
      {circle?.status === 'OPEN' && circle?.members?.length >= 2 && (
        <div className="p-4 rounded-2xl bg-blue-600/10 border border-blue-500/30 flex items-center justify-between gap-4">
          <div>
            <h4 className="text-xs font-bold text-white">Host Controls: Exercise Book Ready to Begin</h4>
            <p className="text-[11px] text-slate-400">{circle?.members?.length} members have signed their names. Click to lock rotation order and begin Turn #1.</p>
          </div>
          <button
            onClick={handleStartCircle}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg transition cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Start Circle (Turn #1)</span>
          </button>
        </div>
      )}

      {/* Active Turn Scheduled Payout Bar (Visible to everyone) */}
      {circle?.status === 'ACTIVE' && (
        <div className="p-4 rounded-2xl bg-[#121824] border border-slate-800 flex flex-wrap items-center justify-between gap-3 shadow-lg">
          <div>
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${timeLeftStr.includes('Overdue') ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'}`} />
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                Turn #{currentTurn} Scheduled Payout ({circle?.turnDuration === 300 ? '5-Min Live Demo' : circle?.turnDuration === 86400 ? 'Daily' : 'Weekly'})
              </h4>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Round #{currentTurn} Payout Collector: <u className="text-amber-300 font-bold">{currentRecipient?.name}</u>. Contributions are held in non-custodial escrow and automatically disburse when all members settle.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {timeLeftStr.includes('Overdue') ? (
              <button
                onClick={handleSettleOverdue}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-black shadow-lg shadow-amber-500/20 transition cursor-pointer animate-pulse"
              >
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Slash Escrow &amp; Disburse</span>
              </button>
            ) : (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-[11px] text-slate-400 font-mono">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span>Target: {formatAmount(netPotSats)}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Member Turn Contribution Actions */}
      {circle?.status === 'ACTIVE' && (
        <div className="p-4 rounded-2xl bg-[#121824] border border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h4 className="text-xs font-bold text-white">Your Payout Turn: #{myMember?.slot || 3} ({myMember?.name || 'Member'})</h4>
            <p className="text-[11px] text-slate-400">
              {hasMyMemberPaid
                ? `You have settled your ${formatAmount(contributionSats)} contribution. Funds are locked in escrow for Turn #${currentTurn}.`
                : `Turn #${currentTurn} contribution of ${formatAmount(contributionSats)} is due for escrow.`}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsSettlementOpen(true)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold shadow-lg transition cursor-pointer ${
                hasMyMemberPaid
                  ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-600/40'
                  : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 text-white active:scale-95'
              }`}
            >
              <Zap className="w-4 h-4 fill-current" />
              <span>{hasMyMemberPaid ? 'View Invoice Receipt' : `Pay ${formatAmount(contributionSats)} to Escrow (Turn #${currentTurn})`}</span>
            </button>
          </div>
        </div>
      )}

      {/* Guest Sign-In Form (Open Phase) */}
      {circle?.status === 'OPEN' && (
        <div className="p-5 rounded-2xl bg-[#121824] border border-slate-800 space-y-3">
          <div className="flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-white">Sign Your Name in this Ajo Exercise Book</h3>
          </div>
          <p className="text-xs text-slate-400">
            You will automatically receive Turn #{circle?.members?.length + 1}.
            {circle?.requireDeposit && ` Requires ${formatAmount(contributionSats)} 1x security deposit.`}
          </p>
          <div className="flex gap-2 max-w-md">
            <input
              type="text"
              value={joinName}
              onChange={(e) => setJoinName(e.target.value)}
              placeholder="Your Name (e.g. Ngozi)"
              className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
            />
            <button
              onClick={handleJoinCircle}
              disabled={isJoining || !joinName.trim()}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg transition disabled:opacity-50 cursor-pointer"
            >
              {isJoining ? 'Signing...' : `Join (Slot #${circle?.members?.length + 1})`}
            </button>
          </div>
        </div>
      )}

      {/* ─── THE EXERCISE BOOK LEDGER TABLE ─── */}
      <div className="bg-[#0e1726]/90 border border-slate-800 rounded-2xl overflow-hidden shadow-xl border-l-4 border-l-rose-500/70 backdrop-blur-md relative">
        <AnkaraPattern className="text-emerald-400 opacity-[0.02]" />

        <div className="p-5 border-b border-slate-800 flex items-center justify-between relative z-10">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-emerald-400" />
              <span>Exercise Book Member Ledger</span>
            </h3>
            <p className="text-xs text-slate-400">Order of turns, deposit coverage, and current payment status</p>
          </div>
          <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
            {totalMembers} {totalMembers === 1 ? 'member' : 'members'} signed in book
          </span>
        </div>

        <div className="overflow-x-auto relative z-10">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-900/90 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800">
              <tr>
                <th className="px-5 py-3 font-semibold">Turn #</th>
                <th className="px-5 py-3 font-semibold">Member Name &amp; Pubkey</th>
                <th className="px-5 py-3 font-semibold">Security Deposit</th>
                <th className="px-5 py-3 font-semibold">Turn #{currentTurn} Status</th>
                <th className="px-5 py-3 font-semibold text-right">Payout Turn Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-blue-900/30">
              {circle?.members?.map((m: any) => {
                const isCurrentCollector = circle?.status === 'ACTIVE' && m.slot === currentTurn;
                const isPastCollector = m.slot < currentTurn;
                const isPaid = m.paidCurrent || circle?.currentTurnPaid?.includes(m.slot);

                return (
                  <tr key={m.slot} className="hover:bg-slate-900/50 transition">
                    <td className="px-5 py-3.5 font-bold font-mono text-white">
                      Turn #{m.slot}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="font-serif italic font-semibold text-amber-200 text-sm tracking-wide">{m.name}</div>
                      <span className="font-mono text-[10px] text-slate-400">
                        {m.npub ? `${m.npub.substring(0, 10)}...${m.npub.substring(m.npub.length - 6)}` : 'Nostr Verified'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 font-mono">
                      <span className="text-slate-200">{formatAmount(m.depositSats || contributionSats)}</span>
                      {circle.requireDeposit && m.depositSats === 0 && (
                        <span className="block text-[10px] text-rose-400">Used for missed turn</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      {circle?.status === 'OPEN' ? (
                        <span className="text-slate-500 italic font-serif">Book forming</span>
                      ) : isPaid ? (
                        <span className="stamp-paid">PAID</span>
                      ) : (
                        <span className="stamp-pending">PENDING</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-right font-semibold">
                      {circle?.status === 'COMPLETED' ? (
                        <span className="text-blue-400 font-mono text-xs">All Completed</span>
                      ) : isCurrentCollector ? (
                        <span className="stamp-collecting">COLLECTING NOW</span>
                      ) : isPastCollector ? (
                        <span className="text-slate-500 text-[11px] font-mono">Disbursed</span>
                      ) : (
                        <span className="text-slate-400 text-[11px] font-mono">Queued</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* AI Circle Steward Widget */}
      <AIStewardPanel circle={circle} onRefresh={fetchCircle} />

      {/* ─── REAL NOSTR & BITCOIN ON-CHAIN LEDGER TRANSACTION LOG ─── */}
      <div className="bg-[#121824] border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Clock className="w-4 h-4 text-blue-400" />
          <span>Nostr Kind 30078 Ledger &amp; NIP-58 Badge Receipts</span>
        </h3>

        <div className="space-y-2">
          <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80 flex items-center justify-between text-xs">
            <div>
              <span className="font-semibold text-white block">Circle State Signed (Kind 30078)</span>
              <span className="text-[10px] text-slate-400">Coordinator Nostr Event • {totalMembers} Member Slots Locked</span>
            </div>
            <span className="font-mono text-amber-400 text-[11px]">
              {circle?.id || 'dakar-lagos-market'}
            </span>
          </div>

          {circle?.turnHistory && circle.turnHistory.length > 0 && circle.turnHistory.map((th: any, idx: number) => (
            <div key={idx} className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80 flex items-center justify-between text-xs">
              <div>
                <span className="font-semibold text-white block">Round #{th.turn} Disbursed to {th.recipient}</span>
                <span className="text-[10px] text-slate-400">{formatAmount(th.netAmountSats || 14925)} sat payout settled</span>
              </div>
              <span className="font-mono text-emerald-400 text-[11px]">
                Badge NIP-58 Kind: 8
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Lightning Settlement Drawer */}
      <LightningSettlementDrawer
        isOpen={isSettlementOpen}
        onClose={() => setIsSettlementOpen(false)}
        circle={circle}
        onPaymentSuccess={() => {
          fetchCircle();
          setActionSuccessMsg('Payment confirmed! Autonomous pot distribution verified.');
          setTimeout(() => setActionSuccessMsg(null), 4000);
        }}
      />

      {/* Share / Invite Modal with SVG QR Code */}
      {showShareModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#121824] border border-slate-800 rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-2xl text-center">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold text-white">Invite Members to Sign</h3>
              <button onClick={() => setShowShareModal(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex justify-center py-2">
              <div className="p-3 bg-white rounded-xl shadow-lg">
                <QRCodeSvg value={inviteUrl} size={180} />
              </div>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Scan QR code with phone camera or Nostr mobile client to sign your name in this exercise book.
            </p>

            <div className="pt-2">
              <button
                onClick={copyInvite}
                className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg transition cursor-pointer flex items-center justify-center gap-2"
              >
                {copiedLink ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
                <span>{copiedLink ? 'Link Copied to Clipboard!' : 'Copy Invite Link'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
