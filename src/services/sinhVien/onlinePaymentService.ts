import AsyncStorage from '@react-native-async-storage/async-storage';
import { AE, AD } from '../../../crypto';
import { API_HOSTS } from '../../config/apiHosts';

export interface PaymentItem {
  ID: string;
  NOIDUNG: string;
  SOTIEN: number;
  GHICHU?: string;
  BATBUOC?: number;
}

class OnlinePaymentService {
  private async getAuthToken(): Promise<string> {
    const token = await AsyncStorage.getItem('access_token');
    if (!token) throw new Error('No authentication token');
    return token;
  }

  private async getUserId(): Promise<string> {
    const userDataStr = await AsyncStorage.getItem('userData');
    if (userDataStr) {
      const userData = JSON.parse(userDataStr);
      if (userData.sub) return userData.sub.split(';')[0];
    }
    throw new Error('No user ID');
  }

  async getPaymentItems(): Promise<PaymentItem[]> {
    const token = await this.getAuthToken();
    const userId = await this.getUserId();
    const encryptionKey = 'DSA4FSkuLyYVKC8VICgCKSgvKQPP';
    const requestBody = {
      func: 'pkg_thanhtoan.LayThongTinTaiChinh',
      iM: 'AzzSystem',
      strMaSinhVien: userId,
      strMaNganHang: 'VNPAY',
    };

    const response = await fetch(
      `${API_HOSTS.taiChinh}/TC_ThanhToan_MH/${encryptionKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          A: AE(JSON.stringify(requestBody), encryptionKey),
        }),
      }
    );

    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const temp = await response.json();
    if (!temp.Success) throw new Error(temp.Message || 'Success=false');
    if (!temp.Data?.B) return [];
    const decrypted = AD(temp.Data.B, requestBody.iM);
    if (!decrypted) return [];
    const apiData = JSON.parse(decrypted);
    return apiData?.rsChiTiet || [];
  }
}

export const onlinePaymentService = new OnlinePaymentService();
export default onlinePaymentService;
