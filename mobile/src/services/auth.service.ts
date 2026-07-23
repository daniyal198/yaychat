// src/services/auth.service.ts
import API from './api';

interface RegisterPayload {
  firstName: string;
  lastName: string;
  username: string;
  countryCode: string;
  country: string;
  phoneNumber: string;
  email: string;
  password: string;
  confirmPassword: string;
  referralCode: string;
}

interface RegisterPayloadForPhone {
  firstName: string;
  lastName: string;
  username: string;
  countryCode: string;
  country: string;
  phone: string;
  email: string;
  password: string;
  confirmPassword: string;
  referralCode: string;
}

export const registerUser = async (payload: RegisterPayload) => {
  try {
    const res = await API.post('/api/v1/inex/user/registerwithapp', payload,
      { timeout: 180000 } // 3 minutes timeout
    );
    return res;
  } catch (error: any) {
    console.log("err", error);
    //throw error.response?.data || { message: 'Network Error' };
    return error;
  }
};

export const sendReceiptToServer = async (receipt: string) => {
  try {
    const response = await API.post('/api/v1/inex/order/appleNotificationHandler', {
      receiptData: receipt,
    });
    return response.data;
  } catch (error: any) {
    console.log("err", error);
    //throw error.response?.data || { message: 'Network Error' };
    return error;
  }
};

export const registerUserWithPhone = async (payload: any) => {
  try {
    console.log(payload)
    const res = await API.post('/api/v1/inex/user/registerWithPhone', payload,
      { timeout: 180000 } // 3 minutes timeout
    );
    return res;
  } catch (error: any) {
    console.log("err", error);
    console.log("payload", payload);
    //throw error.response?.data || { message: 'Network Error' };
    return error;
  }
};

export const contactUs = async ({
  email,
  message,
  website,
  subject = '',
  name = '',
}: {
  email: string;
  message: string;
  website: string;
  subject?: string;
  name?: string;
}) => {
  try {
    const payload = {
      email,
      message,
      website,
      subject,
      name,
    };

    console.log('Payload sent to backend:', payload);

    const res = await API.post('/api/v1/inex/basic/emailToAdmin', payload);
    return res.data;
  } catch (error: any) {
    console.log('Error during contactUs API call:', error?.response || error);
    return error?.response?.data || { message: 'Something went wrong' };
  }
};


export const sendOtp = async (email: string, type: string, website: string = 'BTCY-MOBLIE-APP') => {
  try {
    const result = await API.post('/api/v1/inex/user/sendOtp', { email, type, website });
    return result.data;
  } catch (e: any) {
    throw e.response?.data || { message: 'Network Error' };
  }
};

export const sendPhoneOtp = async (phone: string) => {
  try {
    const result = await API.post('/api/v1/inex/user/sendPhoneOtp', { phone });
    return result.data;
  } catch (e: any) {
    throw e.response?.data || { message: 'Network Error' };
  }
};


export const validatePhoneOtp = async (phone: string, code: string) => {
  try {
    const result = await API.post('/api/v1/inex/user/validatePhoneOtp', {
      phone: phone,
      code: code,
    });
    return result.data;
  } catch (e: any) {
    console.log('FAILED: unable to perform API request (validatePhoneOtp)');
    console.log(e);
    console.log(e.response.data);
    return e.response.data;
  }
};

export const sendForgotPasswordOtp = async (email: string) => {
  try {
    const result = await API.post('/api/v1/inex/user/sendForgotOtp', { email });
    return result.data;
  } catch (e: any) {
    throw e.response?.data || { message: 'Network Error' };
  }
};


export const resendEmailCode = async (email: string, type: string, website: string = 'BTCY-MOBLIE-APP') => {
  try {
    const result = await API.post('/api/v1/inex/user/resendEmailCode', {
      email: email,
      type,
      website,
    });
    return result.data;
  } catch (e: any) {
    console.log('FAILED: unable to perform API request (resendEmailCode)');
    console.log(e);
    console.log(e.response.data);
    return e.response.data;
  }
};

export const checkEmail = async (email: string) => {
  try {
    email = email.toLocaleLowerCase();
    const result = await API.post("/api/v1/inex/user/checkemail", {
      email,
    });
    return result.data;
  } catch (e: any) {
    return e.response.data;
  }
};


export const checkUsername = async (username: string) => {
  try {
    username = username.toLocaleLowerCase();
    const result = await API.post("/api/v1/inex/user/checkusername", {
      username,
    });
    return result.data;
  } catch (e: any) {
    return e.response.data;
  }
};


