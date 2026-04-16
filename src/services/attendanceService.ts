import AsyncStorage from '@react-native-async-storage/async-storage';
import { AE, AD } from '../../crypto';

// Interfaces
export interface AttendanceRecord {
  ID: string;
  NGAYGHINHAN: string;
  TIETBATDAU: number;
  TIETKETTHUC: number;
  KIEUCHUYENCAN_ID: string;
  KIEUCHUYENCAN_TEN: string;
  SOLUONG: number;
  PHANTRAMHOANTHANH: string;
  PHANTRAMTHUCHIEN: string;
  DIEM_DANHSACHHOC_ID: string;
  QLSV_NGUOIHOC_ID: string;
  TINHTRANGDUYETDKTHI_TEN: string | null;
}

export interface ProcessScore {
  ID: string;
  DIEM: number;
  DIEM_THANHPHANDIEM_ID: string;
  DIEM_THANHPHANDIEM_TEN: string;
  LANHOC: number;
  LANTHI: number;
}

export interface WeeklySchedule {
  IDSINHVIEN: string;
  DANGKY_LOPHOCPHAN_ID: string;
  TENHOCPHAN: string;
  IDHOCPHAN: string;
  DANGKY_LOPHOCPHAN_TEN: string;
  TENLOPHOCPHAN: string;
  BUOIHOC: string;
  NGAYBATDAU: string;
  NGAYKETTHUC: string;
  NGAYHOC: string;
  THU: string;
  THUHOC: string;
  SOTIET: number;
  TIETBATDAU: number;
  TIETKETTHUC: number;
  GIOBATDAU: number;
  GIOKETTHUC: number;
  PHUTBATDAU: number;
  PHUTKETTHUC: number;
  PHONGHOC_TEN: string;
  TENPHONGHOC: string;
  MAPHONGHOC: string;
  IDPHONGHOC: string;
  GIANGVIEN: string;
  GIANGVIEN_ID: string;
  THUOCTINHLOP_ID: string;
  THUOCTINH_TEN: string;
  BAIHOC: string | null;
}

export interface ClassStudent {
  ID: string;
  QLSV_NGUOIHOC_MASO: string;
  QLSV_NGUOIHOC_HODEM: string;
  QLSV_NGUOIHOC_TEN: string;
}

