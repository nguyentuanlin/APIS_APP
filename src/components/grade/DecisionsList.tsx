import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Text } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { gradeService, QuyetDinh } from '../../services/gradeService';

const DecisionsList = () => {
  const [loading, setLoading] = useState(true);
  const [decisions, setDecisions] = useState<QuyetDinh[]>([]);

  useEffect(() => {
    loadDecisions();
  }, []);

  const loadDecisions = async () => {
    try {
      console.log('[DecisionsList] Loading decisions...');
      setLoading(true);
      const data = await gradeService.getQuyetDinh();
      console.log('[DecisionsList] Received data:', data);
      console.log('[DecisionsList] Data length:', data.length);
      if (data.length > 0) {
        console.log('[DecisionsList] First item:', JSON.stringify(data[0], null, 2));
      }
      setDecisions(data);
    } catch (error) {
      console.error('[DecisionsList] Error loading decisions:', error);
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

  if (decisions.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <MaterialIcons name="description" size={64} color="#D1D5DB" />
        <Text style={styles.emptyText}>Chưa có quyết định nào</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.content}>
        {decisions.map((item, index) => (
          <View key={item.LOAIQUYETDINH_ID} style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardNumber}>
                <Text style={styles.cardNumberText}>{index + 1}</Text>
              </View>
              <View style={styles.cardBadge}>
                <Text style={styles.cardBadgeText}>{item.LOAIQUYETDINH_TEN}</Text>
              </View>
            </View>

            <View style={styles.cardBody}>
              <View style={styles.cardRow}>
                <MaterialIcons name="description" size={16} color="#6B7280" />
                <Text style={styles.cardLabel}>Số quyết định:</Text>
                <Text style={styles.cardValue}>{item.SOQUYETDINH}</Text>
              </View>

              <View style={styles.cardRow}>
                <MaterialIcons name="event" size={16} color="#6B7280" />
                <Text style={styles.cardLabel}>Ngày quyết định:</Text>
                <Text style={styles.cardValue}>{item.NGAYQUYETDINH}</Text>
              </View>

              <View style={styles.cardRow}>
                <MaterialIcons name="event-available" size={16} color="#6B7280" />
                <Text style={styles.cardLabel}>Ngày hiệu lực:</Text>
                <Text style={styles.cardValue}>{item.NGAYHIEULUC}</Text>
              </View>

              <View style={styles.cardContent}>
                <MaterialIcons name="info" size={16} color="#6B7280" />
                <Text style={styles.cardContentLabel}>Nội dung:</Text>
              </View>
              <Text style={styles.cardContentText}>{item.NOIDUNG}</Text>
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
  // Card styles
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
  },
  cardValue: {
    flex: 1,
    fontSize: 13,
    color: '#111827',
    fontWeight: '600',
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  cardContentLabel: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  cardContentText: {
    fontSize: 13,
    color: '#111827',
    lineHeight: 20,
    marginLeft: 24,
  },
});

export default DecisionsList;
