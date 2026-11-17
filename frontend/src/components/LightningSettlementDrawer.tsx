import React, { useState } from 'react';
import {
  X,
  Zap,
  Copy,
  Check,
  CheckCircle2,
  Receipt
} from 'lucide-react';
import { useWallet } from '../context/WalletContext';
import { QRCodeSvg } from './QRCodeSvg';
import { roscaService } from '../services/roscaService';

interface LightningSettlementDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  circle: any;
  onPaymentSuccess?: () => void;
}

export const LightningSettlementDrawer: React.FC<LightningSettlementDrawerProps> = ({
  isOpen,
  onClose,
  circle,
  onPaymentSuccess
}) => {
  const { payInvoice, formatAmount, balanceSats } = useWallet();
  const [isPaying, setIsPaying] = useState(false);
  const [paySuccess, setPaySuccess] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const [copiedInvoice, setCopiedInvoice] = useState(false);

  if (!isOpen || !circle) return null;

  const currentTurn = circle.currentTurn || 1;
  const currentRecipient = circle.members?.find((m: any) => m.slot === currentTurn) || circle.members?.[0];
  const contributionAmountSats = circle.contributionAmountSats || circle.contributionAmount || 5000;
  const myMember = circle.members?.find((m: any) => m.name?.includes('You') || m.name?.includes('Chidi')) || circle.members?.[circle.members.length - 1];
  const isAlreadyPaid = myMember?.paidCurrent || circle.currentTurnPaid?.includes(myMember?.slot);

  const mockBolt11 = `lnbc${contributionAmountSats}0n1p9ajobook${circle.id.substring(0, 8)}turn${currentTurn}pp5settlement00000000000000000000000`;

  const handleOneTapPay = async () => {
    try {
      setIsPaying(true);
      setPayError(null);
      setPaySuccess(false);

      // 1. Pay via WalletContext (deducts from local demo wallet or broadcasts NWC)
      const paymentRes = await payInvoice(mockBolt11, contributionAmountSats);

      // 2. Report payment via dual-mode roscaService (works on Vercel standalone & with backend)
      await roscaService.payTurnContribution(
        circle.id,
        myMember?.slot || 3,
        myMember?.name || 'Chidi (You / Judge)',
        paymentRes.preimage
      );

      setPaySuccess(true);
      if (onPaymentSuccess) onPaymentSuccess();
    } catch (err: any) {
      console.error('Payment error:', err);
      setPayError(err.message || 'Payment execution failed.');
    } finally {
      setIsPaying(false);
    }
  };

  const copyInvoice = () => {
    navigator.clipboard.writeText(mockBolt11);
    setCopiedInvoice(true);
    setTimeout(() => setCopiedInvoice(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-[#121824] border-l border-slate-800 p-6 flex flex-col shadow-2xl text-slate-100 overflow-y-auto">
          
          {/* Header */}
          <div className="flex items-center justify-between pb-5 border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                <Zap className="w-5 h-5 fill-amber-400" />
              </div>
              <div>
                <h3 className="font-bold text-base text-white">Lightning Settlement</h3>
                <p className="text-xs text-slate-400">Round #{currentTurn} Contribution</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="py-5 space-y-6 flex-1">

            {/* Recipient Notice */}
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-[11px] text-slate-400 uppercase font-semibold block">Round #{currentTurn} Collector</span>
                <span className="text-sm font-bold text-white">{currentRecipient?.name || 'Collector'}</span>
              </div>
              <div className="text-right">
                <span className="text-[11px] text-slate-400 uppercase font-semibold block">Amount Due</span>
                <span className="text-sm font-bold text-amber-400 font-mono">
                  {formatAmount(contributionAmountSats)}
                </span>
              </div>
            </div>

            {/* BOLT11 Invoice & QR Card */}
            <div className="p-5 rounded-2xl bg-[#141A26] border border-slate-800 flex flex-col items-center text-center space-y-4">
              <div className="p-3 bg-white rounded-xl shadow-md">
                <QRCodeSvg value={`lightning:${mockBolt11}`} size={170} />
              </div>

              <div className="w-full">
                <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                  <span>BOLT11 Invoice</span>
                  <button
                    onClick={copyInvoice}
                    className="text-amber-400 hover:text-amber-300 flex items-center gap-1 font-medium cursor-pointer"
                  >
                    {copiedInvoice ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedInvoice ? 'Copied' : 'Copy String'}
                  </button>
                </div>
                <div className="p-2 rounded-lg bg-slate-950 border border-slate-800 font-mono text-[10px] text-slate-400 break-all text-left max-h-16 overflow-y-auto">
                  {mockBolt11}
                </div>
              </div>

              {/* Action Button */}
              {isAlreadyPaid || paySuccess ? (
                <div className="w-full py-3 px-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold text-xs flex items-center justify-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Contribution Settled for Turn #{currentTurn}!</span>
                </div>
              ) : (
                <div className="w-full space-y-2">
                  <button
                    onClick={handleOneTapPay}
                    disabled={isPaying}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-sm shadow-lg shadow-amber-500/20 transition cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 active:scale-95"
                  >
                    <Zap className="w-4 h-4 fill-slate-950" />
                    <span>{isPaying ? 'Broadcasting Payment...' : `1-Tap Pay ${formatAmount(contributionAmountSats)}`}</span>
                  </button>
                  <p className="text-[11px] text-slate-500">
                    Wallet Balance: <strong className="text-slate-300 font-mono">{formatAmount(balanceSats)}</strong>
                  </p>
                </div>
              )}

              {payError && (
                <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 p-2 rounded-lg w-full">
                  {payError}
                </p>
              )}
            </div>

            {/* Signed Nostr State & Receipts */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Receipt className="w-3.5 h-3.5 text-purple-400" />
                  Nostr State & Receipts
                </span>
                <span className="text-[11px] text-emerald-400 font-mono">NIP-58 / Kind: 30078</span>
              </div>

              {circle.turnHistory && circle.turnHistory.length > 0 ? (
                <div className="space-y-2">
                  {circle.turnHistory.map((h: any, idx: number) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between font-bold text-white">
                        <span>Round #{h.turn} Disbursed</span>
                        <span className="text-emerald-400 font-mono">+{formatAmount(h.netPayout)}</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-400 text-[11px]">
                        <span>Recipient: {h.recipient}</span>
                        <span className="text-purple-400 font-mono">
                          ID: {h.nostrReceiptId ? `${h.nostrReceiptId.substring(0, 10)}...` : 'nevent1...'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 text-center text-xs text-slate-500 space-y-1">
                  <p>No prior turns completed yet.</p>
                  <p className="text-[11px] text-slate-400">
                    Once all {circle.members?.length || 3} members pay, an autonomous Nostr NIP-58 completion badge will generate here.
                  </p>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};
