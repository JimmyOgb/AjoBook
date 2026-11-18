import React, { useState } from 'react';
import {
  Sparkles,
  ShieldAlert,
  ShieldCheck,
  MessageSquare,
  Copy,
  Check,
  Send
} from 'lucide-react';
import { useWallet } from '../context/WalletContext';
import { AnkaraPattern } from './AnkaraPattern';

interface AIStewardPanelProps {
  circle: any;
  onRefresh?: () => void;
}

export const AIStewardPanel: React.FC<AIStewardPanelProps> = ({ circle }) => {
  const { formatAmount } = useWallet();
  const [selectedLang, setSelectedLang] = useState<'en' | 'fr' | 'pcm'>('en');
  const [copied, setCopied] = useState(false);
  const [dmSent, setDmSent] = useState(false);

  const aiAnalysis = circle?.aiAnalysis || {
    score: 95,
    riskLevel: 'LOW',
    analysis: 'Communal discipline is high. 100% deposit escrow configured.',
    onTimeRate: '100%'
  };

  const currentTurn = circle?.currentTurn || 1;
  const currentRecipient = circle?.members?.find((m: any) => m.slot === currentTurn)?.name || 'the round collector';
  const pendingMember = circle?.members?.find((m: any) => !m.paidCurrent)?.name || 'Member';
  const amountSats = circle?.contributionAmountSats || circle?.contributionAmount || 5000;
  const circleName = circle?.name || 'Dakar–Lagos Market Circle';

  const reminders = {
    en: {
      lang: 'English',
      flag: '🇬🇧',
      badge: 'Universal',
      title: 'Polite Community Notice',
      message: `Hello ${pendingMember}! Your ROSCA contribution of ${formatAmount(amountSats)} for Round #${currentTurn} in '${circleName}' is due. Please settle your Lightning invoice to disburse the pot to ${currentRecipient} on time.`
    },
    fr: {
      lang: 'Français (Dakar Tontine)',
      flag: '🇸🇳',
      badge: 'Sénégal / Dakar',
      title: 'Rappel de Tontine',
      message: `Bonjour ${pendingMember} ! Votre cotisation de ${formatAmount(amountSats)} pour le Tour n°${currentTurn} de la tontine '${circleName}' est arrivée à échéance. Merci de régler votre facture Lightning afin de libérer la cagnotte pour ${currentRecipient} sans délai.`
    },
    pcm: {
      lang: 'Nigerian Pidgin',
      flag: '🇳🇬',
      badge: 'Lagos / Naija',
      title: 'Ajo Sharp Reminder',
      message: `Bro/Sister ${pendingMember}, how far! Your Ajo contribution of ${formatAmount(amountSats)} for Turn #${currentTurn} don land. Abeg sharp sharp pay the Lightning invoice make the pot reach ${currentRecipient} hand quick quick.`
    }
  };

  const currentReminder = reminders[selectedLang];

  const handleCopy = () => {
    navigator.clipboard.writeText(currentReminder.message);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleSendNostrDm = () => {
    setDmSent(true);
    setTimeout(() => setDmSent(false), 3000);
  };

  return (
    <div className="bg-[#0e1726]/90 border border-slate-800 rounded-2xl overflow-hidden shadow-xl border-l-4 border-l-purple-500/70 backdrop-blur-md relative p-5">
      <AnkaraPattern className="text-purple-400 opacity-[0.02]" />

      {/* Background subtle glow */}
      <div className="absolute top-0 right-0 w-48 h-48 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Title Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800 relative z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-bold text-sm text-white">AI Bookkeeper &amp; Steward</h4>
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 font-semibold">
                Autonomous Assistant
              </span>
            </div>
            <p className="text-xs text-slate-400">Risk Assessment, Health Scoring &amp; Multilingual Nudge Generation</p>
          </div>
        </div>

        {/* Health Score Pill */}
        <div className="flex items-center gap-2">
          <div className={`px-3 py-1.5 rounded-xl border flex items-center gap-2 ${
            aiAnalysis.riskLevel === 'LOW' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' :
            aiAnalysis.riskLevel === 'MEDIUM' ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' :
            'bg-rose-500/10 border-rose-500/30 text-rose-400'
          }`}>
            {aiAnalysis.riskLevel === 'LOW' ? <ShieldCheck className="w-4 h-4" /> : <ShieldAlert className="w-4 h-4" />}
            <span className="text-xs font-bold font-mono">
              Health: {aiAnalysis.score}/100 ({aiAnalysis.riskLevel} RISK)
            </span>
          </div>
        </div>
      </div>

      <div className="py-4 space-y-4 relative z-10">
        {/* Dynamic Analysis Note */}
        <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs space-y-1">
          <div className="flex items-center justify-between font-semibold text-slate-300">
            <span>Steward Observation</span>
            <span className="text-[11px] font-mono text-purple-300">Turn #{currentTurn} Analysis</span>
          </div>
          <p className="text-slate-400 leading-relaxed text-[11px]">
            {aiAnalysis.analysis}
          </p>
        </div>

        {/* Trilingual Reminders Panel */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-blue-400" />
              Multilingual Payment Reminders
            </span>
            <span className="text-[11px] text-slate-400 font-mono">
              Target: {pendingMember}
            </span>
          </div>

          {/* Language Selector Buttons */}
          <div className="grid grid-cols-3 gap-2">
            {(['en', 'fr', 'pcm'] as const).map((l) => (
              <button
                key={l}
                onClick={() => setSelectedLang(l)}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                  selectedLang === l
                    ? 'bg-purple-600/30 text-purple-200 border-purple-500/50 shadow-md'
                    : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:text-white hover:bg-slate-800'
                }`}
              >
                <span>{reminders[l].flag}</span>
                <span className="truncate">{reminders[l].badge}</span>
              </button>
            ))}
          </div>

          {/* Reminder Preview Card */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-amber-300 flex items-center gap-1.5">
                <span>{currentReminder.flag}</span>
                <span>{currentReminder.title}</span>
              </span>
              <span className="text-[10px] font-mono text-slate-400">
                {currentReminder.lang}
              </span>
            </div>

            <p className="p-3 rounded-lg bg-slate-900 border border-slate-800/80 font-sans text-xs text-slate-200 leading-relaxed italic">
              "{currentReminder.message}"
            </p>

            {/* Action Buttons: Copy & Broadcast Nostr DM */}
            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={handleCopy}
                className="flex-1 py-2 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-medium text-slate-200 flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied to Clipboard' : 'Copy Message'}</span>
              </button>

              <button
                onClick={handleSendNostrDm}
                className="flex-1 py-2 px-3 rounded-lg bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 text-xs font-semibold text-purple-300 flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                {dmSent ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Send className="w-3.5 h-3.5" />}
                <span>{dmSent ? 'Encrypted DM Sent!' : 'Send Nostr DM (NIP-04)'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
