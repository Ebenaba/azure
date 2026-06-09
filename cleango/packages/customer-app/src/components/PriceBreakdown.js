import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../contexts/ThemeContext';

/**
 * PriceBreakdown
 * @param {number} basePrice
 * @param {number} extrasTotal
 * @param {number} transportSurcharge
 * @param {number} discount
 * @param {number} total
 */
const PriceBreakdown = ({
  basePrice = 0,
  extrasTotal = 0,
  transportSurcharge = 0,
  discount = 0,
  total,
}) => {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const computedTotal = total ?? basePrice + extrasTotal + transportSurcharge - discount;

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text style={[styles.title, { color: colors.textPrimary }]}>
        💰 {t('payment.breakdown')}
      </Text>

      <LineItem
        label={t('booking.serviceFee')}
        value={basePrice}
        colors={colors}
      />

      {extrasTotal > 0 && (
        <LineItem
          label={t('booking.extrasTotal')}
          value={extrasTotal}
          colors={colors}
        />
      )}

      {transportSurcharge > 0 && (
        <LineItem
          label={t('booking.transportFee')}
          value={transportSurcharge}
          colors={colors}
        />
      )}

      {discount > 0 && (
        <LineItem
          label={t('booking.discount')}
          value={-discount}
          colors={colors}
          isDiscount
        />
      )}

      {/* Divider */}
      <View style={[styles.divider, { backgroundColor: colors.divider }]} />

      {/* Total */}
      <View style={styles.totalRow}>
        <Text style={[styles.totalLabel, { color: colors.textPrimary }]}>
          {t('booking.total')}
        </Text>
        <Text style={[styles.totalValue, { color: colors.primary }]}>
          ₦{computedTotal.toLocaleString()}
        </Text>
      </View>
    </View>
  );
};

const LineItem = ({ label, value, colors, isDiscount = false }) => (
  <View style={styles.lineItem}>
    <Text style={[styles.lineLabel, { color: colors.textSecondary }]}>{label}</Text>
    <Text
      style={[
        styles.lineValue,
        { color: isDiscount ? colors.success : colors.textPrimary },
      ]}
    >
      {isDiscount && value < 0 ? '-' : ''}₦{Math.abs(value).toLocaleString()}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    borderWidth: 1.5,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  title: { fontSize: 15, fontWeight: '700', marginBottom: 14 },
  lineItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  lineLabel: { fontSize: 14 },
  lineValue: { fontSize: 14, fontWeight: '600' },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: 10 },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: { fontSize: 16, fontWeight: '700' },
  totalValue: { fontSize: 22, fontWeight: '900' },
});

export default PriceBreakdown;
