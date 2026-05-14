import AsyncStorage from '@react-native-async-storage/async-storage';
import { AE, AD } from '../../../crypto';
import { API_HOSTS } from '../../config/apiHosts';

export interface KeHoachCongNhan {
  ID: string;
  MAKEHOACH?: string;
  TENKEHOACH?: string;
  TEN?: string;
  NGAYBATDAU?: string;
  NGAYKETTHUC?: string;
}

export interface CongNhanDiemItem {
  ID: string;
  DAOTAO_HOCPHAN_ID?: string;
  DAOTAO_HOCPHAN_MA: string;
  DAOTAO_HOCPHAN_TEN: string;
  HOCTRINHAPDUNGHOCTAP?: number | string;
  KETQUA?: number | string | null;
  KETQUAMOI?: number | string | null;
  TINHTRANGCONGNHAN_TEN?: string;
}

export interface DanhMucItem {
  ID: string;
  MA?: string;
  TEN: string;
}

export interface ChungChiItem {
  ID: string;
  MA?: string;
  TEN: string;
  PHANLOAICC_ID?: string;
}

export interface CapDoItem {
  ID: string;
  MA?: string;
  TEN: string;
  DIEM_THONGTIN_CHUNGCHI_ID?: string;
}

export interface DauDiemItem {
  ID: string;
  DIEM_THANHPHANDIEM_ID?: string;
  DIEM_THANHPHANDIEM_TEN: string;
  THANGDIEM_TEN?: string;
  THANGDIEM_MA?: string;
  GHICHU?: string;
}

export interface BangDiemEntry {
  ID: string;
  TENHOCPHAN: string;
  SOTINCHI: number | string;
  DIEM: number | string;
}

export interface CoSoDaoTaoItem {
  ID: string;
  MA?: string;
  TEN: string;
}

