// Khoa xác nhận đổi lịch (CCB.KXNDL)
// Port `Modules/lichgiang/script/lichgiangkhoa.js`. Toàn bộ là GET plain trên host
// keHoachChuongTrinh (KHCT prefix). Riêng "Kết quả xử lý" là master danh mục
// trên host cmsapi.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_HOSTS } from '../../config/apiHosts';

// CHUCNANG_ID cho màn Khoa xác nhận đổi lịch — backend kiểm tra trên token, ta luôn truyền.
// Web đọc từ edu.system.strChucNang_Id (set khi vào module). Chưa rõ ID — gửi rỗng để
// backend dùng default theo URL action.
export const CHUCNANG_ID_KXNDL = '';

export interface HocKyItem {
  ID: string;
  TEN?: string;
  THOIGIAN?: string;
  [k: string]: any;
}

export interface HocPhanItem {
  ID: string;
  TEN: string;
  MA?: string;
  [k: string]: any;
}

export interface NguoiGuiItem {
  ID: string;
  TEN?: string;
  HODEM?: string;
  TAIKHOAN?: string;
  MASO?: string;
  [k: string]: any;
}

export interface TrangThaiItem {
  ID: string;
  TEN: string;
  [k: string]: any;
}

export interface YeuCauDoiLichItem {
  ID: string;
  DAOTAO_HOCPHAN_TEN?: string;
  LOPHOCPHAN_TEN?: string;
  NGUOIYEUCAU_TAIKHOAN?: string;
  NGUOIYEUCAU_TENDAYDU?: string;
  NGAYTAO_DD_MM_YYYY?: string;
  NGAYTAO_DD_MM_YYYY_HHMMSS?: string;
  NGUOIDUYET_TAIKHOAN?: string;
  NGUOIDUYET_TENDAYDU?: string;
  THOIGIANDUYET?: string;
  TINHTRANGDUYET_TEN?: string;
  NGUOIXULY_TAIKHOAN?: string;
  THOIGIANXULY?: string;
  KETQUAXULY?: string;
  NOIDUNGXULY?: string;
  [k: string]: any;
}

