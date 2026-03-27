import AsyncStorage from '@react-native-async-storage/async-storage';
import { AE, AD } from '../../crypto';

// Interfaces
export interface KeHoachDangKy {
  ID: string;
  MAKEHOACH: string;
  TENKEHOACH: string;
  MOTA: string;
  NGAYBATDAU: string;
  NGAYKETTHUC: string;
  SOTINCHITOIDA: number;
  SOTINCHITOITHIEU: number;
  DAOTAO_THOIGIANDAOTAO_ID: string;
}

export interface LopHocPhan {
  ID: string;
  DANGKY_LOPHOCPHAN_ID: string;
  DANGKY_LOPHOCPHAN_MA: string;
  DANGKY_LOPHOCPHAN_TEN: string;
  DAOTAO_HOCPHAN_ID: string;
  DAOTAO_HOCPHAN_MA: string;
  DAOTAO_HOCPHAN_TEN: string;
  GIANGVIEN: string;
  NGAYBATDAU: string;
  NGAYKETTHUC: string;
  THUHOC: string;
  THUHOC_TIETHOC: string;
  KIEUHOC_TEN: string;
  THUOCTINHLOP_TEN: string;
  SOTINCHIDADANGKY: number;
  SOLUONGDUKIENHOC: number;
  SOTHUCTEDANGKYHOC: number;
}

class RegistrationResultService {
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
      console.error('[RegistrationResultService] Error getting user ID:', error);
      throw error;
    }
  }

  // Lấy danh sách kế hoạch đăng ký cá nhân
  async getKeHoachDangKyList(thoiGianId: string): Promise<KeHoachDangKy[]> {
    try {
      const token = await this.getAuthToken();
      const userId = await this.getUserId();

      const requestBody = {
        func: 'pkg_dangkyhoc_thongtin.LayDSKeHoachDangKyCaNhan',
        iM: 'AzzSystem',
        strNguoiThucHien_Id: userId,
        strQLSV_NguoiHoc_Id: userId,
        strDaoTao_ThoiGianDaoTao_Id: thoiGianId,
        strChucNang_Id: 'A9CE858670AE453B90BB0A74458EFA34',
      };

      const encryptionKey = 'DSA4BRIKJAkuICIpBSAvJgo4AiAPKSAv';
      
      const response = await fetch(`https://iu.cmcu.edu.vn/dangkyhocapi/api/DKH_ThongTin_MH/${encryptionKey}`, {
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
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const temp = await response.json();
      
      if (!temp.Success) {
        throw new Error(temp.Message || 'Lỗi khi lấy danh sách kế hoạch đăng ký');
      }

      const decryptedData = AD(temp.Data.B, requestBody.iM);
      
      if (!decryptedData) {
        throw new Error('Không thể giải mã dữ liệu');
      }

      const apiData = JSON.parse(decryptedData);
      const keHoachList = Array.isArray(apiData) ? apiData : (apiData.Data || []);
      
      // console.log('[RegistrationResultService] Ke hoach list:', keHoachList.length);
      
      return keHoachList;
    } catch (error) {
      console.error('[RegistrationResultService] Error fetching ke hoach:', error);
      throw error;
    }
  }

  // Lấy kết quả đăng ký lớp học phần
  async getKetQuaDangKy(thoiGianId: string, keHoachId: string): Promise<LopHocPhan[]> {
    try {
      const token = await this.getAuthToken();
      const userId = await this.getUserId();

      const requestBody = {
        func: 'pkg_dangkyhoc_chung.LayKetQuaDangKyLopHocPhan',
        iM: 'AzzSystem',
        strNguoiThucHien_Id: userId,
        strQLSV_NguoiHoc_Id: userId,
        strDaoTao_ThoiGianDaoTao_Id: thoiGianId,
        strDangKy_KeHoachDangKy_Id: keHoachId,
        strDaoTao_ChuongTrinh_Id: '',
        strChucNang_Id: 'A9CE858670AE453B90BB0A74458EFA34',
      };

      const encryptionKey = 'DSA4CiQ1EDQgBSAvJgo4DS4xCS4iESkgLwPP';
      
      const response = await fetch(`https://iu.cmcu.edu.vn/dangkyhocapi/api/DKH_Chung_MH/${encryptionKey}`, {
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
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const temp = await response.json();
      
      if (!temp.Success) {
        throw new Error(temp.Message || 'Lỗi khi lấy kết quả đăng ký');
      }

      const decryptedData = AD(temp.Data.B, requestBody.iM);
      
      if (!decryptedData) {
        throw new Error('Không thể giải mã dữ liệu');
      }

      const apiData = JSON.parse(decryptedData);
      const lopHocPhanList = Array.isArray(apiData) ? apiData : (apiData.Data || []);
      
      // console.log('[RegistrationResultService] Lop hoc phan list:', lopHocPhanList.length);
      
      return lopHocPhanList;
    } catch (error) {
      console.error('[RegistrationResultService] Error fetching ket qua dang ky:', error);
      throw error;
    }
  }
}

export default new RegistrationResultService();
