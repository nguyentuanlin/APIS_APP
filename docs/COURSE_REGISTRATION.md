# Hướng dẫn sử dụng chức năng Đăng ký học phần

## Tổng quan
Chức năng đăng ký học phần cho phép sinh viên:
- Xem danh sách kế hoạch đăng ký học
- Tìm kiếm và xem chi tiết các học phần có thể đăng ký
- Đăng ký/hủy đăng ký lớp học phần
- Theo dõi trạng thái đăng ký và tổng tín chỉ

## Cấu trúc Files

### Services
- `courseRegistrationService.ts`: Xử lý tất cả API calls liên quan đến đăng ký học phần
  - Lấy danh sách kế hoạch đăng ký
  - Lấy học phần có thể đăng ký
  - Lấy chi tiết lớp học phần
  - Đăng ký/hủy đăng ký học phần

### Screens
- `CourseRegistrationScreen.tsx`: Màn hình chính cho đăng ký học phần
  - Hiển thị danh sách kế hoạch đăng ký
  - Hiển thị học phần theo kế hoạch được chọn
  - Expand/collapse để xem chi tiết học phần

### Components
- `CourseClassModal.tsx`: Modal hiển thị chi tiết lớp học phần
  - Thông tin chi tiết về lớp (thời gian, giảng viên, học phí)
  - Trạng thái đăng ký và sĩ số
  - Nút đăng ký/hủy đăng ký

- `RegistrationSummary.tsx`: Component tổng quan trạng thái đăng ký
  - Số học phần đã đăng ký
  - Tổng tín chỉ
  - Danh sách học phần đã đăng ký

## API Endpoints

### 1. Lấy kế hoạch đăng ký học
```
POST https://iu.cmcu.edu.vn/xulyhocvuapi/api/NS_DKH_CHUNG2_MH/{encryptionKey}
Function: pkg_dangkyhoc_chung2.LayDSKeHoachDangKyHoc
```

### 2. Lấy học phần đang tổ chức
```
POST https://iu.cmcu.edu.vn/xulyhocvuapi/api/XLHV_DKH_CHUNG3_MH/{encryptionKey}
Function: pkg_dangkyhoc_chung3.LayDSHocPhanDangToChuc
```

### 3. Lấy lớp học phần
```
POST https://iu.cmcu.edu.vn/totnghiepapi/api/TN_DKH_CHUNG4_MH/{encryptionKey}
Function: pkg_dangkyhoc_chung4.LayDSLopHocPhanDangToChuc
```

### 4. Lấy thứ học theo học phần
```
POST https://iu.cmcu.edu.vn/xulyhocvuapi/api/XLHV_DKH_CHUNG6_MH/{encryptionKey}
Function: PKG_DANGKYHOC_CHUNG6.LayThuHocTheoHocPhan
```

### 5. Lấy giảng viên theo học phần
```
POST https://iu.cmcu.edu.vn/xulyhocvuapi/api/XLHV_DKH_CHUNG6_MH/{encryptionKey}
Function: PKG_DANGKYHOC_CHUNG6.LayGiangVienTheoHocPhan
```

## Cách sử dụng

### 1. Truy cập chức năng
- Từ màn hình Home, chọn "Đăng ký trực tuyến"
- Chọn "Đăng ký học phần" từ menu

### 2. Chọn kế hoạch đăng ký
- Xem danh sách các kế hoạch đăng ký có sẵn
- Chọn kế hoạch muốn đăng ký (thường là kế hoạch đang mở)

### 3. Xem và đăng ký học phần
- Xem danh sách học phần có thể đăng ký
- Tap vào học phần để xem chi tiết (thứ học, giảng viên, lớp học phần)
- Tap vào lớp học phần để xem chi tiết đầy đủ
- Nhấn "Đăng ký" để đăng ký lớp

### 4. Theo dõi trạng thái
- Xem tổng quan đăng ký ở đầu màn hình
- Các học phần đã đăng ký sẽ có badge "Đã đăng ký"

## Lưu ý kỹ thuật

### Encryption
- Tất cả API calls đều sử dụng encryption với các key khác nhau
- Data được encrypt trước khi gửi và decrypt khi nhận về

### Error Handling
- Service có xử lý lỗi và throw exception với message phù hợp
- UI hiển thị loading state và error alerts

### Performance
- Sử dụng Promise.all để load parallel data (thứ học, giảng viên)
- Lazy loading chi tiết học phần khi user expand
- RefreshControl để reload data

### State Management
- Local state management với useState
- Automatic reload sau khi đăng ký thành công

## Mở rộng tương lai

### 1. Thêm tính năng
- Tìm kiếm học phần theo tên/mã
- Filter theo thứ học, giảng viên
- Lưu danh sách yêu thích
- Thông báo khi có slot trống

### 2. Cải thiện UX
- Skeleton loading
- Offline support
- Push notifications
- Calendar integration

### 3. API mở rộng
- Endpoint đăng ký/hủy đăng ký thực tế
- Lấy lịch sử đăng ký
- Kiểm tra điều kiện tiên quyết
- Tính toán học phí tự động