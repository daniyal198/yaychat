/**
 * In-app purchase adapter (legacy Bitcoin Yay subscription flow).
 *
 * `react-native-iap` is not installed in this app, so the store-purchase path
 * is unavailable. These wrappers keep the call sites type-safe and fail with a
 * message a user can act on, instead of throwing `undefined is not a function`
 * deep inside the checkout flow. Reinstate the real implementation by adding
 * `react-native-iap` and delegating to it here — no call site has to change.
 */

export class IapUnavailableError extends Error {
  constructor() {
    super('In-app purchases are not available in this build. Please use another payment method.');
    this.name = 'IapUnavailableError';
  }
}

export const isIapAvailable = (): boolean => false;

export const initIAPConnection = async (): Promise<null> => null;

export const getSubscriptions = async (_options: {skus: string[]}): Promise<never[]> => {
  throw new IapUnavailableError();
};

export const requestSubscription = async (
  _sku: string,
  _offerToken?: string,
  _basePlanId?: string,
  _pricingPhases?: unknown,
): Promise<never> => {
  throw new IapUnavailableError();
};
