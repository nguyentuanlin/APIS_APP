// Khối lượng cá nhân (CCB.KLCN) — port `lichgiang/script/khoiluongcanhan.js`.
// - DS bảng tính + thông tin cán bộ: GET NS_ThongTinCanBo/LayDSKeHoachKLGDChiTietCaNhan
// - DS dữ liệu KL của bảng tính: GET TKGG_KeHoach/LayDSDuLieuKLCaNhan (host TKGG)
// - DS dữ liệu KL toàn bộ (encrypted): POST NS_KLGD_KeHoach_MH/... LayDSDuLieuKLCaNhanTongHop
// - Chi tiết 1 dòng KL: GET TKGG_ThongTin/LayDSDuLieu_ChiTiet (rs + rsThanhPhanCongThuc)
// - Giá trị từ khóa cột mở rộng: GET TKGG_ThongTin/LayGiaTriTuKhoa
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AE, AD } from '../../../crypto';
import { API_HOSTS } from '../../config/apiHosts';

export interface BangTinhItem {
  ID: string;
  TEN: string;
  [k: string]: any;
}

export interface ThongTinCanBoItem {
  ID?: string;
  HODEM?: string;
  TEN?: string;
  MASO?: string;
  DAOTAO_COCAUTOCHUC_TEN?: string;
  [k: string]: any;
}

export interface KhoiLuongRow {
  ID: string;
  LOAI?: string;
  KLGD_KEHOACHCHITIET_ID?: string;
  DAOTAO_HEDAOTAO_TEN?: string;
  THOIGIAN?: string;
  DONVI_PHUTRACH_HOCPHAN_TEN?: string;
  TENLOP?: string;
  TONGPHANBO?: string | number;
  PHANLOAI_TEN?: string;
  QUYMO?: string | number;
  VAITRO_TEN?: string;
  SOLUONG?: string | number;
  SOGIOCHUAN?: string | number;
  TINHTRANGXACNHAN_TEN?: string;
  GHICHU?: string;
  [k: string]: any;
}

export interface ThanhPhanCongThucItem {
  ID: string;
  TUKHOA: string;
  TENTUKHOA?: string;
  XAUCONGTHUC?: string;
  [k: string]: any;
}

export interface ChiTietKhoiLuong {
  rs: any[];
  rsThanhPhanCongThuc: ThanhPhanCongThucItem[];
}

async function getAuthToken(): Promise<string> {
  const token = await AsyncStorage.getItem('access_token');
  if (!token) throw new Error('Chưa đăng nhập');
  return token;
}

async function getUserId(): Promise<string> {
  const raw = await AsyncStorage.getItem('userData');
  if (!raw) throw new Error('Không có userData');
  const u = JSON.parse(raw);
  if (!u?.sub) throw new Error('Không có userId');
  return String(u.sub).split(';')[0];
}

