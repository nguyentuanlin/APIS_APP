// Nhập điểm theo danh sách thi (CBB.NDDST) — wrap các API trong web cán bộ:
// `Modules/nhapdiem/script/nhapdiemdst.js` của loginVT-main.
// Tất cả đều GET plain (không encrypted), host = thiphachapi hoặc quanlydiemapi.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_HOSTS } from '../../config/apiHosts';

// CHUCNANG_ID của "Nhập điểm theo danh sách thi" trong bảng menu cán bộ.
// Lấy từ log getMenuByRole: MACHUCNANG='CBB.NDDST'. Backend cần biết user đang
// thao tác qua chức năng nào (để log audit + check quyền) — chỉ cần truyền đúng
// một lần là enough.
export const CHUCNANG_ID_NDDST = '31035C11BE9848B99A1CCC606A809148';
export const CHUCNANG_ID_NDP = '22DAAEBAE8EA40EF963D14CF30255254';

export interface ComboItem {
  ID: string;
  TEN: string;
  THOIGIAN?: string; // riêng học kỳ: hiển thị THOIGIAN thay vì TEN
  MA?: string;
}

export interface DanhSachThiItem {
  ID: string;
  MADANHSACHTHI: string;
  THONGTINLOPHOCPHAN: string;
  NGAYTHI: string;
  THI_CATHI_TEN: string;
  TKB_PHONGTHI_TEN: string;
  XACNHANHOANTHANHDIEMTHI: number;
  [k: string]: any;
}

export interface HanhDongXacNhanItem {
  ID: string;
  TEN: string;
  [k: string]: any;
}

export const LOAI_XACNHAN_HOANTHANH_DIEMTHI = 'XACNHAN_HOANTHANH_DIEMTHI';

// ---- Nhập điểm theo phách ----
export interface DotPhachItem {
  ID: string;
  TEN: string;
  XACNHANHOANTHANHDIEMTHI?: number;
  [k: string]: any;
}

export interface TuiBaiItem {
  ID: string;
  TEN: string;
  QUYTACTAOTUI_TEN?: string;
  QUYTACTAOPHACH_TEN?: string;
  BUOCNHAY?: string;
  SOBATDAU?: string;
  [k: string]: any;
}

export interface PhachItem {
  ID: string;
  SOPHACH: string;
  DIEMBANDAU: string | number;
  THONGTINXULY?: string;
  [k: string]: any;
}

export interface NguoiHocItem {
  ID: string; // = Thi_DanhSachSinhVien_Id (dùng để PUT điểm)
  QLSV_NGUOIHOC_ID: string;
  QLSV_NGUOIHOC_MASO: string;
  QLSV_NGUOIHOC_HODEM: string;
  QLSV_NGUOIHOC_TEN: string;
  DAOTAO_LOPQUANLY_TEN: string;
  DIEM_THANHPHANDIEM_TEN: string;
  LANHOC: string;
  LANTHI: string;
  SOBAODANH: string;
  DIEMBANDAU: string | number;
  THANGDIEM: string | number;
  DIEM_DANHSACHHOC_TEN: string;
  TRANGTHAI: string;
  CAMTHI_DUYETDKTHI?: string;
  CAMTHI_VIPHAMQUYCHE?: string;
  IDDANHSACHTHI?: string;
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
  if (!baseUrl) {
    throw new Error(
      `Base URL cho ${action} chưa được cấu hình. Hãy restart Metro: "npx expo start -c"`
    );
  }
  const token = await getAuthToken();
  const qs = new URLSearchParams(params).toString();
  const url = `${baseUrl}/${action}${qs ? `?${qs}` : ''}`;

