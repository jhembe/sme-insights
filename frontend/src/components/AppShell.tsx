import { ReactNode, useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { NavLink, useNavigate } from 'react-router-dom';
import { useBusinessStore } from '../store/business.store';
import { useAuthStore } from '../store/auth.store';
import { useRole } from '../hooks/useRole';
import { authApi } from '../api/auth';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { useOfflineSync } from '../hooks/useOfflineQueue';

type NavItem = { to: string; label: string; icon: ReactNode; show: boolean };

function MobileBottomNav({ onOpenMore }: { onOpenMore: () => void }) {
  const { canViewAnalytics } = useRole();
  const homeTarget = canViewAnalytics ? '/dashboard' : '/sales';

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-gray-100"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex items-center justify-around h-14 px-1">
        {/* Home */}
        <NavLink
          to={homeTarget}
          end
          className={({ isActive }) =>
            `flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition ${
              isActive ? 'text-brand-600' : 'text-gray-400'
            }`
          }
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
              d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          <span className="text-[10px] font-medium leading-none">Home</span>
        </NavLink>

        {/* Sales */}
        <NavLink
          to="/sales"
          end
          className={({ isActive }) =>
            `flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition ${
              isActive ? 'text-brand-600' : 'text-gray-400'
            }`
          }
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <span className="text-[10px] font-medium leading-none">Sales</span>
        </NavLink>

        {/* New Sale — centre FAB */}
        <NavLink
          to="/sales/new"
          className="flex flex-col items-center gap-1 -mt-4"
        >
          <div className="h-12 w-12 rounded-full bg-brand-600 flex items-center justify-center shadow-lg active:scale-95 transition">
            <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </div>
          <span className="text-[10px] font-medium leading-none text-gray-400">New</span>
        </NavLink>

        {/* Products */}
        <NavLink
          to="/products"
          className={({ isActive }) =>
            `flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition ${
              isActive ? 'text-brand-600' : 'text-gray-400'
            }`
          }
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
              d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
          <span className="text-[10px] font-medium leading-none">Products</span>
        </NavLink>

        {/* More */}
        <button
          onClick={onOpenMore}
          className="flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl text-gray-400 transition"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
              d="M4 6h16M4 12h16M4 18h16" />
          </svg>
          <span className="text-[10px] font-medium leading-none">More</span>
        </button>
      </div>
    </nav>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const businessName = useBusinessStore((s) => s.businessName);
  const accentColor = useBusinessStore((s) => s.accentColor);
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    document.documentElement.setAttribute('data-accent', accentColor ?? 'green');
  }, [accentColor]);
  const logout = useAuthStore((s) => s.logout);
  const clearBusiness = useBusinessStore((s) => s.clearBusiness);
  const navigate = useNavigate();
  const { canViewAnalytics, canManageExpenses, canImportExport, canManageTeam } = useRole();
  const isVerified = useAuthStore((s) => s.user?.isVerified);
  const [resendState, setResendState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const { t, i18n } = useTranslation();
  const online = useOnlineStatus();
  const { syncing, syncedCount } = useOfflineSync();
  const [showSynced, setShowSynced] = useState(false);

  useEffect(() => {
    if (syncedCount > 0) {
      setShowSynced(true);
      const timer = setTimeout(() => setShowSynced(false), 4000);
      return () => clearTimeout(timer);
    }
  }, [syncedCount]);
  const [lang, setLang] = useState(i18n.language.startsWith('sw') ? 'sw' : 'en');

  const toggleLang = () => {
    const next = lang === 'en' ? 'sw' : 'en';
    setLang(next);
    i18n.changeLanguage(next);
    localStorage.setItem('sme-lang', next);
  };

  const handleResend = useCallback(async () => {
    setResendState('sending');
    try {
      await authApi.resendVerification();
      setResendState('sent');
    } catch {
      setResendState('error');
    }
  }, []);

  const nav: NavItem[] = [
    {
      to: '/dashboard',
      label: t('nav.dashboard'),
      show: canViewAnalytics,
      icon: (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
            d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
    },
    {
      to: '/analytics',
      label: t('nav.analytics'),
      show: canViewAnalytics,
      icon: (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
            d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      to: '/sales',
      label: t('nav.sales'),
      show: true,
      icon: (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      ),
    },
    {
      to: '/products',
      label: t('nav.products'),
      show: true,
      icon: (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
            d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      ),
    },
    {
      to: '/customers',
      label: t('nav.customers'),
      show: true,
      icon: (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
            d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
    },
    {
      to: '/expenses',
      label: t('nav.expenses'),
      show: canManageExpenses,
      icon: (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
            d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
        </svg>
      ),
    },
    {
      to: '/import-export',
      label: t('nav.importExport'),
      show: canImportExport,
      icon: (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
            d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      ),
    },
    {
      to: '/team',
      label: t('nav.team'),
      show: canManageTeam,
      icon: (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
    {
      to: '/activity',
      label: t('nav.activity'),
      show: canManageTeam,
      icon: (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
        </svg>
      ),
    },
    {
      to: '/settings',
      label: t('nav.settings'),
      show: true,
      icon: (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
    {
      to: '/billing',
      label: t('nav.billing'),
      show: true,
      icon: (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
            d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
        </svg>
      ),
    },
  ];

  const handleLogout = async () => {
    try { await authApi.logout(); } catch {}
    logout();
    clearBusiness();
    navigate('/login', { replace: true });
  };

  const initials = user
    ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
    : '?';

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar — desktop */}
      <aside className="hidden md:flex w-60 flex-col bg-white border-r border-gray-200 shrink-0">
        <SidebarContents
          nav={nav}
          businessName={businessName}
          initials={initials}
          user={user}
          onLogout={handleLogout}
          lang={lang}
          onToggleLang={toggleLang}
        />
      </aside>

      {/* Sidebar — mobile overlay (opened via bottom nav "More") */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 flex md:hidden">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative w-64 flex flex-col bg-white shadow-2xl h-full z-10">
            <SidebarContents
              nav={nav}
              businessName={businessName}
              initials={initials}
              user={user}
              onLogout={handleLogout}
              onNavClick={() => setMobileOpen(false)}
              lang={lang}
              onToggleLang={toggleLang}
            />
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Top bar — mobile only */}
        <header className="md:hidden flex items-center justify-between px-4 h-14 bg-white border-b border-gray-100">
          <span className="text-sm font-bold text-gray-900 truncate">
            {businessName ?? 'SME Insights'}
          </span>
          <div className="h-8 w-8 rounded-full bg-brand-600 text-white text-xs font-bold flex items-center justify-center shrink-0">
            {initials}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 pb-24 md:p-8 md:pb-8">
          {/* Offline banner */}
          {!online && (
            <div className="mb-4 rounded-2xl bg-gray-900 text-white px-4 py-3 flex items-center gap-3">
              <svg className="h-4 w-4 shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M18.364 5.636a9 9 0 010 12.728M15.536 8.464a5 5 0 010 7.072M12 12h.01M8.464 15.536a5 5 0 010-7.072M5.636 18.364a9 9 0 010-12.728" />
              </svg>
              <p className="text-sm font-medium">{t('offline.banner')}</p>
            </div>
          )}
          {/* Sync in-progress */}
          {syncing && (
            <div className="mb-4 rounded-2xl bg-brand-50 ring-1 ring-brand-200 px-4 py-3 flex items-center gap-3">
              <svg className="h-4 w-4 text-brand-500 animate-spin shrink-0" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              <p className="text-sm text-brand-700">{t('offline.syncing', { count: 1 })}</p>
            </div>
          )}
          {/* Sync done toast */}
          {showSynced && (
            <div className="mb-4 rounded-2xl bg-emerald-50 ring-1 ring-emerald-200 px-4 py-3 flex items-center gap-3">
              <svg className="h-4 w-4 text-emerald-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <p className="text-sm text-emerald-700">{t('offline.synced', { count: syncedCount })}</p>
            </div>
          )}
          {/* Email verification banner */}
          {isVerified === false && (
            <div className="mb-6 rounded-2xl bg-yellow-50 ring-1 ring-yellow-200 px-4 py-3 flex items-start gap-3">
              <svg className="h-5 w-5 text-yellow-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-yellow-800">{t('verify.banner')}</p>
                {resendState === 'sent' ? (
                  <p className="mt-1 text-xs text-yellow-700 font-medium">{t('verify.sent')}</p>
                ) : resendState === 'error' ? (
                  <p className="mt-1 text-xs text-red-600 font-medium">{t('verify.failed')}</p>
                ) : (
                  <button
                    onClick={handleResend}
                    disabled={resendState === 'sending'}
                    className="mt-1 text-xs font-semibold text-yellow-800 underline hover:text-yellow-900 disabled:opacity-50"
                  >
                    {resendState === 'sending' ? t('verify.sending') : t('verify.resend')}
                  </button>
                )}
              </div>
            </div>
          )}
          {children}
        </main>
      </div>

      {/* Mobile bottom nav */}
      <MobileBottomNav onOpenMore={() => setMobileOpen(true)} />
    </div>
  );
}

function SidebarContents({
  nav,
  businessName,
  initials,
  user,
  onLogout,
  onNavClick,
  lang,
  onToggleLang,
}: {
  nav: NavItem[];
  businessName: string | null;
  initials: string;
  user: { firstName: string; lastName: string; email: string } | null;
  onLogout: () => void;
  onNavClick?: () => void;
  lang: string;
  onToggleLang: () => void;
}) {
  return (
    <>
      {/* Logo / brand */}
      <div className="px-5 py-5 border-b border-gray-100">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-brand-600 flex items-center justify-center shrink-0">
            <svg className="h-4 w-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-gray-900 truncate leading-tight">
              {businessName ?? 'SME Insights'}
            </p>
            <p className="text-xs text-gray-400 truncate">Business Dashboard</p>
          </div>
        </div>
      </div>

      {/* Nav links */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {nav.filter((item) => item.show).map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={onNavClick}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                isActive
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`
            }
          >
            {item.icon}
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* User footer */}
      <div className="border-t border-gray-100 px-3 py-3">
        <NavLink
          to="/change-password"
          onClick={onNavClick}
          className={({ isActive }) =>
            `flex items-center gap-3 rounded-xl px-2 py-2 mb-1 text-sm font-medium transition-all ${
              isActive
                ? 'bg-brand-600 text-white shadow-sm'
                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
            }`
          }
        >
          <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
              d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
          </svg>
          Change password
        </NavLink>
        <div className="flex items-center gap-3 rounded-xl px-2 py-2">
          <div className="h-8 w-8 rounded-full bg-brand-600 text-white text-xs font-bold flex items-center justify-center shrink-0">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-gray-900 truncate">
              {user?.firstName} {user?.lastName}
            </p>
            <p className="text-xs text-gray-400 truncate">{user?.email}</p>
          </div>
          <button
            onClick={onToggleLang}
            title={lang === 'en' ? 'Switch to Kiswahili' : 'Switch to English'}
            className="rounded-lg px-1.5 py-1 text-[10px] font-bold text-gray-400 hover:bg-gray-100 hover:text-brand-600 transition shrink-0 leading-none"
          >
            {lang === 'en' ? 'SW' : 'EN'}
          </button>
          <button
            onClick={onLogout}
            title="Sign out"
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition shrink-0"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </div>
    </>
  );
}
