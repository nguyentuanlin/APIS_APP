import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL = 'https://iu.cmcu.edu.vn/sinhvienapi/api/SV_ThongTin';

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

// Types cho exam schedule
export interface ExamScheduleItem {
  IDLICHHOC: string | null;
  NGAYTAO: string | null;
  NGUOITAO_ID: string | null;
  NGAYCAPNHATCUOI: string | null;
  NGUOICAPNHATCUOI_ID: string | null;
  QLSV_NGUOIHOC_ID: string | null;
  DANGKY_LOPHOCPHAN_ID: string | null;
  TENHOCPHAN: string;
  MAHOCPHAN: string;
  IDLOPHOCPHAN: string | null;
  DANGKY_LOPHOCPHAN_TEN: string;
  TENLOPHOCPHAN: string;
  BAIHOC: string | null;
  GIANGVIEN_ID: string | null;
  NGAYBATDAU: string | null;
  NGAYKETTHUC: string | null;
  THU: string;
  THUHOC: string;
  SOTIET: number | null;
  TIETBATDAU: number | null;
  TIETKETTHUC: number | null;
  PHONGHOC_ID: string | null;
  PHONGHOC_TEN: string | null;
  TENPHONGHOC: string | null;
  PHONGHOC_MA: string | null;
  THUOCTINHLOP_ID: string | null;
  THUOCTINH_TEN: string | null;
  GIANGVIEN: string | null;
  BUOIHOC: string | null;
  NGAYHOC: string;
  GIOBATDAU: number;
  PHUTBATDAU: number;
  GIOKETTHUC: number;
  PHUTKETTHUC: number;
  PHANLOAI: string;
  CATHI: string;
  GHICHU: string | null;
  // Thêm cho lịch thi cá nhân
  SOBAODANH?: string;
  LANTHI?: number;
  QLSV_NGUOIHOC_HODEM?: string;
  QLSV_NGUOIHOC_TEN?: string;
  QLSV_NGUOIHOC_MASO?: string;
}

export interface ExamScheduleResponse {
  rsKeHoachThiChung: ExamScheduleItem[];
  rsLichThiCaNhan: ExamScheduleItem[];
}

export interface SemesterInfo {
  ID: string;
  THOIGIAN: string;
}

interface ApiResponse<T> {
  Data: T;
  Message: string;
  Success: boolean;
  Pager: any;
  Id: any;
}

class ExamService {
  private examCache: Map<string, { data: ExamScheduleResponse; timestamp: number }> = new Map();
  private semesterCache: { data: SemesterInfo[]; timestamp: number } | null = null;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 phút

  /**
   * Xóa cache lịch thi (gọi khi logout hoặc cần refresh)
   */
  clearCache(): void {
    this.examCache.clear();
    this.semesterCache = null;
  }

