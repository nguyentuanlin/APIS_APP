import AsyncStorage from '@react-native-async-storage/async-storage';
import { AE, AD } from '../../crypto';

// Function để đợi token sẵn sàng
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

// Interface từ API thực tế
export interface DiemKetThucHocPhan {
  ID: string;
  NAMHOC: string; // "2025_2026"
  HOCKY: number;
  DIEM: number;
  DIEMQUYDOI: number | null;
  DIEMCHU: string;
  MAHOCPHAN: string;
  TENHOCPHAN: string;
  SOTINCHI: number;
  LANHOC: number;
  LANTHI: number;
  KETQUA: string; // "Đạt" hoặc "Không đạt"
  GHICHU?: string;
}

export interface DiemTrungBinhChung {
  NAMHOC: string;
  HOCKY: number;
  SOTINCHI: number;
  DIEMTRUNGBINH_HE10: number;
  DIEMTRUNGBINH_HE4: number;
  DIEMTRUNGBINH_TICHLUY_HE10: number;
  DIEMTRUNGBINH_TICHLUY_HE4: number;
}

export interface GradeApiResponse {
  Success: boolean;
  Message: string;
  Data: {
    rsDiemKetThucHocPhan: DiemKetThucHocPhan[];
    rsDiemTrungBinhChung: DiemTrungBinhChung[];
    rsThongTinNguoiHoc: any[];
    rsDiemThanhPhan: any[];
    rsDiemMoiNhat: any[];
    rsHocPhanChuaHoanThanh: any[];
    rsKhoiKienThucBatBuoc: any[];
    rsKhoiKienThucBatBuocHocPhan: any[];
    rsKhoiKienThucTuChonDon: any[];
    rsKhoiKienThucTuChonDonHocPhan: any[];
    rsKhoiKienThucTuChonKep: any[];
    rsKhoiKienThucTuChonKepHocPhan: any[];
    arrThanhPhan: string[];
  };
}

// Interface cho UI
export interface GradeItem {
  STT: number;
  MAHOCPHAN: string;
  TENHOCPHAN: string;
  SOTINCHI: number;
  LANHOC: number;
  LANTHI: number;
  DIEMHE10: number;
  DIEMHE4: number | null;
  DIEMCHU: string;
  DANHGIA: string;
  GHICHU: string;
}

export interface SemesterGrade {
  NAMHOC: string;
  HOCKY: number;
  DANHSACHDIEM: GradeItem[];
  DIEMTRUNGBINH_HE10: number;
  DIEMTRUNGBINH_HE4: number;
}

export interface GradeStatistics {
  TONGSO_TINCHI: number;
  SOTINCHI_TICHLUY: number;
  DIEMTRUNGBINH_HE10: number;
  DIEMTRUNGBINH_HE4: number;
  DIEMTRUNGBINH_TICHLUY_HE10: number;
  DIEMTRUNGBINH_TICHLUY_HE4: number;
}

export interface GradeResponse {
  DANHSACH_HOCKY: SemesterGrade[];
  THONGKE: GradeStatistics;
}

// Interface cho Khối kiến thức
export interface KhoiKienThucItem {
  MAKHOI: string;
  TENKHOI: string;
  DAOTAO_HOCPHAN_ID: string;
  DAOTAO_HOCPHAN_MA: string;
  DAOTAO_HOCPHAN_TEN: string;
  DAOTAO_HOCPHAN_HOCTRINH: number;
  DIEM: string | null;
  DIEMQUYDOI: string | null;
  DIEMQUYDOI_MA: string | null;
  DIEMQUYDOI_TEN: string | null;
  DANHGIA_MA: string | null;
  DANHGIA_TEN: string | null;
  KETQUA: number | null;
  HOCPHANTHUA: number;
}

export interface KhoiTongHop {
  MAKHOI: string;
  TENKHOI: string;
  TONGSOTINCHI: number;
  TONGSOTINCHI_BATBUOC: number;
  TONGSOTINCHI_DATICHLUY: number;
}

