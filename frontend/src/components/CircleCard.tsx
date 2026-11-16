import React from 'react';
import { Users, Clock, ArrowUpRight, ShieldCheck, Cpu, BookOpen } from 'lucide-react';

export interface CircleData {
  address: string;
  name: string;
  hostName?: string;
  contributionAmount: number; // in USDT
  turnDuration: number;       // in seconds
  maxMembers: number;
  currentMembers: number;
  currentTurn: number;
  status: 'OPEN' | 'ACTIVE' | 'COMPLETED';
  requireDeposit: boolean;
  tapeOutProcessor: string;
}

interface CircleCardProps {
  circle: CircleData;
  onSelect: (circleAddress: string) => void;
}

export const CircleCard: React.FC<CircleCardProps> = ({ circle, onSelect }) => {
  const potSize = circle.contributionAmount * (circle.currentMembers || circle.maxMembers);
  const netPot = potSize * 0.995; // 0.5% protocol fee

  const statusBadge = {
    OPEN: { bg: 'bg-amber-500/10', border: 'border-amber-500/20', text: 'text-amber-400', label: 'Forming (Book Open)' },
    ACTIVE: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', text: 'text-emerald-400', label: `Turn ${circle.currentTurn} Active` },
    COMPLETED: { bg: 'bg-blue-500/10', border: 'border-blue-500/20', text: 'text-blue-400', label: 'Completed' },
  }[circle.status];

  const cadenceLabel = circle.turnDuration === 300 ? '5 Mins (Demo)' :
    circle.turnDuration === 86400 ? 'Daily' :
    circle.turnDuration === 604800 ? 'Weekly' : 'Monthly';

  return (
    <div className="bg-[#121824] border border-slate-800 hover:border-slate-700 rounded-2xl p-5 shadow-lg transition-all group flex flex-col justify-between">
      <div>
        {/* Header Badges */}
        <div className="flex items-center justify-between mb-3">
          <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border ${statusBadge.bg} ${statusBadge.border} ${statusBadge.text}`}>
            {statusBadge.label}
          </span>
          <span className="flex items-center gap-1 text-[11px] font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
            <Cpu className="w-3 h-3 text-blue-400" />
            {circle.tapeOutProcessor || 'X_LAYER'}
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
          <p className="text-xs text-slate-400 mb-3">Host: {circle.hostName}</p>
        )}

        <p className="text-xs text-slate-400 font-mono mb-4">
          {circle.address.substring(0, 10)}...{circle.address.substring(circle.address.length - 8)}
        </p>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 gap-2.5 p-3 rounded-xl bg-slate-900/80 border border-slate-800/80 mb-4">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-500 block">Contribution</span>
            <span className="text-sm font-semibold text-white">{circle.contributionAmount} USDT</span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-500 block">Pot / Turn</span>
            <span className="text-sm font-semibold text-emerald-400">{netPot} USDT</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-300">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>{cadenceLabel}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-300">
            <Users className="w-3.5 h-3.5 text-slate-400" />
            <span>{circle.currentMembers} signed</span>
          </div>
        </div>

        {circle.requireDeposit && (
          <div className="mb-4 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[10px] text-emerald-400 font-medium">
            1x Security Deposit Protected ({circle.contributionAmount} USDT)
          </div>
        )}
      </div>

      {/* Action Footer */}
      <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
        <div className="flex items-center gap-1 text-[11px] text-emerald-400">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Zero Admin Keys</span>
        </div>
        <button
          onClick={() => onSelect(circle.address)}
          className="flex items-center gap-1 text-xs font-semibold text-blue-400 hover:text-blue-300 transition group-hover:translate-x-0.5"
        >
          <span>Open Exercise Book</span>
          <ArrowUpRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
