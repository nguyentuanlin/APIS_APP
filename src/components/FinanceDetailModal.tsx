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
import { FinanceItem, financeService } from '../services/sinhVien/financeService';

interface FinanceDetailModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  items: FinanceItem[];
  totalAmount: number;
  onPaymentCodePress?: (qrUrl: string, paymentCode: string, amount: number, content: string) => void;
}

const { width, height } = Dimensions.get('window');

const FinanceDetailModal: React.FC<FinanceDetailModalProps> = ({
  visible,
  onClose,
  title,
  items,
  totalAmount,
  onPaymentCodePress,
}) => {
  // Xác định loại modal dựa vào title
  const isExemptionModal = title.includes('được miễn');
  const isPaidModal = title.includes('đã nộp');
  const shouldShowPaymentCodeColumn =
    title.toLowerCase().includes('khoản nợ chung') &&
    typeof onPaymentCodePress === 'function';
  const amountColumnHeader = isExemptionModal ? 'Số tiền được miễn' : 'Số tiền';
  
  const renderTableHeader = () => (
    <View style={styles.tableHeader}>
      <Text style={[styles.headerCell, styles.sttColumn]}>Stt</Text>
      <Text style={[styles.headerCell, styles.termColumn]}>Học kỳ</Text>
      <Text style={[styles.headerCell, styles.dotColumn]}>Đợt</Text>
      <Text style={[styles.headerCell, styles.typeColumn]}>Loại khoản</Text>
      <Text style={[styles.headerCell, styles.contentColumn]}>Nội dung</Text>
      <Text style={[styles.headerCell, styles.amountColumn]}>{amountColumnHeader}</Text>
      <Text style={[styles.headerCell, styles.dateColumn]}>Ngày tạo</Text>
      {isPaidModal && (
        <Text style={[styles.headerCell, styles.documentColumn]}>Số chứng từ</Text>
      )}
      <Text style={[styles.headerCell, styles.creatorColumn]}>Người tạo</Text>
      {shouldShowPaymentCodeColumn && (
        <Text style={[styles.headerCell, styles.paymentCodeColumn]}>Mã thanh toán định danh</Text>
      )}
    </View>
  );

  const renderTableRow = (item: FinanceItem, index: number) => {
    // Thử các trường khác nhau để tìm số tiền đúng
    const amount = item.SOTIEN || item.SOTIENPHAINOP || 0;
    const paymentCode = item.MATHANHTOANDINHDANH;
    const paymentAmount = item.SOTIENGACHNO || item.SOTIENPHAINOP || item.SOTIEN || 0;
    const paymentContent = item.NOIDUNG || item.TAICHINH_CACKHOANTHU_TEN || '';
    
    return (
      <View key={item.ID} style={[styles.tableRow, index % 2 === 0 && styles.evenRow]}>
        <Text style={[styles.cell, styles.sttColumn]}>{index + 1}</Text>
        <Text style={[styles.cell, styles.termColumn]}>{item.DAOTAO_THOIGIANDAOTAO_HOCKY || ''}</Text>
        <Text style={[styles.cell, styles.dotColumn]}>{item.DAOTAO_THOIGIANDAOTAO_DOT || ''}</Text>
        <Text style={[styles.cell, styles.typeColumn]}>{item.TAICHINH_CACKHOANTHU_TEN || ''}</Text>
        <Text style={[styles.cell, styles.contentColumn]} numberOfLines={2}>
          {item.NOIDUNG || ''}
        </Text>
        <Text style={[styles.cell, styles.amountColumn, styles.amountText]}>
          {financeService.formatCurrency(amount)}
        </Text>
        <Text style={[styles.cell, styles.dateColumn]}>{item.NGAYTAO_DD_MM_YYYY || ''}</Text>
        {isPaidModal && (
          <Text style={[styles.cell, styles.documentColumn]}>{item.CHUNGTU_SO || ''}</Text>
        )}
        <Text style={[styles.cell, styles.creatorColumn]} numberOfLines={1}>
          {item.NGUOITAO_TENDAYDU || ''}
        </Text>
        {shouldShowPaymentCodeColumn && (
          <View style={styles.paymentCodeColumn}>
            {paymentCode ? (
              <TouchableOpacity
                style={styles.paymentCodeButton}
                onPress={() => onPaymentCodePress?.('', paymentCode, paymentAmount, paymentContent)}
                activeOpacity={0.7}
              >
                <Text style={styles.paymentCodeText} numberOfLines={1}>
                  {paymentCode}
                </Text>
                <MaterialIcons name="qr-code" size={14} color="#3B82F6" />
              </TouchableOpacity>
            ) : (
              <Text style={[styles.cell, styles.paymentCodeEmpty]}>-</Text>
            )}
          </View>
        )}
      </View>
    );
  };

  const renderTotalRow = () => (
    <View style={[styles.tableRow, styles.totalRow]}>
      <Text style={[styles.cell, styles.sttColumn]}></Text>
      <Text style={[styles.cell, styles.termColumn]}></Text>
      <Text style={[styles.cell, styles.dotColumn]}></Text>
      <Text style={[styles.cell, styles.typeColumn]}></Text>
      <Text style={[styles.cell, styles.contentColumn, styles.totalLabel]}>Tổng</Text>
      <Text style={[styles.cell, styles.amountColumn, styles.totalAmount]}>
        {financeService.formatCurrency(totalAmount)}
      </Text>
      <Text style={[styles.cell, styles.dateColumn]}></Text>
      {isPaidModal && (
        <Text style={[styles.cell, styles.documentColumn]}></Text>
      )}
      <Text style={[styles.cell, styles.creatorColumn]}></Text>
      {shouldShowPaymentCodeColumn && (
        <Text style={[styles.cell, styles.paymentCodeColumn]}></Text>
      )}
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
            <View style={[styles.tableContainer, shouldShowPaymentCodeColumn && styles.tableContainerWithPaymentCode]}>
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
    minWidth: width * 1.9,
  },
  tableContainerWithPaymentCode: {
    minWidth: width * 2.2,
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
  termColumn: {
    width: 100,
  },
  dotColumn: {
    width: 50,
  },
  typeColumn: {
    width: 140,
  },
  contentColumn: {
    width: 250,
    textAlign: 'left',
  },
  amountColumn: {
    width: 120,
  },
  paymentCodeColumn: {
    width: 160,
  },
  dateColumn: {
    width: 100,
  },
  creatorColumn: {
    width: 130,
  },
  documentColumn: {
    width: 100,
  },
  paymentCodeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  paymentCodeText: {
    fontSize: 11,
    color: '#3B82F6',
    fontWeight: '600',
    maxWidth: 130,
    textAlign: 'center',
  },
  paymentCodeEmpty: {
    textAlign: 'center',
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

export default FinanceDetailModal;