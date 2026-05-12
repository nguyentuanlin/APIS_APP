// Thời khóa biểu / Lịch giảng (CCB.TKH) — port web `Modules/lichgiang/script/lichgiang.js`.
// API chính: GET nhansuapi/api/NS_ThongTinCanBo/LayDSLichGiang (plain, không encrypted).
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AE, AD } from '../../crypto';
import { API_HOSTS } from '../config/apiHosts';

export const CHUCNANG_ID_TKH = '46F0779BAA4A4E5B946F998E91D84858';

export interface HocKyItem {
  ID: string;
  THOIGIAN: string;
  [k: string]: any;
}

export interface DoiLichItem {
  ID: string;
  LOPHOCPHAN_TEN: string;
  KETQUAXULY: string;
  NGAYHOC?: string;
  NGAYDOI?: string;
  [k: string]: any;
}

export interface LichGiangItem {
  ID: string;
  IDLOPHOCPHAN: string;
  IDLICHHOC?: string;
  IDHOCPHAN?: string;
  IDPHONGHOC?: string;
  IDHINHTHUCXEP?: string;
  TENHOCPHAN: string;
  TENLOPHOCPHAN: string;
  TENPHONGHOC: string;
  NGAYHOC: string; // dd/MM/yyyy
  THU?: string | number;
  THUHOC?: string | number;
  GIOBATDAU: number;
  PHUTBATDAU: number;
  GIOKETTHUC: number;
  PHUTKETTHUC: number;
  TIETBATDAU?: number | string;
  TIETKETTHUC?: number | string;
  [k: string]: any;
}

export interface KieuChuyenCanItem {
  ID: string;
  TEN: string;
  MA?: string;
  [k: string]: any;
}

export interface SinhVienLichItem {
  QLSV_NGUOIHOC_ID: string;
  QLSV_NGUOIHOC_MASO: string;
  QLSV_NGUOIHOC_HODEM: string;
  QLSV_NGUOIHOC_TEN: string;
  SOBUOIVANG?: string | number;
  IPDIEMDANHNGUOIHOC?: string;
  MATLENHNGUOIHOC?: string;
  MATLENHGIANGVIEN?: string;
  DAOTAO_TOCHUCCHUONGTRINH_ID?: string;
  QLSV_TRANGTHAINGUOIHOC_ID?: string;
  DANGKY_LOPHOCPHAN_ID?: string;
  [k: string]: any;
}

export interface ChuyenCanResultItem {
  QLSV_NGUOIHOC_ID: string;
  KIEUCHUYENCAN_ID: string;
  GIATRI: number;
  SOLUONG: number;
  [k: string]: any;
}

export interface PhongHocItem {
  ID: string;
  TEN: string;
  [k: string]: any;
}

// Cán bộ (giảng viên) cho admin schedule
export interface CanBoItem {
  ID: string;
  MASO: string;
  HODEM: string;
  TEN: string;
  DAOTAO_COCAUTOCHUC_TEN?: string;
  [k: string]: any;
}

// Sinh viên (cho TKB SV tra cứu)
export interface SinhVienSearchItem {
  ID: string;
  MASO: string;
  HODEM: string;
  TEN: string;
  DAOTAO_LOPQUANLY_TEN?: string;
  [k: string]: any;
}

