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

// Interface cho học phần chưa hoàn thành (học lại)
export interface HocPhanChuaHoanThanh {
  ID: string;
  DAOTAO_HOCPHAN_ID: string;
  DAOTAO_HOCPHAN_MA: string;
  DAOTAO_HOCPHAN_TEN: string;
  DAOTAO_HOCPHAN_HOCTRINH: number;
  NAMHOC: string;
  HOCKY: number;
  LANHOC: number;
  LANTHI: number;
  DIEM: number;
  DIEMQUYDOI: number;
  DIEMQUYDOI_TEN: string;
  DANHGIA_MA: string;
  DANHGIA_TEN: string;
  GHICHU: string | null;
  DIEM_DANHSACHHOC_TEN: string;
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
  TONGSO_TINCHI: number;
  SOTINCHI_TICHLUY: number;
  DIEMTRUNGBINH_HE10: number;
  DIEMTRUNGBINH_HE4: number;
  DIEMTRUNGBINH_TICHLUY_HE10: number;
  DIEMTRUNGBINH_TICHLUY_HE4: number;
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
  HOCPHAN_CHUAHOANTHANH: HocPhanChuaHoanThanh[];
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
  TONGSOTINCHICUAKHOI: number;
  SOBATBUOC: number;
  SODATICHLUY: number | null;
  SOTINCHINO: number;
}

export interface KhoiKienThucResponse {
  rsChiTiet: KhoiKienThucItem[];
  rsTongHop: KhoiTongHop[];
}

export interface QuyetDinh {
  LOAIQUYETDINH_ID: string;
  LOAIQUYETDINH_TEN: string;
  SOQUYETDINH: string;
  NGAYQUYETDINH: string;
  NGAYHIEULUC: string;
  NOIDUNG: string;
}

export interface VanBangChungChi {
  ID: string;
  PHANLOAI_ID: string;
  PHANLOAI_TEN: string;
  CHUONGTRINH_TEN: string;
  XEPLOAI_ID: string;
  XEPLOAI_TEN: string;
  SOHIEUBANG: string;
  SOVAOSOCAPBANG: string;
  QLSV_NGUOIHOC_ID: string;
  QLSV_NGUOIHOC_MASO: string;
  QLSV_NGUOIHOC_HODEM: string;
  QLSV_NGUOIHOC_TEN: string;
}

export interface CanhBaoHocVu {
  ID?: string;
  THOIGIAN?: string;
  MUCXULY?: string;
  MUCXULY_TEN?: string;
  CHUONGTRINH?: string;
  CHUONGTRINH_TEN?: string;
  LOP?: string;
  LOP_TEN?: string;
  GHICHU?: string;
  NGAYTAO?: string;
  NAMHOC?: string;
  HOCKY?: string;
}

export interface DiemRenLuyen {
  ID: string;
  QLSV_NGUOIHOC_ID: string;
  QLSV_NGUOIHOC_MASO: string;
  QLSV_NGUOIHOC_TEN: string;
  QLSV_NGUOIHOC_HODEM: string;
  DAOTAO_TOCHUCCHUONGTRINH_ID: string;
  DAOTAO_TOCHUCCHUONGTRINH_MA: string;
  DAOTAO_TOCHUCCHUONGTRINH_TEN: string;
  DAOTAO_LOPQUANLY_ID: string;
  DIEM: number;
  DIEMQUYDOI: number;
  XEPLOAI_ID: string;
  XEPLOAI_MA: string;
  XEPLOAI_TEN: string;
  THOIGIAN?: string;
  THOIGIAN_THUTU?: number;
  DAOTAO_THOIGIANDAOTAO_ID?: string;
}

export interface DiemRenLuyenResponse {
  rsKy: DiemRenLuyen[];
  rsNam: DiemRenLuyen[];
  rsToanKhoa: DiemRenLuyen[];
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
            TONGSO_TINCHI: 0,
            SOTINCHI_TICHLUY: 0,
            DIEMTRUNGBINH_HE10: 0,
            DIEMTRUNGBINH_HE4: 0,
            DIEMTRUNGBINH_TICHLUY_HE10: 0,
            DIEMTRUNGBINH_TICHLUY_HE4: 0,
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

