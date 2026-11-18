import { useState } from 'react';
import { X, ArrowRight, ArrowLeft } from 'lucide-react';
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
  const [hostName, setHostName] = useState('Aminata (Host)');
  const [contributionSats, setContributionSats] = useState('5000');
  const [cadenceSeconds, setCadenceSeconds] = useState('300'); // 5 mins demo by default
  const [maxMembers, setMaxMembers] = useState('3');
  const [requireDeposit, setRequireDeposit] = useState(true);
  const [isOpenForLateJoiners, setIsOpenForLateJoiners] = useState(true);
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
        requireDeposit,
        isOpenForLateJoiners
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white border border-stone-200 rounded-2xl w-full max-w-xl overflow-hidden shadow-xl flex flex-col text-stone-900">
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-stone-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-sm">
              {step}
            </div>
            <div>
              <h3 className="text-base font-bold text-stone-900 font-heading">Host New Savings Circle</h3>
              <p className="text-xs text-stone-500">Step {step} of 2: {step === 1 ? 'Exercise Book & Cadence' : 'Deposit & Pot Economics'}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-stone-400 hover:text-stone-900 hover:bg-stone-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4">
          {step === 1 ? (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                  Exercise Book Title / Circle Name
                </label>
                <input
                  type="text"
                  value={circleName}
                  onChange={(e) => setCircleName(e.target.value)}
                  placeholder="e.g. Dakar Market Women ROSCA"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-stone-50 border border-stone-300 text-sm text-stone-900 placeholder-stone-400 focus:outline-none focus:border-emerald-700 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                    Your Host Name
                  </label>
                  <input
                    type="text"
                    value={hostName}
                    onChange={(e) => setHostName(e.target.value)}
                    placeholder="e.g. Aminata"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-stone-50 border border-stone-300 text-sm text-stone-900 focus:outline-none focus:border-emerald-700 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                    Total Members
                  </label>
                  <select
                    value={maxMembers}
                    onChange={(e) => setMaxMembers(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-stone-50 border border-stone-300 text-sm text-stone-900 focus:outline-none focus:border-emerald-700 focus:bg-white"
                  >
                    <option value="3">3 Members (Recommended for Demo)</option>
                    <option value="4">4 Members</option>
                    <option value="5">5 Members</option>
                    <option value="6">6 Members</option>
                    <option value="10">10 Members</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                  Turn Cadence (Payment Interval)
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { label: '5 Mins', value: '300', note: 'Fast Demo' },
                    { label: 'Daily', value: '86400', note: '24 Hours' },
                    { label: 'Weekly', value: '604800', note: '7 Days' },
                    { label: 'Monthly', value: '2592000', note: '30 Days' },
                  ].map((cad) => (
                    <button
                      key={cad.value}
                      type="button"
                      onClick={() => setCadenceSeconds(cad.value)}
                      className={`p-2.5 rounded-xl border text-center transition cursor-pointer ${
                        cadenceSeconds === cad.value
                          ? 'bg-emerald-50 border-emerald-700 text-emerald-900 font-bold'
                          : 'bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100'
                      }`}
                    >
                      <span className="block text-xs font-bold">{cad.label}</span>
                      <span className="text-[10px] text-stone-400 block">{cad.note}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                  Round Contribution Amount (Satoshis)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={contributionSats}
                    onChange={(e) => setContributionSats(e.target.value)}
                    placeholder="5000"
                    className="w-full pl-3.5 pr-20 py-2.5 rounded-xl bg-stone-50 border border-stone-300 text-sm font-mono text-stone-900 focus:outline-none focus:border-emerald-700 focus:bg-white"
                  />
                  <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-xs font-bold text-stone-500 font-mono">
                    SATS
                  </div>
                </div>
                <p className="text-xs text-stone-500 mt-1">
                  Equivalent to {formatAmount(parsedSats)} per member per turn.
                </p>
              </div>

              {/* Deposit Safeguard Toggle */}
              <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200 flex items-start gap-3">
                <input
                  type="checkbox"
                  id="requireDeposit"
                  checked={requireDeposit}
                  onChange={(e) => setRequireDeposit(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-stone-300 text-emerald-700 focus:ring-emerald-600 cursor-pointer"
                />
                <label htmlFor="requireDeposit" className="text-xs cursor-pointer">
                  <span className="font-bold text-stone-900 block">Require 1x Escrow Deposit Safeguard</span>
                  <span className="text-stone-500 block leading-relaxed">
                    Members lock 1 turn worth of sats upfront. If a participant defaults, their escrow is slashed into the communal pot so the round recipient is never shortchanged.
                  </span>
                </label>
              </div>

              {/* Keep Registration Open for Late Joiners */}
              <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200 flex items-start gap-3">
                <input
                  type="checkbox"
                  id="isOpenForLateJoiners"
                  checked={isOpenForLateJoiners}
                  onChange={(e) => setIsOpenForLateJoiners(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-stone-300 text-emerald-700 focus:ring-emerald-600 cursor-pointer"
                />
                <label htmlFor="isOpenForLateJoiners" className="text-xs cursor-pointer">
                  <span className="font-bold text-stone-900 block">Keep Registration Open for Late Joiners</span>
                  <span className="text-stone-500 block leading-relaxed">
                    Allows newcomers to enter mid-cycle. Late joiners pay regular contribution + catch-up sats (1x elapsed turns) which are split equally to past turn collectors.
                  </span>
                </label>
              </div>

              {/* Pot Summary Card */}
              <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200 space-y-2 text-xs">
                <span className="font-bold text-emerald-900 uppercase tracking-wider block">Round Pot Economics</span>
                <div className="flex justify-between text-stone-600">
                  <span>Gross Pot ({maxMembers} members):</span>
                  <span className="font-mono font-bold text-stone-900">{formatAmount(totalPotSats)}</span>
                </div>
                <div className="flex justify-between text-stone-600">
                  <span>Autonomous Protocol Fee (0.5%):</span>
                  <span className="font-mono text-stone-500">-{formatAmount(protocolFeeSats)}</span>
                </div>
                <div className="flex justify-between text-emerald-900 font-bold pt-1 border-t border-emerald-200">
                  <span>Net Disbursed to Turn Recipient:</span>
                  <span className="font-mono text-base">{formatAmount(netPotSats)}</span>
                </div>
              </div>
            </div>
          )}

          {errorMsg && (
            <p className="text-xs text-rose-600 font-medium text-center">{errorMsg}</p>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-stone-50 border-t border-stone-200 flex items-center justify-between">
          {step === 2 ? (
            <button
              type="button"
              onClick={() => setStep(1)}
              className="px-4 py-2 rounded-xl border border-stone-300 text-stone-700 text-xs font-semibold hover:bg-stone-100 transition cursor-pointer flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
          ) : (
            <div />
          )}

          {step === 1 ? (
            <button
              type="button"
              onClick={() => setStep(2)}
              className="px-5 py-2.5 rounded-xl bg-stone-900 hover:bg-emerald-800 text-white text-xs font-bold transition cursor-pointer flex items-center gap-1.5"
            >
              <span>Next: Pot Economics</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleCreate}
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white text-xs font-bold transition cursor-pointer shadow-xs disabled:opacity-50"
            >
              {isSubmitting ? 'Initializing Circle...' : 'Open Exercise Book'}
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
