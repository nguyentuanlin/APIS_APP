import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { scheduleService, StudentInfo } from '../services/scheduleService';

const ProfileScreen = () => {
  const navigation = useNavigation();
  const { user } = useAuth();
  const [studentInfo, setStudentInfo] = useState<StudentInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadStudentInfo();
  }, []);

  const loadStudentInfo = async () => {
    try {
      setLoading(true);
      const info = await scheduleService.getStudentInfo();
      setStudentInfo(info);
    } catch (error) {
      console.error('Error loading student info:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadStudentInfo();
    setRefreshing(false);
  };

  const formatStudentName = () => {
    if (!studentInfo) return user?.fullname || 'Sinh viên';
    return `${studentInfo.QLSV_NGUOIHOC_HODEM} ${studentInfo.QLSV_NGUOIHOC_TEN}`;
  };

  const formatBirthDate = () => {
    if (!studentInfo?.QLSV_NGUOIHOC_NGAYSINH) return '';
    return studentInfo.QLSV_NGUOIHOC_NGAYSINH;
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <MaterialIcons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile</Text>
        <TouchableOpacity style={styles.editButton}>
          <MaterialIcons name="edit" size={24} color="#3B82F6" />
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Profile Info */}
        <View style={styles.profileCard}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#3B82F6" />
              <Text style={styles.loadingText}>Đang tải thông tin...</Text>
            </View>
          ) : (
            <>
              <View style={styles.avatarContainer}>
                {user?.avatar ? (
                  <Image source={{ uri: user.avatar }} style={styles.avatar} />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Text style={styles.avatarText}>
                      {formatStudentName().charAt(0) || 'S'}
                    </Text>
                  </View>
                )}
              </View>
              
              <Text style={styles.userName}>{formatStudentName()}</Text>
              
              {studentInfo && (
                <>
                  <Text style={styles.studentId}>
                    MSSV: {studentInfo.QLSV_NGUOIHOC_MASO}
                  </Text>
                  <Text style={styles.userRole}>
                    {studentInfo.DAOTAO_LOPQUANLY_TEN} - {studentInfo.DAOTAO_KHOAQUANLY_TEN}
                  </Text>
                  <Text style={styles.program}>
                    {studentInfo.DAOTAO_CHUONGTRINH_TEN}
                  </Text>
                  <Text style={styles.status}>
                    {studentInfo.QLSV_TRANGTHAINGUOIHOC_TEN}
                  </Text>
                </>
              )}
            </>
          )}
        </View>

        {/* Student Details */}
        {studentInfo && !loading && (
          <View style={styles.detailsContainer}>
            <Text style={styles.sectionTitle}>Thông tin chi tiết</Text>
            
            <View style={styles.detailItem}>
              <MaterialIcons name="badge" size={20} color="#6B7280" />
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Mã số sinh viên</Text>
                <Text style={styles.detailValue}>{studentInfo.QLSV_NGUOIHOC_MASO}</Text>
              </View>
            </View>

            <View style={styles.detailItem}>
              <MaterialIcons name="cake" size={20} color="#6B7280" />
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Ngày sinh</Text>
                <Text style={styles.detailValue}>{formatBirthDate()}</Text>
              </View>
            </View>

            <View style={styles.detailItem}>
              <MaterialIcons name="wc" size={20} color="#6B7280" />
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Giới tính</Text>
                <Text style={styles.detailValue}>{studentInfo.QLSV_NGUOIHOC_GIOITINH}</Text>
              </View>
            </View>

            <View style={styles.detailItem}>
              <MaterialIcons name="location-on" size={20} color="#6B7280" />
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Nơi sinh</Text>
                <Text style={styles.detailValue}>{studentInfo.TTLL_KHICANBAOTINCHOAI_ODAU}</Text>
              </View>
            </View>

            <View style={styles.detailItem}>
              <MaterialIcons name="school" size={20} color="#6B7280" />
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Lớp</Text>
                <Text style={styles.detailValue}>{studentInfo.DAOTAO_LOPQUANLY_TEN}</Text>
              </View>
            </View>

            <View style={styles.detailItem}>
              <MaterialIcons name="business" size={20} color="#6B7280" />
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Khoa</Text>
                <Text style={styles.detailValue}>{studentInfo.DAOTAO_KHOAQUANLY_TEN}</Text>
              </View>
            </View>

            <View style={styles.detailItem}>
              <MaterialIcons name="menu-book" size={20} color="#6B7280" />
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Chương trình đào tạo</Text>
                <Text style={styles.detailValue}>{studentInfo.DAOTAO_CHUONGTRINH_TEN}</Text>
              </View>
            </View>

            <View style={styles.detailItem}>
              <MaterialIcons name="timeline" size={20} color="#6B7280" />
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Khóa đào tạo</Text>
                <Text style={styles.detailValue}>{studentInfo.DAOTAO_KHOADAOTAO_TEN}</Text>
              </View>
            </View>

            <View style={styles.detailItem}>
              <MaterialIcons name="info" size={20} color="#6B7280" />
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Hệ đào tạo</Text>
                <Text style={styles.detailValue}>{studentInfo.DAOTAO_HEDAOTAO_TEN}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Profile Options */}
        <View style={styles.optionsContainer}>
          <TouchableOpacity 
            style={styles.optionItem}
            onPress={() => {
              // Có thể navigate đến màn hình chi tiết hoặc hiển thị modal
              // console.log('Thông tin cá nhân clicked');
            }}
          >
            <MaterialIcons name="person" size={24} color="#6B7280" />
            <Text style={styles.optionText}>Thông tin cá nhân</Text>
            <MaterialIcons name="chevron-right" size={24} color="#9CA3AF" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.optionItem}>
            <MaterialIcons name="security" size={24} color="#6B7280" />
            <Text style={styles.optionText}>Bảo mật</Text>
            <MaterialIcons name="chevron-right" size={24} color="#9CA3AF" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.optionItem}>
            <MaterialIcons name="notifications" size={24} color="#6B7280" />
            <Text style={styles.optionText}>Thông báo</Text>
            <MaterialIcons name="chevron-right" size={24} color="#9CA3AF" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.optionItem}>
            <MaterialIcons name="language" size={24} color="#6B7280" />
            <Text style={styles.optionText}>Ngôn ngữ</Text>
            <MaterialIcons name="chevron-right" size={24} color="#9CA3AF" />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.optionItem}
            onPress={async () => {
              // console.log('🧪 Testing Student Info API...');
              try {
                const info = await scheduleService.getStudentInfo();
                // console.log('✅ Student Info:', info);
              } catch (error) {
                console.error('❌ Error:', error);
              }
            }}
          >
            <MaterialIcons name="refresh" size={24} color="#3B82F6" />
            <Text style={[styles.optionText, { color: '#3B82F6' }]}>Làm mới thông tin</Text>
            <MaterialIcons name="chevron-right" size={24} color="#3B82F6" />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  editButton: {
    padding: 8,
  },
  content: {
    flex: 1,
  },
  profileCard: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  avatarContainer: {
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#6B7280',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
    textAlign: 'center',
  },
  userRole: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 8,
    textAlign: 'center',
  },
  userEmail: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  studentId: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3B82F6',
    marginBottom: 4,
    textAlign: 'center',
  },
  program: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
    textAlign: 'center',
  },
  status: {
    fontSize: 14,
    color: '#10B981',
    fontWeight: '500',
    marginBottom: 8,
    textAlign: 'center',
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 12,
  },
  detailsContainer: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 16,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  detailContent: {
    flex: 1,
    marginLeft: 12,
  },
  detailLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 16,
    color: '#1F2937',
    fontWeight: '500',
  },
  optionsContainer: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  optionText: {
    flex: 1,
    fontSize: 16,
    color: '#1F2937',
    marginLeft: 12,
  },
});

export default ProfileScreen;