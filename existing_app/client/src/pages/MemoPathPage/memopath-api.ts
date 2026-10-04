import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import { logger } from '@lark-apaas/client-toolkit/logger';
import type {
  MemoPathAccountExistsResponse,
  MemoPathAlertListResponse,
  MemoPathContactInput,
  MemoPathContactListResponse,
  MemoPathContactRecord,
  MemoPathElderInput,
  MemoPathElderListResponse,
  MemoPathElderRecord,
  MemoPathFamilyDashboardResponse,
  MemoPathGeofenceInput,
  MemoPathGeofenceRecord,
  MemoPathLoginResponse,
  MemoPathMovementListResponse,
  MemoPathOtpResponse,
  MemoPathPlaceInput,
  MemoPathPlaceListResponse,
  MemoPathPlaceRecord,
  MemoPathRegisterRequest,
  MemoPathSettingConfig,
  MemoPathSettingResponse,
  MemoPathTripInput,
  MemoPathTripListResponse,
  MemoPathTripRecord,
  MemoPathVitalSummaryResponse,
} from '@shared/api.interface';

const TOKEN_KEY = 'memopath_token';

export function getToken(): string {
  return localStorage.getItem(TOKEN_KEY) ?? '';
}

export function setToken(token: string): void {
  if (token.length === 0) {
    localStorage.removeItem(TOKEN_KEY);
  } else {
    localStorage.setItem(TOKEN_KEY, token);
  }
}

function authHeaders(): Record<string, string> {
  const token: string = getToken();
  return token.length > 0 ? { 'x-memopath-token': token } : {};
}

export function isUnauthorized(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  const status: unknown = (error as { response?: { status?: unknown }; status?: unknown }).response?.status
    ?? (error as { status?: unknown }).status;
  return status === 401;
}

export function extractErrorMessage(error: unknown): string {
  if (typeof error === 'object' && error !== null) {
    const response = (error as { response?: { data?: { message?: unknown } } }).response;
    const message: unknown = response?.data?.message;
    if (typeof message === 'string' && message.length > 0) {
      return message;
    }
    if (Array.isArray(message) && message.length > 0) {
      return String(message[0]);
    }
  }
  return '網絡似乎不太穩定，請檢查網絡後再試一次（你的輸入已保留）';
}

