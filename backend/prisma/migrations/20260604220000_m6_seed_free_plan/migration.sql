-- Seed the Free plan (reference data for M6)
INSERT INTO "Plan" ("id", "name", "maxBusinesses", "maxUsers", "dataRetentionDays", "hasExports", "hasApiAccess", "priceMonthlyUsd", "createdAt")
VALUES ('free', 'Free', 1, 3, 90, false, false, 0.00, NOW())
ON CONFLICT ("id") DO NOTHING;
