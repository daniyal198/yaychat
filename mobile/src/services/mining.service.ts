// services/MiningBalanceService.ts
let cachedBalance = '0.00000';

export const getCachedBalance = () => cachedBalance;
export const updateBalance = (newBalance: string) => {
  cachedBalance = newBalance;
};