      // Gán điểm trung bình cho từng học kỳ
      semesterMap.forEach((semester, key) => {
        // NAMHOC đã có format "2025_2026", HOCKY là số
        const namHoc = semester.NAMHOC;
        const hocKy = semester.HOCKY;
        
        // Tìm điểm trung bình chung của học kỳ này (hệ 10) - PHAMVI = HOCKY
        const avgHK_10 = avgData.find(
          (item: any) => 
            item.DAOTAO_THOIGIANDAOTAO_NAMHOC === namHoc && 
            item.DAOTAO_THOIGIANDAOTAO_KY === hocKy &&
            item.PHAMVITONGHOPDIEM_TEN === 'HOCKY' &&
            item.LOAIDIEMTRUNGBINH_MA === 'TRUNGBINHCHUNG' &&
            item.THANGDIEM_MA === '10'
        );

        // Tìm điểm trung bình chung của học kỳ này (hệ 4) - PHAMVI = HOCKY
        const avgHK_4 = avgData.find(
          (item: any) => 
            item.DAOTAO_THOIGIANDAOTAO_NAMHOC === namHoc && 
            item.DAOTAO_THOIGIANDAOTAO_KY === hocKy &&
            item.PHAMVITONGHOPDIEM_TEN === 'HOCKY' &&
            item.LOAIDIEMTRUNGBINH_MA === 'TRUNGBINHCHUNG' &&
            item.THANGDIEM_MA === '4'
        );

        // Tìm điểm tích lũy tại học kỳ này (hệ 10) - PHAMVI = NHIEUKY
        const tichLuyHK_10 = avgData.find(
          (item: any) => 
            item.DAOTAO_THOIGIANDAOTAO_NAMHOC === namHoc && 
            item.DAOTAO_THOIGIANDAOTAO_KY === hocKy &&
            item.PHAMVITONGHOPDIEM_TEN === 'NHIEUKY' &&
            item.LOAIDIEMTRUNGBINH_MA === 'TRUNGBINHTICHLUY' &&
            item.THANGDIEM_MA === '10'
        );

        // Tìm điểm tích lũy tại học kỳ này (hệ 4) - PHAMVI = NHIEUKY
        const tichLuyHK_4 = avgData.find(
          (item: any) => 
            item.DAOTAO_THOIGIANDAOTAO_NAMHOC === namHoc && 
            item.DAOTAO_THOIGIANDAOTAO_KY === hocKy &&
            item.PHAMVITONGHOPDIEM_TEN === 'NHIEUKY' &&
            item.LOAIDIEMTRUNGBINH_MA === 'TRUNGBINHTICHLUY' &&
            item.THANGDIEM_MA === '4'
        );

        // Gán giá trị - chỉ hiển thị điểm của học kỳ đó (không hiển thị tích lũy)
        // Tổng tín chỉ của học kỳ này (từ HOCKY)
        const tongTinChi = avgHK_10?.TONGSOTINCHI || avgHK_4?.TONGSOTINCHI || 0;
        semester.TONGSO_TINCHI = tongTinChi;
        
        // Tổng số tín chỉ tích lũy = tổng tín chỉ của học kỳ này (cùng giá trị)
        semester.SOTINCHI_TICHLUY = tongTinChi;
        
        // Điểm trung bình của học kỳ này (từ HOCKY)
        const diemTB_10 = avgHK_10?.DIEMTRUNGBINH || 0;
        const diemTB_4 = avgHK_4?.DIEMTRUNGBINH || 0;
        semester.DIEMTRUNGBINH_HE10 = diemTB_10;
        semester.DIEMTRUNGBINH_HE4 = diemTB_4;
        
        // Điểm trung bình tích lũy = điểm trung bình của học kỳ này (cùng giá trị)
        semester.DIEMTRUNGBINH_TICHLUY_HE10 = diemTB_10;
        semester.DIEMTRUNGBINH_TICHLUY_HE4 = diemTB_4;
      });

      // Sắp xếp theo năm học và học kỳ (mới nhất trước)
      const sortedSemesters = Array.from(semesterMap.values()).sort((a, b) => {
        const yearA = parseInt(a.NAMHOC.split('_')[0]);
        const yearB = parseInt(b.NAMHOC.split('_')[0]);
        if (yearA !== yearB) return yearB - yearA;
        return b.HOCKY - a.HOCKY;
      });

      // Tìm điểm trung bình chung (toàn khóa)
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

      // Tìm điểm trung bình tích lũy
      const tichLuy_10 = avgData.find(
        (item: any) => item.PHAMVITONGHOPDIEM_TEN === 'TOANKHOA' && 
                       item.LOAIDIEMTRUNGBINH_MA === 'TRUNGBINHTICHLUY' &&
                       item.THANGDIEM_MA === '10'
      );

