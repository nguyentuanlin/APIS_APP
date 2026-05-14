import * as Notifications from 'expo-notifications';
import { Platform, AppState, AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AE } from '../../../crypto';
import { API_HOSTS } from '../../config/apiHosts';
import type { User } from './authService';

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

let foregroundSub: Subscription | null = null;
let responseSub: Subscription | null = null;
let appStateSub: { remove: () => void } | null = null;
let initializedForUserId: string | null = null;

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
  const id = req.identifier || data.messageId || `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  return {
    id: String(id),
    title: content.title || data.title || 'Thông báo',
    body: content.body || data.body || '',
    receivedAt: Date.now(),
    read: false,
    data,
  };
}

async function pushIncoming(item: FcmNotiItem | null): Promise<void> {
  if (!item) return;
  const inbox = await loadInbox();
  if (inbox.some(x => x.id === item.id)) return;
  inbox.unshift(item);
  if (inbox.length > INBOX_MAX) inbox.length = INBOX_MAX;
  await saveInbox(inbox);
  await setUnreadCount((await getUnreadCount()) + 1);
  await notifyListeners();
}

function attachListenersOnce(): void {
  if (!foregroundSub) {
    foregroundSub = Notifications.addNotificationReceivedListener(notif => {
      pushIncoming(extractFromNotification(notif)).catch(() => {});
    });
  }
  if (!responseSub) {
    responseSub = Notifications.addNotificationResponseReceivedListener(resp => {
      pushIncoming(extractFromNotification(resp?.notification)).catch(() => {});
    });
  }
  if (!appStateSub) {
    const handler = (state: AppStateStatus) => {
      if (state === 'active' && initializedForUserId) {
        Notifications.setBadgeCountAsync(0).catch(() => {});
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
      return;
    }

    await saveTokenToServer(userId, token);
    try {
      await AsyncStorage.setItem(LAST_TOKEN_KEY, token);
    } catch {}

    initializedForUserId = userId;
  },

  async cleanupOnLogout(user: User | null): Promise<void> {
    const userId = extractUserId(user);
    const token = (await AsyncStorage.getItem(CURRENT_TOKEN_KEY)) || '';
    if (userId && token) {
      await deleteTokenFromServer(userId);
    }
    removeListeners();
    initializedForUserId = null;
    try {
      await AsyncStorage.multiRemove([LAST_TOKEN_KEY, CURRENT_TOKEN_KEY, INBOX_KEY, UNREAD_KEY]);
    } catch {}
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

  async markAllRead(): Promise<void> {
    const inbox = await loadInbox();
    const next = inbox.map(it => ({ ...it, read: true }));
    await saveInbox(next);
    await setUnreadCount(0);
    Notifications.setBadgeCountAsync(0).catch(() => {});
    await notifyListeners();
  },

  async clearInbox(): Promise<void> {
    await saveInbox([]);
    await setUnreadCount(0);
    Notifications.setBadgeCountAsync(0).catch(() => {});
    await notifyListeners();
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
