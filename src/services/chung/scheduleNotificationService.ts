import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { scheduleService, ScheduleItem } from '../sinhVien/scheduleService';

const ENABLED_KEY = 'SCHEDULE_NOTI_ENABLED';
const LEAD_MIN_KEY = 'SCHEDULE_NOTI_LEAD_MIN';
const SCHEDULED_IDS_KEY = 'SCHEDULE_NOTI_IDS';
const LAST_REFRESH_KEY = 'SCHEDULE_NOTI_LAST_REFRESH';

const DEFAULT_LEAD_MIN = 15;
const REFRESH_THROTTLE_MS = 5 * 60 * 1000; // 5 phút
const MAX_SCHEDULED = 50; // iOS limit 64, để dư
const ANDROID_CHANNEL_ID = 'class-reminder';

// Parse NGAYHOC ("dd/MM/yyyy" hoặc ISO) + giờ/phút → Date object
function buildClassDate(item: ScheduleItem): Date | null {
  const raw = item.NGAYHOC;
  if (!raw) return null;

  let y = 0, m = 0, d = 0;
  const slash = /^(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(raw);
  if (slash) {
    d = +slash[1]; m = +slash[2]; y = +slash[3];
  } else {
    const iso = Date.parse(raw);
    if (isNaN(iso)) return null;
    const dt = new Date(iso);
    y = dt.getFullYear(); m = dt.getMonth() + 1; d = dt.getDate();
  }

  const hh = Math.floor(item.GIOBATDAU || 0);
  const mi = Math.floor(item.PHUTBATDAU || 0);
  return new Date(y, m - 1, d, hh, mi, 0, 0);
}

function buildContent(item: ScheduleItem, leadMin: number) {
  const isExam = item.PHANLOAI === 'LICHTHI';
  const startTime = `${String(item.GIOBATDAU).padStart(2, '0')}:${String(item.PHUTBATDAU).padStart(2, '0')}`;
  const room = item.PHONGHOC_TEN || item.TENPHONGHOC || item.PHONGHOC_MA || '';
  const title = isExam
    ? `📝 Sắp đến giờ thi (${leadMin} phút nữa)`
    : `📚 Sắp đến giờ học (${leadMin} phút nữa)`;
  const parts = [item.TENHOCPHAN, `⏰ ${startTime}`];
  if (room) parts.push(`🚪 ${room}`);
  return { title, body: parts.join(' • ') };
}

async function ensureChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  try {
    await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
      name: 'Nhắc lịch học/thi',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#3B82F6',
      sound: 'default',
    });
  } catch (e) {
    console.warn('[ScheduleNoti] setChannel failed:', e);
  }
}