export const resetPassword = async (email: string, password: string) => {
  try {
    const result = await API.post(`/api/v1/inex/user/resetPassword`, {
      email: email,
      password: password,
      code: '123',
    });
    return result.data;
  } catch (e: any) {
    console.log('FAILED: unable to perform API request (resetPassword)');
    console.log(e);
    console.log(e.response.data);
    return e.response.data;
  }
};

export const resetPasswordWithPhone = async (phone: string, password: string) => {
  try {
    const result = await API.post(`/api/v1/inex/user/resetPasswordWithPhone`, {
      phone: phone,
      password: password,
      code: '123',
    });
    return result.data;
  } catch (e: any) {
    return e.response.data;
  }
};

export const loginWithGoogle = async (tokenResponse: string) => {
  try {
    const result = await API.post(`/api/v1/inex/user/login/google`, {
      googleToken: tokenResponse,
    });
    return result.data;
  } catch (e: any) {
    return e.response.data;
  }
};

export const signupWithGoogle = async (tokenResponse: string) => {
  try {
    const result = await API.post(`/api/v1/inex/user/register/google`, {
      googleToken: tokenResponse,
    });
    return result.data;
  } catch (e: any) {
    return e.response.data;
  }
};

export const loginWithApple = async (tokenResponse: string) => {
  try {
    const result = await API.post(`/api/v1/inex/user/login/apple`, {
      appleToken: tokenResponse,
    });
    return result.data;
  } catch (e: any) {
    return e.response.data;
  }
};

export const signupWithApple = async (tokenResponse: any) => {
  try {
    console.log('signupWithApple', tokenResponse);
    const result = await API.post(`/api/v1/inex/user/register/apple`, {
      appleToken: tokenResponse,
    });
    return result.data;
  } catch (e: any) {
    return e.response.data;
  }
};


export const saveDeviceToken = async (email: string, token: string, type: string, model: string, osVersion: string, uniqueId: string, brand: string) => {
  try {
    const result = await API.post(`/api/v1/inex/user/saveDeviceToken`, {
      token, type, model, email, osVersion, uniqueId, brand
    });
    return result.data;
  } catch (e: any) {
    return e.response.data;
  }
}

export const addPhoneNumber = async (email: string, phoneNumber: string) => {
  try {
    const result = await API.post(`/api/v1/inex/user/addphone`, {
      email: email,
      phone: phoneNumber
    });
    return result.data;
  } catch (e: any) {
    return e.response.data;
  }
};

export const reportCompromisedAccount = async (email: string, additionalDetails: string = '', website: string = "BTCY-MOBLIE-APP") => {
  try {
    const result = await API.post(`/api/v1/inex/user/reportcompromised`, {
      email: email,
      additionalDetails: additionalDetails,
      website
    });
    return result.data;
  } catch (e: any) {
    return e.response.data;
  }
};

export const reportFakeAccount = async (email: string, currentUsername: string = '', realUsername: string = '', website: string = "BTCY-MOBLIE-APP") => {
  try {
    const result = await API.post(`/api/v1/inex/user/reportfake`, {
      email: email,
      currentUsername: currentUsername,
      realUsername: realUsername,
      website
    });
    return result.data;
  } catch (e: any) {
    return e.response.data;
  }
};

export const deleteAccount = async (email: string) => {
  try {
    const result = await API.post(`/api/v1/inex/user/deleteaccount`, {
      email: email
    });
    return result.data;
  } catch (e: any) {
    return e.response.data;
  }
};

export const changePassword = async (
  email: string,
  newPassword: string,
  oldPassword: string
) => {
  try {
    const result = await API.post(`/api/v1/inex/user/changePassword`, {
      email: email,
      newPassword: newPassword,
      oldPassword: oldPassword,
    });
    return result.data;
  } catch (e: any) {
    return e.response.data;
  }
};



export const updateProfile = async (email: string, updateData: any) => {
  try {
    const result = await API.post(`/api/v1/inex/user/updateprofile/`, {
      email,
      updateData,
    });
    return result.data;
  } catch (e: any) {
    return e.response.data;
  }
};

export const sendForgotPasswordOtpToPhone = async (email: string) => {
  try {
    const result = await API.post('/api/v1/inex/user/sendForgotOtp', { email });
    return result.data;
  } catch (e: any) {
    throw e.response?.data || { message: 'Network Error' };
  }
};

export const validateOtp = async (email: string, code: string) => {
  try {
    const result = await API.post('/api/v1/inex/user/validateOtp', { email, code });
    return result.data;
  } catch (e: any) {
    return e.response.data;
  }
};