export interface KhoiKienThucResponse {
  rsChiTiet: KhoiKienThucItem[];
  rsTongHop: KhoiTongHop[];
}

class GradeService {
  private cacheKey = 'grade_data_cache';
  private standardDataCacheKey = 'grade_standard_data_cache';
  private cacheExpiry = 30 * 60 * 1000; // 30 phút

  private async getAuthToken(): Promise<string> {
    try {
      let token = await AsyncStorage.getItem('access_token');
      
      if (!token) {
        token = await waitForToken();
      }
      
      return token;
    } catch (error) {
      console.error('[GradeService] ❌ Error getting token:', error);
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
      console.error('[GradeService] ❌ Error getting user ID:', error);
      throw new Error('Không tìm thấy user ID. Vui lòng đăng nhập lại.');
    }
  }

  private async getChuongTrinhId(): Promise<string> {
    try {
      // Lấy từ student info
      const studentInfoStr = await AsyncStorage.getItem('cached_student_info');
      if (studentInfoStr) {
        const cached = JSON.parse(studentInfoStr);
        if (cached.data?.DAOTAO_TOCHUCCHUONGTRINH_ID) {
          return cached.data.DAOTAO_TOCHUCCHUONGTRINH_ID;
        }
      }
      
      // Nếu không có trong cache, trả về empty string
      // API sẽ tự động lấy dựa vào user ID
      return '';
    } catch (error) {
      console.warn('[GradeService] ⚠️ Could not get program ID:', error);
      return '';
    }
  }

  // Load dữ liệu chuẩn từ API để tăng tốc độ
  private async loadStandardData(): Promise<void> {
    try {
      // Kiểm tra cache dữ liệu chuẩn
      const cached = await AsyncStorage.getItem(this.standardDataCacheKey);
      if (cached) {
        const { timestamp } = JSON.parse(cached);
        const now = Date.now();
        
        // Cache dữ liệu chuẩn lâu hơn (24 giờ)
        if (now - timestamp < 24 * 60 * 60 * 1000) {
          // console.log('[GradeService] Using cached standard data');
          return;
        }
      }

      // console.log('[GradeService] Loading standard data...');
      
      const token = await this.getAuthToken();
      
      const response = await fetch(
        'https://iu.cmcu.edu.vn/cmsapi/api/CMS_DanhMucThuocTinh/LayDanhSachDuLieuTheoBangDM?strMaBangDanhMuc=CHUN.DMTT&strTieuChiSapXep=&dTrangThai=1',
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        
        // Cache dữ liệu chuẩn
        await AsyncStorage.setItem(
          this.standardDataCacheKey,
          JSON.stringify({
            data,
            timestamp: Date.now(),
          })
        );
        
        // console.log('[GradeService] Standard data loaded and cached');
      }
    } catch (error) {
      console.warn('[GradeService] Could not load standard data:', error);
      // Không throw error vì đây chỉ là optimization
    }
  }

