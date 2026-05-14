// Thống kê tiến độ nhập điểm theo đăng ký và theo lớp học phần (CCB.ND.LHP).
// Port `Modules/thongke/script/nhapdiemhocphan.js`. TP_ToChucThi* (thiPhach host).
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_HOSTS } from '../../config/apiHosts';

export interface KeHoachItem {
  ID: string;
  TENKEHOACH?: string;
  [k: string]: any;
}

export interface KhoaQuanLyItem {
  ID: string;
  DAOTAO_KHOAQUANLY_TEN?: string;
  [k: string]: any;
}

export interface HocPhanItem {
  ID: string;
  MA?: string;
  TEN?: string;
  DAOTAO_THOIGIANDAOTAO?: string;
  [k: string]: any;
}

export interface DotThiItem {
  ID: string;
  TEN?: string;
  [k: string]: any;
}

export interface LoaiDiemItem {
  ID: string;
  TEN?: string;
  [k: string]: any;
}

export interface LopHocPhanItem {
  ID: string;
  MALOP?: string;
  TENLOP?: string;
  DAOTAO_HOCPHAN_SOTIN?: string | number;
  SOSV?: string | number;
  DSGIANGVIEN?: string;
  DONVIPHUTRACHHOCPHAN_TEN?: string;
  CONGTHUC?: string;
  HANNOPDIEM?: string;
  DOTTHI_TEN?: string;
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

export const lecturerGradingProgressByClassService = {
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

  // Khoa quản lý theo kế hoạch — GET TP_ToChucThi/LayDSKhoaQLTheoKeHoach
  async getKhoaQuanLy(keHoachId: string): Promise<KhoaQuanLyItem[]> {
    return await callGet<KhoaQuanLyItem[]>(API_HOSTS.thiPhach, 'TP_ToChucThi/LayDSKhoaQLTheoKeHoach', {
      strDaoTao_ThoiGianDaoTao_Id: '',
      strDangKy_KeHoachDangKy_Id: keHoachId || '',
    });
  },

  // Học phần theo kế hoạch — GET TP_ToChucThi/LayDSHocPhanTheoKeHoach
  async getHocPhan(keHoachId: string, khoaQuanLyId: string): Promise<HocPhanItem[]> {
    return await callGet<HocPhanItem[]>(API_HOSTS.thiPhach, 'TP_ToChucThi/LayDSHocPhanTheoKeHoach', {
      strDaoTao_KhoaQuanLy_Id: khoaQuanLyId || '',
      strDangKy_KeHoachDangKy_Id: keHoachId || '',
    });
  },

  // Đợt thi — GET TP_Chung/LayDotThi (không có filter trên trang web)
  async getDotThi(): Promise<DotThiItem[]> {
    const userId = await getUserId();
    return await callGet<DotThiItem[]>(API_HOSTS.thiPhach, 'TP_Chung/LayDotThi', {
      strHinhThucThi_Id: '',
      strDiem_ThanhPhanDiem_Id: '',
      strDaoTao_ThoiGianDaoTao_Id: '',
      strNguoiThucHien_Id: userId,
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

  // Danh sách lớp học phần — GET TP_ToChucThi/LayDSLopHocPhanTatCa
  async getList(params: {
    tuKhoa?: string;
    keHoachId?: string;
    khoaQuanLyId?: string;
    hocPhanId?: string;
    dotThiId?: string;
  }): Promise<LopHocPhanItem[]> {
    const userId = await getUserId();
    return await callGet<LopHocPhanItem[]>(API_HOSTS.thiPhach, 'TP_ToChucThi/LayDSLopHocPhanTatCa', {
      strTuKhoa: params.tuKhoa || '',
      strDangKy_KeHoachDangKy_Id: params.keHoachId || '',
      strDaoTao_KhoaQuanLy_Id: params.khoaQuanLyId || '',
      strDaoTao_HocPhan_Id: params.hocPhanId || '',
      strThi_DotThi_Id: params.dotThiId || '',
      strNguoiThucHien_Id: userId,
    });
  },

  // Tiến độ theo lớp học phần + loại điểm — GET TP_ToChucThi/LayTTTienDoNhapDiemTheoLopHP
  async getTienDoChiTiet(params: {
    keHoachId: string;
    lopHocPhanId: string;
    loaiDiemId: string;
    congThuc: string;
    hocPhanId?: string;
  }): Promise<TienDoKetQua[]> {
    const userId = await getUserId();
    return await callGet<TienDoKetQua[]>(API_HOSTS.thiPhach, 'TP_ToChucThi/LayTTTienDoNhapDiemTheoLopHP', {
      strDangKy_KeHoachDangKy_Id: params.keHoachId || '',
      strDaoTao_LopHocPhan_Id: params.lopHocPhanId || '',
      strDiem_ThanhPhanDiem_Id: params.loaiDiemId || '',
      strNguoiThucHien_Id: userId,
      strCongThucDiem: params.congThuc || '',
      strDaoTao_HocPhan_Id: params.hocPhanId || params.lopHocPhanId || '',
    });
  },
};

export default lecturerGradingProgressByClassService;