export const validateEmail = async (email: string, code: string) => {
  try {
    const result = await API.post('/api/v1/inex/user/validateEmail', {
      email: email,
      code: code,
    });
    return result.data;
  } catch (e: any) {
    console.log('FAILED: unable to perform API request (validateEmail)');
    console.log(e);
    console.log(e.response.data);
    return e.response.data;
  }
};

export const validateForgotOtp = async (email: string, code: string) => {
  try {
    const result = await API.post('/api/v1/inex/user/validateForgotOtp', { email, code });
    return result.data;
  } catch (e: any) {
    return e.response.data;
  }
};

export const loginAPI = async (email: string, password: string) => {
  try {
    const isEmailProvided = email.includes('@');
    const payload = isEmailProvided ? { email, password } : { username: email, password };
    const result = await API.post('/api/v1/inex/user/login', payload);
    return result.data;
  } catch (e: any) {
    //throw e.response?.data || { message: 'Network Error' };
    return e.response.data;
  }
};

export const loginHive = async (email: string, password: string) => {
  try {
    const isEmailProvided = email.includes('@');
    const payload = isEmailProvided ? { email, password } : { username: email, password };
    const result = await API.post('/api/v1/inex/user/hivelogin', payload);
    return result.data;
  } catch (e: any) {
    //throw e.response?.data || { message: 'Network Error' };
    return e.response.data;
  }
};


export const loginWithPhone = async (phone: string, password: string) => {
  try {
    const result = await API.post('/api/v1/inex/user/loginWithPhone', {
      phone: phone,
      password: password,
    });
    return result.data;
  } catch (e: any) {
    //throw e.response?.data || { message: 'Network Error' };
    return e.response.data;
  }
};

export const checkByemail = async (email: string) => {
  try {
    email = email.toLocaleLowerCase();
    const result = await API.post('/api/v1/inex/user/checkByemail', {
      email,
    });
    return result.data;
  } catch (e: any) {
    return e.response.data;
  }
};

export const checkByphone = async (phone: string) => {
  try {
    phone = phone.toLocaleLowerCase();
    const result = await API.post('/api/v1/inex/user/checkByphone', {
      phone: phone,
    });
    return result.data;
  } catch (e: any) {
    return e.response.data;
  }
};


// Mining-related APIs
export const getVestingDetailsForBTCY = async () => {
  try {
    const res = await API.get('/api/v1/vesting/vesting-options/BTCY');
    return res.data;
  } catch (e: any) {
    throw e.response?.data || { message: 'Network Error' };
  }
};

export const getVestingForEmail = async (email: string, coin: string = 'BTCY') => {
  try {
    const res = await API.get(`/api/v1/vesting/user-vesting/${email}/${coin}`);
    return res.data;
  } catch (e: any) {
    throw e.response?.data || { message: 'Network Error' };
  }
};

export const getAllVestingSettingsForBTCY = async (coin: string = 'BTCY') => {
  try {
    const res = await API.get(`/api/v1/vesting/vesting-options/${coin}`);
    return res.data;
  } catch (e: any) {
    throw e.response?.data || { message: 'Network Error' };
  }
};

export const getBTCYAcknowledgementStatus = async (email: string) => {
  try {
    const res = await API.get(`/api/v1/inex/user/getBTCYAcknowledgementStatus/${email}`);
    return res.data;
  } catch (e: any) {
    throw e.response?.data || { message: 'Network Error' };
  }
};

export const getBTCYMigrationStatus = async (email: string) => {
  try {
    const res = await API.get(`/api/v1/inex/user/getBTCYMigrationStatus/${email}`);
    return res.data;
  } catch (e: any) {
    throw e.response?.data || { message: 'Network Error' };
  }
};

export const updateBTCYAcknowledgementStatus = async (email: string) => {
  try {
    const res = await API.post('/api/v1/inex/user/updateBTCYAcknowledgementStatus', {
      email,
    });
    return res.data;
  } catch (e: any) {
    throw e.response?.data || { message: 'Network Error' };
  }
};

export const updateBTCYMigrationStatus = async (email: string) => {
  try {
    const res = await API.post('/api/v1/inex/user/updateBTCYMigrationStatus', {
      email,
    });
    return res.data;
  } catch (e: any) {
    throw e.response?.data || { message: 'Network Error' };
  }
};

export const updateVesting = async (email: string, option: string) => {
  try {
    const res = await API.post('/api/v1/vesting/update-vesting', {
      email,
      coinSymbol: 'BTCY',
      option,
    });
    return res;
  } catch (e: any) {
    return e.response.data;
  }
};

