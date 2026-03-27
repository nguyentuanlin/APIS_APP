# Trạng thái Chuyên Cần (Attendance Status)

## Các trạng thái được hỗ trợ

### 1. Có mặt (Present) ✅
- **Màu sắc**: Xanh lá (#10B981)
- **Icon**: check-circle
- **Điều kiện**: Text chứa "có mặt" hoặc "present"
- **Ví dụ**: "Có mặt(2)", "Có mặt"

### 2. Vắng mặt có phép (Excused Absence) ⚠️
- **Màu sắc**: Cam (#F59E0B)
- **Icon**: event-busy
- **Điều kiện**: Text chứa "vắng" VÀ ("có phép" hoặc "phép")
- **Ví dụ**: "Vắng mặt có phép", "Vắng có phép"

### 3. Vắng mặt (Absent) ❌
- **Màu sắc**: Đỏ (#EF4444)
- **Icon**: cancel
- **Điều kiện**: Text chứa "vắng" hoặc "absent"
- **Ví dụ**: "Vắng mặt", "Vắng mặt không phép"

### 4. Đi muộn (Late) ⏰
- **Màu sắc**: Cam (#F59E0B)
- **Icon**: schedule
- **Điều kiện**: Text chứa "muộn" hoặc "late"
- **Ví dụ**: "Đi muộn", "Late"

### 5. Chưa điểm danh (Unknown) ❓
- **Màu sắc**: Xám (#9CA3AF)
- **Icon**: help-outline
- **Điều kiện**: Không có thông tin chuyên cần (null)

### 6. Khác (Other) ℹ️
- **Màu sắc**: Xám đậm (#6B7280)
- **Icon**: info
- **Điều kiện**: Các trường hợp không khớp với các điều kiện trên

## Hiển thị trong ứng dụng

### Trong danh sách lịch học (StudyScheduleScreen)
- Badge tròn nhỏ ở góc dưới bên phải của mỗi schedule block
- Hiển thị icon tương ứng với trạng thái

### Trong modal chi tiết (StudyScheduleScreen)
- Hiển thị đầy đủ text và icon
- Nằm dưới thông tin thời gian

### Trong màn hình chính (HomeScreen)
- Badge tròn nhỏ ở góc dưới bên phải của schedule card
- Chỉ hiển thị icon

## Cách sử dụng trong code

```typescript
import { scheduleService } from '../services/scheduleService';

// Lấy thông tin trạng thái chuyên cần
const attendanceStatus = scheduleService.getAttendanceStatus(schedule.THONGTINCHUYENCAN);

// Sử dụng
console.log(attendanceStatus.type);   // 'present' | 'absent' | 'late' | 'excused' | 'unknown'
console.log(attendanceStatus.label);  // Text hiển thị
console.log(attendanceStatus.color);  // Mã màu hex
console.log(attendanceStatus.icon);   // Tên icon MaterialIcons
```

## Thứ tự ưu tiên kiểm tra

1. Có mặt (present)
2. Vắng mặt có phép (excused)
3. Vắng mặt (absent)
4. Đi muộn (late)
5. Khác (unknown/other)

**Lưu ý**: Kiểm tra theo thứ tự từ trên xuống, trường hợp đầu tiên khớp sẽ được áp dụng.
