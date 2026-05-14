import AsyncStorage from '@react-native-async-storage/async-storage';
import { AE, AD } from '../../../crypto';
import { API_HOSTS } from '../../config/apiHosts';

export interface LecturerRole {
  ID: string;
  MAVAITRO: string;
  TENVAITRO: string;
  MOTA: string | null;
  TENANH: string | null;
  CHOPHEPTHUVAI: number;
}

export interface LecturerProfile {
  ID: string;
  HODEM: string;
  TEN: string;
  HOTEN?: string;
  MASO?: string;
  EMAIL?: string;
  ANH?: string;
  NGAYSINH?: string;
  GIOITINH_TEN?: string;
  TINHTRANGNHANSU_TEN?: string;
  LOAIDOITUONG_TEN?: string;
  LOAIGIANGVIEN_TEN?: string;
  DAOTAO_COCAUTOCHUC_ID?: string;
  [key: string]: any;
}

export interface LecturerMenuItem {
  ID: string;
  TENCHUCNANG: string;
  MACHUCNANG: string;
  TENANH: string | null;
  DUONGDANHIENTHI: string;
  DUONGDANFILE: string;
  CHUCNANGCHA_ID: string | null;
  CHUNG_UNGDUNG_ID: string;
  MAUNGDUNG?: string;
  TENUNGDUNG?: string;
  THUTU: string;
  TENFILEDINHKEM?: string | null;
  NOIDUNG?: string | null;
  DUONGDANHINHANHMINHHOA?: string | null;
}

export const LECTURER_ROLE_CODE = 'ApisCongCanBo';

class LecturerService {
  private async getAuthToken(): Promise<string> {
    const token = await AsyncStorage.getItem('access_token');
    if (!token) throw new Error('No authentication token found');
    return token;
  }

  private async getUserId(): Promise<string> {
    const userDataStr = await AsyncStorage.getItem('userData');
    if (userDataStr) {
      const userData = JSON.parse(userDataStr);
      if (userData.sub) return String(userData.sub).split(';')[0];
    }

    const token = await AsyncStorage.getItem('access_token');
    if (token && token.includes('.')) {
      const parts = token.split('.');
      if (parts.length >= 2) {
        const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
        const pad = base64.length % 4;
        const padded = base64 + (pad ? '='.repeat(4 - pad) : '');
        const payload = JSON.parse(
          decodeURIComponent(
            atob(padded)
              .split('')
              .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
              .join('')
          )
        );
        if (payload.sub) return String(payload.sub).split(';')[0];
      }
    }
    throw new Error('No user ID found');
  }

  private async callEncrypted<T = any>(
    actionPath: string,
    encryptionKey: string,
    payload: Record<string, any>
  ): Promise<T> {
    const token = await this.getAuthToken();

    const response = await fetch(`${API_HOSTS.cms}/${actionPath}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ A: AE(JSON.stringify(payload), encryptionKey) }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const temp = await response.json();
    if (!temp.Success) {
      throw new Error(temp.Message || 'API trả về Success=false');
    }

    if (temp.Data && typeof temp.Data === 'object' && 'B' in temp.Data) {
      const decrypted = AD(temp.Data.B, payload.iM);
      if (!decrypted) throw new Error('Không thể giải mã dữ liệu');
      return JSON.parse(decrypted) as T;
    }
    return temp.Data as T;
  }

  // GET nhansuapi/api/NS_HoSoV2/LayChiTiet?strId=<userId> — plain, không encrypted
  async getProfile(): Promise<LecturerProfile | null> {
    const token = await this.getAuthToken();
    const userId = await this.getUserId();
    const url = `${API_HOSTS.nhanSu}/NS_HoSoV2/LayChiTiet?strId=${encodeURIComponent(userId)}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const result = await response.json();
    if (!result.Success) {
      throw new Error(result.Message || 'NS_HoSoV2/LayChiTiet trả về Success=false');
    }
    const data = result.Data;
    if (Array.isArray(data) && data.length > 0) return data[0] as LecturerProfile;
    if (data && typeof data === 'object') return data as LecturerProfile;
    return null;
  }

  async getRoles(): Promise<LecturerRole[]> {
    const userId = await this.getUserId();
    const encryptionKey = 'DSA4BRIXICgVMy4PJjQuKAU0LyYP';
    const payload = {
      func: 'PKG_CORE_QUANTRI_01.LayDSVaiTroNguoiDung',
      iM: 'AzzSystem',
      strNguoiThucHien_Id: userId,
      strChucNang_Id: '',
      strChucNangHeThong_Id: '',
    };
    const data = await this.callEncrypted<LecturerRole[] | { Data: LecturerRole[] }>(
      `CMS_QuanTri01_MH/${encryptionKey}`,
      encryptionKey,
      payload
    );
    if (Array.isArray(data)) return data;
    return (data as any)?.Data || [];
  }

  async getMenuByRole(roleId: string): Promise<LecturerMenuItem[]> {
    const userId = await this.getUserId();
    const encryptionKey = 'DSA4BRICKTQiDyAvJg8mNC4oBTQvJgPP';
    const payload = {
      func: 'PKG_CORE_QUANTRI_01.LayDSChucNangNguoiDung',
      iM: 'AzzSystem',
      strNguoiThucHien_Id: userId,
      strVaiTroDangNhap_Id: roleId,
      strVaiTro_Id: roleId,
      strChucNang_Id: '',
      strChucNangHeThong_Id: '',
    };
    const data = await this.callEncrypted<any>(
      `CMS_QuanTri01_MH/${encryptionKey}`,
      encryptionKey,
      payload
    );

    if (Array.isArray(data)) return data;
    if (data?.rs && Array.isArray(data.rs)) return data.rs;
    if (data?.Data?.rs && Array.isArray(data.Data.rs)) return data.Data.rs;
    return [];
  }

  getParentMenus(items: LecturerMenuItem[]): LecturerMenuItem[] {
    return items
      .filter((i) => i.CHUCNANGCHA_ID === null)
      .sort((a, b) => parseInt(a.THUTU || '0') - parseInt(b.THUTU || '0'));
  }

  getChildMenus(items: LecturerMenuItem[], parentId: string): LecturerMenuItem[] {
    return items
      .filter((i) => i.CHUCNANGCHA_ID === parentId)
      .sort((a, b) => parseInt(a.THUTU || '0') - parseInt(b.THUTU || '0'));
  }
}

export const lecturerService = new LecturerService();
export default lecturerService;
