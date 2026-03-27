import AsyncStorage from '@react-native-async-storage/async-storage';
import { AE, AD } from '../../crypto';

// Interfaces
export interface ThoiGianItem {
  ID: string;
  THOIGIAN: string;
}

export interface PhucKhaoItem {
  ID: string;
  DAOTAO_HOCPHAN_MA: string;
  DAOTAO_HOCPHAN_TEN: string;
  DIEM: number;
  TRANGTHAI: string;
  NGAYGUI: string;
  NOIDUNG: string;
}

class AppealService {
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
      console.error('[AppealService] Error getting user ID:', error);
      throw error;
    }
  }

  // Lấy danh sách thời gian (học kỳ)
  async getThoiGianList(): Promise<ThoiGianItem[]> {
    try {
      const token = await this.getAuthToken();
      const userId = await this.getUserId();

      const requestBody = {
        func: 'pkg_thi_phach_phuckhao.LayThoiGian',
        iM: 'AzzSystem',
        strNguoiThucHien_Id: userId,
        strQLSV_NguoiHoc_Id: userId,
        strChucNang_Id: '3FC6DBD3CF2441FDBD35B08B0E46984E',
      };

      const encryptionKey = 'DSA4FSkuKAYoIC8P';
      
      const response = await fetch(`https://iu.cmcu.edu.vn/xulyhocvuapi/api/XLHV_TP_PhucKhao_MH/${encryptionKey}`, {
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
        throw new Error(temp.Message || 'Lỗi khi lấy danh sách thời gian');
      }

      const decryptedData = AD(temp.Data.B, requestBody.iM);
      
      if (!decryptedData) {
        throw new Error('Không thể giải mã dữ liệu');
      }

      const apiData = JSON.parse(decryptedData);
      const thoiGianList = Array.isArray(apiData) ? apiData : (apiData.Data || []);
      
      // console.log('[AppealService] Thoi gian list:', thoiGianList.length);
      
      return thoiGianList;
    } catch (error) {
      console.error('[AppealService] Error fetching thoi gian:', error);
      throw error;
    }
  }

  // Lấy danh sách phúc khảo cá nhân
  async getPhucKhaoList(thoiGianId: string | null = null): Promise<PhucKhaoItem[]> {
    try {
      const token = await this.getAuthToken();
      const userId = await this.getUserId();

      const requestBody = {
        func: 'pkg_thi_phach_phuckhao.LayDSThiPhucKhaoCaNhan',
        iM: 'AzzSystem',
        strNguoiThucHien_Id: userId,
        strQLSV_NguoiHoc_Id: userId,
        strDaoTao_ThoiGianDaoTao_Id: thoiGianId,
        strChucNang_Id: '3FC6DBD3CF2441FDBD35B08B0E46984E',
      };

      const encryptionKey = 'DSA4BRIVKSgRKTQiCikgLgIgDykgLwPP';
      
      const response = await fetch(`https://iu.cmcu.edu.vn/xulyhocvuapi/api/XLHV_TP_PhucKhao_MH/${encryptionKey}`, {
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
        throw new Error(temp.Message || 'Lỗi khi lấy danh sách phúc khảo');
      }

      const decryptedData = AD(temp.Data.B, requestBody.iM);
      
      if (!decryptedData) {
        throw new Error('Không thể giải mã dữ liệu');
      }

      const apiData = JSON.parse(decryptedData);
      const phucKhaoList = Array.isArray(apiData) ? apiData : (apiData.Data || []);
      
      // console.log('[AppealService] Phuc khao list:', phucKhaoList.length);
      
      return phucKhaoList;
    } catch (error) {
      console.error('[AppealService] Error fetching phuc khao:', error);
      throw error;
    }
  }
}

export default new AppealService();
