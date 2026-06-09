import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  SafeAreaView,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../contexts/ThemeContext';
import { useBooking, useCancelBooking } from '../../hooks/useBooking';
import WorkerCard from '../../components/WorkerCard';
import PriceBreakdown from '../../components/PriceBreakdown';

const STATUS_COLORS = {
  pending: '#F9A825',
  confirmed: '#1565C0',
  en_route: '#7B1FA2',
  in_progress: '#F57C00',
  completed: '#2E7D32',
  cancelled: '#C62828',
  payment_pending: '#9E9E9E',
};

const BookingDetailScreen = ({ navigation, route }) => {
  const { bookingId, paymentSuccess } = route.params || {};
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { data: booking, isLoading } = useBooking(bookingId);
  const cancelBooking = useCancelBooking();
  const [cancelLoading, setCancelLoading] = useState(false);

  const handleCancel = () => {
    Alert.alert(
      t('history.cancelBooking'),
      t('history.cancelConfirm'),
      [
        { text: t('common.no'), style: 'cancel' },
        {
          text: t('common.yes'),
          style: 'destructive',
          onPress: async () => {
            setCancelLoading(true);
            const result = await cancelBooking.mutateAsync({ id: bookingId });
            setCancelLoading(false);
            Alert.alert('', t('history.cancelledSuccessfully'));
            navigation.goBack();
          },
        },
      ],
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.loading, { color: colors.textSecondary }]}>{t('common.loading')}</Text>
      </SafeAreaView>
    );
  }

  if (!booking) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.loading, { color: colors.error }]}>Booking not found</Text>
      </SafeAreaView>
    );
  }

  const status = booking.status;
  const isUpcoming = ['pending', 'confirmed'].includes(status);
  const isCompleted = status === 'completed';
  const hasReview = !!booking.review;
  const statusColor = STATUS_COLORS[status] || colors.textSecondary;

  const scheduledDate = booking.scheduledAt ? new Date(booking.scheduledAt) : null;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.divider }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={[styles.backText, { color: colors.primary }]}>← {t('common.back')}</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Booking Details</Text>
        <View style={{ width: 60 }} />
      </View>

      {/* Payment success banner */}
      {paymentSuccess && (
        <View style={[styles.successBanner, { backgroundColor: colors.successLight }]}>
          <Text style={[styles.successText, { color: colors.success }]}>
            🎉 {t('booking.paymentSuccess')} {t('booking.bookingCreated')}
          </Text>
        </View>
      )}

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Status */}
        <View
          style={[
            styles.statusCard,
            { backgroundColor: colors.surface, borderColor: statusColor, borderLeftWidth: 4 },
          ]}
        >
          <View style={styles.statusRow}>
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
            <Text style={[styles.statusText, { color: statusColor }]}>
              {t(`booking.status.${status}`)}
            </Text>
          </View>
          <Text style={[styles.bookingRef, { color: colors.textSecondary }]}>
            {t('history.bookingRef')}: #{booking.ref || bookingId?.slice(-8).toUpperCase()}
          </Text>
          {scheduledDate && (
            <Text style={[styles.scheduledDate, { color: colors.textPrimary }]}>
              📅 {scheduledDate.toDateString()} at{' '}
              {scheduledDate.toLocaleTimeString('en-NG', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: true,
              })}
            </Text>
          )}
        </View>

        {/* Service info */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Service Details</Text>
          <InfoRow icon="🧹" label="Service" value={booking.serviceName || t(`services.${booking.serviceId}`) || ''} colors={colors} />
          <InfoRow icon="📍" label={t('booking.address')} value={booking.address} colors={colors} />
          {booking.zone && <InfoRow icon="🗺️" label={t('booking.zone')} value={booking.zone} colors={colors} />}
          {booking.propertyType && <InfoRow icon="🏠" label="Property" value={booking.propertyType} colors={colors} />}
          {booking.bedrooms && <InfoRow icon="🛏️" label="Bedrooms" value={booking.bedrooms} colors={colors} />}
          {booking.preferFemaleWorker && <InfoRow icon="👩" label={t('booking.femaleOnly')} value="Yes" colors={colors} />}
        </View>

        {/* Worker */}
        {booking.worker && (
          <View style={styles.cardLabel}>
            <Text style={[styles.cardTitle, { color: colors.textPrimary, paddingHorizontal: 0 }]}>
              {t('booking.worker')}
            </Text>
            <WorkerCard worker={booking.worker} />
          </View>
        )}

        {/* Price breakdown */}
        <PriceBreakdown
          basePrice={booking.basePrice || 0}
          extrasTotal={booking.extrasTotal || 0}
          transportSurcharge={booking.transportSurcharge || 0}
          discount={booking.discount || 0}
          total={booking.totalAmount || 0}
        />

        {/* Action buttons */}
        <View style={styles.actions}>
          {isUpcoming && (
            <TouchableOpacity
              style={[styles.cancelBtn, { borderColor: colors.error }]}
              onPress={handleCancel}
              disabled={cancelLoading}
            >
              <Text style={[styles.cancelBtnText, { color: colors.error }]}>
                {cancelLoading ? t('common.loading') : t('history.cancelBooking')}
              </Text>
            </TouchableOpacity>
          )}

          {isCompleted && !hasReview && (
            <TouchableOpacity
              style={[styles.rateBtn, { backgroundColor: colors.primary }]}
              onPress={() => navigation.navigate('RateWorker', { bookingId })}
            >
              <Text style={styles.rateBtnText}>⭐ {t('history.rateWorker')}</Text>
            </TouchableOpacity>
          )}

          {isCompleted && hasReview && (
            <View style={[styles.ratedBadge, { backgroundColor: colors.successLight }]}>
              <Text style={[styles.ratedText, { color: colors.success }]}>
                ✅ {t('history.rated')} {booking.review?.rating}★
              </Text>
            </View>
          )}

          {t('history.refundNote') && isUpcoming && (
            <Text style={[styles.refundNote, { color: colors.textHint }]}>
              ℹ️ {t('history.refundNote')}
            </Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const InfoRow = ({ icon, label, value, colors }) => (
  <View style={styles.infoRow}>
    <Text style={styles.infoIcon}>{icon}</Text>
    <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{label}</Text>
    <Text style={[styles.infoValue, { color: colors.textPrimary }]} numberOfLines={2}>
      {value || '—'}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backText: { fontSize: 15, fontWeight: '600', width: 60 },
  title: { fontSize: 17, fontWeight: '700' },
  content: { padding: 16, paddingBottom: 40 },
  loading: { textAlign: 'center', marginTop: 40, fontSize: 16 },
  successBanner: {
    padding: 14,
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 12,
  },
  successText: { textAlign: 'center', fontWeight: '700', fontSize: 14 },
  statusCard: {
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 14,
  },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  statusText: { fontSize: 16, fontWeight: '800' },
  bookingRef: { fontSize: 13 },
  scheduledDate: { fontSize: 14, marginTop: 4, fontWeight: '600' },
  card: {
    borderWidth: 1.5,
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
  },
  cardTitle: { fontSize: 15, fontWeight: '700', marginBottom: 10 },
  cardLabel: { marginBottom: 14 },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
    gap: 6,
  },
  infoIcon: { fontSize: 15, width: 22 },
  infoLabel: { fontSize: 13, flex: 1 },
  infoValue: { fontSize: 13, fontWeight: '600', flex: 2, textAlign: 'right' },
  actions: { marginTop: 8 },
  cancelBtn: {
    height: 50,
    borderRadius: 25,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  cancelBtnText: { fontSize: 15, fontWeight: '700' },
  rateBtn: {
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  rateBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  ratedBadge: {
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  ratedText: { fontSize: 14, fontWeight: '700' },
  refundNote: { fontSize: 12, textAlign: 'center', marginTop: 4 },
});

export default BookingDetailScreen;
