import AsyncStorage from '@react-native-async-storage/async-storage';
import { AE, AD } from '../../crypto';

// Function để đợi token sẵn sàng
const waitForToken = async (maxAttempts = 10, delay = 500): Promise<string> => {
  for (let i = 0; i < maxAttempts; i++) {
    const token = await AsyncStorage.getItem('access_token');
    if (token) {
      return token;
    }
    await new Promise(resolve => setTimeout(resolve, delay));
  }
  throw new Error('Token không sẵn sàng sau khi đợi');
};

// Interface cho phiếu thu/hóa đơn
export interface ReceiptItem {
  ID: string;
  SOPHIEUTHU?: string;       // Số phiếu thu
  SOHOADON?: string;         // Số hóa đơn
  TONGTIEN: number;          // Tổng tiền
  NGAYTAO: string;
  NGAYTHU_DD_MM_YYYY_HHMMSS: string; // Ngày thu
  NGAYCAPHOADON?: string;    // Ngày cấp hóa đơn
  TAIKHOAN_NGUOITHU: string;
  TENDAYDU_NGUOITHU: string; // Người thu
  TINHTRANG: number;         // Tình trạng
}

// Interface cho dữ liệu tài chính từ API
export interface FinanceItem {
  ID: string;
  TAICHINH_CACKHOANTHU_ID: string;
  MATHANHTOANDINHDANH: string;
  TAICHINH_CACKHOANTHU_TEN: string;
  TAICHINH_CACKHOANTHU_MA: string;
  TAICHINH_CACKHOANTHU_THUTU: number;
  DIEM_KIEUHOC_ID: string | null;
  DIEM_KIEUHOC_TEN: string | null;
  DANGKY_LOPHOCPHAN_ID: string | null;
  DANGKY_LOPHOCPHAN_TEN: string | null;
  DANGKY_LOPHOCPHAN_MA: string | null;
  DAOTAO_HOCPHAN_ID: string | null;
  DAOTAO_HOCPHAN_TEN: string | null;
  DAOTAO_HOCPHAN_MA: string | null;
  SOTIEN: number;
  SOTIENPHAINOP: number;
  SOTIENGACHNO: number;
  NOIDUNG: string;
  QLSV_NGUOIHOC_ID: string;
  DAOTAO_THOIGIANDAOTAO_ID: string;
  DAOTAO_THOIGIANDAOTAO_DOT: number;
  DAOTAO_THOIGIANDAOTAO_HOCKY: string;
  DAOTAO_THOIGIANDAOTAO: string;
  DAOTAO_THOIGIANDAOTAO_DOTHOC: number;
  NGAYTAO: string;
  NGAYTAO_DD_MM_YYYY: string;
  NGUOITAO_ID: string;
  NGUOITAO_TAIKHOAN: string;
  NGUOITAO_TENDAYDU: string;
  CHUNGTU_SO?: string; // Số chứng từ cho khoản đã nộp
  CHUNGTU_ID?: string; // ID chứng từ
  HINHTHUCTHU_ID?: string; // Hình thức thu
  HINHTHUCTHU_MA?: string; // Mã hình thức thu
  HINHTHUCTHU_TEN?: string; // Tên hình thức thu
  KHONGHACHTOAN?: number; // Không hạch toán
}

export interface FinanceApiResponse {
  Data: FinanceItem[];
  Message: string;
  Success: boolean;
  Pager: any;
  Id: any;
}

