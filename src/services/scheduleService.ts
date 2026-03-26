import AsyncStorage from '@react-native-async-storage/async-storage';
import { AE, AD } from '../../crypto';
const BASE_URL = 'https://iu.cmcu.edu.vn/sinhvienapi/api/SV_Custom';

// Cache configuration
const CACHE_DURATION = 5 * 60 * 1000; // 5 phút
const CACHE_KEYS = {
  SCHEDULE: 'cached_schedule_',
  STUDENT_INFO: 'cached_student_info',
};

// Utility function để đợi token sẵn sàng
const waitForToken = async (maxAttempts = 10, delay = 500): Promise<string> => {
  for (let i = 0; i < maxAttempts; i++) {
    const token = await AsyncStorage.getItem('access_token');
    if (token) {
      return token;
    }
    await new Promise(resolve => setTimeout(resolve, delay));
  }
  throw new Error('Token không sẵn sàng sau khi đợi');
};

// Types cho API responses
export interface ScheduleItem {
  ID: string;
  IDLICHHOC: string;
  IDSINHVIEN: string;
  DANGKY_LOPHOCPHAN_ID: string;
  TENHOCPHAN: string;
  IDLOPHOCPHAN: string;
  DANGKY_LOPHOCPHAN_TEN: string;
  TENLOPHOCPHAN: string;
  BAIHOC: string | null;
  GIANGVIEN_ID: string;
  NGAYBATDAU: string | null;
  NGAYKETTHUC: string | null;
  THU: string;
  THUHOC: string;
  SOTIET: number;
  TIETBATDAU: number;
  TIETKETTHUC: number;
  IDPHONGHOC: string;
  PHONGHOC_TEN: string;
  TENPHONGHOC: string;
  PHONGHOC_MA: string;
  THUOCTINHLOP_ID: string;
  THUOCTINH_TEN: string;
  GIANGVIEN: string;
  BUOIHOC: string;
  NGAYHOC: string;
  GIOBATDAU: number;
  PHUTBATDAU: number;
  GIOKETTHUC: number;
  PHUTKETTHUC: number;
  PHANLOAI: 'LICHHOC' | 'LICHTHI';
  CATHI: string | null;
  THONGTINCHUYENCAN: string | null;
}

export interface StudentInfo {
  QLSV_TRANGTHAINGUOIHOC_ID: string;
  QLSV_TRANGTHAINGUOIHOC_TEN: string;
  QLSV_TRANGTHAINGUOIHOC_MA: string;
  TTLL_KHICANBAOTINCHOAI_ODAU: string;
  QLSV_NGUOIHOC_ID: string;
  QLSV_NGUOIHOC_NGAYSINH: string;
  QLSV_NGUOIHOC_MASO: string;
  QLSV_NGUOIHOC_HODEM: string;
  QLSV_NGUOIHOC_TEN: string;
  QLSV_NGUOIHOC_GIOITINH: string;
  DAOTAO_TOCHUCCHUONGTRINH_ID: string;
  DAOTAO_CHUONGTRINH_TEN: string;
  DAOTAO_CHUONGTRINH_MA: string;
  DAOTAO_LOPQUANLY_ID: string;
  DAOTAO_LOPQUANLY_TEN: string;
  DAOTAO_LOPQUANLY_MA: string;
  DAOTAO_KHOADAOTAO_ID: string;
  DAOTAO_KHOADAOTAO_TEN: string;
  DAOTAO_KHOADAOTAO_MA: string;
  DAOTAO_KHOAQUANLY_ID: string;
  DAOTAO_KHOAQUANLY_TEN: string;
  DAOTAO_KHOAQUANLY_MA: string;
  DAOTAO_HEDAOTAO_ID: string;
  DAOTAO_HEDAOTAO_TEN: string;
  DAOTAO_HEDAOTAO_MA: string;
}

interface ApiResponse<T> {
  Data: T[];
  Message: string;
  Success: boolean;
  Pager: any;
  Id: any;
}

