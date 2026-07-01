"import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

export const API_URL = `${process.env.EXPO_PUBLIC_BACKEND_URL}/api`;

const TOKEN_KEY = 'reeldrama_token';

// Web-safe token storage
async function setItem(key: string, value: string) {
  if (Platform.OS === 'web') {
    try { localStorage.setItem(key, value); } catch { /* ignore */ }
    return;
  }
  await SecureStore.setItemAsync(key, value);
}
async function getItem(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    try { return localStorage.getItem(key); } catch { return null; }
  }
  return await SecureStore.getItemAsync(key);
}
async function deleteItem(key: string) {
  if (Platform.OS === 'web') {
    try { localStorage.removeItem(key); } catch { /* ignore */ }
    return;
  }
  await SecureStore.deleteItemAsync(key);
}

export const tokenStore = {
  set: (t: string) => setItem(TOKEN_KEY, t),
  get: () => getItem(TOKEN_KEY),
  clear: () => deleteItem(TOKEN_KEY),
};

export const api = axios.create({ baseURL: API_URL, timeout: 15000 });

api.interceptors.request.use(async (config) => {
  const token = await tokenStore.get();
  if (token) {
    config.headers = config.headers || {};
    (config.headers as any).Authorization = `Bearer ${token}`;
  }
  return config;
});

export type Reel = {
  id: string;
  title: string;
  description: string;
  video_url: string;
  thumbnail_url: string;
  language: string;
  category: string;
  duration: number;
  views: number;
  likes_count: number;
  comments_count: number;
  created_at: string;
  liked: boolean;
  saved: boolean;
};

export type User = {
  id: string;
  email: string;
  name?: string;
  role: string;
};

export type Comment = {
  id: string;
  reel_id: string;
  user_id: string;
  user_name: string;
  text: string;
  created_at: string;
};

export const AuthApi = {
  register: (email: string, password: string, name?: string) =>
    api.post('/auth/register', { email, password, name }).then((r) => r.data),
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }).then((r) => r.data),
  me: () => api.get('/auth/me').then((r) => r.data as User),
};

export const ReelApi = {
  list: (language?: string, category?: string) =>
    api.get('/reels', { params: { language, category } }).then((r) => r.data as Reel[]),
  languages: () => api.get('/reels/languages').then((r) => r.data.languages as string[]),
  categories: () => api.get('/reels/categories').then((r) => r.data.categories as string[]),
  watchlist: () => api.get('/reels/watchlist').then((r) => r.data as Reel[]),
  like: (id: string) => api.post(`/reels/${id}/like`).then((r) => r.data as { liked: boolean }),
  toggleSave: (id: string) =>
    api.post(`/reels/${id}/watchlist`).then((r) => r.data as { saved: boolean }),
  view: (id: string) => api.post(`/reels/${id}/view`).then((r) => r.data),
  comments: (id: string) => api.get(`/reels/${id}/comments`).then((r) => r.data as Comment[]),
  addComment: (id: string, text: string) =>
    api.post(`/reels/${id}/comments`, { text }).then((r) => r.data as Comment),
  create: (payload: any) => api.post('/reels', payload).then((r) => r.data as Reel),
};
"
Observation: Create successful: /app/frontend/src/api.ts