async function getScheduledIds(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(SCHEDULED_IDS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

async function saveScheduledIds(ids: string[]): Promise<void> {
  try {
    await AsyncStorage.setItem(SCHEDULED_IDS_KEY, JSON.stringify(ids));
  } catch {}
}

async function cancelAllTracked(): Promise<void> {
  const ids = await getScheduledIds();
  await Promise.all(
    ids.map(id => Notifications.cancelScheduledNotificationAsync(id).catch(() => {})),
  );
  await saveScheduledIds([]);
}

export const scheduleNotificationService = {
  async isEnabled(): Promise<boolean> {
    try {
      const v = await AsyncStorage.getItem(ENABLED_KEY);
      return v === '1';
    } catch {
      return false;
    }
  },

  async getLeadMinutes(): Promise<number> {
    try {
      const v = await AsyncStorage.getItem(LEAD_MIN_KEY);
      const n = v ? parseInt(v, 10) : DEFAULT_LEAD_MIN;
      return isNaN(n) ? DEFAULT_LEAD_MIN : Math.max(1, Math.min(180, n));
    } catch {
      return DEFAULT_LEAD_MIN;
    }
  },

  async setLeadMinutes(min: number): Promise<void> {
    const clamped = Math.max(1, Math.min(180, Math.floor(min)));
    await AsyncStorage.setItem(LEAD_MIN_KEY, String(clamped));
    if (await this.isEnabled()) {
      await this.refresh(true);
    }
  },

  async enable(): Promise<void> {
    await AsyncStorage.setItem(ENABLED_KEY, '1');
    await ensureChannel();
    await this.refresh(true);
  },

  async disable(): Promise<void> {
    await AsyncStorage.setItem(ENABLED_KEY, '0');
    await cancelAllTracked();
  },

  // Đọc lịch 7 ngày tới → schedule local noti cho mỗi buổi (đã trừ leadMin)
  async refresh(force = false): Promise<{ scheduled: number; skipped: number }> {
    const enabled = await this.isEnabled();
    if (!enabled) return { scheduled: 0, skipped: 0 };

    if (!force) {
      try {
        const last = parseInt((await AsyncStorage.getItem(LAST_REFRESH_KEY)) || '0', 10);
        if (Date.now() - last < REFRESH_THROTTLE_MS) {
          return { scheduled: 0, skipped: 0 };
        }
      } catch {}
    }

    const settings = await Notifications.getPermissionsAsync();
    if (!settings.granted) {
      console.warn('[ScheduleNoti] permission not granted, skip');
      return { scheduled: 0, skipped: 0 };
    }

    let schedules: ScheduleItem[] = [];
    try {
      schedules = await scheduleService.getWeeklySchedule(new Date());
    } catch (e) {
      console.warn('[ScheduleNoti] fetch schedule failed:', e);
      return { scheduled: 0, skipped: 0 };
    }

    await cancelAllTracked();
    await ensureChannel();

    const leadMin = await this.getLeadMinutes();
    const leadMs = leadMin * 60 * 1000;
    const now = Date.now();

    // Tính trigger time cho từng buổi, lọc buổi quá khứ, sort tăng dần
    const candidates = schedules
      .map(item => {
        const classDate = buildClassDate(item);
        if (!classDate) return null;
        const triggerAt = classDate.getTime() - leadMs;
        if (triggerAt <= now + 1000) return null;
        return { item, triggerAt };
      })
      .filter((x): x is { item: ScheduleItem; triggerAt: number } => !!x)
      .sort((a, b) => a.triggerAt - b.triggerAt)
      .slice(0, MAX_SCHEDULED);

    const newIds: string[] = [];
    let scheduled = 0;
    for (const { item, triggerAt } of candidates) {
      try {
        const { title, body } = buildContent(item, leadMin);
        const id = await Notifications.scheduleNotificationAsync({
          content: {
            title,
            body,
            data: {
              kind: 'class-reminder',
              scheduleId: item.ID,
              hocPhanTen: item.TENHOCPHAN,
              phanLoai: item.PHANLOAI,
              ngayHoc: item.NGAYHOC,
            },
            sound: 'default',
            ...(Platform.OS === 'android' ? { channelId: ANDROID_CHANNEL_ID } : {}),
          },
          trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(triggerAt) },
        });
        newIds.push(id);
        scheduled++;
      } catch (e) {
        console.warn('[ScheduleNoti] scheduleNotificationAsync failed:', e);
      }
    }

    await saveScheduledIds(newIds);
    try {
      await AsyncStorage.setItem(LAST_REFRESH_KEY, String(Date.now()));
    } catch {}

    console.log(`[ScheduleNoti] scheduled ${scheduled}/${candidates.length} (lead=${leadMin}m)`);
    return { scheduled, skipped: schedules.length - scheduled };
  },

  // Gọi khi logout — xóa hết và tắt
  async cleanup(): Promise<void> {
    await cancelAllTracked();
    try {
      await AsyncStorage.multiRemove([ENABLED_KEY, LEAD_MIN_KEY, SCHEDULED_IDS_KEY, LAST_REFRESH_KEY]);
    } catch {}
  },

  async listScheduled(): Promise<Notifications.NotificationRequest[]> {
    try {
      return await Notifications.getAllScheduledNotificationsAsync();
    } catch {
      return [];
    }
  },
};
