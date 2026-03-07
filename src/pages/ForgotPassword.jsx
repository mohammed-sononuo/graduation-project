import { Link } from 'react-router-dom';

/**
 * Placeholder for password reset. In production this would send a reset link via email.
 */
export default function ForgotPassword() {
  return (
    <div className="min-h-[calc(100vh-200px)] flex items-center justify-center bg-[#f7f6f3] px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-sm p-8 text-center">
        <div className="w-14 h-14 rounded-full bg-[#00356b]/10 flex items-center justify-center mx-auto mb-4">
          <svg className="w-7 h-7 text-[#00356b]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
          </svg>
        </div>
        <h1 className="text-xl font-bold text-[#0b2d52] mb-2">Forgot password?</h1>
        <p className="text-slate-600 text-sm mb-6">
          To reset your password, please contact your university IT support or administrator.
        </p>
        <Link
          to="/login"
          className="inline-block rounded-xl bg-[#00356b] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#002a54]"
        >
          Back to sign in
        </Link>
      </div>
    </div>
  );
}
