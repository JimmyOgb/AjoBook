import React, { useState } from 'react';
import {
  X,
  Wallet,
  Zap,
  Key,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  QrCode,
  Radio
} from 'lucide-react';
import { useWallet } from '../context/WalletContext';
import { QRCodeSvg } from './QRCodeSvg';

export const LightningWalletDrawer: React.FC = () => {
  const {
    npub,
    isNip07Available,
    generateNewIdentity,
    walletType,
    isConnected,
    balanceSats,
    nwcInfo,
    lastPreimage,
    connectNwc,
    connectWebLn,
    disconnectWallet,
    makeInvoice,
    currency,
    formatAmount,
    isWalletDrawerOpen,
    closeWalletDrawer
  } = useWallet();

  const [activeTab, setActiveTab] = useState<'NWC' | 'WEBLN' | 'QR'>('NWC');
  const [inputNwc, setInputNwc] = useState('');
  const [nwcStatus, setNwcStatus] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [receiveAmount, setReceiveAmount] = useState('5000');
  const [generatedInvoice, setGeneratedInvoice] = useState<string | null>(null);
  const [isGeneratingInvoice, setIsGeneratingInvoice] = useState(false);

  if (!isWalletDrawerOpen) return null;

  const copyToClipboard = (text: string, keyName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(keyName);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const handleConnectNwc = async () => {
    if (!inputNwc.trim()) return;
    setNwcStatus('Connecting to NWC relay & querying node balance...');
    const ok = await connectNwc(inputNwc.trim());
    if (ok) {
      setNwcStatus('Connected successfully! Real balance loaded.');
      setInputNwc('');
      setTimeout(() => setNwcStatus(null), 3000);
    } else {
      setNwcStatus('Connection failed. Please check your NWC URI.');
    }
  };

  const handleConnectWebLn = async () => {
    const ok = await connectWebLn();
    if (ok) {
      setNwcStatus('WebLN connected!');
      setTimeout(() => setNwcStatus(null), 2500);
    } else {
      setNwcStatus('Could not enable WebLN. Make sure Alby extension is unlocked.');
    }
  };

  const handleGenerateReceiveInvoice = async () => {
    try {
      setIsGeneratingInvoice(true);
      const res = await makeInvoice(Number(receiveAmount) || 5000, `AjoBook Receive ${receiveAmount} sats`);
      setGeneratedInvoice(res.bolt11);
    } catch (e) {
      console.error(e);
    } finally {
      setIsGeneratingInvoice(false);
    }
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
                <h3 className="font-bold text-base text-stone-900 font-heading">Lightning Wallet</h3>
                <p className="text-xs text-stone-500">100% Real Cryptographic Settlements</p>
              </div>
            </div>
            <button
              onClick={closeWalletDrawer}
              className="p-1.5 rounded-lg text-stone-400 hover:text-stone-900 hover:bg-stone-100 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="py-5 space-y-6 flex-1">

            {/* Live Wallet Balance Banner */}
            <div className="p-5 rounded-2xl bg-stone-50 border border-stone-200 shadow-xs relative overflow-hidden">
              <div className="flex items-center justify-between text-xs text-stone-600 mb-1">
                <span className="flex items-center gap-1.5 font-semibold">
                  <Wallet className="w-4 h-4 text-emerald-700" />
                  {isConnected ? (
                    walletType === 'NWC' ? 'NWC Node Balance' : 'WebLN Wallet'
                  ) : (
                    'No Lightning Wallet Connected'
                  )}
                </span>
                <span className={`text-[10px] uppercase px-2 py-0.5 rounded-full font-mono font-bold ${
                  isConnected ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-stone-200 text-stone-600'
                }`}>
                  {walletType}
                </span>
              </div>
              
              <div className="mt-2">
                <div className="text-3xl font-black text-stone-900 tracking-tight font-mono">
                  {isConnected && balanceSats !== null ? formatAmount(balanceSats) : '0 sats'}
                </div>
                {isConnected && balanceSats !== null && currency !== 'SATS' && (
                  <p className="text-xs text-stone-500 font-mono mt-0.5">
                    ≈ {balanceSats.toLocaleString()} Satoshis
                  </p>
                )}
                {!isConnected && (
                  <p className="text-xs text-stone-500 mt-1">
                    Connect an NWC node, Alby extension, or pay via mobile Lightning QR.
                  </p>
                )}
              </div>

              {isConnected && (
                <div className="mt-4 pt-3 border-t border-stone-200 flex items-center justify-between">
                  <span className="text-[11px] text-emerald-700 font-medium flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Cryptographic Preimage Settlement Ready
                  </span>
                  <button
                    onClick={disconnectWallet}
                    className="text-xs text-rose-600 hover:underline font-semibold cursor-pointer"
                  >
                    Disconnect
                  </button>
                </div>
              )}
            </div>

            {/* Connection Method Tabs */}
            <div className="space-y-3">
              <span className="text-xs font-bold text-stone-700 uppercase tracking-wider block">
                Select Connection Protocol
              </span>

              <div className="grid grid-cols-3 gap-1.5 p-1 bg-stone-100 rounded-xl border border-stone-200">
                <button
                  onClick={() => setActiveTab('NWC')}
                  className={`py-2 px-2 text-xs rounded-lg transition cursor-pointer font-bold flex flex-col items-center gap-0.5 ${
                    activeTab === 'NWC'
                      ? 'bg-white text-emerald-900 shadow-xs border border-stone-200'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  <span className="flex items-center gap-1">
                    <Radio className="w-3.5 h-3.5 text-amber-600" />
                    <span>NWC (NIP-47)</span>
                  </span>
                  <span className="text-[9px] font-normal text-stone-500">Alby / Mutiny</span>
                </button>

                <button
                  onClick={() => setActiveTab('WEBLN')}
                  className={`py-2 px-2 text-xs rounded-lg transition cursor-pointer font-bold flex flex-col items-center gap-0.5 ${
                    activeTab === 'WEBLN'
                      ? 'bg-white text-emerald-900 shadow-xs border border-stone-200'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  <span className="flex items-center gap-1">
                    <ExternalLink className="w-3.5 h-3.5 text-purple-600" />
                    <span>WebLN</span>
                  </span>
                  <span className="text-[9px] font-normal text-stone-500">Browser Ext</span>
                </button>

                <button
                  onClick={() => setActiveTab('QR')}
                  className={`py-2 px-2 text-xs rounded-lg transition cursor-pointer font-bold flex flex-col items-center gap-0.5 ${
                    activeTab === 'QR'
                      ? 'bg-white text-emerald-900 shadow-xs border border-stone-200'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  <span className="flex items-center gap-1">
                    <QrCode className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Mobile QR</span>
                  </span>
                  <span className="text-[9px] font-normal text-stone-500">Phoenix / Zeus</span>
                </button>
              </div>

              {/* TAB 1: NWC PROTOCOL */}
              {activeTab === 'NWC' && (
                <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-3">
                  <p className="text-xs text-stone-600 leading-relaxed">
                    Connect your self-custodial Lightning node or wallet via Nostr Wallet Connect (NIP-47). Supports Alby Hub, Mutiny, CoinOS, Zeus, and BTCPayServer.
                  </p>

                  {walletType === 'NWC' && nwcInfo ? (
                    <div className="p-3 rounded-lg bg-white border border-emerald-200 space-y-2 text-xs">
                      <div className="flex items-center justify-between text-emerald-800 font-bold">
                        <span className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
                          Node Synced
                        </span>
                        <span className="font-mono text-[11px] text-stone-500">{nwcInfo.network}</span>
                      </div>
                      <div className="space-y-1 font-mono text-[11px] text-stone-600">
                        <div className="flex justify-between">
                          <span className="text-stone-400">Relay:</span>
                          <span className="truncate max-w-[200px] text-stone-800">{nwcInfo.relay}</span>
                        </div>
                        {nwcInfo.lud16 && (
                          <div className="flex justify-between">
                            <span className="text-stone-400">LN Address:</span>
                            <span className="text-emerald-800">{nwcInfo.lud16}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      <input
                        type="password"
                        placeholder="nostr+walletconnect://..."
                        value={inputNwc}
                        onChange={(e) => setInputNwc(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-white border border-stone-300 text-xs font-mono text-stone-900 placeholder-stone-400 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
                      />

                      <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-[11px] text-amber-900 space-y-1">
                        <div className="font-bold flex items-center gap-1 text-amber-800">
                          <Zap className="w-3 h-3 fill-amber-600 text-amber-600" />
                          <span>Supported Networks &amp; Faucet Test Sats</span>
                        </div>
                        <p className="text-stone-600">
                          Supports <strong>Mainnet</strong> (<code className="font-mono text-amber-800">lnbc</code>), <strong>Mutinynet / Signet</strong> (<code className="font-mono text-amber-800">lntbs</code>), and <strong>Testnet4</strong> (<code className="font-mono text-amber-800">lntb</code>).
                        </p>
                        <p>
                          Need free Signet sats? Get them at{' '}
                          <a
                            href="https://faucet.mutinynet.com"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-amber-800 underline font-bold inline-flex items-center gap-0.5"
                          >
                            https://faucet.mutinynet.com
                            <ExternalLink className="w-2.5 h-2.5 inline" />
                          </a>
                        </p>
                      </div>

                      <button
                        onClick={handleConnectNwc}
                        className="w-full py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition cursor-pointer"
                      >
                        Connect NWC URI
                      </button>
                      {nwcStatus && (
                        <p className="text-xs text-stone-700 font-medium text-center">{nwcStatus}</p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: WEBLN EXTENSION */}
              {activeTab === 'WEBLN' && (
                <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-stone-800">WebLN Browser Extension</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${
                      isNip07Available ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-stone-200 text-stone-600'
                    }`}>
                      {isNip07Available ? 'Extension Active' : 'Not Detected'}
                    </span>
                  </div>

                  {isNip07Available ? (
                    <div className="space-y-2.5">
                      <p className="text-xs text-stone-600">
                        Compatible browser extension detected (Alby / nos2x). Click below to authorize 1-tap Lightning payments and Nostr cryptographic signing.
                      </p>
                      <button
                        onClick={handleConnectWebLn}
                        className="w-full py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <ShieldCheck className="w-4 h-4" />
                        <span>Authorize WebLN Extension</span>
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2.5 text-xs text-stone-600">
                      <p>
                        No WebLN extension found in this browser. Install Alby Extension to pay BOLT11 invoices directly without pasting URIs.
                      </p>
                      <a
                        href="https://getalby.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full py-2.5 rounded-xl bg-white border border-stone-300 hover:bg-stone-100 text-stone-800 font-semibold flex items-center justify-center gap-1.5"
                      >
                        <ExternalLink className="w-3.5 h-3.5 text-amber-600" />
                        <span>Get Alby Extension (getalby.com)</span>
                      </a>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: MOBILE QR PAY */}
              {activeTab === 'QR' && (
                <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-3">
                  <p className="text-xs text-stone-600 leading-relaxed">
                    Pay or receive from any mobile Lightning wallet on your phone: <strong>Phoenix, Zeus, Breez, Blink</strong>, or <strong>Sparrow</strong>.
                  </p>

                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={receiveAmount}
                      onChange={(e) => setReceiveAmount(e.target.value)}
                      placeholder="Amount in sats"
                      className="flex-1 px-3 py-2 rounded-lg bg-white border border-stone-300 text-xs font-mono text-stone-900"
                    />
                    <button
                      onClick={handleGenerateReceiveInvoice}
                      disabled={isGeneratingInvoice}
                      className="px-3.5 py-2 rounded-lg bg-emerald-800 hover:bg-emerald-700 text-white text-xs font-bold transition cursor-pointer"
                    >
                      {isGeneratingInvoice ? 'Generating...' : 'Get Invoice'}
                    </button>
                  </div>

                  {generatedInvoice && (
                    <div className="p-3 rounded-xl bg-white border border-stone-200 flex flex-col items-center space-y-3">
                      <div className="p-2 bg-white rounded-lg border border-stone-100 shadow-xs">
                        <QRCodeSvg value={`lightning:${generatedInvoice}`} size={160} />
                      </div>
                      <div className="w-full">
                        <div className="flex items-center justify-between text-[11px] text-stone-500 mb-1">
                          <span>Invoice String:</span>
                          <button
                            onClick={() => copyToClipboard(generatedInvoice, 'invoice')}
                            className="text-emerald-700 font-bold hover:underline cursor-pointer"
                          >
                            {copiedKey === 'invoice' ? 'Copied' : 'Copy'}
                          </button>
                        </div>
                        <p className="p-2 rounded bg-stone-50 border border-stone-200 font-mono text-[10px] text-stone-600 break-all max-h-16 overflow-y-auto">
                          {generatedInvoice}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Cryptographic Preimage Proof Card */}
              {lastPreimage && (
                <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-300 space-y-2 animate-in fade-in">
                  <div className="flex items-center justify-between text-xs font-bold text-emerald-800">
                    <span className="flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-700" />
                      BOLT11 Settlement Preimage Proof
                    </span>
                    <button
                      onClick={() => copyToClipboard(lastPreimage, 'lastPreimage')}
                      className="text-emerald-800 hover:underline cursor-pointer font-mono text-[11px]"
                    >
                      {copiedKey === 'lastPreimage' ? 'Copied' : 'Copy Proof'}
                    </button>
                  </div>
                  <p className="p-2 rounded-lg bg-white border border-emerald-200 font-mono text-[10px] text-emerald-900 break-all">
                    {lastPreimage}
                  </p>
                  <span className="text-[10px] text-stone-500 block">
                    SHA-256 cryptographic proof of payment settlement on Lightning Network.
                  </span>
                </div>
              )}
            </div>

            {/* Nostr Identity Section */}
            <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-stone-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-purple-700" />
                  Nostr Cryptographic Identity
                </span>
                <button
                  onClick={generateNewIdentity}
                  className="text-[11px] text-emerald-700 hover:underline font-semibold cursor-pointer"
                >
                  Regenerate
                </button>
              </div>

              <div>
                <label className="text-[11px] text-stone-500 font-semibold block mb-1">
                  Public Key (npub)
                </label>
                <div className="flex items-center gap-2 p-2 rounded-lg bg-white border border-stone-300 font-mono text-xs text-stone-700">
                  <span className="truncate flex-1">{npub}</span>
                  <button
                    onClick={() => copyToClipboard(npub, 'npub')}
                    className="text-stone-400 hover:text-stone-900 transition cursor-pointer"
                  >
                    {copiedKey === 'npub' ? <Check className="w-3.5 h-3.5 text-emerald-700" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};
