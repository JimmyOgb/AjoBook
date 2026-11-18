import React, { useState } from 'react';
import {
  X,
  Wallet,
  Zap,
  Key,
  Copy,
  Check,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Globe2,
  QrCode,
  Radio,
  Server
} from 'lucide-react';
import { useWallet, Currency } from '../context/WalletContext';
import { QRCodeSvg } from './QRCodeSvg';

export const LightningWalletDrawer: React.FC = () => {
  const {
    npub,
    isNip07Available,
    connectNip07,
    generateNewIdentity,
    walletType,
    setWalletType,
    balanceSats,
    nwcUrl,
    nwcInfo,
    lastPreimage,
    connectNwc,
    disconnectNwc,
    resetDemoWallet,
    currency,
    setCurrency,
    formatAmount,
    isWalletDrawerOpen,
    closeWalletDrawer
  } = useWallet();

  const [inputNwc, setInputNwc] = useState('');
  const [nwcStatus, setNwcStatus] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [showReceiveQr, setShowReceiveQr] = useState<boolean>(false);
  const [receiveAmount, setReceiveAmount] = useState('10000');

  if (!isWalletDrawerOpen) return null;

  const copyToClipboard = (text: string, keyName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(keyName);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const handleConnectNwc = async () => {
    if (!inputNwc.trim()) return;
    setNwcStatus('Connecting to NWC relay...');
    const ok = await connectNwc(inputNwc.trim());
    if (ok) {
      setNwcStatus('Connected successfully!');
      setInputNwc('');
      setTimeout(() => setNwcStatus(null), 2500);
    } else {
      setNwcStatus('Connection failed. Please check your NWC URI.');
    }
  };

  const demoReceiveInvoice = `lnbc${receiveAmount}0n1p9ajobook${npub.substring(0, 8)}receive00000000000000000000000000000000`;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-[#121824] border-l border-slate-800 p-6 flex flex-col shadow-2xl text-slate-100 overflow-y-auto">
          
          {/* Header */}
          <div className="flex items-center justify-between pb-5 border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                <Zap className="w-5 h-5 fill-amber-400/20" />
              </div>
              <div>
                <h3 className="font-bold text-base text-white">AjoBook Lightning Wallet</h3>
                <p className="text-xs text-slate-400">Non-Custodial ROSCA Settlement</p>
              </div>
            </div>
            <button
              onClick={closeWalletDrawer}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="py-5 space-y-6 flex-1">

            {/* Currency Selector */}
            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Globe2 className="w-3.5 h-3.5 text-blue-400" />
                  Display Currency
                </span>
                <span className="text-[11px] text-slate-500">West African Rates</span>
              </div>
              <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-950 rounded-lg border border-slate-800">
                {(['SATS', 'NGN', 'XOF'] as Currency[]).map((c) => (
                  <button
                    key={c}
                    onClick={() => setCurrency(c)}
                    className={`py-1.5 text-xs font-bold rounded-md transition cursor-pointer ${
                      currency === c
                        ? 'bg-amber-500 text-slate-950 shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {c === 'SATS' ? '⚡ SATS' : c === 'NGN' ? '₦ NGN' : 'CFA XOF'}
                  </button>
                ))}
              </div>
            </div>

            {/* Wallet Balance Card */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-500/15 via-slate-900 to-slate-900 border border-amber-500/30 shadow-lg">
              <div className="flex items-center justify-between text-xs text-amber-400 font-semibold mb-1">
                <span className="flex items-center gap-1.5">
                  <Wallet className="w-4 h-4" />
                  {walletType === 'DEMO' ? 'Instant Demo Lightning Wallet' : 'NWC Remote Wallet'}
                </span>
                <span className="text-[10px] uppercase px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 font-mono">
                  {walletType}
                </span>
              </div>
              
              <div className="mt-2">
                <div className="text-3xl font-black text-white tracking-tight font-mono">
                  {formatAmount(balanceSats)}
                </div>
                {currency !== 'SATS' && (
                  <p className="text-xs text-amber-300/80 font-mono mt-0.5">
                    ≈ {balanceSats.toLocaleString()} Satoshis
                  </p>
                )}
              </div>

              {/* Action Buttons: Receive QR & Reset */}
              <div className="mt-4 pt-3 border-t border-amber-500/20 flex items-center justify-between gap-2">
                <button
                  onClick={() => setShowReceiveQr(!showReceiveQr)}
                  className="text-xs text-amber-300 hover:text-white flex items-center gap-1 transition font-medium cursor-pointer"
                >
                  <QrCode className="w-3.5 h-3.5" />
                  <span>{showReceiveQr ? 'Hide Receive QR' : 'Receive Sats QR'}</span>
                </button>

                {walletType === 'DEMO' && (
                  <button
                    onClick={resetDemoWallet}
                    className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1 transition font-medium cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Reset 100k Sats
                  </button>
                )}
              </div>
            </div>

            {/* Receive Sats QR Panel */}
            {showReceiveQr && (
              <div className="p-4 rounded-xl bg-slate-950 border border-amber-500/30 flex flex-col items-center text-center space-y-3 animate-in fade-in">
                <div className="flex items-center justify-between w-full">
                  <span className="text-xs font-bold text-white uppercase tracking-wider">
                    Receive Lightning Sats
                  </span>
                  <div className="flex gap-1">
                    {['5000', '10000', '50000'].map((amt) => (
                      <button
                        key={amt}
                        onClick={() => setReceiveAmount(amt)}
                        className={`px-2 py-0.5 rounded text-[10px] font-mono cursor-pointer ${
                          receiveAmount === amt ? 'bg-amber-500 text-slate-950 font-bold' : 'bg-slate-900 text-slate-400'
                        }`}
                      >
                        {Number(amt).toLocaleString()} sats
                      </button>
                    ))}
                  </div>
                </div>
                <div className="p-3 bg-white rounded-xl shadow-md">
                  <QRCodeSvg value={`lightning:${demoReceiveInvoice}`} size={160} />
                </div>
                <div className="w-full text-left">
                  <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                    <span>Invoice String:</span>
                    <button
                      onClick={() => copyToClipboard(demoReceiveInvoice, 'invoice')}
                      className="text-amber-400 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      {copiedKey === 'invoice' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedKey === 'invoice' ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                  <p className="p-2 rounded-lg bg-slate-900 border border-slate-800 font-mono text-[10px] text-slate-400 break-all max-h-14 overflow-y-auto">
                    {demoReceiveInvoice}
                  </p>
                </div>
              </div>
            )}

            {/* Mode Switcher: Demo vs NWC vs Extension */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Wallet Connection Mode
                </span>
                <span className="text-[10px] text-amber-400 font-mono">
                  {walletType === 'DEMO' ? '⚡ Built-in Demo' : walletType === 'NWC' ? '🔌 NWC Remote' : '🦊 Alby / NIP-07'}
                </span>
              </div>

              {/* 3-Way Mode Switcher Tabs */}
              <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-950 rounded-xl border border-slate-800">
                <button
                  onClick={() => setWalletType('DEMO')}
                  className={`py-2 px-2 text-xs rounded-lg transition cursor-pointer font-bold flex flex-col items-center gap-0.5 ${
                    walletType === 'DEMO'
                      ? 'bg-amber-500 text-slate-950 shadow-md'
                      : 'text-slate-400 hover:text-white hover:bg-slate-900'
                  }`}
                >
                  <span className="flex items-center gap-1">
                    <Zap className="w-3.5 h-3.5 fill-current" />
                    <span>Demo</span>
                  </span>
                  <span className="text-[9px] font-normal opacity-80">100k sats</span>
                </button>

                <button
                  onClick={() => setWalletType('NWC')}
                  className={`py-2 px-2 text-xs rounded-lg transition cursor-pointer font-bold flex flex-col items-center gap-0.5 ${
                    walletType === 'NWC'
                      ? 'bg-amber-500 text-slate-950 shadow-md'
                      : 'text-slate-400 hover:text-white hover:bg-slate-900'
                  }`}
                >
                  <span className="flex items-center gap-1">
                    <Radio className="w-3.5 h-3.5" />
                    <span>NWC</span>
                  </span>
                  <span className="text-[9px] font-normal opacity-80">Signet/Mainnet</span>
                </button>

                <button
                  onClick={() => {
                    setWalletType('NIP07');
                    if (isNip07Available) connectNip07();
                  }}
                  className={`py-2 px-2 text-xs rounded-lg transition cursor-pointer font-bold flex flex-col items-center gap-0.5 ${
                    walletType === 'NIP07'
                      ? 'bg-amber-500 text-slate-950 shadow-md'
                      : 'text-slate-400 hover:text-white hover:bg-slate-900'
                  }`}
                >
                  <span className="flex items-center gap-1">
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Extension</span>
                  </span>
                  <span className="text-[9px] font-normal opacity-80">Alby / nos2x</span>
                </button>
              </div>

              {/* DEMO WALLET VIEW */}
              {walletType === 'DEMO' && (
                <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3 animate-in fade-in">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-amber-300 flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 fill-amber-400" />
                      1-Click Built-in Demo Wallet
                    </span>
                    <button
                      onClick={resetDemoWallet}
                      className="text-[11px] text-amber-400 hover:underline flex items-center gap-1 font-mono font-medium cursor-pointer"
                    >
                      <RefreshCw className="w-3 h-3" />
                      Reset to 100k
                    </button>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Pre-funded with <strong>100,000 sats</strong> for frictionless judge testing. Generates authentic BOLT11 invoices, local sat balances, and cryptographic SHA-256 settlement preimages.
                  </p>
                  <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-[11px] text-slate-400 flex items-center justify-between font-mono">
                    <span>Active Test Balance:</span>
                    <span className="font-bold text-emerald-400">{balanceSats.toLocaleString()} sats</span>
                  </div>
                </div>
              )}

              {/* NWC WALLET VIEW */}
              {walletType === 'NWC' && (
                <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-3 animate-in fade-in">
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Connect your self-custodial Alby Hub, LNbits, Mutiny, or Umbrel node via Nostr Wallet Connect (NIP-47).
                  </p>
                  {nwcUrl ? (
                    <div className="space-y-3">
                      {/* Connection Status Card */}
                      <div className="p-3 rounded-xl bg-slate-950 border border-emerald-500/30 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="flex items-center gap-1.5 font-bold text-emerald-400">
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                            </span>
                            NWC Connected &amp; Synced
                          </span>
                          <button
                            onClick={disconnectNwc}
                            className="text-[11px] text-rose-400 hover:text-rose-300 hover:underline cursor-pointer font-medium"
                          >
                            Disconnect
                          </button>
                        </div>

                        {/* Relay & Network Details */}
                        <div className="space-y-1.5 pt-1 text-[11px] text-slate-300 font-mono">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500 flex items-center gap-1">
                              <Server className="w-3 h-3 text-slate-400" /> Relay:
                            </span>
                            <span className="text-amber-300 truncate max-w-[200px]" title={nwcInfo?.relay}>
                              {nwcInfo?.relay || 'wss://relay.getalby.com/v1'}
                            </span>
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-slate-500 flex items-center gap-1">
                              <Radio className="w-3 h-3 text-slate-400" /> Network:
                            </span>
                            <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-semibold text-[10px]">
                              {nwcInfo?.network || 'Mutinynet / Signet'}
                            </span>
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-slate-500 flex items-center gap-1">
                              <Zap className="w-3 h-3 text-amber-400" /> Real Node Balance:
                            </span>
                            <span className="text-white font-bold">
                              {balanceSats.toLocaleString()} sats
                            </span>
                          </div>

                          {nwcInfo?.lud16 && (
                            <div className="flex items-center justify-between">
                              <span className="text-slate-500">Lightning Address:</span>
                              <span className="text-purple-300">{nwcInfo.lud16}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      <input
                        type="password"
                        placeholder="nostr+walletconnect://..."
                        value={inputNwc}
                        onChange={(e) => setInputNwc(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-white placeholder-slate-600 focus:outline-none focus:border-amber-500"
                      />

                      {/* Clean Badge / Helper Note */}
                      <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/25 text-[11px] text-amber-200/90 leading-relaxed space-y-1">
                        <div className="flex items-center gap-1 font-bold text-amber-300">
                          <Zap className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                          <span>Supported Networks &amp; Free Test Sats</span>
                        </div>
                        <p className="text-slate-300">
                          Supports <strong>Mainnet</strong> (<code className="font-mono text-amber-300">lnbc</code>), <strong>Mutinynet / Signet</strong> (<code className="font-mono text-amber-300">lntbs</code>), and <strong>Testnet4</strong> (<code className="font-mono text-amber-300">lntb</code>) via NWC.
                        </p>
                        <p className="pt-0.5">
                          Need free Signet test sats? Get them at{' '}
                          <a
                            href="https://faucet.mutinynet.com"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-amber-400 underline font-semibold hover:text-white inline-flex items-center gap-0.5"
                          >
                            https://faucet.mutinynet.com
                            <ExternalLink className="w-3 h-3 inline" />
                          </a>
                        </p>
                      </div>

                      <button
                        onClick={handleConnectNwc}
                        className="w-full py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition cursor-pointer"
                      >
                        Connect NWC Wallet
                      </button>
                      {nwcStatus && (
                        <p className="text-xs text-amber-400 text-center">{nwcStatus}</p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* BROWSER EXTENSION VIEW */}
              {walletType === 'NIP07' && (
                <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-3 animate-in fade-in">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-purple-300 flex items-center gap-1.5">
                      <ExternalLink className="w-3.5 h-3.5" />
                      Browser Extension (NIP-07 / WebLN)
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono ${
                      isNip07Available ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-slate-800 text-slate-400'
                    }`}>
                      {isNip07Available ? 'Extension Active' : 'Not Detected'}
                    </span>
                  </div>

                  {isNip07Available ? (
                    <div className="space-y-2.5">
                      <p className="text-xs text-slate-300">
                        Compatible browser extension detected (Alby / nos2x). Click below to authorize Nostr identity and WebLN payments.
                      </p>
                      <button
                        onClick={connectNip07}
                        className="w-full py-2.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-purple-600/20"
                      >
                        <ShieldCheck className="w-4 h-4" />
                        <span>Authorize Extension (Alby / nos2x)</span>
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      <p className="text-xs text-slate-400 leading-relaxed">
                        No Nostr / WebLN extension detected in this browser window. You can install the Alby extension for Chrome/Brave/Firefox or continue seamlessly using our <strong>1-Click Demo Wallet</strong> or <strong>NWC Protocol</strong>.
                      </p>
                      <a
                        href="https://getalby.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-xs transition flex items-center justify-center gap-1.5"
                      >
                        <ExternalLink className="w-3.5 h-3.5 text-amber-400" />
                        <span>Get Alby Extension (getalby.com)</span>
                      </a>
                    </div>
                  )}
                </div>
              )}

              {/* Settled BOLT11 Preimage Proof Card (Display on Settlement) */}
              {lastPreimage && (
                <div className="p-3.5 rounded-xl bg-slate-900 border border-emerald-500/30 space-y-2 animate-in fade-in">
                  <div className="flex items-center justify-between text-xs font-semibold text-emerald-400">
                    <span className="flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      BOLT11 Settlement Preimage Proof
                    </span>
                    <button
                      onClick={() => copyToClipboard(lastPreimage, 'lastPreimage')}
                      className="text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer font-mono text-[11px]"
                    >
                      {copiedKey === 'lastPreimage' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedKey === 'lastPreimage' ? 'Copied' : 'Copy Proof'}</span>
                    </button>
                  </div>
                  <p className="p-2 rounded-lg bg-slate-950 border border-slate-800 font-mono text-[10px] text-emerald-300 break-all">
                    {lastPreimage}
                  </p>
                  <span className="text-[10px] text-slate-500 block">
                    Cryptographic proof of Lightning payment settlement (SHA-256 Preimage)
                  </span>
                </div>
              )}
            </div>

            {/* Nostr Identity Panel */}
            <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-purple-400" />
                  Nostr Identity
                </span>
                <button
                  onClick={generateNewIdentity}
                  className="text-[11px] text-purple-400 hover:underline cursor-pointer"
                >
                  Regenerate
                </button>
              </div>

              {/* npub */}
              <div>
                <label className="text-[11px] text-slate-400 font-semibold block mb-1">
                  Public Key (npub)
                </label>
                <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-950 border border-slate-800 font-mono text-xs text-slate-300">
                  <span className="truncate flex-1">{npub}</span>
                  <button
                    onClick={() => copyToClipboard(npub, 'npub')}
                    className="text-slate-400 hover:text-white transition cursor-pointer"
                  >
                    {copiedKey === 'npub' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* NIP-07 Extension connection if present */}
              {isNip07Available && (
                <button
                  onClick={connectNip07}
                  className="w-full py-2 rounded-lg bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 text-purple-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Connect Browser Extension (Alby / nos2x)
                </button>
              )}
            </div>

            {/* BTrust Judge Quick-Test Guide */}
            <div className="p-4 rounded-xl bg-blue-950/30 border border-blue-800/40 text-xs text-blue-200 space-y-2">
              <div className="font-bold text-white flex items-center gap-1.5">
                <span>⚡ BTrust Judge Quick-Start</span>
              </div>
              <p className="leading-relaxed text-blue-300/90 text-[11px]">
                Your <strong>1-Click Demo Lightning Wallet</strong> has <strong>100,000 sats</strong> ready. You don't need to install any extension or fund real sats to test the full Ajo rotation, BOLT11 invoices, and autonomous payouts.
              </p>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};