class GradeRecognitionService {
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
    endpoint: string,
    encryptionKey: string,
    body: Record<string, any>
  ): Promise<T | null> {
    const token = await this.getAuthToken();
    const requestBody = { iM: 'AzzSystem', ...body };
    const url = `${endpoint}/${encryptionKey}`;

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

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const temp = await response.json();
    if (!temp.Success) {
      throw new Error(temp.Message || 'API trả về Success=false');
    }

    if (!temp.Data?.B) return null;
    const decrypted = AD(temp.Data.B, requestBody.iM);
    if (!decrypted) return null;
    return JSON.parse(decrypted) as T;
  }

  async getKeHoachCongNhan(): Promise<KeHoachCongNhan[]> {
    const userId = await this.getUserId();
    const data = await this.postEncrypted<any>(
      `${API_HOSTS.sinhVien}/SV_CongNhanDiem_MH`,
      'DSA4BRIKJAkuICIpAi4vJg8pIC8P',
      {
        func: 'pkg_congthongtin_congnhandiem.LayDSKeHoachCongNhan',
        strNguoiThucHien_Id: userId,
      }
    );
    if (!data) return [];
    return Array.isArray(data) ? data : data.Data || [];
  }

  async getCongNhanDiem(keHoachId: string): Promise<CongNhanDiemItem[]> {
    const userId = await this.getUserId();
    const chuongTrinhId = await this.getChuongTrinhId();
    if (!chuongTrinhId) {
      throw new Error('Không xác định được chương trình đào tạo');
    }

    const data = await this.postEncrypted<any>(
      `${API_HOSTS.sinhVien}/SV_CongNhanDiem_MH`,
      'DSA4BRICKTQuLyYVMygvKQkuIgPP',
      {
        func: 'pkg_congthongtin_congnhandiem.LayDSChuongTrinhHoc',
        strNguoiThucHien_Id: userId,
        strDaoTao_ChuongTrinh_Id: chuongTrinhId,
        strDiem_KeHoachCongNhan_Id: keHoachId,
      }
    );
    if (!data) return [];
    return Array.isArray(data) ? data : data.Data || [];
  }

  // Loại chứng chỉ (danh mục chung)
  async getLoaiChungChi(): Promise<DanhMucItem[]> {
    const token = await this.getAuthToken();
    const url = `${API_HOSTS.cms}/CMS_DanhMucThuocTinh/LayDanhSachDuLieuTheoBangDM?strMaBangDanhMuc=DIEM.CHUNGCHI.PHANLOAI&strTieuChiSapXep=&dTrangThai=1`;
    const response = await fetch(url, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) return [];
    const json = await response.json();
    if (!json.Success) return [];
    return json.Data || [];
  }

  async getTenChungChi(loaiId: string): Promise<ChungChiItem[]> {
    const data = await this.postEncrypted<any>(
      `${API_HOSTS.sinhVien}/SV_CongNhanDiem_MH`,
      'DSA4BRIFKCQsHhUpLi8mFSgvHgIpNC8mAiko',
      {
        func: 'pkg_congthongtin_congnhandiem.LayDSDiem_ThongTin_ChungChi',
        strPhanLoaiCC_Id: loaiId,
        strNguoiThucHien_Id: await this.getUserId(),
      }
    );
    if (!data) return [];
    return Array.isArray(data) ? data : data.Data || [];
  }

  async getCapDo(loaiId: string, chungChiId: string): Promise<CapDoItem[]> {
    const data = await this.postEncrypted<any>(
      `${API_HOSTS.sinhVien}/SV_CongNhanDiem_MH`,
      'DSAYBRIFKCQsHhUVHgICHgIgMQUu',
      {
        func: 'pkg_congthongtin_congnhandiem.LaYDSDiem_TT_CC_CapDo',
        strPhanLoaiCC_Id: loaiId,
        strDiem_ThongTin_ChungChi_Id: chungChiId,
        strDaoTao_HocPhan_Id: '',
        strNguoiThucHien_Id: await this.getUserId(),
      }
    );
    if (!data) return [];
    return Array.isArray(data) ? data : data.Data || [];
  }

  async getDauDiem(capDoId: string): Promise<DauDiemItem[]> {
    const data = await this.postEncrypted<any>(
      `${API_HOSTS.sinhVien}/SV_CongNhanDiem_MH`,
      'DSA4BRIFIDQFKCQsHgICHgIgMQUuHhA0OAUuKAPP',
      {
        func: 'pkg_congthongtin_congnhandiem.LayDSDauDiem_CC_CapDo_QuyDoi',
        strDiem_ThongTin_CC_CapDo_Id: capDoId,
        strNguoiThucHien_Id: await this.getUserId(),
      }
    );
    if (!data) return [];
    return Array.isArray(data) ? data : data.Data || [];
  }

  async getBangDiemList(params: {
    chuongTrinhId: string;
    keHoachId: string;
    hocPhanId: string;
  }): Promise<BangDiemEntry[]> {
    const userId = await this.getUserId();
    const data = await this.postEncrypted<any>(
      `${API_HOSTS.sinhVien}/SV_CongNhanDiem_MH`,
      'DSA4BRIFKCQsHg8mNC4oCS4iHgUoJCweAg8eCREP',
      {
        func: 'pkg_congthongtin_congnhandiem.LayDSDiem_NguoiHoc_Diem_CN_HP',
        strQLSV_NguoiHoc_Id: userId,
        strDaoTao_ChuongTrinh_Id: params.chuongTrinhId,
        strDiem_KeHoachCongNhan_Id: params.keHoachId,
        strDaoTao_HocPhan_Id: params.hocPhanId,
        strNguoiThucHien_Id: userId,
      }
    );
    if (!data) return [];
    return Array.isArray(data) ? data : data.Data || [];
  }

  async themBangDiemEntry(params: {
    chuongTrinhId: string;
    keHoachId: string;
    hocPhanId: string;
    tenHocPhan: string;
    soTinChi: string | number;
    diem: string | number;
    coSoDaoTaoId?: string;
  }): Promise<{ Success: boolean; Message: string }> {
    const userId = await this.getUserId();
    const data = await this.postEncryptedRaw(
      `${API_HOSTS.sinhVien}/SV_CongNhanDiem_MH`,
      'FSkkLB4FKCQsHg8mNC4oCS4iHgUoJCweAg8eCREP',
      {
        func: 'pkg_congthongtin_congnhandiem.Them_Diem_NguoiHoc_Diem_CN_HP',
        strId: '',
        strQLSV_NguoiHoc_Id: userId,
        strDaoTao_ChuongTrinh_Id: params.chuongTrinhId,
        strDiem_KeHoachCongNhan_Id: params.keHoachId,
        strDaoTao_HocPhan_Id: params.hocPhanId,
        strTenHocPhan: params.tenHocPhan,
        dSoTinChi: params.soTinChi,
        dDiem: params.diem,
        strDiem_CoSoDaoTaoCongNhanDiem_Id: params.coSoDaoTaoId || '',
        strNguoiThucHien_Id: userId,
      }
    );
    return { Success: !!data?.Success, Message: data?.Message || '' };
  }

  async xoaBangDiemEntry(entryId: string): Promise<{ Success: boolean; Message: string }> {
    const userId = await this.getUserId();
    const data = await this.postEncryptedRaw(
      `${API_HOSTS.sinhVien}/SV_CongNhanDiem_MH`,
      'GS4gHgUoJCweDyY0LigJLiIeBSgkLB4CDx4JEQPP',
      {
        func: 'pkg_congthongtin_congnhandiem.Xoa_Diem_NguoiHoc_Diem_CN_HP',
        strId: entryId,
        strNguoiThucHien_Id: userId,
      }
    );
    return { Success: !!data?.Success, Message: data?.Message || '' };
  }

  private async postEncryptedRaw(
    endpoint: string,
    encryptionKey: string,
    body: Record<string, any>
  ): Promise<{ Success: boolean; Message: string; Data?: any } | null> {
    const token = await this.getAuthToken();
    const requestBody = { iM: 'AzzSystem', ...body };
    const response = await fetch(`${endpoint}/${encryptionKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        A: AE(JSON.stringify(requestBody), encryptionKey),
      }),
    });
    if (!response.ok) return null;
    return await response.json();
  }

  async getThongTinCongNhanTuBangDiem(keHoachId: string): Promise<any[]> {
    const userId = await this.getUserId();
    const chuongTrinhId = await this.getChuongTrinhId();
    const data = await this.postEncrypted<any>(
      `${API_HOSTS.sinhVien}/SV_CongNhanDiem_MH`,
      'DSA4FRUCLi8mDykgLxU0AyAvJgUoJCwP',
      {
        func: 'pkg_congthongtin_congnhandiem.LayTTCongNhanTuBangDiem',
        strQLSV_NguoiHoc_Id: userId,
        strDaoTao_ChuongTrinh_Id: chuongTrinhId,
        strDiem_KeHoachCongNhan_Id: keHoachId,
      }
    );
    if (!data) return [];
    return Array.isArray(data) ? data : data.Data || [];
  }
}

export const gradeRecognitionService = new GradeRecognitionService();
export default gradeRecognitionService;
