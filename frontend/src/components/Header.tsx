import React from 'react';
import {
  Zap,
  ShieldCheck,
  Key,
  RotateCcw
} from 'lucide-react';
import { useWallet, Currency } from '../context/WalletContext';

interface HeaderProps {
  onResetSeed?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onResetSeed }) => {
  const {
    npub,
    balanceSats,
    currency,
    setCurrency,
    formatAmount,
    openWalletDrawer,
    walletType
  } = useWallet();

  return (
    <header className="sticky top-0 z-40 border-b border-slate-800 bg-[#0B0E14]/90 backdrop-blur-md px-4 lg:px-8 py-3.5">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        
        {/* Brand & African Bitcoin ROSCA Badge */}
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 via-amber-600 to-yellow-500 flex items-center justify-center font-black text-slate-950 text-lg tracking-wider shadow-lg shadow-amber-500/20">
              ⚡
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg text-white tracking-tight">AjoBook</span>
                <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  Bitcoin Lightning
                </span>
              </div>
              <p className="text-xs text-slate-400">Non-Custodial West African ROSCA &amp; AI Steward</p>
            </div>
          </div>

          {/* Zero Human Custody Proof Badge */}
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>0% Human Custody • Signed on Nostr</span>
          </div>
        </div>

        {/* Action Controls & Wallet */}
        <div className="flex items-center gap-2.5 flex-wrap">
          
          {/* Regional Currency Toggle Pill (⚡ SATS | ₦ NGN | CFA XOF) */}
          <div className="flex items-center p-1 rounded-xl bg-slate-900 border border-slate-800">
            {(['SATS', 'NGN', 'XOF'] as Currency[]).map((c) => (
              <button
                key={c}
                onClick={() => setCurrency(c)}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition cursor-pointer flex items-center gap-1 ${
                  currency === c
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {c === 'SATS' ? (
                  <>
                    <Zap className="w-3 h-3 fill-current" />
                    <span>SATS</span>
                  </>
                ) : c === 'NGN' ? (
                  <span>₦ NGN</span>
                ) : (
                  <span>CFA XOF</span>
                )}
              </button>
            ))}
          </div>

          {/* Re-Seed Demo Circle Button (For BTrust judges) */}
          {onResetSeed && (
            <button
              onClick={onResetSeed}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-300 hover:text-white hover:border-slate-500 text-xs font-medium transition cursor-pointer"
              title="Reset to 3-Member Dakar–Lagos Demo Circle"
            >
              <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Reset Demo</span>
            </button>
          )}

          {/* Nostr Public Key Pill */}
          <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 text-xs font-mono">
            <Key className="w-3.5 h-3.5 text-purple-400" />
            <span>{npub.substring(0, 8)}...{npub.substring(npub.length - 4)}</span>
          </div>

          {/* Prominent Lightning Wallet & Connect Action Button */}
          <button
            onClick={openWalletDrawer}
            className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/25 transition cursor-pointer active:scale-95 border border-amber-300/40 group"
            title="Open Lightning Wallet Settings • Connect NWC or Browser Extension"
          >
            <div className="w-5 h-5 rounded-lg bg-slate-950/20 flex items-center justify-center">
              <Zap className="w-3.5 h-3.5 fill-slate-950 text-slate-950" />
            </div>
            <div className="text-left flex flex-col leading-none">
              <div className="flex items-center gap-1.5">
                <span className="font-mono font-black text-xs text-slate-950">
                  {formatAmount(balanceSats)}
                </span>
                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-slate-950/20 font-bold uppercase tracking-tight text-slate-950">
                  {walletType === 'DEMO' ? 'Demo' : walletType === 'NWC' ? 'NWC' : 'Alby'}
                </span>
              </div>
              <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-950/75 pt-0.5 flex items-center gap-1">
                {walletType === 'DEMO' ? 'Connect Wallet / NWC →' : 'Manage Wallet →'}
              </span>
            </div>
          </button>

        </div>
      </div>
    </header>
  );
};
