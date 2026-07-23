// //import * as RNIap from 'react-native-iap';
// import { Alert } from 'react-native';
// import { sendReceiptToServer } from './auth.service';

// let purchaseUpdateSubscription: any;
// let purchaseErrorSubscription: any;

// export const startIAPListeners = () => {
//   purchaseUpdateSubscription = RNIap.purchaseUpdatedListener(async (purchase) => {
//     const receipt = purchase.transactionReceipt;

//     if (receipt) {
//       try {
//         // ✅ Send receipt to your backend
//         await sendReceiptToServer(receipt);

//         // ✅ Finish the transaction
//         await RNIap.finishTransaction({ purchase, isConsumable: false });

//         Alert.alert('Purchase Successful', 'Thank you for subscribing!');
//       } catch (err) {
//         console.error('Receipt verification failed', err);
//       }
//     }
//   });

//   purchaseErrorSubscription = RNIap.purchaseErrorListener((error) => {
//     console.error('Purchase error listener', error);
//     Alert.alert('Purchase Error', error.message);
//   });
// };

// export const endIAPListeners = () => {
//   if (purchaseUpdateSubscription) {
//     purchaseUpdateSubscription.remove();
//     purchaseUpdateSubscription = null;
//   }
//   if (purchaseErrorSubscription) {
//     purchaseErrorSubscription.remove();
//     purchaseErrorSubscription = null;
//   }
// };