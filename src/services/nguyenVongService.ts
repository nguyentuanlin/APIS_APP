import AsyncStorage from '@react-native-async-storage/async-storage';
import { AE, AD } from '../../crypto';
import { API_HOSTS } from '../config/apiHosts';

export interface KeHoachNguyenVong {
  ID: string;
  TEN?: string;
  MAKEHOACH?: string;
  TENKEHOACH?: string;
  NGAYBATDAU?: string;
  NGAYKETTHUC?: string;
  SOTINCHITOIDA?: number | string;
}

export interface KieuHocItem {
  ID: string;
  TEN: string;
  MA?: string;
}

export interface NguyenVongItem {
  ID: string;
  DAOTAO_HOCPHAN_ID?: string;
  DAOTAO_HOCPHAN_MA: string;
  DAOTAO_HOCPHAN_TEN: string;
  HOCTRINHAPDUNGHOCTAP?: number | string;
  DIEM?: number | string | null;
  DANHGIA_ID?: string;
  DANHGIA_TEN?: string;
  THONGTINQUANHEHOCPHAN?: string;
  THUOCKHOIKIENTHUC?: string;
  THOIGIAN?: string;
  NGUOITAO_TENDAYDU?: string;
  NGAYTAO?: string;
  DANGKY_KEHOACHLAYNGUYENVONG_ID?: string;
}

class NguyenVongService {
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

  async getChuongTrinhId(): Promise<string> {
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
    const url = `${API_HOSTS.dangKyHoc}/DKH_NguyenVong_MH/${encryptionKey}`;
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
    const url = `${API_HOSTS.dangKyHoc}/DKH_NguyenVong_MH/${encryptionKey}`;
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

  async getKeHoach(): Promise<KeHoachNguyenVong[]> {
    const userId = await this.getUserId();
    const chuongTrinhId = await this.getChuongTrinhId();
    const data = await this.postEncrypted<any>(
      'DSA4BRIKJAkuICIpBSAvJgo4DyY0OCQvFy4vJgPP',
      {
        func: 'pkg_dangky_nguyenvong.LayDSKeHoachDangKyNguyenVong',
        strDaoTao_ChuongTrinh_Id: chuongTrinhId,
        strQLSV_NguoiHoc_Id: userId,
        strNguoiThucHien_Id: userId,
      }
    );
    if (!data) return [];
    return Array.isArray(data) ? data : data.Data || [];
  }

  async getKieuHoc(keHoachId: string): Promise<KieuHocItem[]> {
    if (!keHoachId) return [];
    const userId = await this.getUserId();
    const chuongTrinhId = await this.getChuongTrinhId();
    const data = await this.postEncrypted<any>(
      'DSA4BRIKKCQ0BSAvJgo4FSkkLgokCS4gIikP',
      {
        func: 'pkg_dangky_nguyenvong.LayDSKieuDangKyTheoKeHoach',
        strKeHoachNguyenVong_Id: keHoachId,
        strDaoTao_ChuongTrinh_Id: chuongTrinhId,
        strQLSV_NguoiHoc_Id: userId,
        strNguoiThucHien_Id: userId,
      }
    );
    if (!data) return [];
    return Array.isArray(data) ? data : data.Data || [];
  }

  async getChuaDangKy(params: {
    keHoachId: string;
    kieuHocId: string;
  }): Promise<NguyenVongItem[]> {
    const userId = await this.getUserId();
    const chuongTrinhId = await this.getChuongTrinhId();
    const data = await this.postEncrypted<any>(
      'DSA4BRIJLiIRKSAvAik0IAUgLyYKOAPP',
      {
        func: 'pkg_dangky_nguyenvong.LayDSHocPhanChuaDangKy',
        strKeHoachNguyenVong_Id: params.keHoachId,
        strKieuHoc_Id: params.kieuHocId,
        strDaoTao_ChuongTrinh_Id: chuongTrinhId,
        strQLSV_NguoiHoc_Id: userId,
        strNguoiThucHien_Id: userId,
      }
    );
    if (!data) return [];
    return Array.isArray(data) ? data : data.Data || [];
  }

  async getDaDangKy(params: {
    keHoachId: string;
    kieuHocId: string;
  }): Promise<NguyenVongItem[]> {
    const userId = await this.getUserId();
    const chuongTrinhId = await this.getChuongTrinhId();
    const data = await this.postEncrypted<any>(
      'DSA4BRIJLiIRKSAvBSAFIC8mCjgP',
      {
        func: 'pkg_dangky_nguyenvong.LayDSHocPhanDaDangKy',
        strKeHoachNguyenVong_Id: params.keHoachId,
        strKieuHoc_Id: params.kieuHocId,
        strDaoTao_ChuongTrinh_Id: chuongTrinhId,
        strQLSV_NguoiHoc_Id: userId,
        strNguoiThucHien_Id: userId,
      }
    );
    if (!data) return [];
    return Array.isArray(data) ? data : data.Data || [];
  }

  async dangKy(item: NguyenVongItem, keHoachId: string) {
    const userId = await this.getUserId();
    const chuongTrinhId = await this.getChuongTrinhId();
    return this.postRaw('BSAvJgo4DyY0OCQvFy4vJgPP', {
      func: 'pkg_dangky_nguyenvong.DangKyNguyenVong',
      strQLSV_NguoiHoc_Id: userId,
      strDaoTao_ChuongTrinh_Id: chuongTrinhId,
      strNguoiThucHien_Id: userId,
      strDangKy_KeHoachDangKy_Id: keHoachId,
      strDaoTao_HocPhan_Id: item.DAOTAO_HOCPHAN_ID,
      strDanhGia_Id: item.DANHGIA_ID || '',
    });
  }

  async huyDangKy(item: NguyenVongItem) {
    const userId = await this.getUserId();
    const chuongTrinhId = await this.getChuongTrinhId();
    return this.postRaw('CTQ4BSAvJgo4DyY0OCQvFy4vJgPP', {
      func: 'pkg_dangky_nguyenvong.HuyDangKyNguyenVong',
      strIds: item.ID,
      strQLSV_NguoiHoc_Id: userId,
      strDaoTao_ChuongTrinh_Id: chuongTrinhId,
      strNguoiThucHien_Id: userId,
      strDangKy_KeHoachDangKy_Id: item.DANGKY_KEHOACHLAYNGUYENVONG_ID || '',
    });
  }
}

export const nguyenVongService = new NguyenVongService();
export default nguyenVongService;
