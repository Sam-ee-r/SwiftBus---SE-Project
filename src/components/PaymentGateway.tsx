import { useState, useEffect, useRef } from 'react';

// ── Types ──────────────────────────────────────────────────────────────────────
type Provider = 'jazzcash' | 'easypaisa' | null;
type Step = 'select' | 'enter_details' | 'processing' | 'success';

interface PaymentGatewayProps {
  amount: number;
  seats: number[];
  onSuccess: (transactionId: string, provider: string) => void;
  onCancel: () => void;
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function generateTxnId(provider: Provider): string {
  const prefix = provider === 'jazzcash' ? 'JC' : 'EP';
  const num = Math.floor(10000 + Math.random() * 90000);
  return `${prefix}-${num}`;
}

// ── JazzCash Logo — Local Image ───────────────────────────
function JazzCashLogo({ size = 40 }: { size?: number }) {
  return (
    <div
      style={{ width: size, height: size }}
      className="rounded-xl overflow-hidden bg-white flex items-center justify-center flex-shrink-0 shadow-inner border border-white/10"
    >
      <img
        src="/logos/jazzcah.png"
        alt="JazzCash"
        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
        onError={(e) => {
          e.currentTarget.style.display = 'none';
          const parent = e.currentTarget.parentElement;
          if (parent && !parent.querySelector('span')) {
            const span = document.createElement('span');
            span.textContent = 'JC';
            span.style.cssText = 'color:#CF1F2E;font-weight:900;font-size:' + (size * 0.4) + 'px;font-family:Arial';
            parent.appendChild(span);
          }
        }}
      />
    </div>
  );
}

// ── Easypaisa Logo — Local Image ──────────────────────────
function EasypaisaLogo({ size = 40 }: { size?: number }) {
  return (
    <div
      style={{ width: size, height: size }}
      className="rounded-xl overflow-hidden bg-white flex items-center justify-center flex-shrink-0 shadow-inner border border-white/10"
    >
      <img
        src="/logos/easypaisa.png"
        alt="Easypaisa"
        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
        onError={(e) => {
          e.currentTarget.style.display = 'none';
          const parent = e.currentTarget.parentElement;
          if (parent && !parent.querySelector('span')) {
            const span = document.createElement('span');
            span.textContent = 'EP';
            span.style.cssText = 'color:#00A651;font-weight:900;font-size:' + (size * 0.4) + 'px;font-family:Arial';
            parent.appendChild(span);
          }
        }}
      />
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
export function PaymentGateway({ amount, seats, onSuccess, onCancel }: PaymentGatewayProps) {
  const [step, setStep] = useState<Step>('select');
  const [provider, setProvider] = useState<Provider>(null);
  const [mobileNumber, setMobileNumber] = useState('');
  const [pin, setPin] = useState(['', '', '', '']);
  const [pinError, setPinError] = useState('');
  const [mobileError, setMobileError] = useState('');
  const [progress, setProgress] = useState(0);
  const [transactionId, setTransactionId] = useState('');
  const pinRefs = useRef<(HTMLInputElement | null)[]>([]);

  const providerConfig = {
    jazzcash: {
      name: 'JazzCash',
      color: 'text-rose-500',
      border: 'hover:border-rose-500/50',
      bg: 'bg-rose-500/10',
      btn: 'bg-rose-600 hover:bg-rose-700',
    },
    easypaisa: {
      name: 'Easypaisa',
      color: 'text-emerald-500',
      border: 'hover:border-emerald-500/50',
      bg: 'bg-emerald-500/10',
      btn: 'bg-emerald-600 hover:bg-emerald-700',
    },
  };

  useEffect(() => {
    if (step !== 'processing') { setProgress(0); return; }
    setProgress(0);
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) { clearInterval(interval); return 100; }
        return prev + (100 / 30);
      });
    }, 100);
    const timeout = setTimeout(() => {
      clearInterval(interval);
      setProgress(100);
      const txn = generateTxnId(provider);
      setTransactionId(txn);
      setStep('success');
    }, 3000);
    return () => { clearInterval(interval); clearTimeout(timeout); };
  }, [step]);

  const handleSelectProvider = (p: Provider) => {
    setProvider(p);
    setStep('enter_details');
  };

  const handlePinChange = (index: number, value: string) => {
    if (!/^\d?$/.test(value)) return;
    const newPin = [...pin];
    newPin[index] = value;
    setPin(newPin);
    if (value && index < 3) {
      pinRefs.current[index + 1]?.focus();
    }
  };

  const handlePinKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !pin[index] && index > 0) {
      pinRefs.current[index - 1]?.focus();
    }
  };

  const handlePay = () => {
    let valid = true;
    if (!/^3\d{9}$/.test(mobileNumber)) {
      setMobileError('Enter 10 digits after +92');
      valid = false;
    } else {
      setMobileError('');
    }
    if (pin.some(p => !p)) {
      setPinError('Please enter all 4 digits of your PIN');
      valid = false;
    } else {
      setPinError('');
    }
    if (valid) setStep('processing');
  };

  const cfg = provider ? providerConfig[provider] : null;

  // ──────────────────────────────────────────────────────────────────────────────
  // STEP 1 — SELECT PROVIDER
  // ──────────────────────────────────────────────────────────────────────────────
  if (step === 'select') {
    return (
      <div className="space-y-6">
        <div className="bg-surface-container-high/40 border border-white/10 rounded-2xl p-6 text-center shadow-lg backdrop-blur-md relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-electric-violet/5 to-transparent opacity-50"></div>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1 relative z-10">Total Amount Due</p>
          <p className="text-4xl font-h1 text-white relative z-10 tracking-tight">
            <span className="text-xl font-medium text-slate-400 mr-1">PKR</span>
            {amount.toLocaleString()}
          </p>
          <p className="text-xs text-slate-400 mt-2 relative z-10 font-medium">
            Booking for {seats.length} seat{seats.length > 1 ? 's' : ''} — #{seats.sort((a, b) => a - b).join(', #')}
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest text-center">Select Payment Method</p>
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => handleSelectProvider('jazzcash')}
              className="group flex flex-col items-center gap-4 rounded-2xl border border-white/5 bg-surface-container/40 p-6 transition-all duration-300 hover:border-rose-500/30 hover:bg-rose-500/5 hover:shadow-[0_0_30px_rgba(244,63,94,0.1)] active:scale-95"
            >
              <div className="transition-transform group-hover:scale-110 duration-300">
                <JazzCashLogo size={48} />
              </div>
              <div className="text-center">
                <p className="font-bold text-sm text-white group-hover:text-rose-400 transition-colors">JazzCash</p>
                <p className="text-[10px] uppercase tracking-widest text-slate-500 group-hover:text-slate-400">Mobile Wallet</p>
              </div>
            </button>

            <button
              onClick={() => handleSelectProvider('easypaisa')}
              className="group flex flex-col items-center gap-4 rounded-2xl border border-white/5 bg-surface-container/40 p-6 transition-all duration-300 hover:border-emerald-500/30 hover:bg-emerald-500/5 hover:shadow-[0_0_30px_rgba(16,185,129,0.1)] active:scale-95"
            >
              <div className="transition-transform group-hover:scale-110 duration-300">
                <EasypaisaLogo size={48} />
              </div>
              <div className="text-center">
                <p className="font-bold text-sm text-white group-hover:text-emerald-400 transition-colors">Easypaisa</p>
                <p className="text-[10px] uppercase tracking-widest text-slate-500 group-hover:text-slate-400">Mobile Wallet</p>
              </div>
            </button>
          </div>
        </div>

        <button 
          onClick={onCancel}
          className="w-full text-slate-500 hover:text-white font-semibold py-2 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm"
        >
          <span className="material-symbols-outlined text-[18px]">close</span>
          Cancel Booking
        </button>
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // STEP 2 — ENTER DETAILS
  // ──────────────────────────────────────────────────────────────────────────────
  if (step === 'enter_details' && cfg) {
    return (
      <div className="space-y-8">
        <div className="flex items-center gap-4 mb-4">
          <button 
            onClick={() => setStep('select')}
            className="p-2 rounded-lg hover:bg-white/5 text-slate-400 transition-colors"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <div className="flex items-center gap-3">
            {provider === 'jazzcash' ? <JazzCashLogo size={32} /> : <EasypaisaLogo size={32} />}
            <p className="font-h3 text-xl text-white">Pay via {cfg.name}</p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Mobile Number</label>
            <div className="relative group">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold border-r border-white/10 pr-3">+92</span>
              <input
                type="text"
                autoFocus
                placeholder="300 0000000"
                className={`w-full bg-surface-container/60 border ${mobileError ? 'border-rose-500/50' : 'border-white/10'} rounded-xl py-4 pl-16 pr-4 font-bold text-white tracking-wider text-lg focus:outline-none focus:border-electric-violet transition-all`}
                value={mobileNumber}
                onChange={(e) => setMobileNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
              />
            </div>
            {mobileError && <p className="text-xs text-rose-500 ml-1 font-medium">{mobileError}</p>}
          </div>

          <div className="flex flex-col gap-4">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">4-Digit MPIN</label>
            <div className="flex justify-between gap-4">
              {pin.map((digit, i) => (
                <input
                  key={i}
                  ref={el => pinRefs.current[i] = el}
                  type="password"
                  maxLength={1}
                  className={`w-full bg-surface-container/60 border ${pinError ? 'border-rose-500/50' : 'border-white/10'} rounded-xl py-4 text-center font-bold text-2xl text-white focus:outline-none focus:border-electric-violet transition-all`}
                  value={digit}
                  onChange={(e) => handlePinChange(i, e.target.value)}
                  onKeyDown={(e) => handlePinKeyDown(i, e)}
                />
              ))}
            </div>
            {pinError && <p className="text-xs text-rose-500 ml-1 font-medium text-center">{pinError}</p>}
          </div>

          <div className="pt-4">
            <button
              onClick={handlePay}
              className={`w-full ${provider === 'jazzcash' ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-900/20' : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-900/20'} text-white font-bold py-4 rounded-xl transition-all shadow-[0_0_20px_rgba(0,0,0,0.3)] flex items-center justify-center gap-3 text-lg active:scale-95`}
            >
              <span className="material-symbols-outlined">verified_user</span>
              Confirm Payment
            </button>
            <p className="text-center text-[10px] text-slate-500 mt-4 font-medium uppercase tracking-widest flex items-center justify-center gap-2">
              <span className="material-symbols-outlined text-[14px]">lock</span>
              Secure end-to-end encryption
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // STEP 3 — PROCESSING
  // ──────────────────────────────────────────────────────────────────────────────
  if (step === 'processing' && cfg) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center space-y-8">
        <div className="relative">
          <div className="w-24 h-24 rounded-full border-4 border-white/5 flex items-center justify-center relative z-10 overflow-hidden">
            <div 
              className={`absolute bottom-0 left-0 w-full transition-all duration-300 ${provider === 'jazzcash' ? 'bg-rose-600' : 'bg-emerald-600'}`}
              style={{ height: `${progress}%` }}
            ></div>
            <div className="relative z-20 flex flex-col items-center">
              <span className="material-symbols-outlined text-[32px] text-white animate-pulse">sync</span>
            </div>
          </div>
          <div className={`absolute inset-0 rounded-full blur-xl opacity-20 animate-pulse ${provider === 'jazzcash' ? 'bg-rose-500' : 'bg-emerald-500'}`}></div>
        </div>
        
        <div className="space-y-2">
          <h2 className="text-2xl font-h2 text-white">Authorizing...</h2>
          <p className="text-slate-400 font-medium tracking-wide max-w-[240px]">Connecting to your {cfg.name} wallet securely.</p>
        </div>
        
        <div className="w-full bg-surface-container border border-white/5 h-2 rounded-full overflow-hidden p-[1px]">
          <div 
            className={`h-full rounded-full transition-all duration-300 shadow-[0_0_10px_rgba(0,0,0,0.5)] ${provider === 'jazzcash' ? 'bg-rose-600' : 'bg-emerald-600'}`}
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // STEP 4 — SUCCESS
  // ──────────────────────────────────────────────────────────────────────────────
  if (step === 'success' && cfg) {
    return (
      <div className="flex flex-col items-center text-center space-y-8 py-4">
        <div className="relative">
          <div className="w-24 h-24 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shadow-[0_0_40px_rgba(16,185,129,0.2)] scale-110">
            <span className="material-symbols-outlined text-[48px] text-emerald-500">check_circle</span>
          </div>
          <div className="absolute top-0 right-0">
             <span className="flex h-4 w-4">
               <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
               <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500"></span>
             </span>
          </div>
        </div>

        <div className="space-y-2">
          <h2 className="text-3xl font-h1 text-white tracking-tight">Payment Successful</h2>
          <p className="text-slate-400 font-medium">Your tickets have been issued.</p>
        </div>

        <div className="w-full bg-surface-container/60 border border-white/10 rounded-2xl p-6 space-y-4 shadow-inner text-left backdrop-blur-md">
          <div className="flex justify-between items-center text-sm border-b border-white/5 pb-3">
            <span className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">Reference ID</span>
            <span className="text-white font-mono text-xs bg-surface-container px-2 py-1 rounded">{transactionId}</span>
          </div>
          <div className="flex justify-between items-center text-sm border-b border-white/5 pb-3">
            <span className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">Method</span>
            <span className="text-white font-bold flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${provider === 'jazzcash' ? 'bg-rose-500' : 'bg-emerald-500'}`}></span>
              {cfg.name} Wallet
            </span>
          </div>
          <div className="flex justify-between items-center text-sm pt-1">
            <span className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">Amount Paid</span>
            <span className="text-emerald-400 font-h2 text-lg">Rs. {amount.toLocaleString()}</span>
          </div>
        </div>

        <button
          onClick={() => onSuccess(transactionId, provider!)}
          className="w-full bg-electric-violet hover:bg-[#7e6be0] text-white font-bold py-4 rounded-xl transition-all shadow-[0_0_20px_hsla(255,65%,60%,0.3)] hover:shadow-[0_0_30px_hsla(255,65%,60%,0.5)] flex items-center justify-center gap-2 text-lg active:scale-95"
        >
          <span className="material-symbols-outlined text-[20px]">confirmation_number</span>
          View My Tickets
        </button>
      </div>
    );
  }

  return null;
}
