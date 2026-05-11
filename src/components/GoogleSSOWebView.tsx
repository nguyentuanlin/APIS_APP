/**
 * Google SSO WebView Component
 *
 * Nhúng react-native-webview để chạy đúng luồng OAuth của web qldt.eaut.edu.vn:
 *   Google → redirect_uri = https://qldt.eaut.edu.vn/congthongtin/login.aspx?code=...
 *   → login.aspx server-side exchange code, set ASP.NET session cookie, redirect portal.
 *
 * Khác với phiên bản cũ (dùng expo-web-browser/openAuthSessionAsync với deep link
 * myapp://), redirect_uri ở đây là một trang HTTPS thật của trường — system browser
 * không bao giờ tự đóng. Phải dùng WebView để bắt URL chứa `?code=` và URL portal
 * sau khi đăng nhập.
 *
 * Spoof userAgent để bypass Google "disallowed_useragent" trong WebView.
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Modal,
  StyleSheet,
  ActivityIndicator,
  Text,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { WebView, WebViewNavigation } from 'react-native-webview';
import { googleSSOService, GoogleUserInfo } from '../services/googleSSOService';
import { GOOGLE_SSO_CONFIG, validateGoogleConfig } from '../config/googleSSOConfig';

interface GoogleSSOWebViewProps {
  visible: boolean;
  onSuccess: (userInfo: GoogleUserInfo) => void;
  onError: (error: Error) => void;
  onCancel: () => void;
}

const SPOOFED_UA =
  Platform.OS === 'ios'
    ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
    : 'Mozilla/5.0 (Linux; Android 13; SM-G998B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';

// Khi WebView đứng ở các URL này coi như đã đăng nhập web thành công
const PORTAL_SUCCESS_URL_PATTERNS = [
  'qldt.eaut.edu.vn/congthongtin/eIndex.aspx',
  'qldt.eaut.edu.vn/congthongtin/index.aspx',
  'qldt.eaut.edu.vn/congthongtin/Default.aspx',
];

// Load đầu tiên: navigate qua Logout.aspx để qldt server clear ASP.NET FormsAuth
// cookie cũ, sau đó WebView mới redirect tới Google auth URL. Nếu không có bước
// này, login.aspx?code=... sẽ thấy session cũ và bỏ qua code mới → app nhận
// nhầm token của tài khoản cũ.
const QLDT_LOGOUT_URL = 'https://qldt.eaut.edu.vn/congthongtin/Logout.aspx';

// JS inject vào MỌI page (kể cả portal sau khi đăng nhập) để vớt thông tin user.
// Quan trọng: với react-native-webview, injectedJavaScript chạy mỗi lần navigation,
// nhưng load tài nguyên async (ASP.NET AJAX) chưa có khi script chạy lần đầu.
// → Dùng MutationObserver để bắt khi DOM cập nhật.
// JS inject vào MỌI page để vớt:
//   - name/email từ DOM
//   - tokenJWT từ edu.system.tokenJWT (set bởi Config.js của portal)
//   - hoặc AXYZCLRVN() — server render trực tiếp token vào <script> portal (xem index.aspx:504)
//   - fallback: regex scan HTML cho JWT pattern (xxx.yyy.zzz)
const INJECTED_USER_PROBE = `
(function() {
  try {
    var send = function(payload) {
      try { window.ReactNativeWebView.postMessage(JSON.stringify(payload)); } catch (e) {}
    };
    var pick = function(sel) {
      try {
        var el = document.querySelector(sel);
        return el ? (el.textContent || el.value || el.getAttribute('alt') || '').trim() : '';
      } catch (e) { return ''; }
    };
    var grabToken = function() {
      // 1) Web qldt set edu.system.tokenJWT trong Config.js sau khi DOM ready
      try {
        if (window.edu && window.edu.system && window.edu.system.tokenJWT) {
          return String(window.edu.system.tokenJWT);
        }
      } catch (e) {}
      // 2) Hàm obfuscate trên trang: AXYZCLRVN = () => "<%= lblXYZCLRVN %>"
      try {
        if (typeof window.AXYZCLRVN === 'function') {
          var t = window.AXYZCLRVN();
          if (t && t.length > 10) return String(t);
        }
      } catch (e) {}
      // 3) Quét script tags / HTML để tìm pattern JWT (3 đoạn base64url ngăn bởi dấu chấm)
      try {
        var html = document.documentElement && document.documentElement.outerHTML
          ? document.documentElement.outerHTML : '';
        var m = html.match(/eyJ[A-Za-z0-9_-]{6,}\\.[A-Za-z0-9_-]{6,}\\.[A-Za-z0-9_-]{6,}/);
        if (m) return m[0];
      } catch (e) {}
      return '';
    };
    var grabAll = function() {
      var name =
        pick('#lblHoTenNguoiDangNhap') ||
        pick('#lblHoTen') ||
        pick('#ctl00_lblHoTenNguoiDangNhap') ||
        pick('#ctl00_lblHoTen') ||
        pick('#HoTen') ||
        pick('.user-name') ||
        pick('.username') ||
        pick('.fullname') ||
        pick('[id*="HoTen"]') ||
        '';
      var email =
        pick('#lblEmail') ||
        pick('#Email') ||
        pick('.user-email') ||
        pick('[id*="Email"]') ||
        '';
      if (!email) {
        var src = document.body && document.body.innerText ? document.body.innerText : '';
        var m = src.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}/);
        if (m) email = m[0];
      }
      var token = grabToken();
      return { name: name, email: email, token: token };
    };

    var first = grabAll();
    send({ type: 'user', name: first.name, email: first.email, token: first.token, source: 'initial' });

    var doneToken = !!first.token;
    var doneUser  = !!(first.name && first.email);
    if ((!doneToken || !doneUser) && window.MutationObserver) {
      var observer = new MutationObserver(function() {
        var r = grabAll();
        if (r.name || r.email || r.token) {
          send({ type: 'user', name: r.name, email: r.email, token: r.token, source: 'mutation' });
          doneToken = doneToken || !!r.token;
          doneUser  = doneUser  || !!(r.name && r.email);
          if (doneToken && doneUser) { try { observer.disconnect(); } catch (e) {} }
        }
      });
      try { observer.observe(document.body, { childList: true, subtree: true, characterData: true }); } catch (e) {}
      setTimeout(function() { try { observer.disconnect(); } catch (e) {} }, 10000);
    }

    // Polling phụ cho tokenJWT (vì Config.js có thể load async sau khi mutation observer đã disconnect)
    var tries = 0;
    var iv = setInterval(function() {
      tries++;
      var t = grabToken();
      if (t) {
        clearInterval(iv);
        send({ type: 'user', name: '', email: '', token: t, source: 'poll' });
      } else if (tries > 30) {
        clearInterval(iv);
      }
    }, 300);
  } catch (e) {
    try {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'user-err', msg: String(e) }));
    } catch (_) {}
  }
  true;
})();
`;

export const GoogleSSOWebView: React.FC<GoogleSSOWebViewProps> = ({
  visible,
  onSuccess,
  onError,
  onCancel,
}) => {
  const [authUrl, setAuthUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('Đang khởi tạo...');
  const handledRef = useRef(false);
  const userInfoRef = useRef<{ name?: string; email?: string; token?: string }>({});
  const portalReachedRef = useRef<{ url: string } | null>(null);
  const portalTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const webViewRef = useRef<WebView>(null);
  const loggedOutRef = useRef(false);

  const finishSuccess = async () => {
    if (handledRef.current) return;
    const portal = portalReachedRef.current;
    if (!portal) return;
    handledRef.current = true;
    if (portalTimeoutRef.current) {
      clearTimeout(portalTimeoutRef.current);
      portalTimeoutRef.current = null;
    }
    try {
      const info = await googleSSOService.handlePortalLogin({
        portalUrl: portal.url,
        name: userInfoRef.current.name,
        email: userInfoRef.current.email,
        tokenJWT: userInfoRef.current.token,
      });
      onSuccess(info);
    } catch (e: any) {
      setError(e.message);
      onError(e);
    }
  };

  useEffect(() => {
    if (visible) {
      handledRef.current = false;
      userInfoRef.current = {};
      portalReachedRef.current = null;
      loggedOutRef.current = false;
      if (portalTimeoutRef.current) {
        clearTimeout(portalTimeoutRef.current);
        portalTimeoutRef.current = null;
      }
      setError(null);
      setAuthUrl(null);
      initialize();
    }
    return () => {
      if (portalTimeoutRef.current) clearTimeout(portalTimeoutRef.current);
    };
  }, [visible]);

  const initialize = async () => {
    if (!validateGoogleConfig()) {
      const err = new Error('Cấu hình Google SSO không hợp lệ (.env)');
      setError(err.message);
      onError(err);
      return;
    }
    try {
      const { url } = await googleSSOService.buildAuthUrl();
      setAuthUrl(url);
      setStatus('Đang tải Google...');
      console.log('🚀 Google SSO auth URL:', url);
    } catch (e: any) {
      setError(e.message);
      onError(e);
    }
  };

  const handleNav = async (nav: WebViewNavigation) => {
    if (!nav.url || handledRef.current) return;
    const url = nav.url;

    // 1) Bắt callback từ Google → redirect tới login.aspx?code=...
    if (url.startsWith(GOOGLE_SSO_CONFIG.redirectUri)) {
      try {
        const parsed = new URL(url);
        const errCode = parsed.searchParams.get('error');
        const code = parsed.searchParams.get('code');
        const state = parsed.searchParams.get('state');

        if (errCode) {
          handledRef.current = true;
          const desc = parsed.searchParams.get('error_description') || errCode;
          throw new Error(desc);
        }
        if (code) {
          setStatus('Đã nhận code, server qldt đang xử lý...');
          if (state) {
            const ok = await googleSSOService.verifyState(state);
            if (!ok) console.warn('⚠️ State mismatch (vẫn để qldt xử lý)');
          }
          // Không chặn navigation — để WebView load tiếp login.aspx
          // login.aspx sẽ exchange code (bằng client_secret server-side),
          // set ASP.NET session cookie, redirect tới portal.
        }
      } catch (e: any) {
        setError(e.message);
        onError(e);
      }
      return;
    }

    // 2) WebView đã chạy đến trang portal (eIndex / index / Default)
    const lowered = url.toLowerCase();
    if (
      !portalReachedRef.current &&
      PORTAL_SUCCESS_URL_PATTERNS.some((p) => lowered.includes(p.toLowerCase()))
    ) {
      portalReachedRef.current = { url };
      setStatus('Đăng nhập thành công, đang đọc tokenJWT từ portal...');
      // Chờ tối đa 6s để Config.js của portal load xong và set edu.system.tokenJWT.
      // Nếu vớt được token sớm hơn, handleMessage sẽ gọi finishSuccess() ngay.
      portalTimeoutRef.current = setTimeout(() => {
        console.warn('⚠️ Hết 6s mà chưa vớt được tokenJWT — vẫn tiếp tục với marker');
        finishSuccess();
      }, 6000);
    }
  };

  const handleMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'user') {
        if (data.name) userInfoRef.current.name = data.name;
        if (data.email) userInfoRef.current.email = data.email;
        if (data.token) userInfoRef.current.token = data.token;
        console.log('📨 user probe:', {
          name: data.name,
          email: data.email,
          token: data.token ? `[${String(data.token).substring(0, 16)}...]` : '',
          source: data.source,
        });
        // Có token → kết thúc ngay (token là thứ quan trọng nhất)
        if (portalReachedRef.current && data.token) {
          finishSuccess();
          return;
        }
        // Có name/email → đợi token thêm chút (timeout vẫn fire), nhưng có thì kết thúc
        if (portalReachedRef.current && (data.name || data.email) && !userInfoRef.current.token) {
          // Không finish ngay, đợi token; timeout 2.5s sẽ tự fire nếu không có token
        }
      }
    } catch {
      // bỏ qua
    }
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onCancel}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Đăng nhập Google</Text>
          <TouchableOpacity onPress={onCancel} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>

        {error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorTitle}>❌ Lỗi</Text>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={initialize}>
              <Text style={styles.retryButtonText}>Thử lại</Text>
            </TouchableOpacity>
          </View>
        ) : authUrl ? (
          <WebView
            ref={webViewRef}
            // Bắt đầu ở Logout.aspx để xoá session qldt cũ, onLoadEnd sẽ inject
            // JS chuyển sang Google auth URL. Nếu không, login.aspx?code=... sẽ
            // thấy FormsAuth cookie cũ và bỏ qua code mới → app vớt nhầm token.
            source={{ uri: QLDT_LOGOUT_URL }}
            userAgent={SPOOFED_UA}
            onNavigationStateChange={handleNav}
            onLoadEnd={() => {
              if (!loggedOutRef.current && authUrl) {
                loggedOutRef.current = true;
                console.log('🚪 Logout.aspx loaded, chuyển sang Google auth URL');
                webViewRef.current?.injectJavaScript(
                  `window.location.replace(${JSON.stringify(authUrl)}); true;`,
                );
              }
            }}
            onMessage={handleMessage}
            injectedJavaScript={INJECTED_USER_PROBE}
            javaScriptEnabled
            domStorageEnabled
            thirdPartyCookiesEnabled
            sharedCookiesEnabled
            startInLoadingState
            originWhitelist={['*']}
            renderLoading={() => (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#DB4437" />
                <Text style={styles.loadingText}>{status}</Text>
              </View>
            )}
          />
        ) : (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#DB4437" />
            <Text style={styles.loadingText}>{status}</Text>
          </View>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#f5f5f5',
  },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#333' },
  closeButton: { padding: 8 },
  closeButtonText: { fontSize: 24, color: '#666' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 16, color: '#666' },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorTitle: { fontSize: 24, marginBottom: 12 },
  errorText: {
    fontSize: 16,
    color: '#d32f2f',
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#DB4437',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
