import * as Notifications from 'expo-notifications';
import { Platform, AppState, AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AE } from '../../../crypto';
import { API_HOSTS } from '../../config/apiHosts';
import type { User } from './authService';
import { notificationService, ServerNotiItem } from './notificationService';
import { scheduleNotificationService } from './scheduleNotificationService';

const SCHEDULE_NOTI_BOOTSTRAPPED_KEY = 'SCHEDULE_NOTI_BOOTSTRAPPED';

const INSERT_KEY = 'FSkkLAwuKB4UEgQTHgcCDAPP';
const UPDATE_KEY = 'FDElIDUkHhQSBBMeBwIM';
const INSERT_URL = `${API_HOSTS.cms}/CMS_ThongBao_MH/${INSERT_KEY}`;
const UPDATE_URL = `${API_HOSTS.cms}/CMS_ThongBao_MH/${UPDATE_KEY}`;

const LAST_TOKEN_KEY = 'FCM_TOKEN_LAST';
const CURRENT_TOKEN_KEY = 'FCM_CURRENT_TOKEN';
const INBOX_KEY = 'FCM_NOTI_INBOX';
const UNREAD_KEY = 'FCM_NOTI_UNREAD';
const INBOX_MAX = 30;

export interface FcmNotiItem {
  id: string;
  title: string;
  body: string;
  receivedAt: number;
  read: boolean;
  data?: Record<string, any>;
}

type InboxListener = (inbox: FcmNotiItem[], unread: number) => void;
const inboxListeners = new Set<InboxListener>();

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

type Subscription = { remove: () => void };
type TapHandler = (item: FcmNotiItem) => void;

let foregroundSub: Subscription | null = null;
let responseSub: Subscription | null = null;
let appStateSub: { remove: () => void } | null = null;
let initializedForUserId: string | null = null;
let onTapHandler: TapHandler | null = null;
let syncInFlight: Promise<void> | null = null;
let lastSyncAt = 0;
const SYNC_MIN_INTERVAL = 3000;

function extractUserId(user: User | null): string {
  if (!user) return '';
  const raw = user.sub || '';
  return raw.split(';')[0] || raw;
}

async function getAuthToken(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem('access_token');
  } catch {
    return null;
  }
}

async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  try {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Mặc định',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#3B82F6',
      sound: 'default',
    });
  } catch (e) {
    console.warn('[FCM] setNotificationChannel failed:', e);
  }
}

async function requestPermissionIfNeeded(): Promise<boolean> {
  const settings = await Notifications.getPermissionsAsync();
  if (settings.granted) return true;
  if (settings.status === 'denied' && !settings.canAskAgain) return false;

  const req = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowBadge: true, allowSound: true },
  });
  return req.granted || req.status === 'granted';
}

async function getFcmToken(): Promise<string | null> {
  try {
    const device = await Notifications.getDevicePushTokenAsync();
    if (device?.data && typeof device.data === 'string') return device.data;
    console.warn('[FCM] getDevicePushTokenAsync returned non-string:', device);
    return null;
  } catch (e: any) {
    console.warn(
      '[FCM] getDevicePushTokenAsync failed:',
      e?.message || e,
      '→ Kiểm tra google-services.json (Android) / GoogleService-Info.plist (iOS) đã có chưa, đã prebuild + run native build chưa.',
    );
    return null;
  }
}

async function callEncryptedApi(url: string, key: string, body: object): Promise<any> {
  const authToken = await getAuthToken();
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    },
    body: JSON.stringify({ A: AE(JSON.stringify(body), key) }),
  });
  const text = await res.text();
  let parsed: any;
  try {
    parsed = JSON.parse(text);
  } catch {
    parsed = { Success: false, Message: text };
  }
  if (!res.ok) {
    console.warn('[FCM] HTTP', res.status, url, '→', text.slice(0, 200));
  }
  return parsed;
}