  async getGrades(): Promise<GradeResponse> {
    try {
      // Kiểm tra cache trước
      const cached = await this.getCachedData();
      if (cached) {
        // console.log('[GradeService] Returning cached grade data');
        return cached;
      }

      // console.log('[GradeService] Fetching grade data from API...');
      
      // Load dữ liệu chuẩn trước để tăng tốc
      await this.loadStandardData();
      
      const token = await this.getAuthToken();
      const userId = await this.getUserId();
      const chuongTrinhId = await this.getChuongTrinhId();

      const requestBody = {
        func: 'pkg_congthongtin_hssv_thongtin.KetQuaHocTapCaNhan',
        iM: 'AzzSystem',
        strChucNang_Id: '458922CCB7064213A3D94F7511852261',
        strQLSV_NguoiHoc_Id: userId,
        strNguoiThucHien_Id: userId,
        strDaoTao_ChuongTrinh_Id: chuongTrinhId,
      };

      // console.log('[GradeService] Request body:', {
      //   ...requestBody,
      //   strQLSV_NguoiHoc_Id: userId.substring(0, 8) + '...',
      //   strNguoiThucHien_Id: userId.substring(0, 8) + '...',
      // });

      const encryptionKey = 'CiQ1EDQgCS4iFSAxAiAPKSAv';
      
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
        const errorText = await response.text();
        console.error('[GradeService] Response error:', errorText);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const temp = await response.json();
      
      // console.log('[GradeService] API Response:', {
      //   Success: temp.Success,
      //   Message: temp.Message,
      //   hasData: !!temp.Data,
      // });
      
      if (!temp.Success) {
        throw new Error(temp.Message || 'Lỗi khi lấy điểm');
      }

      // Giải mã dữ liệu từ response
      const decryptedData = AD(temp.Data.B, requestBody.iM);
      
      if (!decryptedData) {
        throw new Error('Không thể giải mã dữ liệu điểm');
      }

      // console.log('[GradeService] Decrypted data length:', decryptedData.length);
      
      const apiData = JSON.parse(decryptedData);
      
      // console.log('[GradeService] Parsed data:', {
      //   hasGrades: !!apiData.rsDiemKetThucHocPhan,
      //   gradesCount: apiData.rsDiemKetThucHocPhan?.length || 0,
      //   hasAvg: !!apiData.rsDiemTrungBinhChung,
      //   avgCount: apiData.rsDiemTrungBinhChung?.length || 0,
      // });
      
      // Transform dữ liệu từ API sang format UI
      const transformedData = this.transformApiData(apiData);
      
      // Cache dữ liệu
      await this.cacheData(transformedData);
      return transformedData;
    } catch (error) {
      console.error('[GradeService] Error fetching grades:', error);
      throw error;
    }
  }

