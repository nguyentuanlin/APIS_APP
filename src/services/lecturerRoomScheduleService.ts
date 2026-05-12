// TKB - Phòng học - Đăng ký mượn phòng (CCB.TKHNPH)
// Port `Modules/lichgiang/script/lichgiangphonghoc.js`.
// - GET DS phòng học + lịch phòng theo tuần: encrypted POST host nhanSu (NS_*)
// - Đăng ký / kiểm tra trùng / get list đăng ký / duyệt: encrypted POST host dangKyHoc (DKH_*)
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AE, AD } from '../../crypto';
import { API_HOSTS } from '../config/apiHosts';

export const CHUCNANG_ID_TKHNPH = '00000000000000000000000000000000'; // placeholder — backend dùng strChucNang_Id từ JWT

export interface PhongHocItem {
  ID: string;
  TEN: string;
  MA?: string;
  KIEUPHONG?: string;
  MOTAKIEUPHONG?: string;
  TOANHA_ID?: string;
  TKB_TOANHA_ID?: string;
  [k: string]: any;
}

export interface ToaNhaItem {
  ID: string;
  TENTOANHA: string;
  // Alias để dùng chung với picker (set bằng service từ TENTOANHA)
  TEN: string;
  [k: string]: any;
}

// Lịch phòng — reuse cấu trúc giống LichGiangItem (TENHOCPHAN/TENLOPHOCPHAN/...)
export interface LichPhongItem {
  ID: string;
  IDLOPHOCPHAN?: string;
  TENHOCPHAN?: string;
  TENLOPHOCPHAN?: string;
  TENPHONGHOC?: string;
  NGAYHOC: string;
  GIOBATDAU: number;
  PHUTBATDAU: number;
  GIOKETTHUC: number;
  PHUTKETTHUC: number;
  TIETBATDAU?: number | string;
  TIETKETTHUC?: number | string;
  MUCDICHSUDUNG?: string;
  NGUOIDANGKY_TENDAYDU?: string;
  [k: string]: any;
}

export interface DangKyPhongItem {
  // Fields cực kỳ thay đổi tùy backend — dùng kiểu loose
  [k: string]: any;
}

export interface TrangThaiDuyetItem {
  ID: string;
  TEN: string;
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
  // Lưu Message + Id để caller dùng (cho đăng ký Pr_Tkb_Dk_Phong_Tg_Ins)
  const meta = { Message: temp.Message, Id: temp.Id, Pager: temp.Pager };
  if (temp.Data && typeof temp.Data === 'object' && 'B' in temp.Data) {
    const decrypted = AD(temp.Data.B, body.iM);
    if (!decrypted) throw new Error('Không thể giải mã dữ liệu');
    const parsed = JSON.parse(decrypted);
    let out: any;
    if (Array.isArray(parsed)) out = parsed;
    else if (parsed?.Data && Array.isArray(parsed.Data)) out = parsed.Data;
    else if (parsed?.Data !== undefined) out = parsed.Data;
    else out = parsed;
    if (out && typeof out === 'object' && !Array.isArray(out)) Object.assign(out, meta);
    return out as T;
  }
  return temp.Data as T;
}

