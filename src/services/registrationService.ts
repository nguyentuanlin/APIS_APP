import AsyncStorage from '@react-native-async-storage/async-storage';
import { AE, AD } from '../../crypto';

// Interfaces
export interface ThoiGianHoc {
  ID: string;
  THOIGIAN: string; // Format: "2025_2026_2,1"
}

export interface KetQuaDangKy {
  ID: string;
  DANGKY_LOPHOCPHAN_ID: string;
  DANGKY_LOPHOCPHAN_MA: string;
  DANGKY_LOPHOCPHAN_TEN: string;
  DAOTAO_HOCPHAN_ID: string;
  DAOTAO_HOCPHAN_MA: string;
  DAOTAO_HOCPHAN_TEN: string;
  DAOTAO_HOCPHAN_HOCTRINH: number;
  THONGTINGIANGVIEN: string | null;
  KIEUHOC_MA: string;
  KIEUHOC_TEN: string;
  NGAYTAO_DD_MM_YYYY_HHMMSS: string;
  NGUOITAO_TAIKHOAN: string;
  NGUOITAO_TENDAYDU: string;
  THOIGIAN: string;
  DAOTAO_CHUONGTRINH_TEN: string;
}

export interface LichSuDangKy {
  DANGKY_KEHOACHDANGKY_ID: string;
  DAOTAO_CHUONGTRINH_ID: string;
  DAOTAO_CHUONGTRINH_MA: string;
  DAOTAO_CHUONGTRINH_TEN: string;
  DAOTAO_KHOADAOTAO_TEN: string;
  DAOTAO_LOPQUANLY_MA: string;
  DAOTAO_LOPQUANLY_TEN: string;
  DSLOPHOCPHAN: string;
  HANHDONG: string;
  KETQUA: string | null;
  MACTDT: string;
  MAHOCPHAN: string;
  NGAYTAO: string;
  NGUOITHUCHIEN_ID: string;
  NGUOITHUCHIEN_TAIKHOAN: string;
  NGUOITHUCHIEN_TENDAYDU: string;
  QLSV_NGUOIHOC_HODEM: string;
  QLSV_NGUOIHOC_ID: string;
  QLSV_NGUOIHOC_MASO: string;
  QLSV_NGUOIHOC_TEN: string;
  TENHOCPHAN: string;
  THOIGIANTHUCHIEN: string;
}

export interface RegistrationResponse {
  rsKetQuaDangKy: KetQuaDangKy[];
  rsLichSuDangKy: LichSuDangKy[];
}

class RegistrationService {
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
      console.error('[RegistrationService] Error getting user ID:', error);
      throw error;
    }
  }

  // Lấy danh sách thời gian học
  async getThoiGianHoc(): Promise<ThoiGianHoc[]> {
    try {
      // console.log('[RegistrationService] Getting thoi gian hoc...');
      const token = await this.getAuthToken();
      const userId = await this.getUserId();
      
      // console.log('[RegistrationService] User ID:', userId.substring(0, 8) + '...');

      const requestBody = {
        func: 'pkg_congthongtin_hssv_thongtin.LayDSThoiGianLichHoc',
        iM: 'AzzSystem',
        strChucNang_Id: '458922CCB7064213A3D94F7511852261',
        strQLSV_NguoiHoc_Id: userId,
        strNguoiThucHien_Id: userId,
      };

      const encryptionKey = 'DSA4BRIVKS4oBiggLw0oIikJLiIP';
      
      // console.log('[RegistrationService] Calling API...');
      
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

      // console.log('[RegistrationService] Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[RegistrationService] Response error:', errorText);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const temp = await response.json();
      
      // console.log('[RegistrationService] Response success:', temp.Success);
      
      if (!temp.Success) {
        console.error('[RegistrationService] API error:', temp.Message);
        throw new Error(temp.Message || 'Lỗi khi lấy danh sách thời gian');
      }

      const decryptedData = AD(temp.Data.B, requestBody.iM);
      
      if (!decryptedData) {
        console.error('[RegistrationService] Cannot decrypt data');
        throw new Error('Không thể giải mã dữ liệu');
      }

      const apiData = JSON.parse(decryptedData);
      
      // API trả về trực tiếp array
      const dataArray = Array.isArray(apiData) ? apiData : (apiData.Data || []);
      
      // console.log('[RegistrationService] Got thoi gian list:', dataArray.length, 'items');
      
      return dataArray;
    } catch (error) {
      console.error('[RegistrationService] Error fetching thoi gian hoc:', error);
      throw error;
    }
  }

  // Lấy kết quả đăng ký học
  async getKetQuaDangKy(thoiGianId?: string): Promise<RegistrationResponse> {
    try {
      // console.log('[RegistrationService] Getting ket qua dang ky for:', thoiGianId || 'all');
      const token = await this.getAuthToken();
      const userId = await this.getUserId();

      const requestBody = {
        func: 'pkg_congthongtin_hssv_thongtin.LayKetQuaDangKyHocCaNhan',
        iM: 'AzzSystem',
        strChucNang_Id: '458922CCB7064213A3D94F7511852261',
        strQLSV_NguoiHoc_Id: userId,
        strNguoiThucHien_Id: userId,
        strDaoTao_ThoiGianDaoTao_Id: thoiGianId || '',
      };

      const encryptionKey = 'DSA4CiQ1EDQgBSAvJgo4CS4iAiAPKSAv';
      
      // console.log('[RegistrationService] Calling API...');
      
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

      // console.log('[RegistrationService] Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[RegistrationService] Response error:', errorText);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const temp = await response.json();
      
      // console.log('[RegistrationService] Response success:', temp.Success);
      
      if (!temp.Success) {
        console.error('[RegistrationService] API error:', temp.Message);
        throw new Error(temp.Message || 'Lỗi khi lấy kết quả đăng ký');
      }

      const decryptedData = AD(temp.Data.B, requestBody.iM);
      
      if (!decryptedData) {
        console.error('[RegistrationService] Cannot decrypt data');
        throw new Error('Không thể giải mã dữ liệu');
      }

      const apiData = JSON.parse(decryptedData);
      
      // console.log('[RegistrationService] Got registration data:', {
      //   rsKetQuaDangKy: apiData.rsKetQuaDangKy?.length || 0,
      //   rsLichSuDangKy: apiData.rsLichSuDangKy?.length || 0,
      // });
      
      return {
        rsKetQuaDangKy: apiData.rsKetQuaDangKy || [],
        rsLichSuDangKy: apiData.rsLichSuDangKy || [],
      };
    } catch (error) {
      console.error('[RegistrationService] Error fetching ket qua dang ky:', error);
      throw error;
    }
  }

  // Format thời gian từ "2025_2026_2,1" thành "HK2 2025-2026"
  formatThoiGian(thoigian: string): string {
    const parts = thoigian.split(',');
    if (parts.length !== 2) return thoigian;
    
    const [namHoc, hocKy] = parts;
    const namHocFormatted = namHoc.replace('_', '-');
    
    return `HK${hocKy} ${namHocFormatted}`;
  }
}

export default new RegistrationService();
