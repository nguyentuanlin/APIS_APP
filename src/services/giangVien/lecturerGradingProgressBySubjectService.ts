// Thống kê tiến độ nhập điểm theo đăng ký và theo học phần (CCB.ND.HP).
// Port `Modules/thongke/script/nhapdiemhocphan.js`. TP_ToChucThi* (thiPhach host).
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_HOSTS } from '../../config/apiHosts';

export interface KeHoachItem {
  ID: string;
  TENKEHOACH?: string;
  [k: string]: any;
}

export interface HocPhanItem {
  ID: string;
  MA?: string;
  TEN?: string;
  DAOTAO_THOIGIANDAOTAO?: string;
  [k: string]: any;
}

export interface LoaiDiemItem {
  ID: string;
  TEN?: string;
  [k: string]: any;
}

export interface HocPhanThongKeItem {
  ID: string;
  MA?: string;
  TEN?: string;
  HOCTRINH?: string | number;
  SOSV?: string | number;
  DONVIPHUTRACHHOCPHAN_TEN?: string;
  CONGTHUC?: string;
  TYLEHOANTHANHTKHP?: string | number;
  [k: string]: any;
}

export interface TienDoKetQua {
  SOSV?: string | number;
  TYLE?: string | number;
  [k: string]: any;
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

async function callGet<T = any>(
  baseUrl: string,
  action: string,
  params: Record<string, string | number>
): Promise<T> {
  if (!baseUrl) throw new Error(`Base URL cho ${action} chưa cấu hình`);
  const token = await getAuthToken();
  const qs = new URLSearchParams(
    Object.entries(params).reduce<Record<string, string>>((acc, [k, v]) => {
      acc[k] = String(v ?? '');
      return acc;
    }, {})
  ).toString();
  const url = `${baseUrl}/${action}${qs ? `?${qs}` : ''}`;
  const res = await fetch(url, { method: 'GET', headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`HTTP ${res.status} - ${action}`);
  const json = await res.json();
  if (!json.Success) throw new Error(json.Message || `${action} fail`);
  const d = json.Data;
  if (Array.isArray(d)) return d as T;
  if (d && typeof d === 'object' && Array.isArray((d as any).rs)) return (d as any).rs as T;
  return (d || []) as T;
}

export const lecturerGradingProgressBySubjectService = {
  // Kế hoạch — GET TP_ToChucThi/LayDSDangKy_KeHoachDangKy
  async getKeHoach(): Promise<KeHoachItem[]> {
    const userId = await getUserId();
    return await callGet<KeHoachItem[]>(API_HOSTS.thiPhach, 'TP_ToChucThi/LayDSDangKy_KeHoachDangKy', {
      strTuKhoa: '',
      strDaoTao_ThoiGianDaoTao_Id: '',
      strNguoiThucHien_Id: userId,
      pageIndex: 1,
      pageSize: 10000,
    });
  },

  // Học phần theo kế hoạch — GET TP_ToChucThi/LayDSHocPhanTheoKeHoach
  async getHocPhan(keHoachId: string): Promise<HocPhanItem[]> {
    return await callGet<HocPhanItem[]>(API_HOSTS.thiPhach, 'TP_ToChucThi/LayDSHocPhanTheoKeHoach', {
      strDaoTao_KhoaQuanLy_Id: '',
      strDangKy_KeHoachDangKy_Id: keHoachId || '',
    });
  },

  // Cột loại điểm theo kế hoạch — GET TP_ToChucThi/LayDSLoaiDiemTheoKeHoach
  async getTenCot(keHoachId: string, hocPhanId: string): Promise<LoaiDiemItem[]> {
    const userId = await getUserId();
    return await callGet<LoaiDiemItem[]>(API_HOSTS.thiPhach, 'TP_ToChucThi/LayDSLoaiDiemTheoKeHoach', {
      strDangKy_KeHoachDangKy_Id: keHoachId || '',
      strDaoTao_HocPhan_Id: hocPhanId || '',
      strNguoiThucHien_Id: userId,
    });
  },

  // Danh sách học phần — GET TP_ToChucThi/LayDSHocPhanTheoKeHoach2
  async getList(params: { tuKhoa?: string; keHoachId?: string; hocPhanId?: string }): Promise<HocPhanThongKeItem[]> {
    const userId = await getUserId();
    return await callGet<HocPhanThongKeItem[]>(API_HOSTS.thiPhach, 'TP_ToChucThi/LayDSHocPhanTheoKeHoach2', {
      strTuKhoa: params.tuKhoa || '',
      strDangKy_KeHoachDangKy_Id: params.keHoachId || '',
      strDaoTao_KhoaQuanLy_Id: '',
      strDaoTao_HocPhan_Id: params.hocPhanId || '',
      strThi_DotThi_Id: '',
      strNguoiThucHien_Id: userId,
    });
  },

  // Tiến độ theo học phần + loại điểm — GET TP_ToChucThi/LayTTTienDoNhapDiemTheoHP
  async getTienDoChiTiet(params: {
    keHoachId: string;
    hocPhanId: string;
    loaiDiemId: string;
    congThuc: string;
  }): Promise<TienDoKetQua[]> {
    const userId = await getUserId();
    return await callGet<TienDoKetQua[]>(API_HOSTS.thiPhach, 'TP_ToChucThi/LayTTTienDoNhapDiemTheoHP', {
      strDangKy_KeHoachDangKy_Id: params.keHoachId || '',
      strDaoTao_LopHocPhan_Id: params.hocPhanId || '',
      strDiem_ThanhPhanDiem_Id: params.loaiDiemId || '',
      strNguoiThucHien_Id: userId,
      strCongThucDiem: params.congThuc || '',
      strDaoTao_HocPhan_Id: params.hocPhanId || '',
    });
  },
};

export default lecturerGradingProgressBySubjectService;