  private transformApiData(data: any): GradeResponse {
      // Nhóm điểm theo năm học và học kỳ
      const semesterMap = new Map<string, SemesterGrade>();

      const grades = data.rsDiemKetThucHocPhan || [];
      const avgData = data.rsDiemTrungBinhChung || [];

      grades.forEach((item: any) => {
        const key = `${item.NAMHOC}_${item.HOCKY}`;

        if (!semesterMap.has(key)) {
          semesterMap.set(key, {
            NAMHOC: item.NAMHOC,
            HOCKY: item.HOCKY,
            DANHSACHDIEM: [],
            DIEMTRUNGBINH_HE10: 0,
            DIEMTRUNGBINH_HE4: 0,
          });
        }

        const semester = semesterMap.get(key)!;

        // Lấy số tín chỉ từ DAOTAO_HOCPHAN_HOCTRINH
        const tinChi = item.DAOTAO_HOCPHAN_HOCTRINH || 0;

        semester.DANHSACHDIEM.push({
          STT: semester.DANHSACHDIEM.length + 1,
          MAHOCPHAN: item.DAOTAO_HOCPHAN_MA || '',
          TENHOCPHAN: item.DAOTAO_HOCPHAN_TEN || '',
          SOTINCHI: tinChi,
          LANHOC: item.LANHOC || 1,
          LANTHI: item.LANTHI || 1,
          DIEMHE10: item.DIEM || 0,
          DIEMHE4: item.DIEMQUYDOI,
          DIEMCHU: item.DIEMQUYDOI_TEN || '-',
          DANHGIA: item.DANHGIA_TEN || '',
          GHICHU: item.GHICHU || '',
        });
      });

      // Sắp xếp theo năm học và học kỳ (mới nhất trước)
      const sortedSemesters = Array.from(semesterMap.values()).sort((a, b) => {
        const yearA = parseInt(a.NAMHOC.split('_')[0]);
        const yearB = parseInt(b.NAMHOC.split('_')[0]);
        if (yearA !== yearB) return yearB - yearA;
        return b.HOCKY - a.HOCKY;
      });

      // Tìm thống kê toàn khóa
      const toanKhoa_100 = avgData.find(
        (item: any) => item.PHAMVITONGHOPDIEM_TEN === 'TOANKHOA' && 
                       item.LOAIDIEMTRUNGBINH_MA === 'TRUNGBINHCHUNG' &&
                       item.THANGDIEM_MA === '100'
      );

      const toanKhoa_10 = avgData.find(
        (item: any) => item.PHAMVITONGHOPDIEM_TEN === 'TOANKHOA' && 
                       item.LOAIDIEMTRUNGBINH_MA === 'TRUNGBINHCHUNG' &&
                       item.THANGDIEM_MA === '10'
      );

      const toanKhoa_4 = avgData.find(
        (item: any) => item.PHAMVITONGHOPDIEM_TEN === 'TOANKHOA' && 
                       item.LOAIDIEMTRUNGBINH_MA === 'TRUNGBINHCHUNG' &&
                       item.THANGDIEM_MA === '4'
      );

      // Tìm điểm tích lũy
      const tichLuy_10 = avgData.find(
        (item: any) => item.PHAMVITONGHOPDIEM_TEN === 'TOANKHOA' && 
                       item.LOAIDIEMTRUNGBINH_MA === 'TRUNGBINHCHUNG' &&
                       item.THANGDIEM_MA === '10' &&
                       item.SOTCDAT > 0 &&
                       item.DIEMTRUNGBINH > 0
      );

      const tichLuy_4 = avgData.find(
        (item: any) => item.PHAMVITONGHOPDIEM_TEN === 'TOANKHOA' && 
                       item.LOAIDIEMTRUNGBINH_MA === 'TRUNGBINHCHUNG' &&
                       item.THANGDIEM_MA === '4' &&
                       item.SOTCDAT > 0 &&
                       item.DIEMTRUNGBINH > 0
      );

      // Lấy thống kê (ưu tiên thang 100 cho tổng tín chỉ)
      const mainStats = toanKhoa_100 || toanKhoa_10 || toanKhoa_4;

      console.log('[GradeService] Stats from API:', {
        mainStats: mainStats ? {
          TONGSOTINCHI: mainStats.TONGSOTINCHI,
          SOTCDAT: mainStats.SOTCDAT,
        } : null,
        toanKhoa_10: toanKhoa_10 ? {
          DIEMTRUNGBINH: toanKhoa_10.DIEMTRUNGBINH,
        } : null,
        toanKhoa_4: toanKhoa_4 ? {
          DIEMTRUNGBINH: toanKhoa_4.DIEMTRUNGBINH,
        } : null,
        tichLuy_10: tichLuy_10 ? {
          DIEMTRUNGBINH: tichLuy_10.DIEMTRUNGBINH,
          SOTCDAT: tichLuy_10.SOTCDAT,
        } : null,
        tichLuy_4: tichLuy_4 ? {
          DIEMTRUNGBINH: tichLuy_4.DIEMTRUNGBINH,
          SOTCDAT: tichLuy_4.SOTCDAT,
        } : null,
      });

      return {
        DANHSACH_HOCKY: sortedSemesters,
        THONGKE: {
          TONGSO_TINCHI: mainStats?.TONGSOTINCHI || 0,
          SOTINCHI_TICHLUY: tichLuy_4?.SOTCDAT || mainStats?.SOTCDAT || 0,
          DIEMTRUNGBINH_HE10: toanKhoa_10?.DIEMTRUNGBINH || 0,
          DIEMTRUNGBINH_HE4: toanKhoa_4?.DIEMTRUNGBINH || 0,
          DIEMTRUNGBINH_TICHLUY_HE10: tichLuy_10?.DIEMTRUNGBINH || 0,
          DIEMTRUNGBINH_TICHLUY_HE4: tichLuy_4?.DIEMTRUNGBINH || 0,
        },
      };
    }

  async getGradesBySemester(namHoc: string, hocKy: number): Promise<SemesterGrade | null> {
    try {
      const allGrades = await this.getGrades();
      const semester = allGrades.DANHSACH_HOCKY.find(
        (s) => s.NAMHOC === namHoc && s.HOCKY === hocKy
      );
      return semester || null;
    } catch (error) {
      console.error('[GradeService] Error fetching semester grades:', error);
      throw error;
    }
  }

