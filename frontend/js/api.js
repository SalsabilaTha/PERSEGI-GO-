// Memanggil API Flask dengan token login.
import { getToken, refreshToken } from './auth.js';

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

const expiredListeners = new Set();
export function onSessionExpired(fn) { expiredListeners.add(fn); }

export async function api(path, { method = 'GET', body } = {}) {
  const send = (token) => fetch(`/api${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  let token = await getToken();
  if (!token) {
    expiredListeners.forEach((fn) => fn());
    throw new ApiError('Silakan login terlebih dahulu.', 401);
  }
  let res = await send(token);   // TypeError = tidak ada jaringan, diteruskan ke pemanggil
  if (res.status === 401) {
    token = await refreshToken().catch(() => null);
    if (token) res = await send(token);
  }
  if (res.status === 401) {
    expiredListeners.forEach((fn) => fn());
    throw new ApiError('Sesi berakhir. Silakan login lagi.', 401);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(data.error || 'Terjadi kesalahan pada server.', res.status);
  return data;
}