export interface FinanceSummary {
  totalAmount: number;        // Tổng số tiền phải nộp
  totalPaid: number;         // Tổng số tiền đã nộp
  totalDebt: number;         // Tổng công nợ
  totalExemption: number;    // Tổng số tiền được miễn
  totalSurplus: number;      // Tổng số tiền dư rút
  totalGeneralSurplus: number; // Tổng dư chung các khoản
  totalReceipts: number;     // Tổng phiếu đã thu
  totalSurplusReceipts: number; // Tổng phiếu dư rút
  totalInvoices: number;     // Tổng phiếu hóa đơn
  items: FinanceItem[];      // Danh sách các khoản nợ chung
  totalAmountItems?: FinanceItem[]; // Danh sách khoản phải nộp
  exemptionItems?: FinanceItem[]; // Danh sách khoản được miễn
  paidItems?: FinanceItem[]; // Danh sách khoản đã nộp
  surplusItems?: FinanceItem[]; // Danh sách khoản dư rút
  generalSurplusItems?: FinanceItem[]; // Danh sách dư chung các khoản
  receiptItems?: ReceiptItem[]; // Danh sách phiếu đã thu
  surplusReceiptItems?: ReceiptItem[]; // Danh sách phiếu dư rút
  invoiceItems?: ReceiptItem[]; // Danh sách phiếu hóa đơn
}

class FinanceService {
  private baseUrl = 'https://iu.cmcu.edu.vn/taichinhapi/api';
  private financeCache: Map<string, { data: FinanceSummary; timestamp: number }> = new Map();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 phút

  /**
   * Xóa cache tài chính (gọi khi logout hoặc cần refresh)
   */
  clearCache(): void {
    // console.log('[FinanceService] 🗑️ Clearing finance cache...');
    this.financeCache.clear();
  }

  private async getAuthToken(): Promise<string> {
    try {
      let token = await AsyncStorage.getItem('access_token');
      
      if (!token) {
        token = await waitForToken();
      }
      
      return token;
    } catch (error) {
      console.error('[FinanceService] ❌ Error getting token:', error);
      throw new Error('Không tìm thấy token xác thực');
    }
  }

  private async getUserId(): Promise<string> {
    try {
      // Lấy user ID từ userData trong AsyncStorage
      const userDataStr = await AsyncStorage.getItem('userData');
      if (userDataStr) {
        const userData = JSON.parse(userDataStr);
        if (userData.sub) {
          // Token có format: "ID;hash;timestamp", chỉ lấy phần ID
          const userId = userData.sub.split(';')[0];
          // console.log('[FinanceService] 📍 Using user ID:', userId);
          return userId;
        }
      }
      
      // Fallback: parse từ token
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
          const uniqueName = payload.unique_name || payload.sub || payload.userId;
          if (uniqueName) {
            // Lấy phần đầu tiên trước dấu ;
            const userId = String(uniqueName).split(';')[0];
            // console.log('[FinanceService] 📍 Using user ID from token:', userId);
            return userId;
          }
        }
      }
      
