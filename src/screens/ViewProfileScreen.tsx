import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { Text } from 'react-native';
import profileService, { ProfileInfo } from '../services/profileService';

const ViewProfileScreen = () => {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState<ProfileInfo | null>(null);
  const [activeTab, setActiveTab] = useState<'group' | 'info' | 'required' | 'confirm'>('group');

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const data = await profileService.getProfileInfo();
      setProfileData(data);
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient colors={['#3B82F6', '#1E40AF']} style={styles.gradient}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Xem hồ sơ</Text>
            <View style={styles.backButton} />
          </View>
        </LinearGradient>

        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Đang tải thông tin...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!profileData) {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient colors={['#3B82F6', '#1E40AF']} style={styles.gradient}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Xem hồ sơ</Text>
            <View style={styles.backButton} />
          </View>
        </LinearGradient>

        <View style={styles.emptyContainer}>
          <MaterialIcons name="error-outline" size={64} color="#D1D5DB" />
          <Text style={styles.emptyText}>Không thể tải thông tin hồ sơ</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#3B82F6', '#1E40AF']} style={styles.gradient}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Xem hồ sơ</Text>
          <View style={styles.backButton} />
        </View>
      </LinearGradient>

      <View style={styles.breadcrumb}>
        <Text style={styles.breadcrumbText}>Profile</Text>
        <MaterialIcons name="chevron-right" size={16} color="#6B7280" />
        <Text style={styles.breadcrumbTextActive}>Xem hồ sơ</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.mainCard}>
          <Text style={styles.sectionTitle}>Thông tin cá nhân</Text>

          <View style={styles.profileHeader}>
            {/* Avatar */}
            <View style={styles.avatarSection}>
              <View style={styles.avatarContainer}>
                {profileData.ANH ? (
                  <Image source={{ uri: profileData.ANH }} style={styles.avatar} />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <MaterialIcons name="person" size={48} color="#9CA3AF" />
                  </View>
                )}
                <TouchableOpacity style={styles.cameraButton}>
                  <MaterialIcons name="camera-alt" size={16} color="#FFFFFF" />
                </TouchableOpacity>
              </View>

              <View style={styles.basicInfo}>
                <InfoField label="Họ và tên" value={`${profileData.HODEM} ${profileData.TEN}`} />
                <InfoField label="Ngày sinh" value={profileData.QLSV_NGUOIHOC_NGAYSINH} />
                <InfoField label="CMND/CCCD" value={profileData.CMTND_SO} />
                <InfoField label="Mã sinh viên" value={profileData.MASO} />
                <InfoField label="Ngành học" value={profileData.NGANH} />
                <InfoField label="Lớp quản lý" value={profileData.LOP} />
                <View style={styles.statusContainer}>
                  <Text style={styles.statusLabel}>Chương trình:</Text>
                  <View style={styles.statusBadge}>
                    <Text style={styles.statusText}>Có nhận học bổng ?</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Tabs */}
            <View style={styles.tabs}>
              <TouchableOpacity
                style={[styles.tab, activeTab === 'group' && styles.tabActive]}
                onPress={() => setActiveTab('group')}
              >
                <Text style={[styles.tabText, activeTab === 'group' && styles.tabTextActive]}>
                  Nhóm
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.tab, activeTab === 'info' && styles.tabActive]}
                onPress={() => setActiveTab('info')}
              >
                <Text style={[styles.tabText, activeTab === 'info' && styles.tabTextActive]}>
                  Tên thông tin
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.tab, activeTab === 'required' && styles.tabActive]}
                onPress={() => setActiveTab('required')}
              >
                <Text style={[styles.tabText, activeTab === 'required' && styles.tabTextActive]}>
                  Dữ liệu cần nhập
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.tab, activeTab === 'confirm' && styles.tabActive]}
                onPress={() => setActiveTab('confirm')}
              >
                <Text style={[styles.tabText, activeTab === 'confirm' && styles.tabTextActive]}>
                  Xác nhận từ trường
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Form Fields */}
          <View style={styles.formSection}>
            <FormGroup title="Thông tin liên lạc (đồng đề gửi các thông tin từ nhà Trường)">
              <InputField label="Điện thoại cá nhân" value={profileData.TTLL_DIENTHOAICANHAN} />
              <InputField label="Hộ khẩu thường trú - tỉnh thành" value={profileData.HOKHAU_TINHTHANH_TEN} />
              <InputField label="Hộ khẩu thường trú - quận huyện" value={profileData.HOKHAU_QUANHUYEN_TEN} />
              <InputField label="Hộ khẩu thường trú - phường xã" value={profileData.HOKHAU_PHUONGXAKHOIXOM} />
            </FormGroup>

            <FormGroup title="Thông tin cá nhân">
              <InputField label="Dân tộc" value={profileData.DANTOC_TEN} />
              <InputField label="Tôn giáo" value={profileData.TONGIAO_TEN} />
              <InputField label="Thành phần xuất thân" value={profileData.THANHPHANGIADINH_TEN} />
              <InputField label="Khu vực" value="" />
              <InputField label="Đối tượng ưu tiên" value="" />
              <InputField label="Kỳ hiệu trường" value="" />
            </FormGroup>

            <FormGroup title="Thông tin học tập">
              <InputField label="Số báo danh dự thi (nghiệp THPT" value="" />
              <InputField label="Kết quả tốt nghiệp cuối cấp 3 THPT hoặc THPT" value="" />
              <InputField label="Xếp loại tốt nghiệp" value="" />
              <InputField label="Xếp loại về hạnh kiểm" value="" />
              <InputField label="Xếp loại về tổ chức nghiệp" value="" />
            </FormGroup>

            <FormGroup title="Thông tin học tập">
              <InputField label="Ngày vào Đảng CSVN" value={profileData.DANGDOAN_NGAYVAODANG} />
              <InputField label="Ngày vào đoàn" value={profileData.DANGDOAN_NGAYVAODOAN} />
            </FormGroup>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const InfoField = ({ label, value }: { label: string; value: string | null }) => (
  <View style={styles.infoField}>
    <Text style={styles.infoFieldLabel}>{label}:</Text>
    <Text style={styles.infoFieldValue}>{value || '--'}</Text>
  </View>
);

