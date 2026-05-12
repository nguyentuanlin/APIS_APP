// Danh sách người học theo lớp (CCB.NHTL) — port `Modules/lichgiang/script/nguoihoc.js`.
// - 3 GET plain (NS_ThongTinCanBo/*) cho filter + danh sách lớp + SV
// - 3 POST encrypted (D_Chung_MH/*) cho Xác nhận hoàn thành điểm danh
// - 2 POST encrypted (CMS_PhanQuyen_MH) + (SYS_Report/ThemMoi) cho Báo cáo
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AE, AD } from '../../crypto';
import { API_HOSTS } from '../config/apiHosts';

export const CHUCNANG_ID_NHTL = 'AC149CB17B5D4880ACB16F1DAAF2CB33';
export const UNGDUNG_ID_CONGCANBO = 'B0B172E252D24251A5E650D38AC901A2';
export const LOAI_XACNHAN_HOANTHANH_DIEMDANH = 'XACNHAN_HOANTHANH_DIEMDANH';

export interface ThoiGianItem {
  ID: string;
  THOIGIAN: string;
  [k: string]: any;
}

export interface HocPhanItem {
  ID: string;
  TEN: string;
  MA?: string;
  [k: string]: any;
}

export interface LopHocPhanItem {
  ID: string;
  IDLOPHOCPHAN?: string;
  MALOP: string;
  TENLOP: string;
  NGAYBATDAU?: string;
  NGAYKETTHUC?: string;
  SOLUONG?: number | string;
  [k: string]: any;
}

export interface SinhVienItem {
  QLSV_NGUOIHOC_ID: string;
  QLSV_NGUOIHOC_MASO: string;
  QLSV_NGUOIHOC_HODEM: string;
  QLSV_NGUOIHOC_TEN: string;
  DAOTAO_LOPQUANLY_TEN?: string;
  QLSV_NGUOIHOC_NGAYSINH?: string;
  QLSV_TRANGTHAINGUOIHOC_TEN?: string;
  [k: string]: any;
}

export interface HanhDongXacNhanItem {
  ID: string;
  TEN: string;
  [k: string]: any;
}

export interface DiemXacNhanItem {
  TEN: string;
  NGUOIXACNHAN_TENDAYDU?: string;
  NGAYTAO_DD_MM_YYYY?: string;
  [k: string]: any;
}

export interface MauBaoCaoItem {
  MAUIMPORT_MA: string;
  MAUIMPORT_TENFILEMAU: string;
  MAUIMPORT_DUONGDAN?: string;
  XEMFILE?: string;
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
  const d = json.Data;
  if (Array.isArray(d)) return d as T;
  if (d && typeof d === 'object' && Array.isArray((d as any).rs)) return (d as any).rs as T;
  return (d || []) as T;
}