export const memoApi = {
  async login(account: string, password: string): Promise<MemoPathLoginResponse> {
    const res = await axiosForBackend.post('/api/memopath/auth/login', {
      account,
      password,
    });
    return res.data;
  },

  async requestOtp(phone: string): Promise<MemoPathOtpResponse> {
    const res = await axiosForBackend.post('/api/memopath/auth/otp', { phone });
    return res.data;
  },

  async register(payload: MemoPathRegisterRequest): Promise<MemoPathLoginResponse> {
    const res = await axiosForBackend.post('/api/memopath/auth/register', payload);
    return res.data;
  },

  async existsAccount(account: string): Promise<boolean> {
    const res = await axiosForBackend.get<MemoPathAccountExistsResponse>(
      '/api/memopath/auth/exists',
      { params: { account } },
    );
    return res.data.exists;
  },

  async logout(): Promise<void> {
    try {
      await axiosForBackend.post('/api/memopath/auth/logout', {}, { headers: authHeaders() });
    } catch (error) {
      logger.warn('登出請求失敗', error);
    }
  },

  async listElders(): Promise<MemoPathElderListResponse> {
    const res = await axiosForBackend.get('/api/memopath/elders', { headers: authHeaders() });
    return res.data;
  },

  async createElder(input: MemoPathElderInput): Promise<MemoPathElderRecord> {
    const res = await axiosForBackend.post('/api/memopath/elders', input, {
      headers: authHeaders(),
    });
    return res.data;
  },

  async updateElder(id: string, patch: Partial<MemoPathElderInput>): Promise<MemoPathElderRecord> {
    const res = await axiosForBackend.patch(`/api/memopath/elders/${id}`, patch, {
      headers: authHeaders(),
    });
    return res.data;
  },

  async listContacts(elderId: string): Promise<MemoPathContactListResponse> {
    const res = await axiosForBackend.get(`/api/memopath/elders/${elderId}/contacts`, {
      headers: authHeaders(),
    });
    return res.data;
  },

  async addContact(elderId: string, input: MemoPathContactInput): Promise<MemoPathContactRecord> {
    const res = await axiosForBackend.post(`/api/memopath/elders/${elderId}/contacts`, input, {
      headers: authHeaders(),
    });
    return res.data;
  },

  async listTrips(elderId: string): Promise<MemoPathTripListResponse> {
    const res = await axiosForBackend.get('/api/memopath/trips', {
      headers: authHeaders(),
      params: { elderId },
    });
    return res.data;
  },

  async createTrip(input: MemoPathTripInput): Promise<MemoPathTripRecord> {
    const res = await axiosForBackend.post('/api/memopath/trips', input, {
      headers: authHeaders(),
    });
    return res.data;
  },

  async callCab(tripId: string): Promise<MemoPathTripRecord> {
    const res = await axiosForBackend.post(`/api/memopath/trips/${tripId}/call`, {}, {
      headers: authHeaders(),
    });
    return res.data;
  },

  async getSetting(): Promise<MemoPathSettingConfig> {
    const res: { data: MemoPathSettingResponse } = await axiosForBackend.get(
      '/api/memopath/settings',
      { headers: authHeaders() },
    );
    return res.data.config;
  },

  async saveSetting(config: MemoPathSettingConfig): Promise<MemoPathSettingConfig> {
    const res: { data: MemoPathSettingResponse } = await axiosForBackend.put(
      '/api/memopath/settings',
      config,
      { headers: authHeaders() },
    );
    return res.data.config;
  },

  async getGeofence(elderId: string): Promise<MemoPathGeofenceRecord> {
    const res = await axiosForBackend.get(`/api/memopath/geofences/${elderId}`, {
      headers: authHeaders(),
    });
    return res.data;
  },

  async saveGeofence(elderId: string, input: MemoPathGeofenceInput): Promise<MemoPathGeofenceRecord> {
    const res = await axiosForBackend.put(`/api/memopath/geofences/${elderId}`, input, {
      headers: authHeaders(),
    });
    return res.data;
  },

  async listPlaces(elderId: string): Promise<MemoPathPlaceListResponse> {
    const res = await axiosForBackend.get('/api/memopath/places', {
      headers: authHeaders(),
      params: { elderId },
    });
    return res.data;
  },

  async addPlace(input: MemoPathPlaceInput): Promise<MemoPathPlaceRecord> {
    const res = await axiosForBackend.post('/api/memopath/places', input, {
      headers: authHeaders(),
    });
    return res.data;
  },

  async listAlerts(elderId: string): Promise<MemoPathAlertListResponse> {
    const res = await axiosForBackend.get('/api/memopath/alerts', {
      headers: authHeaders(),
      params: { elderId },
    });
    return res.data;
  },

  async getVitals(elderId: string): Promise<MemoPathVitalSummaryResponse> {
    const res = await axiosForBackend.get('/api/memopath/vitals', {
      headers: authHeaders(),
      params: { elderId },
    });
    return res.data;
  },

  async listMovements(elderId: string): Promise<MemoPathMovementListResponse> {
    const res = await axiosForBackend.get('/api/memopath/movements', {
      headers: authHeaders(),
      params: { elderId },
    });
    return res.data;
  },

  async getDashboard(elderId?: string): Promise<MemoPathFamilyDashboardResponse> {
    const res = await axiosForBackend.get('/api/memopath/dashboard', {
      headers: authHeaders(),
      params: elderId ? { elderId } : {},
    });
    return res.data;
  },
};
