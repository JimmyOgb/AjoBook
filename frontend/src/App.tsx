import { useState, useEffect } from 'react';
import {
  Plus,
  ArrowRight,
  ShieldCheck,
  Activity,
  Users,
  CreditCard,
  ExternalLink,
  BookOpen,
  Award,
  CheckCircle2
} from 'lucide-react';
import { Header, NavTab } from './components/Header';
import { CircleCard } from './components/CircleCard';
import { CircleDashboard } from './components/CircleDashboard';
import { CreateCircleModal } from './components/CreateCircleModal';
import { LightningWalletDrawer } from './components/LightningWalletDrawer';
import { useWallet } from './context/WalletContext';
import { roscaService } from './services/roscaService';
import { fetchBitcoinNetworkInfo, BitcoinNetworkInfo } from './services/mempoolService';
import { QRCodeSvg } from './components/QRCodeSvg';

export function App() {
  const { isConnected, formatAmount, openWalletDrawer } = useWallet();
  const [activeTab, setActiveTab] = useState<NavTab>('home');
  const [circles, setCircles] = useState<any[]>([]);
  const [selectedCircleId, setSelectedCircleId] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // Live Mempool Telemetry
  const [networkInfo, setNetworkInfo] = useState<BitcoinNetworkInfo>({
    tipHeight: 976385,
    fees: { fastestFee: 3, halfHourFee: 1, hourFee: 1, minimumFee: 1 },
    network: 'mainnet',
    lastUpdated: Date.now()
  });

  const loadCircles = async () => {
    try {
      const data = await roscaService.getCircles();
      setCircles(data);
      if (data.length > 0 && !selectedCircleId) {
        setSelectedCircleId(data[0].id);
      }
    } catch (err) {
      console.error('Failed to load circles:', err);
    }
  };

  useEffect(() => {
    loadCircles();
    fetchBitcoinNetworkInfo().then(setNetworkInfo).catch(() => {});

    // Check URL parameters for circle invite
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const circleParam = params.get('circle');
      if (circleParam) {
        setSelectedCircleId(circleParam);
        setActiveTab('dashboard');
      }
    }
  }, []);

  const handleResetSeed = async () => {
    try {
      await roscaService.resetSeed();
      await loadCircles();
      setSelectedCircleId('dakar-lagos-market');
    } catch (err) {
      console.error('Failed to reset seed:', err);
    }
  };

  const primaryCircle = circles.find(c => c.id === selectedCircleId) || circles[0];

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-stone-900 flex flex-col font-sans">
      
      {/* Editorial Top Navigation Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setActiveTab(tab);
          if (tab === 'home') setSelectedCircleId(null);
        }}
        mempoolFeeRate={networkInfo.fees.halfHourFee}
        blockTipHeight={networkInfo.tipHeight}
        onResetSeed={handleResetSeed}
      />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* VIEW 1: HOME (EDITORIAL HERO + ROUND OVERVIEW + ACTIVE CIRCLES) */}
        {activeTab === 'home' && !selectedCircleId && (
          <div className="space-y-8 animate-in fade-in duration-200">
            
            {/* HERO SECTION MATCHING https://ajobook.vercel.app/ */}
            <section className="bg-white border border-stone-200 rounded-3xl p-6 sm:p-10 shadow-xs space-y-6">
              
              {/* Eyebrow Pill */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-block px-3 py-1 rounded-full bg-amber-100 border border-amber-300/60 text-amber-900 text-xs font-bold font-mono">
                  Ajo · Esusu · Thrift · Tontine
                </span>
                <span className="inline-block px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
                  ⚡ Pure Bitcoin &amp; Lightning Rail
                </span>
              </div>

              {/* Headline & Editorial Subhead */}
              <div className="max-w-3xl space-y-3">
                <h1 className="text-3xl sm:text-5xl font-black text-stone-900 tracking-tight leading-tight font-heading">
                  Run your ajo without the notebook
                </h1>
                <p className="text-base sm:text-lg text-stone-600 leading-relaxed font-normal">
                  AjoBook keeps your savings group members, contribution amount, and Bitcoin Lightning settlements in one verifiable place, right on your phone.
                </p>
              </div>

              {/* Featured Hero Visual & Quick-Action Strip */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center pt-2">
                
                {/* Visual Card showing African Market Women Savings Artwork */}
                <div className="md:col-span-7 rounded-2xl overflow-hidden border border-stone-200 bg-stone-100 shadow-xs relative aspect-16/9 sm:aspect-21/9 flex items-center justify-center">
                  <img
                    src="/ajo-african-bg.svg"
                    alt="Market women sitting together, one recording contributions in a savings book"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-stone-950/60 via-transparent to-transparent flex items-end p-4">
                    <span className="text-white text-xs font-bold drop-shadow-sm flex items-center gap-1.5">
                      <BookOpen className="w-4 h-4 text-amber-300" />
                      Dakar–Lagos Market Communal Savings Circle
                    </span>
                  </div>
                </div>

                {/* 3 Quick-Action Buttons */}
                <div className="md:col-span-5 flex flex-col gap-2.5">
                  <button
                    onClick={() => {
                      if (primaryCircle) setSelectedCircleId(primaryCircle.id);
                      setActiveTab('dashboard');
                    }}
                    className="w-full py-3.5 px-4 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white font-bold text-sm shadow-xs transition cursor-pointer flex items-center justify-between group"
                  >
                    <span>Open Round Dashboard</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition" />
                  </button>

                  <button
                    onClick={() => setActiveTab('members')}
                    className="w-full py-3.5 px-4 rounded-xl bg-white hover:bg-stone-50 border border-stone-200 text-stone-800 font-bold text-sm transition cursor-pointer flex items-center justify-between group"
                  >
                    <span>Manage Members Directory</span>
                    <Users className="w-4 h-4 text-emerald-800" />
                  </button>

                  <button
                    onClick={() => setActiveTab('payments')}
                    className="w-full py-3.5 px-4 rounded-xl bg-white hover:bg-stone-50 border border-stone-200 text-stone-800 font-bold text-sm transition cursor-pointer flex items-center justify-between group"
                  >
                    <span>Track Lightning Payments</span>
                    <CreditCard className="w-4 h-4 text-amber-600" />
                  </button>
                </div>

              </div>

            </section>

            {/* "THIS ROUND AT A GLANCE" WARM LEDGER STRIP */}
            {primaryCircle && (
              <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-stone-900 font-heading">
                      This Round at a Glance
                    </h3>
                    <p className="text-xs text-stone-500">
                      Active Circle: <strong>{primaryCircle.name}</strong> • Organizer: {primaryCircle.hostName || 'Aminata'}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedCircleId(primaryCircle.id);
                      setActiveTab('dashboard');
                    }}
                    className="text-xs text-emerald-800 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span>View Full Ledger</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 pt-1">
                  <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200">
                    <span className="text-[10px] uppercase font-bold text-stone-500 block">Contribution</span>
                    <span className="text-xl font-black text-stone-900 font-mono mt-0.5 block">
                      {formatAmount(primaryCircle.contributionAmountSats || primaryCircle.contributionAmount || 5000)}
                    </span>
                    <span className="text-[10px] text-stone-400">per member / turn</span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200">
                    <span className="text-[10px] uppercase font-bold text-emerald-800 block">Round #{primaryCircle.currentTurn || 1} Pot</span>
                    <span className="text-xl font-black text-emerald-800 font-mono mt-0.5 block">
                      {formatAmount(Math.floor((primaryCircle.contributionAmountSats || 5000) * (primaryCircle.maxMembers || 3) * 0.995))}
                    </span>
                    <span className="text-[10px] text-stone-400">disbursed over Lightning</span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200">
                    <span className="text-[10px] uppercase font-bold text-stone-500 block">Turn Recipient</span>
                    <span className="text-base font-black text-stone-900 mt-1 block truncate">
                      {primaryCircle.members?.[0]?.name || 'Aminata (Dakar)'}
                    </span>
                    <span className="text-[10px] text-stone-400">Receives gross pot</span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200">
                    <span className="text-[10px] uppercase font-bold text-stone-500 block">Deposit Escrow</span>
                    <span className="text-base font-bold text-emerald-700 mt-1 flex items-center gap-1">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      100% Locked
                    </span>
                    <span className="text-[10px] text-stone-400">Default slashing protection</span>
                  </div>
                </div>
              </div>
            )}

            {/* ACTIVE SAVINGS CIRCLES DIRECTORY */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-stone-900 font-heading">
                    Active Savings Groups
                  </h2>
                  <p className="text-xs text-stone-500">
                    Join an open circle or sign your name to start contributing satoshis.
                  </p>
                </div>
                <button
                  onClick={() => setIsCreateOpen(true)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Host New Circle</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {circles.map((c) => (
                  <CircleCard
                    key={c.id}
                    circle={c}
                    onSelect={(id) => {
                      setSelectedCircleId(id);
                      setActiveTab('dashboard');
                    }}
                  />
                ))}
              </div>
            </div>

            {/* LIVE BITCOIN PROTOCOL & MEMPOOL TELEMETRY BANNER */}
            <div className="p-5 rounded-2xl bg-white border border-stone-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-stone-100 border border-stone-200 flex items-center justify-center text-emerald-700">
                  <Activity className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-stone-900">Live Bitcoin Mempool &amp; Lightning Telemetry</h4>
                  <p className="text-xs text-stone-500">Real-time network telemetry fetched directly from mempool.space REST API</p>
                </div>
              </div>

              <div className="flex items-center gap-4 text-xs font-mono">
                <div>
                  <span className="text-stone-400 text-[10px] block uppercase">Tip Block</span>
                  <span className="font-bold text-stone-900">#{networkInfo.tipHeight.toLocaleString()}</span>
                </div>
                <div className="border-l border-stone-200 pl-4">
                  <span className="text-stone-400 text-[10px] block uppercase">Priority Fee</span>
                  <span className="font-bold text-emerald-700">{networkInfo.fees.fastestFee} sat/vB</span>
                </div>
                <div className="border-l border-stone-200 pl-4">
                  <span className="text-stone-400 text-[10px] block uppercase">Signet Faucet</span>
                  <a
                    href="https://faucet.mutinynet.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-bold text-amber-700 underline flex items-center gap-0.5"
                  >
                    Mutinynet
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* VIEW 2: DASHBOARD */}
        {(activeTab === 'dashboard' || selectedCircleId) && (
          <div className="animate-in fade-in duration-200">
            {selectedCircleId ? (
              <CircleDashboard
                circleId={selectedCircleId}
                onBack={() => {
                  setSelectedCircleId(null);
                  setActiveTab('home');
                }}
              />
            ) : primaryCircle ? (
              <CircleDashboard
                circleId={primaryCircle.id}
                onBack={() => setActiveTab('home')}
              />
            ) : (
              <div className="py-12 text-center text-stone-500 text-xs">
                No active savings circle found.
              </div>
            )}
          </div>
        )}

        {/* VIEW 3: MEMBERS DIRECTORY */}
        {activeTab === 'members' && !selectedCircleId && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-stone-900 font-heading">
                    Savings Group Members Directory
                  </h2>
                  <p className="text-xs text-stone-500">
                    Rotational order, Nostr public keys, Lightning addresses, and NIP-58 reputation badges.
                  </p>
                </div>
                <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-mono font-bold">
                  {primaryCircle?.members?.length || 3} Members Registered
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {(primaryCircle?.members || [
                { slot: 1, name: 'Aminata (Dakar)', npub: 'npub1aminatadakar99', depositSats: 5000, paidCurrent: true },
                { slot: 2, name: 'Tunde (Lagos)', npub: 'npub1tundemarket88', depositSats: 5000, paidCurrent: true },
                { slot: 3, name: 'Chidi (You / Judge)', npub: 'npub1chidiajobook77', depositSats: 5000, paidCurrent: false }
              ]).map((m: any) => (
                <div key={m.slot} className="p-5 rounded-2xl bg-white border border-stone-200 shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-stone-500">
                      Slot #{m.slot}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      m.paidCurrent ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {m.paidCurrent ? 'Turn Paid' : 'Turn Pending'}
                    </span>
                  </div>

                  <div>
                    <h3 className="font-bold text-stone-900 text-base">{m.name}</h3>
                    <p className="font-mono text-[11px] text-stone-400 truncate mt-0.5" title={m.npub}>
                      {m.npub || 'npub1guest...'}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-xs">
                    <span className="text-stone-500">Security Deposit:</span>
                    <span className="font-mono font-bold text-emerald-800">{formatAmount(m.depositSats || 5000)}</span>
                  </div>

                  <div className="pt-2 border-t border-stone-100 flex items-center gap-1.5 text-stone-600 text-xs">
                    <Award className="w-3.5 h-3.5 text-amber-600" />
                    <span>NIP-58 Badge: <strong>Honest Saver</strong></span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* VIEW 4: TRACK PAYMENTS */}
        {activeTab === 'payments' && !selectedCircleId && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-stone-900 font-heading">
                    Lightning Payments &amp; Settlement Telemetry
                  </h2>
                  <p className="text-xs text-stone-500">
                    BOLT11 invoice generator, mempool.space fee tracking, and cryptographic Nostr receipts.
                  </p>
                </div>
                <button
                  onClick={openWalletDrawer}
                  className="px-3.5 py-1.5 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer"
                >
                  {isConnected ? 'Manage Wallet' : 'Connect Wallet'}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              
              {/* Payment Terminal Card */}
              <div className="p-6 rounded-2xl bg-white border border-stone-200 shadow-xs space-y-4">
                <span className="text-xs font-bold text-stone-700 uppercase tracking-wider block">
                  Active Round Contribution Invoice
                </span>

                <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-stone-500">Target Amount:</span>
                    <span className="font-mono font-bold text-stone-900">{formatAmount(5000)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-stone-500">Settlement Rail:</span>
                    <span className="font-bold text-emerald-800">Bitcoin Lightning (BOLT11)</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-stone-500">Proof Protocol:</span>
                    <span className="font-mono text-stone-600">SHA-256 Preimage</span>
                  </div>
                </div>

                <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 flex flex-col items-center">
                  <QRCodeSvg value="lightning:lnbc50000n1p9ajobookdakar00000000000000000000000000000" size={160} />
                  <span className="text-[11px] text-stone-500 mt-2">Scan with Phoenix, Zeus, Breez, or Blink</span>
                </div>
              </div>

              {/* Mempool.space Fee Intelligence Card */}
              <div className="p-6 rounded-2xl bg-white border border-stone-200 shadow-xs space-y-4">
                <span className="text-xs font-bold text-stone-700 uppercase tracking-wider block">
                  Live Mempool.space Fee Estimates
                </span>

                <div className="space-y-2">
                  <div className="p-3 rounded-xl bg-stone-50 border border-stone-200 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-stone-900 block">Fastest Priority (Next Block)</span>
                      <span className="text-stone-500 text-[11px]">Immediate confirmation</span>
                    </div>
                    <span className="font-mono font-bold text-emerald-800 text-sm">
                      {networkInfo.fees.fastestFee} sat/vB
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-stone-50 border border-stone-200 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-stone-900 block">Half-Hour Priority</span>
                      <span className="text-stone-500 text-[11px]">Recommended for standard anchors</span>
                    </div>
                    <span className="font-mono font-bold text-emerald-800 text-sm">
                      {networkInfo.fees.halfHourFee} sat/vB
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-stone-50 border border-stone-200 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-stone-900 block">Hour Priority</span>
                      <span className="text-stone-500 text-[11px]">Low urgency settle</span>
                    </div>
                    <span className="font-mono font-bold text-stone-700 text-sm">
                      {networkInfo.fees.hourFee} sat/vB
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900">
                  <div className="font-bold flex items-center gap-1.5 mb-1">
                    <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                    <span>Lightning Zero-Mempool Settlement</span>
                  </div>
                  <p className="text-stone-600 leading-relaxed text-[11px]">
                    Round contributions in AjoBook settle off-chain on the Lightning Network in milliseconds with near-zero routing fees, regardless of base-layer mempool congestion.
                  </p>
                </div>
              </div>

            </div>
          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="border-t border-stone-200 bg-white py-6 px-4 text-center text-xs text-stone-500 space-y-2">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-stone-800 font-heading">AjoBook</span>
            <span>•</span>
            <span>Dakar Bitcoin Hack 2026 by BTrust</span>
          </div>

          <div className="flex items-center gap-4 text-stone-500">
            <a
              href="https://faucet.mutinynet.com"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-emerald-800 underline"
            >
              Signet Faucet
            </a>
            <a
              href="https://github.com/JimmyOgb/AjoBook"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-emerald-800 underline"
            >
              GitHub Source
            </a>
            <span className="font-mono">Tip #{networkInfo.tipHeight}</span>
          </div>
        </div>
      </footer>

      {/* Create Circle Modal */}
      <CreateCircleModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreated={(id) => {
          loadCircles();
          setSelectedCircleId(id);
          setActiveTab('dashboard');
        }}
      />

      {/* Lightning Wallet Settings Drawer */}
      <LightningWalletDrawer />

    </div>
  );
}
