import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Text } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { gradeService, VanBangChungChi } from '../../services/gradeService';

const CertificatesList = () => {
  const [loading, setLoading] = useState(true);
  const [certificates, setCertificates] = useState<VanBangChungChi[]>([]);

  useEffect(() => {
    loadCertificates();
  }, []);

  const loadCertificates = async () => {
    try {
      console.log('[CertificatesList] Loading certificates...');
      setLoading(true);
      const data = await gradeService.getVanBangChungChi();
      console.log('[CertificatesList] Received data:', data);
      console.log('[CertificatesList] Data length:', data.length);
      if (data.length > 0) {
        console.log('[CertificatesList] First item:', JSON.stringify(data[0], null, 2));
      }
      setCertificates(data);
    } catch (error) {
      console.error('[CertificatesList] Error loading certificates:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Đang tải dữ liệu...</Text>
      </View>
    );
  }

  if (certificates.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <MaterialIcons name="school" size={64} color="#D1D5DB" />
        <Text style={styles.emptyText}>Chưa có văn bằng - chứng chỉ nào</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.content}>
        {certificates.map((item, index) => (
          <View key={item.ID} style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardNumber}>
                <Text style={styles.cardNumberText}>{index + 1}</Text>
              </View>
              <View style={styles.cardBadge}>
                <Text style={styles.cardBadgeText}>{item.PHANLOAI_TEN}</Text>
              </View>
            </View>

            <View style={styles.cardBody}>
              <View style={styles.cardRow}>
                <MaterialIcons name="school" size={16} color="#6B7280" />
                <Text style={styles.cardLabel}>Chương trình học:</Text>
                <Text style={styles.cardValue}>{item.CHUONGTRINH_TEN}</Text>
              </View>

              <View style={styles.cardRow}>
                <MaterialIcons name="star" size={16} color="#6B7280" />
                <Text style={styles.cardLabel}>Xếp loại:</Text>
                <View style={[
                  styles.xepLoaiBadge,
                  item.XEPLOAI_TEN === 'Xuất sắc' && styles.xepLoaiXuatSac,
                  item.XEPLOAI_TEN === 'Giỏi' && styles.xepLoaiGioi,
                  item.XEPLOAI_TEN === 'Khá' && styles.xepLoaiKha,
                  item.XEPLOAI_TEN === 'Trung bình' && styles.xepLoaiTrungBinh,
                ]}>
                  <Text style={styles.xepLoaiText}>{item.XEPLOAI_TEN}</Text>
                </View>
              </View>

              <View style={styles.cardRow}>
                <MaterialIcons name="confirmation-number" size={16} color="#6B7280" />
                <Text style={styles.cardLabel}>Số hiệu:</Text>
                <Text style={styles.cardValue}>{item.SOHIEUBANG}</Text>
              </View>

              <View style={styles.cardRow}>
                <MaterialIcons name="book" size={16} color="#6B7280" />
                <Text style={styles.cardLabel}>Số vào sổ:</Text>
                <Text style={styles.cardValue}>{item.SOVAOSOCAPBANG}</Text>
              </View>
            </View>

            <View style={styles.cardFooter}>
              <View style={styles.studentInfo}>
                <MaterialIcons name="person" size={14} color="#6B7280" />
                <Text style={styles.studentText}>
                  {item.QLSV_NGUOIHOC_HODEM} {item.QLSV_NGUOIHOC_TEN}
                </Text>
              </View>
              <View style={styles.studentInfo}>
                <MaterialIcons name="badge" size={14} color="#6B7280" />
                <Text style={styles.studentText}>{item.QLSV_NGUOIHOC_MASO}</Text>
              </View>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    marginTop: 12,
    fontSize: 14,
    color: '#9CA3AF',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  cardNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardNumberText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  cardBadge: {
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    maxWidth: '75%',
  },
  cardBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1E40AF',
  },
  cardBody: {
    gap: 10,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardLabel: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
    minWidth: 120,
  },
  cardValue: {
    flex: 1,
    fontSize: 13,
    color: '#111827',
    fontWeight: '600',
  },
  xepLoaiBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  xepLoaiXuatSac: {
    backgroundColor: '#FEF3C7',
  },
  xepLoaiGioi: {
    backgroundColor: '#D1FAE5',
  },
  xepLoaiKha: {
    backgroundColor: '#DBEAFE',
  },
  xepLoaiTrungBinh: {
    backgroundColor: '#F3F4F6',
  },
  xepLoaiText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#111827',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  studentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  studentText: {
    fontSize: 12,
    color: '#6B7280',
  },
});

export default CertificatesList;
