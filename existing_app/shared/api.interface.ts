/* MemoPath 行程记忆册 · 前后端共享契约 */

export type MemoPathRole = 'elder' | 'family';

export interface MemoPathAccount {
  accountId: string;
  role: MemoPathRole;
  displayName: string;
  /** Server-owned metadata returned by me; login's existing fields stay intact. */
  isDemo?: boolean;
}

export interface MemoPathLoginRequest {
  account: string;
  password: string;
}

export interface MemoPathOtpRequest {
  phone: string;
}

export interface MemoPathOtpResponse {
  code: string;
  expiresIn: number;
}

export interface MemoPathElderInput {
  name: string;
  nickname?: string;
  relation?: string;
  age?: number;
  gender?: string;
  address?: string;
  phone?: string;
  emergencyPhone?: string;
  avatarEmoji?: string;
}

export interface MemoPathRegisterRequest {
  account: string;
  password: string;
  role: MemoPathRole;
  elder: MemoPathElderInput;
}

export interface MemoPathLoginResponse extends MemoPathAccount {
  token: string;
}

export interface MemoPathAccountExistsResponse {
  exists: boolean;
}

export interface MemoPathElderRecord {
  id: string;
  name: string;
  nickname: string;
  relation: string;
  age: number;
  gender: string;
  address: string;
  phone: string;
  emergencyPhone: string;
  avatarEmoji: string;
}

export interface MemoPathElderListResponse {
  items: MemoPathElderRecord[];
}

export interface MemoPathContactRecord {
  id: string;
  elderId: string;
  name: string;
  relation: string;
  phone: string;
  avatarEmoji: string;
}

export interface MemoPathContactInput {
  name: string;
  relation: string;
  phone: string;
  avatarEmoji: string;
}

export interface MemoPathContactListResponse {
  items: MemoPathContactRecord[];
}

export interface MemoPathTripRecord {
  id: string;
  elderId: string;
  destination: string;
  tripDate: string;
  startTime: string;
  endTime: string;
  scheduleMode: 'auto' | 'manual';
  status: string;
}

export interface MemoPathTripInput {
  elderId: string;
  destination: string;
  tripDate: string;
  startTime: string;
  endTime: string;
  scheduleMode: 'auto' | 'manual';
}

export interface MemoPathTripListResponse {
  items: MemoPathTripRecord[];
}

export interface MemoPathSettingConfig {
  language: 'mandarin' | 'cantonese' | 'english';
  voiceMode: 'default_on' | 'standby';
  lockLayout: boolean;
}

export interface MemoPathSettingResponse {
  config: MemoPathSettingConfig;
}

export interface MemoPathGeofenceRecord {
  id: string;
  elderId: string;
  homeLabel: string;
  radiusM: number;
  dwellEnabled: boolean;
  dwellMinutes: number;
}

export type MemoPathGeofenceInput = Omit<MemoPathGeofenceRecord, 'id' | 'elderId'>;

export interface MemoPathPlaceRecord {
  id: string;
  elderId: string;
  label: string;
  icon: string;
  placeType: 'frequent' | 'beacon';
  beaconStatus: 'safe' | 'strange';
  address: string;
  lng: number;
  lat: number;
}

export interface MemoPathPlaceInput {
  elderId: string;
  label: string;
  icon: string;
  placeType: 'frequent' | 'beacon';
  beaconStatus: 'safe' | 'strange';
  address: string;
  lng?: number;
  lat?: number;
}

export type MemoPathPlaceUpdateInput = Partial<Omit<MemoPathPlaceInput, 'elderId'>>;

export interface MemoPathPlaceListResponse {
  items: MemoPathPlaceRecord[];
}

export interface MemoPathAlertRecord {
  id: string;
  elderId: string;
  alertType: string;
  title: string;
  location: string;
  status: string;
  occurredAt: string;
}

export interface MemoPathAlertListResponse {
  items: MemoPathAlertRecord[];
}

export interface MemoPathVitalRecord {
  id: string;
  elderId: string;
  heartRate: number;
  bloodOxygen: number;
  temperature: number;
  steps: number;
  recordedAt: string;
}

export interface MemoPathVitalSummaryResponse {
  latest: MemoPathVitalRecord | null;
  trend: MemoPathVitalRecord[];
}

export interface MemoPathMovementRecord {
  id: string;
  elderId: string;
  occurredDate: string;
  location: string;
  status: 'safe' | 'out_of_range';
  note: string;
}

export interface MemoPathMovementListResponse {
  items: MemoPathMovementRecord[];
}

export interface MemoPathFamilyDashboardResponse {
  elder: MemoPathElderRecord | null;
  latestVital: MemoPathVitalRecord | null;
  latestAlert: MemoPathAlertRecord | null;
  places: MemoPathPlaceRecord[];
  todayTrips: MemoPathTripRecord[];
}

export interface MemoPathMessageResponse {
  message: string;
}
/** Additive care consent contract. Codes are body-only and returned once. */
export interface MemoPathCareInviteRequest { elderId: string; elderAccount: string; }
export interface MemoPathCareInvitationResponse { invitationId: string; code: string; expiresAt: string; }
export interface MemoPathCareCodeRequest { code: string; }
export interface MemoPathCareAcceptRequest extends MemoPathCareCodeRequest { confirm: true; }
export interface MemoPathCarePreviewResponse {
  invitationId: string;
  elder: { id: string; name: string };
  family: { displayName: string };
  expiresAt: string;
}
export interface MemoPathCareLinkResponse { id: string; elderId: string; status: 'active'; }
export interface MemoPathCareLinkListResponse { items: (MemoPathCareLinkResponse & { acceptedAt: string })[]; }
