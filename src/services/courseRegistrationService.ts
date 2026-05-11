import AsyncStorage from '@react-native-async-storage/async-storage';
import { AE, AD } from '../../crypto';
import { API_HOSTS } from '../config/apiHosts';

// Interfaces
export interface RegistrationPlan {
  ID: string;
  TEN: string;
  NGAYBATDAU: string;
  NGAYKETTHUC: string;
  TRANGTHAI: number;
  MOTA?: string;
}

export interface Course {
  ID: string;
  DAOTAO_HOCPHAN_ID: string;
  DAOTAO_HOCPHAN_MA: string;
  DAOTAO_HOCPHAN_TEN: string;
  DAOTAO_HOCPHAN_SOTINCHI: number;
  DADANGKY: number;
}

export interface CourseClass {
  ID: string;
  MALOP: string;
  TENLOP: string;
  GIANGVIEN: string;
  NGAYBATDAU: string;
  NGAYKETTHUC: string;
  THUHOC: string;
  SOLUONGDUKIENHOC: number;
  SOTHUCTEDANGKYHOC: number;
  PHIPHAINOP: number;
  PHIDUOCMIEN: number;
  PHISAUKHITRUMIEN: number;
  THUOCTINHLOP_MA: string;
  THUOCTINHLOP_TEN: string;
  LOPHOCPHANCHINH: number;
}

export interface StudyDay {
  THUHOC: number;
}

export interface Instructor {
  ID: string;
  MASO: string;
  HODEM: string;
  TEN: string;
  ANH?: string;
}

export interface RegistrationResponse {
  Success: boolean;
  Message: string;
  Data?: any;
}

