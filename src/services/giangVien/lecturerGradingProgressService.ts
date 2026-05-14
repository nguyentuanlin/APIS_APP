// Thống kê tiến độ nhập điểm theo kế hoạch thi (CCB.TK.KHT / CCB.ND.KHT)
// Port `Modules/thongke/script/nhapdiemlichthi.js`. Toàn bộ GET plain host thiPhach (TP_*).
// Riêng trạng thái lọc dropSearch_HoanThanhNhapDiem từ master danh mục DIEM.TRANGTHAILOC.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_HOSTS } from '../../config/apiHosts';

export interface ThoiGianItem {
  ID: string;
  TEN?: string;
  THOIGIAN?: string;
  [k: string]: any;
}
export interface SimpleItem {
  ID: string;
  TEN: string;
  MA?: string;
  [k: string]: any;
}
export interface LoaiDiemItem {
  ID: string;
  TEN: string;
  MA?: string;
  [k: string]: any;
}

export interface TienDoLichThiItem {
  ID: string;
  NGAYTHI?: string;
  THI_CATHI_TEN?: string;
  GIOBATDAU?: string | number;
  PHUTBATDAU?: string | number;
  GIOKETTHUC?: string | number;
  PHUTKETTHUC?: string | number;
  DAOTAO_HOCPHAN_MA?: string;
  DAOTAO_HOCPHAN_TEN?: string;
  DAOTAO_HOCPHAN_SOTIN?: string | number;
  HINHTHUCTHI_TEN?: string;
  SOSV?: string | number;
  DOTTHI_TEN?: string;
  DSCONGTHUCDIEM?: string;
  DONVIPHUTRACHHOCPHAN_TEN?: string;
  TYLEHOANTHANHTKHP?: string | number;
  // ID con để dùng cho LayTTTienDoNhapDiemTheoDST
  IDCATHI?: string;
  IDDOTTHI?: string;
  IDMONTHI?: string;
  CONGTHUC?: string;
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

export const lecturerGradingProgressService = {
  // Học kỳ — GET TP_Chung/LayThoiGian
  async getThoiGian(): Promise<ThoiGianItem[]> {
    const userId = await getUserId();
    return await callGet<ThoiGianItem[]>(API_HOSTS.thiPhach, 'TP_Chung/LayThoiGian', {
      strNguoiThucHien_Id: userId,
    });
  },

  // Loại điểm theo học kỳ — GET TP_Chung/LayLoaiDiem
  async getLoaiDiem(thoiGianId: string): Promise<LoaiDiemItem[]> {
    const userId = await getUserId();
    return await callGet<LoaiDiemItem[]>(API_HOSTS.thiPhach, 'TP_Chung/LayLoaiDiem', {
      strDaoTao_ThoiGianDaoTao_Id: thoiGianId || '',
      strNguoiThucHien_Id: userId,
    });
  },

  // Hình thức thi — GET TP_Chung/LayHinhThucThi
  async getHinhThucThi(thoiGianId: string, loaiDiemId: string): Promise<SimpleItem[]> {
    const userId = await getUserId();
    return await callGet<SimpleItem[]>(API_HOSTS.thiPhach, 'TP_Chung/LayHinhThucThi', {
      strDiem_ThanhPhanDiem_Id: loaiDiemId || '',
      strDaoTao_ThoiGianDaoTao_Id: thoiGianId || '',
      strNguoiThucHien_Id: userId,
    });
  },

  // Đợt thi — GET TP_Chung/LayDotThi
  async getDotThi(
    thoiGianId: string,
    loaiDiemId: string,
    hinhThucId: string
  ): Promise<SimpleItem[]> {
    const userId = await getUserId();
    return await callGet<SimpleItem[]>(API_HOSTS.thiPhach, 'TP_Chung/LayDotThi', {
      strHinhThucThi_Id: hinhThucId || '',
      strDiem_ThanhPhanDiem_Id: loaiDiemId || '',
      strDaoTao_ThoiGianDaoTao_Id: thoiGianId || '',
      strNguoiThucHien_Id: userId,
    });
  },

  // Học phần — GET TP_Chung/LayHocPhan
  async getMonThi(params: {
    thoiGianId: string;
    loaiDiemId: string;
    hinhThucId: string;
    dotThiId: string;
  }): Promise<SimpleItem[]> {
    const userId = await getUserId();
    return await callGet<SimpleItem[]>(API_HOSTS.thiPhach, 'TP_Chung/LayHocPhan', {
      strDotThi_Id: params.dotThiId || '',
      strHinhThucThi_Id: params.hinhThucId || '',
      strDiem_ThanhPhanDiem_Id: params.loaiDiemId || '',
      strDaoTao_ThoiGianDaoTao_Id: params.thoiGianId || '',
      strNguoiThucHien_Id: userId,
    });
  },

  // Trạng thái lọc xác nhận điểm — master danh mục DIEM.TRANGTHAILOC
  async getTrangThaiLoc(): Promise<SimpleItem[]> {
    const data = await callGet<SimpleItem[]>(
      API_HOSTS.cms,
      'CMS_DanhMucThuocTinh/LayDanhSachDuLieuTheoBangDM',
      {
        strMaBangDanhMuc: 'DIEM.TRANGTHAILOC',
        strTieuChiSapXep: '',
        dTrangThai: '1',
      }
    );
    return data || [];
  },

  // DS lịch thi tiến độ — GET TP_Chung/LayDSThiTheoDotThi
  // Lưu ý: trạng thái lọc trên web dùng MA của danh mục — nên truyền cả MA chứ không ID.
  async getList(params: {
    tuKhoa?: string;
    trangThaiLocMa?: string; // dropSearch_HoanThanhNhapDiem.value (= MA)
    dotThiId?: string;
    hocPhanId?: string;
  }): Promise<TienDoLichThiItem[]> {
    const userId = await getUserId();
    return await callGet<TienDoLichThiItem[]>(
      API_HOSTS.thiPhach,
      'TP_Chung/LayDSThiTheoDotThi',
      {
        strTuKhoa: params.tuKhoa || '',
        dLocKhongHoanThanhNhapDiem: params.trangThaiLocMa || '0',
        strThi_DotThi_Id: params.dotThiId || '',
        strDaoTao_HocPhan_Id: params.hocPhanId || '',
        strNguoiThucHien_Id: userId,
      }
    );
  },

  // DS tên cột chi tiết (loại điểm trong đợt thi cho 1 môn) — GET TP_Chung/LayDSLoaiDiemMonThiTheoDotThi
  async getTenCotChiTiet(dotThiId: string, hocPhanId: string): Promise<LoaiDiemItem[]> {
    const userId = await getUserId();
    return await callGet<LoaiDiemItem[]>(
      API_HOSTS.thiPhach,
      'TP_Chung/LayDSLoaiDiemMonThiTheoDotThi',
      {
        strThi_DotThi_Id: dotThiId || '',
        strDaoTao_HocPhan_Id: hocPhanId || '',
        strNguoiThucHien_Id: userId,
      }
    );
  },

  // Tiến độ nhập điểm cho 1 DST + 1 loại điểm — GET TP_Chung/LayTTTienDoNhapDiemTheoDST
  async getTienDoChiTiet(params: {
    ngayThi: string;
    caThiId: string;
    dotThiId: string;
    monThiId: string;
    congThuc: string;
    loaiDiemId: string;
    dstId: string;
  }): Promise<TienDoKetQua[]> {
    return await callGet<TienDoKetQua[]>(
      API_HOSTS.thiPhach,
      'TP_Chung/LayTTTienDoNhapDiemTheoDST',
      {
        strNgayThi: params.ngayThi || '',
        strCaThi_Id: params.caThiId || '',
        strThi_DotThi_Id: params.dotThiId || '',
        strDaoTao_HocPhan_Id: params.monThiId || '',
        strCongThucDiem: params.congThuc || '',
        strDiem_ThanhPhanDiem_Id: params.loaiDiemId || '',
        strThi_DanhSachThi_Id: params.dstId || '',
      }
    );
  },
};

export default lecturerGradingProgressService;
