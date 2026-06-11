import { useRegisterSW } from 'virtual:pwa-register/react';

export function PwaUpdateBanner() {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  if (!needRefresh) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-md">
      <div className="bg-gray-900 text-white rounded-2xl px-4 py-3 flex items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3 min-w-0">
          <svg className="h-5 w-5 text-brand-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <p className="text-sm font-medium truncate">A new version is available</p>
        </div>
        <button
          onClick={() => updateServiceWorker(true)}
          className="shrink-0 bg-brand-500 hover:bg-brand-400 text-white text-sm font-semibold px-3 py-1.5 rounded-lg transition active:scale-95"
        >
          Reload
        </button>
      </div>
    </div>
  );
}
