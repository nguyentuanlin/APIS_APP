# Tính năng Tin tức (News Feature)

## Tổng quan
Tính năng tin tức cho phép sinh viên xem các thông báo, tin tức từ nhà trường và các đơn vị.

## Cấu trúc

### 1. Service Layer (`newsService.ts`)

**Chức năng chính:**
- Lấy danh sách tin tức từ API
- Lấy danh sách đơn vị cung cấp nguồn (categories)
- Lấy chi tiết tin tức
- Lọc tin tiêu điểm
- Cache dữ liệu (10 phút)

**API Endpoints:**

#### Lấy danh sách tin tức
```
POST https://iu.cmcu.edu.vn/quanlytuyensinhapi/api/TS_TinTuc_MH/DSA4BRIVKC8VNCIeAyAvJhUoLx4PJjQuKAU0LyYP

Request Body (encrypted):
{
  func: 'pkg_tintuc.LayDSTinTuc_BangTin_NguoiDung',
  iM: 'AzzSystem',
  strChucNang_Id: '15346B6F33834D7897591527289DB0F8',
  strNguoiThucHien_Id: userId,
  strChung_UngDung_Id: '80CF9E16C2D74F46A1ECE73B7C119A8F',
  strTuKhoa: '',
  strTuNgay: '',
  strDenNgay: '',
  strChuyenMuc_Id: '',
  strDaoTao_CoCauToChuc_Id: '',
  dTinQuanTrong: -1,
  dHieuLuc: 1,
  pageIndex: 1,
  pageSize: 10000
}
```

#### Lấy danh sách đơn vị
```
POST https://iu.cmcu.edu.vn/quanlytuyensinhapi/api/TS_TinTuc_MH/DSA4BRIFLi8XKAI0LyYCIDEPJjQuLwPP

Request Body (encrypted):
{
  func: 'pkg_tintuc.LayDSDonViCungCapNguon',
  iM: 'AzzSystem',
  strChucNang_Id: '15346B6F33834D7897591527289DB0F8',
  strNguoiThucHien_Id: userId,
  strQLSV_NguoiHoc_Id: userId
}
```

**Mã hóa:**
- Sử dụng `AE()` để mã hóa request body
- Sử dụng `AD()` để giải mã response
- Key mã hóa: endpoint path hoặc 'AzzSystem'

### 2. Data Models

#### NewsItem
```typescript
{
  ID: string;
  TIEUDE: string;                    // Tiêu đề
  MOTA: string | null;               // Mô tả ngắn
  NOIDUNG: string;                   // Nội dung HTML
  NGAYTAO: string;                   // "20240916133711"
  NGAYTAO_DD_MM_YYYY: string;        // "16/09/2024"
  NGUOITAO_TENDAYDU: string;         // Tên người tạo
  DAOTAO_COCAUTOCHUC_TEN: string;    // Tên đơn vị
  DUONGDANANHHIENTHI: string | null; // Đường dẫn ảnh
  HIEULUC: number;                   // 1: Hiệu lực
  TIEUDIEM: number;                  // 1: Tin tiêu điểm
}
```

#### NewsCategory
```typescript
{
  ID: string;
  TEN: string;  // Tên đơn vị
}
```

### 3. UI Components

#### NewsScreen
**Các phần chính:**
1. Header với nút back
2. Search bar - Tìm kiếm theo tiêu đề, nội dung
3. Category filter - Lọc theo đơn vị
4. News list - Danh sách tin tức
5. Detail modal - Chi tiết tin tức

**Tính năng:**
- ✅ Tìm kiếm tin tức
- ✅ Lọc theo đơn vị
- ✅ Hiển thị tin tiêu điểm (badge vàng)
- ✅ Pull to refresh
- ✅ Xem chi tiết tin tức
- ✅ Hiển thị ảnh đại diện
- ✅ Hiển thị thời gian tương đối ("2 ngày trước")
- ✅ Cache 10 phút

### 4. Caching Strategy

**2-tier caching:**
1. Memory cache (nhanh nhất)
2. AsyncStorage cache (persistent)

**Cache duration:** 10 phút

**Cache keys:**
- `cached_news_list`: Danh sách tin tức
- `cached_news_categories`: Danh sách đơn vị

**Clear cache:**
- Khi logout
- Khi gọi `newsService.clearCache()`

### 5. Navigation

**Entry points:**
1. Từ Sidebar: Menu "Tin tức"
2. Từ HomeScreen: Nút "Tin tức" trong top actions

**Flow:**
```
Sidebar/HomeScreen
  ↓
NewsScreen (danh sách)
  ↓
Detail Modal (chi tiết)
```

## Sử dụng trong code

### Lấy danh sách tin tức
```typescript
import { newsService } from '../services/newsService';

// Lấy tất cả tin tức
const newsList = await newsService.getNewsList();

// Lấy tin tức với filter
const filteredNews = await newsService.getNewsList({
  keyword: 'học phí',
  departmentId: 'FC11F99A41C34643BC1BEFB00BD2E3BA',
  isImportant: 1,
  pageIndex: 1,
  pageSize: 20
});

// Lấy tin tiêu điểm
const featuredNews = await newsService.getFeaturedNews();
```

### Lấy danh sách đơn vị
```typescript
const categories = await newsService.getNewsCategories();
```

### Lấy chi tiết tin tức
```typescript
const newsDetail = await newsService.getNewsDetail(newsId);
```

### Format utilities
```typescript
// Format ngày
const formattedDate = newsService.formatDate('20240916133711');
// Output: "16/09/2024"

// Thời gian tương đối
const relativeTime = newsService.getRelativeTime('16/09/2024');
// Output: "2 ngày trước"

// URL ảnh đầy đủ
const imageUrl = newsService.getImageUrl('ApisTinTuc/Avatar/image.jpg');
// Output: "https://iu.cmcu.edu.vn/ApisTinTuc/Avatar/image.jpg"
```

## Các đơn vị cung cấp tin

1. **Ban Tuyển sinh, Marketing & Truyền thông**
   - ID: `FBFCBE46A4E74D76A20A1D251625E1AA`

2. **Phòng Công tác sinh viên**
   - ID: `5490C155FA8F435CA5C6ACFD4B7CDF7F`

3. **Phòng Đảm bảo chất lượng**
   - ID: `FC11F99A41C34643BC1BEFB00BD2E3BA`

4. **Phòng Đào tạo**
   - ID: `E30395533085489B92BE2777C9DC43FB`

## Xử lý lỗi

```typescript
try {
  const news = await newsService.getNewsList();
} catch (error) {
  if (error.message.includes('Token')) {
    // Xử lý lỗi authentication
  } else if (error.message.includes('HTTP error')) {
    // Xử lý lỗi network
  } else {
    // Xử lý lỗi khác
  }
}
```

## Performance Tips

1. **Sử dụng cache:** Không cần gọi API liên tục, cache tự động 10 phút
2. **Pagination:** Sử dụng pageIndex và pageSize khi có nhiều tin
3. **Filter trước khi render:** Lọc dữ liệu ở client side để giảm API calls
4. **Lazy load images:** Ảnh chỉ load khi cần thiết

## TODO / Future Improvements

- [ ] Thêm notification cho tin tức mới
- [ ] Đánh dấu đã đọc/chưa đọc
- [ ] Lưu tin tức yêu thích
- [ ] Chia sẻ tin tức
- [ ] Rich text editor cho nội dung HTML
- [ ] Infinite scroll pagination
- [ ] Offline mode với cache lâu hơn
- [ ] Push notification cho tin quan trọng