  async refreshGrades(): Promise<GradeResponse> {
    try {
      console.log('[GradeService] Refreshing grade data...');
      await this.clearCache();
      // Xóa cache standard data để force reload
      await AsyncStorage.removeItem(this.standardDataCacheKey);
      return await this.getGrades();
    } catch (error) {
      console.error('[GradeService] Error refreshing grades:', error);
      throw error;
    }
  }

  // Lấy kết quả tích lũy theo khối
  async getKhoiKienThuc(): Promise<KhoiKienThucResponse> {
    try {
      const token = await this.getAuthToken();
      const userId = await this.getUserId();
      const chuongTrinhId = await this.getChuongTrinhId();

      const requestBody = {
        func: 'pkg_congthongtin_hssv_thongtin.LayKetQuaTichLuyTheoKhoi',
        iM: 'AzzSystem',
        strChucNang_Id: '458922CCB7064213A3D94F7511852261',
        strQLSV_NguoiHoc_Id: userId,
        strNguoiThucHien_Id: userId,
        strDaoTao_ChuongTrinh_Id: chuongTrinhId,
      };

      const encryptionKey = 'DSA4CiQ1EDQgFSgiKQ00OBUpJC4KKS4o';
      
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
        throw new Error(temp.Message || 'Lỗi khi lấy khối kiến thức');
      }

      const decryptedData = AD(temp.Data.B, requestBody.iM);
      
      if (!decryptedData) {
        throw new Error('Không thể giải mã dữ liệu khối kiến thức');
      }

      const apiData = JSON.parse(decryptedData);
      
      return {
        rsChiTiet: apiData.rsChiTiet || [],
        rsTongHop: apiData.rsTongHop || [],
      };
    } catch (error) {
      console.error('[GradeService] Error fetching khoi kien thuc:', error);
      throw error;
    }
  }

  private async getCachedData(): Promise<GradeResponse | null> {
    try {
      const cached = await AsyncStorage.getItem(this.cacheKey);
      if (!cached) return null;

      const { data, timestamp } = JSON.parse(cached);
      const now = Date.now();

      if (now - timestamp > this.cacheExpiry) {
        // console.log('[GradeService] Cache expired');
        await this.clearCache();
        return null;
      }

      return data;
    } catch (error) {
      console.error('[GradeService] Error reading cache:', error);
      return null;
    }
  }

  private async cacheData(data: GradeResponse): Promise<void> {
    try {
      const cacheObject = {
        data,
        timestamp: Date.now(),
      };
      await AsyncStorage.setItem(this.cacheKey, JSON.stringify(cacheObject));
      // console.log('[GradeService] Data cached successfully');
    } catch (error) {
      console.error('[GradeService] Error caching data:', error);
    }
  }

  private async clearCache(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.cacheKey);
      // console.log('[GradeService] Cache cleared');
    } catch (error) {
      console.error('[GradeService] Error clearing cache:', error);
    }
  }

  // Helper methods
  formatGrade(grade: number | string | null): string {
    if (grade === null || grade === undefined) {
      return '-';
    }
    if (typeof grade === 'number') {
      return grade.toFixed(2);
    }
    return grade.toString();
  }

  getGradeColor(diemChu: string): string {
    switch (diemChu) {
      case 'A+':
      case 'A':
        return '#10B981'; // Green
      case 'B+':
      case 'B':
        return '#3B82F6'; // Blue
      case 'C+':
      case 'C':
        return '#F59E0B'; // Orange
      case 'D+':
      case 'D':
        return '#EF4444'; // Red
      case 'F':
        return '#DC2626'; // Dark Red
      default:
        return '#6B7280'; // Gray
    }
  }

  getPassStatus(danhGia: string): { text: string; color: string } {
    if (danhGia === 'Đạt') {
      return { text: 'Đạt', color: '#10B981' };
    } else if (danhGia === 'Không đạt') {
      return { text: 'Không đạt', color: '#EF4444' };
    }
    return { text: danhGia, color: '#6B7280' };
  }
}

export const gradeService = new GradeService();