export const lecturerRoomScheduleService = {
  // DS phòng học (cho dropdown). Truyền toaNhaId để lọc theo tòa nhà.
  // Web fallback TEN từ TENPHONGHOC / MA nếu rỗng, ta làm tương tự.
  async getPhongHocList(toaNhaId?: string): Promise<PhongHocItem[]> {
    const userId = await getUserId();
    const data = await callEncryptedPost<any[]>(
      API_HOSTS.nhanSu,
      'NS_ThongTinCanBo_MH/DSA4BRIRKS4vJgkuIgPP',
      {
        func: 'pkg_congthongtincanbo.LayDSPhongHoc',
        strNguoiThucHien_Id: userId,
        strTKB_ToaNha_Id: toaNhaId || '',
      }
    );
    const arr = Array.isArray(data) ? data : [];
    return arr.map((it) => ({
      ...it,
      TEN: it.TEN || it.TENPHONGHOC || it.MA || `Phòng ${it.ID}`,
    }));
  },

  // DS tòa nhà — Web: POST encrypted NS_ThongTinCanBo_MH/DSA4BRIVLiAPKSAP
  // func: PKG_CONGTHONGTINCANBO.LayDSToaNha
  // API trả field tên là TENTOANHA — chuẩn hóa thêm TEN để dùng chung picker.
  async getToaNhaList(): Promise<ToaNhaItem[]> {
    const userId = await getUserId();
    const data = await callEncryptedPost<any[]>(
      API_HOSTS.nhanSu,
      'NS_ThongTinCanBo_MH/DSA4BRIVLiAPKSAP',
      {
        func: 'PKG_CONGTHONGTINCANBO.LayDSToaNha',
        strNguoiThucHien_Id: userId,
      }
    );
    const arr = Array.isArray(data) ? data : [];
    return arr.map((it) => ({ ...it, TEN: it.TENTOANHA || it.TEN || '' }));
  },

  // Lịch của 1 phòng học trong khoảng tuần
  async getLichPhong(
    phongHocId: string,
    ngayBatDau: string,
    ngayKetThuc: string
  ): Promise<LichPhongItem[]> {
    const data = await callEncryptedPost<LichPhongItem[]>(
      API_HOSTS.nhanSu,
      'NS_ThongTinCanBo_MH/DSA4DSgiKREpLi8mCS4i',
      {
        func: 'pkg_congthongtincanbo.LayLichPhongHoc',
        strIdPhongHoc: phongHocId,
        strNgayBatDau: ngayBatDau,
        strNgayKetThuc: ngayKetThuc,
      }
    );
    return Array.isArray(data) ? data : [];
  },

  // Đăng ký sử dụng phòng
  async dangKyPhong(params: {
    phongHocId: string;
    ngaySuDung: string;
    gioBatDau: string;
    phutBatDau: string;
    gioKetThuc: string;
    phutKetThuc: string;
    mucDich: string;
  }): Promise<{ Id?: string; Message?: string }> {
    const userId = await getUserId();
    const data = await callEncryptedPost<any>(
      API_HOSTS.dangKyHoc,
      'DKH_MuonPhong_MH/ETMeFSojHgUqHhEpLi8mHhUmHggvMgPP',
      {
        func: 'PKG_CORE_DANGKY_MUONPHONG.Pr_Tkb_Dk_Phong_Tg_Ins',
        strTkb_Phong_Id: params.phongHocId,
        strNgaySuDung: params.ngaySuDung,
        strGioBatDau: params.gioBatDau,
        strPhutBatDau: params.phutBatDau,
        strGioKetThuc: params.gioKetThuc,
        strPhutKetThuc: params.phutKetThuc,
        strMucDichSuDung: params.mucDich,
        strNguoiThucHien_Id: userId,
      }
    );
    return data || {};
  },

  // Kiểm tra trùng lịch trước khi đăng ký
  async kiemTraTrungLich(params: {
    phongHocId: string;
    ngaySuDung: string;
    gioBatDau: string;
    phutBatDau: string;
    gioKetThuc: string;
    phutKetThuc: string;
    mucDich: string;
  }): Promise<void> {
    const userId = await getUserId();
    await callEncryptedPost(
      API_HOSTS.dangKyHoc,
      'DKH_MuonPhong_MH/ETMeFSojHgUqHhEpLi8mHhUmHgIpJCIq',
      {
        func: 'PKG_CORE_DANGKY_MUONPHONG.Pr_Tkb_Dk_Phong_Tg_Check',
        strTkb_Phong_Id: params.phongHocId,
        strNgaySuDung: params.ngaySuDung,
        strGioBatDau: params.gioBatDau,
        strPhutBatDau: params.phutBatDau,
        strGioKetThuc: params.gioKetThuc,
        strPhutKetThuc: params.phutKetThuc,
        strMucDichSuDung: params.mucDich,
        strNguoiThucHien_Id: userId,
      }
    );
  },

  // Get list đăng ký — dùng cho cả Kết quả cá nhân (strNguoiDangKy_Id = userId) và Duyệt
  // (lọc theo ngày + phòng). Truyền undefined để bỏ filter.
  async getDangKyList(params: {
    nguoiDangKyId?: string;
    ngaySuDung?: string;
    phongHocId?: string;
  }): Promise<DangKyPhongItem[]> {
    const userId = await getUserId();
    const data = await callEncryptedPost<DangKyPhongItem[]>(
      API_HOSTS.dangKyHoc,
      'DKH_MuonPhong_MH/ETMeFSojHgUgLyYKOB4RKS4vJh4GJDUeDSgyNQPP',
      {
        func: 'PKG_CORE_DANGKY_MUONPHONG.Pr_Tkb_DangKy_Phong_Get_List',
        strNguoiDangKy_Id: params.nguoiDangKyId || '',
        strNgaySuDung: params.ngaySuDung || '',
        strTkb_Phong_Id: params.phongHocId || '',
        strNguoiThucHien_Id: userId,
      }
    );
    return Array.isArray(data) ? data : [];
  },

  // Kết quả cá nhân — gọi getDangKyList với userId
  async getKetQuaCaNhan(): Promise<DangKyPhongItem[]> {
    const userId = await getUserId();
    return this.getDangKyList({ nguoiDangKyId: userId });
  },

  // DS các ngày đã có đăng ký trong tháng — để highlight trên calendar.
  // Web: POST encrypted DKH_MuonPhong_MH/ETMeFSojHgUqHhEeFSYeBiQ1Hg8mIDgeEiUeEjUz
  // func: PKG_CORE_DANGKY_MUONPHONG.Pr_Tkb_Dk_P_Tg_Get_Ngay_Sd_Str
  // Trả về array — có 2 kiểu:
  //  - 1 phần tử có DANHSACHNGAY = chuỗi "dd/MM/yyyy,dd/MM/yyyy,..."
  //  - hoặc nhiều phần tử, mỗi phần tử có NGAY / NGAYSUDUNG
  async getNgayCoDangKy(params: {
    ngayThamChieu: string; // dd/MM/yyyy — ngày bất kỳ trong tháng cần xem
    phongHocId?: string;
  }): Promise<string[]> {
    const userId = await getUserId();
    const data = await callEncryptedPost<any[]>(
      API_HOSTS.dangKyHoc,
      'DKH_MuonPhong_MH/ETMeFSojHgUqHhEeFSYeBiQ1Hg8mIDgeEiUeEjUz',
      {
        func: 'PKG_CORE_DANGKY_MUONPHONG.Pr_Tkb_Dk_P_Tg_Get_Ngay_Sd_Str',
        strNgay: params.ngayThamChieu,
        strTKB_DangKy_Phong_Id: params.phongHocId || '',
        strNguoiThucHien_Id: userId,
      }
    );
    const arr = Array.isArray(data) ? data : [];
    const result: string[] = [];
    if (arr.length > 0 && arr[0]?.DANHSACHNGAY) {
      String(arr[0].DANHSACHNGAY)
        .split(',')
        .forEach((s) => {
          const v = s.trim();
          if (v) result.push(v);
        });
    } else {
      arr.forEach((e) => {
        const v = e?.NGAY || e?.NGAYSUDUNG;
        if (v) result.push(String(v).trim());
      });
    }
    return result;
  },

  // DS trạng thái xác nhận khả dụng cho user (Đồng ý / Từ chối / ...) — backend trả ID động.
  // Web: POST encrypted DKH_MuonPhong_MH/ETMeFSojHgUKHhUVHgYkNR4DOB4UMiQz
  // func: PKG_CORE_DANGKY_MUONPHONG.Pr_Tkb_DK_TT_Get_By_User
  async getTrangThaiDuyet(): Promise<TrangThaiDuyetItem[]> {
    const userId = await getUserId();
    const data = await callEncryptedPost<any[]>(
      API_HOSTS.dangKyHoc,
      'DKH_MuonPhong_MH/ETMeFSojHgUKHhUVHgYkNR4DOB4UMiQz',
      {
        func: 'PKG_CORE_DANGKY_MUONPHONG.Pr_Tkb_DK_TT_Get_By_User',
        strNguoiDung_Id: userId,
        strNguoiThucHien_Id: userId,
      }
    );
    const arr = Array.isArray(data) ? data : [];
    return arr.map((e) => ({
      ID: pickField(e, 'ID', 'TINHTRANG_ID', 'TRANGTHAI_ID'),
      TEN: pickField(e, 'TEN', 'TINHTRANG_TEN', 'TRANGTHAI_TEN', 'TINHTRANG_DUYET_TEN'),
      ...e,
    }));
  },

  // Duyệt 1 bản ghi đăng ký
  async duyetDangKy(params: {
    sanPhamId: string;
    tinhTrangId: string;
    noiDung?: string;
  }): Promise<void> {
    const userId = await getUserId();
    await callEncryptedPost(
      API_HOSTS.dangKyHoc,
      'DKH_MuonPhong_MH/ETMeFSojHgUgLyYKOB4FNDgkNR4ILzIkMzUP',
      {
        func: 'PKG_CORE_DANGKY_MUONPHONG.Pr_Tkb_DangKy_Duyet_Insert',
        strNguoiXacNhan_Id: userId,
        strSanPham_Id: params.sanPhamId,
        strNoiDung: params.noiDung || '',
        strTinhTrang_Id: params.tinhTrangId,
        strNguoiThucHien_Id: userId,
      }
    );
  },
};

// Helper: lấy field từ object theo nhiều key fallback (như web `pick`)
export function pickField(obj: any, ...keys: string[]): string {
  for (const k of keys) {
    if (obj?.[k] !== undefined && obj[k] !== null && obj[k] !== '') return String(obj[k]);
  }
  return '';
}

export default lecturerRoomScheduleService;
