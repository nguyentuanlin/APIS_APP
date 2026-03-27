import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { Text } from 'react-native';
import profileService, { ProfileInfo } from '../services/profileService';

const ProfileDetailScreen = () => {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState<ProfileInfo | null>(null);
  const [activeTab, setActiveTab] = useState<'info' | 'contact' | 'additional'>('info');

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
            <Text style={styles.headerTitle}>Khai báo Hồ sơ nhập học</Text>
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
            <Text style={styles.headerTitle}>Khai báo Hồ sơ nhập học</Text>
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
          <Text style={styles.headerTitle}>Khai báo Hồ sơ nhập học</Text>
          <View style={styles.backButton} />
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Avatar Section */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarContainer}>
            {profileData.ANH ? (
              <Image source={{ uri: profileData.ANH }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <MaterialIcons name="person" size={64} color="#9CA3AF" />
              </View>
            )}
            <TouchableOpacity style={styles.cameraButton}>
              <MaterialIcons name="camera-alt" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <Text style={styles.fullName}>
            {profileData.HODEM} {profileData.TEN}
          </Text>
          <Text style={styles.studentId}>Ngày sinh: {profileData.QLSV_NGUOIHOC_NGAYSINH}</Text>
          <Text style={styles.studentId}>CMND/CCCD: {profileData.CMTND_SO}</Text>
          <Text style={styles.studentId}>Mã sinh viên: {profileData.MASO}</Text>
          <Text style={styles.studentId}>Ngành học: {profileData.NGANH}</Text>
          <Text style={styles.studentId}>Lớp quản lý: {profileData.LOP}</Text>
          
          <View style={styles.statusBadge}>
            <Text style={styles.statusText}>{profileData.QLSV_NGUOIHOC_TRANGTHAI}</Text>
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'info' && styles.tabActive]}
            onPress={() => setActiveTab('info')}
          >
            <Text style={[styles.tabText, activeTab === 'info' && styles.tabTextActive]}>
              Thông tin cá nhân
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === 'contact' && styles.tabActive]}
            onPress={() => setActiveTab('contact')}
          >
            <Text style={[styles.tabText, activeTab === 'contact' && styles.tabTextActive]}>
              Liên hệ
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === 'additional' && styles.tabActive]}
            onPress={() => setActiveTab('additional')}
          >
            <Text style={[styles.tabText, activeTab === 'additional' && styles.tabTextActive]}>
              Bổ sung
            </Text>
          </TouchableOpacity>
        </View>

        {/* Content based on active tab */}
        <View style={styles.tabContent}>
          {activeTab === 'info' && (
            <View style={styles.section}>
              <InfoRow label="Họ và tên" value={`${profileData.HODEM} ${profileData.TEN}`} />
              <InfoRow label="Ngày sinh" value={profileData.QLSV_NGUOIHOC_NGAYSINH} />
              <InfoRow label="CMND/CCCD" value={profileData.CMTND_SO} />
              <InfoRow label="Giới tính" value={profileData.GIOITINH_TEN || '-- Không tìm thấy dữ'} />
              <InfoRow label="Dân tộc" value={profileData.DANTOC_TEN || '-- Không tìm thấy dữ'} />
              <InfoRow label="Tôn giáo" value={profileData.TONGIAO_TEN || '-- Không tìm thấy dữ'} />
              <InfoRow label="Quốc tịch" value={profileData.QUOCTICH_TEN || '-- Không tìm thấy dữ'} />
              <InfoRow label="Mã sinh viên" value={profileData.MASO} />
              <InfoRow label="Ngành học" value={profileData.NGANH} />
              <InfoRow label="Lớp quản lý" value={profileData.LOP} />
              <InfoRow label="Khóa" value={profileData.KHOADAOTAO} />
              <InfoRow label="Khoa quản lý" value={profileData.KHOAQUANLY} />
              <InfoRow label="Hệ đào tạo" value={profileData.HEDAOTAO} />
              <InfoRow label="Kế hoạch" value="-- Không tìm thấy dữ" />
            </View>
          )}

          {activeTab === 'contact' && (
            <View style={styles.section}>
              <InfoRow label="Điện thoại cá nhân" value={profileData.TTLL_DIENTHOAICANHAN || '-- Không tìm thấy dữ'} />
              <InfoRow label="Điện thoại gia đình" value={profileData.TTLL_DIENTHOAIGIADINH || '-- Không tìm thấy dữ'} />
              <InfoRow label="Email cá nhân" value={profileData.TTLL_EMAILCANHAN || '-- Không tìm thấy dữ'} />
              <InfoRow label="Địa chỉ cơ quan" value={profileData.DIACHICOQUANCONGTAC || '-- Không tìm thấy dữ'} />
              <InfoRow label="Nơi ở hiện nay" value={profileData.NOIOHIENNAY || '-- Không tìm thấy dữ'} />
              <InfoRow label="Hộ khẩu" value={profileData.HOKHAU_PHUONGXAKHOIXOM || '-- Không tìm thấy dữ'} />
            </View>
          )}

          {activeTab === 'additional' && (
            <View style={styles.section}>
              <InfoRow label="Trường PTTH" value={profileData.TRUONG_PTTH || '-- Không tìm thấy dữ'} />
              <InfoRow label="Thành phần gia đình" value={profileData.THANHPHANGIADINH_TEN || '-- Không tìm thấy dữ'} />
              <InfoRow label="Ngày vào đoàn" value={profileData.DANGDOAN_NGAYVAODOAN || '-- Không tìm thấy dữ'} />
              <InfoRow label="Ngày vào đảng" value={profileData.DANGDOAN_NGAYVAODANG || '-- Không tìm thấy dữ'} />
              <InfoRow label="Link Facebook" value={profileData.LINKFACEBOOK || '-- Không tìm thấy dữ'} />
            </View>
          )}
        </View>

        {/* Save Button */}
        <TouchableOpacity style={styles.saveButton}>
          <MaterialIcons name="save" size={20} color="#FFFFFF" />
          <Text style={styles.saveButtonText}>Lưu thông tin</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const InfoRow = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.infoRow}>
    <Text style={styles.infoLabel}>{label}:</Text>
    <Text style={styles.infoValue}>{value}</Text>
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
  avatarSection: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 32,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#E5E7EB',
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  fullName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  studentId: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 2,
  },
  statusBadge: {
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: '#DBEAFE',
    borderRadius: 16,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1E40AF',
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#3B82F6',
  },
  tabText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  tabTextActive: {
    color: '#3B82F6',
    fontWeight: '600',
  },
  tabContent: {
    backgroundColor: '#FFFFFF',
    marginTop: 1,
  },
  section: {
    padding: 16,
  },
  infoRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  infoLabel: {
    fontSize: 14,
    color: '#6B7280',
    width: 140,
  },
  infoValue: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
    fontWeight: '500',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F59E0B',
    marginHorizontal: 16,
    marginVertical: 24,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default ProfileDetailScreen;
