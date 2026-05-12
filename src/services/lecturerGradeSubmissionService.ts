// Nhập điểm giảng viên (CCB.NhapDiem) — port web `Modules/nhapdiem/script/nhapdiem.js`.
// Tất cả API D_* GET/POST plain trên host quanlydiemapi.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_HOSTS } from '../config/apiHosts';

export const CHUCNANG_ID_NHAPDIEM = '0EFA595D5E7B41A28D8884FA80F992EC';
export const APP_ID_CONG_CAN_BO = 'B0B172E252D24251A5E650D38AC901A2';

// Loại xác nhận khi gọi D_XacNhan/Them_Diem_XacNhan
export const LOAI_XN_HOAN_THANH = 'XACNHAN_HOANTHANH_NHAP';
export const LOAI_XN_CONG_BO = 'XACNHAN_CONGBODIEM';

export interface HanhDongXacNhanItem {
  ID: string;
  TEN: string;
  [k: string]: any;
}

export interface ComboItem {
  ID: string;
  TEN: string;
  DAOTAO_THOIGIANDAOTAO?: string;
  [k: string]: any;
}

export interface BangDiemItem {
  ID: string;
  LOAIDANHSACH_TEN: string;
  MA: string;
  TEN: string;
  DAOTAO_HOCPHAN_MA: string;
  DAOTAO_HOCPHAN_TEN: string;
  SOLUONG: number | string;
  TYLENHAPDIEM: number | string;
  DAOTAO_THOIGIANDAOTAO: string;
  DAOTAO_KHOADAOTAO_MA?: string;
  DAOTAO_HOCPHAN_ID?: string;
  [k: string]: any;
}

// 1 cột trong cấu trúc bảng điểm (nested header có MACOT_CHA)
export interface CongThucCotItem {
  MACOT: string;
  MACOT_CHA: string | null;
  TENCOT: string;
  THANGDIEM: number | string;
  CHIXEM?: number; // 1 = readonly, 0 = nhập được — nhưng từng cell có thể override (xem getDiemTheoCot)
  [k: string]: any;
}

// Cấu trúc trả về của D_CongThuc/LayChiTiet
export interface CongThucResponse {
  rsDSCotThongTinDiem: CongThucCotItem[]; // cột điểm (nested với MACOT_CHA)
  rsDSCotThongTinNguoiHoc: { MACOT: string; TENCOT: string }[]; // cột info SV
}

export interface NguoiHocItem {
  ID: string; // = DIEM_DANHSACH_NGUOIHOC_ID
  QLSV_NGUOIHOC_ID: string;
  QLSV_NGUOIHOC_MASO: string;
  HODEMNGUOIHOC?: string;
  TENNGUOIHOC?: string;
  QLSV_NGUOIHOC_HODEM?: string;
  QLSV_NGUOIHOC_TEN?: string;
  DAOTAO_LOPQUANLY_TEN?: string;
  DIEM_DANHSACHHOC_ID: string;
  DIEM_DANHSACH_NGUOIHOC_ID?: string;
  DAOTAO_HOCPHAN_ID: string;
  CHUONGTRINH_ID?: string;
  DAOTAO_THOIGIANDAOTAO_ID?: string;
  LANHOC?: string | number;
  LANTHI?: string | number;
  [k: string]: any;
}

