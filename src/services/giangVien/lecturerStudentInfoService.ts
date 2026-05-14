// Xem thông tin học tập, chương trình học sinh viên (CCB.IBD)
// Port web `Modules/nhapdiem/script/inbangdiem.js`.
//
// Combos KHCT_* dùng GET plain trên host kehoachchuongtrinhapi.
// API lấy DS SV và Bảng điểm dùng POST encrypted (AE/AD) trên host quanlydiemapi.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AE, AD } from '../../../crypto';
import { API_HOSTS } from '../../config/apiHosts';

export const CHUCNANG_ID_IBD = '9AB3A5EA964744B68A85F41E95DCCDEB';

export interface ComboItem {
  ID: string;
  TEN: string;
  MA?: string;
  [k: string]: any;
}

export interface SinhVienItem {
  ID: string;
  QLSV_NGUOIHOC_ID: string;
  QLSV_NGUOIHOC_MASO: string;
  QLSV_NGUOIHOC_HODEM: string;
  QLSV_NGUOIHOC_TEN: string;
  QLSV_NGUOIHOC_NGAYSINH: string;
  QLSV_TRANGTHAINGUOIHOC_TEN: string;
  DAOTAO_LOPQUANLY_TEN: string;
  DAOTAO_CHUONGTRINH_TEN: string;
  DAOTAO_KHOADAOTAO_TEN: string;
  DAOTAO_HEDAOTAO_TEN: string;
  DTBTICHLUYHE4TOANKHOA: string;
  DTBTICHLUYHE10TOANKHOA: string;
  SOTCTICHLUYTOANKHOA: string;
  TONGNOPHI?: number;
  [k: string]: any;
}

