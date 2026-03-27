import AsyncStorage from '@react-native-async-storage/async-storage';
import { AE, AD } from '../../crypto';

const BASE_URL = 'https://iu.cmcu.edu.vn/quanlytuyensinhapi/api';

// Cache configuration
const CACHE_DURATION = 10 * 60 * 1000; // 10 phút
const CACHE_KEYS = {
  NEWS_LIST: 'cached_news_list',
  NEWS_CATEGORIES: 'cached_news_categories',
};

// Utility function để đợi token sẵn sàng
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

// Types cho API responses
export interface NewsItem {
  ID: string;
  TIEUDE: string;
  MOTA: string | null;
  NOIDUNG: string;
  NGAYTAO: string;
  NGAYTAO_DD_MM_YYYY: string;
  NGAYTAO_YYYYMMDDHH24MISSFF3: string;
  NGUOITAO_ID: string;
  NGUOITAO_TAIKHOAN: string;
  NGUOITAO_TENDAYDU: string;
  CHUNG_UNGDUNG_ID: string;
  CHUNG_UNGDUNG_TEN: string;
  CHUYENMUC_ID: string | null;
  CHUYENMUC_MA: string | null;
  CHUYENMUC_TEN: string | null;
  DAOTAO_COCAUTOCHUC_ID: string;
  DAOTAO_COCAUTOCHUC_MA: string;
  DAOTAO_COCAUTOCHUC_TEN: string;
  DUONGDANANHHIENTHI: string | null;
  HIEULUC: number;
  NGAYBATDAU: string | null;
  NGAYKETTHUC: string | null;
  TIEUDIEM: number; // 1: Tin tiêu điểm, 0: Tin thường
}

export interface NewsComment {
  ID: string;
  TINTUC_BANGTIN_ID: string;
  NGUOITAO_ID: string;
  NGUOIDUNG_ID: string | null;
  NGUOIDUNG_TAIKHOAN: string | null;
  NGUOIDUNG_TENDAYDU: string | null;
  NOIDUNG: string;
  NGAYTAO: string;
  NGAYTAO_YYYYMMDDHH24MISSFF3: string;
}

export interface NewsCategory {
  ID: string;
  TEN: string;
}

interface ApiResponse<T> {
  Data: T[];
  Message: string;
  Success: boolean;
  Pager: string | null;
  Id: any;
}

interface CachedData<T> {
  data: T;
  timestamp: number;
}

class NewsService {
  private newsCache: CachedData<NewsItem[]> | null = null;
  private categoriesCache: CachedData<NewsCategory[]> | null = null;

