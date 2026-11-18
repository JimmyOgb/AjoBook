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
    OPEN: { bg: 'bg-amber-500/10', border: 'border-amber-500/20', text: 'text-amber-400', label: 'Forming (Open)' },
    ACTIVE: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', text: 'text-emerald-400', label: `Round ${circle.currentTurn} Active` },
    COMPLETED: { bg: 'bg-blue-500/10', border: 'border-blue-500/20', text: 'text-blue-400', label: 'Completed' },
  }[circle.status];

  const cadenceLabel = circle.turnDuration === 300 ? '5 Mins (Demo)' :
    circle.turnDuration === 86400 ? 'Daily' :
    circle.turnDuration === 604800 ? 'Weekly' : 'Monthly';

  return (
    <div className="bg-[#121824] border border-slate-800 hover:border-slate-700 rounded-2xl p-5 shadow-lg transition-all group flex flex-col justify-between">
      <div>
        {/* Header Badges */}
        <div className="flex items-center justify-between gap-2 mb-3.5">
          <span className={`whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold border ${statusBadge.bg} ${statusBadge.border} ${statusBadge.text}`}>
            {statusBadge.label}
          </span>
          <span className="flex items-center gap-1 text-[11px] font-mono text-amber-300 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
            <Zap className="w-3 h-3 fill-amber-400" />
            <span>Lightning Pot</span>
          </span>
        </div>

        {/* Title & Host */}
        <div className="flex items-start gap-2 mb-1">
          <BookOpen className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
          <h3 className="text-base font-bold text-white group-hover:text-blue-400 transition">
            {circle.name}
          </h3>
        </div>
        {circle.hostName && (
          <p className="text-xs text-slate-400 mb-2">Host: {circle.hostName}</p>
        )}

        <p className="text-xs text-slate-500 font-mono mb-4">
          {circleKey.length > 20 ? `${circleKey.substring(0, 10)}...${circleKey.substring(circleKey.length - 8)}` : circleKey}
        </p>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 gap-2.5 p-3 rounded-xl bg-slate-900/80 border border-slate-800/80 mb-4">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-500 block">Contribution</span>
            <span className="text-sm font-semibold text-white font-mono">{formatAmount(circle.contributionAmount)}</span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-500 block">Pot / Round</span>
            <span className="text-sm font-semibold text-emerald-400 font-mono">{formatAmount(netPotSats)}</span>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-slate-300 mb-4">
          <div className="flex items-center gap-1.5 text-slate-400">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>{cadenceLabel}</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-400">
            <Users className="w-3.5 h-3.5 text-slate-400" />
            <span>{circle.currentMembers} joined</span>
          </div>
        </div>

        {circle.requireDeposit && (
          <div className="mb-4 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[10px] text-emerald-400 font-medium flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
            <span>1x Escrow Deposit Protected ({formatAmount(circle.contributionAmount)})</span>
          </div>
        )}
      </div>

      {/* Action Footer */}
      <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
        <div className="flex items-center gap-1 text-[11px] text-emerald-400">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>0% Human Custody</span>
        </div>
        <button
          onClick={() => onSelect(circleKey)}
          className="flex items-center gap-1 text-xs font-semibold text-blue-400 hover:text-blue-300 transition group-hover:translate-x-0.5 cursor-pointer"
        >
          <span>Open Circle</span>
          <ArrowUpRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
