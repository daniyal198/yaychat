// import { Platform } from 'react-native';
// import * as RNIap from 'react-native-iap';

// /*import { getSubscriptions } from 'react-native-iap';

// const products = [
//   'btcy.electric',
//   'btcy.turbo',
//   'btcy.nuclear',
// ]; */

// export const initIAPConnection = async () => {
//   try {
//     const result = await RNIap.initConnection();
//     console.log('IAP Connection', result);
//     await RNIap.flushFailedPurchasesCachedAsPendingAndroid();
//     return result;
//   } catch (err) {
//     console.error('IAP init error', err);
//     return null;
//   }
// };

// /*
// export async function fetchSubscriptions() {
//   try {
//     const subs = await getSubscriptions({ skus: products });
//     return subs;
//   } catch (err) {
//     console.error('Failed to fetch subscriptions:', err);
//     return [];
//   }
// }*/

// export const requestSubscription = async (sku: string, offerToken?: string, basePlanId?: string, pricingPhases?: any) => {
//   try {
//     console.log('Attempting purchase with:', { sku, offerToken });

//     if (Platform.OS === 'android') {
//       // Android requires more detailed parameters
//       const purchase = await RNIap.requestSubscription({
//         sku,
//         ...(offerToken ? {
//           subscriptionOffers: [{
//             sku,
//             offerToken,
//             basePlanId: basePlanId, 
//             pricingPhases: pricingPhases || [
//               {
//                 price: '10000.00', // Match your product price
//                 priceCurrencyCode: 'INR',
//                 billingPeriod: 'P1M',
//                 recurrenceMode: 1 // RECURRING
//               }
//             ]
//           }]
//         } : {})
//       });
//       return purchase;
//     } else {
//       // iOS implementation remains simpler
//       const purchase = await RNIap.requestSubscription({ sku });
//       return purchase;
//     }
//   } catch (err:any) {
//     console.error('Full purchase error:', {
//       message: err.message,
//       code: err.code,
//       debugMessage: err.debugMessage,
//       responseCode: err.responseCode
//     });
//     throw err;
//   }
// };

// export const endIAPConnection = async () => {
//   try {
//     await RNIap.endConnection();
//   } catch (err) {
//     console.error('endConnection error', err);
//   }
// };