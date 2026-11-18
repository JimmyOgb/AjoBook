import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Zap,
  CheckCircle2,
  AlertCircle,
  Share2,
  X,
  Play,
  BookOpen,
  UserPlus,
  Coins,
  Copy,
  ExternalLink,
  ShieldCheck,
  Clock
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
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedPreimage, setCopiedPreimage] = useState<string | null>(null);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  // Join form state
  const [joinName, setJoinName] = useState('Fatou (Trader)');
  const [joinLnAddr, setJoinLnAddr] = useState('fatou@getalby.com');
  const [joinNpub, setJoinNpub] = useState(npub || 'npub1fatoutrader99');
  const [isJoining, setIsJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  // Claim escrow state
  const [claimingPayoutId, setClaimingPayoutId] = useState<string | null>(null);

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

  // Check if opened via ?join=1 invite link
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('join') === '1') {
        setShowJoinModal(true);
      }
    }
  }, []);

  const handleStartCircle = async () => {
    try {
      if (circle) {
        await roscaService.startCircle(circle.id);
        setActionSuccessMsg('Exercise book started! Turn #1 countdown is live.');
        setTimeout(() => setActionSuccessMsg(null), 4000);
        await fetchCircle();
      }
    } catch (e: any) {
      console.error(e);
      setActionSuccessMsg(e.message || 'Failed to start circle');
    }
  };

  const handleCloseLateTurn = async () => {
    try {
      if (circle) {
        await roscaService.closeLateTurn(circle.id);
        setActionSuccessMsg(`Closed late turn! Non-paying members covered by 1x deposit escrow safeguard.`);
        setTimeout(() => setActionSuccessMsg(null), 4000);
        await fetchCircle();
      }
    } catch (e: any) {
      console.error(e);
      setActionSuccessMsg(e.message || 'Failed to close late turn');
    }
  };

  const handleJoinCircle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!circle) return;
    try {
      setIsJoining(true);
      setJoinError(null);
      const res = await roscaService.joinCircle(circle.id, joinName, joinNpub, joinLnAddr);
      setShowJoinModal(false);
      setActionSuccessMsg(
        circle.status === 'ACTIVE'
          ? `Welcome ${joinName}! Late joiner catch-up sats (${(res.catchUpTotal || 0).toLocaleString()} sats) distributed to past turn collectors.`
          : `Signed into Slot #${res.member?.slot || circle.members.length + 1} of the exercise book!`
      );
      setTimeout(() => setActionSuccessMsg(null), 5000);
      await fetchCircle();
    } catch (err: any) {
      console.error(err);
      setJoinError(err.message || 'Failed to join circle');
    } finally {
      setIsJoining(false);
    }
  };

  const handleClaimEscrow = async (claimId: string, recipientName: string) => {
    try {
      setClaimingPayoutId(claimId);
      const res = await roscaService.claimPayout(circle.id, claimId, recipientName);
      setActionSuccessMsg(`Claimed ${res.claim?.amountSats?.toLocaleString()} sats via Lightning! Cryptographic preimage: ${res.preimage.substring(0, 16)}...`);
      setTimeout(() => setActionSuccessMsg(null), 6000);
      await fetchCircle();
    } catch (err: any) {
      console.error(err);
      setActionSuccessMsg(err.message || 'Failed to claim escrow payout');
    } finally {
      setClaimingPayoutId(null);
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

  // Unclaimed payouts list
  const unclaimedPayouts = (circle?.claimablePayouts || []).filter((p: any) => !p.claimed);

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
    ? `${window.location.origin}${window.location.pathname}?circle=${circle?.id || circleId}&join=1`
    : `https://ajobook.vercel.app/?circle=${circle?.id || circleId}&join=1`;

  const copyInvite = () => {
    navigator.clipboard.writeText(inviteUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const copyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedPreimage(id);
    setTimeout(() => setCopiedPreimage(null), 2000);
  };

  // Late joiner computation
  const isLateJoiner = circle?.status === 'ACTIVE';
  const turnsElapsed = (circle?.currentTurn || 1) - 1;
  const catchUpSats = turnsElapsed * contributionSats;
  const depositSats = circle?.requireDeposit ? contributionSats : 0;
  const totalLateJoinerSats = contributionSats + catchUpSats + depositSats;

  return (
    <div className="space-y-6 animate-in fade-in duration-300 max-w-6xl mx-auto pb-12 text-stone-900">
      
      {/* Top Breadcrumb & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs font-semibold text-stone-600 hover:text-stone-900 transition w-fit cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to All Savings Circles</span>
        </button>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Join Circle Action Button */}
          {(circle?.status === 'OPEN' || (circle?.status === 'ACTIVE' && circle?.isOpenForLateJoiners !== false)) && (
            <button
              onClick={() => setShowJoinModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-800 hover:bg-emerald-700 text-white text-xs font-bold transition cursor-pointer shadow-xs"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>{circle?.status === 'ACTIVE' ? 'Join as Late Joiner' : 'Join Circle'}</span>
            </button>
          )}

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
              {circle?.isOpenForLateJoiners && (
                <span className="px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-700 text-[11px] font-semibold border border-stone-200">
                  Late Joiners Welcome
                </span>
              )}
            </div>

            <h2 className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight font-heading">
              {circle?.name}
            </h2>
            <p className="text-xs text-stone-500 flex items-center gap-2 flex-wrap">
              <span>Host / Organizer: <strong className="text-stone-800">{circle?.hostName || 'Aminata'}</strong></span>
              <span>•</span>
              <span className="font-mono text-stone-400">ID: {circle?.id}</span>
              {circle?.mempoolAnchorBlock && (
                <>
                  <span>•</span>
                  <a
                    href={`https://mempool.space/block/${circle.mempoolAnchorBlock}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-700 hover:underline flex items-center gap-1 font-mono"
                  >
                    <span>Anchor Block #{circle.mempoolAnchorBlock}</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </>
              )}
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
            <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
            <span className="break-all">{actionSuccessMsg}</span>
          </div>
        )}
      </div>

      {/* Claimable Escrow Banner ("No Stuck Money" - Mechanic #8) */}
      {unclaimedPayouts.length > 0 && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Coins className="w-4 h-4 text-amber-700" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-amber-900 font-heading">
                Claimable Escrow Sats Available ({unclaimedPayouts.length} Unclaimed)
              </h3>
            </div>
            <span className="text-[11px] text-amber-800 font-medium">
              Autonomous non-custodial payouts ready for Lightning settlement
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {unclaimedPayouts.map((payout: any) => (
              <div
                key={payout.id}
                className="p-3 bg-white rounded-xl border border-amber-200/80 flex items-center justify-between gap-3 text-xs"
              >
                <div>
                  <div className="font-bold text-stone-900 flex items-center gap-1.5">
                    <span>{payout.recipientName}</span>
                    <span className="text-emerald-800 font-mono font-black">+{formatAmount(payout.amountSats)}</span>
                  </div>
                  <p className="text-[11px] text-stone-500">{payout.reason || `Turn #${payout.turn} Payout`}</p>
                </div>
                <button
                  onClick={() => handleClaimEscrow(payout.id, payout.recipientName)}
                  disabled={claimingPayoutId === payout.id}
                  className="px-3 py-1.5 rounded-lg bg-emerald-800 hover:bg-emerald-700 text-white font-bold text-[11px] shadow-xs transition cursor-pointer disabled:opacity-50"
                >
                  {claimingPayoutId === payout.id ? 'Settling...' : 'Claim Sats'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

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

      {/* Circle Control Bar: Start Circle (Mechanic #3) */}
      {circle?.status === 'OPEN' && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-between gap-3 flex-wrap">
          <div className="text-xs text-amber-900">
            <strong>Ready to start?</strong> {circle?.members?.length} registered members in the book. Starting locks the lineup and begins the Turn #1 timer.
          </div>
          <button
            onClick={handleStartCircle}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Start Circle &amp; Turn #1</span>
          </button>
        </div>
      )}

      {/* Overdue Close Button (Mechanic #6 & #5) */}
      {circle?.status === 'ACTIVE' && timeLeftStr.includes('Overdue') && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-between gap-3 flex-wrap">
          <div className="text-xs text-amber-900">
            <strong>Round deadline reached!</strong> Triggering "Close Late Turn" slashes 1x escrow deposits of non-paying members into the pot so {currentRecipient?.name} is never shortchanged, and records public MISSED stamps.
          </div>
          <button
            onClick={handleCloseLateTurn}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition cursor-pointer"
          >
            <AlertCircle className="w-3.5 h-3.5" />
            <span>Close Late Turn &amp; Slash Escrow</span>
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
                const isMissed = member.missed;

                return (
                  <tr key={member.slot} className="hover:bg-stone-50/70 transition">
                    <td className="py-3.5 px-4 font-mono font-bold text-stone-700">
                      Slot #{member.slot}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-stone-900">
                      <span>{member.name}</span>
                      {member.slot === 1 && (
                        <span className="ml-1.5 text-[10px] px-1.5 py-0.2 rounded-full bg-stone-100 text-stone-600 font-normal">
                          Host
                        </span>
                      )}
                      {member.lateJoiner && (
                        <span className="ml-1.5 text-[10px] px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-800 font-normal">
                          Late Joiner (+{formatAmount(member.catchUpPaid || 0)})
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
                      {isMissed ? (
                        <span className="stamp-missed">MISSED</span>
                      ) : isPaid ? (
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

      {/* Verifiable Exercise Book History & Nostr Proofs (Mechanic #8) */}
      <div className="rounded-2xl bg-white border border-stone-200 shadow-xs p-5 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h3 className="text-sm font-bold text-stone-900 uppercase tracking-wider font-heading flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-800" />
              <span>Verifiable Exercise Book History &amp; Nostr Proofs</span>
            </h3>
            <p className="text-xs text-stone-500">
              Every action is cryptographically anchored via Nostr Signed Events (Kind 30078 &amp; 8) and BOLT11 SHA-256 preimages.
            </p>
          </div>
          <span className="text-xs text-stone-500 font-mono">
            {circle?.bookAuditLog?.length || 0} Cryptographic Entries
          </span>
        </div>

        <div className="divide-y divide-stone-100 overflow-x-auto">
          {circle?.bookAuditLog?.map((entry: any) => {
            const hasPreimage = !!entry.preimage;
            const hasReceipt = !!entry.nostrReceiptId;

            return (
              <div key={entry.id} className="py-3 flex flex-col md:flex-row md:items-center justify-between gap-2 text-xs">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                      entry.action === 'POT_DISBURSED' ? 'bg-emerald-100 text-emerald-900' :
                      entry.action === 'CIRCLE_STARTED' ? 'bg-blue-100 text-blue-900' :
                      entry.action === 'LATE_TURN_CLOSED' ? 'bg-amber-100 text-amber-900' :
                      entry.action === 'PAYOUT_CLAIMED' ? 'bg-purple-100 text-purple-900' :
                      'bg-stone-100 text-stone-700'
                    }`}>
                      {entry.action.replace(/_/g, ' ')}
                    </span>
                    <span className="text-stone-900 font-medium">{entry.description}</span>
                  </div>

                  <div className="flex items-center gap-3 text-[11px] text-stone-500 font-mono flex-wrap">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-stone-400" />
                      <span>{new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                    </span>
                    {entry.blockHeight && (
                      <a
                        href={`https://mempool.space/block/${entry.blockHeight}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-stone-600 hover:text-emerald-700 flex items-center gap-1"
                      >
                        <span>Block #{entry.blockHeight}</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    )}
                  </div>
                </div>

                {/* Cryptographic Preimage / Nostr Proof Pill */}
                {(hasPreimage || hasReceipt) && (
                  <div className="flex items-center gap-2 self-start md:self-center">
                    {hasPreimage && (
                      <button
                        onClick={() => copyText(entry.preimage, entry.id)}
                        className="px-2.5 py-1 rounded-lg bg-stone-50 hover:bg-stone-100 border border-stone-200 font-mono text-[10px] text-emerald-800 flex items-center gap-1.5 transition cursor-pointer"
                        title={entry.preimage}
                      >
                        <Zap className="w-3 h-3 text-amber-600" />
                        <span>Preimage: {entry.preimage.substring(0, 10)}...</span>
                        <Copy className="w-2.5 h-2.5 text-stone-400" />
                        {copiedPreimage === entry.id && <span className="text-[9px] text-emerald-700 font-bold">Copied!</span>}
                      </button>
                    )}
                    {hasReceipt && (
                      <span className="px-2 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 font-mono text-[10px] truncate max-w-[140px]" title={entry.nostrReceiptId}>
                        Nostr: {entry.nostrReceiptId.substring(0, 8)}...
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

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
              <button onClick={() => setShowShareModal(false)} className="text-stone-400 hover:text-stone-900 cursor-pointer">
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

      {/* Join Circle Modal (Mechanic #2 & #7) */}
      {showJoinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white border border-stone-200 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 text-stone-900">
            <div className="flex justify-between items-center border-b border-stone-200 pb-3">
              <div>
                <h4 className="font-bold text-stone-900 text-sm font-heading">
                  {isLateJoiner ? 'Join Savings Circle (Late Joiner)' : 'Join Savings Circle'}
                </h4>
                <p className="text-xs text-stone-500">Sign your name into {circle?.name}</p>
              </div>
              <button onClick={() => setShowJoinModal(false)} className="text-stone-400 hover:text-stone-900 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleJoinCircle} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                  Your Display Name
                </label>
                <input
                  type="text"
                  required
                  value={joinName}
                  onChange={(e) => setJoinName(e.target.value)}
                  placeholder="e.g. Fatou (Trader)"
                  className="w-full px-3.5 py-2 rounded-xl bg-stone-50 border border-stone-300 text-sm text-stone-900 focus:outline-none focus:border-emerald-700 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                  Lightning Address (lud16)
                </label>
                <input
                  type="text"
                  required
                  value={joinLnAddr}
                  onChange={(e) => setJoinLnAddr(e.target.value)}
                  placeholder="e.g. fatou@getalby.com"
                  className="w-full px-3.5 py-2 rounded-xl bg-stone-50 border border-stone-300 text-sm text-stone-900 focus:outline-none focus:border-emerald-700 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                  Nostr Public Key (npub)
                </label>
                <input
                  type="text"
                  value={joinNpub}
                  onChange={(e) => setJoinNpub(e.target.value)}
                  placeholder="npub1..."
                  className="w-full px-3.5 py-2 rounded-xl bg-stone-50 border border-stone-300 text-xs font-mono text-stone-900 focus:outline-none focus:border-emerald-700 focus:bg-white"
                />
              </div>

              {/* Late Joiner Catch-up Breakdown */}
              {isLateJoiner ? (
                <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs space-y-1.5">
                  <div className="font-bold text-amber-900 uppercase tracking-wider text-[11px]">
                    Late Joiner Catch-up Breakdown
                  </div>
                  <div className="flex justify-between text-stone-600">
                    <span>Turn #{circle?.currentTurn} Contribution:</span>
                    <span className="font-mono font-bold">{formatAmount(contributionSats)}</span>
                  </div>
                  {turnsElapsed > 0 && (
                    <div className="flex justify-between text-stone-600">
                      <span>Catch-Up Sats ({turnsElapsed} past turn{turnsElapsed > 1 ? 's' : ''}):</span>
                      <span className="font-mono font-bold text-amber-800">+{formatAmount(catchUpSats)}</span>
                    </div>
                  )}
                  {depositSats > 0 && (
                    <div className="flex justify-between text-stone-600">
                      <span>1x Escrow Deposit:</span>
                      <span className="font-mono font-bold text-stone-700">+{formatAmount(depositSats)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-emerald-900 font-bold pt-1 border-t border-amber-200 text-xs">
                    <span>Total Upfront Settlement:</span>
                    <span className="font-mono text-sm">{formatAmount(totalLateJoinerSats)}</span>
                  </div>
                  <p className="text-[10px] text-amber-800 leading-tight pt-1">
                    Your catch-up sats ({formatAmount(catchUpSats)}) will split equally to past turn collectors as claimable escrow.
                  </p>
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-stone-50 border border-stone-200 text-xs space-y-1">
                  <div className="flex justify-between text-stone-600">
                    <span>1x Escrow Deposit Required:</span>
                    <span className="font-mono font-bold text-stone-900">{formatAmount(depositSats)}</span>
                  </div>
                  <div className="flex justify-between text-stone-600">
                    <span>Turn Contribution:</span>
                    <span className="font-mono font-bold text-stone-900">{formatAmount(contributionSats)}</span>
                  </div>
                </div>
              )}

              {joinError && (
                <p className="text-xs text-rose-600 font-medium text-center">{joinError}</p>
              )}

              <button
                type="submit"
                disabled={isJoining}
                className="w-full py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white font-bold text-xs transition cursor-pointer shadow-xs disabled:opacity-50"
              >
                {isJoining ? 'Signing into Exercise Book...' : isLateJoiner ? `Confirm & Pay ${formatAmount(totalLateJoinerSats)}` : 'Confirm & Join Circle'}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
