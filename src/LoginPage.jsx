import { useState } from 'react';

/* ── tiny Eye icon ── */
function EyeIcon({ open }) {
  return open ? (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
    </svg>
  ) : (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  );
}

export default function LoginPage({ onLogin }) {
  const [email,       setEmail]       = useState('');
  const [password,    setPassword]    = useState('');
  const [showPass,    setShowPass]    = useState(false);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState('');
  const [mode,        setMode]        = useState('login'); // 'login' | 'signup' | 'forgot'

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!email)    { setError('Please enter your email.'); return; }
    if (mode !== 'forgot' && !password) { setError('Please enter your password.'); return; }

    setLoading(true);

    try {
      if (mode === 'login' || mode === 'signup') {
        const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/signup';
        const nameInput = document.getElementById('inp-name');
        const payload = mode === 'signup' 
          ? { name: nameInput ? nameInput.value : '', email, password } 
          : { email, password };
        
        const res = await fetch(`http://app-backend-production-f68e.up.railway.app${endpoint}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        
        const data = await res.json();
        
        if (!res.ok) {
          throw new Error(data.error || 'Something went wrong');
        }
        
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        
        setLoading(false);
        onLogin();
      } else {
        // Forgot password simulation
        setTimeout(() => {
          setLoading(false);
          setMode('login');
        }, 1000);
      }
    } catch (err) {
      setLoading(false);
      setError(err.message);
    }
  }

  const titles = {
    login:  { head: 'Welcome back',     sub: "Don't have an account?",   link: 'Sign up',    next: 'signup' },
    signup: { head: 'Create account',   sub: 'Already have an account?', link: 'Log in',     next: 'login'  },
    forgot: { head: 'Reset password',   sub: 'Remembered it?',           link: 'Back to login', next: 'login' },
  };
  const t = titles[mode];

  return (
    <div className="min-h-screen flex overflow-hidden bg-[#090c0a]">

      {/* ── LEFT PANEL ──────────────────────────────────────────────────────── */}
      <div className="relative hidden lg:flex flex-col justify-between w-[46%] min-h-screen overflow-hidden px-12 py-10">

        {/* Layered dark-to-orange gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#0a0c09] via-[#0f1209] to-[#1a0d00]" />

        {/* Animated glow orbs */}
        <div className="absolute top-[-10%] left-[-10%] w-[55%] h-[55%] rounded-full bg-orange-600/10 blur-[90px] animate-pulse-slow" />
        <div className="absolute bottom-[10%] right-[-5%] w-[45%] h-[45%] rounded-full bg-amber-500/8 blur-[80px] animate-pulse-slow2" />

        {/* Dot-grid wave overlay */}
        <div className="absolute inset-0 wave-dots-bg opacity-30" />

        {/* Animated wave SVG layer */}
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 600 800" preserveAspectRatio="xMidYMid slice">
          <defs>
            <radialGradient id="wg1" cx="40%" cy="60%" r="60%">
              <stop offset="0%" stopColor="#f97316" stopOpacity="0.18"/>
              <stop offset="100%" stopColor="#f97316" stopOpacity="0"/>
            </radialGradient>
            <radialGradient id="wg2" cx="70%" cy="30%" r="50%">
              <stop offset="0%" stopColor="#fb923c" stopOpacity="0.10"/>
              <stop offset="100%" stopColor="#fb923c" stopOpacity="0"/>
            </radialGradient>
          </defs>
          <ellipse cx="200" cy="500" rx="320" ry="280" fill="url(#wg1)" className="wave-float"/>
          <ellipse cx="450" cy="200" rx="250" ry="200" fill="url(#wg2)" className="wave-float2"/>
        </svg>

        {/* Content */}
        <div className="relative z-10">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center shadow-lg shadow-orange-900/40">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
                <path d="M6 12v5c3 3 9 3 12 0v-5"/>
              </svg>
            </div>
            <span className="text-white font-bold text-lg tracking-tight">Edu Connect</span>
          </div>
        </div>

        {/* Tagline */}
        <div className="relative z-10 pb-4">
          <h2 className="text-white font-extrabold text-3xl leading-tight mb-3">
            Empowering Classrooms<br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-amber-400">with AI.</span>
          </h2>
          <p className="text-slate-400 text-base font-light leading-relaxed">
            Learn smarter. Teach better.
          </p>

          {/* Feature pills */}
          <div className="flex flex-col gap-2.5 mt-8">
            {[
              { icon: '🎙️', text: 'One-tap lecture recording' },
              { icon: '🤖', text: 'AI-generated notes instantly' },
              { icon: '📊', text: 'Automated presentations' },
            ].map(({ icon, text }) => (
              <div key={text} className="flex items-center gap-3">
                <span className="w-7 h-7 rounded-lg bg-orange-500/15 border border-orange-500/20 flex items-center justify-center text-sm">{icon}</span>
                <span className="text-slate-400 text-sm">{text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── RIGHT PANEL ─────────────────────────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center px-5 py-12 bg-[#0d1009]">
        <div className="w-full max-w-md">

          {/* Card */}
          <div className="bg-[#141a10]/80 backdrop-blur-xl border border-white/8 rounded-2xl p-8 shadow-2xl shadow-black/60">

            {/* Mobile logo */}
            <div className="flex lg:hidden items-center gap-2 mb-8">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2">
                  <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
                  <path d="M6 12v5c3 3 9 3 12 0v-5"/>
                </svg>
              </div>
              <span className="text-white font-bold text-base">Edu Connect</span>
            </div>

            {/* Heading */}
            <h1 className="text-white font-bold text-3xl mb-1">{t.head}</h1>
            <p className="text-slate-400 text-sm mb-7">
              {t.sub}{' '}
              <button
                onClick={() => { setMode(t.next); setError(''); }}
                className="text-orange-400 hover:text-orange-300 font-medium underline-offset-2 hover:underline transition-colors"
              >
                {t.link}
              </button>
            </p>

            {/* Error */}
            {error && (
              <div className="mb-4 flex items-center gap-2 px-4 py-3 rounded-xl bg-red-900/30 border border-red-500/30 text-red-400 text-sm fade-in-up">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">

              {/* Name field (signup only) */}
              {mode === 'signup' && (
                <div className="fade-in-up">
                  <input
                    id="inp-name"
                    type="text"
                    placeholder="Full name"
                    className="w-full bg-[#1e2618] border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder-slate-500 text-sm outline-none focus:border-orange-500/60 focus:ring-1 focus:ring-orange-500/30 transition-all duration-200"
                  />
                </div>
              )}

              {/* Email */}
              <input
                id="inp-email"
                type="email"
                placeholder="Email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full bg-[#1e2618] border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder-slate-500 text-sm outline-none focus:border-orange-500/60 focus:ring-1 focus:ring-orange-500/30 transition-all duration-200"
              />

              {/* Password */}
              {mode !== 'forgot' && (
                <div className="relative">
                  <input
                    id="inp-password"
                    type={showPass ? 'text' : 'password'}
                    placeholder="Enter password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full bg-[#1e2618] border border-white/10 rounded-xl px-4 py-3.5 pr-12 text-white placeholder-slate-500 text-sm outline-none focus:border-orange-500/60 focus:ring-1 focus:ring-orange-500/30 transition-all duration-200"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(s => !s)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-orange-400 transition-colors"
                    tabIndex={-1}
                  >
                    <EyeIcon open={showPass} />
                  </button>
                </div>
              )}

              {/* Forgot password */}
              {mode === 'login' && (
                <div className="flex justify-end -mt-1">
                  <button
                    type="button"
                    onClick={() => { setMode('forgot'); setError(''); }}
                    className="text-sm text-slate-400 hover:text-orange-400 transition-colors underline-offset-2 hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>
              )}

              {/* Submit */}
              <button
                id="btn-login-submit"
                type="submit"
                disabled={loading}
                className="
                  relative w-full py-3.5 rounded-xl font-semibold text-white text-base
                  bg-gradient-to-r from-orange-500 to-amber-500
                  shadow-lg shadow-orange-900/40
                  hover:from-orange-400 hover:to-amber-400
                  hover:scale-[1.02] active:scale-[0.98]
                  transition-all duration-200 cursor-pointer
                  disabled:opacity-60 disabled:cursor-not-allowed disabled:scale-100
                  flex items-center justify-center gap-2
                "
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    {mode === 'forgot' ? 'Sending...' : 'Signing in...'}
                  </>
                ) : (
                  mode === 'login' ? 'Login' : mode === 'signup' ? 'Create Account' : 'Send Reset Link'
                )}
              </button>
            </form>

            {/* Footer note */}
            <p className="mt-6 text-center text-xs text-slate-600">
              By continuing, you agree to our{' '}
              <span className="text-slate-500 hover:text-orange-400 cursor-pointer transition-colors">Terms</span>
              {' '}and{' '}
              <span className="text-slate-500 hover:text-orange-400 cursor-pointer transition-colors">Privacy Policy</span>
            </p>
          </div>

          <p className="text-center mt-6 text-xs text-slate-600">
            Edu Connect · AI-Powered LMS · Final Year Project
          </p>
        </div>
      </div>
    </div>
  );
}
