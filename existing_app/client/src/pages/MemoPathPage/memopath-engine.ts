import { logger } from '@/lib/logger';
import type {
  MemoPathAlertRecord,
  MemoPathContactRecord,
  MemoPathElderInput,
  MemoPathElderRecord,
  MemoPathFamilyDashboardResponse,
  MemoPathGeofenceRecord,
  MemoPathMovementRecord,
  MemoPathPlaceRecord,
  MemoPathRole,
  MemoPathSettingConfig,
  MemoPathTripRecord,
  MemoPathVitalSummaryResponse,
  MemoPathCareInvitationResponse,
  MemoPathCarePreviewResponse,
  MemoPathCareLinkListResponse,
} from '@shared/api.interface';
import { extractErrorMessage, hasPendingLogout, getToken, isUnauthorized, memoApi, setToken } from './memopath-api';
import { isSpeechSupported, startVoiceRecognition, type VoiceRecognizerHandle } from './memopath-voice';
import {
  createDestMarker,
  createFenceCircle,
  createHomeMarker,
  createMap,
  createPositionMarker,
  createRoutePolyline,
  disposeMaps,
  formatDistance,
  formatDuration,
  geocodeAddress,
  getCurrentPosition,
  getMapFor,
  loadAMap,
  isMapConfigured,
  planRoute,
  resolveHomePosition,
  searchTips,
  zoomForRadius,
} from './memopath-amap';
import type { AMapInstance, AMapOverlay, AMapPoint, AmpRoute, AmpTip } from './memopath-amap';

interface MemoTripForm {
  destination: string;
  tripDate: string;
  startTime: string;
  scheduleMode: 'auto' | 'manual';
}

interface IdentityContext {
  generation: number;
  token: string;
  role: MemoPathRole | null;
  demoMode: boolean;
  screen: string;
  elderId: string;
  elderGeneration: number;
  viewGeneration: number;
  viewRole: MemoPathRole;
}

interface MemoState {
  role: MemoPathRole;
  screen: string;
  history: string[];
  registerStep: number;
  loginAccount: string;
  loginPassword: string;
  regPhone: string;
  regOtp: string;
  regOtpIssued: string;
  regPassword: string;
  regPassword2: string;
  elders: MemoPathElderRecord[];
  currentElderId: string;
  contacts: MemoPathContactRecord[];
  trips: MemoPathTripRecord[];
  setting: MemoPathSettingConfig;
  settingPersisted: MemoPathSettingConfig;
  settingSaveStatus: 'saved' | 'saving' | 'failed' | 'demo';
  geofence: MemoPathGeofenceRecord | null;
  places: MemoPathPlaceRecord[];
  alerts: MemoPathAlertRecord[];
  vitals: MemoPathVitalSummaryResponse;
  movements: MemoPathMovementRecord[];
  dashboard: MemoPathFamilyDashboardResponse | null;
  editingElderId: string;
  elderForm: MemoPathElderInput;
  tripForm: MemoTripForm;
  tripFormOpen: boolean;
  newPlaceLabel: string;
  addingPlace: boolean;
  callingTripId: string;
  mapTips: AmpTip[];
  destTips: AmpTip[];
  navDestination: string;
  navPos: AMapPoint | null;
  vitalsLoaded: boolean;
  relationIsOther: boolean;
  relationCustom: string;
  listening: boolean;
  voiceText: string;
  demoMode: boolean;
  homeSearchText: string;
  homeTips: AmpTip[];
  placeSearchText: string;
  placeTips: AmpTip[];
  placeSearchStatus: 'idle' | 'searching' | 'empty' | 'missing-config' | 'error';
  placeDraft: { label: string; address: string; lng: number | null; lat: number | null; locationResolved: boolean; coordinatesKnown: boolean } | null;
  placeIcon: string;
  editingPlaceId: string;
  cabFeedback: 'yes' | 'no';
}

type MemoLang = 'cantonese' | 'mandarin' | 'english';

const WEEKDAYS: string[] = ['週日', '週一', '週二', '週三', '週四', '週五', '週六'];

const VOICE_SCREENS: string[] = ['elderHome', 'elderMap', 'tripMap', 'weather', 'payment', 'taxi', 'contacts', 'cabArrived'];

const RELATION_OPTIONS: string[] = ['父親', '母親', '祖父', '祖母', '外公', '外婆', '其他'];

const PLACE_ICONS: string[] = ['🏠', '🌳', '🛒', '🏥', '🏦', '🏫', '🍜', '⛪', '📍'];

const DICT: Record<string, [string, string, string]> = {
  brandName: ['行程記憶冊', '行程记忆册', 'Trip Memo'],
  tagline: ['便利出行，守護家人，由呢度開始', '便利出行，守护家人，从这里开始', 'Travel safe. Protect family. Start here.'],
  elderEntry: ['👴👵長者端', '👴👵长者端', '👴👵 Elder'],
  familyEntry: ['👪家屬端', '👪家属端', '👪 Family'],
  phoneLabel: ['手機號碼 / 帳號', '手机号码 / 账号', 'Phone / Account'],
  passwordLabel: ['密碼', '密码', 'Password'],
  login: ['登錄', '登录', 'Log in'],
  registerNow: ['立即註冊', '立即注册', 'Register now'],
  newUser: ['新用戶？', '新用户？', 'New user?'],
  forgot: ['忘記密碼？', '忘记密码？', 'Forgot password?'],
  step1Title: ['建立帳號', '建立账号', 'Create account'],
  step1Sub: ['第 1 / 3 步 · 驗證手機號碼', '第 1 / 3 步 · 验证手机号码', 'Step 1 / 3 · Verify phone'],
  sendOtp: ['獲取驗證碼', '获取验证码', 'Get code'],
  next: ['下一步', '下一步', 'Next'],
  step2Title: ['設置密碼', '设置密码', 'Set password'],
  step2Sub: ['第 2 / 3 步 · 保護你嘅帳號', '第 2 / 3 步 · 保护你的账号', 'Step 2 / 3 · Protect your account'],
  confirmPwd: ['確認密碼', '确认密码', 'Confirm password'],
  pwdStrength: ['密碼強度', '密码强度', 'Password strength'],
  pwdWeak: ['弱 · 請加長密碼', '弱 · 请加长密码', 'Weak · make it longer'],
  pwdMid: ['中等 · 建議加多一個符號', '中等 · 建议加一个符号', 'Medium · add a symbol'],
  pwdStrong: ['強 · 密碼安全', '强 · 密码安全', 'Strong · secure'],
  enterPwd: ['請輸入密碼', '请输入密码', 'Enter password'],
  step3Title: ['填寫第一位長者', '填写第一位长者', 'Add your first elder'],
  step3Sub: ['第 3 / 3 步 · 設定你最想守護嘅人', '第 3 / 3 步 · 设置你最想守护的人', 'Step 3 / 3 · Who do you protect'],
  elderBasic: ['長者基本資料', '长者基本资料', 'Elder basic info'],
  finishRegister: ['完成註冊', '完成注册', 'Finish registration'],
  greeting: ['早晨', '早上好', 'Good morning'],
  todayWeather: ['今日天氣', '今日天气', "Today's weather"],
  weatherDetail: ['詳情›', '详情›', 'Details›'],
  payCode: ['付款碼', '付款码', 'Pay code'],
  quickTaxi: ['一鍵叫車', '一键叫车', 'Quick taxi'],
  contactFamily: ['聯絡家人', '联络家人', 'Call family'],
  voiceHint: ['長按同我講你既需要：例如「導航返屋企」「打畀阿仔」', '长按说出你的需要：例如「导航回家」「打电话给儿子」', 'Hold and say your need, e.g. "Navigate home"'],
  pressLabel: ['按', '按', 'Hold'],
  mapTitle: ['地圖', '地图', 'Map'],
  routeHome: ['導航回家', '导航回家', 'Navigate home'],
  mapPlaceholder: ['您想去邊度？', '您想去哪里？', 'Where to go?'],
  settingsCenter: ['設定中心', '设置中心', 'Settings'],
  elderSettingsSub: ['由家人幫你睇顧同調整設定', '由家人帮你照看并调整设置', 'Family can guard and adjust settings for you'],
  switchToFamily: ['切換到家屬端', '切换到家属端', 'Switch to family side'],
  backElderHome: ['返回長者主頁', '返回长者主页', 'Back to elder home'],
  familyGuard: ['家屬端 · 監護中', '家属端 · 监护中', 'Family · Guarding'],
  liveLocation: ['本機裝置位置（非遠端追蹤）', '本机装置位置（非远端追踪）', 'This device location (no remote tracking)'],
  addTodayTrip: ['+增加今日行程', '+增加今日行程', '+ Add today\'s trip'],
  legendHome: ['家', '家', 'Home'],
  legendRoute: ['今日路線', '今日路线', "Today's route"],
  legendSafeBeacon: ['安全 Beacon', '安全 Beacon', 'Safe beacon'],
  legendStrangeBeacon: ['陌生 Beacon', '陌生 Beacon', 'Unknown beacon'],
  latestAlertTitle: ['最近提示（點擊查看）', '最近提示（点击查看）', 'Latest alerts (tap to view)'],
  noAlerts: ['暫無告警', '暂无告警', 'No alerts'],
  setSafeRange: ['設定安全範圍', '设定安全范围', 'Safe zone'],
  safetyOverview: ['安全出行總覽', '安全出行总览', 'Safety overview'],
  viewVitals: ['查看生命體徵', '查看生命体征', 'View vitals'],
  taxiSchedule: ['叫車接送排程', '叫车接送排程', 'Taxi schedule'],
  languageTitle: ['語言選擇', '语言选择', 'Language'],
  languageNote: ['僅套用於目前帳號，不會同步其他帳號', '仅应用于当前账号，不会同步其他账号', 'UI text switches after saving'],
  voiceModeTitle: ['語音模式（單選）', '语音模式（单选）', 'Voice mode'],
  voiceDefaultOn: ['默認開啟', '默认开启', 'Default on'],
  voiceStandby: ['語音待命', '语音待命', 'Standby'],
  lockLayout: ['鎖定長者頁面佈局', '锁定长者页面布局', 'Lock elder layout'],
  lockLayoutNote: ['開啟後頁面固定，防誤跳', '开启后页面固定，防误跳', 'Pages fixed once enabled'],
  manageElders: ['管理長者資料', '管理长者资料', 'Manage elders'],
  switchElder: ['切換長者', '切换长者', 'Switch elder'],
  logout: ['登出家屬賬號', '登出家属账号', 'Log out'],
  backFamilyHome: ['返回家屬主頁', '返回家属主页', 'Back to home'],
  vitalsTitle: ['生命體徵', '生命体征', 'Vitals'],
  heartRate: ['心率', '心率', 'Heart rate'],
  bloodOxygen: ['血氧', '血氧', 'Blood oxygen'],
  bodyTemperature: ['體溫', '体温', 'Body temp'],
  todaySteps: ['步數', '步数', 'Steps'],
  hrTrend: ['心率趨勢（近 1 小時）', '心率趋势（近 1 小时）', 'Heart rate trend (1h)'],
  noTrendData: ['暫無趨勢數據', '暂无趋势数据', 'No trend data'],
  vitalEmpty: ['生命體徵 · 暫無數據', '生命体征 · 暂无数据', 'Vitals · no data'],
  vitalLoading: ['生命體徵 · 載入中…', '生命体征 · 载入中…', 'Vitals · loading…'],
  pickupSchedule: ['接送排程', '接送排程', 'Pickup schedule'],
  newTripBtn: ['＋ 新增行程（日期 / 時間 / 目的地）', '＋ 新增行程（日期 / 时间 / 目的地）', '+ New trip (date / time / destination)'],
  tripDetail: ['行程詳情', '行程详情', 'Trip details'],
  openMapNav: ['打開地圖導航', '打开地图导航', 'Open map navigation'],
  navigateTo: ['導航前往', '导航前往', 'Navigate'],
  pickupPoint: ['上車點', '上车点', 'Pickup'],
  dropoffPoint: ['下車點', '下車點', 'Drop-off'],
  planningRoute: ['正在規劃路線…', '正在规划路线…', 'Planning route…'],
  retryMap: ['重新載入地圖', '重新载入地图', 'Reload map'],
  mapLoadingText: ['地圖載入中…', '地图载入中…', 'Loading map…'],
  tripEmpty: ['暫無今日行程，撳「+增加今日行程」安排啦', '暂无今日行程，点「+增加今日行程」安排吧', 'No trips today. Tap "+ Add today\'s trip".'],
  elderTripEmpty: ['暫冇行程安排，可以叫車先', '暂无行程安排，可以先叫车', 'No trips yet. You can call a taxi.'],
  saveTrip: ['💾 保存行程', '💾 保存行程', '💾 Save trip'],
  autoCallNote: ['自動叫車排程演示（未接入叫車服務）', '自动叫车排程演示（未接入叫车服务）', 'Auto cab schedule demo (no dispatch service)'],
  auto: ['自動', '自动', 'Auto'],
  manual: ['手動', '手动', 'Manual'],
  date: ['日期', '日期', 'Date'],
  timeSlot: ['時段', '时段', 'Time'],
  destination: ['目的地', '目的地', 'Destination'],
  homeLabel: ['屋企', '家', 'Home'],
  relationLabel: ['關係', '关系', 'Relation'],
  genderLabel: ['性別', '性别', 'Gender'],
  male: ['男', '男', 'Male'],
  female: ['女', '女', 'Female'],
  nameRequired: ['姓名（必填）', '姓名（必填）', 'Name (required)'],
  addressRequired: ['常用地址 / 居住區域（必填）', '常用地址 / 居住区域（必填）', 'Address (required)'],
  phoneRequired: ['長者電話號碼（必填）', '长者电话号码（必填）', 'Elder phone (required)'],
  sessionExpired: ['登入已過期，請重新登入', '登录已过期，请重新登录', 'Session expired, please log in again'],
  voiceListening: ['聆聽中…', '聆听中…', 'Listening…'],
  voiceSpeakNow: ['請講，例如「我要去旺角」', '请讲，例如「我要去旺角」', 'Speak now, e.g. “go to hospital”'],
  voiceTapStop: ['完成', '完成', 'Done'],
  voiceHeard: ['聽到', '听到', 'Heard'],
  voiceUnsupported: ['當前設備唔支援語音，請撳掣操作', '当前设备不支持语音，请点击按钮操作', 'Voice not supported here, use the buttons'],
  voiceNoSpeech: ['聽唔清，請再講一次', '没听清，请再讲一次', "Didn't catch that, please try again"],
  voiceMicDenied: ['請先允許麥克風權限', '请先允许麦克风权限', 'Please allow microphone permission'],
  voiceGuideTitle: ['唔好意思，聽唔明呢句', '不好意思，没听懂这句', 'Sorry, I did not understand'],
  voiceGuideHint: ['你可以噉樣講，或者直接撳：', '你可以这样说，或直接点：', 'You can say, or tap:'],
  voiceCalling: ['幫你打畀', '帮你打给', 'Calling '],
  guideGoHospital: ['我要去醫院', '我要去医院', 'Go to hospital'],
  guideGoHome: ['導航回家', '导航回家', 'Navigate home'],
  guidePay: ['我要付款', '我要付款', 'I want to pay'],
  guideTaxi: ['幫我叫車', '帮我叫车', 'Call a taxi'],
  guideFamily: ['聯絡家人', '联络家人', 'Contact family'],
  guideWeather: ['今日天氣', '今日天气', "Today's weather"],
  hospitalWord: ['醫院', '医院', 'hospital'],
  accountExists: ['該帳號已存在，請直接登入', '该账号已存在，请直接登录', 'Account exists, please log in'],
  existsTitle: ['呢個帳號已註冊過', '这个账号已注册过', 'Account already exists'],
  existsBody: ['手機 {phone} 已經有 MemoPath 帳號，要直接切換過去登入嗎？', '手机 {phone} 已有 MemoPath 账号，要直接切换过去登录吗？', 'Phone {phone} already has an account. Switch to it?'],
  switchLogin: ['切換到該帳號登入', '切换到该账号登录', 'Switch & log in'],
  registerNew: ['換個號碼重新註冊', '换个号码重新注册', 'Register another number'],
  gotIt: ['知道', '知道', 'OK'],
  loginDemo: ['登入 / 體驗', '登入 / 体验', 'Log in / Try demo'],
  demoHint: ['任意手機號碼都可以登入體驗（演示模式）', '任意手机号码都可以登录体验（演示模式）', 'Any phone number works (demo mode)'],
  demoWelcome: ['已進入演示模式 · 內置兩位長者嘅資料', '已进入演示模式 · 内置两位长者的资料', 'Demo mode · two sample elders loaded'],
  frequentTitle: ['常去地點（導航須有效地圖與定位）', '常去地点（导航须有效地图与定位）', 'Frequent places (navigation requires map and location)'],
  addPlaceBtn: ['＋ 添加常去地點', '＋ 添加常去地点', '+ Add frequent place'],
  placeSearchPlaceholder: ['搜索真實地點，如：維多利亞公園', '搜索真实地点，如：维多利亚公园', 'Search a real place, e.g. Victoria Park'],
  placePickHint: ['請搜索並揀一個真實地點', '请搜索并选一个真实地点', 'Search and pick a real place'],
  placeIconLabel: ['選擇圖示', '选择图示', 'Choose icon'],
  confirmPlaceBtn: ['✔ 確認保存', '✔ 确认保存', '✔ Save place'],
  cancelBtn: ['取消', '取消', 'Cancel'],
  placeSaved: ['已保存常去地點', '已保存常去地点', 'Place saved'],
  placeDeleted: ['已刪除該常去地點', '已删除该常去地点', 'Place removed'],
  placeEmptyHint: ['暫無常去地點，撳「＋ 添加常去地點」啦', '暂无常去地点，点「＋ 添加常去地点」吧', 'No places yet. Tap "+ Add frequent place".'],
  switchElderBtn: ['🔄 切換長者', '🔄 切换长者', '🔄 Switch elder'],
  backLabel: ['返回', '返回', 'Back'],
  cabEta: ['還有 2.4 公里 · 7 分鐘', '还有 2.4 公里 · 7 分钟', '2.4 km away · 7 min'],
  cabGoingDest: ['前往', '前往', 'To'],
  cabEtaShort: ['2.4 公里 · 7 分鐘', '2.4 公里 · 7 分钟', '2.4 km · 7 min'],
  cabTag: ['特惠快車', '特惠快车', 'Saver ride'],
  cabFare: ['全程 $68', '全程 $68', 'Fare $68'],
  cabDriverName: ['陳師傅', '陈师傅', 'Master Chan'],
  cabDriverPlate: ['NH 1234', 'NH 1234', 'NH 1234'],
  cabCarType: ['舒適型', '舒适型', 'Comfort'],
  cabContactDriver: ['聯繫司機', '联系司机', 'Call driver'],
  cabNotBoarded: ['我沒上車', '我没上车', 'Not in car'],
  cabCall110: ['110 報警', '110 报警', 'Call 110'],
  cabFeedbackTitle: ['匿名反饋牆 · 68.3 萬人參與中', '匿名反馈墙 · 68.3 万人参与中', 'Feedback wall · 683K joined'],
  cabFeedbackQ: ['司機係唔係安全駕駛？', '司机是不是安全驾驶？', 'Did the driver drive safely?'],
  cabYes: ['係', '是', 'Yes'],
  cabNo: ['唔係', '否', 'No'],
  cabFbThanks: ['多謝你嘅反饋', '多谢你的反馈', 'Thanks for your feedback'],
  cabSafetyCenter: ['安全中心', '安全中心', 'Safety center'],
  cabArriveNotify: ['到咗話我知', '到了告诉我', 'Tell me on arrival'],
  cabChangeDest: ['修改終點', '修改终点', 'Change'],
  cabShareTrip: ['行程分享', '行程分享', 'Share'],
  cabLocate: ['定位', '定位', 'Locate'],
  cabTripHint: ['👆 叫車演示已記錄；查看樣例司機', '👆 叫车演示已记录；查看样例司机', '👆 Cab demo recorded; view sample driver'],
  cabCalledToast: ['叫車演示已記錄，未派車', '叫车演示已记录，未派车', 'Cab demo recorded; no vehicle dispatched'],
  cabSeeDriver: ['睇司機位置', '看司机位置', 'See driver'],
  cabContactToast: ['正在幫你聯繫陳師傅…（演示）', '正在帮你联系陈师傅…（演示）', 'Calling Master Chan… (demo)'],
  cabNotBoardedToast: ['演示：未上車提示，未通知司機', '演示：未上车提示，未通知司机', 'Demo: not boarded; driver not notified'],
  cab110Toast: ['正在撥打 110…（演示）', '正在拨打 110…（演示）', 'Calling 110… (demo)'],
  cabSafetyToast: ['進入安全中心（演示）', '进入安全中心（演示）', 'Opening safety center (demo)'],
  cabArriveToast: ['演示：到達提醒，未發送通知', '演示：到达提醒，未发送通知', 'Demo: arrival reminder; no notification sent'],
  cabShareToast: ['演示：行程分享，未發送予家人', '演示：行程分享，未发送给家人', 'Demo: sharing; nothing sent to family'],
  cabChangeToast: ['如需修改終點，請聯繫司機或家人', '如需修改终点，请联系司机或家人', 'Ask driver or family to change destination'],
  cabLocateToast: ['演示定位按鈕，未取得新位置', '演示定位按钮，未取得新位置', 'Demo location button; no new position obtained'],
};

