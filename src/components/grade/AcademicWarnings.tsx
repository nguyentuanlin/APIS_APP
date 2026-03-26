import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Text } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { gradeService, CanhBaoHocVu } from '../../services/gradeService';

const AcademicWarnings = () => {
  const [loading, setLoading] = useState(true);
  const [warnings, setWarnings] = useState<CanhBaoHocVu[]>([]);

  useEffect(() => {
    loadWarnings();
  }, []);

  const loadWarnings = async () => {
    try {
      console.log('[AcademicWarnings] Loading warnings...');
      setLoading(true);
      const data = await gradeService.getCanhBaoHocVu();
      console.log('[AcademicWarnings] Received data:', data);
      console.log('[AcademicWarnings] Data length:', data.length);
      if (data.length > 0) {
        console.log('[AcademicWarnings] First item:', JSON.stringify(data[0], null, 2));
      }
      setWarnings(data);
    } catch (error) {
      console.error('[AcademicWarnings] Error loading warnings:', error);
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

  if (warnings.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <MaterialIcons name="check-circle" size={64} color="#10B981" />
        <Text style={styles.emptyTitle}>Không có cảnh báo học vụ</Text>
        <Text style={styles.emptySubtitle}>Bạn đang học tập tốt!</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.content}>
        {warnings.map((item, index) => (
          <View key={item.ID || index} style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.warningIcon}>
                <MaterialIcons name="warning" size={24} color="#F59E0B" />
              </View>
              <View style={styles.headerContent}>
                <Text style={styles.cardNumber}>Cảnh báo #{index + 1}</Text>
                {item.MUCXULY_TEN && (
                  <View style={styles.severityBadge}>
                    <Text style={styles.severityText}>{item.MUCXULY_TEN}</Text>
                  </View>
                )}
              </View>
            </View>

            <View style={styles.cardBody}>
              {item.THOIGIAN && (
                <View style={styles.cardRow}>
                  <MaterialIcons name="access-time" size={16} color="#6B7280" />
                  <Text style={styles.cardLabel}>Thời gian:</Text>
                  <Text style={styles.cardValue}>{item.THOIGIAN}</Text>
                </View>
              )}

              {item.NAMHOC && (
                <View style={styles.cardRow}>
                  <MaterialIcons name="calendar-today" size={16} color="#6B7280" />
                  <Text style={styles.cardLabel}>Năm học:</Text>
                  <Text style={styles.cardValue}>
                    {item.NAMHOC.replace('_', '-')} - HK{item.HOCKY || ''}
                  </Text>
                </View>
              )}

              {item.CHUONGTRINH_TEN && (
                <View style={styles.cardRow}>
                  <MaterialIcons name="school" size={16} color="#6B7280" />
                  <Text style={styles.cardLabel}>Chương trình:</Text>
                  <Text style={styles.cardValue}>{item.CHUONGTRINH_TEN}</Text>
                </View>
              )}

              {item.LOP_TEN && (
                <View style={styles.cardRow}>
                  <MaterialIcons name="class" size={16} color="#6B7280" />
                  <Text style={styles.cardLabel}>Lớp:</Text>
                  <Text style={styles.cardValue}>{item.LOP_TEN}</Text>
                </View>
              )}

              {item.GHICHU && (
                <View style={styles.noteContainer}>
                  <View style={styles.noteHeader}>
                    <MaterialIcons name="info" size={16} color="#6B7280" />
                    <Text style={styles.noteLabel}>Ghi chú:</Text>
                  </View>
                  <Text style={styles.noteText}>{item.GHICHU}</Text>
                </View>
              )}
            </View>

            {item.NGAYTAO && (
              <View style={styles.cardFooter}>
                <MaterialIcons name="event" size={14} color="#9CA3AF" />
                <Text style={styles.footerText}>Ngày tạo: {item.NGAYTAO}</Text>
              </View>
            )}
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
  emptyTitle: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: '600',
    color: '#10B981',
  },
  emptySubtitle: {
    marginTop: 4,
    fontSize: 14,
    color: '#6B7280',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  warningIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerContent: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardNumber: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  severityBadge: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  severityText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#DC2626',
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
    minWidth: 100,
  },
  cardValue: {
    flex: 1,
    fontSize: 13,
    color: '#111827',
    fontWeight: '600',
  },
  noteContainer: {
    marginTop: 8,
    padding: 12,
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
  },
  noteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  noteLabel: {
    fontSize: 13,
    color: '#92400E',
    fontWeight: '600',
  },
  noteText: {
    fontSize: 13,
    color: '#78350F',
    lineHeight: 20,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  footerText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
});

export default AcademicWarnings;