export interface DiemTheoDanhSachItem {
  QLSV_NGUOIHOC_ID: string;
  GIATRICOTDULIEU: string | number | null;
  CHIXEM?: number;
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

async function callGet<T = any>(baseUrl: string, action: string, params: Record<string, string>): Promise<T> {
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

async function callGetRaw<T = any>(
  baseUrl: string,
  action: string,
  params: Record<string, string>
): Promise<T> {
  // Trả về nguyên Data (không unwrap), dùng cho LayChiTiet với object phức
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

async function callPost(
  baseUrl: string,
  action: string,
  body: Record<string, any>
): Promise<any> {
  if (!baseUrl) throw new Error(`Base URL cho ${action} chưa cấu hình`);
  const token = await getAuthToken();
  const res = await fetch(`${baseUrl}/${action}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} - ${action}`);
  const json = await res.json();
  if (!json.Success) throw new Error(json.Message || `${action} fail`);
  return json;
}

export const lecturerGradeSubmissionService = {
  async getLoaiDanhSach(): Promise<ComboItem[]> {
    const userId = await getUserId();
    return await callGet<ComboItem[]>(API_HOSTS.quanLyDiem, 'D_LoaiDanhSach/LayLoaiDanhSach', {
      strChucNang_Id: CHUCNANG_ID_NHAPDIEM,
      strNguoiThucHien_Id: userId,
    });
  },

  async getThoiGian(loaiDanhSachId: string): Promise<ComboItem[]> {
    const userId = await getUserId();
    return await callGet<ComboItem[]>(API_HOSTS.quanLyDiem, 'D_ThoiGian/LayDanhSach', {
      strChucNang_Id: CHUCNANG_ID_NHAPDIEM,
      strNguoiThucHien_Id: userId,
      strLoaiDanhSach_Id: loaiDanhSachId || '',
    });
  },

  async getHocPhan(loaiDanhSachId: string, thoiGianId: string): Promise<ComboItem[]> {
    const userId = await getUserId();
    return await callGet<ComboItem[]>(API_HOSTS.quanLyDiem, 'D_HocPhan/LayDanhSach', {
      strChucNang_Id: CHUCNANG_ID_NHAPDIEM,
      strNguoiThucHien_Id: userId,
      strDaoTao_LopQuanLy_Id: '',
      strLoaiDanhSach_Id: loaiDanhSachId || '',
      strDaoTao_ThoiGianDaoTao_Id: thoiGianId || '',
    });
  },

  // Bảng chính: D_Hoc/LayDanhSach
  async getDSBangDiem(params: {
    loaiDanhSachId: string;
    thoiGianId: string;
    hocPhanId: string;
    keyword?: string;
  }): Promise<BangDiemItem[]> {
    const userId = await getUserId();
    return await callGet<BangDiemItem[]>(API_HOSTS.quanLyDiem, 'D_Hoc/LayDanhSach', {
      strTuKhoa: params.keyword || '',
      strDaoTao_LopQuanLy_Id: '',
      strChucNang_Id: CHUCNANG_ID_NHAPDIEM,
      strDaoTao_ThoiGianDaoTao_Id: params.thoiGianId || '',
      strDaoTao_HocPhan_Id: params.hocPhanId || '',
      strTrangThai_Id: '',
      strDangKy_KeHoachDangKy_Id: '',
      strLoaiDanhSach_Id: params.loaiDanhSachId || '',
      strNguoiDung_Id: userId,
      strNguoiTao_Id: '',
      strNguoiThucHien_Id: userId,
      pageIndex: '1',
      pageSize: '1000',
    });
  },

  // Lấy cấu trúc cột nhập điểm theo công thức của 1 bảng điểm
  async getCongThuc(danhSachHocId: string): Promise<CongThucResponse> {
    const userId = await getUserId();
    const data = await callGetRaw<CongThucResponse>(
      API_HOSTS.quanLyDiem,
      'D_CongThuc/LayChiTiet',
      {
        strChucNang_Id: CHUCNANG_ID_NHAPDIEM,
        strNguoiThucHien_Id: userId,
        strDaoTao_HocPhan_Id: '',
        strDiem_DanhSachHoc_Id: danhSachHocId,
      }
    );
    return {
      rsDSCotThongTinDiem: data?.rsDSCotThongTinDiem || [],
      rsDSCotThongTinNguoiHoc: data?.rsDSCotThongTinNguoiHoc || [],
    };
  },

  // DS sinh viên trong bảng điểm
  async getNguoiHoc(danhSachHocId: string, sortType: string = 'ABC'): Promise<NguoiHocItem[]> {
    const userId = await getUserId();
    return await callGet<NguoiHocItem[]>(API_HOSTS.quanLyDiem, 'D_Hoc_NguoiHoc/LayDanhSach', {
      strDiem_DanhSachHoc_Id: danhSachHocId,
      strTieuChiSapXep: sortType,
      strNguoiThucHien_Id: userId,
    });
  },

  // Lấy điểm tất cả SV cho 1 cột MACOT
  async getDiemTheoCot(
    danhSachHocId: string,
    hocPhanId: string,
    macot: string
  ): Promise<DiemTheoDanhSachItem[]> {
    const userId = await getUserId();
    return await callGet<DiemTheoDanhSachItem[]>(
      API_HOSTS.quanLyDiem,
      'D_Hoc_NguoiHoc_Diem/LayGiaTriDiemTheoDanhSach',
      {
        strChucNang_Id: CHUCNANG_ID_NHAPDIEM,
        strNguoiThucHien_Id: userId,
        strDaoTao_HocPhan_Id: hocPhanId,
        strDiem_DanhSachHoc_Id: danhSachHocId,
        strKyHieuCotDuLieu: macot,
      }
    );
  },

  // Save 1 ô điểm
  async saveDiem(params: {
    nguoiHocItem: NguoiHocItem;
    macot: string;
    diem: string;
    thoiGianId: string;
  }): Promise<void> {
    const userId = await getUserId();
    const { nguoiHocItem, macot, diem, thoiGianId } = params;
    await callPost(API_HOSTS.quanLyDiem, 'D_Hoc_NguoiHoc_Diem/Nhan_Diem_NguoiHoc_ThanhPhan', {
      strChucNang_Id: CHUCNANG_ID_NHAPDIEM,
      strUngDung_Id: APP_ID_CONG_CAN_BO,
      strDaoTao_ThoiGianDaoTao_Id: nguoiHocItem.DAOTAO_THOIGIANDAOTAO_ID || thoiGianId,
      strDiem_DanhSach_NguoiHoc_Id: nguoiHocItem.ID,
      strDiem_DanhSachHoc_Id: nguoiHocItem.DIEM_DANHSACHHOC_ID,
      strQLSV_NguoiHoc_Id: nguoiHocItem.QLSV_NGUOIHOC_ID,
      strDaoTao_ChuongTrinh_Id: nguoiHocItem.CHUONGTRINH_ID || '',
      strDaoTao_HocPhan_Id: nguoiHocItem.DAOTAO_HOCPHAN_ID,
      strDiem_ThanhPhanDiem_Id: macot,
      strLanHoc: String(nguoiHocItem.LANHOC || ''),
      strLanThi: String(nguoiHocItem.LANTHI || ''),
      strDiem: diem,
      strGhiChu: '',
      strNguoiThucHien_Id: userId,
    });
  },

  // ===== Action buttons =====

  // List trạng thái xác nhận cho "Công bố" hoặc "Xác nhận hoàn thành nhập"
  async getHanhDongXacNhan(
    danhSachHocId: string,
    loaiXacNhan: string
  ): Promise<HanhDongXacNhanItem[]> {
    const userId = await getUserId();
    return await callGet<HanhDongXacNhanItem[]>(
      API_HOSTS.quanLyDiem,
      'D_HanhDongXacNhan/LayDanhSach',
      {
        strChucNang_Id: CHUCNANG_ID_NHAPDIEM,
        strLoaiXacNhan_Id: loaiXacNhan,
        strNguoiThucHien_Id: userId,
        strDiem_DanhSachHoc_Id: danhSachHocId,
      }
    );
  },

  // Thêm xác nhận (Công bố / Xác nhận hoàn thành)
  async confirmXacNhan(
    danhSachHocId: string,
    hanhDongId: string,
    loaiXacNhan: string,
    note: string = ''
  ): Promise<void> {
    const userId = await getUserId();
    await callPost(API_HOSTS.quanLyDiem, 'D_XacNhan/Them_Diem_XacNhan', {
      strChucNang_Id: CHUCNANG_ID_NHAPDIEM,
      strNguoiThucHien_Id: userId,
      strDiem_DanhSachHoc_Id: danhSachHocId,
      strHanhDong_Id: hanhDongId,
      strLoaiXacNhan_Id: loaiXacNhan,
      strThongTinXacNhan: note,
      strNguoiXacNhan_Id: userId,
      strDuLieuXacNhan: danhSachHocId,
    });
  },

  // Tính lại điểm cho 1 sinh viên
  async tinhLaiDiem(nguoiHocItem: NguoiHocItem): Promise<void> {
    const userId = await getUserId();
    await callPost(API_HOSTS.quanLyDiem, 'D_Hoc_NguoiHoc_Diem/Tinh_Diem_NguoiHoc_ThanhPhan', {
      strChucNang_Id: CHUCNANG_ID_NHAPDIEM,
      strUngDung_Id: APP_ID_CONG_CAN_BO,
      strDaoTao_ThoiGianDaoTao_Id: nguoiHocItem.DAOTAO_THOIGIANDAOTAO_ID || '',
      strDiem_DanhSach_NguoiHoc_Id: nguoiHocItem.ID,
      strDiem_DanhSachHoc_Id: nguoiHocItem.DIEM_DANHSACHHOC_ID,
      strQLSV_NguoiHoc_Id: nguoiHocItem.QLSV_NGUOIHOC_ID,
      strDaoTao_ChuongTrinh_Id: nguoiHocItem.CHUONGTRINH_ID || '',
      strDaoTao_HocPhan_Id: nguoiHocItem.DAOTAO_HOCPHAN_ID,
      strDiem_ThanhPhanDiem_Id: '',
      strLanHoc: String(nguoiHocItem.LANHOC || ''),
      strLanThi: String(nguoiHocItem.LANTHI || ''),
      strGhiChu: '',
      strNguoiThucHien_Id: userId,
    });
  },

  // Lấy lại điểm theo Rubric cho cả bảng (1 lần)
  async layLaiRubric(danhSachHocId: string): Promise<void> {
    const userId = await getUserId();
    await callPost(API_HOSTS.thiPhach, 'TP_XuLyTuKhoa/QuyDoiRubricTheoLopHocPhan', {
      dCapNhatLaiDuLieu: -1,
      strQLSV_NguoiHoc_Id: '',
      strDiem_DanhSachHoc_Id: danhSachHocId,
      strNguoiThucHien_Id: userId,
    });
  },

  // Helper: lấy các cột LEAF (không phải cha của cột khác)
  getLeafColumns(cot: CongThucCotItem[]): CongThucCotItem[] {
    const parentSet = new Set(cot.map((c) => c.MACOT_CHA).filter(Boolean));
    return cot.filter((c) => !parentSet.has(c.MACOT));
  },
};

export default lecturerGradeSubmissionService;
