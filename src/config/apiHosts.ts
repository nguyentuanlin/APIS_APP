import { Platform } from 'react-native';

const DEFAULT_HOST = 'https://iu.cmcu.edu.vn';

const stripTrailingSlash = (s: string) => s.replace(/\/+$/, '');

const resolveHost = (): string => {
  const explicit =
    process.env.EXPO_PUBLIC_API_HOST ||
    (Platform.OS === 'android'
      ? process.env.EXPO_PUBLIC_API_HOST_ANDROID
      : process.env.EXPO_PUBLIC_API_HOST_IOS);

  if (explicit && explicit.trim()) {
    return stripTrailingSlash(explicit.trim());
  }

  const legacy =
    Platform.OS === 'android'
      ? process.env.EXPO_PUBLIC_API_BASE_URL_ANDROID
      : process.env.EXPO_PUBLIC_API_BASE_URL_IOS;

  if (legacy && legacy.trim()) {
    return stripTrailingSlash(legacy.trim()).replace(/\/[^/]+\/api$/, '').replace(/\/api$/, '');
  }

  return DEFAULT_HOST;
};

export const API_HOST = resolveHost();

export const API_HOSTS = {
  cms: `${API_HOST}/cmsapi/api`,
  sinhVien: `${API_HOST}/sinhvienapi/api`,
  dangKyHoc: `${API_HOST}/dangkyhocapi/api`,
  xuLyHocVu: `${API_HOST}/xulyhocvuapi/api`,
  taiChinh: `${API_HOST}/taichinhapi/api`,
  nhanSu: `${API_HOST}/nhansuapi/api`,
  thiPhach: `${API_HOST}/thiphachapi/api`,
  quanLyDiem: `${API_HOST}/quanlydiemapi/api`,
  keHoachChuongTrinh: `${API_HOST}/kehoachchuongtrinhapi/api`,
  quanLyTuyenSinh: `${API_HOST}/quanlytuyensinhapi/api`,
  totNghiep: `${API_HOST}/totnghiepapi/api`,
  tuyenSinh: `${API_HOST}/tuyensinhapi/api`,
  upload: `${API_HOST}/upload`,
} as const;
