import AsyncStorage from '@react-native-async-storage/async-storage';
import { AE, AD } from '../../../crypto';
import { API_HOSTS } from '../../config/apiHosts';

export interface OneStopStats {
  TONGSOYEUCAUDAGUI?: number;
  TONGSOYEUCAUDADUOCXULY?: number;
  TONGSOYEUCAUDANGXULY?: number;
  TONGSOYEUCAUCANHOANTHIEN?: number;
}

export interface OneStopRequest {
  ID: string;
  MAYEUCAU?: string;
  YEUCAU_TEN?: string;
  NGAYTAO_DD_MM_YYYY_HHMMSS?: string;
  TINHTRANGXULY_THOIGIAN?: string;
  THOIGIANHOANTHANHDUKIEN?: string;
  SOTIEN?: number | string;
}

class OneStopService {
  private async getAuthToken(): Promise<string> {
    const token = await AsyncStorage.getItem('access_token');
    if (!token) throw new Error('No authentication token');
    return token;
  }

  private async getUserId(): Promise<string> {
    const userDataStr = await AsyncStorage.getItem('userData');
    if (userDataStr) {
      const userData = JSON.parse(userDataStr);
      if (userData.sub) return userData.sub.split(';')[0];
    }
    throw new Error('No user ID');
  }

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

  private async postEncrypted<T = any>(
    controller: string,
    encryptionKey: string,
    body: Record<string, any>
  ): Promise<T | null> {
    const token = await this.getAuthToken();
    const requestBody = { iM: 'AzzSystem', ...body };
    const url = `${API_HOSTS.sinhVien}/${controller}/${encryptionKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        A: AE(JSON.stringify(requestBody), encryptionKey),
      }),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const temp = await response.json();
    if (!temp.Success) throw new Error(temp.Message || 'Success=false');
    if (!temp.Data?.B) return null;
    const decrypted = AD(temp.Data.B, requestBody.iM);
    if (!decrypted) return null;
    return JSON.parse(decrypted) as T;
  }

  async getStats(): Promise<OneStopStats> {
    const userId = await this.getUserId();
    const chuongTrinhId = await this.getChuongTrinhId();
    const data = await this.postEncrypted<any>(
      'SV_DVMC_YeuCau_MH',
      'DSA4FRUVLi8mCS4xBRcMAh4YJDQCIDQeDykgLwPP',
      {
        func: 'pkg_dvmc_yeucau.LayTTTongHopDVMC_YeuCau_Nhan',
        strQLSV_NguoiHoc_Id: userId,
        strDaoTao_ChuongTrinh_Id: chuongTrinhId,
        strChucNang_Id: '',
        strNguoiThucHien_Id: userId,
      }
    );
    if (!data) return {};
    const list = Array.isArray(data) ? data : data.Data || [];
    return list[0] || {};
  }

  async getYeuCauList(): Promise<OneStopRequest[]> {
    const userId = await this.getUserId();
    const chuongTrinhId = await this.getChuongTrinhId();
    const data = await this.postEncrypted<any>(
      'SV_DVMC_Chung_MH',
      'DSA4BRIYJDQCIDQVKSQuESkgLBco',
      {
        func: 'pkg_dvmc_chung.LayDSYeuCauTheoPhamVi',
        strQLSV_NguoiHoc_Id: userId,
        strDaoTao_ChuongTrinh_Id: chuongTrinhId,
        strNguoiThucHien_Id: userId,
      }
    );
    if (!data) return [];
    return Array.isArray(data) ? data : data.Data || [];
  }
}

export const oneStopService = new OneStopService();
export default oneStopService;