      const tichLuy_4 = avgData.find(
        (item: any) => item.PHAMVITONGHOPDIEM_TEN === 'TOANKHOA' && 
                       item.LOAIDIEMTRUNGBINH_MA === 'TRUNGBINHTICHLUY' &&
                       item.THANGDIEM_MA === '4'
      );

      // console.log('[GradeService] Stats from API:', {
      //   mainStats: toanKhoa_4 ? {
      //     TONGSOTINCHI: toanKhoa_4.TONGSOTINCHI,
      //     SOTCDAT: toanKhoa_4.SOTCDAT,
      //   } : null,
      //   toanKhoa_10: toanKhoa_10 ? {
      //     DIEMTRUNGBINH: toanKhoa_10.DIEMTRUNGBINH,
      //   } : null,
      //   toanKhoa_4: toanKhoa_4 ? {
      //     DIEMTRUNGBINH: toanKhoa_4.DIEMTRUNGBINH,
      //   } : null,
      //   tichLuy_10: tichLuy_10 ? {
      //     DIEMTRUNGBINH: tichLuy_10.DIEMTRUNGBINH,
      //     SOTCDAT: tichLuy_10.SOTCDAT,
      //   } : null,
      //   tichLuy_4: tichLuy_4 ? {
      //     DIEMTRUNGBINH: tichLuy_4.DIEMTRUNGBINH,
      //     SOTCDAT: tichLuy_4.SOTCDAT,
      //   } : null,
      // });

      // Transform học phần chưa hoàn thành từ API
      const hocPhanChuaHoanThanh: HocPhanChuaHoanThanh[] = (data.rsHocPhanChuaHoanThanh || []).map((item: any) => ({
        ID: item.ID,
        DAOTAO_HOCPHAN_ID: item.DAOTAO_HOCPHAN_ID,
        DAOTAO_HOCPHAN_MA: item.DAOTAO_HOCPHAN_MA,
        DAOTAO_HOCPHAN_TEN: item.DAOTAO_HOCPHAN_TEN,
        DAOTAO_HOCPHAN_HOCTRINH: item.DAOTAO_HOCPHAN_HOCTRINH,
        NAMHOC: item.NAMHOC,
        HOCKY: item.HOCKY,
        LANHOC: item.LANHOC,
        LANTHI: item.LANTHI,
        DIEM: item.DIEM,
        DIEMQUYDOI: item.DIEMQUYDOI,
        DIEMQUYDOI_TEN: item.DIEMQUYDOI_TEN,
        DANHGIA_MA: item.DANHGIA_MA,
        DANHGIA_TEN: item.DANHGIA_TEN,
        GHICHU: item.GHICHU,
        DIEM_DANHSACHHOC_TEN: item.DIEM_DANHSACHHOC_TEN || '',
      }));

