import AsyncStorage from '@react-native-async-storage/async-storage';
import { AE, AD } from '../../crypto';

// Interfaces
export interface ChuongTrinhItem {
  ID: string;
  QLSV_NGUOIHOC_ID: string;
  QLSV_NGUOIHOC_MASO: string;
  QLSV_NGUOIHOC_HODEM: string;
  QLSV_NGUOIHOC_TEN: string;
  DAOTAO_TOCHUCCHUONGTRINH_ID: string;
  DAOTAO_TOCHUCCHUONGTRINH_MA: string;
  DAOTAO_TOCHUCCHUONGTRINH_TEN: string;
  DAOTAO_LOPQUANLY_ID: string;
  DAOTAO_LOPQUANLY_MA: string;
  DAOTAO_LOPQUANLY_TEN: string;
  TONGSOTINCHIQUYDINH: number;
}

export interface KhoiBatBuocItem {
  ID: string;
  KYHIEU: string;
  TEN: string;
  THUTU: number;
  TONGSOHOCPHAN: number;
  TONGSOTINCHI: number;
  TONGSOTINCHITINHPHI: number;
  DAOTAO_TOCHUCCHUONGTRINH_ID: string;
  DAOTAO_KHOIBATBUOC_CHA_ID: string | null;
}

export interface HocPhanItem {
  ID: string;
  DAOTAO_HOCPHAN_ID: string;
  DAOTAO_HOCPHAN_MA: string;
  DAOTAO_HOCPHAN_TEN: string;
  DAOTAO_HOCPHAN_SOTINCHI: number;
  DAOTAO_HOCPHAN_SOTIET: number;
  DAOTAO_HOCPHAN_SOTIET_LT: number;
  DAOTAO_HOCPHAN_SOTIET_TH: number;
  DAOTAO_KHOIBATBUOC_ID: string;
  DAOTAO_KHOIBATBUOC_TEN: string;
  HOCKY_BATDAU: number;
  HOCKY_KETTHUC: number;
  PHANLOAI: string;
}

class CurriculumService {
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
      console.error('[CurriculumService] Error getting user ID:', error);
      throw error;
    }
  }

  // Lấy danh sách chương trình
  async getChuongTrinhList(): Promise<ChuongTrinhItem[]> {
    try {
      const token = await this.getAuthToken();
      const userId = await this.getUserId();

      const requestBody = {
        func: 'pkg_dangkyhoc_chung.LayDSChuongTrinh',
        iM: 'AzzSystem',
        strQLSV_NguoiHoc_Id: userId,
        strNguoiThucHien_Id: userId,
        strChucNang_Id: '447511AE19614853B3F46E8F6027E4E8',
      };

      const encryptionKey = 'DSA4BRICKTQuLyYVMygvKQPP';
      
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
        throw new Error(temp.Message || 'Lỗi khi lấy danh sách chương trình');
      }

      const decryptedData = AD(temp.Data.B, requestBody.iM);
      
      if (!decryptedData) {
        throw new Error('Không thể giải mã dữ liệu');
      }

      const apiData = JSON.parse(decryptedData);
      const chuongTrinhList = Array.isArray(apiData) ? apiData : (apiData.Data || []);
      
      // console.log('[CurriculumService] Chuong trinh list:', chuongTrinhList.length);
      
      return chuongTrinhList;
    } catch (error) {
      console.error('[CurriculumService] Error fetching chuong trinh:', error);
      throw error;
    }
  }

  // Lấy danh sách khối bắt buộc
  async getKhoiBatBuocList(toChucCTId: string): Promise<KhoiBatBuocItem[]> {
    try {
      const token = await this.getAuthToken();
      const userId = await this.getUserId();

      const requestBody = {
        func: 'pkg_kehoach_thongtin.LayDSKS_DaoTao_KhoiBatBuoc',
        iM: 'AzzSystem',
        strTuKhoa: '',
        strDaoTao_KhoiBatBuoc_Cha_Id: '',
        strDaoTao_ToChucCT_Id: toChucCTId,
        strNguoiThucHien_Id: userId,
        strChucNang_Id: '447511AE19614853B3F46E8F6027E4E8',
        pageIndex: 1,
        pageSize: 100000,
      };

      const encryptionKey = 'DSA4BRIKEh4FIC4VIC4eCikuKAMgNQM0LiIP';
      
      const response = await fetch(`https://iu.cmcu.edu.vn/kehoachchuongtrinhapi/api/KHCT_ThongTin_MH/${encryptionKey}`, {
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
        throw new Error(temp.Message || 'Lỗi khi lấy danh sách khối bắt buộc');
      }

      const decryptedData = AD(temp.Data.B, requestBody.iM);
      
      if (!decryptedData) {
        throw new Error('Không thể giải mã dữ liệu');
      }

      const apiData = JSON.parse(decryptedData);
      const khoiList = Array.isArray(apiData) ? apiData : (apiData.Data || []);
      
      // console.log('[CurriculumService] Khoi bat buoc list:', khoiList.length);
      if (khoiList.length > 0) {
        // console.log('[CurriculumService] Sample khoi:', JSON.stringify(khoiList[0], null, 2));
      }
      
      return khoiList;
    } catch (error) {
      console.error('[CurriculumService] Error fetching khoi bat buoc:', error);
      throw error;
    }
  }

  // Lấy danh sách học phần
  async getHocPhanList(toChucCTId: string): Promise<HocPhanItem[]> {
    try {
      const token = await this.getAuthToken();
      const userId = await this.getUserId();

      const requestBody = {
        func: 'pkg_kehoach_thongtin.LayDSKS_DaoTao_HocPhan_CT',
        iM: 'AzzSystem',
        strTuKhoa: '',
        strDaoTao_ThoiGian_KH_Id: '',
        strDaoTao_ToChucCT_Id: toChucCTId,
        strNguoiThucHien_Id: userId,
        strChucNang_Id: '447511AE19614853B3F46E8F6027E4E8',
        pageIndex: 1,
        pageSize: 100000,
      };

      const encryptionKey = 'DSA4BRIKEh4FIC4VIC4eCS4iESkgLx4CFR4RAwPP';
      
      const response = await fetch(`https://iu.cmcu.edu.vn/kehoachchuongtrinhapi/api/KHCT_ThongTin_MH/${encryptionKey}`, {
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
      
      if (!decryptedData) {
        throw new Error('Không thể giải mã dữ liệu');
      }

      const apiData = JSON.parse(decryptedData);
      const hocPhanList = Array.isArray(apiData) ? apiData : (apiData.Data || []);
      
      // console.log('[CurriculumService] Hoc phan list:', hocPhanList.length);
      if (hocPhanList.length > 0) {
        // console.log('[CurriculumService] Sample hoc phan:', JSON.stringify(hocPhanList[0], null, 2));
      }
      
      return hocPhanList;
    } catch (error) {
      console.error('[CurriculumService] Error fetching hoc phan:', error);
      throw error;
    }
  }
}

export default new CurriculumService();