  let res: Response;
  try {
    res = await fetch(url, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch (netErr: any) {
    throw new Error(`Không gọi được ${action}.\nURL: ${url}\n${netErr?.message || 'Network request failed'}`);
  }
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} - ${action}`);
  }
  const json = await res.json();
  if (!json.Success) throw new Error(json.Message || `${action} trả về Success=false`);
  return json.Data as T;
}

async function callPost<T = any>(
  baseUrl: string,
  action: string,
  body: Record<string, any>
): Promise<T> {
  if (!baseUrl) {
    throw new Error(
      `Base URL cho ${action} chưa được cấu hình. Hãy restart Metro: "npx expo start -c"`
    );
  }
  const token = await getAuthToken();
  const res = await fetch(`${baseUrl}/${action}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  if (!json.Success) throw new Error(json.Message || `${action} trả về Success=false`);
  return json.Data as T;
}

export const lecturerGradeEntryService = {
  // Combo: Học kỳ (LayThoiGian)
  async getThoiGian(): Promise<ComboItem[]> {
    const userId = await getUserId();
    const data = await callGet<ComboItem[]>(API_HOSTS.thiPhach, 'TP_Chung/LayThoiGian', {
      strNguoiThucHien_Id: userId,
    });
    return data || [];
  },

  // Combo: Loại điểm
  async getLoaiDiem(strThoiGianId: string): Promise<ComboItem[]> {
    const userId = await getUserId();
    const data = await callGet<ComboItem[]>(API_HOSTS.thiPhach, 'TP_Chung/LayLoaiDiem', {
      strDaoTao_ThoiGianDaoTao_Id: strThoiGianId || '',
      strNguoiThucHien_Id: userId,
    });
    return data || [];
  },

  // Combo: Hình thức thi
  async getHinhThucThi(strLoaiDiemId: string, strThoiGianId: string): Promise<ComboItem[]> {
    const userId = await getUserId();
    const data = await callGet<ComboItem[]>(API_HOSTS.thiPhach, 'TP_Chung/LayHinhThucThi', {
      strDiem_ThanhPhanDiem_Id: strLoaiDiemId || '',
      strDaoTao_ThoiGianDaoTao_Id: strThoiGianId || '',
      strNguoiThucHien_Id: userId,
    });
    return data || [];
  },

  // Combo: Đợt thi
  async getDotThi(
    strHinhThucId: string,
    strLoaiDiemId: string,
    strThoiGianId: string
  ): Promise<ComboItem[]> {
    const userId = await getUserId();
    const data = await callGet<ComboItem[]>(API_HOSTS.thiPhach, 'TP_Chung/LayDotThi', {
      strHinhThucThi_Id: strHinhThucId || '',
      strDiem_ThanhPhanDiem_Id: strLoaiDiemId || '',
      strDaoTao_ThoiGianDaoTao_Id: strThoiGianId || '',
      strNguoiThucHien_Id: userId,
    });
    return data || [];
  },

  // Combo: Môn thi (Học phần)
  async getMonThi(
    strDotThiId: string,
    strHinhThucId: string,
    strLoaiDiemId: string,
    strThoiGianId: string
  ): Promise<ComboItem[]> {
    const userId = await getUserId();
    const data = await callGet<ComboItem[]>(API_HOSTS.thiPhach, 'TP_Chung/LayHocPhan', {
      strDotThi_Id: strDotThiId || '',
      strHinhThucThi_Id: strHinhThucId || '',
      strDiem_ThanhPhanDiem_Id: strLoaiDiemId || '',
      strDaoTao_ThoiGianDaoTao_Id: strThoiGianId || '',
      strNguoiThucHien_Id: userId,
    });
    return data || [];
  },

  // Bảng chính: Danh sách thi (theo Đợt thi + Môn thi)
  async getDanhSachThi(strDotThiId: string, strMonThiId: string): Promise<DanhSachThiItem[]> {
    const userId = await getUserId();
    const data = await callGet<DanhSachThiItem[]>(API_HOSTS.thiPhach, 'TP_Chung/LayDSThiTheoDotThi', {
      strThi_DotThi_Id: strDotThiId || '',
      strDaoTao_HocPhan_Id: strMonThiId || '',
      strNguoiThucHien_Id: userId,
    });
    return data || [];
  },

  // Danh sách sinh viên trong 1 danh sách thi
  async getNguoiHocTheoDST(strDanhSachThiId: string): Promise<NguoiHocItem[]> {
    const userId = await getUserId();
    const data = await callGet<NguoiHocItem[]>(API_HOSTS.thiPhach, 'TP_Chung/LayDSNguoiHocTheoDST', {
      strDanhSachThi_Id: strDanhSachThiId,
      strNguoiThucHien_Id: userId,
    });
    return data || [];
  },

  // Lấy danh sách hành động xác nhận (Đã xác nhận / Chưa xác nhận / ...)
  // Web: GET D_HanhDongXacNhan/LayDanhSach
  async getHanhDongXacNhan(
    strDanhSachThiId: string,
    chucNangId: string = CHUCNANG_ID_NDDST
  ): Promise<HanhDongXacNhanItem[]> {
    const userId = await getUserId();
    const data = await callGet<HanhDongXacNhanItem[]>(
      API_HOSTS.quanLyDiem,
      'D_HanhDongXacNhan/LayDanhSach',
      {
        strChucNang_Id: chucNangId,
        strLoaiXacNhan_Id: LOAI_XACNHAN_HOANTHANH_DIEMTHI,
        strNguoiThucHien_Id: userId,
        strDiem_DanhSachHoc_Id: strDanhSachThiId,
      }
    );
    return data || [];
  },

  // Thêm xác nhận hoàn thành cho 1 DS thi / Đợt phách
  // Web: POST D_XacNhan/Them_Diem_XacNhan
  async confirmHoanThanh(
    strSanPhamId: string,
    strHanhDongId: string,
    strNote: string = '',
    chucNangId: string = CHUCNANG_ID_NDDST
  ): Promise<void> {
    const userId = await getUserId();
    await callPost(API_HOSTS.quanLyDiem, 'D_XacNhan/Them_Diem_XacNhan', {
      strChucNang_Id: chucNangId,
      strNguoiThucHien_Id: userId,
      strDiem_DanhSachHoc_Id: strSanPhamId,
      strHanhDong_Id: strHanhDongId,
      strLoaiXacNhan_Id: LOAI_XACNHAN_HOANTHANH_DIEMTHI,
      strThongTinXacNhan: strNote,
      strNguoiXacNhan_Id: userId,
      strDuLieuXacNhan: strSanPhamId,
    });
  },

  // ===== Nhập điểm theo phách (CCB.NDP) =====

  // Bảng chính: Danh sách Đợt phách theo Đợt thi + Môn thi
  // Web: GET TP_Chung/LayDotTaoPhach
  async getDotPhach(strDotThiId: string, strMonThiId: string): Promise<DotPhachItem[]> {
    const userId = await getUserId();
    const data = await callGet<DotPhachItem[]>(API_HOSTS.thiPhach, 'TP_Chung/LayDotTaoPhach', {
      strDotThi_Id: strDotThiId || '',
      strDaoTao_HocPhan_Id: strMonThiId || '',
      strNguoiThucHien_Id: userId,
    });
    return data || [];
  },

  // Combo "Chọn túi" trong 1 đợt phách
  // Web: GET TP_Chung/LayDSTuiTheoDotPhach
  async getTuiTheoDotPhach(strDotPhachId: string): Promise<TuiBaiItem[]> {
    const userId = await getUserId();
    const data = await callGet<TuiBaiItem[]>(API_HOSTS.thiPhach, 'TP_Chung/LayDSTuiTheoDotPhach', {
      strThi_DotPhach_Id: strDotPhachId,
      strNguoiThucHien_Id: userId,
    });
    return data || [];
  },

  // Danh sách phách trong 1 túi
  // Web: GET TP_XuLy/LayDSPhachTheoTui
  async getPhachTheoTui(strTuiBaiId: string): Promise<PhachItem[]> {
    const userId = await getUserId();
    const data = await callGet<PhachItem[]>(API_HOSTS.thiPhach, 'TP_XuLy/LayDSPhachTheoTui', {
      strThi_TuiBai_Id: strTuiBaiId,
      strNguoiThucHien_Id: userId,
    });
    return data || [];
  },

  // Lưu 1 dòng điểm phách
  // Web: POST TP_XuLy/CapNhat_DiemPhachTheoTuiBai
  async saveDiemPhach(
    strThi_TuiBai_NguoiHoc_Id: string,
    strSoPhach: string,
    strDiem: string,
    appId: string
  ): Promise<void> {
    const userId = await getUserId();
    await callPost(API_HOSTS.thiPhach, 'TP_XuLy/CapNhat_DiemPhachTheoTuiBai', {
      strChucNang_Id: CHUCNANG_ID_NDP,
      strUngDung_Id: appId,
      strNguoiThucHien_Id: userId,
      strThi_TuiBai_NguoiHoc_Id,
      strSoPhach,
      strDiem,
    });
  },

  // Lưu 1 dòng điểm. strThi_DanhSachSinhVien_Id = ID của NguoiHocItem
  async saveDiem(
    strThi_DanhSachSinhVien_Id: string,
    strDiem: string,
    appId: string
  ): Promise<void> {
    const userId = await getUserId();
    await callPost(API_HOSTS.thiPhach, 'TP_XuLy/CapNhat_DiemPhachTheoDST', {
      strChucNang_Id: CHUCNANG_ID_NDDST,
      strUngDung_Id: appId,
      strNguoiThucHien_Id: userId,
      strThi_DanhSachSinhVien_Id,
      strDiem,
    });
  },
};

export default lecturerGradeEntryService;