class AttendanceService {
  private async getAuthToken(): Promise<string> {
    const token = await AsyncStorage.getItem('access_token');
    if (!token) {
      throw new Error('No authentication token found');
    }
    return token;
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
          if (payload.sub) {
            const userId = payload.sub.split(';')[0];
            return userId;
          }
        }
      }
      
      throw new Error('No user ID found');
    } catch (error) {
      console.error('[AttendanceService] Error getting user ID:', error);
      throw error;
    }
  }

  // Lấy kết quả điểm danh
  async getAttendanceRecords(lopHocPhanId: string): Promise<AttendanceRecord[]> {
    try {
      const token = await this.getAuthToken();
      const userId = await this.getUserId();

      const requestBody = {
        func: 'pkg_congthongtin_hssv_thongtin.LatKetQuaDiemDanh',
        iM: 'AzzSystem',
        strNguoiThucHien_Id: userId,
        strQLSV_NguoiHoc_Id: userId,
        strDaoTao_LopHocPhan_Id: lopHocPhanId,
        strChucNang_Id: 'A9CE858670AE453B90BB0A74458EFA34',
      };

      const encryptionKey = 'DSA1CiQ1EDQgBSgkLAUgLykP';
      
      const response = await fetch(`https://iu.cmcu.edu.vn/sinhvienapi/api/SV_ThongTin_MH/${encryptionKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          A: AE(JSON.stringify(requestBody), encryptionKey)
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const temp = await response.json();
      
      if (!temp.Success) {
        throw new Error(temp.Message || 'Lỗi khi lấy kết quả điểm danh');
      }

      const decryptedData = AD(temp.Data.B, requestBody.iM);
      
      if (!decryptedData) {
        throw new Error('Không thể giải mã dữ liệu');
      }

      const apiData = JSON.parse(decryptedData);
      const attendanceList = Array.isArray(apiData) ? apiData : (apiData.Data || []);
      
      // console.log('[AttendanceService] Attendance records:', attendanceList.length);
      
      return attendanceList;
    } catch (error) {
      console.error('[AttendanceService] Error fetching attendance:', error);
      throw error;
    }
  }

  // Lấy kết quả điểm quá trình
  async getProcessScores(lopHocPhanId: string): Promise<ProcessScore[]> {
    try {
      const token = await this.getAuthToken();
      const userId = await this.getUserId();

      const requestBody = {
        func: 'pkg_congthongtin_hssv_thongtin.LatKetQuaDiemQuaTrinh',
        iM: 'AzzSystem',
        strNguoiThucHien_Id: userId,
        strQLSV_NguoiHoc_Id: userId,
        strDaoTao_LopHocPhan_Id: lopHocPhanId,
        strChucNang_Id: 'A9CE858670AE453B90BB0A74458EFA34',
      };

      const encryptionKey = 'DSA1CiQ1EDQgBSgkLBA0IBUzKC8p';
      
      const response = await fetch(`https://iu.cmcu.edu.vn/sinhvienapi/api/SV_ThongTin_MH/${encryptionKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          A: AE(JSON.stringify(requestBody), encryptionKey)
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const temp = await response.json();
      
      if (!temp.Success) {
        throw new Error(temp.Message || 'Lỗi khi lấy điểm quá trình');
      }

      const decryptedData = AD(temp.Data.B, requestBody.iM);
      
      if (!decryptedData) {
        throw new Error('Không thể giải mã dữ liệu');
      }

      const apiData = JSON.parse(decryptedData);
      const scoreList = Array.isArray(apiData) ? apiData : (apiData.Data || []);
      
      // console.log('[AttendanceService] Process scores:', scoreList.length);
      
      return scoreList;
    } catch (error) {
      console.error('[AttendanceService] Error fetching process scores:', error);
      throw error;
    }
  }

  // Lấy lịch tuần theo lớp học phần
  async getWeeklySchedule(lopHocPhanId: string): Promise<WeeklySchedule[]> {
    try {
      const token = await this.getAuthToken();
      const userId = await this.getUserId();

      const requestBody = {
        func: 'pkg_dangkyhoc_chung.LayLichTuanTheoLopHocPhan',
        iM: 'AzzSystem',
        strNguoiThucHien_Id: userId,
        strQLSV_NguoiHoc_Id: userId,
        strDangKy_LopHocPhan_Id: lopHocPhanId,
        strChucNang_Id: 'A9CE858670AE453B90BB0A74458EFA34',
      };

      const encryptionKey = 'DSA4DSgiKRU0IC8VKSQuDS4xCS4iESkgLwPP';
      
      const response = await fetch(`https://iu.cmcu.edu.vn/dangkyhocapi/api/DKH_Chung_MH/${encryptionKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          A: AE(JSON.stringify(requestBody), encryptionKey)
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const temp = await response.json();
      
      if (!temp.Success) {
        throw new Error(temp.Message || 'Lỗi khi lấy lịch tuần');
      }

      const decryptedData = AD(temp.Data.B, requestBody.iM);
      
      if (!decryptedData) {
        throw new Error('Không thể giải mã dữ liệu');
      }

      const apiData = JSON.parse(decryptedData);
      const scheduleList = Array.isArray(apiData) ? apiData : (apiData.Data || []);
      
      // console.log('[AttendanceService] Weekly schedule:', scheduleList.length);
      
      return scheduleList;
    } catch (error) {
      console.error('[AttendanceService] Error fetching weekly schedule:', error);
      throw error;
    }
  }

  // Lấy danh sách sinh viên của lớp học phần (theo ngày ghi nhận)
  async getClassStudents(
    lopHocPhanId: string,
    ngayGhiNhan: string,
    tuKhoa: string = ''
  ): Promise<ClassStudent[]> {
    try {
      console.log('[AttendanceService] getClassStudents: request', {
        lopHocPhanId,
        ngayGhiNhan,
        tuKhoa,
      });

      const token = await this.getAuthToken();
      const userId = await this.getUserId();

      const requestBody = {
        func: 'pkg_congthongtincanbo.LayDSDangKyHoc_2',
        iM: 'AzzSystem',
        strChucNang_Id: 'B46109CD333D4E3DAC50D43E8607ED46',
        strDaoTao_LopHocPhan_Id: lopHocPhanId,
        strNgayGhiNhan: ngayGhiNhan,
        strNguoiThucHien_Id: userId,
        strReport_Id: '',
        strTuKhoa: tuKhoa,
      };

      // Endpoint theo request thực tế từ hệ thống
      const encryptionKey = 'DSA4BRIFIC8mCjgJLiIecwPP';

      const response = await fetch(
        `https://iu.cmcu.edu.vn/nhansuapi/api/NS_ThongTinCanBo_MH/${encryptionKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            A: AE(JSON.stringify(requestBody), encryptionKey),
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const temp = await response.json();
      if (!temp.Success) {
        throw new Error(temp.Message || 'Lỗi khi lấy danh sách lớp');
      }

      const decryptedData = AD(temp.Data.B, requestBody.iM);
      if (!decryptedData) {
        throw new Error('Không thể giải mã dữ liệu');
      }

      const apiData = JSON.parse(decryptedData);
      const rows = Array.isArray(apiData) ? apiData : (apiData.Data || []);

      console.log('[AttendanceService] getClassStudents: response', {
        rows: Array.isArray(rows) ? rows.length : -1,
      });

      return (rows as any[]).map((row) => ({
        ID: String(row.ID ?? ''),
        QLSV_NGUOIHOC_MASO: String(row.QLSV_NGUOIHOC_MASO ?? ''),
        QLSV_NGUOIHOC_HODEM: String(row.QLSV_NGUOIHOC_HODEM ?? ''),
        QLSV_NGUOIHOC_TEN: String(row.QLSV_NGUOIHOC_TEN ?? ''),
      }));
    } catch (error) {
      console.error('[AttendanceService] Error fetching class students:', error);
      throw error;
    }
  }
}

export default new AttendanceService();
