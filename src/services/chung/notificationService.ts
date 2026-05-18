import AsyncStorage from '@react-native-async-storage/async-storage';
import { AE, AD } from '../../../crypto';
import { API_HOSTS } from '../../config/apiHosts';

// Endpoint keys khớp backend CMS_ThongBao_MHController
const LIST_KEY = 'DSA4BRIeDy41KCc4FDIkMzIP';            // pkg_thongbao.LayDS_NotifyUsers
const UPDATE_STATUS_KEY = 'FDElIDUkHhI1IDU0Mg8uNSgnOBQyJDMP'; // pkg_thongbao.Update_StatusNotifyUser
const DELETE_KEY = 'GS4gHg8uNSgnOBQyJDMy';              // pkg_thongbao.Xoa_NotifyUsers

const LIST_URL = `${API_HOSTS.cms}/CMS_ThongBao_MH/${LIST_KEY}`;
const UPDATE_STATUS_URL = `${API_HOSTS.cms}/CMS_ThongBao_MH/${UPDATE_STATUS_KEY}`;
const DELETE_URL = `${API_HOSTS.cms}/CMS_ThongBao_MH/${DELETE_KEY}`;

const DEFAULT_IM = 'AzzSystem';

export interface ServerNotiItem {
  ID: string;
  USER_ID?: string;
  TITLE?: string;
  NBODY?: string;
  ACTION?: string;
  ISTATUS?: number | string;
  NDATE?: string | number;
  NGUOITAOID?: string;
}

async function getAuthToken(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem('access_token');
  } catch {
    return null;
  }
}

async function callEncryptedApi(
  url: string,
  key: string,
  body: Record<string, any>,
): Promise<{ Success?: boolean; Message?: string; Data?: any }> {
  const authToken = await getAuthToken();
  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      },
      body: JSON.stringify({ A: AE(JSON.stringify(body), key) }),
    });
  } catch (e: any) {
    console.warn('[NotiService] fetch error:', e?.message || e);
    return { Success: false, Message: e?.message || 'Network error' };
  }
  const text = await res.text();
  let parsed: any;
  try {
    parsed = JSON.parse(text);
  } catch {
    parsed = { Success: false, Message: text };
  }
  if (!res.ok) {
    console.warn('[NotiService] HTTP', res.status, url, '→', text.slice(0, 200));
  }
  return parsed;
}

function decryptResponse<T>(resp: { Data?: any }, iM: string): T | null {
  const enc = resp?.Data?.B;
  if (!enc) return null;
  try {
    const raw = AD(enc, iM);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch (e: any) {
    console.warn('[NotiService] decrypt error:', e?.message || e);
    return null;
  }
}

function parseNDate(d: any): number {
  if (d === null || d === undefined || d === '') return Date.now();
  if (typeof d === 'number') return d > 1e12 ? d : d * 1000;
  if (typeof d === 'string') {
    const iso = Date.parse(d);
    if (!isNaN(iso)) return iso;
    // dd/MM/yyyy [HH:mm[:ss]]
    const m = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})(?:[\sT](\d{1,2}):(\d{2})(?::(\d{2}))?)?/.exec(d);
    if (m) {
      const [, dd, mm, yyyy, hh = '0', mi = '0', ss = '0'] = m;
      return new Date(+yyyy, +mm - 1, +dd, +hh, +mi, +ss).getTime();
    }
  }
  return Date.now();
}

export const notificationService = {
  // Pull danh sách thông báo của user từ server
  async listFromServer(userId: string): Promise<ServerNotiItem[]> {
    if (!userId) return [];
    const body = {
      func: 'pkg_thongbao.LayDS_NotifyUsers',
      iM: DEFAULT_IM,
      strUSER_ID: userId,
    };
    const resp = await callEncryptedApi(LIST_URL, LIST_KEY, body);
    if (!resp?.Success) {
      console.warn('[NotiService] list fail:', resp?.Message);
      return [];
    }
    const data = decryptResponse<ServerNotiItem[]>(resp, DEFAULT_IM);
    return Array.isArray(data) ? data : [];
  },

  // Đánh dấu 1 thông báo đã đọc (dISTATUS = 1)
  async markReadOnServer(id: string): Promise<boolean> {
    if (!id) return false;
    const body = {
      func: 'pkg_thongbao.Update_StatusNotifyUser',
      iM: DEFAULT_IM,
      strID: id,
      dISTATUS: 1,
    };
    const resp = await callEncryptedApi(UPDATE_STATUS_URL, UPDATE_STATUS_KEY, body);
    if (!resp?.Success) console.warn('[NotiService] markRead fail:', id, resp?.Message);
    return !!resp?.Success;
  },

  // Xóa 1 thông báo trên server
  async deleteOnServer(id: string, userId: string): Promise<boolean> {
    if (!id) return false;
    const body = {
      func: 'pkg_thongbao.Xoa_NotifyUsers',
      iM: DEFAULT_IM,
      strId: id,
      strNguoiTaoId: userId,
    };
    const resp = await callEncryptedApi(DELETE_URL, DELETE_KEY, body);
    if (!resp?.Success) console.warn('[NotiService] delete fail:', id, resp?.Message);
    return !!resp?.Success;
  },

  parseNDate,
};
