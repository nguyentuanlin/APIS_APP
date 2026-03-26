import AsyncStorage from '@react-native-async-storage/async-storage';
import { AE, AD } from '../../crypto';

const BASE_URL = 'https://iu.cmcu.edu.vn/chuyencanapi/api/CC_ThongTin';
const CLASS_API_URL = 'https://iu.cmcu.edu.vn/nhansuapi/api/NS_ThongTinCanBo_MH';

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

// Types
export interface AttendanceDetail {
  IDSINHVIEN: string;
  IDLICHHOC: string;
  TENHOCPHAN: string;
  TENLOPHOCPHAN: string;
  NGAYHOC: string;
  GIOBATDAU: number;
  PHUTBATDAU: number;
  GIOKETTHUC: number;
  PHUTKETTHUC: number;
  PHONGHOC_TEN: string;
  GIANGVIEN: string;
  TIETBATDAU: number;
  TIETKETTHUC: number;
  SOTIET: number;
  // Thông tin chuyên cần
  VANGMAT_COPHEP?: number;
  VANGMAT_KHONGPHEP?: number;
  DIEM_DANHSACH_ID?: string;
  THONGTINCHUYENCAN?: string;
}

export interface ClassStudent {
  ID: string;
  QLSV_NGUOIHOC_ID: string;
  QLSV_NGUOIHOC_MASO: string;
  QLSV_NGUOIHOC_HODEM: string;
  QLSV_NGUOIHOC_TEN: string;
  SOBUOIVANG: string;
  DANGKY_LOPHOCPHAN_ID: string;
  DANGKY_LOPHOCPHAN_TEN: string;
}

export interface CheckInRequest {
  scheduleId: string;           // IDSINHVIEN hoặc IDLICHHOC
  attendanceListId: string;     // DIEM_DANHSACH_ID
  date: string;                 // dd/MM/yyyy
  hour: string;
  minute: string;
  keyword: string;              // Từ khóa điểm danh
  classId?: string;
}

export interface CheckInResponse {
  Data: any;
  Message: string;
  Success: boolean;
  Pager: any;
  Id: string;
}

export interface AttendanceHistory {
  NGAYHOC: string;
  TENHOCPHAN: string;
  TENLOPHOCPHAN: string;
  TRANGTHAI: string;
  GHICHU: string;
}

class AttendanceService {
  private async getAuthToken(): Promise<string> {
    try {
      let token = await AsyncStorage.getItem('access_token');
      
      if (!token) {
        token = await waitForToken();
      }
      
      return token;
    } catch (error) {
      console.error('[AttendanceService] ❌ Error getting token:', error);
      throw new Error('Không tìm thấy token xác thực');
    }
  }