  private async getAuthToken(): Promise<string> {
    try {
      let token = await AsyncStorage.getItem('access_token');
      
      if (!token) {
        token = await waitForToken();
      }
      
      return token;
    } catch (error) {
      console.error('[NewsService] ❌ Error getting token:', error);
      throw new Error('Không tìm thấy token xác thực');
    }
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
          const uniqueName = payload.unique_name || payload.sub || payload.userId;
          if (uniqueName) {
            const userId = String(uniqueName).split(';')[0];
            return userId;
          }
        }
      }
      
      throw new Error('Không tìm thấy user ID');
    } catch (error) {
      console.error('[NewsService] ❌ Error getting user ID:', error);
      throw new Error('Không tìm thấy user ID. Vui lòng đăng nhập lại.');
    }
  }

  /**
   * Kiểm tra cache có hợp lệ không
   */
  private isCacheValid<T>(cachedData: CachedData<T> | null): boolean {
    if (!cachedData) return false;
    return Date.now() - cachedData.timestamp < CACHE_DURATION;
  }

  /**
   * Lưu cache vào AsyncStorage
   */
  private async saveCacheToStorage<T>(key: string, data: T): Promise<void> {
    try {
      const cachedData: CachedData<T> = {
        data,
        timestamp: Date.now(),
      };
      await AsyncStorage.setItem(key, JSON.stringify(cachedData));
    } catch (error) {
      console.warn('[NewsService] ⚠️ Failed to save cache:', error);
    }
  }

  /**
   * Lấy cache từ AsyncStorage
   */
  private async getCacheFromStorage<T>(key: string): Promise<CachedData<T> | null> {
    try {
      const cached = await AsyncStorage.getItem(key);
      if (!cached) return null;
      
      const cachedData: CachedData<T> = JSON.parse(cached);
      return this.isCacheValid(cachedData) ? cachedData : null;
    } catch (error) {
      console.warn('[NewsService] ⚠️ Failed to get cache:', error);
      return null;
    }
  }

  /**
   * Lấy danh sách tin tức
   */
  async getNewsList(params?: {
    keyword?: string;
    fromDate?: string;
    toDate?: string;
    categoryId?: string;
    departmentId?: string;
    isImportant?: number; // 1: Tin quan trọng, -1: Tất cả
    isActive?: number; // 1: Hiệu lực, -1: Tất cả
    pageIndex?: number;
    pageSize?: number;
  }): Promise<NewsItem[]> {
    try {
      // console.log('[NewsService] 🌐 getNewsList called with params:', params);
      
      // Kiểm tra cache nếu không có filter
      if (!params || Object.keys(params).length === 0) {
        if (this.newsCache && this.isCacheValid(this.newsCache)) {
          // console.log('[NewsService] ✅ Using memory cache for news list');
          return this.newsCache.data;
        }

        const storageCache = await this.getCacheFromStorage<NewsItem[]>(CACHE_KEYS.NEWS_LIST);
        if (storageCache) {
          // console.log('[NewsService] ✅ Using storage cache for news list');
          this.newsCache = storageCache;
          return storageCache.data;
        }
      }

      // console.log('[NewsService] 🌐 Fetching news list from API');
      const token = await this.getAuthToken();
      const userId = await this.getUserId();
      
      // console.log('[NewsService] 🔑 Token:', token ? 'exists' : 'missing');
      // console.log('[NewsService] 👤 User ID:', userId);
      
      const requestBody = {
        func: 'pkg_tintuc.LayDSTinTuc_BangTin_NguoiDung',
        iM: 'AzzSystem',
        strChucNang_Id: '15346B6F33834D7897591527289DB0F8',
        strNguoiThucHien_Id: userId,
        strChung_UngDung_Id: '80CF9E16C2D74F46A1ECE73B7C119A8F',
        strTuKhoa: params?.keyword || '',
        strTuNgay: params?.fromDate || '',
        strDenNgay: params?.toDate || '',
        strChuyenMuc_Id: params?.categoryId || '',
        strDaoTao_CoCauToChuc_Id: params?.departmentId || '',
        dTinQuanTrong: params?.isImportant ?? -1,
        dHieuLuc: params?.isActive ?? 1,
        pageIndex: params?.pageIndex || 1,
        pageSize: params?.pageSize || 10000,
      };
      
      // console.log('[NewsService] 📦 Request body:', requestBody);
      
      const response = await fetch(`${BASE_URL}/TS_TinTuc_MH/DSA4BRIVKC8VNCIeAyAvJhUoLx4PJjQuKAU0LyYP`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          A: AE(JSON.stringify(requestBody), 'DSA4BRIVKC8VNCIeAyAvJhUoLx4PJjQuKAU0LyYP')
        }),
      });

      // console.log('[NewsService] 📡 Response status:', response.status);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const temp = await response.json();
      // console.log('[NewsService] 📥 Response success:', temp.Success);
      
      if (!temp.Success) {
        throw new Error(temp.Message || 'Lỗi khi lấy danh sách tin tức');
      }

      const dataNews = AD(temp.Data.B, requestBody.iM);
      
      if (!dataNews) { 
        throw new Error('Không thể giải mã dữ liệu tin tức');
      }

      const newsData: NewsItem[] = JSON.parse(dataNews);
      // console.log('[NewsService] ✅ News data parsed:', newsData.length, 'items');
      
      // Lưu vào cache nếu không có filter
      if (!params || Object.keys(params).length === 0) {
        this.newsCache = {
          data: newsData,
          timestamp: Date.now(),
        };
        await this.saveCacheToStorage(CACHE_KEYS.NEWS_LIST, newsData);
      }

      return newsData;
    } catch (error) {
      console.error('[NewsService] ❌ Error fetching news list:', error);
      throw error;
    }
  }

  /**
   * Lấy danh sách đơn vị cung cấp nguồn (categories/departments)
   */
  async getNewsCategories(): Promise<NewsCategory[]> {
    try {
      if (this.categoriesCache && this.isCacheValid(this.categoriesCache)) {
        // console.log('[NewsService] ✅ Using memory cache for categories');
        return this.categoriesCache.data;
      }

      const storageCache = await this.getCacheFromStorage<NewsCategory[]>(CACHE_KEYS.NEWS_CATEGORIES);
      if (storageCache) {
        // console.log('[NewsService] ✅ Using storage cache for categories');
        this.categoriesCache = storageCache;
        return storageCache.data;
      }

      // console.log('[NewsService] 🌐 Fetching categories from API');
      const token = await this.getAuthToken();
      const userId = await this.getUserId();
      
      const requestBody = {
        func: 'pkg_tintuc.LayDSDonViCungCapNguon',
        iM: 'AzzSystem',
        strChucNang_Id: '15346B6F33834D7897591527289DB0F8',
        strNguoiThucHien_Id: userId,
        strQLSV_NguoiHoc_Id: userId,
      };
      
      const response = await fetch(`${BASE_URL}/TS_TinTuc_MH/DSA4BRIFLi8XKAI0LyYCIDEPJjQuLwPP`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          A: AE(JSON.stringify(requestBody), 'DSA4BRIFLi8XKAI0LyYCIDEPJjQuLwPP')
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const temp = await response.json();
      
      if (!temp.Success) {
        throw new Error(temp.Message || 'Lỗi khi lấy danh sách đơn vị');
      }

      const dataCategories = AD(temp.Data.B, requestBody.iM);
      
      if (!dataCategories) { 
        throw new Error('Không thể giải mã dữ liệu đơn vị');
      }

      const categoriesData: NewsCategory[] = JSON.parse(dataCategories);
      
      this.categoriesCache = {
        data: categoriesData,
        timestamp: Date.now(),
      };
      await this.saveCacheToStorage(CACHE_KEYS.NEWS_CATEGORIES, categoriesData);

      return categoriesData;
    } catch (error) {
      console.error('[NewsService] ❌ Error fetching categories:', error);
      throw error;
    }
  }

  /**
   * Lấy chi tiết tin tức theo ID
   */
  async getNewsDetail(newsId: string): Promise<NewsItem | null> {
    try {
      // Tìm trong cache trước
      if (this.newsCache && this.isCacheValid(this.newsCache)) {
        const news = this.newsCache.data.find(item => item.ID === newsId);
        if (news) return news;
      }

      // Nếu không có trong cache, lấy toàn bộ danh sách
      const newsList = await this.getNewsList();
      return newsList.find(item => item.ID === newsId) || null;
    } catch (error) {
      console.error('[NewsService] ❌ Error fetching news detail:', error);
      throw error;
    }
  }

  /**
   * Lọc tin tiêu điểm
   */
  async getFeaturedNews(): Promise<NewsItem[]> {
    try {
      const newsList = await this.getNewsList();
      return newsList.filter(item => item.TIEUDIEM === 1);
    } catch (error) {
      console.error('[NewsService] ❌ Error fetching featured news:', error);
      throw error;
    }
  }

  /**
   * Format ngày tháng
   */
  formatDate(dateString: string): string {
    // Input: "20240916133711" hoặc "16/09/2024"
    if (dateString.includes('/')) {
      return dateString;
    }
    
    const year = dateString.substring(0, 4);
    const month = dateString.substring(4, 6);
    const day = dateString.substring(6, 8);
    return `${day}/${month}/${year}`;
  }

  /**
   * Format thời gian tương đối (vd: "2 ngày trước")
   */
  getRelativeTime(dateString: string): string {
    try {
      let date: Date;
      
      if (dateString.includes('/')) {
        const [day, month, year] = dateString.split('/');
        date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      } else {
        const year = parseInt(dateString.substring(0, 4));
        const month = parseInt(dateString.substring(4, 6)) - 1;
        const day = parseInt(dateString.substring(6, 8));
        date = new Date(year, month, day);
      }

      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffDays === 0) return 'Hôm nay';
      if (diffDays === 1) return 'Hôm qua';
      if (diffDays < 7) return `${diffDays} ngày trước`;
      if (diffDays < 30) return `${Math.floor(diffDays / 7)} tuần trước`;
      if (diffDays < 365) return `${Math.floor(diffDays / 30)} tháng trước`;
      return `${Math.floor(diffDays / 365)} năm trước`;
    } catch (error) {
      return dateString;
    }
  }

  /**
   * Lấy URL ảnh đầy đủ
   */
  getImageUrl(imagePath: string | null): string | null {
    if (!imagePath) return null;
    if (imagePath.startsWith('http')) return imagePath;
    
    // API trả về path dạng: "ApisTinTuc/Avatar/unsave_xxx.jpg"
    // Cần thêm prefix: "https://iu.cmcu.edu.vn/upload/"
    return `https://iu.cmcu.edu.vn/upload/${imagePath}`;
  }

  /**
   * Lấy danh sách bình luận của tin tức
   */
  async getNewsComments(newsId: string): Promise<NewsComment[]> {
    try {
      // console.log('[NewsService] 💬 getNewsComments called for newsId:', newsId);
      
      const token = await this.getAuthToken();
      const userId = await this.getUserId();
      
      // console.log('[NewsService] 🔑 Token:', token ? 'exists' : 'missing');
      // console.log('[NewsService] 👤 User ID:', userId);
      
      const requestBody = {
        func: 'pkg_tintuc.LayDSTinTuc_BangTin_BinhLuan',
        iM: 'AzzSystem',
        strChucNang_Id: '15346B6F33834D7897591527289DB0F8',
        strNguoiThucHien_Id: userId,
        strTinTuc_BangTin_Id: newsId,
        strNguoiDung_Id: '',
        strTuKhoa: '',
        pageIndex: 1,
        pageSize: 100000,
      };
      
      // console.log('[NewsService] 📦 Request body:', requestBody);
      
      const response = await fetch(`${BASE_URL}/TS_TinTuc_MH/DSA4BRIVKC8VNCIeAyAvJhUoLx4DKC8pDTQgLwPP`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          A: AE(JSON.stringify(requestBody), 'DSA4BRIVKC8VNCIeAyAvJhUoLx4DKC8pDTQgLwPP')
        }),
      });

      // console.log('[NewsService] 📡 Response status:', response.status);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const temp = await response.json();
      // console.log('[NewsService] 📥 Response success:', temp.Success);
      
      if (!temp.Success) {
        throw new Error(temp.Message || 'Lỗi khi lấy danh sách bình luận');
      }

      const dataComments = AD(temp.Data.B, requestBody.iM);
      
      if (!dataComments) { 
        throw new Error('Không thể giải mã dữ liệu bình luận');
      }

      const commentsData: NewsComment[] = JSON.parse(dataComments);
      // console.log('[NewsService] ✅ Comments data parsed:', commentsData.length, 'items');
      
      return commentsData;
    } catch (error) {
      console.error('[NewsService] ❌ Error fetching comments:', error);
      throw error;
    }
  }

  /**
   * Thêm lượt xem cho tin tức
   */
  async addNewsView(newsId: string): Promise<void> {
    try {
      const token = await this.getAuthToken();
      const userId = await this.getUserId();
      
      const requestBody = {
        func: 'pkg_tintuc.Them_TinTuc_BangTin_LuotXem',
        iM: 'AzzSystem',
        strChucNang_Id: '15346B6F33834D7897591527289DB0F8',
        strNguoiThucHien_Id: userId,
        strTinTuc_BangTin_Id: newsId,
        strDiaChiMayTram: '',
        strTenThietBi: '',
        strThoiGianMayTram: '',
        strTrinhDuyetSuDungTruyCap: '',
      };
      
      const response = await fetch(`${BASE_URL}/TS_TinTuc_MH/FSkkLB4VKC8VNCIeAyAvJhUoLx4NNC41GSQs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          A: AE(JSON.stringify(requestBody), 'FSkkLB4VKC8VNCIeAyAvJhUoLx4NNC41GSQs')
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const temp = await response.json();
      
      if (!temp.Success) {
        console.warn('[NewsService] ⚠️ Failed to add view:', temp.Message);
      }
    } catch (error) {
      console.warn('[NewsService] ⚠️ Error adding view (non-critical):', error);
      // Không throw error vì đây không phải chức năng quan trọng
    }
  }

  /**
   * Decode HTML entities
   */
  decodeHtmlEntities(text: string): string {
    const entities: Record<string, string> = {
      '&nbsp;': ' ',
      '&amp;': '&',
      '&lt;': '<',
      '&gt;': '>',
      '&quot;': '"',
      '&#39;': "'",
      '&apos;': "'",
      '&ldquo;': '"',
      '&rdquo;': '"',
      '&lsquo;': '\u2018',
      '&rsquo;': '\u2019',
      '&ndash;': '–',
      '&mdash;': '—',
      '&hellip;': '…',
      '&aacute;': 'á',
      '&Aacute;': 'Á',
      '&agrave;': 'à',
      '&Agrave;': 'À',
      '&atilde;': 'ã',
      '&Atilde;': 'Ã',
      '&acirc;': 'â',
      '&Acirc;': 'Â',
      '&eacute;': 'é',
      '&Eacute;': 'É',
      '&egrave;': 'è',
      '&Egrave;': 'È',
      '&ecirc;': 'ê',
      '&Ecirc;': 'Ê',
      '&iacute;': 'í',
      '&Iacute;': 'Í',
      '&igrave;': 'ì',
      '&Igrave;': 'Ì',
      '&ocirc;': 'ô',
      '&Ocirc;': 'Ô',
      '&oacute;': 'ó',
      '&Oacute;': 'Ó',
      '&ograve;': 'ò',
      '&Ograve;': 'Ò',
      '&otilde;': 'õ',
      '&Otilde;': 'Õ',
      '&uacute;': 'ú',
      '&Uacute;': 'Ú',
      '&ugrave;': 'ù',
      '&Ugrave;': 'Ù',
      '&yacute;': 'ý',
      '&Yacute;': 'Ý',
      '&dagger;': '†',
      '&Dagger;': '‡',
      '&bull;': '•',
      '&deg;': '°',
      '&copy;': '©',
      '&reg;': '®',
      '&trade;': '™',
      '&euro;': '€',
      '&pound;': '£',
      '&yen;': '¥',
      '&cent;': '¢',
      '&sect;': '§',
      '&para;': '¶',
      '&middot;': '·',
      '&times;': '×',
      '&divide;': '÷',
      '&plusmn;': '±',
      '&frac14;': '¼',
      '&frac12;': '½',
      '&frac34;': '¾',
    };

    let decoded = text;
    
    // Replace known entities
    Object.keys(entities).forEach(entity => {
      const regex = new RegExp(entity, 'g');
      decoded = decoded.replace(regex, entities[entity]);
    });
    
    // Replace numeric entities (&#xxx; and &#xHHH;)
    decoded = decoded.replace(/&#(\d+);/g, (match, dec) => {
      return String.fromCharCode(dec);
    });
    
    decoded = decoded.replace(/&#x([0-9A-Fa-f]+);/g, (match, hex) => {
      return String.fromCharCode(parseInt(hex, 16));
    });
    
    return decoded;
  }

  /**
   * Strip HTML tags và decode entities
   */
  stripHtmlAndDecode(html: string): string {
    // Remove HTML tags
    let text = html.replace(/<[^>]*>/g, '\n');
    
    // Decode HTML entities
    text = this.decodeHtmlEntities(text);
    
    // Clean up multiple newlines
    text = text.replace(/\n\s*\n\s*\n/g, '\n\n');
    
    // Trim
    text = text.trim();
    
    return text;
  }

  /**
   * Xóa cache
   */
  async clearCache(): Promise<void> {
    try {
      this.newsCache = null;
      this.categoriesCache = null;

      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => 
        key === CACHE_KEYS.NEWS_LIST || 
        key === CACHE_KEYS.NEWS_CATEGORIES
      );
      
      if (cacheKeys.length > 0) {
        await AsyncStorage.multiRemove(cacheKeys);
      }
    } catch (error) {
      console.warn('[NewsService] ⚠️ Failed to clear cache:', error);
    }
  }
}

export const newsService = new NewsService();
