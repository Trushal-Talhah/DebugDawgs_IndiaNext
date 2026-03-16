import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, User, Zap, Eye, EyeOff, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import CyberParticleBackground from '../components/shared/CyberParticleBackground';

/* ── social button (shared) ── */
function SocialButton({ onClick, icon, label, disabled }) {
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      disabled={disabled}
      className="flex items-center justify-center gap-3 w-full py-3 px-4 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-sm font-semibold text-gray-700 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {icon}
      {label}
    </motion.button>
  );
}

/* ── password strength indicator ── */
function PasswordStrength({ password }) {
  const score = [/.{8,}/, /[A-Z]/, /[0-9]/, /[^A-Za-z0-9]/].filter((r) => r.test(password)).length;
  const labels = ['', 'Weak', 'Fair', 'Good', 'Strong'];
  const colors = ['', 'bg-red-400', 'bg-amber-400', 'bg-blue-400', 'bg-emerald-500'];
  if (!password) return null;
  return (
    <div className="mt-2 flex items-center gap-1.5">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className={`h-1 flex-1 rounded-full transition-all ${i <= score ? colors[score] : 'bg-gray-200'}`} />
      ))}
      <span className="text-xs text-gray-400 ml-1">{labels[score]}</span>
    </div>
  );
}

export default function SignupPage() {
  const { signup, loginWithGoogle, loginWithGitHub } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handle = (fn) => async () => {
    setError('');
    setLoading(true);
    try {
      await fn();
      navigate('/dashboard');
    } catch (err) {
      setError(friendlyError(err.code));
    } finally {
      setLoading(false);
    }
  };

  async function handleSignup(e) {
    e.preventDefault();
    if (password !== confirm) return setError('Passwords do not match.');
    if (password.length < 6) return setError('Password must be at least 6 characters.');
    setError('');
    setLoading(true);
    try {
      await signup(email, password, name);
      navigate('/dashboard');
    } catch (err) {
      setError(friendlyError(err.code));
    } finally {
      setLoading(false);
    }
  }

  function friendlyError(code) {
    const map = {
      'auth/email-already-in-use': 'An account with this email already exists.',
      'auth/invalid-email': 'Please enter a valid email address.',
      'auth/weak-password': 'Password should be at least 6 characters.',
      'auth/popup-closed-by-user': 'Sign-in popup was closed.',
      'auth/account-exists-with-different-credential': 'Account already exists with a different provider.',
    };
    return map[code] ?? 'Something went wrong. Please try again.';
  }

  const fieldClass =
    'w-full py-3 rounded-xl border border-gray-200 text-sm text-gray-900 bg-gray-50 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all';

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center relative overflow-hidden py-10">
      {/* 3D particle background */}
      <CyberParticleBackground />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-md"
      >
        {/* logo */}
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-200">
            <Zap className="w-5 h-5 text-white" />
          </span>
          <span className="text-2xl font-bold text-gray-900 tracking-tight">SentinelAI</span>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-xl shadow-gray-100 p-8">
          <h1 className="text-2xl font-bold text-gray-900 text-center">Create an account</h1>
          <p className="mt-1.5 text-sm text-gray-500 text-center">Start securing your systems today</p>

          {/* error banner */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-5 flex items-center gap-2.5 px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-600"
            >
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </motion.div>
          )}

          {/* form */}
          <form className="mt-6 space-y-4" onSubmit={handleSignup}>
            {/* full name */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Full Name</label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Jane Doe"
                  className={`${fieldClass} pl-10 pr-4`}
                />
              </div>
            </div>

            {/* email */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Email</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className={`${fieldClass} pl-10 pr-4`}
                />
              </div>
            </div>

            {/* password */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type={showPw ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className={`${fieldClass} pl-10 pr-11`}
                />
                <button type="button" onClick={() => setShowPw((v) => !v)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <PasswordStrength password={password} />
            </div>

            {/* confirm password */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Confirm Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type={showPw ? 'text' : 'password'}
                  required
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="••••••••"
                  className={`${fieldClass} pl-10 pr-11`}
                />
                {confirm && (
                  <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
                    {confirm === password
                      ? <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      : <AlertCircle className="w-4 h-4 text-red-400" />}
                  </div>
                )}
              </div>
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl text-sm font-semibold text-white shadow-lg shadow-blue-200 transition-all hover:shadow-xl disabled:opacity-60 disabled:cursor-not-allowed"
              style={{ background: 'linear-gradient(135deg, #3b82f6, #6366f1, #a855f7)' }}
            >
              {loading ? 'Creating account…' : 'Create Account'}
            </motion.button>
          </form>

          {/* divider */}
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-gray-100" />
            <span className="text-xs text-gray-400 font-medium">or sign up with</span>
            <div className="flex-1 h-px bg-gray-100" />
          </div>

          {/* social buttons */}
          <div className="space-y-3">
            <SocialButton
              disabled={loading}
              onClick={handle(loginWithGoogle)}
              label="Continue with Google"
              icon={
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
              }
            />
            <SocialButton
              disabled={loading}
              onClick={handle(loginWithGitHub)}
              label="Continue with GitHub"
              icon={
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
                </svg>
              }
            />
          </div>

          {/* login link */}
          <p className="mt-6 text-center text-sm text-gray-500">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-blue-600 hover:text-blue-700 no-underline">
              Sign in
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
