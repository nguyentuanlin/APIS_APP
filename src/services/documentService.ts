import AsyncStorage from '@react-native-async-storage/async-storage';
import { AE, AD } from '../../crypto';
import { API_HOSTS, API_HOST } from '../config/apiHosts';

export interface VanBanItem {
  ID: string;
  TENVANBAN: string;
  SOHIEU?: string;
  NGAYBANHANH?: string;
}

export interface VanBanFile {
  FILEMINHCHUNG?: string;
  TEN?: string;
}

class DocumentService {
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

  async getVanBanList(): Promise<VanBanItem[]> {
    const token = await this.getAuthToken();
    const userId = await this.getUserId();
    const encryptionKey = 'DSA4BRIVKC8VNCIeFyAvAyAv';
    const requestBody = {
      func: 'pkg_tintuc.LayDSTinTuc_VanBan',
      iM: 'AzzSystem',
      strNguoiThucHien_Id: userId,
      strLoaiVanBan_Id: '',
    };
    const response = await fetch(
      `${API_HOSTS.quanLyTuyenSinh}/TS_TinTuc_MH/${encryptionKey}`,
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
    return Array.isArray(apiData) ? apiData : apiData.Data || [];
  }

  async getFileUrl(vanBanId: string): Promise<string | null> {
    try {
      const token = await this.getAuthToken();
      const url = `${API_HOSTS.quanLyTuyenSinh}/TT_Files/LayDanhSach?strDuLieu_Id=${vanBanId}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) return null;
      const json = await response.json();
      if (!json.Success) return null;
      const files: VanBanFile[] = json.Data || [];
      if (files.length === 0 || !files[0].FILEMINHCHUNG) return null;
      // Full URL = host + /upload + FILEMINHCHUNG path
      return `${API_HOST}/upload/${files[0].FILEMINHCHUNG}`;
    } catch (e) {
      console.warn('[Document] getFileUrl error:', e);
      return null;
    }
  }
}

export const documentService = new DocumentService();
export default documentService;