function langIndex(lang: MemoLang): number {
  if (lang === 'mandarin') return 1;
  if (lang === 'english') return 2;
  return 0;
}

function esc(value: string): string {
  return value
    .replace(/&/gu, '&amp;')
    .replace(/</gu, '&lt;')
    .replace(/>/gu, '&gt;')
    .replace(/"/gu, '&quot;')
    .replace(/'/gu, '&#39;');
}

const ELDER_KEY = 'memopath_current_elder';

export function mountMemoApp(app: HTMLElement, logoUrl: string): () => void {
  const state: MemoState = {
    role: 'family',
    screen: 'login',
    history: [],
    registerStep: 1,
    loginAccount: '',
    loginPassword: '',
    regPhone: '',
    regOtp: '',
    regOtpIssued: '',
    regPassword: '',
    regPassword2: '',
    elders: [],
    currentElderId: '',
    contacts: [],
    trips: [],
    setting: { language: 'cantonese', voiceMode: 'default_on', lockLayout: false },
    settingPersisted: { language: 'cantonese', voiceMode: 'default_on', lockLayout: false },
    settingSaveStatus: 'saved',
    geofence: null,
    places: [],
    alerts: [],
    vitals: { latest: null, trend: [] },
    movements: [],
    dashboard: null,
    editingElderId: '',
    elderForm: { name: '' },
    tripForm: { destination: '', tripDate: '', startTime: '', scheduleMode: 'auto' },
    tripFormOpen: false,
    newPlaceLabel: '',
    addingPlace: false,
    callingTripId: '',
    mapTips: [],
    destTips: [],
    navDestination: '',
    navPos: null,
    vitalsLoaded: false,
    relationIsOther: false,
    relationCustom: '',
    listening: false,
    voiceText: '',
    demoMode: false,
    homeSearchText: '',
    homeTips: [],
    placeSearchText: '',
    placeTips: [],
    placeSearchStatus: 'idle',
    placeDraft: null,
    placeIcon: '📍',
    editingPlaceId: '',
    cabFeedback: 'no',
  };

  let authenticatedRole: MemoPathRole | null = null;
  let authenticatedIsDemo = false;
  let careLinks: MemoPathCareLinkListResponse['items'] = [];
  let careInvitation: MemoPathCareInvitationResponse | null = null;
  let carePreview: MemoPathCarePreviewResponse | null = null;
  let careCode = '';
  let careTarget = '';
  let careBusy = false;
  let active = true;
  let identityGeneration = 0;
  let screenLoadSequence = 0;
  let authAttemptSequence = 0;
  let elderGeneration = 0;
  let viewGeneration = 0;
  let routeSequence = 0;
  const suggestionSequences = { home: 0, map: 0, destination: 0 };
  let settingSaveVersion = 0;
  let settingSaveQueue: Promise<void> = Promise.resolve();

  let voiceHandle: VoiceRecognizerHandle | null = null;
  let voiceHoldActive = false;
  let suppressVoiceClickUntil = 0;
  let voiceHoldTimer = 0;
  let voiceFinalAccum: string = '';
  let voiceFinalizeTimer: number = 0;

  function t(key: string): string {
    const entry: [string, string, string] | undefined = DICT[key];
    if (!entry) return key;
    return entry[langIndex(state.setting.language)];
  }

  const logo = `<img src="${logoUrl}" alt="MemoPath 標誌">`;
  const miniHeader = () =>
    `<div class="mini-header">${logo}<span>${t('brandName')}<br>MemoPath</span></div><div class="date">${todayLabel()}</div>`;

  let routeOverlays: AMapOverlay[] = [];
  let mapSearchTimer = 0;
  let destSearchTimer = 0;
  let homeSearchTimer = 0;
  let placeSearchTimer = 0;
  let placeSearchSequence = 0;
  let homePosCache: { label: string; pos: AMapPoint } | null = null;
  let toastTimer = 0;
  let otpTimer = 0;
  let otpLeft = 0;

  function toast(message: string): void {
    const old: Element | null = app.querySelector('.mp-toast');
    if (old) old.remove();
    const div: HTMLDivElement = document.createElement('div');
    div.className = 'mp-toast';
    div.textContent = message;
    app.append(div);
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => div.remove(), 2400);
  }

  function toastAction(message: string, label: string, screen: string): void {
    const old: Element | null = app.querySelector('.mp-toast');
    if (old) old.remove();
    const div: HTMLDivElement = document.createElement('div');
    div.className = 'mp-toast';
    div.innerHTML = `${esc(message)} <button class="mp-toast-btn" data-go="${screen}">${label}</button>`;
    app.append(div);
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => div.remove(), 4200);
  }

  function todayLabel(): string {
    const now: Date = new Date();
    return `${WEEKDAYS[now.getDay()]} · ${now.getMonth() + 1} 月 ${now.getDate()} 日`;
  }

  function formatMonthDay(iso: string): string {
    const date: Date = new Date(iso);
    const month: string = String(date.getMonth() + 1).padStart(2, '0');
    const day: string = String(date.getDate()).padStart(2, '0');
    return `${month}-${day}`;
  }

  function formatHourMinute(iso: string): string {
    const date: Date = new Date(iso);
    return `${String(date.getHours()).padStart(2, '0')}：${String(date.getMinutes()).padStart(2, '0')}`;
  }

  function numOrDash(value: number | null | undefined): string {
    if (value === null || value === undefined || !Number.isFinite(value)) return '--';
    return String(value);
  }

  function render(): void {
    const view = views[state.screen] ?? views.login;
    app.innerHTML = view();
    if (!state.demoMode && authenticatedRole === 'elder') {
      app.querySelectorAll<HTMLButtonElement>('[data-go="elders"], [data-go="editElder"], [data-action="switchElder"], [data-action="newElder"], [data-action="saveElder"], [data-action="newTrip"], [data-action="saveTrip"], [data-action="addPlace"], [data-action="confirmPlace"], [data-action="saveGeofence"], [data-action="toggleDwell"], [data-action^="radius:"]').forEach(button => { button.disabled = true; button.title = '長者帳號只可讀取照護資料，管理變更由家屬操作'; });
    }
    if (state.demoMode) {
      app.insertAdjacentHTML('afterbegin', '<p class="demo-hint" role="status">前端演示模式：樣例資料只保存在本頁記憶體，不寫入資料庫。天氣、付款、叫車、告警及通知展示不代表真實服務。</p>');
    } else if (authenticatedRole !== null) {
      app.insertAdjacentHTML('afterbegin', `<p class="demo-hint" role="status">${authenticatedIsDemo ? '演示帳號：使用真實認證，資料保存至隔離的演示資料範圍。' : '帳號資料使用真實認證與資料庫保存。'}叫車、求助、告警及通知為演示，未接入送達服務。地圖定位僅代表本機裝置，不是長者遠端位置；體徵展示不提供健康判斷。</p>`);
    }
    if (VOICE_SCREENS.includes(state.screen)) {
      app.insertAdjacentHTML('beforeend', voiceFabHtml() + (state.listening ? voiceOverlayHtml() : ''));
    }
    if (state.screen === 'payment') buildQr();
    if (state.screen === 'vitals') drawSpark();
    if (
      state.screen === 'elderHome' ||
      state.screen === 'familyHome' ||
      state.screen === 'elderMap' ||
      state.screen === 'tripMap' ||
      state.screen === 'cabArrived' ||
      state.screen === 'safety'
    ) {
      void mountScreenMaps();
    }
  }

  /** Remove all previous identity data and drafts; pending revocation is held
   * separately in API module memory for an explicit retry, never localStorage. */
  function clearIdentityData(): void {
    identityGeneration += 1;
    authenticatedRole = null;
    authenticatedIsDemo = false;
    careLinks = []; careInvitation = null; carePreview = null; careCode = ''; careTarget = ''; careBusy = false;
    state.demoMode = false; state.history = []; state.dashboard = null;
    state.elders = []; state.contacts = []; state.trips = []; state.places = [];
    state.alerts = []; state.movements = []; state.vitals = { latest: null, trend: [] }; state.vitalsLoaded = false;
    state.geofence = null; state.currentElderId = ''; localStorage.removeItem(ELDER_KEY);
    state.setting = { language: 'cantonese', voiceMode: 'default_on', lockLayout: false };
    state.settingPersisted = { ...state.setting }; state.settingSaveStatus = 'saved'; settingSaveVersion += 1;
    state.elderForm = { name: '' }; state.editingElderId = ''; state.tripForm = { destination: '', tripDate: '', startTime: '', scheduleMode: 'auto' };
    state.newPlaceLabel = ''; state.placeDraft = null; state.editingPlaceId = ''; state.placeSearchText = ''; state.placeSearchStatus = 'idle'; placeSearchSequence += 1; state.homeSearchText = '';
    state.mapTips = []; state.destTips = []; state.homeTips = []; state.placeTips = []; state.navDestination = ''; state.navPos = null;
    state.regPhone = ''; state.regOtp = ''; state.regOtpIssued = ''; state.regPassword = ''; state.regPassword2 = ''; state.loginPassword = '';
    homePosCache = null; disposeMaps();
    voiceHandle?.abort(); voiceHandle = null; state.listening = false; state.voiceText = '';
    window.clearInterval(otpTimer); window.clearTimeout(mapSearchTimer); window.clearTimeout(destSearchTimer); window.clearTimeout(homeSearchTimer); window.clearTimeout(placeSearchTimer);
  }

  function captureIdentityContext(): IdentityContext {
    return {
      generation: identityGeneration,
      token: getToken(),
      role: authenticatedRole,
      demoMode: state.demoMode,
      screen: state.screen,
      elderId: state.currentElderId,
      elderGeneration,
      viewGeneration,
      viewRole: state.role,
    };
  }

  function isIdentityContextCurrent(context: IdentityContext): boolean {
    return active && context.generation === identityGeneration && context.token === getToken()
      && context.role === authenticatedRole && context.demoMode === state.demoMode
      && context.screen === state.screen && context.elderId === state.currentElderId
      && context.elderGeneration === elderGeneration && context.viewGeneration === viewGeneration
      && context.viewRole === state.role;
  }

  function runWithContext(work: () => Promise<void>): void {
    const context = captureIdentityContext();
    void work().catch(error => {
      if (isIdentityContextCurrent(context)) handleApiError(error);
    });
  }

  function handleApiError(error: unknown): void {
    const requestToken = typeof error === 'object' && error !== null
      ? (error as { config?: { headers?: Record<string, unknown> } }).config?.headers?.['x-memopath-token']
      : undefined;
    if (typeof requestToken === 'string' && requestToken.length > 0 && requestToken !== getToken()) return;
    if (isUnauthorized(error)) {
      setToken('');
      clearIdentityData();
      toast(t('sessionExpired'));
      if (state.screen !== 'login') nav('login');
      return;
    }
    const status = typeof error === 'object' && error !== null
      ? (error as { response?: { status?: number } }).response?.status : undefined;
    if (status === 403) {
      // A denied/revoked care scope must not leave its old records visible.
      elderGeneration += 1; screenLoadSequence += 1;
      state.currentElderId = ''; localStorage.removeItem(ELDER_KEY);
      state.dashboard = null; state.elders = []; state.contacts = []; state.trips = []; state.places = [];
      state.alerts = []; state.movements = []; state.geofence = null;
      state.vitals = { latest: null, trend: [] }; state.vitalsLoaded = false;
      state.elderForm = { name: '' }; state.editingElderId = '';
      state.tripForm = { destination: '', tripDate: '', startTime: '', scheduleMode: 'auto' };
      state.addingPlace = false; state.placeDraft = null; state.editingPlaceId = '';
      state.homeTips = []; state.mapTips = []; state.destTips = []; state.placeTips = [];
      state.navDestination = ''; state.navPos = null;
      careLinks = []; careInvitation = null; carePreview = null; careCode = ''; careTarget = '';
      homePosCache = null; disposeMaps();
      render();
    }
    toast(extractErrorMessage(error));
  }

  function nav(screen: string): void {
    viewGeneration += 1;
    const authScreens = ['login', 'register1', 'register2', 'register3'];
    if (state.screen !== screen && (authScreens.includes(state.screen) || authScreens.includes(screen))) {
      authAttemptSequence += 1;
    }
    if (state.screen !== screen) state.history.push(state.screen);
    state.screen = screen;
    render();
    void loadScreenData(screen);
  }

  function back(): void {
    viewGeneration += 1;
    authAttemptSequence += 1;
    state.screen = state.history.pop() ?? 'login';
    render();
    void loadScreenData(state.screen);
  }

  function rerenderIf(screen: string): void {
    if (state.screen === screen) render();
  }

  function currentElder(): MemoPathElderRecord | null {
    if (state.dashboard?.elder?.id === state.currentElderId) return state.dashboard.elder;
    if (state.elders.length === 0) return null;
    return state.elders.find((e: MemoPathElderRecord) => e.id === state.currentElderId) ?? state.elders[0];
  }

  function setCurrentElder(id: string): void {
    if (state.currentElderId !== id) elderGeneration += 1;
    state.currentElderId = id;
    localStorage.setItem(ELDER_KEY, id);
  }

  async function ensureElderId(): Promise<string> {
    if (state.demoMode) return state.currentElderId;
    if (state.currentElderId.length > 0) return state.currentElderId;
    const generation = identityGeneration; const token = getToken(); const screen = state.screen;
    const res = await memoApi.listElders();
    if (!active || generation !== identityGeneration || token !== getToken() || state.demoMode || state.screen !== screen || state.currentElderId.length > 0) return '';
    state.elders = res.items;
    if (res.items.length > 0) {
      setCurrentElder(res.items[0].id);
      return res.items[0].id;
    }
    return '';
  }

  const DEMO_WANG_ID: string = 'demo-elder-wang';
  const DEMO_LI_ID: string = 'demo-elder-li';

  function demoTodayIso(): string {
    const now: Date = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }

  function demoElders(): MemoPathElderRecord[] {
    return [
      {
        id: DEMO_WANG_ID, name: '王伯伯', nickname: '阿爸', relation: '父親', age: 78, gender: '男',
        address: '旺角花園街 12 號', phone: '9123 4567', emergencyPhone: '9123 4567', avatarEmoji: '👴',
      },
      {
        id: DEMO_LI_ID, name: '李婆婆', nickname: '阿媽', relation: '母親', age: 75, gender: '女',
        address: '銅鑼灣怡和街 8 號', phone: '9876 5432', emergencyPhone: '9876 5432', avatarEmoji: '👵',
      },
    ];
  }

  function demoContactsFor(elderId: string): MemoPathContactRecord[] {
    if (elderId === DEMO_WANG_ID) {
      return [
        { id: 'demo-c-w1', elderId, name: '王大明', relation: '兒子', phone: '9234 5678', avatarEmoji: '👨' },
        { id: 'demo-c-w2', elderId, name: '王美玲', relation: '女兒', phone: '9345 6789', avatarEmoji: '👩' },
        { id: 'demo-c-w3', elderId, name: '王小明', relation: '孫仔', phone: '9456 7890', avatarEmoji: '👦' },
      ];
    }
    return [
      { id: 'demo-c-l1', elderId, name: '李麗珍', relation: '女兒', phone: '9567 8901', avatarEmoji: '👩' },
      { id: 'demo-c-l2', elderId, name: '李志強', relation: '兒子', phone: '9678 9012', avatarEmoji: '👨' },
    ];
  }

  function demoTripsFor(elderId: string): MemoPathTripRecord[] {
    const date: string = demoTodayIso();
    if (elderId === DEMO_WANG_ID) {
      return [
        { id: 'demo-t-w1', elderId, destination: '旺角公園', tripDate: date, startTime: '09:00', endTime: '10:30', scheduleMode: 'auto', status: 'scheduled' },
        { id: 'demo-t-w2', elderId, destination: '花墟街市', tripDate: date, startTime: '15:30', endTime: '', scheduleMode: 'manual', status: 'scheduled' },
      ];
    }
    return [
      { id: 'demo-t-l1', elderId, destination: '維多利亞公園', tripDate: date, startTime: '08:30', endTime: '10:00', scheduleMode: 'auto', status: 'scheduled' },
      { id: 'demo-t-l2', elderId, destination: '銅鑼灣街市', tripDate: date, startTime: '16:00', endTime: '', scheduleMode: 'manual', status: 'cab_called' },
    ];
  }

  function demoPlacesFor(elderId: string): MemoPathPlaceRecord[] {
    if (elderId === DEMO_WANG_ID) {
      return [
        { id: 'demo-p-w1', elderId, label: '屋企', icon: '🏠', placeType: 'frequent', beaconStatus: 'safe', address: '旺角花園街 12 號', lng: 114.1702, lat: 22.3207 },
        { id: 'demo-p-w2', elderId, label: '旺角公園', icon: '🌳', placeType: 'frequent', beaconStatus: 'safe', address: '旺角運頭街', lng: 114.1716, lat: 22.3186 },
        { id: 'demo-p-w3', elderId, label: '花墟街市', icon: '🛒', placeType: 'frequent', beaconStatus: 'safe', address: '旺角花墟道', lng: 114.1726, lat: 22.3223 },
        { id: 'demo-p-w4', elderId, label: '廣華醫院', icon: '🏥', placeType: 'frequent', beaconStatus: 'safe', address: '油麻地窩打老道 25 號', lng: 114.1718, lat: 22.3153 },
      ];
    }
    return [
      { id: 'demo-p-l1', elderId, label: '屋企', icon: '🏠', placeType: 'frequent', beaconStatus: 'safe', address: '銅鑼灣怡和街 8 號', lng: 114.1856, lat: 22.2800 },
      { id: 'demo-p-l2', elderId, label: '維多利亞公園', icon: '🌳', placeType: 'frequent', beaconStatus: 'safe', address: '銅鑼灣高士威道', lng: 114.1895, lat: 22.2820 },
      { id: 'demo-p-l3', elderId, label: '銅鑼灣街市', icon: '🛒', placeType: 'frequent', beaconStatus: 'safe', address: '銅鑼灣波斯富街', lng: 114.1833, lat: 22.2786 },
      { id: 'demo-p-l4', elderId, label: '聖保祿醫院', icon: '🏥', placeType: 'frequent', beaconStatus: 'safe', address: '銅鑼灣東院道 19 號', lng: 114.1886, lat: 22.2778 },
    ];
  }

  function applyDemoElderData(elderId: string): void {
    const elder: MemoPathElderRecord | null =
      state.elders.find((item: MemoPathElderRecord) => item.id === elderId) ?? state.elders[0] ?? null;
    state.contacts = demoContactsFor(elderId);
    state.trips = demoTripsFor(elderId);
    state.places = demoPlacesFor(elderId);
    state.alerts = [];
    state.movements = [];
    state.vitals = { latest: null, trend: [] };
    state.vitalsLoaded = false;
    state.geofence = {
      id: `demo-geofence-${elderId}`,
      elderId,
      homeLabel: elder ? `家 · ${elder.address}` : '家',
      radiusM: 800,
      dwellEnabled: true,
      dwellMinutes: 18,
    };
    state.dashboard = {
      elder,
      latestVital: null,
      latestAlert: null,
      places: state.places,
      todayTrips: state.trips,
    };
  }

  function applyDemoScreenData(screen: string): void {
    if (screen === 'elderHome' || screen === 'familyHome') {
      state.dashboard = {
        elder: currentElder(),
        latestVital: null,
        latestAlert: null,
        places: state.places,
        todayTrips: state.trips,
      };
    }
    rerenderIf(screen);
  }

  function loadDemoData(): void {
    state.demoMode = true;
    setToken('');
    state.elders = demoElders();
    const kept: boolean = state.elders.some(
      (elder: MemoPathElderRecord) => elder.id === state.currentElderId,
    );
    setCurrentElder(kept ? state.currentElderId : DEMO_WANG_ID);
    applyDemoElderData(state.currentElderId);
  }

  function enterDemoMode(): void {
    authAttemptSequence += 1;
    clearIdentityData();
    loadDemoData();
    state.loginPassword = '';
    state.history = [];
    toast(t('demoWelcome'));
    nav(state.role === 'elder' ? 'elderHome' : 'familyHome');
  }

  function normalizePlace(place: MemoPathPlaceRecord): MemoPathPlaceRecord {
    return {
      ...place,
      address: place.address ?? '',
      lng: Number.isFinite(place.lng) ? place.lng : 0,
      lat: Number.isFinite(place.lat) ? place.lat : 0,
    };
  }

  async function loadScreenData(screen: string): Promise<void> {
    const sequence = ++screenLoadSequence;
    const settingVersion = settingSaveVersion;
    const generation = identityGeneration; const token = getToken(); const role = authenticatedRole;
    const view = viewGeneration; const viewRole = state.role; const elderVersion = elderGeneration;
    const demoMode = state.demoMode; const selectedElder = state.currentElderId;
    const isCurrent = (targetElder?: string): boolean => active && sequence === screenLoadSequence
      && generation === identityGeneration && token === getToken() && role === authenticatedRole
      && view === viewGeneration && viewRole === state.role && (!selectedElder || elderVersion === elderGeneration)
      && demoMode === state.demoMode && state.screen === screen
      && (targetElder ? state.currentElderId === targetElder : !selectedElder || state.currentElderId === selectedElder);
    if (state.demoMode) {
      applyDemoScreenData(screen);
      return;
    }
    if (getToken().length === 0) return;
    try {
      if (screen === 'care') {
        const [links, elders] = await Promise.all([memoApi.careLinks(), memoApi.listElders()]);
        if (!isCurrent()) return;
        careLinks = links.items; state.elders = elders.items;
        rerenderIf(screen);
      } else if (screen === 'elderHome' || screen === 'familyHome') {
        const targetElder = state.currentElderId;
        const [dashboard, setting, elders] = await Promise.all([
          memoApi.getDashboard(targetElder.length > 0 ? targetElder : undefined),
          memoApi.getSetting(), memoApi.listElders(),
        ]);
        if (!isCurrent(targetElder || undefined)) return;
        if (settingVersion === settingSaveVersion && state.settingSaveStatus === 'saved') {
          state.setting = setting; state.settingPersisted = { ...setting };
        }
        state.elders = elders.items;
        state.dashboard = dashboard;
        if (dashboard.elder) setCurrentElder(dashboard.elder.id);
        state.places = dashboard.places.map(normalizePlace);
        rerenderIf(screen);
      } else if (screen === 'contacts') {
        const elderId: string = await ensureElderId();
        if (!isCurrent(elderId || undefined)) return;
        if (elderId.length > 0) {
          const res = await memoApi.listContacts(elderId);
          if (!isCurrent(elderId)) return;
          state.contacts = res.items;
        }
        rerenderIf(screen);
      } else if (screen === 'taxi' || screen === 'schedule') {
        const elderId: string = await ensureElderId();
        if (!isCurrent(elderId || undefined)) return;
        if (elderId.length > 0) {
          const res = await memoApi.listTrips(elderId);
          if (!isCurrent(elderId)) return;
          state.trips = res.items;
        }
        rerenderIf(screen);
      } else if (screen === 'settings') {
        const [setting, res] = await Promise.all([memoApi.getSetting(), memoApi.listElders()]);
        if (!isCurrent()) return;
        if (settingVersion === settingSaveVersion && state.settingSaveStatus === 'saved') {
          state.setting = setting; state.settingPersisted = { ...setting };
        }
        state.elders = res.items;
        rerenderIf(screen);
      } else if (screen === 'elders') {
        const res = await memoApi.listElders();
        if (!isCurrent()) return;
        state.elders = res.items;
        rerenderIf(screen);
      } else if (screen === 'safety') {
        const elderId: string = await ensureElderId();
        if (!isCurrent(elderId || undefined)) return;
        if (elderId.length > 0) {
          const [geofence, places] = await Promise.all([
            memoApi.getGeofence(elderId),
            memoApi.listPlaces(elderId),
          ]);
          if (!isCurrent(elderId)) return;
          state.geofence = geofence;
          state.places = places.items.map(normalizePlace);
        }
        rerenderIf(screen);
      } else if (screen === 'overview') {
        const elderId: string = await ensureElderId();
        if (!isCurrent(elderId || undefined)) return;
        if (elderId.length > 0) {
          const [geofence, places, movements, alerts] = await Promise.all([
            memoApi.getGeofence(elderId),
            memoApi.listPlaces(elderId),
            memoApi.listMovements(elderId),
            memoApi.listAlerts(elderId),
          ]);
          if (!isCurrent(elderId)) return;
          state.geofence = geofence;
          state.places = places.items.map(normalizePlace);
          state.movements = movements.items;
          state.alerts = alerts.items;
        }
        rerenderIf(screen);
      } else if (screen === 'vitals') {
        const elderId: string = await ensureElderId();
        if (!isCurrent(elderId || undefined)) return;
        if (elderId.length > 0) {
          const vitals = await memoApi.getVitals(elderId);
          if (!isCurrent(elderId)) return;
          state.vitals = vitals;
          state.vitalsLoaded = true;
        }
        rerenderIf(screen);
      }
    } catch (error) {
      if (!isCurrent()) return;
      if (!isUnauthorized(error)) logger.error('載入數據失敗（保留舊數據）', error);
      handleApiError(error);
    }
  }

  function homeSearchHtml(): string {
    const routeSearch = state.screen === 'tripMap';
    return `<div class="home-search"><span class="home-search-icon">🔍</span><input class="home-search-input" data-field="homeSearch" value="${esc(state.homeSearchText)}" aria-label="${routeSearch ? '搜尋路線目的地' : '搜尋目的地'}" placeholder="${routeSearch ? '搜尋並選擇高德目的地' : t('mapPlaceholder')}"><button class="home-search-mic" data-action="voiceToggle" aria-label="voice">🎤</button><div class="amp-suggest home-suggest" data-homesuggest hidden></div></div>`;
  }

  const mapMarkup = (large: boolean = false, kind: 'home' | 'family' | 'large' | 'safety' = 'home'): string =>
    `<div class="map-wrap">${kind === 'home' || (large && state.screen === 'tripMap') ? homeSearchHtml() : (large ? '' : `<button class="map-search" data-go="elderMap">⌕\u3000${t('mapPlaceholder')} <span style="float:right">🎙️</span></button>`)}<div class="map amp ${large ? 'large' : ''}" data-map="${kind}"></div></div>`;

  function login(): string {
    return `<section class="screen auth"><span class="logo">${logo}</span><h1 class="brand-title">${t('brandName')} MemoPath</h1><p class="tagline">${t('tagline')}</p><div class="segmented"><button class="seg ${state.role === 'elder' ? 'active' : ''}" data-role="elder">${t('elderEntry')}</button><button class="seg ${state.role === 'family' ? 'active' : ''}" data-role="family">${t('familyEntry')}</button></div><div class="panel"><div class="field"><label>${t('phoneLabel')}</label><input class="input" data-field="loginAccount" value="${esc(state.loginAccount)}" placeholder="│輸入手機號碼"></div><div class="field"><label>${t('passwordLabel')}</label><input class="input" type="password" data-field="loginPassword" value="${esc(state.loginPassword)}" placeholder="│輸入密碼"></div><button class="forgot" data-go="register1">${t('forgot')}</button></div><button class="primary" data-action="login">${t('login')}</button><button class="secondary-link" data-action="frontDemo">前端演示（不保存至資料庫）</button>${hasPendingLogout() ? '<button class="secondary-link" data-action="retryLogout">重試撤銷舊會話</button>' : ''}<button class="secondary-link" data-go="register1">${t('newUser')}<span>${t('registerNow')}</span></button><p class="demo-hint">真實帳號需註冊；演示帳號 demo / demo1234 使用真實會話及獨立演示資料。</p></section>`;
  }

  function otpBoxes(): string {
    const chars: string[] = state.regOtp.split('');
    let html = '';
    for (let i = 0; i < 6; i += 1) {
      html += `<span class="otp">${chars[i] ? esc(chars[i]) : '•'}</span>`;
    }
    return html;
  }

  function register1(): string {
    return `<section class="screen">${miniHeader()}<h1 class="page-title">${t('step1Title')}</h1><p class="subtitle">${t('step1Sub')}</p><div class="form-card"><label class="field"><span>手機號碼</span><div style="display:flex;align-items:center;gap:8px"><b>+852</b><input class="input" data-field="regPhone" maxlength="8" inputmode="numeric" pattern="[0-9]{8}" value="${esc(state.regPhone)}" placeholder="│輸入手機號碼"></div></label><button class="primary blue" style="margin-top:0;font-size:16px" data-action="sendOtp" ${otpLeft > 0 ? 'disabled' : ''}>${t('sendOtp')}</button><p class="muted">演示驗證碼（不發送短信、不驗證手機）</p><div class="otp-row">${otpBoxes()}</div><span class="tiny muted">未收到？<button type="button" class="link" data-action="resendOtp" ${otpLeft > 0 ? 'disabled' : ''}>重新取得${otpLeft > 0 ? ` (${otpLeft}s)` : ''}</button></span></div><button class="primary" data-action="regNext">${t('next')}</button></section>`;
  }

  function strengthBars(): string {
    const pwd: string = state.regPassword;
    let score = 0;
    if (pwd.length >= 8) score += 1;
    if (/[0-9]/u.test(pwd) && /[a-zA-Z]/u.test(pwd)) score += 1;
    if (/[^a-zA-Z0-9]/u.test(pwd)) score += 1;
    const colors: string[] = ['#b23c2b', '#d0a13c', '#32834f'];
    const labels: string[] = [t('pwdWeak'), t('pwdMid'), t('pwdStrong')];
    const filled: string[] = colors.map((color: string, index: number) =>
      `<i style="width:60px;height:6px;background:${index < score ? color : '#d6d6d3'};border-radius:5px"></i>`,
    );
    const label: string = pwd.length === 0 ? t('enterPwd') : labels[Math.max(0, score - 1)];
    return `<p class="tiny">${t('pwdStrength')}</p><div style="display:flex;gap:8px">${filled.join('')}</div><p class="tiny muted">${label}</p>`;
  }

  function register2(): string {
    return `<section class="screen">${miniHeader()}<h1 class="page-title">${t('step2Title')}</h1><p class="subtitle">${t('step2Sub')}</p><div class="form-card"><label class="field"><span>${t('passwordLabel')}</span><input class="input" type="password" data-field="regPassword" value="${esc(state.regPassword)}" placeholder="至少 8 位，含數字與字母"></label><label class="field" style="margin-top:14px"><span>${t('confirmPwd')}</span><input class="input" type="password" data-field="regPassword2" value="${esc(state.regPassword2)}" placeholder="再次輸入密碼"></label><div data-password-strength aria-live="polite">${strengthBars()}</div></div><button class="primary" data-action="regNext2">${t('next')}</button></section>`;
  }

  function relationField(): string {
    const relation: string = String(state.elderForm.relation ?? '');
    const isPreset: boolean = RELATION_OPTIONS.includes(relation);
    const showCustom: boolean = state.relationIsOther || (relation.length > 0 && !isPreset);
    const selectValue: string = showCustom ? '其他' : relation;
    const options: string = RELATION_OPTIONS.map(
      (item: string) => `<option value="${item}" ${item === selectValue ? 'selected' : ''}>${item}</option>`,
    ).join('');
    const select: string = `<select class="input" data-field="elder.relation"><option value="">揀關係（選填）</option>${options}</select>`;
    const custom: string = showCustom
      ? `<input class="input" style="margin-top:10px" data-field="relationCustom" value="${esc(state.relationCustom)}" placeholder="輸入自定義關係">`
      : '';
    return `${select}${custom}`;
  }

  function genderField(): string {
    const gender: string = String(state.elderForm.gender ?? '');
    const option = (value: string, label: string): string =>
      `<button class="gender-opt ${gender === value ? 'active' : ''}" data-gender="${value}">${label}</button>`;
    return `<div class="gender-row">${option('男', `♂ ${t('male')}`)}${option('女', `♀ ${t('female')}`)}</div>`;
  }

  function register3(): string {
    const form: MemoPathElderInput = state.elderForm;
    const field = (key: keyof MemoPathElderInput, placeholder: string): string =>
      `<input class="input" data-field="elder.${String(key)}" value="${esc(String(form[key] ?? ''))}" placeholder="${placeholder}">`;
    return `<section class="screen">${miniHeader()}<h1 class="page-title" style="margin-top:24px">${t('step3Title')}</h1><p class="subtitle">${t('step3Sub')}</p><div class="form-card"><p>${t('elderBasic')}</p><label class="field"><span>${t('nameRequired')}</span>${field('name', '姓名')}</label>${field('nickname', '稱呼（如：阿爸）· 選填')}<div class="field"><span>${t('relationLabel')}（選填）</span>${relationField()}</div><label class="field"><span>年齡（選填）</span>${field('age', '年齡')}</label><div class="field"><span>${t('genderLabel')}（選填）</span>${genderField()}</div><label class="field"><span>${t('addressRequired')}</span>${field('address', '常用地址 / 居住區域')}</label><label class="field"><span>${t('phoneRequired')}</span>${field('phone', '長者電話號碼')}</label></div><button class="primary" data-action="regSubmit">${t('finishRegister')}</button></section>`;
  }

  function elderHome(): string {
    if (!state.demoMode && authenticatedRole === 'elder' && !state.dashboard?.elder) return '<section class="screen"><h1>等待照護關聯</h1><p>你已登入自己的長者帳號。目前未關聯照護資料；同名或電話不會自動授權。</p><button class="primary" data-go="care">查看並接受照護邀請</button><button data-go="settings">我的設定</button><button data-action="logout">登出</button></section>';

    const elderName: string = state.dashboard?.elder?.name ?? state.dashboard?.elder?.nickname ?? '王伯伯';
    return `<section class="screen"><div class="top-brand"><div class="left">${logo}<span>${t('brandName')}<br>MemoPath</span></div><span class="top-actions"><button class="settings-btn" data-go="elderSettings" aria-label="${t('settingsCenter')}">⚙️</button><button class="sos" data-action="sos">🚨報警求助<br>SOS<small>長按3秒撥打999</small></button></span></div><h1 class="greeting">${t('greeting')}，${esc(elderName)} 👋</h1><div class="home-date">${todayLabel()}</div><button class="weather-card" data-go="weather"><span class="weather-icon">🌤️</span><span><strong>${t('todayWeather')}</strong><small>曼谷 31° 酷熱注意</small></span><span class="detail-btn">${t('weatherDetail')}</span></button>${mapMarkup(false, 'home')}${placeChipsHtml()}<div class="quick-grid"><button class="quick" data-go="payment">${t('payCode')}<span class="glyph">▦</span></button><button class="quick" data-go="taxi">${t('quickTaxi')}<span class="glyph">🚕</span></button><button class="quick" data-go="contacts">${t('contactFamily')}<span class="glyph">☎</span></button></div><div class="voice"><span class="mic">🎙</span><span>${t('voiceHint')}</span><button class="press" data-action="voiceToggle">${t('pressLabel')}</button></div></section>`;
  }

  function weather(): string {
    return `<section class="screen weather-page"><h1>${t('todayWeather')}</h1><div class="forecast"><div class="forecast-head"><b>分時段預報</b><span>${todayLabel()}</span></div><div class="forecast-grid"><div class="forecast-card">朝早<br>08:00<div style="font-size:35px">☀️</div><span class="temp">28°</span><br><span class="muted">大晴</span></div><div class="forecast-card">晏晝<br>14:00<div style="font-size:35px">🌤️</div><span class="temp">31°</span><br><span class="muted">酷熱注意</span></div><div class="forecast-card">夜晚<br>20:00<div style="font-size:35px">🌙</div><span class="temp">26°</span><br><span class="muted">溫暖</span></div></div></div><div class="hint"><b style="color:#a77e34">酷熱提示</b><br>晏晝氣溫偏高，減少長時間外出，記得補水。如要出街，請講「導航返屋企」睇最短路線。</div><button class="center-action" data-back>【知道】</button></section>`;
  }

  function elderMap(): string {
    return `<section class="screen map-page no-scroll"><div class="map-top-bar"><button class="big-back-top" data-back aria-label="返回">←</button><h1>${t('mapTitle')}</h1><button class="sos" data-action="sos">🚨<br>SOS</button></div>${mapMarkup(true, 'large')}<div class="amp-route-info" id="ampRouteInfo" hidden></div><button class="route-home" data-action="routeHome">${t('routeHome')} <span style="float:right">🎙️</span></button></section>`;
  }

  function tripMap(): string {
    return `<section class="screen map-page no-scroll"><div class="map-top-bar"><button class="big-back-top" data-back aria-label="返回">←</button><h1>${t('mapTitle')} · ${esc(state.navDestination)}</h1></div>${mapMarkup(true, 'large')}<div class="amp-route-info" id="ampRouteInfo" hidden></div><button class="route-home" data-action="tripNavRetry">🔄 重新規劃路線</button></section>`;
  }

  function cabArrived(): string {
    const dest: string = state.navDestination.length > 0
      ? state.navDestination
      : (state.trips[0]?.destination ?? '');
    const fbYes: boolean = state.cabFeedback === 'yes';
    return `<section class="screen cab-page"><div class="cab-map"><button class="cab-back" data-back aria-label="${t('backLabel')}">←</button>${mapMarkup(true, 'large')}<div class="cab-eta">🚕 ${t('cabEta')}</div><span class="cab-car-pin">🚕</span><div class="cab-side-btns"><button class="cab-side-btn" data-action="cabChangeDest">✏️<br><small>${t('cabChangeDest')}</small></button><button class="cab-side-btn" data-action="cabShareTrip">📤<br><small>${t('cabShareTrip')}</small></button></div><button class="cab-locate" data-action="cabLocate" aria-label="${t('cabLocate')}">📍</button></div><div class="cab-info-bar"><span class="cab-info-tag">${t('cabTag')}</span><span class="cab-info-main">${t('cabGoingDest')} ${esc(dest)} · ${t('cabEtaShort')}</span><span class="cab-info-fare">${t('cabFare')}</span></div><div class="cab-driver"><div class="cab-driver-row"><span class="cab-driver-avatar">👨‍✈️</span><span class="cab-driver-info"><b>${t('cabDriverName')}</b><br><small class="muted">🚘 ${t('cabDriverPlate')} · ${t('cabCarType')}</small></span><span class="cab-driver-score">5.0 ★</span></div><div class="cab-actions"><button class="cab-action green" data-action="cabContactDriver">📞<span>${t('cabContactDriver')}</span></button><button class="cab-action plain" data-action="cabNotBoarded">🙋<span>${t('cabNotBoarded')}</span></button><button class="cab-action red" data-action="cabCall110">🚨<span>${t('cabCall110')}</span></button></div></div><div class="cab-feedback"><b>${t('cabFeedbackTitle')}</b><p class="cab-fb-q">${t('cabFeedbackQ')}</p><div class="cab-fb-row"><button class="cab-fb ${fbYes ? 'active' : ''}" data-action="cabFbYes">💗 ${t('cabYes')}</button><button class="cab-fb ${fbYes ? '' : 'active'}" data-action="cabFbNo">💔 ${t('cabNo')}</button></div></div><div class="cab-bottom"><button class="cab-safety" data-action="cabSafetyCenter">🛡️<br>${t('cabSafetyCenter')}</button><button class="cab-notify" data-action="cabArriveNotify">🔔 ${t('cabArriveNotify')}</button></div></section>`;
  }

  function payment(): string {
    return `<section class="screen"><h1 class="qr-title">${t('payCode')}</h1><p class="qr-sub">付款碼演示，不能完成真實付款</p><div class="qr" id="qr"></div><button class="done" data-back>【完成】</button></section>`;
  }

  function tripStatus(trip: MemoPathTripRecord): string {
    if (trip.status === 'cab_called') {
      return '<small style="font-size:11px;color:#5f8d4e">已叫車</small>';
    }
    return '<small style="font-size:11px;color:#b58d41">未叫車</small>';
  }

  function taxi(): string {
    const cards: string = state.trips
      .map(
        (trip: MemoPathTripRecord) => {
          const called: boolean = trip.status === 'cab_called';
          const routeAttr: string = called
            ? `data-cabtrip="${esc(trip.destination)}"`
            : `data-navdest="${esc(trip.destination)}"`;
          const hint: string = called ? t('cabTripHint') : '👆 撳路線可以打開地圖導航';
          return `<div class="trip-card"><div class="trip-route" ${routeAttr} role="button" tabindex="0"><span>📍 您現在位置</span><span style="align-self:end;color:#6da46c">${esc(trip.destination)} ›</span></div><span class="muted tiny">${esc(trip.tripDate.slice(5))} ${esc(trip.startTime)}${trip.endTime.length > 0 ? ` – ${esc(trip.endTime)}` : ''}</span><h2>🏥 ${esc(trip.destination)} ${tripStatus(trip)}</h2><p class="tiny muted">${hint}</p></div>`;
        },
      )
      .join('');
    const empty: string = `<div class="trip-card"><span class="muted tiny">${t('elderTripEmpty')}</span></div>`;
    return `<section class="screen trip"><h1>🚕 我的行程</h1>${state.trips.length > 0 ? cards : empty}<button class="cab" data-action="cab">🚕 一鍵叫車</button><button class="done" style="margin-top:120px" data-back>【返回】</button></section>`;
  }

  function contacts(): string {
    const rows: string = state.contacts
      .map(
        (contact: MemoPathContactRecord) =>
          `<div class="contact"><span class="avatar">${esc(contact.avatarEmoji)}</span><span><strong>${esc(contact.name)}</strong><br>${esc(contact.relation)}</span><button class="call" data-call="${esc(contact.name)}">☎通話</button></div>`,
      )
      .join('');
    const empty = '<p class="lead" style="margin-top:20px">暂无聯絡人，請家屬在「長者資料」中補充</p>';
    return `<section class="screen contacts"><div style="display:flex;justify-content:flex-end"><button class="sos" data-action="sos">🚨報警求助<br>SOS<small>長按3秒撥打999</small></button></div><h1>${t('contactFamily')}</h1><p class="lead">點擊通話，我們會幫你聯繫家人</p>${state.contacts.length > 0 ? rows : empty}<button class="know" data-back>【知道】</button></section>`;
  }

  function vitalsPill(): string {
    const latest = state.dashboard?.latestVital ?? null;
    if (!latest) {
      return `<span class="health-pill">♥ ${state.dashboard === null ? t('vitalLoading') : t('vitalEmpty')}</span>`;
    }
    return `<span class="health-pill">♥ ${t('vitalsTitle')}\u3000${numOrDash(latest.heartRate)} bpm · 血氧 ${numOrDash(latest.bloodOxygen)}% · ${Number.isFinite(latest.temperature) ? latest.temperature.toFixed(1) : '--'}°\u3000<b>未作健康判斷</b></span>`;
  }

  function familyHome(): string {
    const elder: MemoPathElderRecord | null = state.dashboard?.elder ?? null;
    const elderName: string = elder?.name ?? '長者';
    const alert: MemoPathAlertRecord | null = state.dashboard?.latestAlert ?? null;
    const alertHtml: string = alert
      ? `🚨 <b>${esc(alert.title)}</b>\u3000${formatHourMinute(alert.occurredAt)}<br><span class="muted">${esc(elderName)} · ${esc(alert.location)} · ${esc(alert.status)}</span>`
      : `<span class="muted">${t('noAlerts')}</span>`;
    return `<section class="screen family"><div class="top-brand"><div class="left">${logo}<span>${t('brandName')}<br>MemoPath</span></div><span class="top-actions"><button class="settings-btn" data-action="switchElder">${t('switchElderBtn')}</button><button class="settings-btn" data-go="settings">⚙️ ${t('settingsCenter')}</button></span></div><div class="date">${todayLabel()}</div><h1>${t('familyGuard')}</h1><div class="person-line"><span class="avatar">${esc(elder?.avatarEmoji ?? '👴')}</span><span class="person-info"><span class="person-name">${esc(elderName)}</span>\u3000<button class="settings-btn" style="padding:8px" data-action="callFamily">📞</button><br>${vitalsPill()}</span></div><h2 style="font-size:17px">📍 ${esc(elderName)} · ${t('liveLocation')}</h2><div class="map-wrap">${mapMarkup(false, 'family')}<button class="add-trip-float" data-go="schedule">${t('addTodayTrip')}</button></div><div class="legend"><span style="color:#94773c">${t('legendHome')}</span><span style="color:#557da7">${t('legendRoute')}</span><span style="color:#6a9d39">${t('legendSafeBeacon')}</span><span style="color:#bf5142">${t('legendStrangeBeacon')}</span></div><p class="muted tiny">🔔 ${t('latestAlertTitle')}</p><div class="alerts" data-go="overview">${alertHtml}</div><div class="family-actions"><button class="pill-btn" data-go="safety">${t('setSafeRange')}</button><button class="pill-btn" data-go="overview">${t('safetyOverview')}</button><button class="pill-btn" data-go="vitals">${t('viewVitals')}</button><button class="pill-btn" data-go="schedule">${t('taxiSchedule')}</button></div></section>`;
  }

  function settings(): string {
    const cfg: MemoPathSettingConfig = state.setting;
    const langBtn = (value: MemoPathSettingConfig['language'], label: string): string =>
      `<button class="${cfg.language === value ? 'active' : ''}" data-setting="language:${value}">${label}</button>`;
    const voiceBtn = (value: MemoPathSettingConfig['voiceMode'], label: string): string =>
      `<button class="${cfg.voiceMode === value ? 'active' : ''}" data-setting="voiceMode:${value}">${label}</button>`;
    const saveStatus = state.demoMode ? '前端演示设置只保留在本页，未写入数据库。'
      : state.settingSaveStatus === 'saving' ? '正在保存到服务器…'
      : state.settingSaveStatus === 'failed' ? '保存失败；修改仍保留在此页面。'
        : state.settingSaveStatus === 'demo' ? '前端演示设置只保留在本页，未写入数据库。'
          : '设置已保存到服务器。';
    const retry = state.settingSaveStatus === 'failed' ? '<button class="chip" data-action="retrySettingSave">重试保存</button>' : '';
    if (!state.demoMode && authenticatedRole === 'elder') {
      return `<section class="screen"><button class="back" data-back>${t('backElderHome')}</button><h1 class="section-title">我的設定</h1><p class="section-sub">只調整自己的帳號設定；照護資料須經明確授權。</p><p class="tiny muted" role="status" aria-live="polite">${saveStatus}</p>${retry}<div class="box"><b>${t('languageTitle')}</b><div class="choice">${langBtn('mandarin', '普通話')}${langBtn('cantonese', '繁體粵語')}${langBtn('english', 'English')}</div></div><div class="box"><b>${t('voiceModeTitle')}</b><div class="choice">${voiceBtn('default_on', t('voiceDefaultOn'))}${voiceBtn('standby', t('voiceStandby'))}</div></div><div class="box toggle-row"><span>${t('lockLayout')}</span><button type="button" class="toggle ${cfg.lockLayout ? '' : 'off'}" data-action="toggleLock" aria-label="${t('lockLayout')}" aria-pressed="${cfg.lockLayout}"></button></div><button class="chip" data-action="logout">登出</button></section>`;
    }
    return `<section class="screen"><button class="back" data-back>${t('backFamilyHome')}</button><h1 class="section-title">${t('settingsCenter')}</h1><p class="section-sub">目前帳號的私人設定</p><p class="tiny muted" role="status" aria-live="polite">${saveStatus}</p>${retry}<div class="box"><b>${t('languageTitle')}</b><div class="choice" style="margin-top:10px">${langBtn('mandarin', '普通話')}${langBtn('cantonese', '繁體粵語')}${langBtn('english', 'English')}</div><p class="tiny muted">${t('languageNote')}</p></div><div class="box"><b>${t('voiceModeTitle')}</b><div class="choice" style="grid-template-columns:1fr 1fr;margin-top:10px">${voiceBtn('default_on', t('voiceDefaultOn'))}${voiceBtn('standby', t('voiceStandby'))}</div></div><div class="box toggle-row"><span><b>${t('lockLayout')}</b><br><span class="tiny muted">${t('lockLayoutNote')}</span></span><button type="button" class="toggle ${cfg.lockLayout ? '' : 'off'}" data-action="toggleLock" aria-label="${t('lockLayout')}" aria-pressed="${cfg.lockLayout}"></button></div><button class="chip" data-go="care">照護關聯</button><div class="chip-row"><button class="chip" data-go="elders">👴 ${t('manageElders')}</button><button class="chip" data-action="switchElder">🔄 ${t('switchElder')}</button><button class="chip" data-action="logout">🔒 ${t('logout')}</button></div></section>`;
  }

  function elderSettings(): string {
    return `<section class="screen"><button class="back" data-back>${t('backElderHome')}</button><h1 class="section-title">${t('settingsCenter')}</h1><p class="section-sub">目前帳號設定與照護授權</p><button class="chip" data-go="care">照護關聯</button><div class="box"><button class="primary" data-action="switchToFamily">${!state.demoMode && authenticatedRole === 'elder' ? '我的私人設定' : '👪 ' + t('switchToFamily')}</button></div></section>`;
  }

  function elders(): string {
    const cards: string = state.elders
      .map(
        (elder: MemoPathElderRecord) =>
          `<div class="elder-card"><span class="avatar">${esc(elder.avatarEmoji)}</span><span>${esc(elder.name)}<br><small class="muted">${esc(elder.nickname)}</small></span><button data-edit="${elder.id}">編輯</button></div>`,
      )
      .join('');
    return `<section class="screen"><button class="back" data-back>${t('backFamilyHome')}</button><h1 class="section-title">${t('manageElders')}</h1><p class="section-sub">管理你守護嘅長者（可新增多位）</p>${cards}<button class="add" data-action="newElder">＋ 新增長者</button></section>`;
  }

  function editElder(): string {
    const isNew: boolean = state.editingElderId.length === 0;
    const form: MemoPathElderInput = state.elderForm;
    const field = (key: keyof MemoPathElderInput, placeholder: string): string =>
      `<input class="input" data-field="elder.${String(key)}" value="${esc(String(form[key] ?? ''))}" placeholder="${placeholder}">`;
    return `<section class="screen"><button class="back" data-back>${t('backFamilyHome')}</button><h1 class="form-title">${isNew ? '新增長者' : '編輯長者'}</h1><p class="section-sub">${isNew ? '新增長者 · 基本資料' : `${esc(form.name || '')} · ${esc(form.nickname || '')}`}</p><div class="avatar-head"><span class="avatar">${esc(form.avatarEmoji || '👴')}</span><span>${esc(form.name || (isNew ? '新長者' : ''))}<br><small class="muted">${esc(form.nickname || '')}</small></span><button class="chip" data-action="cycleAvatar">更換頭像</button></div><div class="form-lines"><p>${isNew ? '新增長者' : '編輯長者'} · 基本資料</p><label class="field"><span>${t('nameRequired')}</span>${field('name', '👤\u3000姓名')}</label>${field('nickname', '🏷️\u3000稱呼（如：阿爸）· 選填')}<div class="field"><span>${t('relationLabel')}（選填）</span>${relationField()}</div><div class="two">${field('age', '年齡 · 選填')}<div></div></div><div class="field"><span>${t('genderLabel')}（選填）</span>${genderField()}</div><label class="field"><span>${t('addressRequired')}</span>${field('address', '常用地址 / 居住區域')}</label><label class="field"><span>${t('phoneRequired')}</span>${field('phone', '長者電話號碼')}</label>${field('emergencyPhone', '緊急聯絡人電話號碼 · 選填')}</div><button class="save" data-action="saveElder">💾 儲存長者 資料</button></section>`;
  }

  function sliderHtml(radius: number): string {
    const percent: number = Math.min(100, Math.max(0, ((radius - 300) / (1500 - 300)) * 100));
    return `<div class="slider" style="background:linear-gradient(90deg,#6ba328 0 ${percent}%,#c7c7c4 ${percent}%)"><span style="position:absolute;width:23px;height:23px;border-radius:50%;background:#6ba328;left:${percent}%;top:50%;transform:translate(-50%,-50%)"></span></div>`;
  }

  function safety(): string {
    const geofence = state.geofence;
    const radius: number = geofence?.radiusM ?? 800;
    const frequent: MemoPathPlaceRecord[] = state.places.filter(
      (place: MemoPathPlaceRecord) => place.placeType === 'frequent',
    );
    const rows: string = frequent
      .map(
        (place: MemoPathPlaceRecord) =>
          `<div class="location-row place-row" data-editplace="${esc(place.id)}"><b>${esc(place.icon)}</b><div class="place-info"><strong>${esc(place.label)}</strong><small class="muted">${esc(place.address.length > 0 ? place.address : t('placePickHint'))}</small></div><button class="place-del" data-delplace="${esc(place.id)}">✕</button></div>`,
      )
      .join('') || `<p class="tiny muted">${t('placeEmptyHint')}</p>`;
    const addRow: string = state.addingPlace ? placeFormHtml() : '';
    return `<section class="screen safety"><button class="back" data-back>${t('backFamilyHome')}</button><h1 class="section-title">${t('setSafeRange')}</h1><p class="section-sub">保存活動範圍配置；未接入自動偵測或通知送達</p>${mapMarkup(false, 'safety')}<div class="box"><span>① ${t('frequentTitle')}</span>${rows}${addRow}<button class="chip" data-action="addPlace">${t('addPlaceBtn')}</button></div><div class="box"><span>② 安全圍欄半徑（以家為中心）</span>${sliderHtml(radius)}<div style="display:flex;justify-content:space-between;align-items:center"><small>300m</small><span><button class="pill-btn" data-action="radius:-100">−</button> <b style="font-size:21px;color:#689526">${radius}m</b> <button class="pill-btn" data-action="radius:100">＋</button></span><small>1500m</small></div></div><div class="box toggle-row"><span>滯留告警配置<br><small>原地停留閾值</small></span><span>${geofence?.dwellMinutes ?? 18} 分鐘\u3000<i class="toggle ${(geofence?.dwellEnabled ?? true) ? '' : 'off'}" data-action="toggleDwell" style="display:inline-block"></i></span></div><button class="save" data-action="saveGeofence">💾 保存圍欄設定</button></section>`;
  }

  function overview(): string {
    const beacons: MemoPathPlaceRecord[] = state.places.filter(
      (place: MemoPathPlaceRecord) => place.placeType === 'beacon',
    );
    const beaconRows: string = beacons
      .map(
        (place: MemoPathPlaceRecord) =>
          `<tr><td>${esc(place.label)}</td><td><span class="status ${place.beaconStatus === 'strange' ? 'bad' : ''}">${place.beaconStatus === 'strange' ? '陌生站點' : '安全站點'}</span></td></tr>`,
      )
      .join('');
    const movementRows: string = state.movements
      .map(
        (movement: MemoPathMovementRecord) =>
          `<tr><td>${formatMonthDay(movement.occurredDate)}</td><td>${esc(movement.location)}</td><td><span class="status ${movement.status === 'out_of_range' ? 'bad' : ''}">${movement.status === 'out_of_range' ? '超出範圍' : '安全'}</span></td></tr>`,
      )
      .join('');
    const alertRows: string = state.alerts
      .map(
        (alert: MemoPathAlertRecord) =>
          `<tr><td>${formatMonthDay(alert.occurredAt)}</td><td><span class="status bad">${esc(alert.title.slice(0, 6))}</span></td><td>${esc(alert.status)}</td></tr>`,
      )
      .join('');
    const radius: number = state.geofence?.radiusM ?? 800;
    const dwellMinutes: number = state.geofence?.dwellMinutes ?? 18;
    const dwellEnabled: boolean = state.geofence?.dwellEnabled ?? true;
    return `<section class="screen"><button class="back" data-back>${t('backFamilyHome')}</button><h1 class="section-title">位置安全管理</h1><div class="box"><b>電子安全圍欄</b>${sliderHtml(radius)}<small>家\u3000\u3000\u3000\u3000\u3000\u3000\u3000\u3000\u3000\u3000\u3000+ 超市 + 公園</small></div><div class="box"><h3>Beacon 站點管理</h3><table class="table"><tr><th>站點</th><th>類型</th></tr>${beaconRows.length > 0 ? beaconRows : '<tr><td colspan="2" class="muted">暫無站點</td></tr>'}</table></div><div class="box toggle-row"><span>滯留告警配置<br><small>原地停留閾值</small></span><span>${dwellMinutes} 分鐘\u3000<i class="toggle ${dwellEnabled ? '' : 'off'}" style="display:inline-block"></i></span></div><div class="box"><h3>行蹤歷史（近 7 天）</h3><table class="table"><tr><th>時間</th><th>位置</th><th>事情</th></tr>${movementRows.length > 0 ? movementRows : '<tr><td colspan="3" class="muted">暫無記錄</td></tr>'}</table></div><div class="box"><h3>告警事件總記錄</h3><table class="table">${alertRows.length > 0 ? alertRows : '<tr><td class="muted">暫無告警</td></tr>'}</table></div></section>`;
  }

  function vitals(): string {
    const latest = state.vitals.latest;
    const trend = state.vitals.trend;
    const heartRate: string = numOrDash(latest?.heartRate);
    const bloodOxygen: string = numOrDash(latest?.bloodOxygen);
    const temperature: string = latest && Number.isFinite(latest.temperature) ? latest.temperature.toFixed(1) : '--';
    const steps: string = latest && Number.isFinite(latest.steps) ? latest.steps.toLocaleString() : '--';
    const spark: string = trend.length >= 2
      ? ''
      : `<div class="spark-empty">${t('noTrendData')}</div>`;
    const startLabel: string = latest && trend.length > 0
      ? formatHourMinute(trend[0]?.recordedAt ?? latest.recordedAt)
      : '--';
    const endLabel: string = latest ? formatHourMinute(latest.recordedAt) : '--';
    return `<section class="screen"><button class="back" data-back>${t('backFamilyHome')}</button><h1 class="section-title">${t('vitalsTitle')}</h1><div class="metric-grid" style="margin-top:25px"><div class="metric">♥ ${t('heartRate')}<div class="num">${heartRate}</div>bpm · 未作健康判斷</div><div class="metric">🩸 ${t('bloodOxygen')}<div class="num">${bloodOxygen}</div>% SpO₂</div><div class="metric">🌡 ${t('bodyTemperature')}<div class="num">${temperature}</div>°C</div><div class="metric">🚶 ${t('todaySteps')}<div class="num">${steps}</div>今日</div></div><div class="chart">${t('hrTrend')}<div class="spark">${spark}</div><div style="display:flex;justify-content:space-between" class="muted"><span>${startLabel}</span><span>${endLabel}</span></div></div></section>`;
  }

  function drawSpark(): void {
    const host: HTMLElement | null = app.querySelector('.spark');
    if (!host) return;
    const trend = state.vitals.trend;
    if (trend.length < 2) return;
    const values: number[] = trend.map((item) => item.heartRate);
    const min: number = Math.min(...values) - 5;
    const max: number = Math.max(...values) + 5;
    const width = 320;
    const height = 42;
    const range: number = Math.max(1, max - min);
    const points: string = trend
      .map((item, index: number) => {
        const x: number = (index / (trend.length - 1)) * width;
        const y: number = height - ((item.heartRate - min) / range) * height;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
    host.innerHTML = `<svg class="spark-svg" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none"><polyline points="${points}" fill="none" stroke="#5d8f3c" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  }

  function schedule(): string {
    const elderName: string = currentElder()?.name ?? '長者';
    const homeLabel: string = t('homeLabel');
    const cards: string = state.trips
      .map(
        (trip: MemoPathTripRecord) =>
          `<div class="schedule-card"><div class="schedule-left"><b>${esc(trip.destination)}</b><br><small class="muted">${esc(trip.tripDate.slice(5))} ${esc(trip.startTime)}${trip.endTime.length > 0 ? `–${esc(trip.endTime)}` : ''}</small><div class="trip-points"><button class="point-link" data-navdest="${esc(homeLabel)}">🟢 ${t('pickupPoint')}：${esc(homeLabel)}</button><button class="point-link" data-navdest="${esc(trip.destination)}">🔴 ${t('dropoffPoint')}：${esc(trip.destination)}</button></div></div><div class="schedule-right"><span class="status ${trip.scheduleMode === 'auto' ? '' : 'manual'}">${trip.scheduleMode === 'auto' ? t('auto') : t('manual')}</span><button class="nav-pill" data-navdest="${esc(trip.destination)}">🧭 ${t('navigateTo')}</button></div></div>`,
      )
      .join('');
    const emptyCards: string = `<div class="schedule-empty">${t('tripEmpty')}</div>`;
    const formBlock: string = state.tripFormOpen
      ? `<div class="detail-list" style="margin-top:12px"><div class="detail-row"><b>${t('date')}</b><div><input class="input" type="date" data-field="tripDate" value="${esc(state.tripForm.tripDate)}"></div></div><div class="detail-row"><b>${t('timeSlot')}</b><div><input class="input" data-field="startTime" value="${esc(state.tripForm.startTime)}" placeholder="09:30"></div></div><div class="detail-row"><b>${t('destination')}</b><div class="dest-field"><input class="input" data-field="destination" value="${esc(state.tripForm.destination)}" placeholder="圣德肋撒医院"><div class="amp-suggest" data-destsuggest hidden></div></div></div><div class="toggle-row"><span class="toggle ${state.tripForm.scheduleMode === 'auto' ? '' : 'off'}" data-action="toggleTripMode"></span><span>${t('autoCallNote')}</span></div><button class="save" style="margin-top:14px" data-action="saveTrip">${t('saveTrip')}</button></div>`
      : '';
    const first: MemoPathTripRecord | undefined = state.trips[0];
    const detailList: string = first
      ? `<div class="detail-list"><h3>${t('tripDetail')}</h3><div class="detail-row"><b>${t('date')}</b><div>${esc(first.tripDate)}</div></div><div class="detail-row"><b>${t('timeSlot')}</b><div>${esc(first.startTime)}${first.endTime.length > 0 ? `–${esc(first.endTime)}` : ''}</div></div><div class="detail-row"><b>${t('destination')}</b><div>${esc(first.destination)}</div></div><div class="toggle-row"><span class="toggle ${first.scheduleMode === 'auto' ? '' : 'off'}"></span><span>${t('autoCallNote')}</span></div><button class="save" style="margin-top:14px" data-navdest="${esc(first.destination)}">🗺️ ${t('openMapNav')}</button></div>`
      : '';
    return `<section class="screen"><button class="back" data-back>${t('backFamilyHome')}</button><h1 class="section-title">${esc(elderName)}的行程</h1><h2>📋 ${t('pickupSchedule')}</h2>${state.trips.length > 0 ? cards : emptyCards}<button class="new-trip" style="width:100%;display:block" data-action="newTrip">${t('newTripBtn')}</button>${formBlock}${state.tripFormOpen ? '' : detailList}</section>`;
  }

  /** Consent UI displays the exact elder/family summary before acceptance.
   * Codes live only in this page's memory; errors retain typed input.
   */
  function care(): string {
    if (state.demoMode) return '<section class="screen"><button data-back>返回</button><h1>照護關聯</h1><p>前端演示不建立真實照護關聯。請以真實帳號登入。</p></section>';
    const family = authenticatedRole === 'family';
    const disabled = careBusy ? 'disabled' : '';
    const links = careLinks.map(link => `<div class="box"><p>已授權：${esc(state.elders.find(elder => elder.id === link.elderId)?.name ?? '長者')}</p><button ${disabled} data-action="careRevoke:${esc(link.id)}">撤銷照護關聯</button></div>`).join('');
    const create = `<label for="care-elder">長者資料</label><select id="care-elder" class="input">${state.elders.map(elder => `<option value="${esc(elder.id)}" ${elder.id === state.currentElderId ? 'selected' : ''}>${esc(elder.name)}</option>`).join('')}</select><label for="care-target">指定長者的登入帳號</label><input id="care-target" class="input" maxlength="64" value="${esc(careTarget)}"><button class="primary" ${disabled} data-action="careInvite">建立邀請</button>${careInvitation ? `<div class="box"><p>只向指定長者提供以下邀請碼，請勿公開分享。有效至 ${esc(careInvitation.expiresAt)}。</p><code>${esc(careInvitation.code)}</code><button ${disabled} data-action="careCancel">撤銷此邀請</button></div>` : ''}`;
    const accept = `<label for="care-code">家屬提供的邀請碼</label><input id="care-code" class="input" maxlength="43" autocomplete="off" value="${esc(careCode)}"><button class="primary" ${disabled} data-action="carePreview">查看邀請內容</button>${carePreview ? `<div class="box"><h2>確認照護授權</h2><p>家屬：${esc(carePreview.family.displayName)}<br>長者資料：${esc(carePreview.elder.name)}<br>有效至：${esc(carePreview.expiresAt)}</p><p>接受後可讀取這位長者的照護資料並操作本人行程的模擬叫車；不能管理資料或取得家屬的私人設定。你可隨時撤銷。</p><button class="primary" ${disabled} data-action="careAccept">我確認接受照護關聯</button></div>` : ''}`;
    return `<section class="screen"><button data-back>返回</button><h1>照護關聯</h1><p>需要家屬邀請和指定長者明確接受；姓名、電話與演示碼不會自動授權。</p>${links || '<p>目前沒有有效照護關聯。</p>'}${family ? create : accept}</section>`;
  }

  async function careAction(action: string): Promise<void> {
    if (state.demoMode || careBusy) return;
    const context = captureIdentityContext();
    careBusy = true;
    try {
      if (action === 'careInvite') {
        const elderId = (app.querySelector('#care-elder') as HTMLSelectElement | null)?.value ?? '';
        if (!elderId) { toast('請先建立自己的長者資料'); return; }
        const result = await memoApi.inviteCare(elderId, careTarget.trim());
        if (!isIdentityContextCurrent(context)) return;
        careInvitation = result;
      } else if (action === 'carePreview') {
        const result = await memoApi.previewCare(careCode.trim());
        if (!isIdentityContextCurrent(context)) return;
        carePreview = result;
      } else if (action === 'careAccept') {
        if (!carePreview) return;
        await memoApi.acceptCare(careCode.trim());
        if (!isIdentityContextCurrent(context)) return;
        carePreview = null; careCode = '';
        const role = authenticatedRole; const isDemo = authenticatedIsDemo; clearIdentityData(); authenticatedRole = role; authenticatedIsDemo = isDemo;
        nav('elderHome'); toast('照護關聯已建立');
      } else if (action === 'careCancel' && careInvitation) {
        await memoApi.revokeCare(careInvitation.invitationId, true);
        if (!isIdentityContextCurrent(context)) return;
        careInvitation = null;
      } else if (action.startsWith('careRevoke:')) {
        await memoApi.revokeCare(action.slice('careRevoke:'.length));
        if (!isIdentityContextCurrent(context)) return;
        const role = authenticatedRole; const isDemo = authenticatedIsDemo; clearIdentityData(); authenticatedRole = role; authenticatedIsDemo = isDemo;
        const refreshed = captureIdentityContext();
        await loadScreenData('care');
        if (isIdentityContextCurrent(refreshed)) toast('照護關聯已撤銷，舊照護資料已清除');
      }
    } catch (error) {
      if (isIdentityContextCurrent(context)) handleApiError(error);
    } finally {
      if (context.generation === identityGeneration) careBusy = false;
      if (isIdentityContextCurrent(context) && state.screen === 'care') render();
    }
  }

  const views: Record<string, () => string> = {
    care,
    login,
    register1,
    register2,
    register3,
    elderHome,
    weather,
    elderMap,
    tripMap,
    payment,
    taxi,
    cabArrived,
    contacts,
    familyHome,
    settings,
    elderSettings,
    elders,
    editElder,
    safety,
    overview,
    vitals,
    schedule,
  };

  function buildQr(): void {
    const qr: HTMLElement | null = app.querySelector('#qr');
    if (!qr) return;
    for (let y = 0; y < 21; y += 1) {
      for (let x = 0; x < 21; x += 1) {
        const cell: HTMLElement = document.createElement('i');
        const finder = (ox: number, oy: number): boolean =>
          x >= ox && x < ox + 7 && y >= oy && y < oy + 7 &&
          (x === ox || x === ox + 6 || y === oy || y === oy + 6 || (x >= ox + 2 && x <= ox + 4 && y >= oy + 2 && y <= oy + 4));
        const on: boolean =
          finder(0, 0) || finder(14, 0) || finder(0, 14) ||
          ((x * 7 + y * 11 + x * y) % 5 < 2 && !(x < 8 && y < 8) && !(x > 12 && y < 8) && !(x < 8 && y > 12));
        if (on) cell.className = 'on';
        qr.append(cell);
      }
    }
  }

  function startOtpCountdown(): void {
    otpLeft = 59;
    window.clearInterval(otpTimer);
    otpTimer = window.setInterval(() => {
      otpLeft -= 1;
      if (otpLeft <= 0) {
        window.clearInterval(otpTimer);
        otpLeft = 0;
      }
      if (state.screen === 'register1') render();
    }, 1000);
  }

  async function doLogin(): Promise<void> {
    const attempt = ++authAttemptSequence;
    const account: string = state.loginAccount.trim();
    if (account.length === 0) {
      toast('請輸入帳號；前端演示請使用明確的演示入口');
      return;
    }
    try {
      const res = await memoApi.login(account, state.loginPassword);
      if (attempt !== authAttemptSequence) return;
      clearIdentityData();
      setToken(res.token);
      const verified = await memoApi.me();
      if (attempt !== authAttemptSequence || !active || getToken() !== res.token) return;
      authenticatedRole = verified.role; authenticatedIsDemo = verified.isDemo === true; state.role = verified.role;
      state.loginPassword = '';
      toast(`歡迎，${res.displayName}`);
      state.history = [];
      nav(state.role === 'elder' ? 'elderHome' : 'familyHome');
    } catch (error) {
      if (attempt !== authAttemptSequence) return;
      // Wrong credentials are a login failure, not an expired established session.
      toast(extractErrorMessage(error));
    }
  }

  async function doRegister(): Promise<void> {
    const attempt = ++authAttemptSequence;
    if (state.regPhone.length === 0) {
      toast('請輸入手機號碼');
      return;
    }
    if (state.regPassword.length < 8) {
      toast('密碼至少 8 位');
      return;
    }
    if (state.regPassword !== state.regPassword2) {
      toast('兩次輸入嘅密碼不一致');
      return;
    }
    const form: MemoPathElderInput = state.elderForm;
    if (String(form.name ?? '').trim().length === 0) {
      toast('請填寫長者姓名');
      return;
    }
    if (String(form.address ?? '').trim().length === 0) {
      toast('請填寫常用地址');
      return;
    }
    if (String(form.phone ?? '').trim().length === 0) {
      toast('請填寫長者電話號碼');
      return;
    }
    if (form.age !== undefined && !Number.isFinite(form.age)) {
      toast('年齡唔係數字，已幫你轉為 0');
      state.elderForm = { ...form, age: 0 };
    }
    try {
      let taken = false;
      try {
        taken = await memoApi.existsAccount(state.regPhone);
        if (attempt !== authAttemptSequence) return;
      } catch (checkError) {
        if (attempt !== authAttemptSequence) return;
        logger.warn('帳號預檢失敗，繼續註冊流程', checkError);
      }
      if (taken) {
        showAccountExistsDialog();
        return;
      }
      const res = await memoApi.register({
        account: state.regPhone,
        password: state.regPassword,
        role: state.role,
        elder: state.elderForm,
      });
      if (attempt !== authAttemptSequence) return;
      clearIdentityData();
      setToken(res.token);
      const verified = await memoApi.me();
      if (attempt !== authAttemptSequence || !active || getToken() !== res.token) return;
      authenticatedRole = verified.role;
      authenticatedIsDemo = verified.isDemo === true;
      state.role = verified.role;
      toast('註冊成功，已為你登入');
      state.history = [];
      nav(state.role === 'elder' ? 'elderHome' : 'familyHome');
    } catch (error) {
      if (attempt !== authAttemptSequence) return;
      const message: string = extractErrorMessage(error);
      if (message.includes('已存在')) {
        showAccountExistsDialog();
        return;
      }
      toast(message);
    }
  }

  async function saveElder(): Promise<void> {
    const form: MemoPathElderInput = state.elderForm;
    if (String(form.name ?? '').trim().length === 0) {
      toast('請填寫長者姓名');
      return;
    }
    if (String(form.address ?? '').trim().length === 0) {
      toast('請填寫常用地址');
      return;
    }
    if (String(form.phone ?? '').trim().length === 0) {
      toast('請填寫長者電話號碼');
      return;
    }
    if (form.age !== undefined && !Number.isFinite(form.age)) {
      state.elderForm = { ...form, age: 0 };
    }
    if (state.demoMode) {
      if (state.editingElderId.length === 0) {
        const created: MemoPathElderRecord = {
          id: `elder_${Date.now()}`,
          name: String(form.name ?? ''),
          nickname: String(form.nickname ?? ''),
          relation: String(form.relation ?? ''),
          age: form.age ?? 0,
          gender: String(form.gender ?? ''),
          address: String(form.address ?? ''),
          phone: String(form.phone ?? ''),
          emergencyPhone: String(form.emergencyPhone ?? ''),
          avatarEmoji: form.avatarEmoji ?? '👴',
        };
        state.elders = [...state.elders, created];
        setCurrentElder(created.id);
        applyDemoElderData(created.id);
        toast('已新增长者');
      } else {
        state.elders = state.elders.map((elder: MemoPathElderRecord) => (
          elder.id === state.editingElderId ? { ...elder, ...state.elderForm } : elder
        ));
        if (state.dashboard?.elder?.id === state.editingElderId) state.dashboard.elder = state.elders.find(elder => elder.id === state.editingElderId) ?? null;
        toast('演示長者資料已保存於本頁，未寫入資料庫');
      }
      state.elderForm = { name: '' };
      back();
      return;
    }
    const context = captureIdentityContext();
    const editingId = state.editingElderId;
    const submittedForm = { ...state.elderForm };
    try {
      if (editingId.length === 0) {
        const created: MemoPathElderRecord = await memoApi.createElder(submittedForm);
        if (!isIdentityContextCurrent(context) || state.editingElderId !== editingId) return;
        setCurrentElder(created.id);
        toast('已新增长者');
      } else {
        await memoApi.updateElder(editingId, submittedForm);
        if (!isIdentityContextCurrent(context) || state.editingElderId !== editingId) return;
        toast('已儲存長者資料');
      }
      state.elderForm = { name: '' };
      back();
    } catch (error) {
      if (isIdentityContextCurrent(context)) handleApiError(error);
    }
  }

  async function saveGeofence(): Promise<void> {
    if (state.demoMode) {
      toast('演示圍欄只保存於本頁，未寫入資料庫');
      return;
    }
    const elderId: string = await ensureElderId();
    if (elderId.length === 0 || !state.geofence) return;
    const context = captureIdentityContext();
    const draft = { ...state.geofence };
    try {
      const saved = await memoApi.saveGeofence(elderId, {
        homeLabel: draft.homeLabel,
        radiusM: draft.radiusM,
        dwellEnabled: draft.dwellEnabled,
        dwellMinutes: draft.dwellMinutes,
      });
      if (!isIdentityContextCurrent(context)) return;
      state.geofence = saved;
      toast('圍欄設定已保存');
    } catch (error) {
      if (isIdentityContextCurrent(context)) handleApiError(error);
    }
  }

  async function saveSetting(patch: Partial<MemoPathSettingConfig>): Promise<void> {
    const next: MemoPathSettingConfig = { ...state.setting, ...patch };
    state.setting = next;
    if (state.demoMode) { state.settingSaveStatus = 'demo'; render(); toast('前端演示設定只保存於本頁，不寫入資料庫'); return; }
    const generation = identityGeneration; const token = getToken(); const role = authenticatedRole;
    const version = ++settingSaveVersion;
    state.settingSaveStatus = 'saving'; render();
    settingSaveQueue = settingSaveQueue.catch(() => undefined).then(async () => {
      if (!active || generation !== identityGeneration || token !== getToken() || role !== authenticatedRole || state.demoMode) return;
      const snapshot = { ...state.setting };
      try {
        const saved = await memoApi.saveSetting(snapshot);
        if (!active || generation !== identityGeneration || token !== getToken() || role !== authenticatedRole || state.demoMode) return;
        state.settingPersisted = saved;
        if (version === settingSaveVersion) { state.setting = saved; state.settingSaveStatus = 'saved'; }
        rerenderIf('settings');
      } catch (error) {
        if (active && generation === identityGeneration && token === getToken() && role === authenticatedRole && !state.demoMode && version === settingSaveVersion) {
          state.settingSaveStatus = 'failed';
          handleApiError(error);
          rerenderIf('settings');
        }
      }
    });
    await settingSaveQueue;
  }

  async function saveTrip(): Promise<void> {
    const elderId: string = await ensureElderId();
    if (elderId.length === 0) return;
    const form: MemoTripForm = state.tripForm;
    if (form.destination.length === 0 || form.tripDate.length === 0 || form.startTime.length === 0) {
      toast('請填寫日期、時段與目的地');
      return;
    }
    if (state.demoMode) {
      state.trips = [...state.trips, {
        id: `trip_${Date.now()}`,
        elderId,
        destination: form.destination,
        tripDate: form.tripDate,
        startTime: form.startTime,
        endTime: '',
        scheduleMode: form.scheduleMode,
        status: 'scheduled',
      }];
      state.tripForm = { destination: '', tripDate: '', startTime: '', scheduleMode: 'auto' };
      state.tripFormOpen = false;
      toast('行程已新增');
      rerenderIf('schedule');
      return;
    }
    const context = captureIdentityContext();
    const submittedForm = { ...form };
    try {
      await memoApi.createTrip({
        elderId,
        destination: submittedForm.destination,
        tripDate: submittedForm.tripDate,
        startTime: submittedForm.startTime,
        endTime: '',
        scheduleMode: submittedForm.scheduleMode,
      });
      if (!isIdentityContextCurrent(context)) return;
      state.tripForm = { destination: '', tripDate: '', startTime: '', scheduleMode: 'auto' };
      state.tripFormOpen = false;
      toast('行程已新增');
      const res = await memoApi.listTrips(elderId);
      if (!isIdentityContextCurrent(context)) return;
      state.trips = res.items;
      rerenderIf('schedule');
    } catch (error) {
      if (isIdentityContextCurrent(context)) handleApiError(error);
    }
  }

  function placeFormHtml(): string {
    const draft = state.placeDraft;
    const icons: string = PLACE_ICONS.map(
      (icon: string) =>
        `<button type="button" class="icon-opt ${state.placeIcon === icon ? 'active' : ''}" data-placeicon="${icon}">${icon}</button>`,
    ).join('');
    const summary: string = draft
      ? `<div class="place-draft">📍 <b>${esc(draft.label)}</b><br><small class="muted">${esc(draft.address)}</small>${draft.locationResolved ? '' : '<br><small class="error" role="alert">搜尋結果沒有可用座標，請重新選擇有座標的結果。</small>'}</div>`
      : `<p class="tiny muted">${t('placePickHint')}</p>`;
    const searchStatus: Record<typeof state.placeSearchStatus, string> = {
      idle: '', searching: '正在搜索真实地点…', empty: '没有找到结果，请更换关键词。',
      'missing-config': '地图搜索不可用：未配置高德地图 Key；输入已保留。',
      error: '地图搜索暂时不可用，请检查配置或网络后重试；输入已保留。',
    };
    const retry = state.placeSearchStatus === 'error' || state.placeSearchStatus === 'missing-config'
      ? '<button type="button" class="chip" data-action="retryPlaceSearch">重试搜索</button>' : '';
    return `<div class="place-form"><input class="input" data-field="placeSearch" value="${esc(state.placeSearchText)}" placeholder="${t('placeSearchPlaceholder')}"><div class="amp-suggest place-suggest" data-placesuggest hidden></div><p class="tiny muted" data-placesearch-status role="status" aria-live="polite" ${state.placeSearchStatus === 'idle' ? 'hidden' : ''}>${esc(searchStatus[state.placeSearchStatus])}</p>${retry}${summary}<small class="muted">${t('placeIconLabel')}</small><div class="icon-row">${icons}</div><div class="place-form-actions"><button class="chip" data-action="confirmPlace">${t('confirmPlaceBtn')}</button><button class="chip" data-action="cancelPlace">${t('cancelBtn')}</button></div></div>`;
  }

  function updatePlaceSearchStatus(): void {
    const status = app.querySelector<HTMLElement>('[data-placesearch-status]');
    if (!status) return;
    const messages = {
      idle: '', searching: '正在搜索真实地点…', empty: '没有找到结果，请更换关键词。',
      'missing-config': '地图搜索不可用：未配置高德地图 Key；输入已保留。',
      error: '地图搜索暂时不可用，请检查配置或网络后重试；输入已保留。',
    } satisfies Record<typeof state.placeSearchStatus, string>;
    status.textContent = messages[state.placeSearchStatus];
    status.hidden = state.placeSearchStatus === 'idle';
    const retry = app.querySelector<HTMLButtonElement>('[data-action="retryPlaceSearch"]');
    if (state.placeSearchStatus === 'error' || state.placeSearchStatus === 'missing-config') {
      if (!retry) {
        const button = document.createElement('button');
        button.type = 'button'; button.className = 'chip';
        button.dataset.action = 'retryPlaceSearch'; button.textContent = '重试搜索';
        status.insertAdjacentElement('afterend', button);
      }
    } else {
      retry?.remove();
    }
  }

  async function suggestPlaceSearch(value: string, sequence = ++placeSearchSequence): Promise<void> {
    const context = captureIdentityContext();
    const keyword = value.trim();
    if (value.trim().length === 0) {
      state.placeTips = [];
      state.placeSearchStatus = 'idle';
      renderSuggestPanel(app.querySelector('[data-placesuggest]'), [], 'placepick');
      updatePlaceSearchStatus();
      return;
    }
    if (sequence !== placeSearchSequence) return;
    state.placeSearchStatus = 'searching';
    updatePlaceSearchStatus();
    try {
      const tips: AmpTip[] = await searchTips(keyword);
      if (!isIdentityContextCurrent(context) || sequence !== placeSearchSequence || keyword !== state.placeSearchText.trim()) return;
      state.placeTips = tips.slice(0, 6);
      state.placeSearchStatus = state.placeTips.length > 0 ? 'idle' : 'empty';
      renderSuggestPanel(app.querySelector('[data-placesuggest]'), state.placeTips, 'placepick');
      updatePlaceSearchStatus();
    } catch (error) {
      if (!isIdentityContextCurrent(context) || sequence !== placeSearchSequence || keyword !== state.placeSearchText.trim()) return;
      state.placeTips = [];
      state.placeSearchStatus = isMapConfigured() ? 'error' : 'missing-config';
      logger.warn('amap_place_search_failed', { configured: isMapConfigured() });
      renderSuggestPanel(app.querySelector('[data-placesuggest]'), [], 'placepick');
      updatePlaceSearchStatus();
    }
  }

  function pickPlaceTip(index: number): void {
    const tip: AmpTip | undefined = state.placeTips[index];
    if (!tip) return;
    const address: string = [tip.district, tip.address].filter(Boolean).join(' · ');
    state.placeDraft = {
      label: tip.name,
      address,
      lng: tip.location?.lng ?? null,
      lat: tip.location?.lat ?? null,
      locationResolved: tip.location != null && Number.isFinite(tip.location.lng) && Number.isFinite(tip.location.lat),
      coordinatesKnown: tip.location != null && Number.isFinite(tip.location.lng) && Number.isFinite(tip.location.lat),
    };
    state.placeSearchText = tip.name;
    state.placeTips = [];
    render();
  }

  async function confirmPlace(): Promise<void> {
    const draft = state.placeDraft;
    if (!draft) {
      toast(t('placePickHint'));
      return;
    }
    if (!draft.locationResolved) {
      toast('該搜索結果沒有可用座標，請重新選擇地點');
      return;
    }
    const elderId: string = await ensureElderId();
    if (elderId.length === 0) return;
    const context = captureIdentityContext();
    const editing: boolean = state.editingPlaceId.length > 0;
    const editingId = state.editingPlaceId;
    const payload = {
      label: draft.label,
      icon: state.placeIcon,
      placeType: 'frequent' as const,
      beaconStatus: 'safe' as const,
      address: draft.address,
      ...(draft.coordinatesKnown && draft.lng !== null && draft.lat !== null ? { lng: draft.lng, lat: draft.lat } : {}),
    };
    let record: MemoPathPlaceRecord;
    try {
      if (state.demoMode) {
        record = { id: editing ? state.editingPlaceId : `place_${Date.now()}`, elderId, ...payload, lng: draft.lng ?? 0, lat: draft.lat ?? 0 };
      } else {
        record = editing
          ? await memoApi.updatePlace(editingId, payload)
          : await memoApi.addPlace({ elderId, ...payload });
      }
    } catch (error) {
      if (isIdentityContextCurrent(context)) handleApiError(error);
      return;
    }
    if (!isIdentityContextCurrent(context) || state.editingPlaceId !== editingId || state.placeDraft !== draft) return;
    state.places = editing
      ? state.places.map((place: MemoPathPlaceRecord) => place.id === record.id ? record : place)
      : [...state.places, record];
    state.addingPlace = false;
    state.editingPlaceId = '';
    state.placeDraft = null;
    state.placeSearchText = '';
    state.placeTips = [];
    toast(state.demoMode ? '演示資料僅保留在本頁，未寫入資料庫' : t('placeSaved'));
    rerenderIf('safety');
  }

  async function deletePlace(placeId: string): Promise<void> {
    const context = captureIdentityContext();
    if (!state.demoMode) {
      try {
        await memoApi.deletePlace(placeId);
        if (!isIdentityContextCurrent(context)) return;
      } catch (error) {
        if (isIdentityContextCurrent(context)) handleApiError(error);
        return;
      }
    }
    state.places = state.places.filter((place: MemoPathPlaceRecord) => place.id !== placeId);
    toast(state.demoMode ? '演示資料僅從本頁移除，未寫入資料庫' : t('placeDeleted'));
    rerenderIf('safety');
  }

  function openEditPlace(placeId: string): void {
    const place: MemoPathPlaceRecord | undefined = state.places.find(
      (item: MemoPathPlaceRecord) => item.id === placeId,
    );
    if (!place || place.placeType !== 'frequent') return;
    state.addingPlace = true;
    state.editingPlaceId = place.id;
    state.placeDraft = { label: place.label, address: place.address, lng: place.lng, lat: place.lat, locationResolved: true, coordinatesKnown: !(place.lng === 0 && place.lat === 0) };
    state.placeIcon = place.icon.length > 0 ? place.icon : '📍';
    state.placeSearchText = place.label;
    render();
  }

  function placeChipsHtml(): string {
    const frequent: MemoPathPlaceRecord[] = state.places.filter(
      (place: MemoPathPlaceRecord) => place.placeType === 'frequent',
    );
    if (frequent.length === 0) return '';
    return `<div class="place-chips">${frequent
      .map(
        (place: MemoPathPlaceRecord) =>
          `<button class="place-chip" data-placego="${esc(place.id)}"><span class="place-chip-icon">${esc(place.icon)}</span>${esc(place.label)}</button>`,
      )
      .join('')}</div>`;
  }

  function goPlace(placeId: string): void {
    const place: MemoPathPlaceRecord | undefined = state.places.find(
      (item: MemoPathPlaceRecord) => item.id === placeId,
    );
    if (!place) return;
    if (place.lng !== 0 || place.lat !== 0) {
      state.navDestination = place.label;
      state.navPos = { lng: place.lng, lat: place.lat };
      toast(`${t('planningRoute')} ${place.label}`);
      nav('tripMap');
      return;
    }
    void navigateToDestination(place.label);
  }

  async function suggestHome(value: string, sequence: number): Promise<void> {
    await suggestFor('home', value, sequence);
  }

  async function pickHomeTip(index: number): Promise<void> {
    const tip: AmpTip | undefined = state.homeTips[index];
    if (!tip) return;
    if (state.screen === 'tripMap' && (!tip.location || !Number.isFinite(tip.location.lng) || !Number.isFinite(tip.location.lat))) {
      toast('該搜索結果沒有可用座標，請選擇其他高德地點');
      return;
    }
    state.homeSearchText = '';
    state.homeTips = [];
    renderSuggestPanel(app.querySelector('[data-homesuggest]'), [], 'homepick');
    if (tip.location) {
      state.navDestination = tip.name;
      state.navPos = tip.location;
      toast(`${t('planningRoute')} ${tip.name}`);
      nav('tripMap');
      return;
    }
    await navigateToDestination(tip.name);
  }

  function cleanHomeLabel(label: string): string {
    const cleaned: string = label.replace(/^家[\s·・:：,，.-]*/u, '').trim();
    return cleaned.length > 0 ? cleaned : label.trim();
  }

  async function ensureGeofence(): Promise<MemoPathGeofenceRecord | null> {
    if (state.geofence) return state.geofence;
    if (getToken().length === 0) return null;
    try {
      const elderId: string = await ensureElderId();
      if (elderId.length === 0) return null;
      const context = captureIdentityContext();
      const geofence = await memoApi.getGeofence(elderId);
      if (!isIdentityContextCurrent(context)) return null;
      state.geofence = geofence;
      return state.geofence;
    } catch (error) {
      logger.warn('讀取安全範圍失敗', error);
      return null;
    }
  }

  function teardownMap(container: HTMLElement): void {
    const existing: AMapInstance | null = getMapFor(container);
    if (existing) existing.destroy();
  }

  /** External map failures never become an illustrative map or fake location. */
  function unavailableMap(container: HTMLElement, error?: unknown): void {
    container.classList.add('amp');
    const positionReason: string = error instanceof Error && ['定位權限被拒絕', '裝置定位逾時', '裝置無法提供位置', '此瀏覽器不支援定位'].includes(error.message) ? error.message : '';
    const message: string = !isMapConfigured()
      ? '地圖不可用：尚未配置高德 Key。其他帳號、設定及資料功能仍可使用。'
      : positionReason
        ? '高德地圖腳本已載入，但' + positionReason + '，無法顯示即時位置。請檢查裝置定位及瀏覽器權限後重試。'
        : '高德地圖載入失敗，請檢查網絡、Key及高德安全配置後重試。';
    container.innerHTML = '<div class="map-loading" role="status">' + message + '</div><button class="map-retry" data-action="retryMap">重試地圖</button>';
  }

  async function initLocationMap(
    container: HTMLElement,
    kind: 'home' | 'family' | 'large' | 'safety',
  ): Promise<void> {
    const context = captureIdentityContext();
    const current = (): boolean => isIdentityContextCurrent(context) && container.isConnected;
    container.innerHTML = `<div class="map-loading">🗺️ ${t('mapLoadingText')}</div>`;
    try {
      await loadAMap();
      if (!current()) return;
      teardownMap(container);
      const geofence: MemoPathGeofenceRecord | null = await ensureGeofence();
      if (!current()) return;
      const homeLabel: string = geofence ? cleanHomeLabel(geofence.homeLabel) : '';
      let homePos: AMapPoint | null = null;
      if (homeLabel.length > 0) {
        if (homePosCache && homePosCache.label === homeLabel) {
          homePos = homePosCache.pos;
        } else {
          homePos = await resolveHomePosition(homeLabel);
          if (!current()) return;
          if (homePos) homePosCache = { label: homeLabel, pos: homePos };
        }
      }
      if (!current()) return;
      const pos: AMapPoint = await getCurrentPosition();
      if (!current()) return;
      container.innerHTML = '';
      const center: AMapPoint = kind === 'safety' && homePos ? homePos : pos;
      const zoom: number = kind === 'safety' && geofence ? zoomForRadius(geofence.radiusM) : 16;
      const map: AMapInstance = createMap(container, center, zoom);
      const positionMarker: AMapOverlay | null = createPositionMarker(pos);
      if (positionMarker) map.add(positionMarker);
      if (homePos) {
        const homeMarker: AMapOverlay | null = createHomeMarker(homePos);
        if (homeMarker) map.add(homeMarker);
        if (geofence && (kind === 'safety' || kind === 'family')) {
          const fence: AMapOverlay | null = createFenceCircle(homePos, geofence.radiusM);
          if (fence) map.add(fence);
        }
      }
      if (kind === 'large' && state.screen === 'tripMap' && state.navDestination.length > 0) {
        await autoPlanTrip();
      }
    } catch (error) {
      if (!current()) return;
      logger.warn('地圖載入失敗', { operation: 'map_load', result: 'failed' });
      unavailableMap(container, error);
    }
  }

  async function autoPlanTrip(forceFreshPosition = false): Promise<void> {
    const context = captureIdentityContext();
    const destination = state.navDestination;
    let destPos: AMapPoint | null = state.navPos;
    if (!destPos) {
      destPos = await geocodeAddress(destination);
    }
    if (!isIdentityContextCurrent(context) || destination !== state.navDestination) return;
    if (!destPos) {
      showRouteInfo('無法解析此目的地。請在地圖上方搜尋，並選擇帶有效座標的高德地點後再規劃。');
      toast('目的地未解析，請在上方搜尋框選擇真實地點');
      return;
    }
    state.navPos = destPos;
    await planAndDraw(destPos, destination, 'driving', forceFreshPosition);
  }

  async function mountScreenMaps(): Promise<void> {
    const screen: string = state.screen;
    let kind: 'home' | 'family' | 'large' | 'safety' | null = null;
    if (screen === 'elderHome') kind = 'home';
    else if (screen === 'familyHome') kind = 'family';
    else if (screen === 'elderMap' || screen === 'tripMap' || screen === 'cabArrived') kind = 'large';
    else if (screen === 'safety') kind = 'safety';
    if (!kind) return;
    const container: Element | null = app.querySelector(`[data-map="${kind}"]`);
    if (container instanceof HTMLElement) await initLocationMap(container, kind);
  }

  function renderSuggestPanel(panel: HTMLElement | null, tips: AmpTip[], pickAttr: string): void {
    if (!panel) return;
    if (tips.length === 0) {
      panel.innerHTML = '';
      panel.hidden = true;
      return;
    }
    panel.innerHTML = tips
      .map((tip: AmpTip, index: number) => {
        const sub: string = [tip.district, tip.address].filter(Boolean).join(' · ');
        return `<button type="button" data-${pickAttr}="${index}">${esc(tip.name)}${
          sub.length > 0 ? `<small>${esc(sub)}</small>` : ''
        }</button>`;
      })
      .join('');
    panel.hidden = false;
  }

  async function suggestMap(value: string, sequence: number): Promise<void> {
    await suggestFor('map', value, sequence);
  }

  async function suggestDestination(value: string, sequence: number): Promise<void> {
    await suggestFor('destination', value, sequence);
  }

  async function suggestFor(kind: 'home' | 'map' | 'destination', value: string, sequence: number): Promise<void> {
    const context = captureIdentityContext();
    const selectors = { home: 'homesuggest', map: 'mapsuggest', destination: 'destsuggest' };
    const picks = { home: 'homepick', map: 'mappick', destination: 'destpick' };
    const panel = app.querySelector<HTMLElement>(`[data-${selectors[kind]}]`);
    const current = (): boolean => isIdentityContextCurrent(context) && sequence === suggestionSequences[kind] && !!panel?.isConnected;
    const setTips = (tips: AmpTip[]): void => {
      if (kind === 'home') state.homeTips = tips;
      else if (kind === 'map') state.mapTips = tips;
      else state.destTips = tips;
    };
    if (!current()) return;
    setTips([]);
    renderSuggestPanel(panel, [], picks[kind]);
    if (!value.trim()) return;
    if (!isMapConfigured()) {
      if (panel) { panel.textContent = '地點搜尋不可用：尚未配置高德 Key。'; panel.hidden = false; }
      return;
    }
    try {
      const tips = (await searchTips(value)).slice(0, 6);
      if (!current()) return;
      setTips(tips);
      renderSuggestPanel(panel, tips, picks[kind]);
      if (!tips.length && panel) { panel.textContent = '找不到符合的地點，請修改搜尋文字後重試。'; panel.hidden = false; }
    } catch (error) {
      if (!current()) return;
      logger.warn('地點搜尋失敗', { operation: 'map_search', result: 'failed' });
      showSuggestionFailure(panel, error);
    }
  }

  /** Only fixed service messages reach the UI; never expose response URLs/keys. */
  function showSuggestionFailure(panel: HTMLElement | null, error: unknown): void {
    if (!panel) return;
    panel.textContent = error instanceof Error && error.message === 'INVALID_USER_KEY'
      ? '高德 Key 無效或已過期，地點搜尋不可用。請檢查本機配置。'
      : '高德地點搜尋暫時不可用，請檢查網絡、Key及高德安全配置後重試。';
    panel.hidden = false;
  }

  function showRouteInfo(text: string): void {
    const box: HTMLElement | null = app.querySelector('#ampRouteInfo');
    if (!box) return;
    box.textContent = text;
    box.hidden = false;
  }

  function clearRouteOverlays(map: AMapInstance): void {
    for (const overlay of routeOverlays) overlay.setMap(null);
    routeOverlays = [];
  }

  async function planAndDraw(dest: AMapPoint, label: string, mode: 'walking' | 'driving', forceFreshPosition = false): Promise<void> {
    const context = captureIdentityContext();
    const sequence = ++routeSequence;
    const container: Element | null = app.querySelector('[data-map="large"]');
    if (!(container instanceof HTMLElement)) return;
    const map: AMapInstance | null = getMapFor(container);
    if (!map) {
      toast('地圖未準備好，請稍後再試');
      return;
    }
    const pos: AMapPoint = await getCurrentPosition({ forceFresh: forceFreshPosition });
    if (!isIdentityContextCurrent(context) || sequence !== routeSequence || !container.isConnected || getMapFor(container) !== map) return;
    const route: AmpRoute | null = await planRoute(mode, pos, dest);
    if (!isIdentityContextCurrent(context) || sequence !== routeSequence || !container.isConnected || getMapFor(container) !== map) return;
    if (!route) {
      toast('暫時規劃唔到路線，請稍後再試');
      return;
    }
    clearRouteOverlays(map);
    const line: AMapOverlay | null = createRoutePolyline(
      route.points,
      mode === 'walking' ? '#5f8d4e' : '#4a6fa5',
    );
    const marker: AMapOverlay | null = createDestMarker(dest);
    const added: AMapOverlay[] = [];
    if (line) added.push(line);
    if (marker) added.push(marker);
    if (added.length > 0) map.add(added);
    routeOverlays = added;
    map.setFitView(added, false, [70, 70, 90, 70]);
    showRouteInfo(
      `${mode === 'walking' ? '🚶' : '🚗'} ${label} · ${formatDistance(route.distanceM)} · 約${formatDuration(route.durationS)}`,
    );
  }

  async function pickMapTip(index: number): Promise<void> {
    const context = captureIdentityContext();
    const tip: AmpTip | undefined = state.mapTips[index];
    if (!tip) return;
    const panel: HTMLElement | null = app.querySelector('[data-mapsuggest]');
    if (panel) panel.hidden = true;
    toast(`正在規劃去「${tip.name}」嘅路線…`);
    const dest: AMapPoint | null = tip.location ?? (await geocodeAddress(`${tip.district}${tip.name}`));
    if (!isIdentityContextCurrent(context)) return;
    if (!dest) {
      toast('搵唔到該地點嘅位置');
      return;
    }
    await planAndDraw(dest, `去「${tip.name}」`, 'walking');
  }

  async function goRouteHome(): Promise<void> {
    const context = captureIdentityContext();
    const geofence: MemoPathGeofenceRecord | null = await ensureGeofence();
    if (!isIdentityContextCurrent(context)) return;
    const homeLabel: string = geofence ? cleanHomeLabel(geofence.homeLabel) : '';
    if (homeLabel.length === 0) {
      toast('請先喺「設定安全範圍」填寫屋企地址');
      return;
    }
    toast('正在規劃返屋企嘅路線…');
    const homePos: AMapPoint | null = await resolveHomePosition(homeLabel);
    if (!isIdentityContextCurrent(context)) return;
    if (!homePos) {
      toast('搵唔到屋企地址嘅位置');
      return;
    }
    await planAndDraw(homePos, '返屋企', 'walking');
  }

  function pickDestTip(index: number): void {
    const tip: AmpTip | undefined = state.destTips[index];
    if (!tip) return;
    state.tripForm = { ...state.tripForm, destination: tip.name };
    const input: HTMLInputElement | null = app.querySelector('[data-field="destination"]');
    if (input) input.value = tip.name;
    const panel: HTMLElement | null = app.querySelector('[data-destsuggest]');
    if (panel) panel.hidden = true;
  }

  async function navigateToDestination(destination: string): Promise<void> {
    const label: string = destination.trim();
    if (label.length === 0) return;
    state.navDestination = label;
    state.navPos = null;
    toast(`${t('planningRoute')} ${label}`);
    nav('tripMap');
  }

  function voiceLang(): string {
    if (state.setting.language === 'mandarin') return 'zh-CN';
    if (state.setting.language === 'english') return 'en-US';
    return 'zh-HK';
  }

  function voiceFabHtml(): string {
    return `<button class="voice-fab ${state.listening ? 'listening' : ''}" data-action="voiceToggle" aria-label="voice">🎙</button>`;
  }

  function voiceOverlayHtml(): string {
    return `<div class="voice-overlay"><span class="voice-pulse">🎙</span><span><b style="font-size:20px">${t('voiceListening')}</b><br><small style="color:#d9cdb8">${t('voiceSpeakNow')}</small><div data-voicetext style="min-height:28px;font-size:22px;font-weight:700;margin-top:4px">${esc(state.voiceText)}</div></span><button class="press" data-action="voiceToggle">${t('voiceTapStop')}</button></div>`;
  }

  function finalizeVoice(): void {
    if (!state.listening) return;
    state.listening = false;
    voiceHandle = null;
    const text: string = voiceFinalAccum.trim();
    voiceFinalAccum = '';
    render();
    if (text.length > 0) {
      void handleVoiceCommand(text);
    } else {
      toast(t('voiceNoSpeech'));
    }
  }

  function stopListening(): void {
    const context = captureIdentityContext();
    if (!voiceHandle) return;
    const handle: VoiceRecognizerHandle = voiceHandle;
    voiceHandle = null;
    handle.stop();
    // 由 onend 統一收尾；萬一瀏覽器唔觸發，用兜底定時器完成
    window.clearTimeout(voiceFinalizeTimer);
    voiceFinalizeTimer = window.setTimeout(() => { if (isIdentityContextCurrent(context)) finalizeVoice(); }, 1200);
  }

  function startListening(): void {
    if (state.listening) return;
    if (!isSpeechSupported()) {
      toast(t('voiceUnsupported'));
      return;
    }
    state.listening = true;
    state.voiceText = '';
    voiceFinalAccum = '';
    render();
    const context = captureIdentityContext();
    const handle: VoiceRecognizerHandle | null = startVoiceRecognition({
      lang: voiceLang(),
      onInterim: (text: string) => {
        if (!isIdentityContextCurrent(context)) return;
        const display: string = voiceFinalAccum.length > 0 ? `${voiceFinalAccum} ${text}` : text;
        state.voiceText = display;
        const el: Element | null = app.querySelector('[data-voicetext]');
        if (el) el.textContent = display;
      },
      onFinal: (text: string) => {
        if (!isIdentityContextCurrent(context)) return;
        voiceFinalAccum = text;
        state.voiceText = text;
        const el: Element | null = app.querySelector('[data-voicetext]');
        if (el) el.textContent = text;
      },
      onError: (code: string) => {
        if (!isIdentityContextCurrent(context)) return;
        if (code === 'not-allowed' || code === 'service-not-allowed') {
          window.clearTimeout(voiceFinalizeTimer);
          state.listening = false;
          voiceHandle = null;
          voiceFinalAccum = '';
          render();
          toast(t('voiceMicDenied'));
          return;
        }
        logger.warn('語音識別錯誤，等待 onend 收尾', code);
      },
      onEnd: () => {
        if (!isIdentityContextCurrent(context)) return;
        window.clearTimeout(voiceFinalizeTimer);
        finalizeVoice();
      },
    });
    if (!handle) {
      state.listening = false;
      toast(t('voiceUnsupported'));
      render();
    } else {
      voiceHandle = handle;
    }
  }

  function toggleVoice(): void {
    if (Date.now() < suppressVoiceClickUntil) return;
    if (state.listening) {
      stopListening();
      return;
    }
    startListening();
  }

  function onVoicePointerDown(event: PointerEvent): void {
    const el: Element | null =
      event.target instanceof Element ? event.target.closest('[data-action="voiceToggle"]') : null;
    if (!el) return;
    window.clearTimeout(voiceHoldTimer);
    if (state.listening) {
      voiceHoldActive = false;
      return;
    }
    voiceHoldTimer = window.setTimeout(() => {
      voiceHoldActive = true;
      startListening();
    }, 250);
  }

  function onVoicePointerUp(): void {
    window.clearTimeout(voiceHoldTimer);
    if (!voiceHoldActive) return;
    voiceHoldActive = false;
    suppressVoiceClickUntil = Date.now() + 800;
    if (state.listening) stopListening();
  }

  async function callContactByName(name: string): Promise<void> {
    const elderId: string = await ensureElderId();
    const context = captureIdentityContext();
    if (elderId.length > 0 && state.contacts.length === 0) {
      try {
        const res = await memoApi.listContacts(elderId);
        if (!isIdentityContextCurrent(context)) return;
        state.contacts = res.items;
      } catch (error) {
        if (!isIdentityContextCurrent(context)) return;
        logger.warn('載入聯絡人失敗', error);
      }
    }
    if (!isIdentityContextCurrent(context)) return;
    const hit: MemoPathContactRecord | undefined = state.contacts.find(
      (contact: MemoPathContactRecord) => name.includes(contact.name) || contact.name.includes(name),
    );
    toast(`📞 ${t('voiceCalling')}${hit?.name ?? name}…`);
  }

  async function handleVoiceCommand(raw: string): Promise<void> {
    const text: string = raw.trim();
    const lower: string = text.toLowerCase();
    toast(`🎙 ${t('voiceHeard')}：${text}`);
    if (/(救命|sos|報警|报警|emergency)/u.test(lower)) {
      toast('🚨 999 …');
      return;
    }
    if (/(返屋企|回家|帶我回家|带我回家|導航回家|导航回家|go home|take me home)/u.test(lower)) {
      nav('elderMap');
      await goRouteHome();
      return;
    }
    if (/(付款|付錢|付钱|買單|买单|pay)/u.test(lower)) {
      nav('payment');
      return;
    }
    if (/(叫車|叫车|打車|打车|的士|taxi|cab)/u.test(lower)) {
      nav('taxi');
      return;
    }
    if (/(天氣|天气|weather)/u.test(lower)) {
      nav('weather');
      return;
    }
    const callMatch: RegExpMatchArray | null = lower.match(
      /(?:打畀|打给|打電話給|打电话给|call)\s*([^，,。!！?？]{1,10})/u,
    );
    if (/(聯絡家人|联络家人|聯繫家人|联系家人|打電話|打电话|contact)/u.test(lower) || callMatch) {
      nav('contacts');
      if (callMatch) await callContactByName(callMatch[1]);
      return;
    }
    const gotoMatch: RegExpMatchArray | null =
      lower.match(
        /(?:我要去|我想去|帶我去|带我去|導航到|导航到|送我去|返回|回去|go to|take me to|navigate to|head to)\s*([^，,。!！?？]{2,16})/u,
      ) ?? lower.match(/去\s*([^，,。!！?？]{2,16})/u);
    if (gotoMatch) {
      const dest: string = gotoMatch[1].replace(/(?:一下|啦|吧|啊|囉|咯)$/u, '');
      await navigateToDestination(dest);
      return;
    }
    if (/(行程|trip|schedule)/u.test(lower)) {
      nav('taxi');
      return;
    }
    if (/(地圖|地图|map)/u.test(lower)) {
      nav('elderMap');
      return;
    }
    if (/^(返回|回去|back)$/u.test(lower)) {
      back();
      return;
    }
    showVoiceGuide(text);
  }

  function showVoiceGuide(text: string): void {
    const chip = (key: string, cmd: string): string =>
      `<button class="chip" data-action="voicecmd:${cmd}">${t(key)}</button>`;
    const overlay: HTMLDivElement = document.createElement('div');
    overlay.className = 'overlay';
    overlay.innerHTML = `<div class="dialog"><div class="taxi">🎙</div><h2>${t('voiceGuideTitle')}</h2><p class="muted" style="text-align:center">「${esc(text)}」</p><p style="text-align:left">${t('voiceGuideHint')}</p><div style="display:flex;flex-wrap:wrap;gap:8px;justify-content:center">${chip('guideGoHospital', 'goto-hospital')}${chip('guideGoHome', 'home')}${chip('guidePay', 'payment')}${chip('guideTaxi', 'taxi')}${chip('guideFamily', 'contacts')}${chip('guideWeather', 'weather')}</div><div class="dialog-actions" style="grid-template-columns:1fr"><button class="confirm" data-close>【${t('gotIt')}】</button></div></div>`;
    app.append(overlay);
  }

  function runVoiceQuick(kind: string): void {
    app.querySelector('.overlay')?.remove();
    if (kind === 'home') {
      nav('elderMap');
      runWithContext(() => goRouteHome());
    } else if (kind === 'payment') {
      nav('payment');
    } else if (kind === 'taxi') {
      nav('taxi');
    } else if (kind === 'contacts') {
      nav('contacts');
    } else if (kind === 'weather') {
      nav('weather');
    } else if (kind === 'goto-hospital') {
      void navigateToDestination(t('hospitalWord'));
    }
  }

  function showAccountExistsDialog(): void {
    state.loginAccount = state.regPhone;
    state.loginPassword = '';
    const overlay: HTMLDivElement = document.createElement('div');
    overlay.className = 'overlay';
    overlay.innerHTML = `<div class="dialog"><div class="taxi">👋</div><h2>${t('existsTitle')}</h2><p style="text-align:left">${t('existsBody').replace('{phone}', esc(state.regPhone))}</p><div class="dialog-actions" style="grid-template-columns:1fr"><button class="confirm" data-action="switchToLogin">${t('switchLogin')}</button><button data-action="registerNew">${t('registerNew')}</button></div></div>`;
    app.append(overlay);
  }

  function showCabDialog(): void {
    const target: MemoPathTripRecord | undefined =
      state.trips.find((trip: MemoPathTripRecord) => trip.status !== 'cab_called') ?? state.trips[0];
    state.callingTripId = target?.id ?? '';
    const desc: string = target
      ? `家人為你安排了 ${target.startTime} 去${target.destination}，要現在提前叫車？`
      : '而家冇待出行嘅行程，要現在叫車？';
    const overlay: HTMLDivElement = document.createElement('div');
    overlay.className = 'overlay';
    overlay.innerHTML = `<div class="dialog"><div class="taxi">🚕</div><h2>要現在提前叫車？</h2><p>${esc(desc)}</p><div class="dialog-actions"><button data-close>取消</button><button class="confirm" data-action="confirmCab">確認</button></div></div>`;
    app.append(overlay);
  }

  async function confirmCab(): Promise<void> {
    const context = captureIdentityContext();
    const tripId = state.callingTripId;
    const overlay: Element | null = app.querySelector('.overlay');
    if (overlay) overlay.remove();
    if (state.callingTripId.length === 0) {
      toast('演示：未接入叫車服務，未通知司機');
      return;
    }
    const calledTrip: MemoPathTripRecord | undefined = state.trips.find(
      (trip: MemoPathTripRecord) => trip.id === tripId,
    );
    if (state.demoMode) {
      if (calledTrip) {
        calledTrip.status = 'cab_called';
        state.navDestination = calledTrip.destination;
      }
      toastAction(t('cabCalledToast'), t('cabSeeDriver'), 'cabArrived');
      rerenderIf('taxi');
      return;
    }
    if (!calledTrip || calledTrip.elderId !== state.currentElderId) return;
    try {
      const elderId = calledTrip.elderId;
      await memoApi.callCab(tripId);
      if (!isIdentityContextCurrent(context)) return;
      if (calledTrip) state.navDestination = calledTrip.destination;
      toastAction(t('cabCalledToast'), t('cabSeeDriver'), 'cabArrived');
      if (elderId.length > 0) {
        const res = await memoApi.listTrips(elderId);
        if (!isIdentityContextCurrent(context)) return;
        state.trips = res.items;
      }
      rerenderIf('taxi');
    } catch (error) {
      if (isIdentityContextCurrent(context)) handleApiError(error);
    }
  }

  function showSwitchElderDialog(): void {
    if (state.elders.length === 0) {
      toast('暫無其他長者可切換');
      return;
    }
    const items: string = state.elders
      .map(
        (elder: MemoPathElderRecord) =>
          `<button style="width:100%;padding:12px;border-radius:12px;background:#fff4e3;margin-top:10px;font-size:18px" data-switch="${elder.id}">${esc(elder.avatarEmoji)} ${esc(elder.name)}${elder.id === state.currentElderId ? '（當前）' : ''}</button>`,
      )
      .join('');
    const overlay: HTMLDivElement = document.createElement('div');
    overlay.className = 'overlay';
    overlay.innerHTML = `<div class="dialog"><div class="taxi">🔄</div><h2>切換長者</h2><div style="text-align:left">${items}</div><div class="dialog-actions"><button data-close>取消</button></div></div>`;
    app.append(overlay);
  }

  async function runAction(action: string): Promise<void> {
    if (action.startsWith('care')) { await careAction(action); return; }
    if (!state.demoMode && authenticatedRole === 'elder' && (['newElder', 'saveElder', 'newTrip', 'saveTrip', 'addPlace', 'confirmPlace', 'saveGeofence', 'toggleDwell', 'switchElder'].includes(action) || action.startsWith('radius:'))) {
      toast('長者帳號只能讀取照護資料；請由家屬管理變更'); return;
    }
    if (!state.demoMode && authenticatedRole === 'elder' && action === 'switchToFamily') { nav('settings'); return; }
    if (action === 'login') {
      await doLogin();
    } else if (action === 'sendOtp' || action === 'resendOtp') {
      if (otpLeft > 0) { toast('請等待倒數結束後重新取得演示碼'); return; }
      if (!/^[0-9]{8}$/.test(state.regPhone)) {
        toast('此 +852 手機欄位須輸入8位數字');
        return;
      }
      const context = captureIdentityContext();
      const phone = state.regPhone;
      try {
        const res = await memoApi.requestOtp(phone);
        if (!isIdentityContextCurrent(context) || state.regPhone !== phone) return;
        state.regOtpIssued = res.code;
        state.regOtp = res.code;
        startOtpCountdown();
        toast(`演示驗證碼：${res.code}（未發送短信）`);
        render();
      } catch (error) {
        if (isIdentityContextCurrent(context) && state.regPhone === phone) handleApiError(error);
      }
    } else if (action === 'regNext') {
      if (state.regOtp.length !== 6 || state.regOtp !== state.regOtpIssued) {
        toast('請先獲取並確認驗證碼');
        return;
      }
      nav('register2');
    } else if (action === 'regNext2') {
      if (state.regPassword.length < 8) {
        toast('密碼至少 8 位');
        return;
      }
      if (state.regPassword !== state.regPassword2) {
        toast('兩次輸入嘅密碼不一致');
        return;
      }
      state.elderForm = { name: '' };
      state.relationIsOther = false;
      state.relationCustom = '';
      nav('register3');
    } else if (action === 'regSubmit') {
      await doRegister();
    } else if (action === 'cab') {
      showCabDialog();
    } else if (action === 'confirmCab') {
      await confirmCab();
    } else if (action === 'sos') {
      toast('正在撥打 999…（演示）');
    } else if (action === 'callFamily') {
      toast('正在撥打給長者…（演示）');
    } else if (action === 'toggleLock') {
      await saveSetting({ lockLayout: !state.setting.lockLayout });
    } else if (action === 'retrySettingSave') {
      await saveSetting(state.setting);
    } else if (action === 'frontDemo') {
      authAttemptSequence += 1;
      const context = captureIdentityContext();
      const confirmed = await memoApi.logout();
      if (!isIdentityContextCurrent(context)) return;
      setToken(''); enterDemoMode();
      if (!confirmed) toast('前端演示已開啟；舊會話撤銷未確認，可能仍有效至到期。返回登入頁可重試撤銷。');
    } else if (action === 'retryLogout') {
      const context = captureIdentityContext();
      const confirmed = await memoApi.retryLogout();
      if (!isIdentityContextCurrent(context)) return;
      render();
      toast(confirmed ? '舊會話已不可用' : '撤銷未確認，請恢復連線後重試；舊會話可能仍有效至到期');
    } else if (action === 'logout') {
      authAttemptSequence += 1;
      const context = captureIdentityContext();
      const confirmed = await memoApi.logout();
      if (!isIdentityContextCurrent(context)) return;
      setToken(''); clearIdentityData(); nav('login');
      toast(confirmed ? '已登出' : '本機資料已清除；服務端撤銷未確認，舊會話可能仍有效至到期。可點擊重試撤銷。');
    } else if (action === 'switchToFamily') {
      if (!state.demoMode && authenticatedRole !== 'family') { toast('長者帳號不能切換為家屬權限'); return; }
      state.role = 'family';
      state.history = [];
      nav('familyHome');
    } else if (action === 'switchElder') {
      showSwitchElderDialog();
    } else if (action === 'newElder') {
      state.editingElderId = '';
      state.elderForm = { name: '' };
      state.relationIsOther = false;
      state.relationCustom = '';
      nav('editElder');
    } else if (action === 'saveElder') {
      await saveElder();
    } else if (action === 'cycleAvatar') {
      const options: string[] = ['👴', '👵', '🧓'];
      const current: string = state.elderForm.avatarEmoji || '👴';
      const nextIndex: number = (options.indexOf(current) + 1) % options.length;
      state.elderForm = { ...state.elderForm, avatarEmoji: options[nextIndex] };
      render();
    } else if (action === 'addPlace') {
      state.addingPlace = true;
      state.editingPlaceId = '';
      state.placeDraft = null;
      state.placeSearchText = '';
      state.placeTips = [];
      state.placeSearchStatus = 'idle';
      state.placeIcon = '📍';
      render();
    } else if (action === 'confirmPlace') {
      await confirmPlace();
    } else if (action === 'cancelPlace') {
      state.addingPlace = false;
      state.editingPlaceId = '';
      state.placeDraft = null;
      state.placeSearchText = '';
      state.placeTips = [];
      state.placeSearchStatus = 'idle'; placeSearchSequence += 1;
      render();
    } else if (action === 'retryPlaceSearch') {
      const sequence = ++placeSearchSequence;
      void suggestPlaceSearch(state.placeSearchText, sequence);
    } else if (action === 'toggleDwell') {
      if (state.geofence) {
        state.geofence = { ...state.geofence, dwellEnabled: !state.geofence.dwellEnabled };
        render();
      }
    } else if (action.startsWith('radius:')) {
      const delta: number = Number(action.slice(7));
      if (state.geofence) {
        const next: number = Math.min(1500, Math.max(300, state.geofence.radiusM + delta));
        state.geofence = { ...state.geofence, radiusM: next };
        render();
      }
    } else if (action === 'saveGeofence') {
      await saveGeofence();
    } else if (action === 'routeHome') {
      await goRouteHome();
    } else if (action === 'retryMap') {
      await mountScreenMaps();
    } else if (action === 'tripNavRetry') {
      await autoPlanTrip(true);
    } else if (action === 'newTrip') {
      const now: Date = new Date();
      const todayIso: string = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      state.tripForm = { destination: '', tripDate: todayIso, startTime: '09:00', scheduleMode: 'auto' };
      state.tripFormOpen = true;
      render();
    } else if (action === 'saveTrip') {
      await saveTrip();
    } else if (action === 'toggleTripMode') {
      state.tripForm = {
        ...state.tripForm,
        scheduleMode: state.tripForm.scheduleMode === 'auto' ? 'manual' : 'auto',
      };
      render();
    } else if (action === 'voiceToggle') {
      toggleVoice();
    } else if (action === 'switchToLogin') {
      app.querySelector('.overlay')?.remove();
      state.history = [];
      nav('login');
    } else if (action === 'registerNew') {
      app.querySelector('.overlay')?.remove();
      state.regPhone = '';
      state.regOtp = '';
      state.history = [];
      nav('register1');
    } else if (action === 'cabFbYes' || action === 'cabFbNo') {
      state.cabFeedback = action === 'cabFbYes' ? 'yes' : 'no';
      const yesBtn: Element | null = app.querySelector('[data-action="cabFbYes"]');
      const noBtn: Element | null = app.querySelector('[data-action="cabFbNo"]');
      if (yesBtn && noBtn) {
        yesBtn.classList.toggle('active', state.cabFeedback === 'yes');
        noBtn.classList.toggle('active', state.cabFeedback === 'no');
      }
      toast(t('cabFbThanks'));
    } else if (action === 'cabContactDriver') {
      toast(`📞 ${t('cabContactToast')}`);
    } else if (action === 'cabNotBoarded') {
      toast(t('cabNotBoardedToast'));
    } else if (action === 'cabCall110') {
      toast(t('cab110Toast'));
    } else if (action === 'cabSafetyCenter') {
      toast(t('cabSafetyToast'));
    } else if (action === 'cabArriveNotify') {
      toast(t('cabArriveToast'));
    } else if (action === 'cabShareTrip') {
      toast(t('cabShareToast'));
    } else if (action === 'cabChangeDest') {
      toast(t('cabChangeToast'));
    } else if (action === 'cabLocate') {
      toast(t('cabLocateToast'));
    } else if (action.startsWith('voicecmd:')) {
      runVoiceQuick(action.slice(9));
    }
  }

  function onClick(event: MouseEvent): void {
    const element: HTMLElement = event.target as HTMLElement;
    if (element.closest('[data-accountkey]')) {
      state.loginAccount = 'demo';
      state.loginPassword = 'demo1234';
      render();
      return;
    }
    const target: HTMLButtonElement | null = element.closest('button');
    if (!target) {
      const editPlaceEl: HTMLElement | null = element.closest('[data-editplace]');
      const editPlaceId: string | undefined = editPlaceEl?.dataset.editplace;
      if (editPlaceEl && editPlaceId) {
        openEditPlace(editPlaceId);
        return;
      }
      const cabTripEl: HTMLElement | null = element.closest('[data-cabtrip]');
      const cabTripDest: string | undefined = cabTripEl?.dataset.cabtrip;
      if (cabTripEl && cabTripDest) {
        state.navDestination = cabTripDest;
        state.cabFeedback = 'no';
        nav('cabArrived');
        return;
      }
      const navEl: HTMLElement | null = element.closest('[data-navdest]');
      const navDest: string | undefined = navEl?.dataset.navdest;
      if (navEl && navDest) {
        void navigateToDestination(navDest);
        return;
      }
      return;
    }
    const mappick: string | undefined = target.dataset.mappick;
    if (mappick !== undefined) {
      runWithContext(() => pickMapTip(Number(mappick)));
      return;
    }
    const destpick: string | undefined = target.dataset.destpick;
    if (destpick !== undefined) {
      pickDestTip(Number(destpick));
      return;
    }
    const homepick: string | undefined = target.dataset.homepick;
    if (homepick !== undefined) {
      runWithContext(() => pickHomeTip(Number(homepick)));
      return;
    }
    const placepick: string | undefined = target.dataset.placepick;
    if (placepick !== undefined) {
      pickPlaceTip(Number(placepick));
      return;
    }
    const placeicon: string | undefined = target.dataset.placeicon;
    if (placeicon) {
      state.placeIcon = placeicon;
      render();
      return;
    }
    const delplace: string | undefined = target.dataset.delplace;
    if (delplace) {
      runWithContext(() => deletePlace(delplace));
      return;
    }
    const placego: string | undefined = target.dataset.placego;
    if (placego) {
      goPlace(placego);
      return;
    }
    const navTarget: string | undefined = target.dataset.navdest;
    if (navTarget) {
      void navigateToDestination(navTarget);
      return;
    }
    const gender: string | undefined = target.dataset.gender;
    if (gender !== undefined) {
      state.elderForm = { ...state.elderForm, gender };
      render();
      return;
    }
    const go: string | undefined = target.dataset.go;
    if (go) {
      nav(go);
      return;
    }
    if (target.hasAttribute('data-back')) {
      back();
      return;
    }
    if (target.dataset.role) {
      authAttemptSequence += 1;
      state.role = target.dataset.role as MemoPathRole;
      render();
      return;
    }
    const editId: string | undefined = target.dataset.edit;
    if (editId) {
      const elder: MemoPathElderRecord | undefined = state.elders.find(
        (item: MemoPathElderRecord) => item.id === editId,
      );
      if (elder) {
        state.editingElderId = elder.id;
        const presetRelation: boolean = RELATION_OPTIONS.includes(elder.relation);
        state.relationIsOther = elder.relation.length > 0 && !presetRelation;
        state.relationCustom = state.relationIsOther ? elder.relation : '';
        state.elderForm = {
          name: elder.name,
          nickname: elder.nickname,
          relation: elder.relation,
          age: elder.age,
          gender: elder.gender,
          address: elder.address,
          phone: elder.phone,
          emergencyPhone: elder.emergencyPhone,
          avatarEmoji: elder.avatarEmoji,
        };
        nav('editElder');
      }
      return;
    }
    const callName: string | undefined = target.dataset.call;
    if (callName) {
      toast(`正在幫你聯繫 ${callName}…（演示）`);
      return;
    }
    const switchId: string | undefined = target.dataset.switch;
    if (switchId) {
      setCurrentElder(switchId);
      const overlay: Element | null = app.querySelector('.overlay');
      if (overlay) overlay.remove();
      const elder: MemoPathElderRecord | undefined = state.elders.find(
        (item: MemoPathElderRecord) => item.id === switchId,
      );
      toast(`已切換至 ${elder?.name ?? '長者'}`);
      if (state.demoMode) {
        applyDemoElderData(switchId);
      } else {
        state.dashboard = null;
        state.geofence = null;
        state.contacts = []; state.trips = []; state.places = []; state.alerts = []; state.movements = [];
        state.vitals = { latest: null, trend: [] }; state.vitalsLoaded = false;
        state.placeDraft = null; state.editingPlaceId = ''; state.addingPlace = false;
        state.homeTips = []; state.mapTips = []; state.destTips = []; state.placeTips = [];
        state.navDestination = ''; state.navPos = null; homePosCache = null; disposeMaps();
        void loadScreenData(state.screen);
      }
      render();
      return;
    }
    const setting: string | undefined = target.dataset.setting;
    if (setting) {
      const [key, value] = setting.split(':');
      if (key === 'language') {
        void saveSetting({ language: value as MemoPathSettingConfig['language'] });
      } else if (key === 'voiceMode') {
        void saveSetting({ voiceMode: value as MemoPathSettingConfig['voiceMode'] });
      }
      return;
    }
    const action: string | undefined = target.dataset.action;
    if (action) {
      runWithContext(() => runAction(action));
      return;
    }
    if (target.hasAttribute('data-close')) {
      target.closest('.overlay')?.remove();
    }
  }

  function onChange(event: Event): void {
    const select: HTMLSelectElement = event.target as HTMLSelectElement;
    const field: string | undefined = select.dataset.field;
    if (!field || select.tagName !== 'SELECT') return;
    const value: string = select.value;
    if (field === 'elder.relation') {
      if (value === '其他') {
        state.relationIsOther = true;
        state.elderForm = { ...state.elderForm, relation: state.relationCustom };
      } else {
        state.relationIsOther = false;
        state.relationCustom = '';
        state.elderForm = { ...state.elderForm, relation: value };
      }
      render();
    }
  }

  function onInput(event: Event): void {
    const input: HTMLInputElement = event.target as HTMLInputElement;
    if (input.id === 'care-target') { careTarget = input.value; return; }
    if (input.id === 'care-code') { careCode = input.value; carePreview = null; return; }
    const field: string | undefined = input.dataset.field;
    if (!field) return;
    const value: string = input.value;
    if (field.startsWith('elder.')) {
      const key: string = field.slice(6);
      if (key === 'age') {
        const parsed: number = Number(value);
        if (value.trim().length > 0 && !Number.isFinite(parsed)) {
          toast('年齡請輸入數字，否則會當 0 處理');
        }
        state.elderForm = { ...state.elderForm, age: Number.isFinite(parsed) ? parsed : 0 };
      } else {
        state.elderForm = { ...state.elderForm, [key]: value } as MemoPathElderInput;
      }
      return;
    }
    if (field === 'relationCustom') {
      state.relationCustom = value;
      state.elderForm = { ...state.elderForm, relation: value };
      return;
    }
    if (field === 'loginAccount') state.loginAccount = value;
    else if (field === 'loginPassword') state.loginPassword = value;
    else if (field === 'regPhone') {
      state.regPhone = value.replace(/[^0-9]/g, '').slice(0, 8); input.value = state.regPhone;
      state.regOtp = ''; state.regOtpIssued = ''; otpLeft = 0; window.clearInterval(otpTimer);
      app.querySelectorAll<HTMLButtonElement>('[data-action="sendOtp"], [data-action="resendOtp"]').forEach(button => { button.disabled = false; });
    }
    else if (field === 'regPassword') {
      state.regPassword = value;
      const meter = app.querySelector('[data-password-strength]');
      if (meter) meter.innerHTML = strengthBars();
    }
    else if (field === 'regPassword2') state.regPassword2 = value;
    else if (field === 'newPlaceLabel') state.newPlaceLabel = value;
    else if (field === 'homeSearch') {
      state.homeSearchText = value;
      const sequence = ++suggestionSequences.home;
      state.homeTips = [];
      renderSuggestPanel(app.querySelector('[data-homesuggest]'), [], 'homepick');
      window.clearTimeout(homeSearchTimer);
      homeSearchTimer = window.setTimeout(() => void suggestHome(value, sequence), 300);
    }
    else if (field === 'placeSearch') {
      state.placeSearchText = value;
      const sequence = ++placeSearchSequence;
      state.placeSearchStatus = value.trim().length > 0 ? 'searching' : 'idle';
      state.placeTips = [];
      renderSuggestPanel(app.querySelector('[data-placesuggest]'), [], 'placepick');
      updatePlaceSearchStatus();
      window.clearTimeout(placeSearchTimer);
      placeSearchTimer = window.setTimeout(() => void suggestPlaceSearch(value, sequence), 300);
    }
    else if (field === 'mapsearch') {
      const sequence = ++suggestionSequences.map;
      state.mapTips = [];
      renderSuggestPanel(app.querySelector('[data-mapsuggest]'), [], 'mappick');
      window.clearTimeout(mapSearchTimer);
      mapSearchTimer = window.setTimeout(() => void suggestMap(value, sequence), 300);
    } else if (field === 'destination') {
      state.tripForm = { ...state.tripForm, destination: value };
      const sequence = ++suggestionSequences.destination;
      state.destTips = [];
      renderSuggestPanel(app.querySelector('[data-destsuggest]'), [], 'destpick');
      window.clearTimeout(destSearchTimer);
      destSearchTimer = window.setTimeout(() => void suggestDestination(value, sequence), 300);
    }
    else if (field === 'tripDate') state.tripForm = { ...state.tripForm, tripDate: value };
    else if (field === 'startTime') state.tripForm = { ...state.tripForm, startTime: value };
  }

  app.addEventListener('click', onClick);
  app.addEventListener('input', onInput);
  app.addEventListener('change', onChange);
  app.addEventListener('pointerdown', onVoicePointerDown);
  app.addEventListener('pointerup', onVoicePointerUp);
  app.addEventListener('pointercancel', onVoicePointerUp);
  render();
  /** Refresh restoration trusts me before any business request. */
  if (getToken()) {
    const generation = identityGeneration;
    const restorationToken = getToken(); const attempt = authAttemptSequence;
    void memoApi.me().then(verified => {
      if (!active || generation !== identityGeneration || restorationToken !== getToken() || attempt !== authAttemptSequence) return;
      clearIdentityData(); authenticatedRole = verified.role; authenticatedIsDemo = verified.isDemo === true; state.role = verified.role;
      nav(verified.role === 'elder' ? 'elderHome' : 'familyHome');
    }).catch(error => { if (active && generation === identityGeneration && restorationToken === getToken() && attempt === authAttemptSequence) handleApiError(error); });
  }

  return () => {
    active = false; identityGeneration += 1;
    app.removeEventListener('click', onClick);
    app.removeEventListener('input', onInput);
    app.removeEventListener('change', onChange);
    app.removeEventListener('pointerdown', onVoicePointerDown);
    app.removeEventListener('pointerup', onVoicePointerUp);
    app.removeEventListener('pointercancel', onVoicePointerUp);
    if (voiceHandle) {
      voiceHandle.abort();
      voiceHandle = null;
    }
    window.clearTimeout(voiceHoldTimer);
    window.clearTimeout(voiceFinalizeTimer);
    window.clearInterval(otpTimer);
    window.clearTimeout(toastTimer);
    window.clearTimeout(mapSearchTimer);
    window.clearTimeout(destSearchTimer);
    window.clearTimeout(homeSearchTimer);
    window.clearTimeout(placeSearchTimer);
    disposeMaps();
  };
}
