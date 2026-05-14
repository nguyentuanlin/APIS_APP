import React, { useEffect, useState } from 'react';
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
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { fcmService, FcmNotiItem } from '../services/chung/fcmService';

interface Props {
  visible: boolean;
  onClose: () => void;
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

const NotificationModal: React.FC<Props> = ({ visible, onClose }) => {
  const [items, setItems] = useState<FcmNotiItem[]>([]);

  useEffect(() => {
    const unsub = fcmService.subscribe(inbox => {
      setItems(inbox);
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (visible) {
      fcmService.markAllRead().catch(() => {});
    }
  }, [visible]);

  const renderItem = ({ item }: { item: FcmNotiItem }) => (
    <View style={styles.item}>
      <View style={styles.iconBox}>
        <MaterialIcons name="notifications" size={18} color="#3B82F6" />
      </View>
      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={2}>
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
    </View>
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
              />
            )}

            {items.length > 0 && (
              <TouchableOpacity
                style={styles.clearBtn}
                onPress={() => fcmService.clearInbox()}
                activeOpacity={0.7}
              >
                <MaterialIcons name="delete-outline" size={16} color="#EF4444" />
                <Text style={styles.clearText}>Xóa tất cả</Text>
              </TouchableOpacity>
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
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 13.5,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
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
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    backgroundColor: '#FAFAFA',
  },
  clearText: {
    color: '#EF4444',
    fontSize: 12.5,
    fontWeight: '600',
    marginLeft: 6,
  },
});

export default NotificationModal;
