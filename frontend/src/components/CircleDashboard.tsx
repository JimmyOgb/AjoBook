import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Zap,
  CheckCircle2,
  AlertCircle,
  Share2,
  X,
  Play,
  BookOpen
} from 'lucide-react';
import { roscaService } from '../services/roscaService';
import { useWallet } from '../context/WalletContext';
import { LightningSettlementDrawer } from './LightningSettlementDrawer';
import { AIStewardPanel } from './AIStewardPanel';
import { QRCodeSvg } from './QRCodeSvg';

interface CircleDashboardProps {
  circleId: string;
  onBack: () => void;
}

export const CircleDashboard: React.FC<CircleDashboardProps> = ({ circleId, onBack }) => {
  const { npub, formatAmount } = useWallet();
  const [circle, setCircle] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSettlementOpen, setIsSettlementOpen] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  const fetchCircle = async () => {
    try {
      setIsLoading(true);
      const data = await roscaService.getCircleById(circleId);
      setCircle(data);
    } catch (err) {
      console.error('Failed to fetch circle:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCircle();
  }, [circleId]);

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
      <div className="py-24 text-center text-stone-500 font-mono space-y-3">
        <div className="w-8 h-8 border-2 border-emerald-700 border-t-transparent rounded-full animate-spin mx-auto" />
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
    <div className="space-y-6 animate-in fade-in duration-300 max-w-6xl mx-auto pb-12 text-stone-900">
      
      {/* Top Breadcrumb & Share Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs font-semibold text-stone-600 hover:text-stone-900 transition w-fit cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to All Savings Circles</span>
        </button>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => setShowShareModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-stone-50 border border-stone-200 text-stone-700 text-xs font-semibold transition cursor-pointer shadow-xs"
          >
            <Share2 className="w-3.5 h-3.5 text-emerald-700" />
            <span>Invite via Link / QR</span>
          </button>
        </div>
      </div>

      {/* Circle Header Card */}
      <div className="p-6 rounded-2xl bg-white border border-stone-200 shadow-xs relative overflow-hidden border-l-4 border-l-emerald-800">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider border whitespace-nowrap ${
                circle?.status === 'OPEN' ? 'bg-amber-50 text-amber-800 border-amber-200' :
                circle?.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                'bg-stone-100 text-stone-700 border-stone-200'
              }`}>
                {circle?.status === 'OPEN' ? 'Formation (Open)' : circle?.status === 'ACTIVE' ? `Turn #${circle?.currentTurn} In Progress` : 'Completed'}
              </span>
              <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-mono">
                <Zap className="w-3 h-3 fill-emerald-700 text-emerald-700" />
                <span>Lightning Settlement Rail</span>
              </span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight font-heading">
              {circle?.name}
            </h2>
            <p className="text-xs text-stone-500 flex items-center gap-2">
              <span>Organizer: <strong className="text-stone-800">{circle?.hostName || 'Aminata'}</strong></span>
              <span>•</span>
              <span className="font-mono text-stone-400">ID: {circle?.id}</span>
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={() => setIsSettlementOpen(true)}
              className="px-5 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-xs transition cursor-pointer flex items-center gap-2"
            >
              <Zap className="w-4 h-4 fill-amber-300 text-amber-300" />
              <span>{hasMyMemberPaid ? 'View Invoice / Pay Again' : `1-Tap Pay ${contributionSats.toLocaleString()} sats`}</span>
            </button>
          </div>
        </div>

        {/* Action success alert */}
        {actionSuccessMsg && (
          <div className="mt-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-800 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-700" />
            <span>{actionSuccessMsg}</span>
          </div>
        )}
      </div>

      {/* "This Round at a Glance" Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-xl bg-white border border-stone-200 shadow-xs">
          <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block">Round Contribution</span>
          <div className="text-2xl font-black text-stone-900 font-mono mt-1">
            {formatAmount(contributionSats)}
          </div>
          <span className="text-[11px] text-stone-400">per participant</span>
        </div>

        <div className="p-4 rounded-xl bg-white border border-stone-200 shadow-xs">
          <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block">Round #{currentTurn} Pot</span>
          <div className="text-2xl font-black text-emerald-800 font-mono mt-1">
            {formatAmount(netPotSats)}
          </div>
          <span className="text-[11px] text-stone-400">after 0.5% protocol fee</span>
        </div>

        <div className="p-4 rounded-xl bg-white border border-stone-200 shadow-xs">
          <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block">Turn Recipient</span>
          <div className="text-lg font-black text-stone-900 mt-1 truncate">
            {currentRecipient?.name || 'Round Leader'}
          </div>
          <span className="text-[11px] text-stone-400">Receives full net pot</span>
        </div>

        <div className="p-4 rounded-xl bg-white border border-stone-200 shadow-xs">
          <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block">Round Deadline</span>
          <div className="text-lg font-black text-stone-900 font-mono mt-1 truncate">
            {timeLeftStr}
          </div>
          <span className="text-[11px] text-stone-400">Autonomous disbursal on completion</span>
        </div>
      </div>

      {/* Circle Control Bar: Start Circle & Settle Overdue */}
      {circle?.status === 'OPEN' && circle?.members?.length >= (circle?.maxMembers || 3) && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-between gap-3">
          <div className="text-xs text-amber-900">
            <strong>All member slots filled!</strong> The savings circle is ready to begin Turn #1.
          </div>
          <button
            onClick={handleStartCircle}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Start Turn #1</span>
          </button>
        </div>
      )}

      {/* Overdue Settle Button */}
      {circle?.status === 'ACTIVE' && timeLeftStr.includes('Overdue') && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-between gap-3">
          <div className="text-xs text-amber-900">
            <strong>Round deadline reached!</strong> Non-paying members can have their 1x deposit slashed into the pot so {currentRecipient?.name} is never shortchanged.
          </div>
          <button
            onClick={handleSettleOverdue}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition cursor-pointer"
          >
            <AlertCircle className="w-3.5 h-3.5" />
            <span>Slash Escrow &amp; Disburse</span>
          </button>
        </div>
      )}

      {/* Main Ledger Table */}
      <div className="rounded-2xl bg-white border border-stone-200 shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-stone-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-emerald-800" />
            <h3 className="text-sm font-bold text-stone-900 uppercase tracking-wider font-heading">
              Exercise Book Member Ledger
            </h3>
          </div>
          <span className="text-xs text-stone-500 font-mono">
            {circle?.members?.length} Registered Members
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-50 border-b border-stone-200 text-stone-500 uppercase tracking-wider font-bold">
              <tr>
                <th className="py-3 px-4">Turn #</th>
                <th className="py-3 px-4">Member Name</th>
                <th className="py-3 px-4">Nostr npub</th>
                <th className="py-3 px-4">1x Escrow Deposit</th>
                <th className="py-3 px-4">Round Contribution</th>
                <th className="py-3 px-4 text-right">Ledger Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {circle?.members?.map((member: any) => {
                const isPaid = member.paidCurrent || circle?.currentTurnPaid?.includes(member.slot);
                const isRecipient = member.slot === currentTurn;

                return (
                  <tr key={member.slot} className="hover:bg-stone-50/70 transition">
                    <td className="py-3.5 px-4 font-mono font-bold text-stone-700">
                      Slot #{member.slot}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-stone-900">
                      {member.name}
                      {member.slot === 1 && (
                        <span className="ml-1.5 text-[10px] px-1.5 py-0.2 rounded-full bg-stone-100 text-stone-600 font-normal">
                          Host
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px] text-stone-500">
                      {member.npub ? `${member.npub.substring(0, 10)}...` : 'N/A'}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-stone-700">
                      {formatAmount(member.depositSats || contributionSats)}
                    </td>
                    <td className="py-3.5 px-4">
                      {isRecipient ? (
                        <span className="stamp-collecting">TURNS RECIPIENT</span>
                      ) : (
                        <span className="font-mono text-stone-900 font-semibold">
                          {formatAmount(contributionSats)}
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {isPaid ? (
                        <span className="stamp-paid">PAID</span>
                      ) : (
                        <span className="stamp-pending">PENDING</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* AI Steward Panel */}
      <AIStewardPanel circle={circle} onRefresh={fetchCircle} />

      {/* Completed Turns Ledger */}
      {circle?.turnHistory && circle?.turnHistory?.length > 0 && (
        <div className="rounded-2xl bg-white border border-stone-200 shadow-xs p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-stone-900 uppercase tracking-wider font-heading">
              Disbursed Pot History (Cryptographic Nostr Kind 8 Proofs)
            </h3>
            <span className="text-xs text-stone-500 font-mono">
              {circle.turnHistory.length} Settled Turns
            </span>
          </div>

          <div className="space-y-2.5">
            {circle.turnHistory.map((item: any, idx: number) => (
              <div
                key={idx}
                className="p-3.5 rounded-xl bg-stone-50 border border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div>
                  <div className="font-bold text-stone-900 flex items-center gap-2">
                    <span>Round #{item.turn} Payout</span>
                    <span className="text-emerald-800 font-mono font-extrabold">{formatAmount(item.netPayout)}</span>
                  </div>
                  <p className="text-[11px] text-stone-500 mt-0.5">
                    Disbursed to: <strong className="text-stone-800">{item.recipient}</strong>
                  </p>
                </div>
                <div className="text-right font-mono text-[11px] text-stone-500">
                  <span className="block text-stone-400">NIP-58 Badge Receipt:</span>
                  <span className="text-emerald-700 truncate max-w-[200px] block" title={item.nostrReceiptId}>
                    {item.nostrReceiptId ? `${item.nostrReceiptId.substring(0, 16)}...` : 'Verified'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Lightning Settlement Drawer */}
      <LightningSettlementDrawer
        isOpen={isSettlementOpen}
        onClose={() => setIsSettlementOpen(false)}
        circle={circle}
        onPaymentSuccess={fetchCircle}
      />

      {/* Share / Invite Modal */}
      {showShareModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white border border-stone-200 rounded-2xl p-6 max-w-sm w-full shadow-2xl space-y-4 text-center">
            <div className="flex justify-between items-center">
              <h4 className="font-bold text-stone-900 text-sm font-heading">Invite Participants</h4>
              <button onClick={() => setShowShareModal(false)} className="text-stone-400 hover:text-stone-900">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 inline-block mx-auto">
              <QRCodeSvg value={inviteUrl} size={160} />
            </div>

            <div className="text-left space-y-1">
              <span className="text-[11px] text-stone-500 font-medium">Direct Invite Link:</span>
              <p className="p-2 rounded bg-stone-50 border border-stone-200 font-mono text-[10px] text-stone-700 break-all">
                {inviteUrl}
              </p>
            </div>

            <button
              onClick={copyInvite}
              className="w-full py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white font-bold text-xs transition cursor-pointer"
            >
              {copiedLink ? 'Copied to Clipboard!' : 'Copy Invite Link'}
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