export interface DiemKetThucItem {
  ID: string;
  DAOTAO_HOCPHAN_MA: string;
  DAOTAO_HOCPHAN_TEN: string;
  SOTC: string | number;
  DIEM_THANHPHANDIEM_TEN?: string;
  DIEM10?: string | number;
  DIEM4?: string | number;
  DIEMCHU?: string;
  DAOTAO_THOIGIANDAOTAO?: string;
  TRANGTHAI?: string;
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

// GET plain (KHCT_*)
async function callGet<T = any>(
  baseUrl: string,
  action: string,
  params: Record<string, string>
): Promise<T> {
  if (!baseUrl) throw new Error(`Base URL cho ${action} chưa cấu hình`);
  const token = await getAuthToken();
  const qs = new URLSearchParams(params).toString();
  const url = `${baseUrl}/${action}${qs ? `?${qs}` : ''}`;
  const res = await fetch(url, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} - ${action}`);
  const json = await res.json();
  if (!json.Success) throw new Error(json.Message || `${action} fail`);

  // Một số endpoint KHCT có pagination → Data = { rs: [...], Pager: ... }
  // Một số trả thẳng Data = [...]. Xử lý cả 2 trường hợp.
  const d = json.Data;
  if (Array.isArray(d)) {
    console.log(`[StudentInfo] ${action}: ${d.length} items`);
    return d as T;
  }
  if (d && typeof d === 'object' && Array.isArray((d as any).rs)) {
    console.log(`[StudentInfo] ${action}: ${(d as any).rs.length} items (rs wrapper)`);
    return (d as any).rs as T;
  }
  console.log(`[StudentInfo] ${action} response shape:`, JSON.stringify(d).substring(0, 200));
  return (d || []) as T;
}

// POST encrypted (D_BaoCao_MH/*)
async function callEncryptedPost<T = any>(
  baseUrl: string,
  actionPath: string,
  encryptionKey: string,
  payload: Record<string, any>
): Promise<T> {
  if (!baseUrl) throw new Error(`Base URL cho ${actionPath} chưa cấu hình`);
  const token = await getAuthToken();
  const res = await fetch(`${baseUrl}/${actionPath}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ A: AE(JSON.stringify(payload), encryptionKey) }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} - ${actionPath}`);
  const temp = await res.json();
  if (!temp.Success) throw new Error(temp.Message || `${actionPath} fail`);

  if (temp.Data && typeof temp.Data === 'object' && 'B' in temp.Data) {
    const decrypted = AD(temp.Data.B, payload.iM);
    if (!decrypted) throw new Error('Không thể giải mã dữ liệu');
    return JSON.parse(decrypted) as T;
  }
  return temp.Data as T;
}

export const lecturerStudentInfoService = {
  // ---- Combos KHCT_* (GET plain) ----
  // Danh mục trạng thái sinh viên (QLSV.TRANGTHAI)
  // Web: GET cmsapi/api/CMS_DanhMucThuocTinh/LayDanhSachDuLieuTheoBangDM
  async getTrangThaiSinhVien(): Promise<ComboItem[]> {
    const data = await callGet<ComboItem[]>(
      API_HOSTS.cms,
      'CMS_DanhMucThuocTinh/LayDanhSachDuLieuTheoBangDM',
      {
        strMaBangDanhMuc: 'QLSV.TRANGTHAI',
        strTieuChiSapXep: '',
        dTrangThai: '1',
      }
    );
    return data || [];
  },

  async getKhoaQuanLy(): Promise<ComboItem[]> {
    const userId = await getUserId();
    const data = await callGet<ComboItem[]>(
      API_HOSTS.keHoachChuongTrinh,
      'KHCT_Quyen_ThongTin/LayDSKhoaQuanLyPhanQuyen',
      {
        strChucNang_Id: CHUCNANG_ID_IBD,
        strNguoiThucHien_Id: userId,
      }
    );
    return data || [];
  },

  async getHeDaoTao(khoaQuanLyId: string): Promise<ComboItem[]> {
    const userId = await getUserId();
    const data = await callGet<ComboItem[]>(
      API_HOSTS.keHoachChuongTrinh,
      'KHCT_ThongTin/LayDSDaoTao_HeDaoTaoQuyen',
      {
        strTuKhoa: '',
        strDaoTao_KhoaQuanLy_Id: khoaQuanLyId || '',
        strDaoTao_HinhThucDaoTao_Id: '',
        strDaoTao_BacDaoTao_Id: '',
        strNguoiThucHien_Id: userId,
        strChucNang_Id: CHUCNANG_ID_IBD,
        pageIndex: '1',
        pageSize: '1000000',
      }
    );
    return data || [];
  },

  async getKhoaDaoTao(khoaQuanLyId: string, heDaoTaoId: string): Promise<ComboItem[]> {
    const userId = await getUserId();
    const data = await callGet<ComboItem[]>(
      API_HOSTS.keHoachChuongTrinh,
      'KHCT_ThongTin/LayDSKS_DaoTao_KhoaDaoTaoQuyen',
      {
        strTuKhoa: '',
        strDaoTao_KhoaQuanLy_Id: khoaQuanLyId || '',
        strDaoTao_HeDaoTao_Id: heDaoTaoId || '',
        strDaoTao_CoSoDaoTao_Id: '',
        strNguoiTao_Id: '',
        strNguoiThucHien_Id: userId,
        strChucNang_Id: CHUCNANG_ID_IBD,
        pageIndex: '1',
        pageSize: '1000000',
      }
    );
    return data || [];
  },

  async getChuongTrinhDaoTao(
    khoaQuanLyId: string,
    heDaoTaoId: string,
    khoaDaoTaoId: string
  ): Promise<ComboItem[]> {
    const userId = await getUserId();
    const data = await callGet<ComboItem[]>(
      API_HOSTS.keHoachChuongTrinh,
      'KHCT_Quyen_ThongTin/LayDSKS_DaoTao_ToChucCTQuyen',
      {
        strTuKhoa: '',
        strDaoTao_HeDaoTao_Id: heDaoTaoId || '',
        strDaoTao_KhoaDaoTao_Id: khoaDaoTaoId || '',
        strDaoTao_N_CN_Id: '',
        strDaoTao_KhoaQuanLy_Id: khoaQuanLyId || '',
        strDaoTao_ToChucCT_Cha_Id: '',
        strNguoiThucHien_Id: userId,
        strChucNang_Id: CHUCNANG_ID_IBD,
        pageIndex: '1',
        pageSize: '1000000',
      }
    );
    return data || [];
  },

  async getLopQuanLy(
    khoaQuanLyId: string,
    heDaoTaoId: string,
    khoaDaoTaoId: string,
    chuongTrinhId: string = ''
  ): Promise<ComboItem[]> {
    const userId = await getUserId();
    const data = await callGet<ComboItem[]>(
      API_HOSTS.keHoachChuongTrinh,
      'KHCT_Quyen_ThongTin/LayDSKS_DaoTao_LopQuanLyQuyen',
      {
        strTuKhoa: '',
        strDaoTao_HeDaoTao_Id: heDaoTaoId || '',
        strDaoTao_CoSoDaoTao_Id: '',
        strDaoTao_KhoaDaoTao_Id: khoaDaoTaoId || '',
        strDaoTao_Nganh_Id: '',
        strDaoTao_LoaiLop_Id: '',
        strDaoTao_ToChucCT_Id: chuongTrinhId || '',
        strDaoTao_KhoaQuanLy_Id: khoaQuanLyId || '',
        strNhomlop_Id: '',
        strNguoiThucHien_Id: userId,
        strChucNang_Id: CHUCNANG_ID_IBD,
        pageIndex: '1',
        pageSize: '1000000',
      }
    );
    return data || [];
  },

  // ---- Bảng chính: DS sinh viên (POST encrypted) ----
  async getDanhSachSinhVien(params: {
    keyword?: string;
    khoaQuanLyId?: string;
    heDaoTaoId?: string;
    khoaDaoTaoId?: string;
    lopQuanLyId?: string;
    chuongTrinhId?: string;
    trangThaiNguoiHocIds?: string; // comma-separated, '' = all
    pageIndex?: number;
    pageSize?: number;
  }): Promise<SinhVienItem[]> {
    const userId = await getUserId();
    const encryptionKey = 'DSA4BSAvKRIgIikJLhIuDykoJDQPJiAvKQPP';
    const payload = {
      func: 'pkg_diem_baocao.LayDanhSachHoSoNhieuNganh',
      iM: 'AzzSystem',
      strTuKhoa: params.keyword || '',
      strNamNhapHoc: '',
      strKhoaQuanLy_Id: params.khoaQuanLyId || '',
      strHeDaoTao_Id: params.heDaoTaoId || '',
      strKhoaDaoTao_Id: params.khoaDaoTaoId || '',
      strChuongTrinh_Id: params.chuongTrinhId || '',
      strLopQuanLy_Id: params.lopQuanLyId || '',
      strTrangThaiNguoiHoc_Id: params.trangThaiNguoiHocIds || '',
      strChucNang_Id: CHUCNANG_ID_IBD,
      strTN_KeHoach_Id: '',
      strNguoiThucHien_Id: userId,
      pageIndex: params.pageIndex || 1,
      pageSize: params.pageSize || 100,
    };
    const data = await callEncryptedPost<SinhVienItem[]>(
      API_HOSTS.quanLyDiem,
      `D_BaoCao_MH/${encryptionKey}`,
      encryptionKey,
      payload
    );
    return data || [];
  },

  // ---- Bảng điểm kết thúc cá nhân (POST encrypted) ----
  async getDiemKetThuc(qlsvNguoiHocId: string): Promise<DiemKetThucItem[]> {
    const userId = await getUserId();
    const encryptionKey = 'DSA4BRIFKCQsCiQ1FSk0IgIgDykgLwPP';
    const payload = {
      func: 'pkg_diem_baocao.LayDSDiemKetThucCaNhan',
      iM: 'AzzSystem',
      strQLSV_NguoiHoc_Id: qlsvNguoiHocId,
      strNguoiThucHien_Id: userId,
    };
    const data = await callEncryptedPost<DiemKetThucItem[]>(
      API_HOSTS.quanLyDiem,
      `D_BaoCao_MH/${encryptionKey}`,
      encryptionKey,
      payload
    );
    return data || [];
  },
};

export default lecturerStudentInfoService;
