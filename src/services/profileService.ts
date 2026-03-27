import AsyncStorage from '@react-native-async-storage/async-storage';
import { AE, AD } from '../../crypto';

// Interface cho thông tin hồ sơ
export interface ProfileInfo {
  ID: string;
  HODEM: string;
  TEN: string;
  MASO: string;
  QLSV_NGUOIHOC_NGAYSINH: string;
  NGAYSINH_NGAY: string;
  NGAYSINH_THANG: string;
  NGAYSINH_NAM: string;
  CMTND_SO: string;
  CMTND_NGAYCAP: string | null;
  CMTND_NOICAP: string | null;
  TTLL_THECANCUOC: string | null;
  GIOITINH_MA: string | null;
  GIOITINH_TEN: string | null;
  DANTOC_MA: string | null;
  DANTOC_TEN: string | null;
  TONGIAO_MA: string | null;
  TONGIAO_TEN: string | null;
  QUOCTICH_MA: string | null;
  QUOCTICH_TEN: string | null;
  NGANH: string;
  MANGANH: string;
  LOP: string;
  KHOADAOTAO: string;
  KHOAQUANLY: string;
  HEDAOTAO: string;
  QLSV_NGUOIHOC_TRANGTHAI: string;
  TTLL_DIENTHOAICANHAN: string | null;
  TTLL_DIENTHOAIGIADINH: string | null;
  TTLL_EMAILCANHAN: string | null;
  DIACHICOQUANCONGTAC: string | null;
  NOIOHIENNAY: string | null;
  HOKHAU_PHUONGXAKHOIXOM: string | null;
  HOKHAU_QUANHUYEN_TEN: string | null;
  HOKHAU_TINHTHANH_TEN: string | null;
  NOISINH_PHUONGXAKHOIXOM: string | null;
  NOISINH_QUANHUYEN_TEN: string | null;
  NOISINH_TINHTHANH_TEN: string | null;
  QUEQUAN_PHUONGXAKHOIXOM: string | null;
  QUEQUAN_QUANHUYEN_TEN: string | null;
  QUEQUAN_TINHTHANH_TEN: string | null;
  ANH: string | null;
  LINKFACEBOOK: string | null;
  TRUONG_PTTH: string | null;
  THANHPHANGIADINH_MA: string | null;
  THANHPHANGIADINH_TEN: string | null;
  DANGDOAN_NGAYVAODOAN: string | null;
  DANGDOAN_NGAYVAODANG: string | null;
  DANGDOAN_NGAYCHINHTHUCVAODANG: string | null;
}

class ProfileService {
  private async getAuthToken(): Promise<string> {
    const token = await AsyncStorage.getItem('access_token');
    if (!token) {
      throw new Error('No authentication token found');
    }
    return token;
  }

  private async getUserId(): Promise<string> {
    try {
      const userDataStr = await AsyncStorage.getItem('userData');
      if (userDataStr) {
        const userData = JSON.parse(userDataStr);
        if (userData.sub) {
          const userId = userData.sub.split(';')[0];
          return userId;
        }
      }
      
      const token = await AsyncStorage.getItem('access_token');
      if (token && token.includes('.')) {
        const parts = token.split('.');
        if (parts.length >= 2) {
          const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
          const pad = base64.length % 4;
          const padded = base64 + (pad ? '='.repeat(4 - pad) : '');
          const payloadJson = decodeURIComponent(
            atob(padded)
              .split('')
              .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
              .join('')
          );
          const payload = JSON.parse(payloadJson);
          if (payload.sub) {
            const userId = payload.sub.split(';')[0];
            return userId;
          }
        }
      }
      
      throw new Error('No user ID found');
    } catch (error) {
      console.error('[ProfileService] Error getting user ID:', error);
      throw error;
    }
  }

  // Lấy thông tin chi tiết hồ sơ
  async getProfileInfo(): Promise<ProfileInfo> {
    try {
      const token = await this.getAuthToken();
      const userId = await this.getUserId();

      const requestBody = {
        func: 'pkg_hosohocvien.LayThongTinChiTietHoSo',
        iM: 'AzzSystem',
        strId: userId,
        strNguoiThucHien_Id: userId,
        strChucNang_Id: '00C591A472C84BB89FB00F18B70C108B',
      };

      const encryptionKey = 'DSA4FSkuLyYVKC8CKSgVKCQ1CS4SLgPP';
      
      const response = await fetch(`https://iu.cmcu.edu.vn/sinhvienapi/api/SV_Custom/${encryptionKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          A: AE(JSON.stringify(requestBody), encryptionKey)
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[ProfileService] Response error:', errorText);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const temp = await response.json();
      
      if (!temp.Success) {
        console.error('[ProfileService] API error:', temp.Message);
        throw new Error(temp.Message || 'Lỗi khi lấy thông tin hồ sơ');
      }

      const decryptedData = AD(temp.Data.B, requestBody.iM);
      
      if (!decryptedData) {
        console.error('[ProfileService] Cannot decrypt data');
        throw new Error('Không thể giải mã dữ liệu');
      }

      const apiData = JSON.parse(decryptedData);
      const profileData = Array.isArray(apiData) ? apiData[0] : apiData;
      
      // console.log('[ProfileService] Profile data loaded successfully');
      
      return profileData;
    } catch (error) {
      console.error('[ProfileService] Error fetching profile info:', error);
      throw error;
    }
  }
}

export default new ProfileService();