      return {
        DANHSACH_HOCKY: sortedSemesters,
        THONGKE: {
          TONGSO_TINCHI: toanKhoa_4?.TONGSOTINCHI || 0,
          SOTINCHI_TICHLUY: tichLuy_4?.SOTCDAT || 0,
          DIEMTRUNGBINH_HE10: toanKhoa_10?.DIEMTRUNGBINH || 0,
          DIEMTRUNGBINH_HE4: toanKhoa_4?.DIEMTRUNGBINH || 0,
          DIEMTRUNGBINH_TICHLUY_HE10: tichLuy_10?.DIEMTRUNGBINH || 0,
          DIEMTRUNGBINH_TICHLUY_HE4: tichLuy_4?.DIEMTRUNGBINH || 0,
        },
        HOCPHAN_CHUAHOANTHANH: hocPhanChuaHoanThanh,
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
      // console.log('[GradeService] Refreshing grade data...');
      await this.clearCache();
      // Xóa cache standard data để force reload
      await AsyncStorage.removeItem(this.standardDataCacheKey);
      return await this.getGrades();
    } catch (error) {
      // console.error('[GradeService] Error refreshing grades:', error);
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

  // Lấy danh sách quyết định cá nhân
  async getQuyetDinh(): Promise<QuyetDinh[]> {
    try {
      // console.log('[GradeService] Getting quyet dinh...');
      const token = await this.getAuthToken();
      const userId = await this.getUserId();
      
      // console.log('[GradeService] User ID:', userId.substring(0, 8) + '...');

      const requestBody = {
        func: 'pkg_congthongtin_hssv_thongtin.LayDSQDCaNhan',
        iM: 'AzzSystem',
        strNguoiDung_Id: userId,
        strChucNang_Id: '458922CCB7064213A3D94F7511852261',
        strNguoiThucHien_Id: userId,
      };

      const encryptionKey = 'DSA4BRIQBQIgDykgLwPP';
      
      // console.log('[GradeService] Calling API...');

      const response = await fetch(
        `https://iu.cmcu.edu.vn/sinhvienapi/api/SV_ThongTin_MH/${encryptionKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            A: AE(JSON.stringify(requestBody), encryptionKey),
          }),
        }
      );

      // console.log('[GradeService] Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[GradeService] Response error:', errorText);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const temp = await response.json();
      
      // console.log('[GradeService] Response success:', temp.Success);

      if (!temp.Success) {
        console.error('[GradeService] API error:', temp.Message);
        throw new Error(temp.Message || 'Lỗi khi lấy danh sách quyết định');
      }

      const decryptedData = AD(temp.Data.B, requestBody.iM);

      if (!decryptedData) {
        console.error('[GradeService] Cannot decrypt data');
        throw new Error('Không thể giải mã dữ liệu');
      }

      const apiData = JSON.parse(decryptedData);
      
      // console.log('[GradeService] API Data type:', Array.isArray(apiData) ? 'Array' : 'Object');
      // console.log('[GradeService] Full API Data:', JSON.stringify(apiData, null, 2));
      
      // API trả về trực tiếp array, không phải object có key Data
      const decisions = Array.isArray(apiData) ? apiData : (apiData.Data || []);
      // console.log('[GradeService] Got decisions:', decisions.length, 'items');
      
      return decisions;
    } catch (error) {
      console.error('[GradeService] Error fetching quyet dinh:', error);
      throw error;
    }
  }

  // Lấy danh sách văn bằng - chứng chỉ
  async getVanBangChungChi(): Promise<VanBangChungChi[]> {
    try {
      // console.log('[GradeService] Getting van bang chung chi...');
      const token = await this.getAuthToken();
      const userId = await this.getUserId();
      
      // console.log('[GradeService] User ID:', userId.substring(0, 8) + '...');

      const requestBody = {
        func: 'pkg_congthongtin_hssv_thongtin.LayDSTN_KetQua_CongNhan_VB',
        iM: 'AzzSystem',
        strNguoiDung_Id: userId,
        strChucNang_Id: '458922CCB7064213A3D94F7511852261',
        strNguoiThucHien_Id: userId,
      };

      const encryptionKey = 'DSA4BRIVDx4KJDUQNCAeAi4vJg8pIC8eFwMP';
      
      // console.log('[GradeService] Calling API...');

      const response = await fetch(
        `https://iu.cmcu.edu.vn/sinhvienapi/api/SV_ThongTin_MH/${encryptionKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            A: AE(JSON.stringify(requestBody), encryptionKey),
          }),
        }
      );

      // console.log('[GradeService] Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[GradeService] Response error:', errorText);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const temp = await response.json();
      
      // console.log('[GradeService] Response success:', temp.Success);

      if (!temp.Success) {
        console.error('[GradeService] API error:', temp.Message);
        throw new Error(temp.Message || 'Lỗi khi lấy danh sách văn bằng - chứng chỉ');
      }

      const decryptedData = AD(temp.Data.B, requestBody.iM);

      if (!decryptedData) {
        console.error('[GradeService] Cannot decrypt data');
        throw new Error('Không thể giải mã dữ liệu');
      }

      const apiData = JSON.parse(decryptedData);
      
      // console.log('[GradeService] API Data type:', Array.isArray(apiData) ? 'Array' : 'Object');
      // console.log('[GradeService] Full API Data:', JSON.stringify(apiData, null, 2));
      
      // API trả về trực tiếp array hoặc object có key Data
      const certificates = Array.isArray(apiData) ? apiData : (apiData.Data || []);
      // console.log('[GradeService] Got certificates:', certificates.length, 'items');
      
