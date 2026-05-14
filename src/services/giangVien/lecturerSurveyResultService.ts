// Ket qua khao sat ca nhan (CCB.KS) — port `ketquakhaosat.html` + `.js`.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_HOSTS } from '../../config/apiHosts';

export interface KeHoachKhaoSatItem {
  ID: string;
  TEN?: string;
  [k: string]: any;
}

export interface PhieuKhaoSatItem {
  ID: string;
  TEN?: string;
  [k: string]: any;
}

export interface ThongTinChungItem {
  KS_CSDL_HOCPHAN_TEN?: string;
  KS_CSDL_HOCPHAN_MA?: string;
  KS_DOITUONGDUOCKHAOSAT_TEN?: string;
  TUNGAY?: string;
  DENNGAY?: string;
  AAA?: string;
  AAAA?: string;
  [k: string]: any;
}

export interface DapAnDanhMucItem {
  ID: string;
  TRONGSODIEM?: string | number;
  TENDAPAN?: string;
  MADAPAN?: string;
  [k: string]: any;
}

export interface CauHoiItem {
  ID: string;
  TENCAUHOI?: string;
  KS_KEHOACHKHAOSAT_ID?: string;
  KS_PHIEUKHAOSAT_ID?: string;
  [k: string]: any;
}

export interface CauHoiMoItem {
  ID: string;
  TENCAUHOI?: string;
  [k: string]: any;
}

export interface CauHoiMoKetQuaItem {
  KS_CAUHOI_ID?: string;
  DAPAN?: string;
  [k: string]: any;
}

export interface SoPhieuItem {
  SOLUONG?: string | number;
  [k: string]: any;
}

export interface PhanTramItem {
  PHANTRAM?: string | number;
  [k: string]: any;
}

export interface KetQuaKhaoSatPayload {
  rsThongTinChung: ThongTinChungItem[];
  rsDanhMucDapAn: DapAnDanhMucItem[];
  rsCauHoi_1DapAn: CauHoiItem[];
  rsCauHoi_Mo: CauHoiMoItem[];
  rsCauHoi_Mo_KetQua: CauHoiMoKetQuaItem[];
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
  return json.Data as T;
}

export const lecturerSurveyResultService = {
  async getKeHoach(): Promise<KeHoachKhaoSatItem[]> {
    const userId = await getUserId();
    return await callGet<KeHoachKhaoSatItem[]>(
      API_HOSTS.nhanSu,
      'NS_ThongTinCanBo/LayDSKeHoachKhaoSatCaNhan',
      { strNguoiThucHien_Id: userId }
    );
  },

  async getPhieu(keHoachId: string): Promise<PhieuKhaoSatItem[]> {
    const userId = await getUserId();
    return await callGet<PhieuKhaoSatItem[]>(
      API_HOSTS.nhanSu,
      'NS_ThongTinCanBo/LayDSPhieuKhaoSatCaNhan',
      {
        strKS_KeHoachKhaoSat_Id: keHoachId || '',
        strNguoiThucHien_Id: userId,
      }
    );
  },

  async getKetQua(params: { keHoachId: string; phieuId: string }): Promise<KetQuaKhaoSatPayload> {
    const userId = await getUserId();
    return await callGet<KetQuaKhaoSatPayload>(
      API_HOSTS.nhanSu,
      'NS_ThongTinCanBo/LayDSKetQuaKhaoSatCaNhan',
      {
        strKS_KeHoachKhaoSat_Id: params.keHoachId || '',
        strKS_PhieuKhaoSat_Id: params.phieuId || '',
        strNguoiThucHien_Id: userId,
      }
    );
  },

  async getSoPhieu(params: {
    keHoachId: string;
    phieuId: string;
    cauHoiId: string;
    maDapAn: string;
  }): Promise<SoPhieuItem[]> {
    const userId = await getUserId();
    return await callGet<SoPhieuItem[]>(
      API_HOSTS.nhanSu,
      'NS_ThongTinCanBo/LayDSSoPhieuTheoCauHoi',
      {
        strKS_KeHoachKhaoSat_Id: params.keHoachId || '',
        strKS_PhieuKhaoSat_Id: params.phieuId || '',
        strKS_CauHoi_Id: params.cauHoiId || '',
        strMaDapAn: params.maDapAn || '',
        strNguoiThucHien_Id: userId,
      }
    );
  },

  async getPhanTram(params: {
    keHoachId: string;
    phieuId: string;
    cauHoiId: string;
    maDapAn: string;
  }): Promise<PhanTramItem[]> {
    const userId = await getUserId();
    return await callGet<PhanTramItem[]>(
      API_HOSTS.nhanSu,
      'NS_ThongTinCanBo/LayDSPhanTramTheoCauHoi',
      {
        strKS_KeHoachKhaoSat_Id: params.keHoachId || '',
        strKS_PhieuKhaoSat_Id: params.phieuId || '',
        strKS_CauHoi_Id: params.cauHoiId || '',
        strMaDapAn: params.maDapAn || '',
        strNguoiThucHien_Id: userId,
      }
    );
  },
};

export default lecturerSurveyResultService;
