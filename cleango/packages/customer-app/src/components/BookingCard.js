import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../contexts/ThemeContext';

const STATUS_COLORS = {
  pending: '#F9A825',
  confirmed: '#1565C0',
  en_route: '#7B1FA2',
  in_progress: '#F57C00',
  completed: '#2E7D32',
  cancelled: '#C62828',
  payment_pending: '#9E9E9E',
};

const STATUS_BG = {
  pending: '#FFFDE7',
  confirmed: '#E3F2FD',
  en_route: '#F3E5F5',
  in_progress: '#FFF3E0',
  completed: '#E8F5E9',
  cancelled: '#FFEBEE',
  payment_pending: '#F5F5F5',
};

const SERVICE_EMOJI = {
  regular_cleaning: '🏠',
  deep_cleaning: '✨',
  post_construction: '🏗️',
  move_in_out: '📦',
  laundry: '👕',
  carpet_sofa: '🛋️',
  office_cleaning: '🏢',
  window_cleaning: '🪟',
};

const BookingCard = ({ booking, onPress, style }) => {
  const { t } = useTranslation();
  const { colors } = useTheme();

  if (!booking) return null;

  const status = booking.status || 'pending';
  const statusColor = STATUS_COLORS[status] || colors.textSecondary;
  const statusBg = STATUS_BG[status] || colors.surface;
  const emoji = SERVICE_EMOJI[booking.serviceId] || '🧹';

  const scheduledDate = booking.scheduledAt ? new Date(booking.scheduledAt) : null;
  const dateStr = scheduledDate
    ? scheduledDate.toLocaleDateString('en-NG', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
      })
    : '—';
  const timeStr = scheduledDate
    ? scheduledDate.toLocaleTimeString('en-NG', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      })
    : '';

  const ref = booking.ref || (booking.id || booking._id || '').slice(-8).toUpperCase();

  return (
    <TouchableOpacity
      style={[
        styles.card,
        { backgroundColor: colors.surface, borderColor: colors.border },
        style,
      ]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      {/* Left icon strip */}
      <View style={[styles.iconStrip, { backgroundColor: statusBg }]}>
        <Text style={styles.emoji}>{emoji}</Text>
      </View>

      {/* Main content */}
      <View style={styles.body}>
        <View style={styles.topRow}>
          <Text style={[styles.serviceName, { color: colors.textPrimary }]} numberOfLines={1}>
            {booking.serviceName || t(`services.${booking.serviceId}`) || 'Cleaning Service'}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: statusBg }]}>
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
            <Text style={[styles.statusText, { color: statusColor }]}>
              {t(`booking.status.${status}`)}
            </Text>
          </View>
        </View>

        <Text style={[styles.ref, { color: colors.textHint }]}>#{ref}</Text>

        <View style={styles.detailRow}>
          <Text style={styles.detailIcon}>📅</Text>
          <Text style={[styles.detailText, { color: colors.textSecondary }]}>
            {dateStr}{timeStr ? ` · ${timeStr}` : ''}
          </Text>
        </View>

        {booking.worker?.name && (
          <View style={styles.detailRow}>
            <Text style={styles.detailIcon}>👩</Text>
            <Text style={[styles.detailText, { color: colors.textSecondary }]}>
              {booking.worker.name}
            </Text>
          </View>
        )}

        <View style={styles.footerRow}>
          {booking.totalAmount != null && (
            <Text style={[styles.price, { color: colors.primary }]}>
              ₦{booking.totalAmount.toLocaleString()}
            </Text>
          )}
          <Text style={[styles.chevron, { color: colors.textHint }]}>›</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    borderRadius: 16,
    borderWidth: 1.5,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  iconStrip: {
    width: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: { fontSize: 28 },
  body: { flex: 1, padding: 12 },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 2,
  },
  serviceName: { fontSize: 15, fontWeight: '700', flex: 1, marginRight: 8 },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 4,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 11, fontWeight: '700' },
  ref: { fontSize: 11, marginBottom: 6 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 3 },
  detailIcon: { fontSize: 13 },
  detailText: { fontSize: 13 },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  price: { fontSize: 16, fontWeight: '800' },
  chevron: { fontSize: 20 },
});

export default BookingCard;