export interface KhoiTaoDoiLichData {
  rsThongTinChung: Array<{
    NOIDUNG?: string;
    LOPHOCPHAN_TEN: string;
    NGAYHOC: string;
    NGAYHOC_THAYDOI: string;
    TIETBATDAU: number;
    TIETBATDAU_THAYDOI: number;
    TIETKETTHUC: number;
    TIETKETTHUC_THAYDOI: number;
    PHONGHOC_TEN: string;
    IDPHONGHOC_THAYDOI: string;
    [k: string]: any;
  }>;
  rsDanhMucPhong: PhongHocItem[];
  rsGiangVien: Array<{ ID: string; HODEM: string; TEN: string; MASO: string }>;
  rsDanhMucGiangVien: Array<{ ID: string; HODEM: string; TEN: string; MASO: string }>;
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

// Cho LayChiTiet với object phức (Data không phải mảng)
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

// POST encrypted (AE/AD) cho action có suffix _MH/<key>
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
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ A: AE(JSON.stringify(payload), encryptionKey) }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} - ${actionPath}`);
  const temp = await res.json();
  if (!temp.Success) throw new Error(temp.Message || `${actionPath} fail`);
  if (temp.Data && typeof temp.Data === 'object' && 'B' in temp.Data) {
    const decrypted = AD(temp.Data.B, payload.iM);
    if (!decrypted) throw new Error('Không thể giải mã dữ liệu');
    const parsed = JSON.parse(decrypted);
    if (Array.isArray(parsed)) return parsed as T;
    if (parsed?.Data && Array.isArray(parsed.Data)) return parsed.Data as T;
    return parsed as T;
  }
  return temp.Data as T;
}

async function callPost(
  baseUrl: string,
  action: string,
  body: Record<string, any>
): Promise<any> {
  if (!baseUrl) throw new Error(`Base URL cho ${action} chưa cấu hình`);
  const token = await getAuthToken();
  // API legacy đa số nhận form-urlencoded — encrypted MH thì nhận JSON. Ở đây
  // CC_*, KHCT_LichGiang_DoiLich/* là plain → dùng JSON cho gọn, server chấp nhận.
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

const pad2 = (n: number) => (n < 10 ? '0' + n : '' + n);
const fmtDate = (d: Date) => `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`;

export const lecturerScheduleService = {
  // Lấy lịch giảng theo khoảng tuần. Nếu truyền canBoId thì lấy theo cán bộ đó (admin),
  // không truyền thì mặc định lấy theo user hiện tại.
  async getLichGiang(
    ngayBatDau: string,
    ngayKetThuc: string,
    canBoId?: string
  ): Promise<LichGiangItem[]> {
    const id = canBoId || (await getUserId());
    return await callGet<LichGiangItem[]>(API_HOSTS.nhanSu, 'NS_ThongTinCanBo/LayDSLichGiang', {
      strNhanSu_HoSoCanBo_Id: id,
      strNgayBatDau: ngayBatDau,
      strNgayKetThuc: ngayKetThuc,
      strNgayDangChon: ngayBatDau,
    });
  },

  // Tìm cán bộ theo từ khóa (mã số / họ tên) — cho admin chọn cán bộ.
  // Web: GET NS_ThongTinCanBo/LayTTGiangVienTheoTuKhoa
  async searchCanBo(tuKhoa: string): Promise<CanBoItem[]> {
    const userId = await getUserId();
    return await callGet<CanBoItem[]>(
      API_HOSTS.nhanSu,
      'NS_ThongTinCanBo/LayTTGiangVienTheoTuKhoa',
      {
        strTuKhoa: tuKhoa || '',
        strNguoiThucHien_Id: userId,
      }
    );
  },

  // Tìm sinh viên theo mã số — cho TKB sinh viên.
  // Web: POST encrypted NS_ThongTinCanBo_MH/DSA4FRUPJjQuKAkuIhUpJC4MIBIu
  // func: pkg_congthongtincanbo.LayTTNguoiHocTheoMaSo
  async searchSinhVien(tuKhoa: string): Promise<SinhVienSearchItem[]> {
    const userId = await getUserId();
    const encKey = 'DSA4FRUPJjQuKAkuIhUpJC4MIBIu';
    const data = await callEncryptedPost<SinhVienSearchItem[]>(
      API_HOSTS.nhanSu,
      `NS_ThongTinCanBo_MH/${encKey}`,
      encKey,
      {
        func: 'pkg_congthongtincanbo.LayTTNguoiHocTheoMaSo',
        iM: 'Azz',
        strTuKhoa: tuKhoa || '',
        strNguoiThucHien_Id: userId,
      }
    );
    return Array.isArray(data) ? data : [];
  },

  // Lịch giảng của 1 sinh viên trong khoảng tuần.
  // Web: POST encrypted SV_ThongTin_MH/DSA4BRINKCIpAiAPKSAv
  // func: pkg_congthongtin_hssv_thongtin.LayDSLichCaNhan
  async getLichSinhVien(
    sinhVienId: string,
    ngayBatDau: string,
    ngayKetThuc: string
  ): Promise<LichGiangItem[]> {
    const encKey = 'DSA4BRINKCIpAiAPKSAv';
    const data = await callEncryptedPost<LichGiangItem[]>(
      API_HOSTS.sinhVien,
      `SV_ThongTin_MH/${encKey}`,
      encKey,
      {
        func: 'pkg_congthongtin_hssv_thongtin.LayDSLichCaNhan',
        iM: 'Azz',
        strQLSV_NguoiHoc_Id: sinhVienId,
        strNgayBatDau: ngayBatDau,
        strNgayKetThuc: ngayKetThuc,
      }
    );
    return Array.isArray(data) ? data : [];
  },

  // Học kỳ theo lịch cá nhân (dùng cho Báo cáo)
  async getHocKy(): Promise<HocKyItem[]> {
    const userId = await getUserId();
    return await callGet<HocKyItem[]>(API_HOSTS.nhanSu, 'NS_ThongTinCanBo/LayHocKyTheoLichCaNhan', {
      strNhanSu_HoSoCanBo_Id: userId,
    });
  },

  // Danh sách lớp đổi lịch của cá nhân
  async getDSDoiLich(): Promise<DoiLichItem[]> {
    const userId = await getUserId();
    return await callGet<DoiLichItem[]>(
      API_HOSTS.keHoachChuongTrinh,
      'KHCT_LichGiang_DoiLich/LayDSLichGiang_Doi_ThongTinCaNhan',
      {
        strNguoiThucHien_Id: userId,
      }
    );
  },

  // Helper: lấy Monday cùng tuần với date đã cho (offsetWeek = 0 = tuần hiện tại,
  // -1 = tuần trước, +1 = tuần sau)
  getWeekRange(offsetWeek: number = 0): { start: Date; end: Date; startStr: string; endStr: string } {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    // getDay(): Sun = 0, Mon = 1, ..., Sat = 6 — quy về Mon-Sun
    const day = today.getDay();
    const diffToMonday = day === 0 ? -6 : 1 - day;
    const monday = new Date(today);
    monday.setDate(today.getDate() + diffToMonday + offsetWeek * 7);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    return {
      start: monday,
      end: sunday,
      startStr: fmtDate(monday),
      endStr: fmtDate(sunday),
    };
  },

  // Helper: list 7 ngày trong tuần
  getDaysOfWeek(start: Date): Date[] {
    return Array.from({ length: 7 }).map((_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  },

  // ===== Điểm danh / DS sinh viên cho 1 buổi học =====

  // Lấy danh sách kiểu chuyên cần (Có mặt, Vắng có phép, Vắng không phép, ...)
  // Web: POST encrypted XLHV_CC_ThongTin_MH/DSA4BRIKKCQ0Aik0OCQvAiAv
  // func: PKG_CHUYENCAN_THONGTIN.LayDSKieuChuyenCan
  async getKieuChuyenCan(lopHocPhanId: string): Promise<KieuChuyenCanItem[]> {
    const userId = await getUserId();
    const encKey = 'DSA4BRIKKCQ0Aik0OCQvAiAv';
    const data = await callEncryptedPost<KieuChuyenCanItem[]>(
      API_HOSTS.xuLyHocVu,
      `XLHV_CC_ThongTin_MH/${encKey}`,
      encKey,
      {
        func: 'PKG_CHUYENCAN_THONGTIN.LayDSKieuChuyenCan',
        iM: 'AzzSystem',
        strDaoTao_LopHocPhan_Id: lopHocPhanId,
        strNguoiThucHien_Id: userId,
      }
    );
    return Array.isArray(data) ? data : [];
  },

  // Danh sách sinh viên của 1 buổi học cụ thể
  // GET nhansuapi/api/NS_ThongTinCanBo/LayDSDangKyHoc_2
  async getSinhVienLich(
    lopHocPhanId: string,
    ngayHoc: string,
    gioBatDau: number,
    phutBatDau: number,
    sortType: string = 'ABC'
  ): Promise<SinhVienLichItem[]> {
    const userId = await getUserId();
    return await callGet<SinhVienLichItem[]>(API_HOSTS.nhanSu, 'NS_ThongTinCanBo/LayDSDangKyHoc_2', {
      strTuKhoa: '',
      strNgayGhiNhan: ngayHoc,
      dGio: String(gioBatDau),
      dPhut: String(phutBatDau),
      dGiay: '0',
      strTieuChiSapXep: sortType,
      strReport_Id: '',
      strDaoTao_LopHocPhan_Id: lopHocPhanId,
      strNguoiThucHien_Id: userId,
    });
  },

  // Kết quả điểm danh đã ghi của buổi học hiện tại
  // GET chuyencanapi/api/CC_ThoiGian_ChuyenCan/LayKetQuaTheoKieuChuyenCan
  async getKetQuaChuyenCan(
    lopHocPhanId: string,
    ngayHoc: string,
    gioBatDau: number,
    phutBatDau: number
  ): Promise<ChuyenCanResultItem[]> {
    return await callGet<ChuyenCanResultItem[]>(
      API_HOSTS.chuyenCan,
      'CC_ThoiGian_ChuyenCan/LayKetQuaTheoKieuChuyenCan',
      {
        strKieuChuyenCan_Id: '',
        strNgayGhiNhan: ngayHoc,
        strGio: String(gioBatDau),
        strPhut: String(phutBatDau),
        strGiay: '0',
        strQLSV_NguoiHoc_Id: '',
        strDaoTao_LopHocPhan_Id: lopHocPhanId,
      }
    );
  },

  // Thêm 1 dòng điểm danh (host chuyencanapi)
  async saveDiemDanh(params: {
    sv: SinhVienLichItem;
    kieuChuyenCanId: string;
    ngayHoc: string;
    gioBatDau: number;
    phutBatDau: number;
    soLuong?: number;
  }): Promise<void> {
    const userId = await getUserId();
    const { sv, kieuChuyenCanId, ngayHoc, gioBatDau, phutBatDau, soLuong } = params;
    await callPost(API_HOSTS.chuyenCan, 'CC_NguoiHoc_ChuyenCan/ThemMoi', {
      strId: '',
      strChucNang_Id: CHUCNANG_ID_TKH,
      strNguoiThucHien_Id: userId,
      strQLSV_NguoiHoc_Id: sv.QLSV_NGUOIHOC_ID,
      strDaoTao_LopQuanLy_Id: '',
      strDaoTao_ChuongTrinh_Id: sv.DAOTAO_TOCHUCCHUONGTRINH_ID || '',
      strQLSV_TrangThaiNguoiHoc_Id: sv.QLSV_TRANGTHAINGUOIHOC_ID || '',
      strDiem_DanhSach_Id: sv.DANGKY_LOPHOCPHAN_ID || '',
      strKieuChuyenCan_Id: kieuChuyenCanId,
      strNgayGhiNhan: ngayHoc,
      dSoLuong: soLuong || 0,
      dGio: gioBatDau,
      dPhut: phutBatDau,
      dGiay: 0,
    });
  },

  // Xóa 1 dòng điểm danh (host chuyencanapi)
  async deleteDiemDanh(params: {
    sv: SinhVienLichItem;
    kieuChuyenCanId: string;
    ngayHoc: string;
    gioBatDau: number;
    phutBatDau: number;
  }): Promise<void> {
    const userId = await getUserId();
    const { sv, kieuChuyenCanId, ngayHoc, gioBatDau, phutBatDau } = params;
    await callPost(API_HOSTS.chuyenCan, 'CC_NguoiHoc_ChuyenCan/Xoa_QLSV_NguoiHoc_ChuyenCan2', {
      strId: '',
      strChucNang_Id: CHUCNANG_ID_TKH,
      strNguoiThucHien_Id: userId,
      strQLSV_NguoiHoc_Id: sv.QLSV_NGUOIHOC_ID,
      strDaoTao_LopQuanLy_Id: '',
      strDaoTao_ChuongTrinh_Id: sv.DAOTAO_TOCHUCCHUONGTRINH_ID || '',
      strQLSV_TrangThaiNguoiHoc_Id: sv.QLSV_TRANGTHAINGUOIHOC_ID || '',
      strDiem_DanhSachHoc_Id: sv.DANGKY_LOPHOCPHAN_ID || '',
      strKieuChuyenCan_Id: kieuChuyenCanId,
      strNgayGhiNhan: ngayHoc,
      dSoLuong: 0,
      dGio: gioBatDau,
      dPhut: phutBatDau,
      dGiay: 0,
    });
  },

  // ===== Đổi lịch =====

  // Khởi tạo form đổi lịch — trả về thông tin chung + DS phòng + DS GV
  async getKhoiTaoDoiLich(lich: LichGiangItem): Promise<KhoiTaoDoiLichData> {
    const userId = await getUserId();
    const data = await callGetRaw<KhoiTaoDoiLichData>(
      API_HOSTS.keHoachChuongTrinh,
      'KHCT_LichGiang_DoiLich/KhoiTaoThongTinYeuCauDoiLich',
      {
        strNguoiThucHien_Id: userId,
        strIdLichHoc: String(lich.IDLICHHOC || lich.ID),
        strIdHocPhan: String(lich.IDHOCPHAN || ''),
        strIdPhongHoc: String(lich.IDPHONGHOC || ''),
        strIdLopHocPhan: String(lich.IDLOPHOCPHAN || ''),
        strNgayHoc: lich.NGAYHOC,
        strThu: String(lich.THUHOC || lich.THU || ''),
        strTietBatDau: String(lich.TIETBATDAU || ''),
        strTietKetThuc: String(lich.TIETKETTHUC || ''),
        strGioBatDau: String(lich.GIOBATDAU),
        strPhutBatDau: String(lich.PHUTBATDAU),
        strGioKetThuc: String(lich.GIOKETTHUC),
        strPhutKetThuc: String(lich.PHUTKETTHUC),
      }
    );
    return {
      rsThongTinChung: data?.rsThongTinChung || [],
      rsDanhMucPhong: data?.rsDanhMucPhong || [],
      rsGiangVien: data?.rsGiangVien || [],
      rsDanhMucGiangVien: data?.rsDanhMucGiangVien || [],
    };
  },

  // Gửi yêu cầu đổi lịch
  async guiYeuCauDoiLich(params: {
    lich: LichGiangItem;
    noiDung: string;
    ngayHocMoi: string;
    tietBatDauMoi: string;
    tietKetThucMoi: string;
    phongHocMoiId: string;
    giangVienIds?: string;
    giangVienMoiIds?: string;
  }): Promise<void> {
    const userId = await getUserId();
    const { lich } = params;
    await callPost(API_HOSTS.keHoachChuongTrinh, 'KHCT_LichGiang_DoiLich/GuiYeuCauDoiLich', {
      strIdLichHoc: lich.IDLICHHOC || lich.ID,
      strIdHocPhan: lich.IDHOCPHAN || '',
      strIdPhongHoc: lich.IDPHONGHOC || '',
      strIdLopHocPhan: lich.IDLOPHOCPHAN || '',
      strNgayHoc: lich.NGAYHOC,
      strThu: String(lich.THUHOC || lich.THU || ''),
      strTietBatDau: String(lich.TIETBATDAU || ''),
      strTietKetThuc: String(lich.TIETKETTHUC || ''),
      strGioBatDau: String(lich.GIOBATDAU),
      strPhutBatDau: String(lich.PHUTBATDAU),
      strGioKetThuc: String(lich.GIOKETTHUC),
      strPhutKetThuc: String(lich.PHUTKETTHUC),
      strIdHinhThucXep: lich.IDHINHTHUCXEP || '',
      strNguoiThucHien_Id: userId,
      strNoiDung: params.noiDung,
      strIdPhongHoc_ThayDoi: params.phongHocMoiId,
      strNgayHoc_ThayDoi: params.ngayHocMoi,
      strThu_ThayDoi: '',
      strTietBatDau_ThayDoi: params.tietBatDauMoi,
      strTietKetThuc_ThayDoi: params.tietKetThucMoi,
      strGioBatDau_ThayDoi: '',
      strPhutBatDau_ThayDoi: '',
      strGioKetThuc_ThayDoi: '',
      strPhutKetThuc_ThayDoi: '',
      strGiangVien_Ids: params.giangVienIds || '',
      strGiangVien_ThayDoi_Ids: params.giangVienMoiIds || '',
    });
  },

  formatDate: fmtDate,
};

export default lecturerScheduleService;