const InputField = ({ label, value }: { label: string; value: string | null | undefined }) => (
  <View style={styles.inputGroup}>
    <Text style={styles.inputLabel}>{label}</Text>
    <TextInput
      style={styles.input}
      value={value || ''}
      placeholder="Giá trị liên hệ"
      placeholderTextColor="#9CA3AF"
    />
  </View>
);

const FormGroup = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <View style={styles.formGroup}>
    <Text style={styles.formGroupTitle}>{title}</Text>
    {children}
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  gradient: {
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  breadcrumb: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  breadcrumbText: {
    fontSize: 13,
    color: '#6B7280',
  },
  breadcrumbTextActive: {
    fontSize: 13,
    color: '#3B82F6',
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
  content: {
    flex: 1,
  },
  mainCard: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 16,
  },
  profileHeader: {
    marginBottom: 24,
  },
  avatarSection: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 8,
    backgroundColor: '#E5E7EB',
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 8,
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraButton: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  basicInfo: {
    flex: 1,
  },
  infoField: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  infoFieldLabel: {
    fontSize: 13,
    color: '#6B7280',
    width: 100,
  },
  infoFieldValue: {
    flex: 1,
    fontSize: 13,
    color: '#111827',
    fontWeight: '500',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  statusLabel: {
    fontSize: 13,
    color: '#6B7280',
    marginRight: 8,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: '#DBEAFE',
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1E40AF',
  },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    marginTop: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#3B82F6',
  },
  tabText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  tabTextActive: {
    color: '#3B82F6',
    fontWeight: '600',
  },
  formSection: {
    marginTop: 24,
  },
  formGroup: {
    marginBottom: 24,
  },
  formGroupTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111827',
    backgroundColor: '#FFFFFF',
  },
});

export default ViewProfileScreen;