export const startMining = async (email: string) => {
  try {
    const res = await API.post('/api/v1/mining/startMining', {
      email,
      coinSymbol: 'BTCY',
    });
    return res.data;
  } catch (e: any) {
    console.log("err", e);
    return e.response?.data || { message: 'Network Error' };
  }
};

export const createFiatDepositForOrder = async (
  email: string,
  orderId: string,
  fromDetails: any,
  toDetails: any,
  paymentReceiptUrl: string,
  website: string = "BTCY-MOBLIE-APP"
) => {
  try {
    const result = await API.post(
      '/api/v1/inex/transaction/createFiatDepositForOrder',
      {
        email,
        orderId,
        fromDetails,
        toDetails,
        paymentReceiptUrl,
        website
      }
    );
    return result.data;
  } catch (e: any) {
    console.log(
      'FAILED: unable to perform API request (createFiatDepositForOrder)'
    );
    console.log(e);
    console.log(e.response.data);
    return e.response.data;
  }
};

export const getPresignedUrl = async (fileType: string) => {
  try {
    const res = await API.get(`/api/v1/inex/basic/getS3PresignedUrlForMobile`, {
      params: {
        fileType: fileType // Pass the file type as query parameter
      }
    });
    return res.data;
  } catch (e: any) {
    return e.response?.data || { message: 'Network Error' };
  }
};

export const getMiningStatus = async (email: string) => {
  try {
    const res = await API.get(`/api/v1/mining/getMiningStatus/BTCY/${email}`);
    return res.data;
  } catch (e: any) {
    return e.response?.data || { message: 'Network Error' };
  }
};

export const getAllMiningPlans = async () => {
  try {
    const res = await API.get(`/api/v1/mining/getAllMiningSubscriptionPlans`);
    return res.data;
  } catch (e: any) {
    return e.response?.data || { message: 'Network Error' };
  }
};

export const stopMining = async (email: string) => {
  try {
    const res = await API.post('/api/v1/mining/stopMining', {
      email,
      coinSymbol: 'BTCY',
    });
    return res.data;
  } catch (e: any) {
    throw e.response?.data || { message: 'Network Error' };
  }
};

export const withdrawBTCY = async (email: string, coinSymbol: string, amount: number) => {
  try {
    const res = await API.post('/api/v1/inex/user/withdrawBTCY', {
      email,
      coinSymbol,
      withdrawAmount: amount,
    });
    return res.data;
  } catch (e: any) {
    throw e.response?.data || { message: 'Network Error' };
  }
};

export const createMiningSubscriptionPlanOrder = async (
  email: string,
  planName: string,
  amount: number,
  paymentType: string,
  isHoneyBeeOrder: boolean,
  receiptData?: string,
  platformData: object = {}
) => {
  try {
    const res = await API.post('/api/v1/inex/order/createMiningSubscriptionOrder', {
      email,
      planName,
      amount,
      paymentType,
      isHoneyBeeOrder,
      orderType: 'MiningSubscriptionOrder',
      receiptData,
      platformData,
    });
    return res.data;
  } catch (e: any) {
    throw e.response?.data || { message: 'Network Error' };
  }
};

export const getUserMiningBalance = async (email: string) => {
  try {
    const res = await API.get(`/api/v1/mining/getUserMiningBalance/BTCY/${email}`);
    return res.data;
  } catch (e: any) {
    throw e.response?.data || { message: 'Network Error' };
  }
};

export const getUserMiningSubscriptionOrders = async (email: string) => {
  try {
    const res = await API.get(`/api/v1/inex/user/getUserMiningSubscriptionOrders/${email}`);
    return res.data;
  } catch (e: any) {
    throw e.response?.data || { message: 'Network Error' };
  }
};


export const getAllReferral = async (email: string) => {
  try {
    const res = await API.get(`/api/v1/inex/user/referrals/${email}`);
    return res.data;
  } catch (e: any) {
    throw e.response?.data || { message: 'Network Error' };
  }
};

export const getAllMiningUsers = async () => {
  try {
    const res = await API.get(`/api/v1/mining/getAllMiningUsers/BTCY`);
    return res.data;
  } catch (e: any) {
    throw e.response?.data || { message: 'Network Error' };
  }
};

export const getUserMiningSubscriptionPlan = async (email: string) => {
  try {
    const res = await API.get(`/api/v1/mining/getUserSubscriptionPlan/BTCY/${email}`);
    return res.data;
  } catch (e: any) {
    return e.response?.data;
  }
};

