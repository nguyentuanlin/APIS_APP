import React, { createContext, useState, useContext, useEffect, ReactNode, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import { authService, User } from '../services/authService';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  updateUserLocal: (data: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [sessionExpiresAt, setSessionExpiresAt] = useState<Date | null>(null);
  const logoutTimerRef = useRef<NodeJS.Timeout | null>(null);
  const warningTimerRef = useRef<NodeJS.Timeout | null>(null);

  const SESSION_WARNING_BEFORE_MS = 5 * 60 * 1000; // 5 phút trước khi hết hạn
  const SESSION_EXPIRES_AT_KEY = 'session_expires_at';

  const clearSessionTimers = () => {
    if (logoutTimerRef.current) {
      clearTimeout(logoutTimerRef.current);
      logoutTimerRef.current = null;
    }
    if (warningTimerRef.current) {
      clearTimeout(warningTimerRef.current);
      warningTimerRef.current = null;
    }
  };

  const scheduleSessionTimers = (expiresAt: Date) => {
    clearSessionTimers();
    setSessionExpiresAt(expiresAt);

    const remainingMs = expiresAt.getTime() - Date.now();
    if (remainingMs <= 0) {
      logout();
      return;
    }

    // Timer tự động logout đúng lúc hết hạn
    logoutTimerRef.current = setTimeout(() => {
      Alert.alert(
        'Phiên làm việc đã hết hạn',
        'Phiên đăng nhập của bạn đã hết hiệu lực. Vui lòng đăng nhập lại.',
        [
          {
            text: 'OK',
            onPress: () => {
              logout();
            },
          },
        ],
        { cancelable: false },
      );
    }, remainingMs);

    // Timer cảnh báo trước khi hết hạn
    const warningDelay = remainingMs - SESSION_WARNING_BEFORE_MS;
    const fireIn = warningDelay > 0 ? warningDelay : 0;

    warningTimerRef.current = setTimeout(() => {
      Alert.alert(
        'Phiên làm việc sắp hết hạn',
        'Phiên của bạn sắp hết hạn. Bạn muốn tiếp tục ca làm việc hay đăng xuất?',
        [
          {
            text: 'Đăng xuất',
            style: 'destructive',
            onPress: () => {
              logout();
            },
          },
          {
            text: 'Tiếp tục ca làm việc',
            onPress: async () => {
              try {
                logout();
              } catch (err: any) {
                console.error('[AuthContext] ❌ Gia hạn phiên thất bại:', err.message);
                logout();
              }
            },
          },
        ],
        { cancelable: false },
      );
    }, fireIn);
  };

  // Kiểm tra authentication khi app khởi động
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      setIsLoading(true);
      const isAuth = await authService.isAuthenticated();
      
      if (isAuth) {
        // Lấy profile mới từ server (không dùng cache để tránh hiển thị thông tin cũ)
        try {
          const profile = await authService.getProfile();
          setUser(profile);
        } catch (profileError) {
          console.error('Error fetching profile:', profileError);
          // Nếu lỗi lấy profile, đăng xuất để tránh trạng thái không nhất quán
          await authService.logout();
          setUser(null);
        }

        // Thiết lập timers dựa trên thời gian hết hạn đã lưu
        try {
          const raw = await AsyncStorage.getItem(SESSION_EXPIRES_AT_KEY);
          if (raw) {
            const expires = new Date(raw);
            if (!isNaN(expires.getTime())) {
              scheduleSessionTimers(expires);
            }
          }
        } catch {}
      }
    } catch (err) {
      console.error('Auth check error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Cập nhật cục bộ user (avatar, coverImage, fullname, ...), đồng bộ AsyncStorage
  const updateUserLocal = async (data: Partial<User>) => {
    const merged = { ...(user || ({} as User)), ...data } as User;
    setUser(merged);
    try {
      await AsyncStorage.setItem('userData', JSON.stringify(merged));
    } catch {}
  };

  const login = async (email: string, password: string) => {
    try {
      // console.log('[AuthContext] 🚀 Bắt đầu login flow...');
      setIsLoading(true);
      setError(null);

      // XÓA TOÀN BỘ dữ liệu cũ trước khi đăng nhập để tránh hiển thị thông tin cũ
      // console.log('[AuthContext] 🗑️ Xóa TOÀN BỘ dữ liệu cũ trước khi đăng nhập...');
      setUser(null);
      clearSessionTimers();
      
      // Xóa cache của các service
      try {
        const { scheduleService } = await import('../services/scheduleService');
        await scheduleService.clearCache();
        // console.log('[AuthContext] ✅ Đã xóa cache của scheduleService trước khi login');
      } catch (err) {
        console.warn('[AuthContext] ⚠️ Không thể xóa schedule cache trước khi login:', err);
      }
      
      try {
        const { financeService } = await import('../services/financeService');
        financeService.clearCache();
        // console.log('[AuthContext] ✅ Đã xóa cache của financeService trước khi login');
      } catch (err) {
        console.warn('[AuthContext] ⚠️ Không thể xóa finance cache trước khi login:', err);
      }
      
      try {
        const { examService } = await import('../services/examService');
        examService.clearCache();
        // console.log('[AuthContext] ✅ Đã xóa cache của examService trước khi login');
      } catch (err) {
        console.warn('[AuthContext] ⚠️ Không thể xóa exam cache trước khi login:', err);
      }

      // Đăng nhập
      // console.log('[AuthContext] 📝 Gọi authService.login...');
      await authService.login(email, password);
      // console.log('[AuthContext] ✅ Login service hoàn thành');

      // Lấy thông tin profile MỚI
      // console.log('[AuthContext] 📝 Gọi authService.getProfile...');
      const profile = await authService.getProfile();
      // console.log('[AuthContext] ✅ GetProfile hoàn thành - User:', profile.fullname);
      
      setUser(profile);
      // console.log('[AuthContext] 🎉 Login flow hoàn thành! User đã được set.');

      // Thiết lập timers cho phiên làm việc mới
      try {
        const raw = await AsyncStorage.getItem(SESSION_EXPIRES_AT_KEY);
        if (raw) {
          const expires = new Date(raw);
          if (!isNaN(expires.getTime())) {
            scheduleSessionTimers(expires);
          }
        }
      } catch {}
    } catch (err: any) {
      console.error('[AuthContext] ❌ Login flow thất bại:', err.message);
      const errorMessage = err.message || 'Đăng nhập thất bại';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
      console.log('[AuthContext] 🏁 Login flow kết thúc');
    }
  };

  const logout = async () => {
    try {
      // console.log('='.repeat(60));
      // console.log('[AuthContext] 🚪 LOGOUT - Xóa TOÀN BỘ dữ liệu');
      // console.log('[AuthContext] 📊 Current user:', user?.fullname);
      
      // Clear timers và user state ngay lập tức
      // console.log('[AuthContext] 📍 Bước 1: Clear timers và user state...');
      clearSessionTimers();
      setUser(null);
      setError(null);
      setSessionExpiresAt(null);
      // console.log('[AuthContext] ✅ State đã được reset');
      
      // Clear TẤT CẢ dữ liệu local (bao gồm cache của schedule, finance, exam, etc.)
      // console.log('[AuthContext] 📍 Bước 2: Clear TOÀN BỘ local data và cache...');
      await authService.logout();
      
      // Import và clear cache của các service khác
      try {
        const { scheduleService } = await import('../services/scheduleService');
        await scheduleService.clearCache();
        // console.log('[AuthContext] ✅ Đã xóa cache của scheduleService');
      } catch (err) {
        console.warn('[AuthContext] ⚠️ Không thể xóa cache của scheduleService:', err);
      }
      
      try {
        const { financeService } = await import('../services/financeService');
        financeService.clearCache();
        // console.log('[AuthContext] ✅ Đã xóa cache của financeService');
      } catch (err) {
        console.warn('[AuthContext] ⚠️ Không thể xóa cache của financeService:', err);
      }
      
      try {
        const { examService } = await import('../services/examService');
        examService.clearCache();
        // console.log('[AuthContext] ✅ Đã xóa cache của examService');
      } catch (err) {
        console.warn('[AuthContext] ⚠️ Không thể xóa cache của examService:', err);
      }
      
      try {
        const { newsService } = await import('../services/newsService');
        await newsService.clearCache();
        // console.log('[AuthContext] ✅ Đã xóa cache của newsService');
      } catch (err) {
        console.warn('[AuthContext] ⚠️ Không thể xóa cache của newsService:', err);
      }
      
      // console.log('[AuthContext] 🎉 Đăng xuất hoàn tất! Tất cả dữ liệu đã được xóa.');
      // console.log('[AuthContext] 🔄 Navigation sẽ chuyển về màn hình đăng nhập...');
      // console.log('='.repeat(60));
    } catch (err) {
      console.error('[AuthContext] ❌ Lỗi đăng xuất:', err);
      // Vẫn clear user state ngay cả khi có lỗi
      setUser(null);
      setError(null);
      setSessionExpiresAt(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        error,
        login,
        logout,
        isAuthenticated: !!user,
        updateUserLocal,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
