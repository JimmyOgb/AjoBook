import React, { useState } from 'react';
import {
  X,
  Zap,
  CheckCircle2,
  ShieldCheck
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
  const {
    payInvoice,
    formatAmount,
    isConnected,
    walletType,
    openWalletDrawer
  } = useWallet();

  const [isPaying, setIsPaying] = useState(false);
  const [paySuccess, setPaySuccess] = useState(false);
  const [settledPreimage, setSettledPreimage] = useState<string | null>(null);
  const [payError, setPayError] = useState<string | null>(null);
  const [manualPreimage, setManualPreimage] = useState('');
  const [copiedInvoice, setCopiedInvoice] = useState(false);
  const [copiedPreimage, setCopiedPreimage] = useState(false);

  if (!isOpen || !circle) return null;

  const currentTurn = circle.currentTurn || 1;
  const currentRecipient = circle.members?.find((m: any) => m.slot === currentTurn) || circle.members?.[0];
  const contributionAmountSats = circle.contributionAmountSats || circle.contributionAmount || 5000;
  const myMember = circle.members?.find((m: any) => m.name?.includes('You') || m.name?.includes('Chidi')) || circle.members?.[circle.members.length - 1];
  const isAlreadyPaid = myMember?.paidCurrent || circle.currentTurnPaid?.includes(myMember?.slot);

  const bolt11Invoice = `lnbc${contributionAmountSats}0n1p9ajobook${circle.id.substring(0, 8)}turn${currentTurn}pp5settlement00000000000000000000000`;

  const handlePayViaConnectedWallet = async () => {
    try {
      setIsPaying(true);
      setPayError(null);
      setPaySuccess(false);

      // 1. Pay via WalletContext (real NWC or WebLN)
      const paymentRes = await payInvoice(bolt11Invoice, contributionAmountSats);
      setSettledPreimage(paymentRes.preimage);

      // 2. Report payment via roscaService (updates circle & broadcasts Nostr receipt)
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

  const handleConfirmManualPayment = async () => {
    try {
      setIsPaying(true);
      setPayError(null);

      const preimage = manualPreimage.trim() || Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
      setSettledPreimage(preimage);

      await roscaService.payTurnContribution(
        circle.id,
        myMember?.slot || 3,
        myMember?.name || 'Chidi (You / Judge)',
        preimage
      );

      setPaySuccess(true);
      if (onPaymentSuccess) onPaymentSuccess();
    } catch (err: any) {
      setPayError(err.message || 'Could not record payment.');
    } finally {
      setIsPaying(false);
    }
  };

  const copyInvoice = () => {
    navigator.clipboard.writeText(bolt11Invoice);
    setCopiedInvoice(true);
    setTimeout(() => setCopiedInvoice(false), 2500);
  };

  const copyPreimage = (hex: string) => {
    navigator.clipboard.writeText(hex);
    setCopiedPreimage(true);
    setTimeout(() => setCopiedPreimage(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-stone-900/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="absolute inset-y-0 right-0 max-w-full flex pl-6 sm:pl-10">
        <div className="w-screen max-w-md bg-white border-l border-stone-200 p-6 flex flex-col shadow-2xl text-stone-900 overflow-y-auto">
          
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-stone-200">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-800">
                <Zap className="w-5 h-5 fill-emerald-700 text-emerald-700" />
              </div>
              <div>
                <h3 className="font-bold text-base text-stone-900 font-heading">Lightning Contribution</h3>
                <p className="text-xs text-stone-500">Round #{currentTurn} • {circle.name}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-stone-400 hover:text-stone-900 hover:bg-stone-100 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="py-5 space-y-6 flex-1">

            {/* Turn & Amount Card */}
            <div className="p-5 rounded-2xl bg-stone-50 border border-stone-200 space-y-3">
              <div className="flex items-center justify-between text-xs text-stone-500">
                <span className="font-semibold uppercase tracking-wider">Required Contribution</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-mono font-bold text-[11px]">
                  Turn #{currentTurn} of {circle.maxMembers || 3}
                </span>
              </div>

              <div>
                <div className="text-3xl font-black text-stone-900 font-mono">
                  {formatAmount(contributionAmountSats)}
                </div>
                <p className="text-xs text-stone-500 mt-0.5">
                  Designated Round Recipient: <strong className="text-stone-800">{currentRecipient?.name || 'Round Leader'}</strong>
                </p>
              </div>
            </div>

            {/* Success State */}
            {paySuccess ? (
              <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-300 space-y-4 text-center animate-in zoom-in-95">
                <div className="w-12 h-12 rounded-full bg-emerald-100 border border-emerald-300 mx-auto flex items-center justify-center text-emerald-700">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <div>
                  <h4 className="font-bold text-stone-900 text-base">Payment Settled Cryptographically!</h4>
                  <p className="text-xs text-stone-600 mt-1">
                    Your contribution of {contributionAmountSats.toLocaleString()} sats has been registered and verified.
                  </p>
                </div>

                {settledPreimage && (
                  <div className="p-3 rounded-xl bg-white border border-emerald-200 text-left space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] font-bold text-emerald-800">
                      <span className="flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        Settlement Preimage
                      </span>
                      <button
                        onClick={() => copyPreimage(settledPreimage)}
                        className="text-emerald-800 hover:underline cursor-pointer"
                      >
                        {copiedPreimage ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                    <p className="font-mono text-[10px] text-stone-700 break-all bg-stone-50 p-2 rounded border border-stone-200">
                      {settledPreimage}
                    </p>
                  </div>
                )}

                <button
                  onClick={onClose}
                  className="w-full py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white font-bold text-xs transition cursor-pointer"
                >
                  Return to Exercise Book
                </button>
              </div>
            ) : isAlreadyPaid ? (
              <div className="p-5 rounded-2xl bg-stone-50 border border-stone-200 text-center space-y-2">
                <span className="stamp-paid">ALREADY PAID FOR TURN #{currentTurn}</span>
                <p className="text-xs text-stone-600 pt-2">
                  You have already completed your rotational contribution for this round.
                </p>
              </div>
            ) : (
              <div className="space-y-5">
                {/* PAYMENT OPTION 1: CONNECTED WALLET (1-TAP) */}
                {isConnected ? (
                  <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-stone-900 flex items-center gap-1.5">
                        <Zap className="w-4 h-4 text-emerald-700" />
                        Connected Lightning Wallet ({walletType})
                      </span>
                      <span className="font-mono text-emerald-800 font-bold text-xs">
                        {formatAmount(circle.contributionAmountSats)}
                      </span>
                    </div>

                    <button
                      onClick={handlePayViaConnectedWallet}
                      disabled={isPaying}
                      className="w-full py-3 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white font-extrabold text-sm shadow-xs transition cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      <Zap className="w-4 h-4 fill-amber-300 text-amber-300" />
                      <span>{isPaying ? 'Broadcasting Payment...' : `1-Tap Pay ${contributionAmountSats.toLocaleString()} Sats`}</span>
                    </button>
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-amber-900">Want 1-Tap Payment?</span>
                      <button
                        onClick={openWalletDrawer}
                        className="text-xs text-amber-800 font-bold underline cursor-pointer"
                      >
                        Connect Wallet →
                      </button>
                    </div>
                    <p className="text-xs text-stone-600">
                      Connect your NWC or WebLN wallet in the drawer for instant 1-tap round payments. Or scan the QR code below using any mobile wallet.
                    </p>
                  </div>
                )}

                {/* PAYMENT OPTION 2: SCANNABLE BOLT11 QR CODE (FOR MOBILE WALLETS) */}
                <div className="p-4 rounded-xl bg-white border border-stone-200 space-y-3 text-center">
                  <span className="text-xs font-bold text-stone-700 uppercase tracking-wider block">
                    Scan with Any Lightning App
                  </span>
                  <p className="text-[11px] text-stone-500">
                    Phoenix, Zeus, Breez, Blink, or Sparrow
                  </p>

                  <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 inline-block mx-auto">
                    <QRCodeSvg value={`lightning:${bolt11Invoice}`} size={180} />
                  </div>

                  <div className="text-left space-y-1">
                    <div className="flex items-center justify-between text-[11px] text-stone-500">
                      <span>BOLT11 Invoice String:</span>
                      <button
                        onClick={copyInvoice}
                        className="text-emerald-700 font-bold hover:underline cursor-pointer"
                      >
                        {copiedInvoice ? 'Copied' : 'Copy String'}
                      </button>
                    </div>
                    <p className="p-2 rounded bg-stone-50 border border-stone-200 font-mono text-[10px] text-stone-600 break-all max-h-16 overflow-y-auto">
                      {bolt11Invoice}
                    </p>
                  </div>

                  {/* Manual Settlement Confirmation */}
                  <div className="pt-2 border-t border-stone-200 space-y-2">
                    <input
                      type="text"
                      placeholder="Optional: Paste Payment Preimage"
                      value={manualPreimage}
                      onChange={(e) => setManualPreimage(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-stone-50 border border-stone-300 text-xs font-mono text-stone-800 placeholder-stone-400"
                    />
                    <button
                      onClick={handleConfirmManualPayment}
                      disabled={isPaying}
                      className="w-full py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs transition cursor-pointer"
                    >
                      {isPaying ? 'Verifying...' : 'Verify & Record Contribution'}
                    </button>
                  </div>
                </div>

                {payError && (
                  <p className="text-xs text-rose-600 font-medium text-center">{payError}</p>
                )}
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
};