      return certificates;
    } catch (error) {
      console.error('[GradeService] Error fetching van bang chung chi:', error);
      throw error;
    }
  }

  // Lấy danh sách cảnh báo học vụ
  async getCanhBaoHocVu(): Promise<CanhBaoHocVu[]> {
    try {
      // console.log('[GradeService] Getting canh bao hoc vu...');
      const token = await this.getAuthToken();
      const userId = await this.getUserId();
      const chuongTrinhId = await this.getChuongTrinhId();
      
      //console.log('[GradeService] User ID:', userId.substring(0, 8) + '...');
     // console.log('[GradeService] ChuongTrinh ID:', chuongTrinhId.substring(0, 8) + '...');

      const requestBody = {
        func: 'pkg_congthongtin_hssv_thongtin.LayDSKetQuaXuLyHocVu',
        iM: 'AzzSystem',
        strQLSV_NguoiHoc_Id: userId,
        strDaoTao_ChuongTrinh_Id: chuongTrinhId,
        strChucNang_Id: '458922CCB7064213A3D94F7511852261',
        strNguoiThucHien_Id: userId,
      };

      const encryptionKey = 'DSA4BRIKJDUQNCAZNA04CS4iFzQP';
      
      // console.log('[GradeService] Calling API...');

      const response = await fetch(
        `https://iu.cmcu.edu.vn/sinhvienapi/api/SV_ThongTin_MH/${encryptionKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            A: AE(JSON.stringify(requestBody), encryptionKey),
          }),
        }
      );

      // console.log('[GradeService] Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[GradeService] Response error:', errorText);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const temp = await response.json();
      
      // console.log('[GradeService] Response success:', temp.Success);

      if (!temp.Success) {
        console.error('[GradeService] API error:', temp.Message);
        throw new Error(temp.Message || 'Lỗi khi lấy danh sách cảnh báo học vụ');
      }

      const decryptedData = AD(temp.Data.B, requestBody.iM);

      if (!decryptedData) {
        console.error('[GradeService] Cannot decrypt data');
        throw new Error('Không thể giải mã dữ liệu');
      }

      const apiData = JSON.parse(decryptedData);
      
     // console.log('[GradeService] API Data type:', Array.isArray(apiData) ? 'Array' : 'Object');
    //console.log('[GradeService] Full API Data:', JSON.stringify(apiData, null, 2));
      
      // API trả về trực tiếp array hoặc object có key Data
      const warnings = Array.isArray(apiData) ? apiData : (apiData.Data || []);
      console.log('[GradeService] Got warnings:', warnings.length, 'items');
      
      return warnings;
    } catch (error) {
      console.error('[GradeService] Error fetching canh bao hoc vu:', error);
      throw error;
    }
  }

  // Lấy kết quả rèn luyện
  async getDiemRenLuyen(): Promise<DiemRenLuyenResponse> {
    try {
      // console.log('[GradeService] Getting diem ren luyen...');
      const token = await this.getAuthToken();
      const userId = await this.getUserId();
      
      // console.log('[GradeService] User ID:', userId.substring(0, 8) + '...');

      const requestBody = {
        func: 'pkg_congthongtin_hssv_thongtin.LayKQRenLuyenCaNhan',
        iM: 'AzzSystem',
        strQLSV_NguoiHoc_Id: userId,
        strDaoTao_ChuongTrinh_Id: null,
        strChucNang_Id: '458922CCB7064213A3D94F7511852261',
        strNguoiThucHien_Id: userId,
      };

      const encryptionKey = 'DSA4ChATJC8NNDgkLwIgDykgLwPP';
      
      // console.log('[GradeService] Calling API...');

      const response = await fetch(
        `https://iu.cmcu.edu.vn/sinhvienapi/api/SV_ThongTin_MH/${encryptionKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            A: AE(JSON.stringify(requestBody), encryptionKey),
          }),
        }
      );

      // console.log('[GradeService] Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[GradeService] Response error:', errorText);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const temp = await response.json();
      
      // console.log('[GradeService] Response success:', temp.Success);

      if (!temp.Success) {
        console.error('[GradeService] API error:', temp.Message);
        throw new Error(temp.Message || 'Lỗi khi lấy điểm rèn luyện');
      }

      const decryptedData = AD(temp.Data.B, requestBody.iM);

      if (!decryptedData) {
        console.error('[GradeService] Cannot decrypt data');
        throw new Error('Không thể giải mã dữ liệu');
      }

      const apiData = JSON.parse(decryptedData);
      
      //console.log('[GradeService] Full API Data:', JSON.stringify(apiData, null, 2));
      
      // API trả về trực tiếp object với rsKy, rsNam, rsToanKhoa
      const result = {
        rsKy: apiData.rsKy || [],
        rsNam: apiData.rsNam || [],
        rsToanKhoa: apiData.rsToanKhoa || [],
      };
      
      // console.log('[GradeService] Got diem ren luyen:', {
      //   ky: result.rsKy.length,
      //   nam: result.rsNam.length,
      //   toanKhoa: result.rsToanKhoa.length,
      // });
      
      return result;
    } catch (error) {
      console.error('[GradeService] Error fetching diem ren luyen:', error);
      throw error;
    }
  }
}

export const gradeService = new GradeService();