export const getUserWalletDetailsByNetwork = async (email: string, coin: string, network: string) => {
  try {
    const res = await API.get(`/api/v1/inex/user/getUserWallet/${email}/${coin}/${network}`);
    return res.data;
  } catch (e: any) {
    return e.response?.data;
  }
};

export const createBTCYWallet = async (
  email: string,
  coin: string,
  network: string,
) => {
  try {
    const res = await API.post('/api/v1/inex/user/createUserWallet', {
      email,
      coin,
      network,
    });
    return res.data;
  } catch (e: any) {
    throw e.response?.data || { message: 'Network Error' };
  }
};

export const getCurrentMiningRewards = async (email: string) => {
  try {
    const res = await API.get(`/api/v1/mining/getCurrentMiningRewards/BTCY/${email}`);
    return res.data;
  } catch (e: any) {
    throw e.response?.data || { message: 'Network Error' };
  }
};


export const getUserDetails = async (email: string) => {
  try {
    const result = await API.post(`/api/v1/inex/user/getUserDetails/${email}`);
    return result.data;
  } catch (e: any) {
    console.log('FAILED: unable to perform API request (getUserDetails)');
    console.log(e);
    console.log(e.response.data);
    return e.response.data;
  }
};

export const getUserPrivacySettings = async (email: string) => {
  try {
    const result = await API.get(`/api/v1/inex/user/getPrivacySettings/${email}`);
    return result.data;
  } catch (e: any) {
    console.log('FAILED: unable to perform API request (getPrivacySettings)');
    console.log(e);
    console.log(e.response.data);
    return e.response.data;
  }
};


export const updateUserPrivacySettings = async (
  email: string,
  options: {
    hideRealName?: boolean;
    hideBalance?: boolean;
    pushNotifications?: boolean;
  }
) => {
  try {

    console.log('updateUserPrivacySettings', email, options);
    // Allow only ONE field to be updated at a time
    const keys = Object.keys(options);
    console.log('keys', keys);
    if (keys.length !== 1) {
      throw new Error("Only one setting can be updated at a time.");
    }

    const payload: any = { email, ...options };

    const result = await API.post(`/api/v1/inex/user/updateBTCYPrivacySettings`, payload);
    return result.data;
  } catch (e: any) {
    console.log('FAILED: unable to perform API request (updateBTCYPrivacySettings)');
    console.log(e?.response?.data || e.message);
    return e?.response?.data || { error: e.message };
  }
};

export const sendMessage = async (messageData: any) => {
  try {
    const res = await API.post(`/api/v1/chat/messages`, messageData);
    return res.data;
  } catch (e: any) {
    throw e.response?.data || { message: 'Failed to send message' };
  }
};

export const getGroupMessages = async (groupId: string, email: string) => {
  try {
    const res = await API.get(`/api/v1/chat/groups/${groupId}/messages`, {
      params: { email },
    });
    return res.data;
  } catch (e: any) {
    throw e.response?.data || { message: 'Failed to fetch group messages' };
  }
};

export const getMessages = async (email: string) => {
  try {
    const res = await API.get(`/api/v1/chat/messages/${email}`);
    return res.data;
  } catch (e: any) {
    throw e.response?.data || { message: 'Failed to fetch messages' };
  }
};

export const getLastMessages = async (email: string) => {
  try {
    const response = await API.get(`/api/v1/chat/lastmessages/${email}`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const markMessagesAsRead = async (payload: { messageIds: string[] }) => {
  try {
    const res = await API.post(`/api/v1/chat/messages/read`, payload);
    return res.data;
  } catch (e: any) {
    throw e.response?.data || { message: 'Failed to mark as read' };
  }
};

export const createReferralGroup = async (email: string, groupName?: string) => {
  try {
    const res = await API.post(`/api/v1/chat/groups/referral`, {
      email,
      groupName,
    });
    return res.data;
  } catch (e: any) {
    throw e.response?.data || { message: 'Failed to create group' };
  }
};

export const getUserGroups = async (email: string) => {
  try {
    const res = await API.get(`/api/v1/chat/groups`, {
      params: { email },
    });
    return res.data;
  } catch (e: any) {
    throw e.response?.data || { message: 'Failed to fetch groups' };
  }
};

export const joinReferralGroup = async (referralCode: string, email: string) => {
  try {
    const res = await API.post(`/api/v1/chat/groups/join/${referralCode}`, {
      email,
    });
    return res.data;
  } catch (e: any) {
    throw e.response?.data || { message: 'Failed to join group' };
  }
};