  private async getUserId(): Promise<string> {
    try {
      const userDataStr = await AsyncStorage.getItem('userData');
      if (userDataStr) {
        const userData = JSON.parse(userDataStr);
        if (userData.sub) {
          const userId = userData.sub.split(';')[0];
          return userId;
        }
      }
      
      const token = await AsyncStorage.getItem('access_token');
      if (token && token.includes('.')) {
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
      console.error('[AttendanceService] ❌ Error getting user ID:', error);
      throw new Error('Không tìm thấy user ID. Vui lòng đăng nhập lại.');
    }
  }

  private async getDeviceIP(): Promise<string> {
    try {
      // Gọi API để lấy IP công khai
      const response = await fetch('https://api.ipify.org?format=json', {
        method: 'GET',
      });
      const data = await response.json();
      return data.ip || '0.0.0.0';
    } catch (error) {
      console.warn('[AttendanceService] ⚠️ Failed to get IP:', error);
      return '0.0.0.0';
    }
  }

  /**
   * Điểm danh tự ghi nhận
   */
  async selfCheckIn(request: CheckInRequest): Promise<CheckInResponse> {
    try {
      // console.log('[AttendanceService] 📝 Starting check-in...');
      
      const token = await this.getAuthToken();
      const userId = await this.getUserId();
      const ip = await this.getDeviceIP();

      const requestBody = {
        action: 'CC_ThongTin/Them_QLSV_NguoiHoc_TuGhiNhan',
        type: 'POST',
        strChucNang_Id: 'B46109CD333D4E3DAC50D43E8607ED46',
        strDaoTao_LopQuanLy_Id: request.classId || '',
        strDiem_DanhSach_Id: request.attendanceListId,
        strNgayGhiNhan: request.date,
        strGio: request.hour,
        strPhut: request.minute,
        strGiay: '0',
        strIp: ip,
        strNoiDungTuGhiNhan: request.keyword,
        strNguoiThucHien_Id: userId,
        strQLSV_NguoiHoc_Id: userId,
        strDaoTao_ChuongTrinh_Id: '',
        strQLSV_TrangThaiNguoiHoc_Id: '',
      };

      // console.log('[AttendanceService] 📤 Request body:', {
      //   ...requestBody,
      //   strIp: ip,
      // });

      const response = await fetch(`${BASE_URL}/Them_QLSV_NguoiHoc_TuGhiNhan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result: CheckInResponse = await response.json();
      
      // console.log('[AttendanceService] 📥 Response:', result);

      if (!result.Success) {
        throw new Error(result.Message || 'Điểm danh thất bại');
      }

      return result;
    } catch (error) {
      console.error('[AttendanceService] ❌ Check-in error:', error);
      throw error;
    }
  }

  /**
   * Format thời gian hiện tại
   */
  getCurrentDateTime(): { date: string; hour: string; minute: string } {
    const now = new Date();
    const day = now.getDate().toString().padStart(2, '0');
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const year = now.getFullYear();
    
    return {
      date: `${day}/${month}/${year}`,
      hour: now.getHours().toString(),
      minute: now.getMinutes().toString(),
    };
  }

  /**
   * Kiểm tra có thể điểm danh không (dựa vào thời gian)
   */
  canCheckIn(schedule: AttendanceDetail): { canCheckIn: boolean; message: string } {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTime = currentHour * 60 + currentMinute;

    const startTime = schedule.GIOBATDAU * 60 + schedule.PHUTBATDAU;
    const endTime = schedule.GIOKETTHUC * 60 + schedule.PHUTKETTHUC;

    // Cho phép điểm danh trước 15 phút và sau 15 phút
    const allowedStartTime = startTime - 15;
    const allowedEndTime = endTime + 15;

    if (currentTime < allowedStartTime) {
      return {
        canCheckIn: false,
        message: 'Chưa đến giờ điểm danh',
      };
    }

    if (currentTime > allowedEndTime) {
      return {
        canCheckIn: false,
        message: 'Đã hết giờ điểm danh',
      };
    }

    return {
      canCheckIn: true,
      message: 'Có thể điểm danh',
    };
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
  formatScheduleTime(schedule: AttendanceDetail): string {
    const startTime = this.formatTime(schedule.GIOBATDAU, schedule.PHUTBATDAU);
    const endTime = this.formatTime(schedule.GIOKETTHUC, schedule.PHUTKETTHUC);
    return `${startTime} - ${endTime}`;
  }

  /**
   * Lấy danh sách sinh viên trong lớp học phần
   */
  async getClassStudents(classId: string, date: string): Promise<ClassStudent[]> {
    try {
      // console.log('[AttendanceService] 📋 Fetching class students...');
      
      const token = await this.getAuthToken();
      const userId = await this.getUserId();

      const requestBody = {
        action: 'NS_ThongTinCanBo_MH/DSA4BRIFIC8mCjgJLiIecwPP',
        func: 'pkg_congthongtincanbo.LayDSDangKyHoc_2',
        iM: 'AzzSystem',
        strChucNang_Id: 'B46109CD333D4E3DAC50D43E8607ED46',
        strDaoTao_LopHocPhan_Id: classId,
        strNgayGhiNhan: date,
        strNguoiThucHien_Id: userId,
        strReport_Id: '',
        strTuKhoa: '',
      };

      // console.log('[AttendanceService] 📤 Request:', requestBody);

      const response = await fetch(`${CLASS_API_URL}/DSA4BRIFIC8mCjgJLiIecwPP`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          A: AE(JSON.stringify(requestBody), 'DSA4BRIFIC8mCjgJLiIecwPP')
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const temp = await response.json();
      
      if (!temp.Success) {
        throw new Error(temp.Message || 'Lỗi khi lấy danh sách sinh viên');
      }

      // Giải mã dữ liệu từ response
      const decryptedData = AD(temp.Data.B, requestBody.iM);
      
      if (!decryptedData) {
        throw new Error('Không thể giải mã dữ liệu sinh viên');
      }

      const students: ClassStudent[] = JSON.parse(decryptedData);
      // console.log('[AttendanceService] 📥 Students count:', students.length);
      
      return students;
    } catch (error) {
      console.error('[AttendanceService] ❌ Error fetching class students:', error);
      throw error;
    }
  }
}

export const attendanceService = new AttendanceService();
