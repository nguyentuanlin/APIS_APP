// Thong ke theo pho diem - nganh (CCB.PDN) — port `phodiem.html` + `.js`.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_HOSTS } from '../config/apiHosts';

export interface NganhItem {
  ID: string;
  TEN?: string;
  [k: string]: any;
}

export interface ThoiGianItem {
  ID: string;
  THOIGIAN?: string;
  [k: string]: any;
}

export interface ThangDiemItem {
  ID: string;
  TEN?: string;
  MA?: string;
  [k: string]: any;
}

export interface HocPhanItem {
  ID: string;
  MA?: string;
  TEN?: string;
  HOCTRINH?: string | number;
  [k: string]: any;
}

export interface ThanhPhanDiemItem {
  DIEM_THANHPHANDIEM_ID: string;
  DIEM_THANHPHANDIEM_TEN?: string;
  [k: string]: any;
}

export interface PhoDiemItem {
  MUCCANDUOI?: string | number;
  MUCCANTREN?: string | number;
  [k: string]: any;
}

export interface KetQuaTheoPhoDiemItem {
  MUCCANDUOI?: string | number;
  MUCCANTREN?: string | number;
  DIEM_THANHPHANDIEM_ID?: string;
  SOLUONG?: string | number;
  [k: string]: any;
}

export interface BangDiemResponse {
  rsThanhPhanDiem: ThanhPhanDiemItem[];
  rsPhoDiem: PhoDiemItem[];
  rsKeQuaTheoPhoDiem: KetQuaTheoPhoDiemItem[];
}

async function getAuthToken(): Promise<string> {
  const token = await AsyncStorage.getItem('access_token');
  if (!token) throw new Error('Chua dang nhap');
  return token;
}

async function getUserId(): Promise<string> {
  const raw = await AsyncStorage.getItem('userData');
  if (!raw) throw new Error('Khong co userData');
  const u = JSON.parse(raw);
  if (!u?.sub) throw new Error('Khong co userId');
  return String(u.sub).split(';')[0];
}

async function callGet<T = any>(
  baseUrl: string,
  action: string,
  params: Record<string, string | number>
): Promise<T> {
  if (!baseUrl) throw new Error(`Base URL cho ${action} chua cau hinh`);
  const token = await getAuthToken();
  const qs = new URLSearchParams(
    Object.entries(params).reduce<Record<string, string>>((acc, [k, v]) => {
      acc[k] = String(v ?? '');
      return acc;
    }, {})
  ).toString();
  const url = `${baseUrl}/${action}${qs ? `?${qs}` : ''}`;
  const res = await fetch(url, { method: 'GET', headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`HTTP ${res.status} - ${action}`);
  const json = await res.json();
  if (!json.Success) throw new Error(json.Message || `${action} fail`);
  const d = json.Data;
  if (Array.isArray(d)) return d as T;
  return d as T;
}

async function callPostJson<T = any>(
  baseUrl: string,
  action: string,
  payload: Record<string, any>
): Promise<T> {
  if (!baseUrl) throw new Error(`Base URL cho ${action} chua cau hinh`);
  const token = await getAuthToken();
  const url = `${baseUrl}/${action}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} - ${action}`);
  const json = await res.json();
  return json as T;
}

