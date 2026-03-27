import AsyncStorage from '@react-native-async-storage/async-storage';
import { AE, AD } from '../../crypto';

// Interfaces
export interface KeHoachItem {
  ID: string;
  MA: string;
  TEN: string;
  TUNGAY: string;
  DENNGAY: string;
  DAOTAO_THOIGIANDAOTAO_ID: string;
  DAOTAO_THOIGIANDAOTAO_NAM: number;
  DAOTAO_THOIGIANDAOTAO_KY: number;
}

export interface FileItem {
  ID: string;
  TEN: string;
  DUONGDAN: string;
  KICHCO: number;
  NGAYTAO: string;
}

class ConfirmationService {
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
      console.error('[ConfirmationService] Error getting user ID:', error);
      throw error;
    }
  }

  // Lấy danh sách kế hoạch
  async getKeHoachList(): Promise<KeHoachItem[]> {
    try {
      const token = await this.getAuthToken();
      const userId = await this.getUserId();

      const requestBody = {
        func: 'pkg_diemrenluyen_tinhtoan.LayDSKeHoach',
        iM: 'AzzSystem',
        strNguoiThucHien_Id: userId,
        strChucNang_Id: 'DAC468818D094C01A36A5FD220EF40BB',
      };

      const encryptionKey = 'DSA4BRIKJAkuICIp';
      
      const response = await fetch(`https://iu.cmcu.edu.vn/xulyhocvuapi/api/XLHV_RL_TinhToan_MH/${encryptionKey}`, {
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
        console.error('[ConfirmationService] Response error:', errorText);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const temp = await response.json();
      
      if (!temp.Success) {
        console.error('[ConfirmationService] API error:', temp.Message);
        throw new Error(temp.Message || 'Lỗi khi lấy danh sách kế hoạch');
      }

      const decryptedData = AD(temp.Data.B, requestBody.iM);
      
      if (!decryptedData) {
        console.error('[ConfirmationService] Cannot decrypt data');
        throw new Error('Không thể giải mã dữ liệu');
      }

      const apiData = JSON.parse(decryptedData);
      const keHoachList = Array.isArray(apiData) ? apiData : (apiData.Data || []);
      
      // console.log('[ConfirmationService] Ke hoach list:', keHoachList.length);
      
      return keHoachList;
    } catch (error) {
      console.error('[ConfirmationService] Error fetching ke hoach:', error);
      throw error;
    }
  }

  // Kiểm tra hoàn thành
  async kiemTraHoanThanh(): Promise<boolean> {
    try {
      const token = await this.getAuthToken();
      const userId = await this.getUserId();

      const requestBody = {
        func: 'khaosat_kehoach.KiemTraHoanThanh',
        iM: 'AzzSystem',
        strNguoiThucHien_Id: userId,
        strDoiTuongId: userId,
        strMaChucNang: 'LOGIN',
        strChucNang_Id: 'DAC468818D094C01A36A5FD220EF40BB',
      };

      const encryptionKey = 'CigkLBUzIAkuIC8VKSAvKQPP';
      
      const response = await fetch(`https://iu.cmcu.edu.vn/tuyensinhapi/api/TS_KS_KeHoach_MH/${encryptionKey}`, {
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
        return false;
      }

      const decryptedData = AD(temp.Data.B, requestBody.iM);
      
      if (!decryptedData) {
        return false;
      }

      return decryptedData === '1';
    } catch (error) {
      console.error('[ConfirmationService] Error checking completion:', error);
      return false;
    }
  }

  // Lấy danh sách files
  async getFilesList(keHoachId: string): Promise<FileItem[]> {
    try {
      const token = await this.getAuthToken();
      const userId = await this.getUserId();

      // Construct the data ID (userId + keHoachId + some other IDs)
      const dataId = `${userId}${keHoachId}2E2AB291141C4C24A74227B30011CB0D`;

      const response = await fetch(
        `https://iu.cmcu.edu.vn/sinhvienapi/api/SV_Files/LayDanhSach?` +
        `action=SV_Files/LayDanhSach&` +
        `strDuLieu_Id=${dataId}&` +
        `strChucNang_Id=DAC468818D094C01A36A5FD220EF40BB&` +
        `strNguoiThucHien_Id=${userId}&` +
        `_=${Date.now()}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.Success) {
        return [];
      }

      return data.Data || [];
    } catch (error) {
      console.error('[ConfirmationService] Error fetching files:', error);
      return [];
    }
  }
}

export default new ConfirmationService();