      throw new Error('Không tìm thấy user ID');
    } catch (error) {
      console.error('[FinanceService] ❌ Error getting user ID:', error);
      throw new Error('Không tìm thấy user ID. Vui lòng đăng nhập lại.');
    }
  }

  // Lấy thông tin tài chính chung
  async getFinanceInfo(): Promise<FinanceSummary> {
    try {
      const [token, userId] = await Promise.all([
        this.getAuthToken(),
        this.getUserId()
      ]);

      // API chỉ trả về dữ liệu cho "Tổng nợ chung các khoản"
      const url = `${this.baseUrl}/TC_ThongTinChung/LayDSKhoanNoChung?strQLSV_NguoiHoc_Id=${userId}&strNguoiThucHien_Id=${userId}`;
      
      // console.log('[FinanceService] Fetching debt info from:', url);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      // console.log('[FinanceService] Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[FinanceService] Response error:', errorText);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: FinanceApiResponse = await response.json();
      
      // console.log('[FinanceService] API Response:', JSON.stringify(data, null, 2));
      
      if (!data.Success) {
        throw new Error(data.Message || 'API returned error');
      }

      // console.log('[FinanceService] Debt data received:', data.Data?.length || 0, 'items');

      // API này dành cho "Tổng nợ chung các khoản"
      const debtItems = data.Data || [];
      
      // Tính tổng số tiền của các khoản (không chỉ nợ)
      const totalDebtAmount = debtItems.reduce((sum, item) => sum + (item.SOTIENPHAINOP || 0), 0);
      const totalDebt = debtItems.reduce((sum, item) => sum + (item.SOTIENGACHNO || 0), 0);
      
      // console.log('[FinanceService] Debt calculation:', {
      //   totalDebtAmount, // Tổng số tiền các khoản
      //   totalDebt,       // Tổng số tiền còn nợ
      //   itemsCount: debtItems.length,
      //   items: debtItems.map(item => ({
      //     ten: item.TAICHINH_CACKHOANTHU_TEN,
      //     phaiNop: item.SOTIENPHAINOP,
      //     gachNo: item.SOTIENGACHNO
      //   }))
      // });
      
      // Card "Tổng nợ chung các khoản" hiển thị tổng SOTIENPHAINOP
      const summary: FinanceSummary = {
        totalAmount: 0,                    // Chưa có API
        totalPaid: 0,                      // Chưa có API
        totalDebt: totalDebtAmount,        // Hiển thị tổng số tiền các khoản (5,000,000)
        totalExemption: 0,                 // Chưa có API
        totalSurplus: 0,                   // Chưa có API
        totalGeneralSurplus: 0,            // Chưa có API
        totalReceipts: 0,                  // Chưa có API
        totalSurplusReceipts: 0,           // Chưa có API
        totalInvoices: 0,                  // Chưa có API
        items: debtItems                   // Items cho modal
      };
      
      return summary;
    } catch (error) {
      console.error('[FinanceService] Error fetching finance info:', error);
      throw error;
    }
  }

  // Lấy danh sách khoản phải nộp
  async getTotalAmountItems(): Promise<FinanceItem[]> {
    try {
      const [token, userId] = await Promise.all([
        this.getAuthToken(),
        this.getUserId()
      ]);

      const requestBody = {
        func: 'pkg_taichinh_thongtin.LayDSKhoanPhaiNop',
        strChucNang_Id: '7A425B5F926A4EFCAB2ACC5D0A9B8F36',
        strQLSV_NguoiHoc_Id: userId,
        strNguoiThucHien_Id: userId,
        iM: 'AzzSystem'
      };

      const encryptionKey = 'DSA4BRIKKS4gLxEpICgPLjEP';
      
      const response = await fetch(`https://iu.cmcu.edu.vn/taichinhapi/api/TC_ThongTin_MH/${encryptionKey}`, {
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
        throw new Error(temp.Message || 'Lỗi khi lấy danh sách khoản phải nộp');
      }

      // Giải mã dữ liệu từ response
      const decryptedData = AD(temp.Data.B, requestBody.iM);
      
      if (!decryptedData) {
        throw new Error('Không thể giải mã dữ liệu khoản phải nộp');
      }

      const items: FinanceItem[] = JSON.parse(decryptedData);
      return items;
    } catch (error) {
      console.error('[FinanceService] Error fetching total amount items:', error);
      throw error;
    }
  }

  // Lấy danh sách khoản đã nộp
  async getPaidItems(): Promise<FinanceItem[]> {
    try {
      const [token, userId] = await Promise.all([
        this.getAuthToken(),
        this.getUserId()
      ]);

      const requestBody = {
        func: 'pkg_taichinh_thongtin.LayDSKhoanDaNop',
        strChucNang_Id: '7A425B5F926A4EFCAB2ACC5D0A9B8F36',
        strQLSV_NguoiHoc_Id: userId,
        strNguoiThucHien_Id: userId,
        iM: 'AzzSystem'
      };

      const encryptionKey = 'DSA4BRIKKS4gLwUgDy4x';
      
      const response = await fetch(`https://iu.cmcu.edu.vn/taichinhapi/api/TC_ThongTin_MH/${encryptionKey}`, {
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
        throw new Error(temp.Message || 'Lỗi khi lấy danh sách khoản đã nộp');
      }

      // Giải mã dữ liệu từ response
      const decryptedData = AD(temp.Data.B, requestBody.iM);
      
      if (!decryptedData) {
        throw new Error('Không thể giải mã dữ liệu khoản đã nộp');
      }

      const items: FinanceItem[] = JSON.parse(decryptedData);
      return items;
    } catch (error) {
      console.error('[FinanceService] Error fetching paid items:', error);
      throw error;
    }
  }

  // Lấy danh sách khoản được miễn
  async getExemptionItems(): Promise<FinanceItem[]> {
    try {
      const [token, userId] = await Promise.all([
        this.getAuthToken(),
        this.getUserId()
      ]);

      const requestBody = {
        func: 'pkg_taichinh_thongtin.LayDSKhoanDuocMien',
        strChucNang_Id: '7A425B5F926A4EFCAB2ACC5D0A9B8F36',
        strQLSV_NguoiHoc_Id: userId,
        strNguoiThucHien_Id: userId,
        iM: 'AzzSystem'
      };

      const encryptionKey = 'DSA4BRIKKS4gLwwoJC8P';
      
      const response = await fetch(`https://iu.cmcu.edu.vn/taichinhapi/api/TC_ThongTin_MH/${encryptionKey}`, {
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
        throw new Error(temp.Message || 'Lỗi khi lấy danh sách khoản được miễn');
      }

      // Giải mã dữ liệu từ response
      const decryptedData = AD(temp.Data.B, requestBody.iM);
      
      if (!decryptedData) {
        throw new Error('Không thể giải mã dữ liệu khoản được miễn');
      }

      const items: FinanceItem[] = JSON.parse(decryptedData);
      return items;
    } catch (error) {
      console.error('[FinanceService] Error fetching exemption items:', error);
      throw error;
    }
  }

  // Lấy danh sách khoản dư rút
  async getSurplusItems(): Promise<FinanceItem[]> {
    try {
      const [token, userId] = await Promise.all([
        this.getAuthToken(),
        this.getUserId()
      ]);

      const requestBody = {
        func: 'pkg_taichinh_thongtin.LayDSKhoanDaRut',
        strChucNang_Id: '7A425B5F926A4EFCAB2ACC5D0A9B8F36',
        strQLSV_NguoiHoc_Id: userId,
        strNguoiThucHien_Id: userId,
        iM: 'AzzSystem'
      };

      const encryptionKey = 'DSA4BRIKKS4gLwUgEzQ1';
      
      const response = await fetch(`https://iu.cmcu.edu.vn/taichinhapi/api/TC_ThongTin_MH/${encryptionKey}`, {
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
        throw new Error(temp.Message || 'Lỗi khi lấy danh sách khoản dư rút');
      }

      // Giải mã dữ liệu từ response
      const decryptedData = AD(temp.Data.B, requestBody.iM);
      
      if (!decryptedData) {
        throw new Error('Không thể giải mã dữ liệu khoản dư rút');
      }

      const items: FinanceItem[] = JSON.parse(decryptedData);
      return items;
    } catch (error) {
      console.error('[FinanceService] Error fetching surplus items:', error);
      throw error;
    }
  }

  // Lấy danh sách dư chung các khoản
  async getGeneralSurplusItems(): Promise<FinanceItem[]> {
    try {
      const [token, userId] = await Promise.all([
        this.getAuthToken(),
        this.getUserId()
      ]);

      const requestBody = {
        func: 'pkg_taichinh_thongtin.LayDSKhoanDuChung',
        strChucNang_Id: '7A425B5F926A4EFCAB2ACC5D0A9B8F36',
        strQLSV_NguoiHoc_Id: userId,
        strNguoiThucHien_Id: userId,
        pageIndex: 1,
        pageSize: 1000000000,
        iM: 'AzzSystem'
      };

      const encryptionKey = 'DSA4BRIKKS4gLwU0Aik0LyYP';
      
      const response = await fetch(`https://iu.cmcu.edu.vn/taichinhapi/api/TC_ThongTin_MH/${encryptionKey}`, {
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
        throw new Error(temp.Message || 'Lỗi khi lấy danh sách dư chung các khoản');
      }

      // Giải mã dữ liệu từ response
      const decryptedData = AD(temp.Data.B, requestBody.iM);
      
      if (!decryptedData) {
        throw new Error('Không thể giải mã dữ liệu dư chung các khoản');
      }

      const items: FinanceItem[] = JSON.parse(decryptedData);
      return items;
    } catch (error) {
      console.error('[FinanceService] Error fetching general surplus items:', error);
      throw error;
    }
  }

  // Lấy danh sách phiếu đã thu
  async getReceiptItems(): Promise<ReceiptItem[]> {
    try {
      const [token, userId] = await Promise.all([
        this.getAuthToken(),
        this.getUserId()
      ]);

      const requestBody = {
        func: 'pkg_taichinh_thongtin.LayDSPhieuDaThu',
        strChucNang_Id: '7A425B5F926A4EFCAB2ACC5D0A9B8F36',
        strQLSV_NguoiHoc_Id: userId,
        strNguoiThucHien_Id: userId,
        pageIndex: 1,
        pageSize: 1000000000,
        iM: 'AzzSystem'
      };

      const encryptionKey = 'DSA4BRIRKSgkNAUgFSk0';
      
      const response = await fetch(`https://iu.cmcu.edu.vn/taichinhapi/api/TC_ThongTin_MH/${encryptionKey}`, {
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
        throw new Error(temp.Message || 'Lỗi khi lấy danh sách phiếu đã thu');
      }

      // Giải mã dữ liệu từ response
      const decryptedData = AD(temp.Data.B, requestBody.iM);
      
      if (!decryptedData) {
        throw new Error('Không thể giải mã dữ liệu phiếu đã thu');
      }

      const items: ReceiptItem[] = JSON.parse(decryptedData);
      return items;
    } catch (error) {
      console.error('[FinanceService] Error fetching receipt items:', error);
      throw error;
    }
  }

  // Lấy danh sách phiếu dư rút
  async getSurplusReceiptItems(): Promise<ReceiptItem[]> {
    try {
      const [token, userId] = await Promise.all([
        this.getAuthToken(),
        this.getUserId()
      ]);

      const requestBody = {
        func: 'pkg_taichinh_thongtin.LayDSPhieuDaRut',
        strChucNang_Id: '7A425B5F926A4EFCAB2ACC5D0A9B8F36',
        strQLSV_NguoiHoc_Id: userId,
        strNguoiThucHien_Id: userId,
        pageIndex: 1,
        pageSize: 1000000000,
        iM: 'AzzSystem'
      };

      const encryptionKey = 'DSA4BRIRKSgkNAUgEzQ1';
      
      const response = await fetch(`https://iu.cmcu.edu.vn/taichinhapi/api/TC_ThongTin_MH/${encryptionKey}`, {
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
        throw new Error(temp.Message || 'Lỗi khi lấy danh sách phiếu dư rút');
      }

      // Giải mã dữ liệu từ response
      const decryptedData = AD(temp.Data.B, requestBody.iM);
      
      if (!decryptedData) {
        throw new Error('Không thể giải mã dữ liệu phiếu dư rút');
      }

      const items: ReceiptItem[] = JSON.parse(decryptedData);
      return items;
    } catch (error) {
      console.error('[FinanceService] Error fetching surplus receipt items:', error);
      throw error;
    }
  }

  // Lấy danh sách phiếu hóa đơn
  async getInvoiceItems(): Promise<ReceiptItem[]> {
    try {
      const [token, userId] = await Promise.all([
        this.getAuthToken(),
        this.getUserId()
      ]);

      const requestBody = {
        func: 'pkg_taichinh_thongtin.LayDSPhieuHoaDon',
        strChucNang_Id: '7A425B5F926A4EFCAB2ACC5D0A9B8F36',
        strQLSV_NguoiHoc_Id: userId,
        strNguoiThucHien_Id: userId,
        pageIndex: 1,
        pageSize: 1000000000,
        iM: 'AzzSystem'
      };

      const encryptionKey = 'DSA4BRIRKSgkNAkuIAUuLwPP';
      
      const response = await fetch(`https://iu.cmcu.edu.vn/taichinhapi/api/TC_ThongTin_MH/${encryptionKey}`, {
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
        throw new Error(temp.Message || 'Lỗi khi lấy danh sách phiếu hóa đơn');
      }

      // Giải mã dữ liệu từ response
      const decryptedData = AD(temp.Data.B, requestBody.iM);
      
      if (!decryptedData) {
        throw new Error('Không thể giải mã dữ liệu phiếu hóa đơn');
      }

      const items: ReceiptItem[] = JSON.parse(decryptedData);
      return items;
    } catch (error) {
      console.error('[FinanceService] Error fetching invoice items:', error);
      throw error;
    }
  }

  // Tính toán tổng hợp tài chính
  private calculateFinanceSummary(items: FinanceItem[]): FinanceSummary {
    let totalAmount = 0;      // Tổng phải nộp
    let totalPaid = 0;        // Tổng đã nộp  
    let totalDebt = 0;        // Tổng nợ
    let totalExemption = 0;   // Tổng miễn giảm

    items.forEach(item => {
      // Tổng phải nộp
      totalAmount += item.SOTIENPHAINOP || 0;
      
      // Tổng nợ (SOTIENGACHNO là số tiền còn nợ)
      totalDebt += item.SOTIENGACHNO || 0;
      
      // Tổng đã nộp = Phải nộp - Còn nợ
      const paidAmount = (item.SOTIENPHAINOP || 0) - (item.SOTIENGACHNO || 0);
      totalPaid += paidAmount;
      
      // Tạm thời set exemption = 0, có thể cần API khác để lấy thông tin này
    });

    return {
      totalAmount,
      totalPaid,
      totalDebt,
      totalExemption,
      totalSurplus: 0,
      totalGeneralSurplus: 0,
      totalReceipts: 0,
      totalSurplusReceipts: 0,
      totalInvoices: 0,
      items
    };
  }

  // Format số tiền
  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('vi-VN').format(amount);
  }

  // Lấy trạng thái thanh toán
  getPaymentStatus(item: FinanceItem): 'paid' | 'partial' | 'unpaid' {
    const debt = item.SOTIENGACHNO || 0;
    const required = item.SOTIENPHAINOP || 0;
    
    if (debt >= required) {
      return 'paid';        // Đã gạch nợ đủ = đã thanh toán
    } else if (debt > 0) {
      return 'partial';     // Gạch nợ một phần = thanh toán một phần
    } else {
      return 'unpaid';      // Chưa gạch nợ = chưa thanh toán
    }
  }

  // Lấy màu sắc theo trạng thái
  getStatusColor(status: 'paid' | 'partial' | 'unpaid'): string {
    switch (status) {
      case 'paid':
        return '#10B981';
      case 'partial':
        return '#F59E0B';
      case 'unpaid':
        return '#EF4444';
      default:
        return '#6B7280';
    }
  }

  // Lấy text trạng thái
  getStatusText(status: 'paid' | 'partial' | 'unpaid'): string {
    switch (status) {
      case 'paid':
        return 'Đã thanh toán';
      case 'partial':
        return 'Thanh toán một phần';
      case 'unpaid':
        return 'Chưa thanh toán';
      default:
        return 'Không xác định';
    }
  }
}

export const financeService = new FinanceService();