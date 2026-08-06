declare module 'react-native-config' {
  interface NativeConfig {
    API_BASE_URL?: string;
    YAYCHAT_USE_BACKEND?: string;
    GOOGLE_WEB_CLIENT_ID?: string;
    GOOGLE_IOS_CLIENT_ID?: string;
    USE_FAKE_PAYMENT?: string;
  }

  const Config: NativeConfig;
  export default Config;
}
