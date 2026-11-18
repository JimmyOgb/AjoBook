import {
  Zap,
  Key,
  RotateCcw,
  Activity,
  Layers,
  Users,
  CreditCard,
  Home
} from 'lucide-react';
import { useWallet, Currency } from '../context/WalletContext';

export type NavTab = 'home' | 'dashboard' | 'members' | 'payments';

interface HeaderProps {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  mempoolFeeRate?: number;
  blockTipHeight?: number;
  onResetSeed?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  mempoolFeeRate = 1,
  blockTipHeight = 976385,
  onResetSeed
}) => {
  const {
    npub,
    balanceSats,
    isConnected,
    walletType,
    currency,
    setCurrency,
    formatAmount,
    openWalletDrawer
  } = useWallet();

  const navItems: Array<{ id: NavTab; label: string; icon: React.ReactNode }> = [
    { id: 'home', label: 'Home', icon: <Home className="w-3.5 h-3.5" /> },
    { id: 'dashboard', label: 'Dashboard', icon: <Layers className="w-3.5 h-3.5" /> },
    { id: 'members', label: 'Members', icon: <Users className="w-3.5 h-3.5" /> },
    { id: 'payments', label: 'Payments', icon: <CreditCard className="w-3.5 h-3.5" /> },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-stone-200 shadow-xs px-4 lg:px-8 py-2.5">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        
        {/* Brand & Tabs */}
        <div className="flex items-center justify-between gap-6 flex-wrap">
          <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => setActiveTab('home')}>
            <div className="w-8 h-8 rounded-xl bg-emerald-800 flex items-center justify-center font-black text-amber-300 text-sm shadow-xs">
              ⚡
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-lg text-stone-900 tracking-tight font-heading">AjoBook</span>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                  Bitcoin ROSCA
                </span>
              </div>
            </div>
          </div>

          {/* Editorial Navigation Tabs */}
          <nav className="flex items-center gap-1 bg-stone-100 p-1 rounded-xl border border-stone-200">
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer ${
                    isActive
                      ? 'bg-emerald-800 text-white shadow-xs'
                      : 'text-stone-600 hover:text-stone-900 hover:bg-white/70'
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Right Utility Controls: Mempool Telemetry, Currency, Re-Seed & Lightning Wallet */}
        <div className="flex items-center gap-2 flex-wrap justify-end">
          
          {/* Live Mempool Telemetry Pill */}
          <div
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-stone-100 border border-stone-200 text-stone-600 text-xs font-mono"
            title={`Bitcoin Tip Height: #${blockTipHeight.toLocaleString()} | Mempool Recommended Priority Fee: ${mempoolFeeRate} sat/vB`}
          >
            <Activity className="w-3 h-3 text-emerald-600 animate-pulse" />
            <span className="font-semibold text-stone-800">{mempoolFeeRate} sat/vB</span>
            <span className="text-[10px] text-stone-400">#{blockTipHeight}</span>
          </div>

          {/* Regional Currency Toggle Pill (⚡ SATS | ₦ NGN | CFA XOF) */}
          <div className="flex items-center p-0.5 rounded-lg bg-stone-100 border border-stone-200">
            {(['SATS', 'NGN', 'XOF'] as Currency[]).map((c) => (
              <button
                key={c}
                onClick={() => setCurrency(c)}
                className={`px-2 py-1 text-xs font-bold rounded-md transition cursor-pointer ${
                  currency === c
                    ? 'bg-white text-emerald-900 shadow-xs border border-stone-200'
                    : 'text-stone-500 hover:text-stone-900'
                }`}
              >
                {c === 'SATS' ? '⚡ SATS' : c === 'NGN' ? '₦ NGN' : 'CFA'}
              </button>
            ))}
          </div>

          {/* Reset Demo Circle Button */}
          {onResetSeed && (
            <button
              onClick={onResetSeed}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-stone-200 text-stone-600 hover:text-stone-900 hover:border-stone-300 text-xs font-medium transition cursor-pointer"
              title="Reset to 3-Member Dakar–Lagos Market Demo Circle"
            >
              <RotateCcw className="w-3 h-3 text-amber-600" />
              <span className="hidden lg:inline">Reset Demo</span>
            </button>
          )}

          {/* Nostr Public Key Pill */}
          <div className="hidden xl:flex items-center gap-1.5 px-2 py-1 rounded-lg bg-stone-50 border border-stone-200 text-stone-600 text-xs font-mono" title={npub}>
            <Key className="w-3 h-3 text-stone-400" />
            <span>{npub.substring(0, 8)}...</span>
          </div>

          {/* Prominent Lightning Wallet Action Button (Real NWC / WebLN / External) */}
          <button
            onClick={openWalletDrawer}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl font-bold text-xs shadow-xs transition cursor-pointer active:scale-95 ${
              isConnected
                ? 'bg-emerald-700 hover:bg-emerald-800 text-white border border-emerald-800'
                : 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 border border-amber-400 font-extrabold'
            }`}
            title="Open Lightning Wallet Settings (NWC, WebLN, Mobile QR)"
          >
            <Zap className={`w-3.5 h-3.5 ${isConnected ? 'fill-amber-300 text-amber-300' : 'fill-stone-950 text-stone-950'}`} />
            {isConnected ? (
              <div className="flex items-center gap-1.5">
                <span className="font-mono font-bold">{formatAmount(balanceSats)}</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-900/40 text-emerald-100 font-mono">
                  {walletType}
                </span>
              </div>
            ) : (
              <span>Connect Lightning Wallet</span>
            )}
          </button>

        </div>
      </div>
    </header>
  );
};