async function saveTokenToServer(userId: string, token: string): Promise<void> {
  const insertBody = {
    func: 'pkg_thongbao.ThemMoi_USER_FCM',
    iM: 'AzzSystem',
    strUSER_ID: userId,
    strTOKEN: token,
    strNguoiThucHien_Id: userId,
    strChucNang_Id: '',
  };

  const updateBody = {
    func: 'pkg_thongbao.Update_USER_FCM',
    iM: 'AzzSystem',
    strUSER_ID: userId,
    strTOKEN: token,
    strNguoiThucHien_Id: userId,
    strChucNang_Id: '',
  };

  try {
    const res = await callEncryptedApi(INSERT_URL, INSERT_KEY, insertBody);
    if (res?.Success === true) {
      console.log('[FCM] Token đã insert lên server');
      return;
    }
    console.log('[FCM] Insert không success, thử update. Message:', res?.Message);
  } catch (e) {
    console.warn('[FCM] Insert error, thử update:', e);
  }

  try {
    const res = await callEncryptedApi(UPDATE_URL, UPDATE_KEY, updateBody);
    if (res?.Success === true) {
      console.log('[FCM] Token đã update lên server');
    } else {
      console.warn('[FCM] Update không success:', res?.Message);
    }
  } catch (e) {
    console.warn('[FCM] Update error:', e);
  }
}

async function deleteTokenFromServer(userId: string): Promise<void> {
  const body = {
    func: 'pkg_thongbao.Update_USER_FCM',
    iM: 'AzzSystem',
    strUSER_ID: userId,
    strTOKEN: '',
    strNguoiThucHien_Id: userId,
    strChucNang_Id: '',
  };
  try {
    await callEncryptedApi(UPDATE_URL, UPDATE_KEY, body);
  } catch (e) {
    console.warn('[FCM] cleanup token error:', e);
  }
}

