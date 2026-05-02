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
      className="rounded-xl overflow-hidden bg-white flex items-center justify-center flex-shrink-0 shadow-sm border border-border"
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
      className="rounded-xl overflow-hidden bg-white flex items-center justify-center flex-shrink-0 shadow-sm border border-border"
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
      color: '#CF1F2E',
      bg: 'bg-red-50',
      border: 'border-red-200',
      ring: 'focus:ring-red-300',
      btn: 'bg-red-600 hover:bg-red-700',
      light: 'bg-red-100 text-red-700',
    },
    easypaisa: {
      name: 'Easypaisa',
      color: '#2E7D32',
      bg: 'bg-green-50',
      border: 'border-green-200',
      ring: 'focus:ring-green-300',
      btn: 'bg-green-600 hover:bg-green-700',
      light: 'bg-green-100 text-green-700',
    },
  };

  // Progress bar animation during processing
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
    // +92 is shown as prefix, so user types 10 digits starting with 3 (e.g. 3001234567)
    if (!/^3\d{9}$/.test(mobileNumber)) {
      setMobileError('Enter 10 digits after +92 (e.g. 3001234567)');
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
      <div className="space-y-5">
        {/* Amount Banner */}
        <div className="rounded-2xl bg-gradient-to-br from-accent/10 to-primary/10 border border-accent/20 px-5 py-4 text-center">
          <p className="text-sm text-muted-foreground mb-1">Total Amount Due</p>
          <p className="text-3xl font-extrabold text-foreground">Rs. {amount.toFixed(2)}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {seats.length} seat{seats.length > 1 ? 's' : ''} — #{seats.sort((a, b) => a - b).join(', #')}
          </p>
        </div>

        <p className="text-sm font-semibold text-foreground text-center">Select Payment Method</p>

        {/* Provider Cards */}
        <div className="grid grid-cols-2 gap-3">
          {/* JazzCash */}
          <button
            onClick={() => handleSelectProvider('jazzcash')}
            className="group flex flex-col items-center gap-3 rounded-2xl border-2 border-border bg-card p-5 transition-all duration-200 hover:border-red-400 hover:bg-red-50 hover:shadow-lg active:scale-95"
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-100 ring-2 ring-transparent group-hover:ring-red-300 transition-all">
              <JazzCashLogo />
            </div>
            <div>
              <p className="font-bold text-sm text-foreground">JazzCash</p>
              <p className="text-xs text-muted-foreground">Mobile Wallet</p>
            </div>
          </button>

          {/* Easypaisa */}
          <button
            onClick={() => handleSelectProvider('easypaisa')}
            className="group flex flex-col items-center gap-3 rounded-2xl border-2 border-border bg-card p-5 transition-all duration-200 hover:border-green-400 hover:bg-green-50 hover:shadow-lg active:scale-95"
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-green-100 ring-2 ring-transparent group-hover:ring-green-300 transition-all">
              <EasypaisaLogo />
            </div>
            <div>
              <p className="font-bold text-sm text-foreground">Easypaisa</p>
              <p className="text-xs text-muted-foreground">Mobile Wallet</p>
            </div>
          </button>
        </div>

        {/* Security Note */}
        <div className="flex items-center justify-center gap-2 rounded-xl bg-muted/40 border border-border px-3 py-2">
          <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          </svg>
          <p className="text-xs text-muted-foreground">256-bit SSL encrypted. Your data is safe.</p>
        </div>

        <button onClick={onCancel} className="w-full text-xs text-muted-foreground hover:text-foreground underline transition-colors text-center">
          ← Cancel and go back
        </button>
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // STEP 2 — ENTER DETAILS
  // ──────────────────────────────────────────────────────────────────────────────
  if (step === 'enter_details' && cfg) {
    return (
      <div className="space-y-5">
        {/* Provider Header */}
        <div className={`flex items-center gap-3 rounded-2xl ${cfg.bg} border ${cfg.border} px-4 py-3`}>
          {provider === 'jazzcash' ? <JazzCashLogo /> : <EasypaisaLogo />}
          <div>
            <p className="font-bold text-foreground">{cfg.name}</p>
            <p className="text-xs text-muted-foreground">Paying Rs. {amount.toFixed(2)}</p>
          </div>
          <button onClick={() => setStep('select')} className="ml-auto text-xs text-muted-foreground hover:text-foreground">Change</button>
        </div>

        {/* Mobile Number */}
        <div className="space-y-1.5">
          <label className="text-sm font-semibold text-foreground">Registered Mobile Number</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground select-none">+92</span>
            <input
              type="tel"
              maxLength={10}
              value={mobileNumber}
              onChange={e => {
                // Only allow digits
                const val = e.target.value.replace(/\D/g, '');
                setMobileNumber(val);
                setMobileError('');
              }}
              placeholder="3XX XXXXXXX"
              className={`w-full rounded-xl border bg-background pl-12 pr-4 py-3 text-sm outline-none transition-all focus:ring-2 ${mobileError ? 'border-red-400 focus:ring-red-200' : `border-border ${cfg.ring}`}`}
            />
          </div>
          <p className="text-xs text-muted-foreground">Enter 10 digits — +92 is already filled in</p>
          {mobileError && <p className="text-xs text-red-500">{mobileError}</p>}
        </div>

        {/* PIN */}
        <div className="space-y-1.5">
          <label className="text-sm font-semibold text-foreground">{cfg.name} 4-Digit PIN</label>
          <div className="flex gap-3 justify-center">
            {pin.map((digit, i) => (
              <input
                key={i}
                ref={el => { pinRefs.current[i] = el; }}
                type="password"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={e => handlePinChange(i, e.target.value)}
                onKeyDown={e => handlePinKeyDown(i, e)}
                className={`h-14 w-14 rounded-xl border-2 bg-background text-center text-xl font-bold outline-none transition-all focus:ring-2 focus:scale-105 ${
                  pinError ? 'border-red-400 focus:ring-red-200' : `border-border ${cfg.ring}`
                } ${digit ? `${cfg.border}` : ''}`}
              />
            ))}
          </div>
          {pinError && <p className="text-xs text-red-500 text-center">{pinError}</p>}
          <p className="text-xs text-muted-foreground text-center">Use any 4 digits (this is a demo)</p>
        </div>

        {/* Pay Button */}
        <button
          onClick={handlePay}
          className={`w-full ${cfg.btn} text-white font-bold py-3.5 rounded-xl transition-all active:scale-95 shadow-md hover:shadow-lg text-sm`}
        >
          Pay Rs. {amount.toFixed(2)} via {cfg.name}
        </button>

        <button onClick={() => setStep('select')} className="w-full text-xs text-muted-foreground hover:text-foreground underline text-center">
          ← Back to payment methods
        </button>
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // STEP 3 — PROCESSING
  // ──────────────────────────────────────────────────────────────────────────────
  if (step === 'processing' && cfg) {
    return (
      <div className="flex flex-col items-center py-6 space-y-6 text-center">
        {/* Animated Spinner Ring */}
        <div className="relative flex items-center justify-center">
          <div className="h-28 w-28">
            <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="42" fill="none" stroke="#e5e7eb" strokeWidth="8"/>
              <circle
                cx="50" cy="50" r="42" fill="none"
                stroke={cfg.color} strokeWidth="8"
                strokeDasharray={`${2 * Math.PI * 42}`}
                strokeDashoffset={`${2 * Math.PI * 42 * (1 - progress / 100)}`}
                strokeLinecap="round"
                style={{ transition: 'stroke-dashoffset 0.1s linear' }}
              />
            </svg>
          </div>
          <div className="absolute flex flex-col items-center">
            {provider === 'jazzcash' ? <JazzCashLogo /> : <EasypaisaLogo />}
          </div>
        </div>

        <div>
          <p className="text-lg font-bold text-foreground">Processing Payment...</p>
          <p className="text-sm text-muted-foreground mt-1">Please wait, communicating with {cfg.name}</p>
        </div>

        {/* Status steps */}
        <div className="w-full space-y-2 bg-muted/30 rounded-xl border border-border px-4 py-3 text-left">
          {[
            { label: 'Verifying mobile number', threshold: 20 },
            { label: 'Authenticating PIN', threshold: 50 },
            { label: 'Initiating transfer', threshold: 75 },
            { label: 'Confirming payment', threshold: 95 },
          ].map((s) => (
            <div key={s.label} className="flex items-center gap-2 text-sm">
              {progress >= s.threshold ? (
                <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
                </svg>
              ) : (
                <div className="w-4 h-4 rounded-full border-2 border-border flex-shrink-0 animate-pulse" />
              )}
              <span className={progress >= s.threshold ? 'text-foreground font-medium' : 'text-muted-foreground'}>
                {s.label}
              </span>
            </div>
          ))}
        </div>

        <p className="text-xs text-muted-foreground">Do not close this window</p>
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // STEP 4 — SUCCESS
  // ──────────────────────────────────────────────────────────────────────────────
  if (step === 'success' && cfg) {
    const handleDownloadReceipt = () => {
      const receiptText = [
        '================================================',
        `          ${cfg.name.toUpperCase()} PAYMENT RECEIPT          `,
        '================================================',
        `Transaction ID : ${transactionId}`,
        `Payment Method : ${cfg.name}`,
        `Mobile Number  : ${mobileNumber}`,
        `Amount Paid    : Rs. ${amount.toFixed(2)}`,
        `Seats          : #${seats.sort((a, b) => a - b).join(', #')}`,
        `Date & Time    : ${new Date().toLocaleString('en-PK')}`,
        `Status         : SUCCESSFUL`,
        '================================================',
        '     Thank you for choosing SwiftBus!     ',
        '================================================',
      ].join('\n');

      const blob = new Blob([receiptText], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `SwiftBus_Receipt_${transactionId}.txt`;
      a.click();
      URL.revokeObjectURL(url);
    };

    return (
      <div className="flex flex-col items-center text-center space-y-5 py-2">
        {/* Success icon with ring animation */}
        <div className="relative">
          <div className={`h-24 w-24 rounded-full ${cfg.bg} flex items-center justify-center border-4 ${cfg.border} shadow-lg`}>
            <svg className="w-12 h-12" style={{ color: cfg.color }} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
            </svg>
          </div>
          {/* Ripple rings */}
          <div className={`absolute inset-0 rounded-full border-2 ${cfg.border} animate-ping opacity-30`} />
        </div>

        <div>
          <p className="text-xl font-extrabold text-foreground">Payment Successful! 🎉</p>
          <p className="text-sm text-muted-foreground mt-1">Your booking is now confirmed</p>
        </div>

        {/* Receipt Card */}
        <div className={`w-full rounded-2xl ${cfg.bg} border-2 ${cfg.border} p-4 text-left space-y-3`}>
          {/* Provider header */}
          <div className="flex items-center gap-2 border-b border-current/10 pb-3">
            {provider === 'jazzcash' ? <JazzCashLogo /> : <EasypaisaLogo />}
            <div>
              <p className="font-bold text-sm text-foreground">{cfg.name}</p>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${cfg.light}`}>Payment Successful</span>
            </div>
          </div>

          {/* Details rows */}
          {[
            { label: 'Transaction ID', value: transactionId },
            { label: 'Amount Paid', value: `Rs. ${amount.toFixed(2)}` },
            { label: 'Seats Booked', value: `#${seats.sort((a, b) => a - b).join(', #')}` },
            { label: 'Mobile Number', value: `+92 ${mobileNumber}` },
            { label: 'Date & Time', value: new Date().toLocaleString('en-PK') },
          ].map(row => (
            <div key={row.label} className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">{row.label}</span>
              <span className="font-semibold text-foreground text-right">{row.value}</span>
            </div>
          ))}
        </div>

        {/* CTA buttons */}
        <button
          onClick={handleDownloadReceipt}
          className="w-full flex items-center justify-center gap-2 border-2 border-border bg-card hover:bg-muted/50 rounded-xl py-3 text-sm font-semibold transition-all active:scale-95"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
          </svg>
          Download Receipt (.txt)
        </button>

        <button
          onClick={() => onSuccess(transactionId, cfg.name)}
          className={`w-full ${cfg.btn} text-white font-bold py-3.5 rounded-xl transition-all active:scale-95 shadow-md text-sm`}
        >
          View My Booking →
        </button>
      </div>
    );
  }

  return null;
}
