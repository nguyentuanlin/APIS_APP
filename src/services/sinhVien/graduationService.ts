import AsyncStorage from '@react-native-async-storage/async-storage';
import { AE, AD } from '../../../crypto';
import { API_HOSTS } from '../../config/apiHosts';

export interface KeHoachXetTN {
  ID: string;
  TEN: string; // Đợt xét duyệt
  PHANLOAI_TEN?: string; // Loại xét
  TINHTRANGDANGKY?: string; // Xác nhận theo kế hoạch
  NGAYBATDAU?: string;
  NGAYKETTHUC?: string;
}

class GraduationService {
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

  async getKeHoachXetTN(): Promise<KeHoachXetTN[]> {
    const token = await this.getAuthToken();
    const userId = await this.getUserId();
    const chuongTrinhId = await this.getChuongTrinhId();

    const encryptionKey = 'DSA4BRIKJAkuICIpAiAPKSAv';
    const requestBody = {
      func: 'pkg_totnghiep_dangky.LayDSKeHoachCaNhan',
      iM: 'AzzSystem',
      strDaoTao_ChuongTrinh_Id: chuongTrinhId,
      strNguoiThucHien_Id: userId,
    };

    const response = await fetch(
      `${API_HOSTS.totNghiep}/TN_DangKy_MH/${encryptionKey}`,
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

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const temp = await response.json();
    if (!temp.Success) {
      throw new Error(temp.Message || 'API trả về Success=false');
    }
    if (!temp.Data?.B) return [];
    const decrypted = AD(temp.Data.B, requestBody.iM);
    if (!decrypted) return [];
    const apiData = JSON.parse(decrypted);
    return Array.isArray(apiData) ? apiData : apiData.Data || [];
  }
}

export const graduationService = new GraduationService();
export default graduationService;
