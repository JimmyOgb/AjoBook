import React, { useState } from 'react';
import { useAccount, useWriteContract } from 'wagmi';
import { X, Shield, Cpu, ArrowRight, ArrowLeft, Sparkles, Clock, UserCheck } from 'lucide-react';
import { AjoFactoryAbi } from '../contracts/abis';
import deployments from '../config/deployments.json';

interface CreateCircleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (circleAddress: string) => void;
}

export const CreateCircleModal: React.FC<CreateCircleModalProps> = ({ isOpen, onClose, onCreated }) => {
  const { address } = useAccount();
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Form State
  const [circleName, setCircleName] = useState('Lagos Tech Founders Ajo');
  const [hostName, setHostName] = useState('Tunde (Host)');
  const [contribution, setContribution] = useState('100'); // USDT
  const [cadenceSeconds, setCadenceSeconds] = useState('300'); // 5 mins demo by default
  const [maxMembers, setMaxMembers] = useState('4');
  const [requireDeposit, setRequireDeposit] = useState(true);
  const [circuitId, setCircuitId] = useState(deployments.tapeOutCircuitId);
  const [processor, setProcessor] = useState('LAGOS_ARM');
  const [containerAddr, setContainerAddr] = useState(deployments.tapeOutContainer);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { writeContractAsync } = useWriteContract();

  if (!isOpen) return null;

  const handleCreate = async () => {
    if (!address) return;
    try {
      setIsSubmitting(true);
      setErrorMsg(null);

      const contributionAmount = BigInt(Math.floor(parseFloat(contribution) * 1e6));
      const turnDuration = BigInt(cadenceSeconds);
      const membersCount = BigInt(maxMembers);
      const protocolFeeBps = BigInt(50); // 0.5%
      const feeCollector = address;

      // Convert processor string to bytes32
      const encoder = new TextEncoder();
      const bytes = encoder.encode(processor.padEnd(32, '\0')).slice(0, 32);
      const processorBytes32 = ('0x' + Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('')) as `0x${string}`;

      const tx = await writeContractAsync({
        address: deployments.factory as `0x${string}`,
        abi: AjoFactoryAbi,
        functionName: 'createCircle',
        args: [
          circleName,
          hostName,
          deployments.usdt as `0x${string}`,
          contributionAmount,
          turnDuration,
          membersCount,
          requireDeposit,
          protocolFeeBps,
          feeCollector,
          (circuitId || '0x0000000000000000000000000000000000000000000000000000000000000000') as `0x${string}`,
          processorBytes32,
          (containerAddr || '0x0000000000000000000000000000000000000000') as `0x${string}`,
        ],
      });

      console.log('Circle created on X Layer:', tx);
      onCreated(deployments.seedCircle);
      onClose();
    } catch (err: any) {
      console.error('Failed to create circle:', err);
      setErrorMsg(err?.shortMessage || err?.message || 'Transaction rejected');
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalPot = parseFloat(contribution || '0') * parseInt(maxMembers || '4');
  const protocolFee = (totalPot * 0.005).toFixed(2);
  const netPot = (totalPot - parseFloat(protocolFee)).toFixed(2);

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
              <h3 className="text-base font-semibold text-white">Create New Ajo Exercise Book</h3>
              <p className="text-xs text-slate-400">Step {step} of 3: {step === 1 ? 'Exercise Book & Cadence' : step === 2 ? 'Deposit & Pot Economics' : 'TapeOut Protocol Binding'}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4">
          
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Circle Title (Exercise Book Name)</label>
                <input
                  type="text"
                  value={circleName}
                  onChange={(e) => setCircleName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3.5 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  placeholder="e.g. Lagos Tech Founders Ajo"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Host Display Name</label>
                <input
                  type="text"
                  value={hostName}
                  onChange={(e) => setHostName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3.5 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  placeholder="e.g. Tunde (Host)"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Contribution per Turn (USDT)</label>
                  <input
                    type="number"
                    min="10"
                    step="10"
                    value={contribution}
                    onChange={(e) => setContribution(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3.5 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Target Members (2–50)</label>
                  <input
                    type="number"
                    min="2"
                    max="50"
                    value={maxMembers}
                    onChange={(e) => setMaxMembers(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3.5 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-blue-400" />
                  <span>Turn Cadence / Frequency</span>
                </label>
                <select
                  value={cadenceSeconds}
                  onChange={(e) => setCadenceSeconds(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3.5 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="300">Every 5 mins (Live Demo Mode)</option>
                  <option value="86400">Daily (Every 24 Hours)</option>
                  <option value="604800">Weekly (Every 7 Days)</option>
                  <option value="2592000">Monthly (Every 30 Days)</option>
                </select>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-blue-600/10 border border-blue-500/20 space-y-2">
                <div className="flex justify-between text-xs text-slate-300">
                  <span>Gross Pot per Turn:</span>
                  <span className="font-semibold text-white">{totalPot.toLocaleString()} USDT</span>
                </div>
                <div className="flex justify-between text-xs text-slate-300">
                  <span>Protocol Fee (0.5%):</span>
                  <span className="text-amber-400">-{protocolFee} USDT</span>
                </div>
                <div className="pt-2 border-t border-slate-700 flex justify-between text-sm font-bold text-white">
                  <span>Net Payout to Turn Collector:</span>
                  <span className="text-emerald-400">{netPot} USDT</span>
                </div>
              </div>

              {/* 1x Security Deposit Toggle */}
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
                    className="w-4 h-4 rounded text-blue-600 focus:ring-0 bg-slate-800 border-slate-700"
                  />
                </div>

                {requireDeposit && (
                  <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-300">
                    Each member deposits <span className="font-bold">{contribution} USDT</span> upon joining. Unused deposits refund automatically when the circle completes.
                  </div>
                )}
              </div>

              <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 flex items-center gap-2 text-xs text-slate-300">
                <UserCheck className="w-4 h-4 text-blue-400" />
                <span>Members join in order. Host starts the circle once &ge; 2 members join.</span>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-300 flex items-start gap-2">
                <Cpu className="w-4 h-4 text-indigo-400 flex-shrink-0 mt-0.5" />
                <span>Link this circle to an on-chain TapeOut Boolean Circuit NFT for non-custodial gate checks.</span>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">TapeOut Circuit Netlist ID (SHA-256)</label>
                <input
                  type="text"
                  value={circuitId}
                  onChange={(e) => setCircuitId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-slate-300 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Processor / Region</label>
                  <input
                    type="text"
                    value={processor}
                    onChange={(e) => setProcessor(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-slate-300 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Container Address</label>
                  <input
                    type="text"
                    value={containerAddr}
                    onChange={(e) => setContainerAddr(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-slate-300 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
              {errorMsg}
            </div>
          )}

        </div>

        {/* Modal Footer Controls */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-900/50 flex items-center justify-between">
          {step > 1 ? (
            <button
              onClick={() => setStep((s) => (s - 1) as any)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-slate-400 hover:text-white text-xs font-medium transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
          ) : <div />}

          {step < 3 ? (
            <button
              onClick={() => setStep((s) => (s + 1) as any)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-600/20 transition"
            >
              <span>Next</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              onClick={handleCreate}
              disabled={isSubmitting}
              className="flex items-center gap-1.5 px-5 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-lg shadow-blue-600/30 transition disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Deploying on X Layer...' : 'Deploy Exercise Book'}</span>
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