export interface ChiTietDoiLichItem {
  // Fields rất nhiều, để loose
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
): Promise<{ data: T; pager?: number }> {
  if (!baseUrl) throw new Error(`Base URL cho ${action} chưa cấu hình`);
  const token = await getAuthToken();
  const qs = new URLSearchParams(params).toString();
  const url = `${baseUrl}/${action}${qs ? `?${qs}` : ''}`;
  const res = await fetch(url, { method: 'GET', headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`HTTP ${res.status} - ${action}`);
  const json = await res.json();
  if (!json.Success) throw new Error(json.Message || `${action} fail`);
  const d = json.Data;
  const pager = Number(json.Pager) || undefined;
  let out: any;
  if (Array.isArray(d)) out = d;
  else if (d && typeof d === 'object' && Array.isArray((d as any).rs)) out = (d as any).rs;
  else out = d || [];
  return { data: out as T, pager };
}

async function callPost(
  baseUrl: string,
  action: string,
  params: Record<string, string>
): Promise<any> {
  if (!baseUrl) throw new Error(`Base URL cho ${action} chưa cấu hình`);
  const token = await getAuthToken();
  // Web web dùng x-www-form-urlencoded mặc định cho non-encrypted POST. Để chắc chắn
  // backend nhận, dùng form-urlencoded.
  const body = new URLSearchParams(params).toString();
  const res = await fetch(`${baseUrl}/${action}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} - ${action}`);
  const json = await res.json();
  if (!json.Success) throw new Error(json.Message || `${action} fail`);
  return json;
}

export const lecturerScheduleApprovalService = {
  // DS học kỳ — GET KHCT_LichGiang_DoiLich/LayThoiGian
  async getHocKy(): Promise<HocKyItem[]> {
    const userId = await getUserId();
    const { data } = await callGet<HocKyItem[]>(
      API_HOSTS.keHoachChuongTrinh,
      'KHCT_LichGiang_DoiLich/LayThoiGian',
      {
        strChucNang_Id: CHUCNANG_ID_KXNDL,
        strNguoiThucHien_Id: userId,
      }
    );
    return data || [];
  },

  // DS học phần theo học kỳ — GET KHCT_LichGiang_DoiLich/LayDSHocPhanMucKhoaQuanLy
  async getHocPhan(hocKyId: string): Promise<HocPhanItem[]> {
    const userId = await getUserId();
    const { data } = await callGet<HocPhanItem[]>(
      API_HOSTS.keHoachChuongTrinh,
      'KHCT_LichGiang_DoiLich/LayDSHocPhanMucKhoaQuanLy',
      {
        strChucNang_Id: CHUCNANG_ID_KXNDL,
        strDaoTao_ThoiGianDaoTao_Id: hocKyId || '',
        strNguoiThucHien_Id: userId,
      }
    );
    return data || [];
  },

  // DS người gửi theo học kỳ — GET KHCT_LichGiang_DoiLich/LayDSNguoiGuiKhoaQuanLy
  async getNguoiGui(hocKyId: string): Promise<NguoiGuiItem[]> {
    const userId = await getUserId();
    const { data } = await callGet<NguoiGuiItem[]>(
      API_HOSTS.keHoachChuongTrinh,
      'KHCT_LichGiang_DoiLich/LayDSNguoiGuiKhoaQuanLy',
      {
        strChucNang_Id: CHUCNANG_ID_KXNDL,
        strDaoTao_ThoiGianDaoTao_Id: hocKyId || '',
        strNguoiThucHien_Id: userId,
      }
    );
    return data || [];
  },

  // DS trạng thái duyệt (khoa) — GET KHCT_LichGiang_DoiLich/LayDSTinhTrangCapDo
  async getTrangThaiDuyet(): Promise<TrangThaiItem[]> {
    const userId = await getUserId();
    const { data } = await callGet<TrangThaiItem[]>(
      API_HOSTS.keHoachChuongTrinh,
      'KHCT_LichGiang_DoiLich/LayDSTinhTrangCapDo',
      {
        strChucNang_Id: CHUCNANG_ID_KXNDL,
        strNguoiThucHien_Id: userId,
      }
    );
    return data || [];
  },

  // DS kết quả xử lý (đào tạo) — danh mục dữ liệu TKB.LICHGIANG.XACNHANDOILICH
  // GET CMS_DanhMucThuocTinh/LayDanhSachDuLieuTheoBangDM (host CMS)
  async getKetQuaXuLy(): Promise<TrangThaiItem[]> {
    const { data } = await callGet<TrangThaiItem[]>(
      API_HOSTS.cms,
      'CMS_DanhMucThuocTinh/LayDanhSachDuLieuTheoBangDM',
      {
        strMaBangDanhMuc: 'TKB.LICHGIANG.XACNHANDOILICH',
        strTieuChiSapXep: '',
        dTrangThai: '1',
      }
    );
    return data || [];
  },

  // DS yêu cầu đổi lịch — GET KHCT_LichGiang_DoiLich/LayDSLichGiang_Doi_PhamVi_PC
  async getList(params: {
    hocKyId?: string;
    tuNgay?: string;
    denNgay?: string;
    hocPhanId?: string;
    nguoiGuiId?: string;
    trangThaiDuyetId?: string;
    ketQuaXuLyId?: string;
    pageIndex?: number;
    pageSize?: number;
  }): Promise<{ items: YeuCauDoiLichItem[]; total: number }> {
    const userId = await getUserId();
    const { data, pager } = await callGet<YeuCauDoiLichItem[]>(
      API_HOSTS.keHoachChuongTrinh,
      'KHCT_LichGiang_DoiLich/LayDSLichGiang_Doi_PhamVi_PC',
      {
        strTuKhoa: '',
        strChucNang_Id: CHUCNANG_ID_KXNDL,
        strDaoTao_ThoiGianDaoTao_Id: params.hocKyId || '',
        strNgayGuiYeuCau_TuNgay: params.tuNgay || '',
        strNgayGuiYeuCau_DenNgay: params.denNgay || '',
        strDaoTao_HocPhan_Id: params.hocPhanId || '',
        strNguoiGuiYeuCau_Id: params.nguoiGuiId || '',
        strTrangThaiDuyet_Id: params.trangThaiDuyetId || '',
        strTrangThaiXuLy_Id: params.ketQuaXuLyId || '',
        strNguoiThucHien_Id: userId,
        pageIndex: String(params.pageIndex || 1),
        pageSize: String(params.pageSize || 100),
      }
    );
    return { items: data || [], total: pager || (data ? data.length : 0) };
  },

  // Duyệt 1 bản ghi — POST KHCT_LichGiang_DoiLich/Them_LichGiang_CapDoThongQua
  async duyet(params: {
    sanPhamId: string;
    tinhTrangId: string;
    noiDung?: string;
  }): Promise<void> {
    const userId = await getUserId();
    await callPost(API_HOSTS.keHoachChuongTrinh, 'KHCT_LichGiang_DoiLich/Them_LichGiang_CapDoThongQua', {
      strSanPham_Id: params.sanPhamId,
      strNguoiXacnhan_Id: userId,
      strNoiDung: params.noiDung || '',
      strTinhTrang_Id: params.tinhTrangId,
    });
  },

  // Chi tiết 1 yêu cầu đổi lịch — GET KHCT_LichGiang_DoiLich/LayTTLichGiang_Doi
  async getChiTiet(id: string): Promise<ChiTietDoiLichItem | null> {
    const userId = await getUserId();
    const { data } = await callGet<ChiTietDoiLichItem | ChiTietDoiLichItem[]>(
      API_HOSTS.keHoachChuongTrinh,
      'KHCT_LichGiang_DoiLich/LayTTLichGiang_Doi',
      {
        strNguoiThucHien_Id: userId,
        strId: id,
      }
    );
    if (Array.isArray(data)) return data[0] || null;
    return (data as ChiTietDoiLichItem) || null;
  },

  // ======================================================================
  // Đào tạo xử lý đổi lịch — port `lichgiangdaotao.js`. Khác bản khoa:
  //  - Có thêm filter Khoa quản lý
  //  - Học phần & Người gửi dùng endpoint khác (Duyệt thay vì Mục)
  //  - List dùng PhamVi_XL thay vì PhamVi_PC
  //  - Trạng thái duyệt = danh mục TKB.LICHGIANG.DUYETDOILICH (master data)
  //  - Duyệt dùng action khác: Them_TKB_XacNhanDoiLich
  // ======================================================================

  // DS khoa quản lý theo học kỳ — GET KHCT_LichGiang_DoiLich/LayDSKhoaQuanLyChuyenMon
  async getKhoaQuanLy(hocKyId: string): Promise<TrangThaiItem[]> {
    const userId = await getUserId();
    const { data } = await callGet<TrangThaiItem[]>(
      API_HOSTS.keHoachChuongTrinh,
      'KHCT_LichGiang_DoiLich/LayDSKhoaQuanLyChuyenMon',
      {
        strChucNang_Id: CHUCNANG_ID_KXNDL,
        strDaoTao_ThoiGianDaoTao_Id: hocKyId || '',
        strNguoiThucHien_Id: userId,
      }
    );
    return data || [];
  },

  // DS học phần theo (học kỳ + khoa quản lý) — bản đào tạo
  // GET KHCT_LichGiang_DoiLich/LayDSHocPhanDuyetKhoaQuanLy
  async getHocPhanXuLy(hocKyId: string, khoaQuanLyId: string): Promise<HocPhanItem[]> {
    const userId = await getUserId();
    const { data } = await callGet<HocPhanItem[]>(
      API_HOSTS.keHoachChuongTrinh,
      'KHCT_LichGiang_DoiLich/LayDSHocPhanDuyetKhoaQuanLy',
      {
        strChucNang_Id: CHUCNANG_ID_KXNDL,
        strDaoTao_ThoiGianDaoTao_Id: hocKyId || '',
        strDaoTao_KhoaQuanLy_Id: khoaQuanLyId || '',
        strNguoiThucHien_Id: userId,
      }
    );
    return data || [];
  },

  // DS người gửi theo (học kỳ + khoa + học phần) — bản đào tạo
  // GET KHCT_LichGiang_DoiLich/LayDSNguoiGuiDuyetKhoaQuanLy
  async getNguoiGuiXuLy(
    hocKyId: string,
    khoaQuanLyId: string,
    hocPhanId: string
  ): Promise<NguoiGuiItem[]> {
    const userId = await getUserId();
    const { data } = await callGet<NguoiGuiItem[]>(
      API_HOSTS.keHoachChuongTrinh,
      'KHCT_LichGiang_DoiLich/LayDSNguoiGuiDuyetKhoaQuanLy',
      {
        strChucNang_Id: CHUCNANG_ID_KXNDL,
        strDaoTao_ThoiGianDaoTao_Id: hocKyId || '',
        strDaoTao_KhoaQuanLy_Id: khoaQuanLyId || '',
        strDaoTao_HocPhan_Id: hocPhanId || '',
        strNguoiThucHien_Id: userId,
      }
    );
    return data || [];
  },

  // DS trạng thái duyệt (đào tạo) — danh mục TKB.LICHGIANG.DUYETDOILICH
  async getTrangThaiDuyetMaster(): Promise<TrangThaiItem[]> {
    const { data } = await callGet<TrangThaiItem[]>(
      API_HOSTS.cms,
      'CMS_DanhMucThuocTinh/LayDanhSachDuLieuTheoBangDM',
      {
        strMaBangDanhMuc: 'TKB.LICHGIANG.DUYETDOILICH',
        strTieuChiSapXep: '',
        dTrangThai: '1',
      }
    );
    return data || [];
  },

  // DS yêu cầu đổi lịch (xử lý) — GET KHCT_LichGiang_DoiLich/LayDSLichGiang_Doi_PhamVi_XL
  async getListXuLy(params: {
    khoaQuanLyId?: string;
    hocKyId?: string;
    tuNgay?: string;
    denNgay?: string;
    hocPhanId?: string;
    nguoiGuiId?: string;
    trangThaiDuyetId?: string;
    ketQuaXuLyId?: string;
    pageIndex?: number;
    pageSize?: number;
  }): Promise<{ items: YeuCauDoiLichItem[]; total: number }> {
    const userId = await getUserId();
    const { data, pager } = await callGet<YeuCauDoiLichItem[]>(
      API_HOSTS.keHoachChuongTrinh,
      'KHCT_LichGiang_DoiLich/LayDSLichGiang_Doi_PhamVi_XL',
      {
        strTuKhoa: '',
        strDaoTao_KhoaQuanLy_Id: params.khoaQuanLyId || '',
        strDaoTao_ThoiGianDaoTao_Id: params.hocKyId || '',
        strNgayGuiYeuCau_TuNgay: params.tuNgay || '',
        strNgayGuiYeuCau_DenNgay: params.denNgay || '',
        strDaoTao_HocPhan_Id: params.hocPhanId || '',
        strNguoiGuiYeuCau_Id: params.nguoiGuiId || '',
        strTrangThaiDuyet_Id: params.trangThaiDuyetId || '',
        strTrangThaiXuLy_Id: params.ketQuaXuLyId || '',
        strNguoiThucHien_Id: userId,
        pageIndex: String(params.pageIndex || 1),
        pageSize: String(params.pageSize || 100),
      }
    );
    return { items: data || [], total: pager || (data ? data.length : 0) };
  },

  // Duyệt 1 bản ghi (đào tạo) — POST KHCT_LichGiang_DoiLich/Them_TKB_XacNhanDoiLich
  async duyetXuLy(params: {
    sanPhamId: string;
    tinhTrangId: string;
    noiDung?: string;
  }): Promise<void> {
    const userId = await getUserId();
    await callPost(API_HOSTS.keHoachChuongTrinh, 'KHCT_LichGiang_DoiLich/Them_TKB_XacNhanDoiLich', {
      strSanPham_Id: params.sanPhamId,
      strNguoiXacnhan_Id: userId,
      strNoiDung: params.noiDung || '',
      strTinhTrang_Id: params.tinhTrangId,
    });
  },
};

export default lecturerScheduleApprovalService;
