import axios from 'axios';

/** Same-origin API client: Vite proxies /api locally, Nest serves it in production. */
export const axiosForBackend = axios.create({ timeout: 15_000 });