async function loadInbox(): Promise<FcmNotiItem[]> {
  try {
    const raw = await AsyncStorage.getItem(INBOX_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

async function saveInbox(items: FcmNotiItem[]): Promise<void> {
  try {
    await AsyncStorage.setItem(INBOX_KEY, JSON.stringify(items));
  } catch {}
}

async function getUnreadCount(): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(UNREAD_KEY);
    const n = raw ? parseInt(raw, 10) : 0;
    return isNaN(n) ? 0 : n;
  } catch {
    return 0;
  }
}

async function setUnreadCount(n: number): Promise<void> {
  try {
    await AsyncStorage.setItem(UNREAD_KEY, String(Math.max(0, n)));
  } catch {}
}

async function notifyListeners(): Promise<void> {
  const inbox = await loadInbox();
  const unread = await getUnreadCount();
  inboxListeners.forEach(cb => {
    try {
      cb(inbox, unread);
    } catch (e) {
      console.warn('[FCM] inbox listener error:', e);
    }
  });
}

function extractFromNotification(notif: Notifications.Notification | null | undefined): FcmNotiItem | null {
  if (!notif) return null;
  const req = notif.request;
  const content = req?.content;
  if (!content) return null;
  const data = (content.data || {}) as Record<string, any>;
  // Ưu tiên ID server gửi kèm payload để sync sau này khớp record
  const id =
    data.notifyId ||
    data.notifyID ||
    data.ID ||
    data.id ||
    data.messageId ||
    req.identifier ||
    `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  return {
    id: String(id),
    title: content.title || data.title || 'Thông báo',
    body: content.body || data.body || '',
    receivedAt: Date.now(),
    read: false,
    data,
  };
}

function mapServerItem(s: ServerNotiItem): FcmNotiItem {
  return {
    id: String(s.ID),
    title: s.TITLE || 'Thông báo',
    body: s.NBODY || '',
    receivedAt: notificationService.parseNDate(s.NDATE),
    read: Number(s.ISTATUS) === 1,
    data: {
      action: s.ACTION || '',
      serverId: String(s.ID),
      raw: s,
    },
  };
}

async function applyBadge(unread: number): Promise<void> {
  try {
    await Notifications.setBadgeCountAsync(Math.max(0, unread));
  } catch {}
}

async function pushIncoming(item: FcmNotiItem | null): Promise<void> {
  if (!item) return;
  const inbox = await loadInbox();
  if (inbox.some(x => x.id === item.id)) return;
  inbox.unshift(item);
  if (inbox.length > INBOX_MAX) inbox.length = INBOX_MAX;
  await saveInbox(inbox);
  const unread = inbox.filter(x => !x.read).length;
  await setUnreadCount(unread);
  await applyBadge(unread);
  await notifyListeners();
}

// Sync inbox local với server (server là source of truth)
async function syncFromServerInternal(userId: string, force = false): Promise<void> {
  if (!userId) return;
  const now = Date.now();
  if (!force && now - lastSyncAt < SYNC_MIN_INTERVAL) return;
  if (syncInFlight) return syncInFlight;

  syncInFlight = (async () => {
    try {
      const serverItems = await notificationService.listFromServer(userId);
      const mapped = serverItems.map(mapServerItem);

      // Giữ lại các item local chưa có trên server (mới nhận FCM, server chưa kịp index)
      const existing = await loadInbox();
      const serverIds = new Set(mapped.map(x => x.id));
      const localOnly = existing.filter(it => !serverIds.has(it.id));

      const merged = [...mapped, ...localOnly];
      merged.sort((a, b) => b.receivedAt - a.receivedAt);
      if (merged.length > INBOX_MAX) merged.length = INBOX_MAX;

      await saveInbox(merged);
      const unread = merged.filter(x => !x.read).length;
      await setUnreadCount(unread);
      await applyBadge(unread);
      await notifyListeners();
      lastSyncAt = Date.now();
    } catch (e) {
      console.warn('[FCM] syncFromServer failed:', e);
    } finally {
      syncInFlight = null;
    }
  })();
  return syncInFlight;
}

function attachListenersOnce(): void {
  if (!foregroundSub) {
    foregroundSub = Notifications.addNotificationReceivedListener(notif => {
      pushIncoming(extractFromNotification(notif)).catch(() => {});
    });
  }
  if (!responseSub) {
    responseSub = Notifications.addNotificationResponseReceivedListener(async resp => {
      const item = extractFromNotification(resp?.notification);
      if (!item) return;
      await pushIncoming(item);
      // User đã chủ động tap → mark read local + server
      try {
        await fcmService.markRead(item.id);
      } catch {}
      // Forward sang consumer (deep linking / navigation)
      try {
        onTapHandler?.(item);
      } catch (e) {
        console.warn('[FCM] onTapHandler error:', e);
      }
    });
  }
  if (!appStateSub) {
    const handler = (state: AppStateStatus) => {
      if (state === 'active' && initializedForUserId) {
        // Resync inbox khi user mở lại app (giải quyết miss noti khi app background)
        syncFromServerInternal(initializedForUserId).catch(() => {});
        // Refresh nhắc lịch (throttled bên trong scheduleNotificationService)
        scheduleNotificationService.refresh().catch(() => {});
      }
    };
    appStateSub = AppState.addEventListener('change', handler);
  }
}

function removeListeners(): void {
  foregroundSub?.remove();
  responseSub?.remove();
  appStateSub?.remove();
  foregroundSub = null;
  responseSub = null;
  appStateSub = null;
}

// Lần login đầu tiên: auto bật nhắc lịch học. Các lần sau: tôn trọng lựa chọn user.
async function bootstrapAndRefreshScheduleNoti(): Promise<void> {
  try {
    const bootstrapped = await AsyncStorage.getItem(SCHEDULE_NOTI_BOOTSTRAPPED_KEY);
    if (bootstrapped !== '1') {
      await scheduleNotificationService.enable();
      await AsyncStorage.setItem(SCHEDULE_NOTI_BOOTSTRAPPED_KEY, '1');
    } else if (await scheduleNotificationService.isEnabled()) {
      await scheduleNotificationService.refresh(true);
    }
  } catch (e) {
    console.warn('[FCM] bootstrap schedule noti failed:', e);
  }
}

export const fcmService = {
  async init(user: User | null): Promise<void> {
    const userId = extractUserId(user);
    if (!userId) {
      console.warn('[FCM] init bỏ qua: không có userId');
      return;
    }
    if (initializedForUserId === userId) return;

    await ensureAndroidChannel();

    const granted = await requestPermissionIfNeeded();
    if (!granted) {
      console.warn('[FCM] Người dùng từ chối quyền notification');
      return;
    }

    attachListenersOnce();

    const token = await getFcmToken();
    if (!token) return;

    try {
      await AsyncStorage.setItem(CURRENT_TOKEN_KEY, token);
    } catch {}

    const lastToken = (await AsyncStorage.getItem(LAST_TOKEN_KEY)) || '';
    if (lastToken === token && initializedForUserId === userId) {
      initializedForUserId = userId;
      syncFromServerInternal(userId).catch(() => {});
      bootstrapAndRefreshScheduleNoti().catch(() => {});
      return;
    }

    await saveTokenToServer(userId, token);
    try {
      await AsyncStorage.setItem(LAST_TOKEN_KEY, token);
    } catch {}

    initializedForUserId = userId;

    // Sync inbox với server lần đầu (chạy nền, không block UI)
    syncFromServerInternal(userId, true).catch(() => {});
    // Bootstrap + refresh local reminders cho lịch học
    bootstrapAndRefreshScheduleNoti().catch(() => {});
  },

  async cleanupOnLogout(user: User | null): Promise<void> {
    const userId = extractUserId(user);
    const token = (await AsyncStorage.getItem(CURRENT_TOKEN_KEY)) || '';
    if (userId && token) {
      await deleteTokenFromServer(userId);
    }
    removeListeners();
    initializedForUserId = null;
    onTapHandler = null;
    lastSyncAt = 0;
    syncInFlight = null;
    try {
      await AsyncStorage.multiRemove([
        LAST_TOKEN_KEY,
        CURRENT_TOKEN_KEY,
        INBOX_KEY,
        UNREAD_KEY,
        SCHEDULE_NOTI_BOOTSTRAPPED_KEY,
      ]);
    } catch {}
    await scheduleNotificationService.cleanup();
    await applyBadge(0);
    await notifyListeners();
  },

  async getToken(): Promise<string> {
    return (await AsyncStorage.getItem(CURRENT_TOKEN_KEY)) || '';
  },

  async getInbox(): Promise<FcmNotiItem[]> {
    return loadInbox();
  },

  async getUnreadCount(): Promise<number> {
    return getUnreadCount();
  },

  async markRead(id: string): Promise<void> {
    if (!id) return;
    const inbox = await loadInbox();
    const idx = inbox.findIndex(x => x.id === id);
    if (idx < 0 || inbox[idx].read) return;
    inbox[idx] = { ...inbox[idx], read: true };
    await saveInbox(inbox);
    const unread = inbox.filter(x => !x.read).length;
    await setUnreadCount(unread);
    await applyBadge(unread);
    await notifyListeners();
    // Sync lên server (fire-and-forget, không chặn UI)
    notificationService.markReadOnServer(id).catch(() => {});
  },

  async markAllRead(): Promise<void> {
    const inbox = await loadInbox();
    const unreadIds = inbox.filter(it => !it.read).map(it => it.id);
    const next = inbox.map(it => ({ ...it, read: true }));
    await saveInbox(next);
    await setUnreadCount(0);
    await applyBadge(0);
    await notifyListeners();
    // Bắn song song tất cả markRead lên server
    Promise.all(
      unreadIds.map(id => notificationService.markReadOnServer(id).catch(() => false)),
    ).catch(() => {});
  },

  async deleteItem(id: string): Promise<void> {
    if (!id) return;
    const inbox = await loadInbox();
    const item = inbox.find(x => x.id === id);
    if (!item) return;
    const next = inbox.filter(x => x.id !== id);
    await saveInbox(next);
    const unread = next.filter(x => !x.read).length;
    await setUnreadCount(unread);
    await applyBadge(unread);
    await notifyListeners();
    if (initializedForUserId) {
      notificationService.deleteOnServer(id, initializedForUserId).catch(() => {});
    }
  },

  async clearInbox(): Promise<void> {
    const inbox = await loadInbox();
    const userId = initializedForUserId;
    await saveInbox([]);
    await setUnreadCount(0);
    await applyBadge(0);
    await notifyListeners();
    if (userId) {
      Promise.all(
        inbox.map(it => notificationService.deleteOnServer(it.id, userId).catch(() => false)),
      ).catch(() => {});
    }
  },

  async refresh(): Promise<void> {
    if (!initializedForUserId) return;
    await syncFromServerInternal(initializedForUserId, true);
  },

  setOnTap(handler: TapHandler | null): void {
    onTapHandler = handler;
  },

  subscribe(listener: InboxListener): () => void {
    inboxListeners.add(listener);
    loadInbox().then(async inbox => {
      listener(inbox, await getUnreadCount());
    });
    return () => {
      inboxListeners.delete(listener);
    };
  },
};