interface CachedData<T> {
  data: T;
  timestamp: number;
}

class ScheduleService {
  private scheduleCache = new Map<string, CachedData<ScheduleItem[]>>();
  private studentInfoCache: CachedData<StudentInfo> | null = null;
  private async getAuthToken(): Promise<string> {
    try {
      let token = await AsyncStorage.getItem('access_token');
      
      if (!token) {
        token = await waitForToken();
      }
      
      return token;
    } catch (error) {
      console.error('[ScheduleService] ❌ Error getting token:', error);
      throw new Error('Không tìm thấy token xác thực');
    }
  }

  private async getUserId(): Promise<string> {
    try {
      // Lấy user ID từ userData trong AsyncStorage
      const userDataStr = await AsyncStorage.getItem('userData');
      if (userDataStr) {
        const userData = JSON.parse(userDataStr);
        if (userData.sub) {
          // Token có format: "ID;hash;timestamp" hoặc chỉ là ID
          const userId = userData.sub.split(';')[0];
          // console.log('[ScheduleService] 📍 Using user ID from userData:', userId);
          return userId;
        }
      }
      
      // Fallback: parse từ token
      const token = await AsyncStorage.getItem('access_token');
      if (token && token.includes('.')) {
        // JWT token
        const parts = token.split('.');
        if (parts.length >= 2) {
          const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
          const pad = base64.length % 4;
          const padded = base64 + (pad ? '='.repeat(4 - pad) : '');
          const payloadJson = decodeURIComponent(
            atob(padded)
              .split('')
              .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
              .join('')
          );
          const payload = JSON.parse(payloadJson);
          const uniqueName = payload.unique_name || payload.sub || payload.userId;
          if (uniqueName) {
            const userId = String(uniqueName).split(';')[0];
            // console.log('[ScheduleService] 📍 Using user ID from token:', userId);
            return userId;
          }
        }
      }
      
      throw new Error('Không tìm thấy user ID');
    } catch (error) {
      console.error('[ScheduleService] ❌ Error getting user ID:', error);
      throw new Error('Không tìm thấy user ID. Vui lòng đăng nhập lại.');
    }
  }

  /**
   * Kiểm tra cache có hợp lệ không
   */
  private isCacheValid<T>(cachedData: CachedData<T> | null): boolean {
    if (!cachedData) return false;
    return Date.now() - cachedData.timestamp < CACHE_DURATION;
  }

  /**
   * Lưu cache vào AsyncStorage
   */
  private async saveCacheToStorage<T>(key: string, data: T): Promise<void> {
    try {
      const cachedData: CachedData<T> = {
        data,
        timestamp: Date.now(),
      };
      await AsyncStorage.setItem(key, JSON.stringify(cachedData));
    } catch (error) {
      console.warn('[ScheduleService] ⚠️ Failed to save cache:', error);
    }
  }

  /**
   * Lấy cache từ AsyncStorage
   */
  private async getCacheFromStorage<T>(key: string): Promise<CachedData<T> | null> {
    try {
      const cached = await AsyncStorage.getItem(key);
      if (!cached) return null;
      
      const cachedData: CachedData<T> = JSON.parse(cached);
      return this.isCacheValid(cachedData) ? cachedData : null;
    } catch (error) {
      console.warn('[ScheduleService] ⚠️ Failed to get cache:', error);
      return null;
    }
  }

  /**
   * Tạo cache key cho lịch học
   */
  private getScheduleCacheKey(startDate: string, endDate: string): string {
    return `${CACHE_KEYS.SCHEDULE}${startDate}_${endDate}`;
  }

