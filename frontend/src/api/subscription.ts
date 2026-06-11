import api from './client';

export type Plan = {
  id: string;
  name: string;
  maxBusinesses: number;
  maxUsers: number;
  dataRetentionDays: number;
  hasExports: boolean;
  hasApiAccess: boolean;
  priceMonthlyUsd: string;
};

export type SubscriptionData = {
  plan: Plan | null;
  usage: {
    users: number;
    businesses: number;
  };
};

export const subscriptionApi = {
  get: (orgId: string) =>
    api.get<SubscriptionData>(`/organizations/${orgId}/subscription`).then((r) => r.data),
};
