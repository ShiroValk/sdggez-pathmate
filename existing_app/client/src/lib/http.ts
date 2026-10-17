import axios from 'axios';
import { PUBLIC_DEMO_MODE } from './demo-mode';

/** Same-origin API client: Vite proxies /api locally, Nest serves it in production. */
export const axiosForBackend = axios.create({ timeout: 15_000 });

// Static previews have no account backend. Never send visitor input to the host.
if (PUBLIC_DEMO_MODE) {
  axiosForBackend.interceptors.request.use(() => {
    throw new Error('公開演示不提供帳號或資料庫服務');
  });
}