export const lecturerScoreDistributionService = {
  async getNganh(): Promise<NganhItem[]> {
    const userId = await getUserId();
    return await callGet<NganhItem[]>(API_HOSTS.quanLyDiem, 'D_ThongKe/LayDSNganhDaoTaoTheoCTDT', {
      strNguoiThucHien_Id: userId,
    });
  },

  async getThoiGian(): Promise<ThoiGianItem[]> {
    const userId = await getUserId();
    return await callGet<ThoiGianItem[]>(API_HOSTS.quanLyDiem, 'D_ThongKe/LayDSThoiGian', {
      strNguoiThucHien_Id: userId,
    });
  },

  async getThangDiem(): Promise<ThangDiemItem[]> {
    return await callGet<ThangDiemItem[]>(
      API_HOSTS.cms,
      'CMS_DanhMucThuocTinh/LayDanhSachDuLieuTheoBangDM',
      {
        strMaBangDanhMuc: 'DIEM.THANGDIEM',
        strTieuChiSapXep: '',
        dTrangThai: '1',
      }
    );
  },

  async getHocPhan(params: { nganhId: string; thoiGianId: string }): Promise<HocPhanItem[]> {
    const userId = await getUserId();
    return await callGet<HocPhanItem[]>(API_HOSTS.quanLyDiem, 'D_ThongKe/LayDSHocPhanTrongKy', {
      strNguoiThucHien_Id: userId,
      strNganhHoc_Id: params.nganhId || '',
      strDaoTao_ThoiGianDaoTao_Id: params.thoiGianId || '',
    });
  },

  async getBangDiem(params: {
    thoiGianId: string;
    hocPhanId: string;
    thangDiemId: string;
    nganhId: string;
  }): Promise<BangDiemResponse> {
    const userId = await getUserId();
    return await callGet<BangDiemResponse>(API_HOSTS.quanLyDiem, 'D_ThongKe/LayDSKetQuaPhoDiem', {
      strDaoTao_ThoiGianDaoTao_Id: params.thoiGianId || '',
      strDaoTao_HocPhan_Id: params.hocPhanId || '',
      strThangDiem_Id: params.thangDiemId || '',
      strPhanViApDung_Id: params.nganhId || '',
      strNguoiThucHien_Id: userId,
    });
  },

  async tinhPhoDiem(params: {
    thoiGianId: string;
    hocPhanId: string;
    thangDiemId: string;
    nganhId: string;
  }): Promise<void> {
    const userId = await getUserId();
    const res = await callPostJson<any>(API_HOSTS.quanLyDiem, 'D_ThongKe/TinhPhoDiemHocPhan', {
      strDaoTao_ThoiGianDaoTao_Id: params.thoiGianId || '',
      strDaoTao_HocPhan_Id: params.hocPhanId || '',
      strThangDiem_Id: params.thangDiemId || '',
      strPhanViApDung_Id: params.nganhId || '',
      strNguoiThucHien_Id: userId,
    });
    if (!res?.Success) throw new Error(res?.Message || 'Tinh pho diem that bai');
  },

  async createReportImage(params: {
    thoiGianId: string;
    hocPhanId: string;
    thangDiemId: string;
    nganhId: string;
    tenHienThi: string;
  }): Promise<string> {
    const userId = await getUserId();
    const arrTuKhoa: { ten: string; giatri: string }[] = [];
    const arrDuLieu: { ten: string; giatri: string }[] = [];

    const single = (k: string, v: string) => arrTuKhoa.push({ ten: k, giatri: v });

    single('strLoaiBaoCao', 'KetQuaPhoDiem');
    single('strReportCode', 'KetQuaPhoDiem');
    single('strDaoTao_ThoiGianDaoTao_Id', params.thoiGianId || '');
    single('strDaoTao_HocPhan_Id', params.hocPhanId || '');
    single('strThangDiem_Id', params.thangDiemId || '');
    single('strPhanViApDung_Id', params.nganhId || '');
    single('strTenHienThi', params.tenHienThi || '');
    single('strNguoiThucHien_Id', userId);

    const res = await callPostJson<any>(API_HOSTS.cms, 'SYS_Report/ThemMoi', {
      arrTuKhoa,
      arrDuLieu,
      strNguoiThucHien_Id: userId,
    });
    if (!res?.Success) throw new Error(res?.Message || 'Tao bao cao that bai');
    const baoCaoId = res.Message;
    if (!baoCaoId) throw new Error('Khong co ID bao cao');

    const root = API_HOSTS.cms.replace(/\/cmsapi\/api$/, '');
    const reportUrl = `${root}/reporttest/modules/common/baocao.aspx?id=${baoCaoId}`;
    const imgRes = await fetch(reportUrl, { method: 'GET' });
    if (!imgRes.ok) throw new Error('Khong tai duoc bieu do');
    const imgJson = await imgRes.json();
    if (!imgJson?.Success || !imgJson?.Data) throw new Error(imgJson?.Message || 'Khong co du lieu bieu do');
    const imgPath = imgJson.Data;
    return imgPath.startsWith('http') ? imgPath : `${root}${imgPath}`;
  },
};

export default lecturerScoreDistributionService;
