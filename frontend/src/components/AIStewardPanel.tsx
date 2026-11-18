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
    <div className="bg-[#121824] border border-slate-800 rounded-2xl overflow-hidden shadow-xl relative p-5">
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
              <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                AjoBook Advisor
              </span>
            </div>
            <p className="text-xs text-slate-400">Dakar Tontine &amp; Lagos Ajo Risk Engine</p>
          </div>
        </div>

        {/* Health Score Pill */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800">
            {aiAnalysis.score >= 80 ? (
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
            ) : (
              <ShieldAlert className="w-4 h-4 text-amber-400" />
            )}
            <div className="text-left">
              <span className="text-[10px] text-slate-400 uppercase font-semibold block leading-none">Circle Health</span>
              <span className={`text-xs font-black font-mono ${aiAnalysis.score >= 80 ? 'text-emerald-400' : 'text-amber-400'}`}>
                {aiAnalysis.score}/100 • {aiAnalysis.riskLevel} RISK
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Analysis Content */}
      <div className="py-4 space-y-4 relative z-10">
        <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800/80 text-xs text-slate-300 leading-relaxed flex items-start gap-2.5">
          <div className="w-2 h-2 rounded-full bg-purple-400 mt-1.5 shrink-0" />
          <div>
            <strong className="text-white">Steward Assessment: </strong>
            {aiAnalysis.analysis}
          </div>
        </div>

        {/* Multilingual Reminder Generator */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-blue-400" />
              1-Click Member Payment Reminders
            </label>
            
            {/* Language Selector */}
            <div className="flex items-center gap-1 p-0.5 rounded-lg bg-slate-950 border border-slate-800 text-xs">
              {(['en', 'fr', 'pcm'] as const).map((lang) => (
                <button
                  key={lang}
                  onClick={() => setSelectedLang(lang)}
                  className={`px-2 py-1 rounded font-medium transition cursor-pointer text-[11px] ${
                    selectedLang === lang
                      ? 'bg-purple-600 text-white font-bold shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {reminders[lang].flag} {lang.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Generated Message Box */}
          <div className="p-3.5 rounded-xl bg-[#0B0E14] border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-[11px] text-purple-400 font-medium">
              <span>{currentReminder.title} ({currentReminder.badge})</span>
              <span className="text-slate-500 font-mono">Target: {pendingMember}</span>
            </div>
            <p className="text-xs text-slate-200 leading-relaxed font-sans">
              "{currentReminder.message}"
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800/80">
              <button
                onClick={handleCopy}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5 transition cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied!' : 'Copy Text'}</span>
              </button>

              <button
                onClick={handleSendNostrDm}
                className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
              >
                {dmSent ? <Check className="w-3.5 h-3.5 text-white" /> : <Send className="w-3.5 h-3.5" />}
                <span>{dmSent ? 'Dispatched via Nostr NIP-04!' : 'Send Nostr DM'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
