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

/**
 * Decodes bytes32 ASCII processor names (e.g. 0x4c41474f535f41524d0000...) into readable string (LAGOS_ARM)
 * or displays a clean TapeOut label without overflow.
 */
function formatProcessorLabel(raw: string | undefined): string {
  if (!raw || raw === '0x' || raw === '0x0000000000000000000000000000000000000000000000000000000000000000') {
    return 'TapeOut Verified';
  }
  if (raw.startsWith('0x')) {
    try {
      let str = '';
      for (let i = 2; i < raw.length; i += 2) {
        const code = parseInt(raw.substring(i, i + 2), 16);
        if (code === 0) break;
        if (code >= 32 && code <= 126) {
          str += String.fromCharCode(code);
        }
      }
      if (str.trim().length > 0 && str.trim().length <= 20) return str.trim();
    } catch {}
    return `${raw.substring(0, 6)}...${raw.substring(raw.length - 4)}`;
  }
  return raw;
}

export const CircleCard: React.FC<CircleCardProps> = ({ circle, onSelect }) => {
  const potSize = circle.contributionAmount * (circle.currentMembers || circle.maxMembers);
  const netPot = potSize * 0.995; // 0.5% protocol fee

  const statusBadge = {
    OPEN: { bg: 'bg-amber-500/10', border: 'border-amber-500/25', text: 'text-amber-400', label: 'Forming (Book Open)' },
    ACTIVE: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/25', text: 'text-emerald-400', label: `Turn ${circle.currentTurn} Active` },
    COMPLETED: { bg: 'bg-blue-500/10', border: 'border-blue-500/25', text: 'text-blue-400', label: 'Completed' },
  }[circle.status];

  const cadenceLabel = circle.turnDuration === 300 ? '5 Mins (Demo)' :
    circle.turnDuration === 86400 ? 'Daily' :
    circle.turnDuration === 604800 ? 'Weekly' : 'Monthly';

  const processorDisplay = formatProcessorLabel(circle.tapeOutProcessor);

  return (
    <div className="bg-[#0e1626] border border-slate-800/90 hover:border-emerald-500/40 hover:shadow-xl hover:shadow-emerald-950/20 rounded-2xl p-5 transition-all group flex flex-col justify-between relative overflow-hidden border-l-4 border-l-rose-500/40">
      <div>
        {/* Header Badges with zero overflow */}
        <div className="flex items-center justify-between gap-2 mb-3.5">
          <span className={`whitespace-nowrap rounded-full px-3 py-1 text-[11px] font-semibold border ${statusBadge.bg} ${statusBadge.border} ${statusBadge.text} flex-shrink-0`}>
            {statusBadge.label}
          </span>
          <span
            className="flex items-center gap-1 text-[11px] font-mono text-slate-300 bg-slate-900/90 px-2 py-0.5 rounded-full border border-slate-700/80 max-w-[130px] truncate flex-shrink-0"
            title={circle.tapeOutProcessor || 'TapeOut Verified'}
          >
            <Cpu className="w-3 h-3 text-emerald-400 flex-shrink-0" />
            <span className="truncate">{processorDisplay}</span>
          </span>
        </div>

        {/* Title & Host in Nigerian Exercise Book Style */}
        <div className="flex items-start gap-2 mb-1.5">
          <BookOpen className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
          <h3 className="text-base font-bold text-white group-hover:text-emerald-400 transition leading-snug">
            {circle.name}
          </h3>
        </div>
        {circle.hostName && (
          <p className="text-xs text-slate-400 mb-3 flex items-center gap-1.5">
            <span className="text-slate-500">Host:</span>
            <span className="font-serif italic text-amber-300/90 font-medium">{circle.hostName}</span>
          </p>
        )}

        <p className="text-[11px] text-slate-500 font-mono mb-4">
          {circle.address.substring(0, 10)}...{circle.address.substring(circle.address.length - 8)}
        </p>

        {/* Metrics Grid with Exercise Book Ledger lines */}
        <div className="grid grid-cols-2 gap-2.5 p-3.5 rounded-xl bg-slate-900/70 border border-slate-800/80 mb-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-800/60">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Contribution</span>
            <span className="text-base font-extrabold text-white font-mono">{circle.contributionAmount} USDT</span>
            <span className="text-[10px] text-slate-500 block">per turn</span>
          </div>
          <div className="pt-2 sm:pt-0 sm:pl-3">
            <span className="text-[10px] uppercase font-bold text-emerald-400/90 block tracking-wider">Pot / Turn</span>
            <span className="text-base font-extrabold text-emerald-400 font-mono">{netPot} USDT</span>
            <span className="text-[10px] text-slate-500 block">after 0.5% protocol</span>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-slate-300 px-1 mb-4">
          <div className="flex items-center gap-1.5 text-slate-300 font-medium">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span>{cadenceLabel}</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-300 font-medium">
            <Users className="w-3.5 h-3.5 text-emerald-400" />
            <span>{circle.currentMembers} signed</span>
          </div>
        </div>

        {circle.requireDeposit && (
          <div className="mb-4 px-2.5 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[10px] text-emerald-300 font-medium flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
            <span>1x Security Deposit Protected ({circle.contributionAmount} USDT)</span>
          </div>
        )}
      </div>

      {/* Action Footer */}
      <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
        <div className="flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>0% Human Custody</span>
        </div>
        <button
          onClick={() => onSelect(circle.address)}
          className="flex items-center gap-1 text-xs font-bold text-emerald-400 hover:text-emerald-300 transition group-hover:translate-x-0.5 cursor-pointer"
        >
          <span>Open Exercise Book</span>
          <ArrowUpRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
