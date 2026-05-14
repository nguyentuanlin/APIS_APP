import AsyncStorage from '@react-native-async-storage/async-storage';
import { AE, AD } from '../../../crypto';
import { API_HOSTS } from '../../config/apiHosts';

export interface DinhHuongChung {
  ID: string;
  TEN: string;
  NGAYBATDAU?: string;
  NGAYKETTHUC?: string;
  CHEDODANGKYDINHHUONG_TEN?: string;
  DAOTAO_TOCHUCCHUONGTRINH_ID?: string;
}

export interface DinhHuongDaDangKy {
  ID: string;
  DAOTAO_CT_DINHHUONG_TEN: string;
  NGAYTAO_DD_MM_YYYY?: string;
}

export interface DinhHuongResponse {
  chuaDangKy: DinhHuongChung[];
  daDangKy: DinhHuongDaDangKy[];
}

class StudyOrientationService {
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
    encryptionKey: string,
    body: Record<string, any>
  ): Promise<T | null> {
    const token = await this.getAuthToken();
    const requestBody = { iM: 'AzzSystem', ...body };
    const url = `${API_HOSTS.keHoachChuongTrinh}/KHCT_ThongTin_MH/${encryptionKey}`;
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

  private async postRaw(
    encryptionKey: string,
    body: Record<string, any>
  ): Promise<{ Success: boolean; Message: string }> {
    const token = await this.getAuthToken();
    const requestBody = { iM: 'AzzSystem', ...body };
    const url = `${API_HOSTS.keHoachChuongTrinh}/KHCT_ThongTin_MH/${encryptionKey}`;
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
    if (!response.ok) return { Success: false, Message: `HTTP ${response.status}` };
    const json = await response.json();
    return { Success: !!json.Success, Message: json.Message || '' };
  }

  async getDinhHuong(): Promise<DinhHuongResponse> {
    const userId = await this.getUserId();
    const chuongTrinhId = await this.getChuongTrinhId();
    const data = await this.postEncrypted<any>(
      'DSA4BRIFKC8pCTQuLyYCIA8pIC8P',
      {
        func: 'pkg_kehoach_thongtin.LayDSDinhHuongCaNhan',
        strQLSV_NguoiHoc_Id: userId,
        strDaoTao_ChuongTrinh_Id: chuongTrinhId,
      }
    );
    if (!data) return { chuaDangKy: [], daDangKy: [] };
    return {
      chuaDangKy: data.rsDSChung || [],
      daDangKy: data.rsKetQuaCaNhan || [],
    };
  }

  async dangKy(item: DinhHuongChung) {
    const userId = await this.getUserId();
    return this.postRaw('FSkkLB4FIC4VIC4eAhUeBSgvKQk0Li8mHg8J', {
      func: 'pkg_kehoach_thongtin.Them_DaoTao_CT_DinhHuong_NH',
      strDaoTao_ChuongTrinh_Id: item.DAOTAO_TOCHUCCHUONGTRINH_ID || '',
      strDaoTao_CT_DinhHuong_Id: item.ID,
      strQLSV_NguoiHoc_Id: userId,
      strSoQuyetDinh: '',
      strNguoiThucHien_Id: userId,
    });
  }

  async huyDangKy(id: string) {
    const userId = await this.getUserId();
    return this.postRaw('GS4gHgUgLhUgLh4CFR4FKC8pCTQuLyYeDwkP', {
      func: 'pkg_kehoach_thongtin.Xoa_DaoTao_CT_DinhHuong_NH',
      strId: id,
      strNguoiThucHien_Id: userId,
    });
  }
}

export const studyOrientationService = new StudyOrientationService();
export default studyOrientationService;
