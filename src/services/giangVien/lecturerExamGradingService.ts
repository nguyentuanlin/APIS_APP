// Xem lịch chấm thi (CCB.XLCT / Phân coi thi, chấm thi → Xem lịch chấm thi)
// Port `Modules/nhapdiem/script/lichchamthi.js`.
// - GET NS_ThongTinCanBo/LayDSKetQuaChamThi → { rsTheoTui, rsTheoDST }
// - POST TP_XuLy/XacNhanTinhTrangChamThi → xác nhận tình trạng chấm (Đã/Chưa)
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_HOSTS } from '../../config/apiHosts';

export interface TuiBaiItem {
  ID: string;
  THI_TUIBAI_TEN?: string;
  CANBOCHAMTHI_HOTEN?: string;
  SOBAI?: string | number;
  DAOTAO_HOCPHAN_MA?: string;
  DAOTAO_HOCPHAN_TEN?: string;
  NGAYBATDAUCHAM?: string;
  NGAYHOANTHANHCHAM?: string;
  NGAYNHANBAI?: string;
  TINHTRANGCHAM?: number | string | boolean;
  GHICHU?: string;
  TENDOTTHI?: string;
  [k: string]: any;
}

export interface ThiVDTHItem {
  ID: string;
  DANHSACHTHI_TEN?: string;
  CANBOCHAMTHI_HOTEN?: string;
  SOBAI?: string | number;
  DAOTAO_HOCPHAN_MA?: string;
  DAOTAO_HOCPHAN_TEN?: string;
  NGAYBATDAUCHAM?: string;
  CATHI_TEN?: string;
  PHONGTHI_TEN?: string;
  NGAYHOANTHANHCHAM?: string;
  NGAYNHANBAI?: string;
  TINHTRANGCHAM?: number | string | boolean;
  GHICHU?: string;
  TENDOTTHI?: string;
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
  return json.Data as T;
}

async function callPostForm(
  baseUrl: string,
  action: string,
  params: Record<string, string>
): Promise<any> {
  if (!baseUrl) throw new Error(`Base URL cho ${action} chưa cấu hình`);
  const token = await getAuthToken();
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

export const lecturerExamGradingService = {
  // Lấy lịch chấm thi — trả về 2 danh sách: theo túi bài (thi viết) và theo DST (VĐ/TH)
  async getList(): Promise<{ tuiBai: TuiBaiItem[]; thiVDTH: ThiVDTHItem[] }> {
    const userId = await getUserId();
    const data = await callGet<any>(
      API_HOSTS.nhanSu,
      'NS_ThongTinCanBo/LayDSKetQuaChamThi',
      { strNguoiThucHien_Id: userId }
    );
    return {
      tuiBai: Array.isArray(data?.rsTheoTui) ? data.rsTheoTui : [],
      thiVDTH: Array.isArray(data?.rsTheoDST) ? data.rsTheoDST : [],
    };
  },

  // Xác nhận tình trạng chấm cho 1 bản ghi.
  // dTinhTrangCham: 1 = Đã chấm, 0 = Chưa chấm
  async xacNhan(params: { id: string; tinhTrang: 0 | 1 }): Promise<void> {
    const userId = await getUserId();
    await callPostForm(API_HOSTS.thiPhach, 'TP_XuLy/XacNhanTinhTrangChamThi', {
      strId: params.id,
      strNguoiThucHien_Id: userId,
      dTinhTrangCham: String(params.tinhTrang),
    });
  },
};

export default lecturerExamGradingService;
