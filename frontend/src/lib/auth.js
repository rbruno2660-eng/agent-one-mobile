import Cookies from 'js-cookie';
import api from './api';

export async function login(email, password) {
  const { data } = await api.post('/auth/login', { email, password });
  Cookies.set('access_token', data.accessToken, { expires: 1 / 96, sameSite: 'Strict' });
  Cookies.set('refresh_token', data.refreshToken, { expires: 7, sameSite: 'Strict' });
  return data.user;
}

export async function logout() {
  const refreshToken = Cookies.get('refresh_token');
  try { await api.post('/auth/logout', { refreshToken }); } catch {}
  Cookies.remove('access_token');
  Cookies.remove('refresh_token');
}

export function isLoggedIn() {
  return !!Cookies.get('access_token') || !!Cookies.get('refresh_token');
}

export async function getMe() {
  const { data } = await api.get('/auth/me');
  return data;
}