class CourseRegistrationService {
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
      console.error('[CourseRegistrationService] Error getting user ID:', error);
      throw error;
    }
  }

  // Lấy chương trình đào tạo của sinh viên (động, dùng cho các API yêu cầu chuongTrinhId)
  private async getChuongTrinhId(): Promise<string> {
    try {
      const cached = await AsyncStorage.getItem('cached_student_info');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.data?.DAOTAO_TOCHUCCHUONGTRINH_ID) {
          return parsed.data.DAOTAO_TOCHUCCHUONGTRINH_ID;
        }
      }
      const { scheduleService } = await import('./scheduleService');
      const info = await scheduleService.getStudentInfo();
      return info?.DAOTAO_TOCHUCCHUONGTRINH_ID || '';
    } catch {
      return '';
    }
  }

  // Lấy danh sách kế hoạch đăng ký học
  async getRegistrationPlans(): Promise<RegistrationPlan[]> {
    try {
      const token = await this.getAuthToken();
      const userId = await this.getUserId();
      const chuongTrinhId = await this.getChuongTrinhId();

      if (!chuongTrinhId) {
        throw new Error('Không xác định được chương trình đào tạo của sinh viên');
      }

      const encryptionKey = 'DSA4BRIKJAkuICIpBSAvJgo4CS4i';
      const requestBody = {
        func: 'pkg_dangkyhoc_chung2.LayDSKeHoachDangKyHoc',
        iM: 'AzzSystem',
        strDaoTao_ChuongTrinh_Id: chuongTrinhId,
        strQLSV_NguoiHoc_Id: userId,
        strNguoiThucHien_Id: userId,
      };

      const response = await fetch(`${API_HOSTS.nhanSu}/NS_DKH_CHUNG2_MH/${encryptionKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          A: AE(JSON.stringify(requestBody), encryptionKey),
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const temp = await response.json();
      if (!temp.Success) {
        throw new Error(temp.Message || 'Lỗi khi lấy danh sách kế hoạch đăng ký');
      }

      const decryptedData = AD(temp.Data.B, requestBody.iM);
      if (!decryptedData) return [];

      const apiData = JSON.parse(decryptedData);
      const rawList = Array.isArray(apiData) ? apiData : apiData.Data || [];

      return rawList.map((e: any) => ({
        ID: e.ID,
        TEN: e.TENKEHOACH || e.MAKEHOACH || e.TEN || '',
        NGAYBATDAU: e.NGAYBATDAU || '',
        NGAYKETTHUC: e.NGAYKETTHUC || '',
        TRANGTHAI: e.TRANGTHAI ?? 1,
        MOTA: e.MAKEHOACH ? `${e.MAKEHOACH} - ${e.TENKEHOACH || ''}` : e.MOTA || '',
      }));
    } catch (error) {
      console.error('[CourseRegistrationService] Error fetching registration plans:', error);
      throw error;
    }
  }

  // Lấy danh sách học phần đang tổ chức
  async getAvailableCourses(planId: string): Promise<Course[]> {
    try {
      const token = await this.getAuthToken();
      const userId = await this.getUserId();

      const requestBody = {
        func: 'pkg_dangkyhoc_chung3.LayDSHocPhanDangToChuc',
        iM: 'AzzSystem',
        strDangKy_KeHoachDangKy_Id: planId,
        strDaoTao_ChuongTrinh_Id: await this.getChuongTrinhId(),
        strQLSV_NguoiHoc_Id: userId,
        strNguoiThucHien_Id: userId,
        strChucNang_Id: '6D01F8288B3146BAA9864693699E6CD0',
      };

      const encryptionKey = 'DSA4BRIJLiIRKSAvBSAvJhUuAik0IgPP';
      
      const response = await fetch(`${API_HOSTS.xuLyHocVu}/XLHV_DKH_CHUNG3_MH/${encryptionKey}`, {
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
        throw new Error(temp.Message || 'Lỗi khi lấy danh sách học phần');
      }

      const decryptedData = AD(temp.Data.B, requestBody.iM);
      const apiData = JSON.parse(decryptedData);
      
      return Array.isArray(apiData) ? apiData : (apiData.Data || []);
    } catch (error) {
      console.error('[CourseRegistrationService] Error fetching courses:', error);
      throw error;
    }
  }

  // Lấy danh sách lớp học phần
  async getCourseClasses(planId: string, courseId: string): Promise<CourseClass[]> {
    try {
      const token = await this.getAuthToken();
      const userId = await this.getUserId();

      const requestBody = {
        func: 'pkg_dangkyhoc_chung4.LayDSLopHocPhanDangToChuc',
        iM: 'AzzSystem',
        strDangKy_KeHoachDangKy_Id: planId,
        strDaoTao_ChuongTrinh_Id: await this.getChuongTrinhId(),
        strDaoTao_HocPhan_Id: courseId,
        strQLSV_NguoiHoc_Id: userId,
        strNguoiThucHien_Id: userId,
        strChucNang_Id: '6D01F8288B3146BAA9864693699E6CD0',
        strThuHoc: '',
        strNhanSu_HoSoNhanSu_v2_Id: '',
        strMaNhomLop: '',
        strThuocTinhLop_Id: '',
        dChiLayCacLopKhongTrung: 0,
        dLaLopHocPhanChinh: 1,
      };

      const encryptionKey = 'DSA4BRINLjEJLiIRKSAvBSAvJhUuAik0IgPP';
      
      const response = await fetch(`${API_HOSTS.totNghiep}/TN_DKH_CHUNG4_MH/${encryptionKey}`, {
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
        throw new Error(temp.Message || 'Lỗi khi lấy danh sách lớp học');
      }

      const decryptedData = AD(temp.Data.B, requestBody.iM);
      const apiData = JSON.parse(decryptedData);
      
      return Array.isArray(apiData.rs) ? apiData.rs : [];
    } catch (error) {
      console.error('[CourseRegistrationService] Error fetching course classes:', error);
      throw error;
    }
  }

  // Lấy thứ học theo học phần
  async getStudyDays(planId: string, courseId: string): Promise<StudyDay[]> {
    try {
      const token = await this.getAuthToken();
      const userId = await this.getUserId();

      const requestBody = {
        func: 'PKG_DANGKYHOC_CHUNG6.LayThuHocTheoHocPhan',
        iM: 'AzzSystem',
        strDangKy_KeHoachDangKy_Id: planId,
        strDaoTao_ChuongTrinh_Id: await this.getChuongTrinhId(),
        strDaoTao_HocPhan_Id: courseId,
        strQLSV_NguoiHoc_Id: userId,
        strNguoiThucHien_Id: userId,
        strChucNang_Id: '6D01F8288B3146BAA9864693699E6CD0',
      };

      const encryptionKey = 'DSA4FSk0CS4iFSkkLgkuIhEpIC8P';
      
      const response = await fetch(`${API_HOSTS.xuLyHocVu}/XLHV_DKH_CHUNG6_MH/${encryptionKey}`, {
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
        throw new Error(temp.Message || 'Lỗi khi lấy thứ học');
      }

      const decryptedData = AD(temp.Data.B, requestBody.iM);
      const apiData = JSON.parse(decryptedData);
      
      return Array.isArray(apiData) ? apiData : (apiData.Data || []);
    } catch (error) {
      console.error('[CourseRegistrationService] Error fetching study days:', error);
      throw error;
    }
  }

  // Lấy danh sách giảng viên theo học phần
  async getInstructors(planId: string, courseId: string): Promise<Instructor[]> {
    try {
      const token = await this.getAuthToken();
      const userId = await this.getUserId();

      const requestBody = {
        func: 'PKG_DANGKYHOC_CHUNG6.LayGiangVienTheoHocPhan',
        iM: 'AzzSystem',
        strDangKy_KeHoachDangKy_Id: planId,
        strDaoTao_ChuongTrinh_Id: await this.getChuongTrinhId(),
        strDaoTao_HocPhan_Id: courseId,
        strQLSV_NguoiHoc_Id: userId,
        strNguoiThucHien_Id: userId,
        strChucNang_Id: '6D01F8288B3146BAA9864693699E6CD0',
      };

      const encryptionKey = 'DSA4BiggLyYXKCQvFSkkLgkuIhEpIC8P';
      
      const response = await fetch(`${API_HOSTS.xuLyHocVu}/XLHV_DKH_CHUNG6_MH/${encryptionKey}`, {
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
        throw new Error(temp.Message || 'Lỗi khi lấy danh sách giảng viên');
      }

      const decryptedData = AD(temp.Data.B, requestBody.iM);
      const apiData = JSON.parse(decryptedData);
      
      return Array.isArray(apiData) ? apiData : (apiData.Data || []);
    } catch (error) {
      console.error('[CourseRegistrationService] Error fetching instructors:', error);
      throw error;
    }
  }

  // Đăng ký học phần
  async registerCourse(planId: string, courseId: string, classId: string): Promise<RegistrationResponse> {
    try {
      const token = await this.getAuthToken();
      const userId = await this.getUserId();

      // API đăng ký học phần (cần implement endpoint cụ thể)
      const requestBody = {
        func: 'pkg_dangkyhoc_chung.DangKyHocPhan',
        iM: 'AzzSystem',
        strDangKy_KeHoachDangKy_Id: planId,
        strDaoTao_HocPhan_Id: courseId,
        strLopHocPhan_Id: classId,
        strQLSV_NguoiHoc_Id: userId,
        strNguoiThucHien_Id: userId,
        strChucNang_Id: '6D01F8288B3146BAA9864693699E6CD0',
      };

      // Placeholder - cần endpoint thực tế để đăng ký
      console.log('[CourseRegistrationService] Register course request:', requestBody);
      
      // Tạm thời return success để test UI
      return {
        Success: true,
        Message: 'Đăng ký học phần thành công',
        Data: null
      };
    } catch (error) {
      console.error('[CourseRegistrationService] Error registering course:', error);
      return {
        Success: false,
        Message: error instanceof Error ? error.message : 'Lỗi khi đăng ký học phần'
      };
    }
  }

  // Hủy đăng ký học phần
  async unregisterCourse(planId: string, courseId: string, classId: string): Promise<RegistrationResponse> {
    try {
      const token = await this.getAuthToken();
      const userId = await this.getUserId();

      // API hủy đăng ký học phần (cần implement endpoint cụ thể)
      const requestBody = {
        func: 'pkg_dangkyhoc_chung.HuyDangKyHocPhan',
        iM: 'AzzSystem',
        strDangKy_KeHoachDangKy_Id: planId,
        strDaoTao_HocPhan_Id: courseId,
        strLopHocPhan_Id: classId,
        strQLSV_NguoiHoc_Id: userId,
        strNguoiThucHien_Id: userId,
        strChucNang_Id: '6D01F8288B3146BAA9864693699E6CD0',
      };

      console.log('[CourseRegistrationService] Unregister course request:', requestBody);
      
      // Tạm thời return success để test UI
      return {
        Success: true,
        Message: 'Hủy đăng ký học phần thành công',
        Data: null
      };
    } catch (error) {
      console.error('[CourseRegistrationService] Error unregistering course:', error);
      return {
        Success: false,
        Message: error instanceof Error ? error.message : 'Lỗi khi hủy đăng ký học phần'
      };
    }
  }

  // Lấy lịch tuần theo lớp học phần
  async getClassSchedule(classId: string): Promise<any[]> {
    try {
      const token = await this.getAuthToken();
      const userId = await this.getUserId();

      const requestBody = {
        func: 'PKG_DANGKYHOC_CHUNG7.LayLichTuanTheoLopHocPhan',
        iM: 'AzzSystem',
        strDangKy_LopHocPhan_Id: classId,
        strQLSV_NguoiHoc_Id: userId,
        strNguoiThucHien_Id: userId,
        strChucNang_Id: '6D01F8288B3146BAA9864693699E6CD0',
        strKhoaKiemTraDuLieu: '6977c534abfd488899370314628b55ae',
      };

      // Sử dụng endpoint chính xác từ API log
      const encryptionKey = 'DSA4DSgiKRU0IC8VKSQuDS4xCS4iESkgLwPP';
      
      console.log('[CourseRegistrationService] Calling schedule API with classId:', classId);
      console.log('[CourseRegistrationService] Request body:', requestBody);
      
      const response = await fetch(`${API_HOSTS.quanLyTuyenSinh}/TS_DKH_CHUNG7_MH/${encryptionKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          A: AE(JSON.stringify(requestBody), encryptionKey)
        }),
      });

      console.log('[CourseRegistrationService] API Response status:', response.status);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const temp = await response.json();
      console.log('[CourseRegistrationService] API Response success:', temp.Success);
      
      if (!temp.Success) {
        throw new Error(temp.Message || 'Lỗi khi lấy lịch học');
      }

      const decryptedData = AD(temp.Data.B, requestBody.iM);
      const apiData = JSON.parse(decryptedData);
      
      console.log('[CourseRegistrationService] Schedule data loaded:', Array.isArray(apiData) ? apiData.length : 'Not array');
      
      return Array.isArray(apiData) ? apiData : (apiData.Data || []);
    } catch (error) {
      console.error('[CourseRegistrationService] Error fetching class schedule:', error);
      
      // Tạm thời return mock data để test UI
      console.log('[CourseRegistrationService] Using mock schedule data');
      return this.getMockScheduleData();
    }
  }

  // Mock data để test UI khi API không hoạt động
  private getMockScheduleData(): any[] {
    return [
      {
        IDSINHVIEN: '7D8931D75395445A89A134636CE3D570',
        DANGKY_LOPHOCPHAN_ID: '2AAA717C948047B89A01C031D15F7501',
        TENHOCPHAN: 'Tiếng Nhật 3A',
        IDHOCPHAN: '4901DE5816C64DEB992EDB7B3526BB49',
        DANGKY_LOPHOCPHAN_TEN: 'Tiếng Nhật 3A-2-2-25(N01).LT/LT+TH',
        BAIHOC: null,
        BUOIHOC: 'CHIỀU',
        GIANGVIEN: 'Trần Minh Anh',
        GIANGVIEN_ID: '985988B830A84067A4501B188F7BA933',
        GIOBATDAU: 13,
        GIOKETTHUC: 16,
        IDPHONGHOC: '5f89f07f02684985a5c66759a4cc2040',
        MAPHONGHOC: 'VPC2-12A03',
        NGAYBATDAU: '13/04/2026',
        NGAYHOC: '13/04/2026',
        NGAYKETTHUC: '19/04/2026',
        PHONGHOC_TEN: 'VPC2-12A03',
        PHUTBATDAU: 0,
        PHUTKETTHUC: 35,
        SOTIET: 4,
        TENLOPHOCPHAN: 'Tiếng Nhật 3A-2-2-25(N01).LT/LT+TH',
        TENPHONGHOC: 'VPC2-12A03',
        THU: '2',
        THUHOC: '2 - 13/04/2026',
        THUOCTINHLOP_ID: '0486dbab65bf4884807e12cecd735b41',
        THUOCTINH_TEN: 'Lý thuyết/ Lý thuyết kết hợp thực hành',
        TIETBATDAU: 7,
        TIETKETTHUC: 10
      },
      {
        IDSINHVIEN: '7D8931D75395445A89A134636CE3D570',
        DANGKY_LOPHOCPHAN_ID: '2AAA717C948047B89A01C031D15F7501',
        TENHOCPHAN: 'Tiếng Nhật 3A',
        IDHOCPHAN: '4901DE5816C64DEB992EDB7B3526BB49',
        DANGKY_LOPHOCPHAN_TEN: 'Tiếng Nhật 3A-2-2-25(N01).LT/LT+TH',
        BAIHOC: null,
        BUOIHOC: 'CHIỀU',
        GIANGVIEN: 'Nguyễn Thị Anh',
        GIANGVIEN_ID: '985988B830A84067A4501B188F7BA934',
        GIOBATDAU: 13,
        GIOKETTHUC: 16,
        IDPHONGHOC: '5f89f07f02684985a5c66759a4cc2040',
        MAPHONGHOC: 'VPC2-12A03',
        NGAYBATDAU: '15/04/2026',
        NGAYHOC: '15/04/2026',
        NGAYKETTHUC: '19/04/2026',
        PHONGHOC_TEN: 'VPC2-12A03',
        PHUTBATDAU: 0,
        PHUTKETTHUC: 35,
        SOTIET: 4,
        TENLOPHOCPHAN: 'Tiếng Nhật 3A-2-2-25(N01).LT/LT+TH',
        TENPHONGHOC: 'VPC2-12A03',
        THU: '3',
        THUHOC: '3 - 15/04/2026',
        THUOCTINHLOP_ID: '0486dbab65bf4884807e12cecd735b41',
        THUOCTINH_TEN: 'Lý thuyết/ Lý thuyết kết hợp thực hành',
        TIETBATDAU: 7,
        TIETKETTHUC: 10
      },
      {
        IDSINHVIEN: '7D8931D75395445A89A134636CE3D570',
        DANGKY_LOPHOCPHAN_ID: '2AAA717C948047B89A01C031D15F7501',
        TENHOCPHAN: 'Tiếng Nhật 3A',
        IDHOCPHAN: '4901DE5816C64DEB992EDB7B3526BB49',
        DANGKY_LOPHOCPHAN_TEN: 'Tiếng Nhật 3A-2-2-25(N01).LT/LT+TH',
        BAIHOC: null,
        BUOIHOC: 'CHIỀU',
        GIANGVIEN: 'Trình Thị Phương Thảo',
        GIANGVIEN_ID: '985988B830A84067A4501B188F7BA935',
        GIOBATDAU: 13,
        GIOKETTHUC: 16,
        IDPHONGHOC: '5f89f07f02684985a5c66759a4cc2040',
        MAPHONGHOC: 'VPC2-12A03',
        NGAYBATDAU: '17/04/2026',
        NGAYHOC: '17/04/2026',
        NGAYKETTHUC: '19/04/2026',
        PHONGHOC_TEN: 'VPC2-12A03',
        PHUTBATDAU: 0,
        PHUTKETTHUC: 35,
        SOTIET: 4,
        TENLOPHOCPHAN: 'Tiếng Nhật 3A-2-2-25(N01).LT/LT+TH',
        TENPHONGHOC: 'VPC2-12A03',
        THU: '5',
        THUHOC: '5 - 17/04/2026',
        THUOCTINHLOP_ID: '0486dbab65bf4884807e12cecd735b41',
        THUOCTINH_TEN: 'Lý thuyết/ Lý thuyết kết hợp thực hành',
        TIETBATDAU: 7,
        TIETKETTHUC: 10
      }
    ];
  }
  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount);
  }

  formatStudyDays(studyDays: string): string {
    const dayMap: { [key: string]: string } = {
      '2': 'T2',
      '3': 'T3',
      '4': 'T4',
      '5': 'T5',
      '6': 'T6',
      '7': 'T7',
      '8': 'CN'
    };

    return studyDays
      .split(',')
      .map(day => dayMap[day.trim()] || day.trim())
      .join(', ');
  }

  formatDate(dateString: string): string {
    if (!dateString) return '';
    
    try {
      const [day, month, year] = dateString.split('/');
      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      
      return date.toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch (error) {
      return dateString;
    }
  }
}

export default new CourseRegistrationService();