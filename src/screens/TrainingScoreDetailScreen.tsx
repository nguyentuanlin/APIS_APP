import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Alert,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Text } from 'react-native';
import confirmationService, { KeHoachItem, FileItem } from '../services/trainingScoreService';

const { width: screenWidth } = Dimensions.get('window');

const ConfirmationDetailScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { keHoach } = route.params as { keHoach: KeHoachItem };
  
  const [loading, setLoading] = useState(true);
  const [files, setFiles] = useState<FileItem[]>([]);

  useEffect(() => {
    loadFiles();
  }, []);

  const loadFiles = async () => {
    try {
      setLoading(true);
      const fileList = await confirmationService.getFilesList(keHoach.ID);
      setFiles(fileList);
    } catch (error) {
      console.error('Error loading files:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilePress = async (file: FileItem) => {
    try {
      if (file.DUONGDAN) {
        const canOpen = await Linking.canOpenURL(file.DUONGDAN);
        if (canOpen) {
          await Linking.openURL(file.DUONGDAN);
        } else {
          Alert.alert('Lỗi', 'Không thể mở file này');
        }
      }
    } catch (error) {
      console.error('Error opening file:', error);
      Alert.alert('Lỗi', 'Không thể mở file');
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getFileIcon = (fileName: string): string => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'pdf':
        return 'picture-as-pdf';
      case 'doc':
      case 'docx':
        return 'description';
      case 'xls':
      case 'xlsx':
        return 'table-chart';
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
        return 'image';
      default:
        return 'insert-drive-file';
    }
  };

  const renderEvaluationRows = (files: FileItem[]) => {
    // Sample evaluation criteria
    const criteria = [
      {
        title: 'I. Đánh giá về ý thức và kết quả học tập',
        items: [
          'Điểm TBCHT ≥ 3,6',
          'Điểm TBCHT từ 3,2 đến 3,59',
          'Điểm TBCHT từ 2,5 đến 3,19',
          'Cấp Trường',
        ]
      },
      {
        title: 'II. Phần cộng điểm',
        items: [
          'Đạt giải Olympic, cuộc thi chuyên môn cấp Quốc gia (tối đa)',
          'Tham gia Olympic, cuộc thi chuyên môn cấp Quốc gia (tối đa)',
          'Đạt giải Olympic, cuộc thi chuyên môn cấp Trường (tối đa)',
          'Tham gia Olympic, cuộc thi chuyên môn cấp Trường (tối đa)',
          'Đạt giải NCKH cấp Bộ và tương đương (tối đa)',
          'Đạt giải NCKH cấp Trường (tối đa)',
          'Đạt giải NCKH khác (tối đa)',
        ]
      },
    ];

    return criteria.map((section, sectionIndex) => (
      <View key={sectionIndex}>
        {/* Section Header */}
        <View style={styles.tableRow}>
          <View style={[styles.tableCell, { width: 250 }]}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
          </View>
          <View style={[styles.tableCell, { width: 80 }]} />
          <View style={[styles.tableCell, { width: 80 }]} />
          <View style={[styles.tableCell, { width: 80 }]} />
          <View style={[styles.tableCell, { width: 80 }]} />
        </View>

        {/* Section Items */}
        {section.items.map((item, itemIndex) => (
          <View key={itemIndex} style={styles.tableRow}>
            <View style={[styles.tableCell, { width: 250 }]}>
              <Text style={styles.cellText}>- {item}</Text>
            </View>
            <View style={[styles.tableCell, { width: 80 }]}>
              <View style={styles.checkbox} />
            </View>
            <View style={[styles.tableCell, { width: 80 }]}>
              <View style={styles.checkbox} />
            </View>
            <View style={[styles.tableCell, { width: 80 }]}>
              <View style={styles.checkbox} />
            </View>
            <View style={[styles.tableCell, { width: 80 }]}>
              {itemIndex < files.length && (
                <TouchableOpacity onPress={() => handleFilePress(files[itemIndex])}>
                  <MaterialIcons name="cloud" size={24} color="#3B82F6" />
                </TouchableOpacity>
              )}
            </View>
          </View>
        ))}
      </View>
    ));
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#3B82F6', '#1E40AF']} style={styles.gradient}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Chi tiết kế hoạch</Text>
          <View style={styles.backButton} />
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Ke Hoach Info Card */}
        <View style={styles.infoCard}>
          <View style={styles.infoHeader}>
            <MaterialIcons name="description" size={32} color="#3B82F6" />
            <Text style={styles.infoTitle}>{keHoach.TEN}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Mã kế hoạch:</Text>
            <Text style={styles.infoValue}>{keHoach.MA}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Thời gian:</Text>
            <Text style={styles.infoValue}>
              {keHoach.TUNGAY} - {keHoach.DENNGAY}
            </Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Năm học:</Text>
            <Text style={styles.infoValue}>
              {keHoach.DAOTAO_THOIGIANDAOTAO_NAM} - Kỳ {keHoach.DAOTAO_THOIGIANDAOTAO_KY}
            </Text>
          </View>
        </View>

        {/* Tài liệu đính kèm Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="cloud" size={24} color="#3B82F6" />
            <Text style={styles.sectionTitle}>Tài liệu đính kèm</Text>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#3B82F6" />
              <Text style={styles.loadingText}>Đang tải tài liệu...</Text>
            </View>
          ) : files.length === 0 ? (
            <View style={styles.emptyCard}>
              <MaterialIcons name="cloud-off" size={48} color="#D1D5DB" />
              <Text style={styles.emptyText}>Chưa có tài liệu nào</Text>
            </View>
          ) : (
            <View style={styles.documentContainer}>
              {/* Document Preview */}
              <View style={styles.documentPreview}>
                <View style={styles.documentHeader}>
                  <Text style={styles.documentTitle}>
                    BỘ GIÁO DỤC VÀ ĐÀO TẠO
                  </Text>
                  <Text style={styles.documentSubtitle}>
                    CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM{'\n'}
                    Độc lập - Tự do - Hạnh phúc
                  </Text>
                </View>

                <Text style={styles.formTitle}>
                  PHIẾU ĐÁNH GIÁ KẾT QUẢ RÈN LUYỆN CHO SINH VIÊN
                </Text>

                {/* Evaluation Table */}
                <View style={styles.tableContainer}>
                  <ScrollView horizontal showsHorizontalScrollIndicator={true}>
                    <View>
                      {/* Table Header */}
                      <View style={styles.tableHeader}>
                        <View style={[styles.tableCell, styles.headerCell, { width: 250 }]}>
                          <Text style={styles.headerText}>Nội dung đánh giá</Text>
                        </View>
                        <View style={[styles.tableCell, styles.headerCell, { width: 80 }]}>
                          <Text style={styles.headerText}>SV tự{'\n'}đánh giá</Text>
                        </View>
                        <View style={[styles.tableCell, styles.headerCell, { width: 80 }]}>
                          <Text style={styles.headerText}>HD cấp{'\n'}khoa{'\n'}đánh giá</Text>
                        </View>
                        <View style={[styles.tableCell, styles.headerCell, { width: 80 }]}>
                          <Text style={styles.headerText}>HD cấp{'\n'}trường{'\n'}đánh giá</Text>
                        </View>
                        <View style={[styles.tableCell, styles.headerCell, { width: 80 }]}>
                          <Text style={styles.headerText}>Files{'\n'}minh{'\n'}chứng</Text>
                        </View>
                      </View>

                      {/* Table Rows */}
                      {renderEvaluationRows(files)}
                    </View>
                  </ScrollView>
                </View>

                {/* File Actions */}
                <View style={styles.fileActions}>
                  {files.map((file, index) => (
                    <TouchableOpacity
                      key={file.ID}
                      style={styles.fileActionButton}
                      onPress={() => handleFilePress(file)}
                      activeOpacity={0.7}
                    >
                      <MaterialIcons name="cloud-download" size={20} color="#3B82F6" />
                      <Text style={styles.fileActionText} numberOfLines={1}>
                        {file.TEN}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
          )}
        </View>

        {/* Hướng dẫn */}
        <View style={styles.instructionsCard}>
          <Text style={styles.instructionsTitle}>Hướng dẫn</Text>
          <View style={styles.instructionItem}>
            <MaterialIcons name="info" size={20} color="#3B82F6" />
            <Text style={styles.instructionText}>
              Nhấn vào tài liệu để xem hoặc tải về
            </Text>
          </View>
          <View style={styles.instructionItem}>
            <MaterialIcons name="info" size={20} color="#3B82F6" />
            <Text style={styles.instructionText}>
              Hoàn thành đánh giá trước khi xin xác nhận
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

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
  content: {
    flex: 1,
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginLeft: 12,
    flex: 1,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
    marginLeft: 8,
  },
  loadingContainer: {
    backgroundColor: '#FFFFFF',
    padding: 40,
    borderRadius: 12,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    padding: 40,
    borderRadius: 12,
    alignItems: 'center',
  },
  emptyText: {
    marginTop: 12,
    fontSize: 14,
    color: '#9CA3AF',
  },
  documentContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  documentPreview: {
    width: '100%',
  },
  documentHeader: {
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  documentTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#111827',
    textAlign: 'center',
  },
  documentSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 4,
  },
  formTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 20,
    textTransform: 'uppercase',
  },
  tableContainer: {
    marginBottom: 20,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: '#D1D5DB',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: '#D1D5DB',
  },
  tableCell: {
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderRightWidth: 1,
    borderColor: '#D1D5DB',
    minHeight: 40,
  },
  headerCell: {
    backgroundColor: '#EFF6FF',
  },
  headerText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1E40AF',
    textAlign: 'center',
  },
  cellText: {
    fontSize: 12,
    color: '#374151',
    textAlign: 'left',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  },
  fileActions: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  fileActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    marginBottom: 8,
  },
  fileActionText: {
    fontSize: 13,
    color: '#1E40AF',
    marginLeft: 8,
    flex: 1,
  },
  instructionsCard: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 12,
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  instructionText: {
    fontSize: 14,
    color: '#374151',
    marginLeft: 8,
    flex: 1,
  },
});

export default ConfirmationDetailScreen;