// POST encrypted (AE/AD). Key = phần sau dấu / trong actionPath.
async function callEncryptedPost<T = any>(
  baseUrl: string,
  actionPath: string,
  payload: Record<string, any>
): Promise<T> {
  if (!baseUrl) throw new Error(`Base URL cho ${actionPath} chưa cấu hình`);
  const token = await getAuthToken();
  const encKey = actionPath.substring(actionPath.indexOf('/') + 1);
  const body = { iM: 'AzzSystem', ...payload };
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

// POST raw JSON (không encrypted) — dùng cho SYS_Report/ThemMoi (web POST application/json
// với body = {arrTuKhoa, arrDuLieu, strNguoiThucHien_Id}).
async function callJsonPost(baseUrl: string, action: string, body: any): Promise<any> {
  if (!baseUrl) throw new Error(`Base URL cho ${action} chưa cấu hình`);
  const token = await getAuthToken();
  const res = await fetch(`${baseUrl}/${action}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} - ${action}`);
  return await res.json();
}

export const lecturerClassListService = {
  // ====== Filter & danh sách lớp ======
  async getThoiGian(): Promise<ThoiGianItem[]> {
    const userId = await getUserId();
    return await callGet<ThoiGianItem[]>(
      API_HOSTS.nhanSu,
      'NS_ThongTinCanBo/LayDSThoiGianTheoLichCaNhan',
      {
        strNhanSu_HoSoCanBo_Id: userId,
        strDaoTao_ThoiGianDaoTao_Id: '',
      }
    );
  },

  async getHocPhan(): Promise<HocPhanItem[]> {
    const userId = await getUserId();
    return await callGet<HocPhanItem[]>(API_HOSTS.nhanSu, 'NS_ThongTinCanBo/LayDSHocPhanTheoLichCaNhan', {
      strNhanSu_HoSoCanBo_Id: userId,
    });
  },

  async getLopHocPhan(thoiGianId: string, hocPhanId: string): Promise<LopHocPhanItem[]> {
    const userId = await getUserId();
    return await callGet<LopHocPhanItem[]>(
      API_HOSTS.nhanSu,
      'NS_ThongTinCanBo/LayDSLopHocPhanTheoLichCaNhan',
      {
        strNhanSu_HoSoCanBo_Id: userId,
        strDaoTao_HocPhan_Id: hocPhanId || '',
        strDaoTao_ThoiGianDaoTao_Id: thoiGianId || '',
      }
    );
  },

  // DS sinh viên — Web: GET NS_ThongTinCanBo/LayDSDangKyHoc (không phải _2)
  async getSinhVienLop(lopHocPhanId: string): Promise<SinhVienItem[]> {
    const userId = await getUserId();
    return await callGet<SinhVienItem[]>(API_HOSTS.nhanSu, 'NS_ThongTinCanBo/LayDSDangKyHoc', {
      strTuKhoa: '',
      strNgayGhiNhan: '',
      dGio: '0',
      dPhut: '0',
      dGiay: '0',
      strReport_Id: '',
      strTieuChiSapXep: 'ABC',
      strDaoTao_LopHocPhan_Id: lopHocPhanId,
      strNguoiThucHien_Id: userId,
    });
  },

  // ====== Xác nhận hoàn thành điểm danh ======
  // (1) DS hành động xác nhận có thể chọn (e.g. Đồng ý / Từ chối ...)
  // Web: POST encrypted D_Chung_MH/DSA4BRIJIC8pBS4vJhkgIg8pIC8P
  // func: pkg_diem_chung.LayDSHanhDongXacNhan
  async getHanhDongXacNhan(lopHocPhanId: string): Promise<HanhDongXacNhanItem[]> {
    const userId = await getUserId();
    const data = await callEncryptedPost<HanhDongXacNhanItem[]>(
      API_HOSTS.quanLyDiem,
      'D_Chung_MH/DSA4BRIJIC8pBS4vJhkgIg8pIC8P',
      {
        func: 'pkg_diem_chung.LayDSHanhDongXacNhan',
        strChucNang_Id: CHUCNANG_ID_NHTL,
        strLoaiXacNhan_Id: LOAI_XACNHAN_HOANTHANH_DIEMDANH,
        strNguoiThucHien_Id: userId,
        strDiem_DanhSachHoc_Id: lopHocPhanId,
      }
    );
    return Array.isArray(data) ? data : [];
  },

  // (2) DS xác nhận đã lưu cho 1 lớp HP (lịch sử)
  // Web: POST encrypted D_Chung_MH/DSA4BRIFKCQsHhkgIg8pIC8P
  // func: pkg_diem_chung.LayDSDiem_XacNhan
  async getDanhSachXacNhan(lopHocPhanId: string): Promise<DiemXacNhanItem[]> {
    const userId = await getUserId();
    const data = await callEncryptedPost<DiemXacNhanItem[]>(
      API_HOSTS.quanLyDiem,
      'D_Chung_MH/DSA4BRIFKCQsHhkgIg8pIC8P',
      {
        func: 'pkg_diem_chung.LayDSDiem_XacNhan',
        strTuKhoa: '',
        strDuLieuXacNhan: lopHocPhanId,
        strLoaiXacNhan_Id: LOAI_XACNHAN_HOANTHANH_DIEMDANH,
        strNguoiXacNhan_Id: '',
        strHanhDong_Id: '',
        strNguoiThucHien_Id: userId,
        pageIndex: 1,
        pageSize: 100000,
      }
    );
    return Array.isArray(data) ? data : [];
  },

  // (3) Lưu 1 xác nhận cho 1 lớp HP
  // Web: POST encrypted D_Chung_MH/FSkkLB4FKCQsHhkgIg8pIC8P
  // func: pkg_diem_chung.Them_Diem_XacNhan
  async themXacNhan(params: {
    lopHocPhanId: string;
    hanhDongId: string;
    thongTin: string;
  }): Promise<void> {
    const userId = await getUserId();
    await callEncryptedPost(
      API_HOSTS.quanLyDiem,
      'D_Chung_MH/FSkkLB4FKCQsHhkgIg8pIC8P',
      {
        func: 'pkg_diem_chung.Them_Diem_XacNhan',
        strChucNang_Id: CHUCNANG_ID_NHTL,
        strNguoiThucHien_Id: userId,
        strDiem_DanhSachHoc_Id: params.lopHocPhanId,
        strHanhDong_Id: params.hanhDongId,
        strLoaiXacNhan_Id: LOAI_XACNHAN_HOANTHANH_DIEMDANH,
        strThongTinXacNhan: params.thongTin || '',
        strNguoiXacNhan_Id: userId,
        strDuLieuXacNhan: params.lopHocPhanId,
      }
    );
  },

  // ====== Báo cáo ======
  // Lấy DS mẫu báo cáo cho chức năng hiện tại.
  // Web: POST encrypted CMS_PhanQuyen_MH/DSA4BRIeESkgLxA0OCQvHgwgNAgsMS4zNQPP
  // func: pkg_phanquyen_dulieu.LayDS_PhanQuyen_MauImport
  async getDSMauBaoCao(): Promise<MauBaoCaoItem[]> {
    const userId = await getUserId();
    const data = await callEncryptedPost<MauBaoCaoItem[]>(
      API_HOSTS.cms,
      'CMS_PhanQuyen_MH/DSA4BRIeESkgLxA0OCQvHgwgNAgsMS4zNQPP',
      {
        func: 'pkg_phanquyen_dulieu.LayDS_PhanQuyen_MauImport',
        strTuKhoa: '',
        strNguoiTao_Id: '',
        strUngDung_Id: UNGDUNG_ID_CONGCANBO,
        strChucNang_Id: CHUCNANG_ID_NHTL,
        strNguoiDung_Id: userId,
        strMauImport_Id: '',
        pageIndex: 1,
        pageSize: 100000,
      }
    );
    // Chỉ lấy template báo cáo thường (MAUIMPORT_MA không có prefix IMPORT/REPORTALL...)
    return (Array.isArray(data) ? data : []).filter((m) => {
      const ma = (m.MAUIMPORT_MA || '').toUpperCase();
      const prefix14 = ma.length > 14 ? ma.substring(0, 14) : ma;
      return (
        prefix14 !== 'REPORTALLTABLE' &&
        prefix14 !== 'REPORTALLINPUT' &&
        prefix14 !== 'IMPORTALLINPUT' &&
        prefix14 !== 'IMPORTWITHPROC'
      );
    });
  },

  // Tạo báo cáo: POST SYS_Report/ThemMoi với arrTuKhoa, arrDuLieu.
  // Trả về URL để mở file (PDF/Excel).
  async createBaoCao(params: {
    maMau: string;
    duongDan?: string;
    saveFile?: string;
    lopHocPhanIds: string[];
    thoiGianId?: string;
    hocPhanId?: string;
  }): Promise<string> {
    const userId = await getUserId();
    const arrTuKhoa: { ten: string; giatri: string }[] = [];
    const arrDuLieu: { ten: string; giatri: string }[] = [];

    // Mặc định web — addKeyValue: nếu là chuỗi đơn → arrTuKhoa, nếu nhiều giá trị → arrDuLieu.
    // Để chắc cú ta cứ push cả 2: tham số đơn vào arrTuKhoa, mảng id lớp vào arrDuLieu.
    const single = (k: string, v: string) => arrTuKhoa.push({ ten: k, giatri: v });
    const multi = (k: string, v: string) => arrDuLieu.push({ ten: k, giatri: v });

    single('strTable_Id', '');
    single('strLoaiBaoCao', params.maMau);
    single('strReportCode', params.maMau);
    single('strNguoiThucHien_Id', userId);
    if (params.saveFile) single('saveFile', params.saveFile);

    single('strNhanSu_HoSoCanBo_Id', userId);
    single('strDaoTao_HocPhan_Id', params.hocPhanId || '');
    single('strDaoTao_ThoiGianDaoTao_Id', params.thoiGianId || '');
    params.lopHocPhanIds.forEach((id) => multi('strDaoTao_LopHocPhan_Id', id));

    const res = await callJsonPost(API_HOSTS.cms, 'SYS_Report/ThemMoi', {
      arrTuKhoa,
      arrDuLieu,
      strNguoiThucHien_Id: userId,
    });
    if (!res?.Success) throw new Error(res?.Message || 'Tạo báo cáo thất bại');
    const baoCaoId = res.Message;
    if (!baoCaoId) throw new Error('Server không trả về ID báo cáo');

    // Build URL: ưu tiên DUONGDAN của template, fallback về <API_HOST>/baocao
    const duongDan = (params.duongDan || '').trim();
    if (duongDan) {
      if (duongDan.startsWith('http')) return `${duongDan}?id=${baoCaoId}`;
      const root = API_HOSTS.cms.replace(/\/cmsapi\/api$/, '');
      return `${root}${duongDan.startsWith('/') ? '' : '/'}${duongDan}?id=${baoCaoId}`;
    }
    const root = API_HOSTS.cms.replace(/\/cmsapi\/api$/, '');
    return `${root}/baocao/Baocao.aspx?id=${baoCaoId}`;
  },
};

export default lecturerClassListService;
