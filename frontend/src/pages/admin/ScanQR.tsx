import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { Html5Qrcode } from 'html5-qrcode';
import { QrCode, ScanLine, CheckCircle2, XCircle, Keyboard, Camera, Loader2 } from 'lucide-react';
import axios from 'axios';

type ScanState = 'idle' | 'scanning' | 'loading' | 'success' | 'error';

interface PickupResult {
  message: string;
  order?: {
    tokenNumber: string;
    studentName: string;
    items: Array<{ name: string; quantity: number }>;
  };
}

export const ScanQR: React.FC = () => {
  const { user } = useAuth();
  const { addToast } = useSocket();
  const [searchParams] = useSearchParams();
  const prefillToken = searchParams.get('token') || '';

  const [scanState, setScanState] = useState<ScanState>('idle');
  const [mode, setMode] = useState<'camera' | 'manual'>('camera');
  const [manualToken, setManualToken] = useState(prefillToken);
  const [result, setResult] = useState<PickupResult | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const scannerStarted = useRef(false);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

  // Start camera scanner
  const startScanner = async () => {
    if (scannerStarted.current) return;

    try {
      const qrCode = new Html5Qrcode('qr-reader');
      html5QrCodeRef.current = qrCode;

      await qrCode.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 260, height: 260 } },
        (decodedText) => {
          // On successful scan
          if (scannerStarted.current) {
            stopScanner();
            handleVerifyPickup(decodedText);
          }
        },
        () => {
          // Scan error — suppress frame errors silently
        }
      );
      scannerStarted.current = true;
      setScanState('scanning');
    } catch (err) {
      console.error('Camera start error:', err);
      setErrorMsg('Unable to access camera. Please allow camera permissions or use Manual Entry.');
      setScanState('error');
    }
  };

  const stopScanner = async () => {
    if (html5QrCodeRef.current && scannerStarted.current) {
      try {
        await html5QrCodeRef.current.stop();
        html5QrCodeRef.current.clear();
      } catch (e) {
        // ignore stop errors
      }
      scannerStarted.current = false;
    }
  };

  useEffect(() => {
    if (mode === 'camera') {
      // Small delay to let the DOM mount the #qr-reader div
      const timer = setTimeout(() => startScanner(), 300);
      return () => {
        clearTimeout(timer);
        stopScanner();
      };
    } else {
      stopScanner();
    }
  }, [mode]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, []);

  const handleVerifyPickup = async (token: string) => {
    if (!user || !token.trim()) return;
    setScanState('loading');
    setResult(null);
    setErrorMsg('');

    try {
      const res = await axios.post(
        `${API_URL}/orders/verify-pickup`,
        { qrData: token.trim() },
        { headers: { Authorization: `Bearer ${user.token}` } }
      );
      const data = res.data;
      // Normalize response: populatedOrder has userId.name
      setResult({
        message: data.message,
        order: data.order
          ? {
              tokenNumber: data.order.token || data.order.tokenNumber,
              studentName: data.order.userId?.name || 'Unknown',
              items: data.order.items || [],
            }
          : undefined,
      });
      setScanState('success');
      addToast('Pickup Verified!', `Order completed successfully.`, 'success');
    } catch (err: any) {
      const msg =
        err.response?.data?.message || 'Invalid or already-used QR code.';
      setErrorMsg(msg);
      setScanState('error');
      addToast('Verification Failed', msg, 'warning');
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleVerifyPickup(manualToken);
  };

  const handleReset = () => {
    setScanState('idle');
    setResult(null);
    setErrorMsg('');
    setManualToken(prefillToken);
    if (mode === 'camera') {
      setTimeout(() => startScanner(), 300);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 animate-fadeIn">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-extrabold text-slate-100 tracking-tight flex items-center gap-2">
          <QrCode className="text-red-500" size={24} />
          QR Pickup Scanner
        </h1>
        <p className="text-slate-400 text-xs mt-1">
          Scan the student's QR code or enter their token manually to complete order pickup.
        </p>
      </div>

      {/* Mode Toggle */}
      <div className="flex bg-slate-900/80 rounded-2xl p-1 gap-1 mb-6 border border-slate-800">
        <button
          onClick={() => { setMode('camera'); handleReset(); }}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all ${
            mode === 'camera'
              ? 'bg-red-500 text-white shadow-lg shadow-red-500/20'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Camera size={14} /> Camera Scan
        </button>
        <button
          onClick={() => { setMode('manual'); handleReset(); }}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all ${
            mode === 'manual'
              ? 'bg-red-500 text-white shadow-lg shadow-red-500/20'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Keyboard size={14} /> Manual Token
        </button>
      </div>

      {/* Scanner Card */}
      <div className="glass rounded-3xl border border-slate-800 overflow-hidden">

        {/* Camera Mode */}
        {mode === 'camera' && (
          <div className="p-6">
            {(scanState === 'idle' || scanState === 'scanning') && (
              <div className="relative">
                {/* QR Reader container — html5-qrcode renders into this */}
                <div
                  id="qr-reader"
                  className="w-full rounded-2xl overflow-hidden bg-slate-950"
                  style={{ minHeight: '300px' }}
                />

                {/* Animated scan overlay */}
                {scanState === 'scanning' && (
                  <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
                    <div className="w-64 h-64 border-2 border-red-500/60 rounded-2xl relative">
                      <ScanLine
                        size={260}
                        className="absolute top-0 left-0 text-red-500/30 animate-pulse"
                      />
                      {/* Corner accents */}
                      <span className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-red-500 rounded-tl-lg" />
                      <span className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-red-500 rounded-tr-lg" />
                      <span className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-red-500 rounded-bl-lg" />
                      <span className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-red-500 rounded-br-lg" />
                    </div>
                    <p className="text-slate-400 text-[10px] mt-4 tracking-wider uppercase font-bold animate-pulse">
                      Align QR code in frame
                    </p>
                  </div>
                )}

                {scanState === 'idle' && (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 size={24} className="text-red-500 animate-spin" />
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Manual Token Mode */}
        {mode === 'manual' && scanState !== 'success' && scanState !== 'loading' && (
          <div className="p-8">
            <form onSubmit={handleManualSubmit} className="space-y-5">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Pickup Token / QR Code Value
                </label>
                <input
                  type="text"
                  value={manualToken}
                  onChange={(e) => setManualToken(e.target.value)}
                  placeholder="e.g. PICKUP-TKN-ABC123"
                  className="w-full bg-slate-950/60 border border-slate-700 focus:border-red-500/60 rounded-xl py-3 px-4 text-sm text-slate-200 font-mono focus:outline-none transition-colors"
                  autoFocus
                />
              </div>
              <button
                type="submit"
                disabled={!manualToken.trim()}
                className="w-full bg-red-500 hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl text-sm transition-all flex items-center justify-center gap-2"
              >
                <QrCode size={16} />
                Verify & Complete Pickup
              </button>
            </form>

            {scanState === 'error' && (
              <div className="mt-5 bg-red-500/10 border border-red-500/20 rounded-2xl p-4 flex items-start gap-3">
                <XCircle size={18} className="text-red-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-red-300">Verification Failed</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">{errorMsg}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Loading State */}
        {scanState === 'loading' && (
          <div className="p-12 flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-red-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-slate-400 text-sm font-semibold">Verifying pickup token...</p>
            <p className="text-slate-500 text-xs">Checking QR signature on server</p>
          </div>
        )}

        {/* Camera Error State */}
        {mode === 'camera' && scanState === 'error' && (
          <div className="p-8 text-center">
            <XCircle size={40} className="text-red-400 mx-auto mb-3" />
            <p className="text-sm font-bold text-red-300 mb-1">Camera Error</p>
            <p className="text-xs text-slate-400 mb-5">{errorMsg}</p>
            <button
              onClick={() => setMode('manual')}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold px-5 py-2.5 rounded-xl text-xs transition-all"
            >
              Switch to Manual Entry
            </button>
          </div>
        )}

        {/* Success State */}
        {scanState === 'success' && result && (
          <div className="p-8 text-center">
            <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-500/20">
              <CheckCircle2 size={32} className="text-emerald-400" />
            </div>
            <h2 className="text-lg font-extrabold text-emerald-300 mb-1">Pickup Complete!</h2>
            <p className="text-xs text-slate-400 mb-6">{result.message}</p>

            {result.order && (
              <div className="bg-slate-900/60 rounded-2xl border border-slate-800 p-5 text-left mb-6">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Order Details</span>
                  <span className="text-xs bg-red-500/10 text-red-400 border border-red-500/20 px-2.5 py-0.5 rounded font-mono font-bold">
                    {result.order.tokenNumber}
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 font-semibold mb-2">
                  Student: <span className="text-white">{result.order.studentName}</span>
                </p>
                <div className="space-y-1">
                  {result.order.items?.map((item, i) => (
                    <div key={i} className="flex justify-between text-[10px] text-slate-400">
                      <span>{item.name}</span>
                      <span className="font-bold text-slate-300">×{item.quantity}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={handleReset}
              className="bg-red-500 hover:bg-red-600 text-white font-bold px-6 py-3 rounded-xl text-xs transition-all flex items-center gap-2 mx-auto"
            >
              <QrCode size={14} />
              Scan Next Order
            </button>
          </div>
        )}
      </div>

      {/* Info Note */}
      <div className="mt-4 bg-slate-900/40 border border-slate-800 rounded-2xl p-4 flex items-start gap-3">
        <QrCode size={16} className="text-slate-500 shrink-0 mt-0.5" />
        <p className="text-[11px] text-slate-500 leading-relaxed">
          Each QR code is single-use and cryptographically signed. Once a token is verified,
          it cannot be reused. No-shows can be marked from the Order Management queue.
        </p>
      </div>
    </div>
  );
};
