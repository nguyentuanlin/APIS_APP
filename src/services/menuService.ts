import AsyncStorage from '@react-native-async-storage/async-storage';
import { AE, AD } from '../../crypto';

// Interfaces
export interface MenuItem {
  ID: string;
  TENCHUCNANG: string;
  MACHUCNANG: string;
  TENANH: string;
  DUONGDANHIENTHI: string;
  DUONGDANFILE: string;
  CHUCNANGCHA_ID: string | null;
  THUTU: string;
  TRANGTHAI: string;
  YEUTHICH: number;
  MOTA: string | null;
  NOIDUNG: string | null;
  DUONGDANHUONGDANSUDUNG: string | null;
}

export interface DashboardItem {
  CHUCNANG_ID: string;
  CHUCNANG_TEN: string;
  CHUCNANG_MA: string;
  CHUCNANG_DUONGDANFILE: string;
  CHUCNANG_DUONGDANHIENTHI: string;
  CHUCNANG_TENANH: string;
  CHUCNANG_MOTA: string | null;
  CHUCNANG_NOIDUNG: string | null;
  THUTU: number;
}

export interface MenuResponse {
  Data: MenuItem[];
  Success: boolean;
  Message: string;
}

class MenuService {
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
      console.error('[MenuService] Error getting user ID:', error);
      throw error;
    }
  }

  // Lấy danh sách menu theo quyền người dùng
  async getMenuByUser(): Promise<MenuItem[]> {
    try {
      const token = await this.getAuthToken();
      const userId = await this.getUserId();

      const requestBody = {
        func: 'pkg_chung_laythongtinquyen.LayDSChucNangTheoNguoiDung_Id',
        iM: 'AzzSystem',
        strNguoiDung_Id: userId,
        strUngDung_Id: '80CF9E16C2D74F46A1ECE73B7C119A8F',
        strNguoiThucHien_Id: userId,
        strChucNang_Id: '',
      };

      const encryptionKey = 'DSA4BRICKTQiDyAvJhUpJC4PJjQuKAU0LyYeCCUP';
      
      const response = await fetch(`https://iu.cmcu.edu.vn/cmsapi/api/CMS_Quyen_MH/${encryptionKey}`, {
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
        console.error('[MenuService] Response error:', errorText);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const temp = await response.json();
      
      if (!temp.Success) {
        console.error('[MenuService] API error:', temp.Message);
        throw new Error(temp.Message || 'Lỗi khi lấy danh sách menu');
      }

      const decryptedData = AD(temp.Data.B, requestBody.iM);
      
      if (!decryptedData) {
        console.error('[MenuService] Cannot decrypt data');
        throw new Error('Không thể giải mã dữ liệu');
      }

      const apiData = JSON.parse(decryptedData);
      const menuList = Array.isArray(apiData) ? apiData : (apiData.Data || []);
      
      // console.log('[MenuService] ===== FULL API RESPONSE =====');
      // console.log('[MenuService] Total menu items:', menuList.length);
      // console.log('[MenuService] Full menu list:', JSON.stringify(menuList, null, 2));
      
      return menuList;
    } catch (error) {
      console.error('[MenuService] Error fetching menu:', error);
      throw error;
    }
  }

  // Lấy menu cha (menu cấp 1)
  getParentMenus(menuList: MenuItem[]): MenuItem[] {
    return menuList
      .filter(item => item.CHUCNANGCHA_ID === null && item.TRANGTHAI === '1')
      .sort((a, b) => parseInt(a.THUTU) - parseInt(b.THUTU));
  }

  // Lấy menu con theo ID cha
  getChildMenus(menuList: MenuItem[], parentId: string): MenuItem[] {
    return menuList
      .filter(item => item.CHUCNANGCHA_ID === parentId && item.TRANGTHAI === '1')
      .sort((a, b) => parseInt(a.THUTU) - parseInt(b.THUTU));
  }

  // Lấy menu đăng ký trực tuyến
  getRegistrationMenus(menuList: MenuItem[]): MenuItem[] {
    // Tìm menu cha "Đăng ký trực tuyến" có ID: B4149861150F41A4B8687F513E02D726
    const registrationParentId = 'B4149861150F41A4B8687F513E02D726';
    
    // console.log('[MenuService] ===== FILTERING REGISTRATION MENUS =====');
    // console.log('[MenuService] Looking for parent ID:', registrationParentId);
    
    const registrationMenus = this.getChildMenus(menuList, registrationParentId);
    
    // console.log('[MenuService] Found registration menus:', registrationMenus.length);
    // console.log('[MenuService] Registration menus:', JSON.stringify(registrationMenus, null, 2));
    
    return registrationMenus;
  }

  // Lấy danh sách chức năng dashboard
  async getDashboardItems(): Promise<DashboardItem[]> {
    try {
      const token = await this.getAuthToken();
      const userId = await this.getUserId();

      const requestBody = {
        func: 'pkg_chung_quanlynguoidung.LayDSChucNangTheoPhanLoai',
        iM: 'AzzSystem',
        strNguoiDung_Id: userId,
        strNguoiThucHien_Id: userId,
        strChucNang_Id: 'E8FBCAF09EC841A598C32E87BEB45608', // Dashboard ID
        strPhanLoai_Id: '',
      };

      const encryptionKey = 'DSA4BRICKTQiDyAvJhUpJC4RKSAvDS4gKAPP';
      
      const response = await fetch(`https://iu.cmcu.edu.vn/cmsapi/api/CMS_QuanLyNguoiDung_MH/${encryptionKey}`, {
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
        console.error('[MenuService] Dashboard response error:', errorText);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const temp = await response.json();
      
      if (!temp.Success) {
        console.error('[MenuService] Dashboard API error:', temp.Message);
        throw new Error(temp.Message || 'Lỗi khi lấy danh sách dashboard');
      }

      const decryptedData = AD(temp.Data.B, requestBody.iM);
      
      if (!decryptedData) {
        console.error('[MenuService] Cannot decrypt dashboard data');
        throw new Error('Không thể giải mã dữ liệu');
      }

      const apiData = JSON.parse(decryptedData);
      const dashboardList = Array.isArray(apiData) ? apiData : (apiData.Data || []);
      
      // console.log('[MenuService] Dashboard items:', dashboardList.length);
      
      return dashboardList;
    } catch (error) {
      console.error('[MenuService] Error fetching dashboard items:', error);
      throw error;
    }
  }
}

export default new MenuService();