  async getPersonalSchedule(startDate: string, endDate: string): Promise<ScheduleItem[]> {
    try {
      const cacheKey = this.getScheduleCacheKey(startDate, endDate);
      
      // Kiểm tra memory cache trước
      const memoryCache = this.scheduleCache.get(cacheKey);
      if (memoryCache && this.isCacheValid(memoryCache)) {
        // console.log('[ScheduleService] ✅ Using memory cache for schedule');
        return memoryCache.data;
      }

      // Kiểm tra storage cache
      const storageCache = await this.getCacheFromStorage<ScheduleItem[]>(cacheKey);
      if (storageCache) {
        // console.log('[ScheduleService] ✅ Using storage cache for schedule');
        // Lưu vào memory cache để lần sau nhanh hơn
        this.scheduleCache.set(cacheKey, storageCache);
        return storageCache.data;
      }

      // Không có cache, gọi API
      // console.log('[ScheduleService] 🌐 Fetching schedule from API');
      const token = await this.getAuthToken();
      const userId = await this.getUserId();
      
      const requestBody = {
        strChucNang_Id: "B46109CD333D4E3DAC50D43E8607ED46",
        strNgayBatDau: startDate, // Format: "23/03/2026"
        strNgayKetThuc: endDate,  // Format: "29/03/2026"
        strNguoiThucHien_Id: userId,
        strQLSV_NguoiHoc_Id: userId,
        iM: 'ChaoLong'
      };
      
      const response = await fetch(`https://iu.cmcu.edu.vn/sinhvienapi/api/SV_ThongTin_MH/DSA4BRINKCIpAiAPKSAv`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          A: AE(JSON.stringify(requestBody), 'DSA4BRINKCIpAiAPKSAv')
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const temp = await response.json();
      
      if (!temp.Success) {
        throw new Error(temp.Message || 'Lỗi khi lấy lịch học');
      }

      // Giải mã dữ liệu từ response
      const dataLichHoc = AD(temp.Data.B, requestBody.iM);
      
      if (!dataLichHoc) { 
        throw new Error('Không thể giải mã dữ liệu lịch học');
      }

      // console.log('[ScheduleService] 📦 Decrypted data:', dataLichHoc);
      const scheduleData = JSON.parse(dataLichHoc);
      // console.log('[ScheduleService] 📅 Parsed schedule data:', scheduleData);
      // Lưu vào cache
      const cachedData: CachedData<ScheduleItem[]> = {
        data: scheduleData,
        timestamp: Date.now(),
      };
      this.scheduleCache.set(cacheKey, cachedData);
      await this.saveCacheToStorage(cacheKey, scheduleData);

      return scheduleData;
    } catch (error) {
      console.error('[ScheduleService] ❌ Error fetching personal schedule:', error);
      throw error;
    }
  }

  /**
   * Lấy thông tin chương trình học của sinh viên
   */
  async getStudentInfo(): Promise<StudentInfo | null> {
    try {
      // Kiểm tra memory cache
      if (this.studentInfoCache && this.isCacheValid(this.studentInfoCache)) {
        // console.log('[ScheduleService] ✅ Using memory cache for student info');
        return this.studentInfoCache.data;
      }

      // Kiểm tra storage cache
      const storageCache = await this.getCacheFromStorage<StudentInfo>(CACHE_KEYS.STUDENT_INFO);
      if (storageCache) {
        // console.log('[ScheduleService] ✅ Using storage cache for student info');
        this.studentInfoCache = storageCache;
        return storageCache.data;
      }

      // Không có cache, gọi API
      // console.log('[ScheduleService] 🌐 Fetching student info from API');
      const token = await this.getAuthToken();
      
      const response = await fetch(`${BASE_URL}/LayThongTinChuongTrinhHoc`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result: ApiResponse<StudentInfo> = await response.json();
      
      if (!result.Success) {
        throw new Error(result.Message || 'Lỗi khi lấy thông tin sinh viên');
      }

      const studentData = result.Data?.[0] || null;
      
      if (studentData) {
        // Lưu vào cache
        this.studentInfoCache = {
          data: studentData,
          timestamp: Date.now(),
        };
        await this.saveCacheToStorage(CACHE_KEYS.STUDENT_INFO, studentData);
      }

      return studentData;
    } catch (error) {
      console.error('[ScheduleService] ❌ Error fetching student info:', error);
      throw error;
    }
  }

  /**
   * Lấy lịch học theo tuần (7 ngày từ ngày bắt đầu)
   */
  async getWeeklySchedule(startDate: Date): Promise<ScheduleItem[]> {
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6);
    
    const formatDate = (date: Date): string => {
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    };

    return this.getPersonalSchedule(
      formatDate(startDate),
      formatDate(endDate)
    );
  }

  /**
   * Lấy lịch học hôm nay
   */
  async getTodaySchedule(): Promise<ScheduleItem[]> {
    const today = new Date();
    return this.getWeeklySchedule(today);
  }

  /**
   * Phân loại lịch theo loại (học/thi)
   */
  separateScheduleByType(schedules: ScheduleItem[]): {
    classes: ScheduleItem[];
    exams: ScheduleItem[];
  } {
    return {
      classes: schedules.filter(item => item.PHANLOAI === 'LICHHOC'),
      exams: schedules.filter(item => item.PHANLOAI === 'LICHTHI'),
    };
  }

  /**
   * Nhóm lịch theo ngày
   */
  groupScheduleByDate(schedules: ScheduleItem[]): Record<string, ScheduleItem[]> {
    return schedules.reduce((groups, schedule) => {
      const date = schedule.NGAYHOC;
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(schedule);
      return groups;
    }, {} as Record<string, ScheduleItem[]>);
  }

  /**
   * Format thời gian hiển thị
   */
  formatTime(hour: number, minute: number): string {
    const h = Math.floor(hour).toString().padStart(2, '0');
    const m = Math.floor(minute).toString().padStart(2, '0');
    return `${h}:${m}`;
  }

  /**
   * Format thời gian buổi học
   */
  formatScheduleTime(schedule: ScheduleItem): string {
    const startTime = this.formatTime(schedule.GIOBATDAU, schedule.PHUTBATDAU);
    const endTime = this.formatTime(schedule.GIOKETTHUC, schedule.PHUTKETTHUC);
    return `${startTime} - ${endTime}`;
  }

  /**
   * Xóa cache (dùng khi cần refresh dữ liệu hoặc khi logout)
   */
  async clearCache(): Promise<void> {
    try {
      // console.log('[ScheduleService] 🗑️ Bắt đầu xóa cache...');
      
      // Xóa memory cache
      this.scheduleCache.clear();
      this.studentInfoCache = null;

      // Xóa storage cache
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => 
        key.startsWith(CACHE_KEYS.SCHEDULE) || 
        key === CACHE_KEYS.STUDENT_INFO
      );
      
      // console.log('[ScheduleService] 📝 Số cache keys tìm thấy:', cacheKeys.length);
      
      if (cacheKeys.length > 0) {
        await AsyncStorage.multiRemove(cacheKeys);
        // console.log('[ScheduleService] ✅ Đã xóa cache keys:', cacheKeys);
      }
      
      // console.log('[ScheduleService] ✅ Cache cleared hoàn tất');
    } catch (error) {
      // console.warn('[ScheduleService] ⚠️ Failed to clear cache:', error);
    }
  }

  /**
   * Preload dữ liệu cho tuần hiện tại và tuần sau
   */
  async preloadScheduleData(): Promise<void> {
    try {
      const today = new Date();
      const currentWeekStart = new Date(today);
      const dayOfWeek = today.getDay();
      const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      currentWeekStart.setDate(today.getDate() + mondayOffset);

      const nextWeekStart = new Date(currentWeekStart);
      nextWeekStart.setDate(currentWeekStart.getDate() + 7);

      // Preload tuần hiện tại và tuần sau
      const promises = [
        this.getWeeklySchedule(currentWeekStart),
        this.getWeeklySchedule(nextWeekStart),
        this.getStudentInfo(),
      ];

      await Promise.allSettled(promises);
      // console.log('[ScheduleService] 🚀 Preload completed');
    } catch (error) {
      console.warn('[ScheduleService] ⚠️ Preload failed:', error);
    }
  }
}

export const scheduleService = new ScheduleService();