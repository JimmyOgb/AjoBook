import React from 'react';
import { Users, Clock, ArrowUpRight, ShieldCheck, Zap, BookOpen } from 'lucide-react';
import { useWallet } from '../context/WalletContext';

export interface CircleData {
  address?: string;
  id?: string;
  name: string;
  hostName?: string;
  contributionAmount: number; // in Sats
  turnDuration: number;       // in seconds
  maxMembers: number;
  currentMembers: number;
  currentTurn: number;
  status: 'OPEN' | 'ACTIVE' | 'COMPLETED';
  requireDeposit: boolean;
}

interface CircleCardProps {
  circle: CircleData;
  onSelect: (circleId: string) => void;
}

export const CircleCard: React.FC<CircleCardProps> = ({ circle, onSelect }) => {
  const { formatAmount } = useWallet();

  const circleKey = circle.id || circle.address || '';
  const potSizeSats = circle.contributionAmount * (circle.currentMembers || circle.maxMembers);
  const netPotSats = Math.floor(potSizeSats * 0.995); // 0.5% protocol fee

  const statusBadge = {
    OPEN: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-800', label: 'Forming (Book Open)' },
    ACTIVE: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-800', label: `Round ${circle.currentTurn} Active` },
    COMPLETED: { bg: 'bg-stone-100', border: 'border-stone-200', text: 'text-stone-700', label: 'Completed' },
  }[circle.status];

  const cadenceLabel = circle.turnDuration === 300 ? '5 Mins (Demo)' :
    circle.turnDuration === 86400 ? 'Daily' :
    circle.turnDuration === 604800 ? 'Weekly' : 'Monthly';

  return (
    <div className="bg-white border border-stone-200 hover:border-emerald-700/60 hover:shadow-md rounded-2xl p-5 transition-all group flex flex-col justify-between relative overflow-hidden border-l-4 border-l-emerald-700">
      <div>
        {/* Header Badges */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <span className={`whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold border ${statusBadge.bg} ${statusBadge.border} ${statusBadge.text}`}>
            {statusBadge.label}
          </span>
          <span className="flex items-center gap-1 text-[11px] font-mono text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
            <Zap className="w-3 h-3 fill-emerald-700 text-emerald-700" />
            <span>Lightning Pot</span>
          </span>
        </div>

        {/* Title & Host */}
        <div className="flex items-start gap-2 mb-1">
          <BookOpen className="w-4 h-4 text-emerald-800 mt-1 shrink-0" />
          <h3 className="text-base font-bold text-stone-900 group-hover:text-emerald-800 transition leading-snug font-heading">
            {circle.name}
          </h3>
        </div>
        {circle.hostName && (
          <p className="text-xs text-stone-500 mb-3 flex items-center gap-1">
            <span>Organizer:</span>
            <span className="font-semibold text-stone-800">{circle.hostName}</span>
          </p>
        )}

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 gap-2.5 p-3.5 rounded-xl bg-stone-50 border border-stone-200 mb-3.5 divide-x divide-stone-200">
          <div>
            <span className="text-[10px] uppercase font-bold text-stone-500 block tracking-wider">Contribution</span>
            <span className="text-base font-extrabold text-stone-900 font-mono">{formatAmount(circle.contributionAmount)}</span>
            <span className="text-[10px] text-stone-400 block">per round</span>
          </div>
          <div className="pl-3">
            <span className="text-[10px] uppercase font-bold text-emerald-800 block tracking-wider">Pot / Round</span>
            <span className="text-base font-extrabold text-emerald-800 font-mono">{formatAmount(netPotSats)}</span>
            <span className="text-[10px] text-stone-400 block">net disbursement</span>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-stone-600 px-1 mb-3.5">
          <div className="flex items-center gap-1.5 font-medium">
            <Clock className="w-3.5 h-3.5 text-stone-400" />
            <span>{cadenceLabel}</span>
          </div>
          <div className="flex items-center gap-1.5 font-medium">
            <Users className="w-3.5 h-3.5 text-stone-400" />
            <span>{circle.currentMembers} / {circle.maxMembers} signed in</span>
          </div>
        </div>

        {circle.requireDeposit && (
          <div className="p-2 rounded-lg bg-emerald-50/70 border border-emerald-200 text-[11px] text-emerald-800 flex items-center gap-1.5 mb-4">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
            <span>1x Escrow Deposit Safeguard Enabled</span>
          </div>
        )}
      </div>

      <button
        onClick={() => onSelect(circleKey)}
        className="w-full py-2.5 px-4 rounded-xl bg-stone-900 hover:bg-emerald-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer shadow-xs"
      >
        <span>Open Exercise Book</span>
        <ArrowUpRight className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
