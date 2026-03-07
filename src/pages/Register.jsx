import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiUrl } from '../api';
import { useAuth } from '../context/AuthContext';
import { isEmailAllowed, getEmailRuleMessage, MIN_PASSWORD_LENGTH } from '../../config/rules.js';

function Register() {
  const navigate = useNavigate();
  const { setUserAndToken } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    if (!email.trim()) {
      setError('Please enter your email.');
      return;
    }
    if (!isEmailAllowed(email)) {
      setError(getEmailRuleMessage() || 'Please use a valid university email.');
      return;
    }
    if (!password || password.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(apiUrl('/api/auth/register'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Registration failed. Please try again.');
        return;
      }
      if (data.user && data.token) {
        setUserAndToken(data.user, data.token);
        setMessage('Account created! Redirecting to home…');
        setTimeout(() => navigate('/', { replace: true }), 800);
      }
    } catch {
      setError('Cannot connect to server. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const layeredBg = {
    background: `linear-gradient(158deg,
      #ffffff 0%,
      #f7f4f4 38%,
      #f0eded 38%,
      #f6f6f6 58%,
      #efefef 58%,
      #efefef 78%,
      #e8e8e8 78%,
      #e8e8e8 100%
    )`,
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center py-12" style={layeredBg}>
      <div className="max-w-md w-full mx-auto px-6 relative">
        <div className="rounded-2xl border border-slate-200/80 bg-white shadow-md p-8 md:p-10">
          <h1 className="mt-2 text-center text-2xl md:text-3xl font-bold text-[#0b2d52] leading-tight">
            Create account
          </h1>
          <p className="mt-2 text-center text-sm text-slate-600 leading-relaxed">
            Register for the Najah platform. Use your university email.
          </p>
          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div>
              <label htmlFor="reg-email" className="block text-sm font-semibold text-slate-700 mb-1.5">
                Email Address
              </label>
              <input
                id="reg-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. student@stu.najah.edu"
                className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#00356b]/20 focus:border-[#00356b]"
              />
            </div>
            <div>
              <label htmlFor="reg-password" className="block text-sm font-semibold text-slate-700 mb-1.5">
                Password
              </label>
              <input
                id="reg-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#00356b]/20 focus:border-[#00356b]"
              />
            </div>
            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
                {error}
              </div>
            )}
            {message && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                {message}
              </div>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full inline-flex items-center justify-center rounded-xl bg-[#00356b] px-6 py-3 text-white font-semibold shadow-sm hover:bg-[#002a54] focus:outline-none focus:ring-2 focus:ring-[#00356b]/30 focus:ring-offset-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating account…' : 'Create account'}
            </button>
          </form>
          <p className="mt-8 text-center text-sm text-slate-600">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-[#00356b] hover:underline">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Register;
