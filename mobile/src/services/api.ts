import axios from 'axios';
import Config from 'react-native-config';

export const baseAPIURL = Config.API_BASE_URL || 'https://api.v1.indexx.ai';

const API = axios.create({
  baseURL: baseAPIURL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export default API;
