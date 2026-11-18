import React, { useState } from 'react';
import { X, Shield, Clock, ArrowRight, ArrowLeft } from 'lucide-react';
import { useWallet } from '../context/WalletContext';
import { roscaService } from '../services/roscaService';

interface CreateCircleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (circleId: string) => void;
}

export const CreateCircleModal: React.FC<CreateCircleModalProps> = ({ isOpen, onClose, onCreated }) => {
  const { npub, formatAmount } = useWallet();
  const [step, setStep] = useState<1 | 2>(1);

  // Form State
  const [circleName, setCircleName] = useState('Dakar–Lagos Traders Ajo');
  const [hostName, setHostName] = useState('Tunde (Host)');
  const [contributionSats, setContributionSats] = useState('5000');
  const [cadenceSeconds, setCadenceSeconds] = useState('300'); // 5 mins demo by default
  const [maxMembers, setMaxMembers] = useState('3');
  const [requireDeposit, setRequireDeposit] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCreate = async () => {
    try {
      setIsSubmitting(true);
      setErrorMsg(null);

      const payload = {
        name: circleName,
        hostName,
        hostNpub: npub,
        contributionAmountSats: Number(contributionSats),
        turnDuration: Number(cadenceSeconds),
        maxMembers: Number(maxMembers),
        requireDeposit
      };

      const created = await roscaService.createCircle(payload);
      onCreated(created.id);
      onClose();
    } catch (err: any) {
      console.error('Circle creation error:', err);
      setErrorMsg(err.message || 'Failed to initialize AjoBook exercise book.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const parsedSats = Number(contributionSats) || 0;
  const totalPotSats = parsedSats * Number(maxMembers);
  const protocolFeeSats = Math.floor(totalPotSats * 0.005);
  const netPotSats = totalPotSats - protocolFeeSats;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#121824] border border-slate-800 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col">
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-600/20 text-blue-400 flex items-center justify-center font-bold text-sm">
              {step}
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">Create New Savings Circle</h3>
              <p className="text-xs text-slate-400">Step {step} of 2: {step === 1 ? 'Circle & Cadence' : 'Deposit & Pot Economics'}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4">
          
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Circle Title</label>
                <input
                  type="text"
                  value={circleName}
                  onChange={(e) => setCircleName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3.5 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                  placeholder="e.g. Dakar–Lagos Traders Ajo"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Host Display Name</label>
                <input
                  type="text"
                  value={hostName}
                  onChange={(e) => setHostName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3.5 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                  placeholder="e.g. Tunde (Host)"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-slate-300">
                    Contribution per Turn (Sats)
                  </label>
                  <span className="text-xs text-amber-400 font-mono font-semibold">
                    ≈ {formatAmount(parsedSats)}
                  </span>
                </div>
                <input
                  type="number"
                  min="500"
                  step="500"
                  value={contributionSats}
                  onChange={(e) => setContributionSats(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3.5 py-2 text-sm font-mono text-white focus:outline-none focus:border-amber-500"
                />
                {/* Quick Presets */}
                <div className="flex gap-2 mt-2">
                  {[2500, 5000, 10000, 25000].map((sats) => (
                    <button
                      key={sats}
                      type="button"
                      onClick={() => setContributionSats(String(sats))}
                      className="px-2.5 py-1 text-[11px] rounded-lg bg-slate-900 border border-slate-700 text-slate-300 hover:text-white hover:border-amber-500 transition cursor-pointer"
                    >
                      {sats.toLocaleString()} sats
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Target Members (2–10)</label>
                  <select
                    value={maxMembers}
                    onChange={(e) => setMaxMembers(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3.5 py-2 text-sm text-white focus:outline-none focus:border-amber-500 cursor-pointer"
                  >
                    {[2, 3, 4, 5, 6, 8, 10].map((n) => (
                      <option key={n} value={n}>{n} Members</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-blue-400" />
                    <span>Turn Cadence</span>
                  </label>
                  <select
                    value={cadenceSeconds}
                    onChange={(e) => setCadenceSeconds(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3.5 py-2 text-sm text-white focus:outline-none focus:border-amber-500 cursor-pointer"
                  >
                    <option value="300">Every 5 mins (Live Demo Mode)</option>
                    <option value="86400">Daily (Every 24 Hours)</option>
                    <option value="604800">Weekly (Every 7 Days)</option>
                    <option value="2592000">Monthly (Every 30 Days)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-blue-600/10 border border-blue-500/20 space-y-2">
                <div className="flex justify-between text-xs text-slate-300">
                  <span>Gross Pot per Turn:</span>
                  <span className="font-semibold text-white font-mono">{formatAmount(totalPotSats)}</span>
                </div>
                <div className="flex justify-between text-xs text-slate-300">
                  <span>Protocol Fee (0.5%):</span>
                  <span className="text-amber-400 font-mono">-{formatAmount(protocolFeeSats)}</span>
                </div>
                <div className="pt-2 border-t border-slate-700 flex justify-between text-sm font-bold text-white">
                  <span>Net Payout to Turn Collector:</span>
                  <span className="text-emerald-400 font-mono">{formatAmount(netPotSats)}</span>
                </div>
              </div>

              {/* 1x Security Deposit Escrow Toggle */}
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-emerald-400" />
                    <div>
                      <h4 className="text-xs font-semibold text-white">Require 1x Security Deposit</h4>
                      <p className="text-[11px] text-slate-400">Deducts automatically if a member misses a turn to protect the collector.</p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={requireDeposit}
                    onChange={(e) => setRequireDeposit(e.target.checked)}
                    className="w-4 h-4 rounded text-amber-500 focus:ring-0 bg-slate-800 border-slate-700 cursor-pointer"
                  />
                </div>

                {requireDeposit && (
                  <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-300">
                    Each member deposits <span className="font-bold">{formatAmount(parsedSats)}</span> upon joining. Unused deposits refund automatically when the circle completes.
                  </div>
                )}
              </div>

              <div className="flex justify-between items-center text-xs text-slate-400 px-1">
                <span>Settlement Rail:</span>
                <span className="text-amber-400 font-mono font-medium">Bitcoin Lightning (BOLT11 &amp; NWC)</span>
              </div>

              {errorMsg && (
                <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 p-2.5 rounded-lg">
                  {errorMsg}
                </p>
              )}
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-900/50 flex items-center justify-between">
          {step === 1 ? (
            <>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => setStep(2)}
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 transition cursor-pointer"
              >
                <span>Continue to Economics</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>
              <button
                type="button"
                onClick={handleCreate}
                disabled={isSubmitting}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 transition cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? 'Signing on Nostr...' : 'Open Exercise Book'}
              </button>
            </>
          )}
        </div>

      </div>
    </div>
  );
};
