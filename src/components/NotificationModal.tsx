import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  FlatList,
  Pressable,
  Platform,
  StatusBar,
  RefreshControl,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { fcmService, FcmNotiItem } from '../services/chung/fcmService';

interface Props {
  visible: boolean;
  onClose: () => void;
  onItemPress?: (item: FcmNotiItem) => void;
}

function formatRelative(ts: number): string {
  const diff = Math.max(0, Date.now() - ts);
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return 'Vừa xong';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} phút trước`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} giờ trước`;
  const day = Math.floor(hr / 24);
  if (day === 1) return 'Hôm qua';
  if (day < 7) return `${day} ngày trước`;
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

const TOP_OFFSET = Platform.OS === 'ios' ? 100 : (StatusBar.currentHeight || 24) + 56;

const NotificationModal: React.FC<Props> = ({ visible, onClose, onItemPress }) => {
  const [items, setItems] = useState<FcmNotiItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const unsub = fcmService.subscribe(inbox => {
      setItems(inbox);
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (visible) {
      // Khi mở modal: refresh từ server để chắc chắn có data mới nhất
      fcmService.refresh().catch(() => {});
    }
  }, [visible]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fcmService.refresh();
    } finally {
      setRefreshing(false);
    }
  }, []);

  const handleItemPress = useCallback(
    (item: FcmNotiItem) => {
      if (!item.read) {
        fcmService.markRead(item.id).catch(() => {});
      }
      if (onItemPress) {
        onClose();
        onItemPress(item);
      }
    },
    [onItemPress, onClose],
  );

  const handleItemLongPress = useCallback((item: FcmNotiItem) => {
    Alert.alert('Xóa thông báo', 'Bạn có chắc muốn xóa thông báo này?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: () => fcmService.deleteItem(item.id).catch(() => {}),
      },
    ]);
  }, []);

  const handleClearAll = useCallback(() => {
    Alert.alert('Xóa tất cả', 'Xóa toàn bộ thông báo?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: () => fcmService.clearInbox().catch(() => {}),
      },
    ]);
  }, []);

  const renderItem = ({ item }: { item: FcmNotiItem }) => (
    <TouchableOpacity
      style={[styles.item, !item.read && styles.itemUnread]}
      onPress={() => handleItemPress(item)}
      onLongPress={() => handleItemLongPress(item)}
      delayLongPress={400}
      activeOpacity={0.6}
    >
      <View style={[styles.iconBox, !item.read && styles.iconBoxUnread]}>
        <MaterialIcons name="notifications" size={18} color={item.read ? '#9CA3AF' : '#3B82F6'} />
        {!item.read && <View style={styles.dot} />}
      </View>
      <View style={styles.content}>
        <Text style={[styles.title, !item.read && styles.titleUnread]} numberOfLines={2}>
          {item.title}
        </Text>
        {!!item.body && (
          <Text style={styles.body} numberOfLines={3}>
            {item.body}
          </Text>
        )}
        <View style={styles.timeRow}>
          <MaterialIcons name="schedule" size={11} color="#9CA3AF" />
          <Text style={styles.time}>{formatRelative(item.receivedAt)}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <View style={[styles.dropdownWrap, { top: TOP_OFFSET }]} pointerEvents="box-none">
          <View style={styles.arrow} />
          <Pressable style={styles.card} onPress={() => {}}>
            <View style={styles.header}>
              <View style={styles.headerLeft}>
                <MaterialIcons name="notifications" size={18} color="#3B82F6" />
                <Text style={styles.headerTitle}>Thông báo</Text>
                {items.length > 0 && (
                  <View style={styles.headerCount}>
                    <Text style={styles.headerCountText}>
                      {items.length > 99 ? '99+' : items.length}
                    </Text>
                  </View>
                )}
              </View>
              <TouchableOpacity
                onPress={onClose}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <MaterialIcons name="close" size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {items.length === 0 ? (
              <View style={styles.empty}>
                <View style={styles.emptyIconWrap}>
                  <MaterialIcons name="notifications-off" size={36} color="#D1D5DB" />
                </View>
                <Text style={styles.emptyTitle}>Chưa có thông báo nào</Text>
                <Text style={styles.emptySub}>Các thông báo mới sẽ hiển thị ở đây</Text>
              </View>
            ) : (
              <FlatList
                data={items}
                keyExtractor={it => it.id}
                renderItem={renderItem}
                showsVerticalScrollIndicator={false}
                style={styles.list}
                contentContainerStyle={styles.listContent}
                ItemSeparatorComponent={() => <View style={styles.separator} />}
                refreshControl={
                  <RefreshControl
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                    tintColor="#3B82F6"
                    colors={['#3B82F6']}
                  />
                }
              />
            )}

            {items.length > 0 && (
              <View style={styles.footerRow}>
                <TouchableOpacity
                  style={styles.footerBtn}
                  onPress={() => fcmService.markAllRead()}
                  activeOpacity={0.7}
                >
                  <MaterialIcons name="done-all" size={16} color="#3B82F6" />
                  <Text style={[styles.footerText, { color: '#3B82F6' }]}>Đánh dấu đã đọc</Text>
                </TouchableOpacity>
                <View style={styles.footerDivider} />
                <TouchableOpacity style={styles.footerBtn} onPress={handleClearAll} activeOpacity={0.7}>
                  <MaterialIcons name="delete-outline" size={16} color="#EF4444" />
                  <Text style={[styles.footerText, { color: '#EF4444' }]}>Xóa tất cả</Text>
                </TouchableOpacity>
              </View>
            )}
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  dropdownWrap: {
    position: 'absolute',
    right: 16,
    left: 16,
    alignItems: 'flex-end',
  },
  arrow: {
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderBottomWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#FFFFFF',
    marginRight: 50,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    maxHeight: 460,
    minHeight: 180,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 10,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    backgroundColor: '#FFFFFF',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1F2937',
    marginLeft: 8,
  },
  headerCount: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 8,
    minWidth: 22,
    alignItems: 'center',
  },
  headerCountText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  list: {
    maxHeight: 360,
  },
  listContent: {
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  item: {
    flexDirection: 'row',
    paddingVertical: 11,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  itemUnread: {
    backgroundColor: '#F0F7FF',
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    position: 'relative',
  },
  iconBoxUnread: {
    backgroundColor: '#EFF6FF',
  },
  dot: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 13.5,
    fontWeight: '500',
    color: '#4B5563',
    marginBottom: 2,
  },
  titleUnread: {
    fontWeight: '700',
    color: '#1F2937',
  },
  body: {
    fontSize: 12.5,
    color: '#4B5563',
    marginBottom: 5,
    lineHeight: 17,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  time: {
    fontSize: 11,
    color: '#9CA3AF',
    marginLeft: 4,
  },
  separator: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginHorizontal: 10,
  },
  empty: {
    paddingVertical: 36,
    alignItems: 'center',
  },
  emptyIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F9FAFB',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 13.5,
    fontWeight: '600',
    color: '#6B7280',
  },
  emptySub: {
    fontSize: 11.5,
    color: '#9CA3AF',
    marginTop: 4,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    backgroundColor: '#FAFAFA',
  },
  footerBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
  },
  footerDivider: {
    width: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 8,
  },
  footerText: {
    fontSize: 12.5,
    fontWeight: '600',
    marginLeft: 6,
  },
});

export default NotificationModal;