async function callGetRaw<T = any>(
  baseUrl: string,
  action: string,
  params: Record<string, string>
): Promise<T> {
  if (!baseUrl) throw new Error(`Base URL cho ${action} chưa cấu hình`);
  const token = await getAuthToken();
  const qs = new URLSearchParams(params).toString();
  const url = `${baseUrl}/${action}${qs ? `?${qs}` : ''}`;
  const res = await fetch(url, { method: 'GET', headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`HTTP ${res.status} - ${action}`);
  const json = await res.json();
  if (!json.Success) throw new Error(json.Message || `${action} fail`);
  return json.Data as T;
}

async function callGetArray<T = any>(
  baseUrl: string,
  action: string,
  params: Record<string, string>
): Promise<T[]> {
  const d = await callGetRaw<any>(baseUrl, action, params);
  if (Array.isArray(d)) return d as T[];
  if (d && typeof d === 'object' && Array.isArray((d as any).rs)) return (d as any).rs;
  return (d || []) as T[];
}

async function callEncryptedPost<T = any>(
  baseUrl: string,
  actionPath: string,
  payload: Record<string, any>
): Promise<T> {
  if (!baseUrl) throw new Error(`Base URL cho ${actionPath} chưa cấu hình`);
  const token = await getAuthToken();
  const encKey = actionPath.substring(actionPath.indexOf('/') + 1);
  const body = { iM: 'Azz', ...payload };
  const res = await fetch(`${baseUrl}/${actionPath}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ A: AE(JSON.stringify(body), encKey) }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} - ${actionPath}`);
  const temp = await res.json();
  if (!temp.Success) throw new Error(temp.Message || `${actionPath} fail`);
  if (temp.Data && typeof temp.Data === 'object' && 'B' in temp.Data) {
    const decrypted = AD(temp.Data.B, body.iM);
    if (!decrypted) throw new Error('Không thể giải mã dữ liệu');
    const parsed = JSON.parse(decrypted);
    if (Array.isArray(parsed)) return parsed as T;
    if (parsed?.Data && Array.isArray(parsed.Data)) return parsed.Data as T;
    if (parsed?.Data !== undefined) return parsed.Data as T;
    return parsed as T;
  }
  return temp.Data as T;
}

export const lecturerWorkloadService = {
  // DS bảng tính kế hoạch KLGD + thông tin cán bộ
  // Trả về { rs: BangTinhItem[], rsThongTin: ThongTinCanBoItem[] }
  async getBangTinh(): Promise<{ rs: BangTinhItem[]; rsThongTin: ThongTinCanBoItem[] }> {
    const userId = await getUserId();
    const data = await callGetRaw<any>(
      API_HOSTS.nhanSu,
      'NS_ThongTinCanBo/LayDSKeHoachKLGDChiTietCaNhan',
      { strNguoiDung_Id: userId }
    );
    return {
      rs: Array.isArray(data?.rs) ? data.rs : [],
      rsThongTin: Array.isArray(data?.rsThongTin) ? data.rsThongTin : [],
    };
  },

  // DS dữ liệu khối lượng cá nhân theo bảng tính — chỉ giảng dạy thuộc cán bộ
  async getDuLieuKL(bangTinhId: string): Promise<KhoiLuongRow[]> {
    const userId = await getUserId();
    return await callGetArray<KhoiLuongRow>(
      API_HOSTS.thongKeGiangDay,
      'TKGG_KeHoach/LayDSDuLieuKLCaNhan',
      {
        strKLGD_KeHoachChitiet_Id: bangTinhId || '',
        strNguoiThucHien_Id: userId,
      }
    );
  },

  // DS dữ liệu khối lượng toàn bộ (tổng hợp) — encrypted
  async getDuLieuKLToanBo(bangTinhId: string): Promise<KhoiLuongRow[]> {
    const userId = await getUserId();
    const data = await callEncryptedPost<KhoiLuongRow[]>(
      API_HOSTS.nhanSu,
      'NS_KLGD_KeHoach_MH/DSA4BRIFNA0oJDQKDQIgDykgLxUuLyYJLjEP',
      {
        func: 'PKG_KLGV_V2_KEHOACH.LayDSDuLieuKLCaNhanTongHop',
        strKLGD_KeHoachChitiet_Id: bangTinhId || '',
        strNguoiThucHien_Id: userId,
      }
    );
    return Array.isArray(data) ? data : [];
  },

  // Chi tiết 1 dòng khối lượng: rs (data rows) + rsThanhPhanCongThuc (cột công thức)
  async getChiTietKL(params: {
    keHoachChiTietId: string;
    loai: string;
    id: string;
  }): Promise<ChiTietKhoiLuong> {
    const userId = await getUserId();
    const data = await callGetRaw<any>(
      API_HOSTS.thongKeGiangDay,
      'TKGG_ThongTin/LayDSDuLieu_ChiTiet',
      {
        strKLGD_KeHoachChiTiet_Id: params.keHoachChiTietId || '',
        strLoai: params.loai || '',
        strId: params.id || '',
        strNguoiThucHien_Id: userId,
      }
    );
    return {
      rs: Array.isArray(data?.rs) ? data.rs : [],
      rsThanhPhanCongThuc: Array.isArray(data?.rsThanhPhanCongThuc) ? data.rsThanhPhanCongThuc : [],
    };
  },

  // Giá trị từ khóa cột mở rộng (1 row × 1 cột)
  async getGiaTriTuKhoa(params: {
    duLieuLoaiId: string;
    tuKhoa: string;
  }): Promise<string> {
    const userId = await getUserId();
    const data = await callGetRaw<any>(
      API_HOSTS.thongKeGiangDay,
      'TKGG_ThongTin/LayGiaTriTuKhoa',
      {
        strTuKhoa: params.tuKhoa || '',
        strKLGD_DuLieu_Loai_Id: params.duLieuLoaiId || '',
        strNguoiThucHien_Id: userId,
      }
    );
    if (Array.isArray(data) && data.length > 0) {
      return String(data[0].GIATRITUKHOA || '');
    }
    return '';
  },
};

export default lecturerWorkloadService;
