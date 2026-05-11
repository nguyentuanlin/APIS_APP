import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import documentService, { VanBanItem } from '../services/documentService';

const DocumentScreen = () => {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [opening, setOpening] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [list, setList] = useState<VanBanItem[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await documentService.getVanBanList();
      setList(data);
    } catch (e: any) {
      console.error('[Document] load error:', e);
      setError(e?.message || 'Không tải được danh sách văn bản');
      setList([]);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenFile = async (item: VanBanItem) => {
    try {
      setOpening(item.ID);
      const url = await documentService.getFileUrl(item.ID);
      if (!url) {
        Alert.alert('Không có file', 'Văn bản này chưa có file đính kèm');
        return;
      }
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Không thể mở', `URL: ${url}`);
      }
    } catch (e: any) {
      Alert.alert('Lỗi', e?.message || 'Không thể mở file');
    } finally {
      setOpening(null);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient colors={['#3B82F6', '#1E40AF']} style={styles.gradient}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Văn bản, quy định, biểu mẫu</Text>
          <View style={styles.backButton} />
        </View>
      </LinearGradient>

      <ScrollView style={styles.body} contentContainerStyle={{ paddingBottom: 32 }}>
        {error ? (
          <View style={styles.errorBox}>
            <MaterialIcons name="error-outline" size={20} color="#DC2626" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#3B82F6" />
            <Text style={styles.loadingText}>Đang tải...</Text>
          </View>
        ) : list.length === 0 ? (
          <View style={styles.emptyBox}>
            <MaterialIcons name="description" size={48} color="#9CA3AF" />
            <Text style={styles.emptyText}>Chưa có văn bản nào</Text>
          </View>
        ) : (
          list.map((item, idx) => (
            <TouchableOpacity
              key={`${item.ID}_${idx}`}
              style={styles.card}
              onPress={() => handleOpenFile(item)}
              disabled={opening === item.ID}
              activeOpacity={0.7}
            >
              <View style={styles.iconBox}>
                <MaterialIcons name="description" size={28} color="#1E40AF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle} numberOfLines={2}>
                  {item.TENVANBAN || '(Không có tên)'}
                </Text>
                <View style={styles.cardMetaRow}>
                  <MaterialIcons name="tag" size={14} color="#6B7280" />
                  <Text style={styles.cardMeta}>{item.SOHIEU || '-'}</Text>
                </View>
                <View style={styles.cardMetaRow}>
                  <MaterialIcons name="event" size={14} color="#6B7280" />
                  <Text style={styles.cardMeta}>{item.NGAYBANHANH || '-'}</Text>
                </View>
              </View>
              <View style={styles.downloadBtn}>
                {opening === item.ID ? (
                  <ActivityIndicator size="small" color="#3B82F6" />
                ) : (
                  <MaterialIcons name="file-download" size={22} color="#3B82F6" />
                )}
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  gradient: {},
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  backButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '700' },
  body: { flex: 1, padding: 12 },
  loadingBox: { alignItems: 'center', justifyContent: 'center', paddingVertical: 48 },
  loadingText: { marginTop: 12, color: '#6B7280', fontSize: 14 },
  emptyBox: { backgroundColor: '#FFFFFF', padding: 32, alignItems: 'center', borderRadius: 8 },
  emptyText: { marginTop: 8, color: '#9CA3AF', fontSize: 14 },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderLeftWidth: 4,
    borderLeftColor: '#DC2626',
    padding: 12,
    marginBottom: 12,
    borderRadius: 6,
  },
  errorText: { color: '#991B1B', marginLeft: 8, flex: 1, fontSize: 13 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 3,
    elevation: 1,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardTitle: { fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 4 },
  cardMetaRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 2 },
  cardMeta: { fontSize: 12, color: '#6B7280', marginLeft: 4 },
  downloadBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default DocumentScreen;
