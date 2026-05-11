// Khoa xem Phúc Khảo (CCB.KXPK) — port web `Modules/nhapdiem/script/phuckhao.js`.
// 3 API GET plain trên host thiphachapi (TP_PhucKhao/*).
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_HOSTS } from '../config/apiHosts';

export const CHUCNANG_ID_KXPK = '84D848235D1945129910EBAA4D37FE7F';

export interface ThoiGianItem {
  ID: string;
  THOIGIAN: string;
  [k: string]: any;
}

export interface HocPhanItem {
  ID: string;
  TEN: string;
  [k: string]: any;
}

export interface PhucKhaoItem {
  ID: string;
  QLSV_NGUOIHOC_MASO: string;
  QLSV_NGUOIHOC_HODEM: string;
  QLSV_NGUOIHOC_TEN: string;
  SOBAODANH: string;
  DAOTAO_HOCPHAN_MA: string;
  DAOTAO_HOCPHAN_TEN: string;
  DIEM_THANHPHANDIEM_TEN: string;
  HINHTHUCTHI_TEN: string;
  NGAYTHI: string;
  CATHI_TEN: string;
  PHONGTHI_TEN: string;
  DIEM: string | number;
  NGAYXACNHANHOANTHANHDIEMTHI?: string;
  NGAYDANGKYPHUCKHAO?: string;
  NGAYHETHANDANGKYPHUCKHAO?: string;
  PHIPHUCKHAO?: string | number;
  TINHTRANGNOPPHI?: string;
  TINHTRANG_TEN?: string;
  KETQUAPHUCKHAO?: string | number;
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
  const res = await fetch(url, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} - ${action}`);
  const json = await res.json();
  if (!json.Success) throw new Error(json.Message || `${action} fail`);
  const d = json.Data;
  if (Array.isArray(d)) return d as T;
  if (d && typeof d === 'object' && Array.isArray((d as any).rs)) return (d as any).rs as T;
  return (d || []) as T;
}

export const lecturerPhucKhaoService = {
  async getThoiGian(): Promise<ThoiGianItem[]> {
    const userId = await getUserId();
    return await callGet<ThoiGianItem[]>(API_HOSTS.thiPhach, 'TP_PhucKhao/LayThoiGianTheoDotThi', {
      strNguoiThucHien_Id: userId,
    });
  },

  async getHocPhan(thoiGianId: string): Promise<HocPhanItem[]> {
    const userId = await getUserId();
    return await callGet<HocPhanItem[]>(API_HOSTS.thiPhach, 'TP_PhucKhao/LayHocPhanPhucKhao', {
      strDaoTao_ThoiGianDaoTao_Id: thoiGianId || '',
      strNguoiThucHien_Id: userId,
    });
  },

  async getDSPhucKhao(thoiGianId: string, hocPhanId: string): Promise<PhucKhaoItem[]> {
    const userId = await getUserId();
    return await callGet<PhucKhaoItem[]>(
      API_HOSTS.thiPhach,
      'TP_PhucKhao/LayDSThiPhucKhaoNhapDiem',
      {
        strNguoiThucHien_Id: userId,
        strDaoTao_ThoiGianDaoTao_Id: thoiGianId || '',
        strDaoTao_HocPhan_Id: hocPhanId || '',
      }
    );
  },
};

export default lecturerPhucKhaoService;
