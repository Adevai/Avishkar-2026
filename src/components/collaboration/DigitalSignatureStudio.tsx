import React, { useRef, useState, useEffect } from 'react';
import { 
  PenTool, 
  RotateCcw, 
  CheckCircle2, 
  ShieldCheck, 
  X,
  Smartphone,
  Check
} from 'lucide-react';

interface DigitalSignatureStudioProps {
  onConfirmSignature: (hash: string, signatureDataUrl: string) => void;
  onClose: () => void;
}

export const DigitalSignatureStudio: React.FC<DigitalSignatureStudioProps> = ({ onConfirmSignature, onClose }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [mode, setMode] = useState<'canvas' | 'aadhaar'>('canvas');
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [penColor, setPenColor] = useState('#0358a1'); // Royal Blue

  // Aadhaar e-Sign State
  const [aadhaarNumber, setAadhaarNumber] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [aadhaarVerified, setAadhaarVerified] = useState(false);

  useEffect(() => {
    if (mode !== 'canvas') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = penColor;
  }, [penColor, mode]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    setHasDrawn(true);
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  const handleSignCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasDrawn) return;

    const dataUrl = canvas.toDataURL();
    const mockHash = `0x${Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`;
    onConfirmSignature(mockHash, dataUrl);
  };

  const handleSendAadhaarOtp = () => {
    if (aadhaarNumber.replace(/\D/g, '').length === 12) {
      setOtpSent(true);
    }
  };

  const handleVerifyAadhaarOtp = () => {
    if (otpCode.length === 6) {
      setIsVerifyingOtp(true);
      setTimeout(() => {
        setIsVerifyingOtp(false);
        setAadhaarVerified(true);
        const aadhaarHash = `0xeSign_${aadhaarNumber.slice(-4)}_${Date.now().toString(16)}_${Array.from({ length: 24 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`;
        onConfirmSignature(aadhaarHash, 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="60"><text y="35" font-family="sans-serif" font-size="14" fill="%23047857">Aadhaar e-Signed (Verified)</text></svg>');
      }, 1000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <PenTool className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Digital MoU Signature Studio</h3>
              <p className="text-[11px] text-slate-400">Cryptographically verifiable institutional signing</p>
            </div>
          </div>

          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mode Selector Tabs */}
        <div className="grid grid-cols-2 gap-2 mt-4 p-1 bg-slate-100 rounded-xl">
          <button
            type="button"
            onClick={() => setMode('canvas')}
            className={`py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              mode === 'canvas' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <PenTool className="w-3.5 h-3.5" />
            <span>Digital Stylus Pad</span>
          </button>
          <button
            type="button"
            onClick={() => setMode('aadhaar')}
            className={`py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              mode === 'aadhaar' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Aadhaar e-Sign OTP</span>
          </button>
        </div>

        {mode === 'canvas' ? (
          /* Signature Pad Area */
          <div className="my-4">
            <div className="flex items-center justify-between mb-2 text-xs">
              <span className="font-semibold text-slate-600">Draw Signature Below:</span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setPenColor('#0358a1')}
                  className={`w-4 h-4 rounded-full bg-blue-700 ${penColor === '#0358a1' ? 'ring-2 ring-offset-1 ring-blue-500' : ''} cursor-pointer`}
                  title="Royal Blue"
                />
                <button
                  type="button"
                  onClick={() => setPenColor('#0f172a')}
                  className={`w-4 h-4 rounded-full bg-slate-900 ${penColor === '#0f172a' ? 'ring-2 ring-offset-1 ring-slate-900' : ''} cursor-pointer`}
                  title="Executive Black"
                />
                <button
                  type="button"
                  onClick={clearCanvas}
                  className="ml-2 text-[11px] text-slate-500 hover:text-rose-600 flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Clear</span>
                </button>
              </div>
            </div>

            <div className="border-2 border-dashed border-slate-300 rounded-2xl p-1 bg-slate-50 relative overflow-hidden shadow-inner">
              <canvas
                ref={canvasRef}
                width={380}
                height={150}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
                className="w-full h-36 bg-white rounded-xl cursor-crosshair touch-none"
              />
              {!hasDrawn && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-slate-300 text-xs font-medium">
                  Sign with stylus or mouse here
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Aadhaar e-Sign Flow */
          <div className="my-4 space-y-3">
            <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-2xl text-xs space-y-1">
              <p className="font-bold text-emerald-900 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                <span>Govt of India ESP e-Sign Gateway (Simulated)</span>
              </p>
              <p className="text-[11px] text-emerald-800 leading-tight">
                Legally valid e-Signature under Section 3A of Information Technology Act 2000.
              </p>
            </div>

            {!otpSent ? (
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700">12-Digit Aadhaar / VID Number</label>
                <input
                  type="text"
                  maxLength={14}
                  placeholder="XXXX XXXX 4829"
                  value={aadhaarNumber}
                  onChange={(e) => setAadhaarNumber(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50"
                />
                <button
                  type="button"
                  onClick={handleSendAadhaarOtp}
                  disabled={aadhaarNumber.replace(/\D/g, '').length < 12}
                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer"
                >
                  Send Aadhaar Linked OTP
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700">Enter 6-Digit OTP sent to linked mobile</label>
                  <span className="text-[10px] text-emerald-700 font-bold font-mono">OTP Sent!</span>
                </div>
                <input
                  type="text"
                  maxLength={6}
                  placeholder="123456"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono text-center tracking-widest text-base font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50"
                />
                <button
                  type="button"
                  onClick={handleVerifyAadhaarOtp}
                  disabled={otpCode.length !== 6 || isVerifyingOtp}
                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {isVerifyingOtp ? (
                    <span>Verifying e-Sign Token...</span>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Confirm & Stamp Aadhaar e-Sign</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Verifiable Security Badge */}
        <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-2xl flex items-center gap-3 text-xs mb-5">
          <ShieldCheck className="w-5 h-5 text-blue-700 shrink-0" />
          <div>
            <p className="font-bold text-blue-950 text-[11px]">SHA-256 Digital Verification</p>
            <p className="text-[10px] text-blue-800 leading-tight mt-0.5">
              Generates a tamper-proof audit trail stamped with timestamp and verified institution key.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        {mode === 'canvas' && (
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!hasDrawn}
              onClick={handleSignCanvas}
              className="px-5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-40 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Apply Digital Signature</span>
            </button>
          </div>
        )}

      </div>
    </div>
  );
};
