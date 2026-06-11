import { useEffect, useRef, useState } from 'react';
import { useOnlineStatus } from './useOnlineStatus';
import { salesApi } from '../api/sales';
import { useBusinessStore } from '../store/business.store';

const QUEUE_KEY = 'sme-offline-sales';

export type QueuedSale = {
  businessId: string;
  payload: Parameters<typeof salesApi.create>[1];
  queuedAt: string;
};

export function getQueue(): QueuedSale[] {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) ?? '[]');
  } catch {
    return [];
  }
}

export function enqueue(sale: QueuedSale) {
  const q = getQueue();
  q.push(sale);
  localStorage.setItem(QUEUE_KEY, JSON.stringify(q));
}

function clearQueue() {
  localStorage.removeItem(QUEUE_KEY);
}

export function useOfflineSync() {
  const online = useOnlineStatus();
  const businessId = useBusinessStore((s) => s.businessId);
  const [syncedCount, setSyncedCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const didSync = useRef(false);

  useEffect(() => {
    if (!online || !businessId || didSync.current) return;
    const queue = getQueue();
    if (queue.length === 0) return;

    didSync.current = true;
    setSyncing(true);

    Promise.allSettled(queue.map((q) => salesApi.create(q.businessId, q.payload)))
      .then((results) => {
        const succeeded = results.filter((r) => r.status === 'fulfilled').length;
        if (succeeded > 0) {
          setSyncedCount(succeeded);
          clearQueue();
        }
      })
      .finally(() => setSyncing(false));
  }, [online, businessId]);

  useEffect(() => {
    if (!online) didSync.current = false;
  }, [online]);

  return { syncing, syncedCount };
}
