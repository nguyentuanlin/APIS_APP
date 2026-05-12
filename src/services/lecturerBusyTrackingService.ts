// Lịch giảng đường - theo dõi bận rỗi GIẢNG VIÊN (CCB.TKHNPHGV)
// Port `lichgiangnhieuphonghocgiangvien.js`. Khác bản phòng học:
// - Khoa/đơn vị (CoCauToChuc) thay cho Tòa nhà
// - Cán bộ (NhanSu) thay cho Phòng học
// - Lịch lấy từ NS_ThongTinCanBo/LayDSLichGiang (GET plain) — như màn TKB cá nhân.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AE, AD } from '../../crypto';
import { API_HOSTS } from '../config/apiHosts';

export interface DonViItem {
  ID: string;
  TEN: string;
  MA?: string;
  DAOTAO_COCAUTOCHUC_CHA_ID?: string;
  [k: string]: any;
}

export interface CanBoItem {
  ID: string;
  MASO: string;
  HODEM: string;
  TEN: string;
  DAOTAO_COCAUTOCHUC_TEN?: string;
  // Display string đã build sẵn để picker render gọn
  DISPLAY?: string;
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

const formatCanBoDisplay = (cb: any): string => {
  const name = `${cb.HODEM || ''} ${cb.TEN || ''}`.trim();
  let s = name;
  if (cb.MASO) s += ` - ${cb.MASO}`;
  if (cb.DAOTAO_COCAUTOCHUC_TEN) s += ` - ${cb.DAOTAO_COCAUTOCHUC_TEN}`;
  return s || `CB-${cb.ID}`;
};

export const lecturerBusyTrackingService = {
  // DS khoa/đơn vị — Web: edu.system.getList_CoCauToChuc({iTrangThai:1,...})
  // → POST encrypted NS_HoSo_V2_MH/DSA4BSAvKRIgIikVLiAvAy4P
  // → pkg_nhansu_hoso_v2.LayDanhSachToanBo
  async getDonViList(): Promise<DonViItem[]> {
    const userId = await getUserId();
    const data = await callEncryptedPost<DonViItem[]>(
      API_HOSTS.nhanSu,
      'NS_HoSo_V2_MH/DSA4BSAvKRIgIikVLiAvAy4P',
      {
        func: 'pkg_nhansu_hoso_v2.LayDanhSachToanBo',
        dTrangThai: 1,
        strLoaiCoCauToChuc_Id: '',
        strCoCauToChucCha_Id: '',
        strNguoiThucHien_Id: userId,
      }
    );
    return Array.isArray(data) ? data : [];
  },

  // DS cán bộ (giảng viên) — có thể lọc theo đơn vị + từ khóa
  // Web: edu.system.getList_NhanSu → POST encrypted NS_HoSo_V2_MH/DSA4BRIPKSAvEjQeCS4SLh43cwPP
  // → pkg_nhansu_hoso_v2.LayDSNhanSu_HoSo_v2
  async getCanBoList(params?: { donViId?: string; tuKhoa?: string }): Promise<CanBoItem[]> {
    const userId = await getUserId();
    const data = await callEncryptedPost<any[]>(
      API_HOSTS.nhanSu,
      'NS_HoSo_V2_MH/DSA4BRIPKSAvEjQeCS4SLh43cwPP',
      {
        func: 'pkg_nhansu_hoso_v2.LayDSNhanSu_HoSo_v2',
        strTuKhoa: params?.tuKhoa || '',
        strDaoTao_CoCauToChuc_Id: params?.donViId || '',
        dLaCanBoNgoaiTruong: -1,
        strTinhTrangNhanSu_Id: '',
        strChucVu_Id: '',
        strNguoiThucHien_Id: userId,
        pageIndex: 1,
        pageSize: 1000000,
      }
    );
    const arr = Array.isArray(data) ? data : [];
    return arr.map((it) => ({ ...it, DISPLAY: formatCanBoDisplay(it) }));
  },
};

export default lecturerBusyTrackingService;
