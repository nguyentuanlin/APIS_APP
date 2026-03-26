import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { ReceiptItem, financeService } from '../services/financeService';

interface ReceiptDetailModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  items: ReceiptItem[];
  totalAmount: number;
}

const { width, height } = Dimensions.get('window');

const ReceiptDetailModal: React.FC<ReceiptDetailModalProps> = ({
  visible,
  onClose,
  title,
  items,
  totalAmount,
}) => {
  const renderTableHeader = () => (
    <View style={styles.tableHeader}>
      <Text style={[styles.headerCell, styles.sttColumn]}>Stt</Text>
      <Text style={[styles.headerCell, styles.receiptColumn]}>Số phiếu</Text>
      <Text style={[styles.headerCell, styles.amountColumn]}>Tổng tiền</Text>
      <Text style={[styles.headerCell, styles.dateColumn]}>Ngày thu</Text>
      <Text style={[styles.headerCell, styles.personColumn]}>Người thu</Text>
    </View>
  );

  const renderTableRow = (item: ReceiptItem, index: number) => {
    // Hiển thị số phiếu hoặc số hóa đơn
    const receiptNumber = item.SOPHIEUTHU || item.SOHOADON || '';
    
    return (
      <View key={item.ID} style={[styles.tableRow, index % 2 === 0 && styles.evenRow]}>
        <Text style={[styles.cell, styles.sttColumn]}>{index + 1}</Text>
        <Text style={[styles.cell, styles.receiptColumn]}>{receiptNumber}</Text>
        <Text style={[styles.cell, styles.amountColumn, styles.amountText]}>
          {financeService.formatCurrency(item.TONGTIEN || 0)}
        </Text>
        <Text style={[styles.cell, styles.dateColumn]}>{item.NGAYTHU_DD_MM_YYYY_HHMMSS || ''}</Text>
        <Text style={[styles.cell, styles.personColumn]} numberOfLines={1}>
          {item.TENDAYDU_NGUOITHU || ''}
        </Text>
      </View>
    );
  };

  const renderTotalRow = () => (
    <View style={[styles.tableRow, styles.totalRow]}>
      <Text style={[styles.cell, styles.sttColumn]}></Text>
      <Text style={[styles.cell, styles.receiptColumn, styles.totalLabel]}>Tổng</Text>
      <Text style={[styles.cell, styles.amountColumn, styles.totalAmount]}>
        {financeService.formatCurrency(totalAmount)}
      </Text>
      <Text style={[styles.cell, styles.dateColumn]}></Text>
      <Text style={[styles.cell, styles.personColumn]}></Text>
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <MaterialIcons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <ScrollView 
            style={styles.modalContent}
            horizontal={true}
            showsHorizontalScrollIndicator={true}
            persistentScrollbar={true}
          >
            <View style={styles.tableContainer}>
              {renderTableHeader()}
              
              <ScrollView 
                style={styles.tableBody}
                showsVerticalScrollIndicator={true}
                persistentScrollbar={true}
              >
                {items.map((item, index) => renderTableRow(item, index))}
                {renderTotalRow()}
              </ScrollView>
            </View>
          </ScrollView>

          {/* Scroll hint */}
          <View style={styles.scrollHint}>
            <MaterialIcons name="swipe" size={16} color="#6B7280" />
            <Text style={styles.scrollHintText}>Vuốt ngang để xem thêm</Text>
          </View>

          {/* Footer */}
          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.closeFooterButton} onPress={onClose}>
              <Text style={styles.closeFooterButtonText}>Đóng</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: width * 0.95,
    height: height * 0.8,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  closeButton: {
    padding: 4,
  },
  modalContent: {
    flex: 1,
  },
  tableContainer: {
    minWidth: width * 1.5,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderBottomWidth: 2,
    borderBottomColor: '#D1D5DB',
    paddingVertical: 12,
  },
  tableBody: {
    flex: 1,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingVertical: 8,
  },
  evenRow: {
    backgroundColor: '#F9FAFB',
  },
  totalRow: {
    backgroundColor: '#EFF6FF',
    borderTopWidth: 2,
    borderTopColor: '#3B82F6',
  },
  headerCell: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#374151',
    textAlign: 'center',
    paddingHorizontal: 4,
  },
  cell: {
    fontSize: 11,
    color: '#6B7280',
    textAlign: 'center',
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  // Column widths
  sttColumn: {
    width: 50,
  },
  receiptColumn: {
    width: 120,
  },
  amountColumn: {
    width: 150,
  },
  dateColumn: {
    width: 180,
  },
  personColumn: {
    width: 150,
  },
  amountText: {
    fontWeight: '600',
    color: '#1F2937',
    fontSize: 11,
  },
  totalLabel: {
    fontWeight: 'bold',
    color: '#1F2937',
    textAlign: 'right',
  },
  totalAmount: {
    fontWeight: 'bold',
    color: '#3B82F6',
    fontSize: 12,
  },
  scrollHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    backgroundColor: '#F9FAFB',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    gap: 4,
  },
  scrollHintText: {
    fontSize: 12,
    color: '#6B7280',
    fontStyle: 'italic',
  },
  modalFooter: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
  },
  closeFooterButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignSelf: 'center',
  },
  closeFooterButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
});

export default ReceiptDetailModal;
