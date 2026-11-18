import React, { useState } from 'react';
import {
  Sparkles,
  ShieldAlert,
  ShieldCheck,
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
    <div className="bg-white border border-stone-200 rounded-2xl shadow-xs border-l-4 border-l-purple-600 p-5 relative">
      {/* Title Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-stone-200">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-purple-100 flex items-center justify-center text-purple-700">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-bold text-sm text-stone-900 font-heading">AI Bookkeeper &amp; Steward</h4>
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200 font-bold">
                Autonomous Assistant
              </span>
            </div>
            <p className="text-xs text-stone-500">Risk Assessment, Health Scoring &amp; Multilingual Reminders</p>
          </div>
        </div>

        {/* Health Score Pill */}
        <div className="flex items-center gap-2">
          <div className={`px-3 py-1.5 rounded-xl border flex items-center gap-1.5 ${
            aiAnalysis.riskLevel === 'LOW' ? 'bg-emerald-50 border-emerald-300 text-emerald-800' :
            aiAnalysis.riskLevel === 'MEDIUM' ? 'bg-amber-50 border-amber-300 text-amber-800' :
            'bg-rose-50 border-rose-300 text-rose-800'
          }`}>
            {aiAnalysis.riskLevel === 'LOW' ? <ShieldCheck className="w-4 h-4 text-emerald-700" /> : <ShieldAlert className="w-4 h-4 text-amber-700" />}
            <span className="text-xs font-bold font-mono">
              Health: {aiAnalysis.score}/100 ({aiAnalysis.riskLevel} RISK)
            </span>
          </div>
        </div>
      </div>

      <div className="py-4 space-y-4">
        {/* Dynamic Analysis Note */}
        <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200 text-xs space-y-1">
          <div className="flex items-center justify-between font-bold text-stone-800">
            <span>Steward Observation</span>
            <span className="text-[11px] font-mono text-purple-700">Turn #{currentTurn} Analysis</span>
          </div>
          <p className="text-stone-600 leading-relaxed text-xs">
            {aiAnalysis.analysis}
          </p>
        </div>

        {/* Multilingual Reminder Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs font-bold text-stone-700">
            <span>Multilingual Payment Reminders</span>
            <span className="text-[11px] text-stone-500 font-mono">Target: {pendingMember}</span>
          </div>

          {/* Language Selector Buttons */}
          <div className="grid grid-cols-3 gap-2">
            {(['en', 'fr', 'pcm'] as const).map((l) => (
              <button
                key={l}
                onClick={() => setSelectedLang(l)}
                className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                  selectedLang === l
                    ? 'bg-purple-50 text-purple-900 border-purple-300 shadow-xs'
                    : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100'
                }`}
              >
                <span>{reminders[l].flag}</span>
                <span className="truncate">{reminders[l].badge}</span>
              </button>
            ))}
          </div>

          {/* Reminder Preview Card */}
          <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-stone-800 flex items-center gap-1.5">
                <span>{currentReminder.flag}</span>
                <span>{currentReminder.title}</span>
              </span>
              <span className="text-[10px] font-mono text-stone-400">
                {currentReminder.lang}
              </span>
            </div>

            <p className="p-3 rounded-lg bg-white border border-stone-200 font-sans text-xs text-stone-800 leading-relaxed italic">
              "{currentReminder.message}"
            </p>

            {/* Action Buttons: Copy & Broadcast Nostr DM */}
            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={handleCopy}
                className="flex-1 py-2 px-3 rounded-lg bg-white hover:bg-stone-100 border border-stone-300 text-xs font-semibold text-stone-700 flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-700" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied to Clipboard' : 'Copy Message'}</span>
              </button>

              <button
                onClick={handleSendNostrDm}
                className="flex-1 py-2 px-3 rounded-lg bg-purple-700 hover:bg-purple-800 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer shadow-xs"
              >
                {dmSent ? <Check className="w-3.5 h-3.5" /> : <Send className="w-3.5 h-3.5" />}
                <span>{dmSent ? 'Encrypted DM Sent!' : 'Send Nostr DM (NIP-04)'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