  private async getAuthToken(): Promise<string> {
    try {
      let token = await AsyncStorage.getItem('access_token');
      
      if (!token) {
        token = await waitForToken();
      }
      
      return token;
    } catch (error) {
      console.error('[ExamService] ❌ Error getting token:', error);
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
            return userId;
          }
        }
      }
      
      throw new Error('Không tìm thấy user ID');
    } catch (error) {
      console.error('[ExamService] ❌ Error getting user ID:', error);
      throw new Error('Không tìm thấy user ID. Vui lòng đăng nhập lại.');
    }
  }

  /**
   * Lấy danh sách học kỳ có lịch thi
   */
  async getSemesters(): Promise<SemesterInfo[]> {
    try {
      const token = await this.getAuthToken();
      const userId = await this.getUserId();
      
      const url = `${BASE_URL}/LayDSThoiGianLichThi?strNguoiThucHien_Id="${userId}"`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result: ApiResponse<SemesterInfo[]> = await response.json();
      
      if (!result.Success) {
        throw new Error(result.Message || 'Lỗi khi lấy danh sách học kỳ');
      }

      return result.Data || [];
    } catch (error) {
      console.error('[ExamService] ❌ Error fetching semesters:', error);
      throw error;
    }
  }

  /**
   * Lấy lịch thi theo học kỳ
   */
  async getExamSchedule(semesterId: string): Promise<ExamScheduleResponse> {
    try {
      const token = await this.getAuthToken();
      const userId = await this.getUserId();
      
      const url = `${BASE_URL}/LayDSLichThi_KeHoachThi?strQLSV_NguoiHoc_Id=${userId}&strDaoTao_ThoiGianDaoTao_Id=${semesterId}&strDaoTao_HocPhan_Id=`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result: ApiResponse<ExamScheduleResponse> = await response.json();
      
      if (!result.Success) {
        throw new Error(result.Message || 'Lỗi khi lấy lịch thi');
      }

      return result.Data || { rsKeHoachThiChung: [], rsLichThiCaNhan: [] };
    } catch (error) {
      console.error('[ExamService] ❌ Error fetching exam schedule:', error);
      throw error;
    }
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
   * Format thời gian buổi thi
   */
  formatExamTime(exam: ExamScheduleItem): string {
    const startTime = this.formatTime(exam.GIOBATDAU, exam.PHUTBATDAU);
    const endTime = this.formatTime(exam.GIOKETTHUC, exam.PHUTKETTHUC);
    return `${startTime} - ${endTime}`;
  }

  /**
   * Format ngày thi
   */
  formatExamDate(dateString: string): string {
    // Input: "09/04/2026"
    // Output: "09/04/2026"
    return dateString;
  }

  /**
   * Kiểm tra xem thi đã qua chưa
   */
  isExamPassed(exam: ExamScheduleItem): boolean {
    const examDate = this.parseExamDate(exam.NGAYHOC);
    const now = new Date();
    return examDate < now;
  }

  /**
   * Kiểm tra xem thi sắp diễn ra (trong 7 ngày tới)
   */
  isExamUpcoming(exam: ExamScheduleItem): boolean {
    const examDate = this.parseExamDate(exam.NGAYHOC);
    const now = new Date();
    const sevenDaysLater = new Date();
    sevenDaysLater.setDate(now.getDate() + 7);
    
    return examDate >= now && examDate <= sevenDaysLater;
  }

  /**
   * Parse ngày thi từ string
   */
  private parseExamDate(dateString: string): Date {
    // Input: "09/04/2026"
    const [day, month, year] = dateString.split('/').map(Number);
    return new Date(year, month - 1, day);
  }

  /**
   * Sắp xếp lịch thi theo ngày
   */
  sortExamsByDate(exams: ExamScheduleItem[]): ExamScheduleItem[] {
    return exams.sort((a, b) => {
      const dateA = this.parseExamDate(a.NGAYHOC);
      const dateB = this.parseExamDate(b.NGAYHOC);
      
      if (dateA.getTime() !== dateB.getTime()) {
        return dateA.getTime() - dateB.getTime();
      }
      
      // Nếu cùng ngày, sắp xếp theo giờ
      const timeA = a.GIOBATDAU * 60 + a.PHUTBATDAU;
      const timeB = b.GIOBATDAU * 60 + b.PHUTBATDAU;
      return timeA - timeB;
    });
  }

  /**
   * Nhóm lịch thi theo ngày
   */
  groupExamsByDate(exams: ExamScheduleItem[]): Record<string, ExamScheduleItem[]> {
    return exams.reduce((groups, exam) => {
      const date = exam.NGAYHOC;
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(exam);
      return groups;
    }, {} as Record<string, ExamScheduleItem[]>);
  }

  /**
   * Lấy học kỳ hiện tại (học kỳ gần nhất)
   */
  getCurrentSemester(semesters: SemesterInfo[]): SemesterInfo | null {
    if (semesters.length === 0) return null;
    
    // Sắp xếp theo thời gian giảm dần và lấy cái đầu tiên
    const sorted = semesters.sort((a, b) => {
      // Parse THOIGIAN format: "2025_2026_2"
      const [yearA1, yearA2, semA] = a.THOIGIAN.split('_').map(Number);
      const [yearB1, yearB2, semB] = b.THOIGIAN.split('_').map(Number);
      
      if (yearA1 !== yearB1) return yearB1 - yearA1;
      if (yearA2 !== yearB2) return yearB2 - yearA2;
      return semB - semA;
    });
    
    return sorted[0];
  }

  /**
   * Format tên học kỳ hiển thị
   */
  formatSemesterName(semester: SemesterInfo): string {
    // Input: "2025_2026_2"
    // Output: "HK2 2025-2026"
    const [year1, year2, sem] = semester.THOIGIAN.split('_');
    return `HK${sem} ${year1}-${year2}`;
  }
}

export const examService = new ExamService();