# Push Notification (Firebase Cloud Messaging) – Mobile

Cấu hình FCM cho app `com.tlu.studentportal` dùng chung Firebase project với web (`iu-notification-7cf54`).

## 1. Tạo app trong Firebase Console

Vào project **iu-notification-7cf54** → Project settings → **Your apps** → Add app:

### Android
- Package name: `com.tlu.studentportal` (khớp `app.json > android.package`)
- Tải `google-services.json` → đặt tại `APIS_APP/google-services.json`

### iOS
- Bundle ID: `com.tlu.studentportal` (khớp `app.json > ios.bundleIdentifier`)
- Tải `GoogleService-Info.plist` → đặt tại `APIS_APP/GoogleService-Info.plist`
- Vào **Cloud Messaging** tab → upload **APNs Authentication Key** (tạo từ Apple Developer → Keys, scope APNs).

> Hai file này KHÔNG commit vào git (đã thêm vào `.gitignore` nếu repo có).

## 2. Build lại app

Không chạy được trên Expo Go vì cần native module Firebase. Phải dùng dev client / EAS Build:

```bash
# Build dev client mới
eas build --profile development --platform android
eas build --profile development --platform ios

# Hoặc prebuild + chạy native trực tiếp
npx expo prebuild --clean
npx expo run:android
npx expo run:ios
```

## 3. Backend đã có sẵn

Web đang dùng 2 stored procedure dưới Oracle:
- `pkg_thongbao.ThemMoi_USER_FCM` (insert)
- `pkg_thongbao.Update_USER_FCM` (update / xóa khi logout)

Mobile gọi cùng endpoint, chỉ thêm tham số `strPLATFORM` ∈ `{android, ios, web}`. Nếu backend chưa
nhận tham số này thì bỏ qua, Oracle sẽ ignore extra field.

## 4. Test gửi noti

Từ Firebase Console → Engage → Messaging → Send test message → dán FCM token.

Lấy token đang dùng trong app:
```ts
import { fcmService } from './src/services/fcmService';
console.log(await fcmService.getToken());
```

Hoặc gửi từ server:
```http
POST https://fcm.googleapis.com/v1/projects/iu-notification-7cf54/messages:send
Authorization: Bearer <oauth2_access_token>
{
  "message": {
    "token": "<device_fcm_token>",
    "notification": { "title": "Thông báo IU", "body": "Bạn có lịch học mới" },
    "data": { "screen": "StudySchedule" }
  }
}
```

## 5. Flow trong app

- Sau khi `AuthContext` set `user`, [App.tsx](../App.tsx) gọi `fcmService.init(user)`.
- Xin quyền → lấy FCM token (`getDevicePushTokenAsync`) → encrypt + POST tới
  `CMS_ThongBao_MH/FSkkLAwuKB4UEgQTHgcCDAPP` (insert) hoặc `.../FDElIDUkHhQSBBMeBwIM` (update).
- Khi logout: `fcmService.cleanupOnLogout(user)` xoá token trên server và local cache.
- Cache `FCM_TOKEN_LAST` để không spam server mỗi lần mở app.
