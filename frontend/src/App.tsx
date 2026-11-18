import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { CircleCard, CircleData } from './components/CircleCard';
import { CircleDashboard } from './components/CircleDashboard';
import { CreateCircleModal } from './components/CreateCircleModal';
import { LightningWalletDrawer } from './components/LightningWalletDrawer';
import {
  Plus,
  Zap,
  Sparkles,
  BookOpen,
  RefreshCw,
  ShieldCheck,
  ArrowRight
} from 'lucide-react';
import { roscaService } from './services/roscaService';

export const AppContent: React.FC = () => {
  const [selectedCircleId, setSelectedCircleId] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [circles, setCircles] = useState<CircleData[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Check URL query param ?circle=...
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const circleParam = params.get('circle');
      if (circleParam) {
        setSelectedCircleId(circleParam);
      }
    }
  }, []);

  const fetchCircles = async () => {
    try {
      setIsLoading(true);
      const data = await roscaService.getCircles();
      setCircles(data);
    } catch (err) {
      console.warn('Error loading circles:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCircles();
  }, []);

  const handleResetSeed = async () => {
    try {
      await roscaService.resetSeed();
      await fetchCircles();
      setSelectedCircleId('dakar-lagos-market');
      if (typeof window !== 'undefined') {
        window.history.pushState({}, '', '?circle=dakar-lagos-market');
      }
    } catch (e) {
      console.error('Reset error:', e);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0E14] text-slate-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      
      {/* Header with Currency Switcher & Wallet */}
      <Header onResetSeed={handleResetSeed} />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 lg:px-8 py-8">
        {selectedCircleId ? (
          <CircleDashboard
            circleId={selectedCircleId}
            onBack={() => {
              setSelectedCircleId(null);
              if (typeof window !== 'undefined' && window.history.pushState) {
                const url = window.location.protocol + '//' + window.location.host + window.location.pathname;
                window.history.pushState({ path: url }, '', url);
              }
            }}
          />
        ) : (
          <div className="space-y-8">

            {/* Hero / Value Proposition Banner */}
            <div className="relative rounded-3xl p-8 lg:p-10 bg-gradient-to-r from-blue-950/40 via-indigo-950/30 to-slate-900 border border-slate-800 shadow-2xl overflow-hidden">
              <div className="relative z-10 max-w-2xl space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold">
                    <span>⚡ Traditional African ROSCA (Ajo / Esusu / Tontine) • Powered by Bitcoin Lightning</span>
                  </div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-medium font-mono">
                    <Sparkles className="w-3 h-3" />
                    <span>BTrust Dakar 2026</span>
                  </div>
                </div>

                <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
                  One Communal Ledger. <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-300 to-amber-300">
                    Zero Collector Pockets.
                  </span>
                </h1>

                <p className="text-sm text-slate-300 leading-relaxed font-normal">
                  Rotational savings and credit (Ajo / Esusu / Tontine) upgraded for Bitcoin Lightning, Nostr, and Autonomous AI. Sign your name into the communal ledger, contribute in 1-tap via Lightning invoices, and let autonomous smart agents disburse the pot each turn with <strong className="text-emerald-400 font-semibold">0% human custody</strong>.
                </p>

                <div className="pt-2 flex flex-wrap items-center gap-4">
                  <button
                    onClick={() => setIsCreateOpen(true)}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-600/30 transition active:scale-95 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Host New Circle</span>
                  </button>

                  <button
                    onClick={handleResetSeed}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs font-semibold transition cursor-pointer"
                  >
                    <span>⚡ Quick Test: Dakar–Lagos Demo</span>
                    <ArrowRight className="w-3.5 h-3.5 text-amber-400" />
                  </button>

                  <div className="flex items-center gap-4 text-xs text-slate-400">
                    <span className="flex items-center gap-1.5 font-medium text-emerald-400">
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      1x Deposit Protected
                    </span>
                    <span className="flex items-center gap-1.5 font-medium text-amber-400">
                      <Zap className="w-4 h-4 text-amber-400" />
                      Instant Lightning Payout
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Circles Section Header */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-blue-400" />
                    <span>Active Communal Savings Circles</span>
                  </h2>
                  <p className="text-xs text-slate-400">Live communal rotational savings circles signed on Nostr</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={fetchCircles}
                    disabled={isLoading}
                    className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition cursor-pointer"
                    title="Refresh Live Data"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-amber-400' : ''}`} />
                  </button>
                  <button
                    onClick={() => setIsCreateOpen(true)}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-600/20 transition cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Host Circle</span>
                  </button>
                </div>
              </div>

              {isLoading && circles.length === 0 ? (
                <div className="p-12 text-center text-xs text-slate-500 font-mono">
                  Loading live savings circles from Nostr &amp; Lightning engine...
                </div>
              ) : circles.length === 0 ? (
                <div className="p-12 rounded-2xl bg-[#121824] border border-slate-800 text-center space-y-3">
                  <BookOpen className="w-10 h-10 text-slate-600 mx-auto" />
                  <h3 className="text-sm font-bold text-white">No circles hosted yet</h3>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    Be the first host to open a communal savings circle or click below to launch the pre-seeded Dakar–Lagos market demo.
                  </p>
                  <button
                    onClick={handleResetSeed}
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition shadow-lg cursor-pointer"
                  >
                    Load Dakar–Lagos Market Demo
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {circles.map((circle) => (
                    <CircleCard
                      key={circle.id || circle.address}
                      circle={circle}
                      onSelect={(id) => {
                        setSelectedCircleId(id);
                        if (typeof window !== 'undefined') {
                          window.history.pushState({}, '', `?circle=${id}`);
                        }
                      }}
                    />
                  ))}
                </div>
              )}
            </div>

          </div>
        )}
      </main>

      {/* Footer with Nostr & Bitcoin Rail Proof */}
      <footer className="border-t border-slate-800 py-6 px-4 lg:px-8 mt-auto text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-400">AjoBook</span>
            <span>•</span>
            <span>Decentralized Communal ROSCA</span>
            <span>•</span>
            <span className="text-amber-400 font-mono">Bitcoin Lightning &amp; Nostr</span>
          </div>
          <div className="flex items-center gap-4 text-slate-400">
            <span>BTrust Dakar 2026</span>
            <span>•</span>
            <span>Settlement: Sats (⚡)</span>
            <span>•</span>
            <span>Nostr Kind 30078 / Kind 8 Badges</span>
          </div>
        </div>
      </footer>

      {/* Global Modals & Drawers */}
      <LightningWalletDrawer />

      <CreateCircleModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreated={(newId) => {
          fetchCircles();
          setSelectedCircleId(newId);
          if (typeof window !== 'undefined') {
            window.history.pushState({}, '', `?circle=${newId}`);
          }
        }}
      />

    </div>
  );
};

export const App: React.FC = () => {
  return <AppContent />;
};
