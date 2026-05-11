import AsyncStorage from '@react-native-async-storage/async-storage';
import { AE, AD } from '../../crypto';
import { API_HOSTS } from '../config/apiHosts';

export interface KeHoachThiLai {
  ID: string;
  TEN?: string;
  MAKEHOACH?: string;
  TENKEHOACH?: string;
  NGAYBATDAU?: string;
  NGAYKETTHUC?: string;
}

export interface ChuongTrinhThiLai {
  ID: string;
  DAOTAO_TOCHUCCHUONGTRINH_ID?: string;
  DAOTAO_CHUONGTRINH_TEN?: string;
  DAOTAO_CHUONGTRINH_MA?: string;
}

export interface HocPhanThiLai {
  ID: string;
  DAOTAO_HOCPHAN_ID?: string;
  DAOTAO_HOCPHAN_MA: string;
  DAOTAO_HOCPHAN_TEN: string;
  DIEM_THANHPHANDIEM_TEN?: string;
  HOCTRINH?: number | string;
  DIEM?: number | string;
  DANHGIA_TEN?: string;
  THOIGIAN?: string;
  SOTIEN?: number;
  SOTIENDANOP?: number;
  DANGKY_THI_HP_KEHOACH_ID?: string;
}

export interface ThiLaiResponse {
  chuaDangKy: HocPhanThiLai[];
  daDangKy: HocPhanThiLai[];
}

class ExamRetakeService {
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

  private async postEncrypted<T = any>(
    controller: string,
    encryptionKey: string,
    body: Record<string, any>
  ): Promise<T | null> {
    const token = await this.getAuthToken();
    const requestBody = { iM: 'AzzSystem', ...body };
    const url = `${API_HOSTS.dangKyHoc}/${controller}/${encryptionKey}`;
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
    controller: string,
    encryptionKey: string,
    body: Record<string, any>
  ): Promise<{ Success: boolean; Message: string }> {
    const token = await this.getAuthToken();
    const requestBody = { iM: 'AzzSystem', ...body };
    const url = `${API_HOSTS.dangKyHoc}/${controller}/${encryptionKey}`;
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

  async getChuongTrinh(): Promise<ChuongTrinhThiLai[]> {
    const userId = await this.getUserId();
    const data = await this.postEncrypted<any>(
      'DKH_DangKyThi_MonThi_Chung_MH',
      'DSA4BRICKTQuLyYVMygvKQ8mNC4oCS4i',
      {
        func: 'pkg_dangkythi_monthi_chung.LayDSChuongTrinhNguoiHoc',
        strQLSV_NguoiHoc_Id: userId,
        strNguoiThucHien_Id: userId,
      }
    );
    if (!data) return [];
    return Array.isArray(data) ? data : data.Data || [];
  }

  async getKeHoach(chuongTrinhId: string): Promise<KeHoachThiLai[]> {
    const userId = await this.getUserId();
    const data = await this.postEncrypted<any>(
      'DKH_DangKyThi_MonThi_Chung_MH',
      'DSA4BRIKJAkuICIpFSkkLg8mNC4oCS4i',
      {
        func: 'pkg_dangkythi_monthi_chung.LayDSKeHoachTheoNguoiHoc',
        strDaoTao_ChuongTrinh_Id: chuongTrinhId,
        strQLSV_NguoiHoc_Id: userId,
        strNguoiThucHien_Id: userId,
      }
    );
    if (!data) return [];
    return Array.isArray(data) ? data : data.Data || [];
  }

  async getHocPhanList(params: {
    chuongTrinhId: string;
    keHoachId: string;
  }): Promise<ThiLaiResponse> {
    const userId = await this.getUserId();
    const data = await this.postEncrypted<any>(
      'DKH_DangKyThi_MonThi_ThongTin_MH',
      'DSA4BRIJLiIRKSAvBSAvJgo4',
      {
        func: 'pkg_dangkythi_monthi_thongtin.LayDSHocPhanDangKy',
        strChucNang_Id: '',
        strQLSV_NguoiHoc_Id: userId,
        strDaoTao_ChuongTrinh_Id: params.chuongTrinhId,
        strDangKy_Thi_HP_KeHoach_Id: params.keHoachId,
        strNguoiThucHien_Id: userId,
      }
    );
    if (!data) return { chuaDangKy: [], daDangKy: [] };
    return {
      chuaDangKy: data.rsHocPhanDuDK || [],
      daDangKy: data.rsKetQua || [],
    };
  }

  async dangKy(item: HocPhanThiLai) {
    const userId = await this.getUserId();
    return this.postRaw(
      'DKH_DangKyThi_MonThi_ThongTin_MH',
      'FSk0IgkoJC8FIC8mCjgP',
      {
        func: 'pkg_dangkythi_monthi_thongtin.ThucHienDangKy',
        strDangKy_Thi_HP_KeHoach_Id: item.DANGKY_THI_HP_KEHOACH_ID || '',
        strNguoiThucHien_Id: userId,
        strQLHLTL_NguoiHoc_Id: item.ID,
      }
    );
  }

  async huyDangKy(item: HocPhanThiLai) {
    const userId = await this.getUserId();
    return this.postRaw(
      'DKH_DangKyThi_MonThi_ThongTin_MH',
      'FSk0IgkoJC8JNDgFIC8mCjgP',
      {
        func: 'pkg_dangkythi_monthi_thongtin.ThucHienHuyDangKy',
        strId: item.ID,
        strNguoiThucHien_Id: userId,
        strDangKy_Thi_HP_KeHoach_Id: item.DANGKY_THI_HP_KEHOACH_ID || '',
        strDangKy_Thi_HocPhan_KQ_Id: item.ID,
      }
    );
  }
}

export const examRetakeService = new ExamRetakeService();
export default examRetakeService;
