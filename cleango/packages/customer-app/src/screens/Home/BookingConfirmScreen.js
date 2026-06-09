import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  TextInput,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../contexts/ThemeContext';
import { useBookingContext } from '../../contexts/BookingContext';
import { getServiceById } from '../../constants/services';
import { getZoneById } from '../../constants/zones';
import { useCreateBooking } from '../../hooks/useBooking';
import { promosApi } from '../../services/api';
import PriceBreakdown from '../../components/PriceBreakdown';
import CustomButton from '../../components/CustomButton';

const BookingConfirmScreen = ({ navigation }) => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { bookingDraft, clearDraft } = useBookingContext();
  const createBooking = useCreateBooking();

  const [promoCode, setPromoCode] = useState('');
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoDiscount, setPromoDiscount] = useState(0);
  const [promoError, setPromoError] = useState('');
  const [promoApplied, setPromoApplied] = useState(false);

  const service = getServiceById(bookingDraft?.serviceId);
  const zone = bookingDraft?.zone || getZoneById(bookingDraft?.zoneId);

  const extras = bookingDraft?.extras || [];
  const extrasTotal = extras.reduce((s, e) => s + (e.price || 0), 0);
  const transportSurcharge = zone?.surcharge || 0;
  const basePrice = service?.basePrice || 0;
  const subtotal = basePrice + extrasTotal + transportSurcharge;
  const total = Math.max(0, subtotal - promoDiscount);

  const handleApplyPromo = async () => {
    if (!promoCode.trim()) return;
    setPromoLoading(true);
    setPromoError('');
    try {
      const res = await promosApi.validate(promoCode.trim());
      const { discountAmount, discountType, value } = res.data?.data || res.data;
      const discount =
        discountType === 'percent'
          ? Math.round((subtotal * value) / 100)
          : discountAmount || value || 0;
      setPromoDiscount(discount);
      setPromoApplied(true);
    } catch {
      setPromoError(t('booking.invalidPromo'));
    } finally {
      setPromoLoading(false);
    }
  };

  const handlePay = async () => {
    try {
      const res = await createBooking.mutateAsync({
        serviceId: bookingDraft?.serviceId,
        scheduledAt: bookingDraft?.date,
        address: bookingDraft?.address,
        landmark: bookingDraft?.landmark,
        zoneId: zone?.id,
        propertyType: bookingDraft?.propertyType,
        bedrooms: bookingDraft?.bedrooms,
        preferFemaleWorker: bookingDraft?.preferFemale,
        specialInstructions: bookingDraft?.instructions,
        extras: extras.map((e) => e.id),
        promoCode: promoApplied ? promoCode.trim() : undefined,
      });

      const booking = res?.data || res;
      const bookingId = booking?.id || booking?._id;

      clearDraft();
      navigation.navigate('PaymentWebview', {
        bookingId,
        amount: total,
      });
    } catch (err) {
      Alert.alert(
        t('common.error'),
        err.response?.data?.message || t('booking.bookingError'),
      );
    }
  };

  if (!service) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.textPrimary, textAlign: 'center', marginTop: 40 }}>
          {t('booking.selectServiceFirst')}
        </Text>
      </SafeAreaView>
    );
  }

  const bookingDate = bookingDraft?.date ? new Date(bookingDraft.date) : null;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: colors.primaryFaded, borderColor: colors.primaryLight }]}>
          <Text style={styles.headerEmoji}>{service.emoji}</Text>
          <View>
            <Text style={[styles.serviceName, { color: colors.primary }]}>
              {t(service.nameKey)}
            </Text>
            <Text style={[styles.serviceDesc, { color: colors.textSecondary }]}>
              {bookingDate
                ? `${bookingDate.toDateString()} at ${bookingDate.toLocaleTimeString('en-NG', {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true,
                  })}`
                : '—'}
            </Text>
          </View>
        </View>

        {/* Booking details */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <DetailRow icon="📍" label={t('booking.address')} value={bookingDraft?.address} colors={colors} />
          <DetailRow icon="🗺️" label={t('booking.zone')} value={zone?.name} colors={colors} />
          <DetailRow icon="🏠" label="Property" value={bookingDraft?.propertyType} colors={colors} />
          <DetailRow icon="🛏️" label="Bedrooms" value={bookingDraft?.bedrooms} colors={colors} />
          {bookingDraft?.preferFemale && (
            <DetailRow icon="👩" label={t('booking.femaleOnly')} value="Yes" colors={colors} />
          )}
          {bookingDraft?.instructions ? (
            <DetailRow icon="📝" label={t('booking.specialInstructions')} value={bookingDraft.instructions} colors={colors} />
          ) : null}
        </View>

        {/* Extras */}
        {extras.length > 0 && (
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
              ✨ {t('services.extras.title')}
            </Text>
            {extras.map((e) => (
              <View key={e.id} style={styles.extraRow}>
                <Text style={{ color: colors.textSecondary }}>• {t(e.labelKey)}</Text>
                <Text style={{ color: colors.textPrimary }}>+₦{e.price.toLocaleString()}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Promo code */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
            🎟️ {t('booking.promoCode')}
          </Text>
          <View style={styles.promoRow}>
            <TextInput
              style={[
                styles.promoInput,
                {
                  borderColor: promoApplied ? colors.primary : colors.border,
                  backgroundColor: colors.background,
                  color: colors.textPrimary,
                },
              ]}
              value={promoCode}
              onChangeText={setPromoCode}
              placeholder="WELCOME20"
              placeholderTextColor={colors.textHint}
              autoCapitalize="characters"
              editable={!promoApplied}
            />
            <TouchableOpacity
              style={[styles.applyBtn, { backgroundColor: promoApplied ? colors.successLight : colors.primary }]}
              onPress={handleApplyPromo}
              disabled={promoApplied || promoLoading}
            >
              <Text style={[styles.applyBtnText, { color: promoApplied ? colors.primary : '#FFF' }]}>
                {promoApplied ? '✓' : t('booking.applyPromo')}
              </Text>
            </TouchableOpacity>
          </View>
          {promoError ? (
            <Text style={[styles.promoMsg, { color: colors.error }]}>{promoError}</Text>
          ) : null}
          {promoApplied ? (
            <Text style={[styles.promoMsg, { color: colors.success }]}>
              {t('booking.promoApplied')} -₦{promoDiscount.toLocaleString()}
            </Text>
          ) : null}
        </View>

        {/* Price breakdown */}
        <PriceBreakdown
          basePrice={basePrice}
          extrasTotal={extrasTotal}
          transportSurcharge={transportSurcharge}
          discount={promoDiscount}
          total={total}
        />

        {/* Pay button */}
        <CustomButton
          title={t('booking.payNow', { amount: total.toLocaleString() })}
          onPress={handlePay}
          loading={createBooking.isPending}
          style={styles.payBtn}
        />

        <Text style={[styles.secureNote, { color: colors.textHint }]}>
          🔒 {t('payment.secure')}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
};

const DetailRow = ({ icon, label, value, colors }) => (
  <View style={styles.detailRow}>
    <Text style={styles.detailIcon}>{icon}</Text>
    <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>{label}</Text>
    <Text style={[styles.detailValue, { color: colors.textPrimary }]} numberOfLines={2}>
      {value || '—'}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1.5,
    gap: 14,
    marginBottom: 14,
  },
  headerEmoji: { fontSize: 36 },
  serviceName: { fontSize: 18, fontWeight: '800' },
  serviceDesc: { fontSize: 13, marginTop: 2 },
  card: {
    borderWidth: 1.5,
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
  },
  cardTitle: { fontSize: 14, fontWeight: '700', marginBottom: 10 },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
    gap: 8,
  },
  detailIcon: { fontSize: 16, width: 22 },
  detailLabel: { fontSize: 13, flex: 1 },
  detailValue: { fontSize: 13, fontWeight: '600', flex: 2, textAlign: 'right' },
  extraRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  promoRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  promoInput: {
    flex: 1,
    height: 44,
    borderWidth: 1.5,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 14,
    letterSpacing: 1,
  },
  applyBtn: {
    height: 44,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyBtnText: { fontSize: 13, fontWeight: '700' },
  promoMsg: { fontSize: 12, marginTop: 6 },
  payBtn: { marginTop: 8 },
  secureNote: { textAlign: 'center', fontSize: 12, marginTop: 12 },
});

export default BookingConfirmScreen;
