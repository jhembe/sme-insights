import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { authApi } from '../../api/auth';
import { useAuthStore } from '../../store/auth.store';

export function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const setUser = useAuthStore((s) => s.setUser);
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    const email = searchParams.get('email') ?? '';
    const token = searchParams.get('token') ?? '';

    if (!email || !token) {
      setStatus('error');
      setMessage('Invalid verification link.');
      return;
    }

    authApi.verifyEmail(email, token)
      .then((res) => {
        setStatus('success');
        setMessage(res.data.message);
        if (user) setUser({ ...user, isVerified: true });
      })
      .catch((err) => {
        setStatus('error');
        setMessage(err?.response?.data?.message ?? 'Verification failed. The link may have expired.');
      });
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 p-8 max-w-md w-full text-center">
        {status === 'loading' && (
          <>
            <div className="h-12 w-12 rounded-full border-4 border-brand-200 border-t-brand-600 animate-spin mx-auto" />
            <p className="mt-4 text-sm text-gray-500">Verifying your email…</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="h-14 w-14 rounded-2xl bg-brand-50 flex items-center justify-center mx-auto">
              <svg className="h-7 w-7 text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="mt-4 text-xl font-bold text-gray-900">Email verified!</h1>
            <p className="mt-2 text-sm text-gray-500">{message}</p>
            <Link
              to="/dashboard"
              className="mt-6 inline-flex items-center gap-2 bg-brand-600 text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-brand-700 transition"
            >
              Go to dashboard
            </Link>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="h-14 w-14 rounded-2xl bg-red-50 flex items-center justify-center mx-auto">
              <svg className="h-7 w-7 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h1 className="mt-4 text-xl font-bold text-gray-900">Verification failed</h1>
            <p className="mt-2 text-sm text-gray-500">{message}</p>
            <Link
              to="/dashboard"
              className="mt-6 inline-flex items-center gap-2 text-brand-600 text-sm font-semibold hover:underline"
            >
              Back to dashboard →
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
