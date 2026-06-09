import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Switch,
  Alert,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../contexts/ThemeContext';
import { useBookingContext } from '../../contexts/BookingContext';
import { getServiceableZones } from '../../constants/zones';
import { getServiceById } from '../../constants/services';
import usePrayerTimes from '../../hooks/usePrayerTimes';
import CustomButton from '../../components/CustomButton';
import PrayerTimeAlert from '../../components/PrayerTimeAlert';

const ZONES = getServiceableZones();
const STEPS = ['Date & Time', 'Address', 'Property', 'Preferences', 'Summary'];

const PROPERTY_TYPES = ['Apartment', 'Duplex', 'Bungalow', 'Office', 'Shop'];
const BEDROOM_OPTIONS = ['Studio', '1 Bed', '2 Beds', '3 Beds', '4 Beds', '5+ Beds'];

const BookingFormScreen = ({ navigation, route }) => {
  const { serviceId } = route.params || {};
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { bookingDraft, updateDraft } = useBookingContext();

  const service = getServiceById(serviceId || bookingDraft?.serviceId);

  // Form state
  const [step, setStep] = useState(0);
  const [date, setDate] = useState(bookingDraft?.date ? new Date(bookingDraft.date) : null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [address, setAddress] = useState(bookingDraft?.address || '');
  const [zone, setZone] = useState(bookingDraft?.zone || null);
  const [landmark, setLandmark] = useState(bookingDraft?.landmark || '');
  const [propertyType, setPropertyType] = useState(bookingDraft?.propertyType || null);
  const [bedrooms, setBedrooms] = useState(bookingDraft?.bedrooms || null);
  const [preferFemale, setPreferFemale] = useState(bookingDraft?.preferFemale ?? false);
  const [instructions, setInstructions] = useState(bookingDraft?.instructions || '');
  const [selectedExtras, setSelectedExtras] = useState(bookingDraft?.extras || []);
  const [showZonePicker, setShowZonePicker] = useState(false);
  const [showPrayerAlert, setShowPrayerAlert] = useState(false);

  const prayerCheck = usePrayerTimes(date, service?.durationHours || 3);

  const toggleExtra = (extra) => {
    setSelectedExtras((prev) =>
      prev.find((e) => e.id === extra.id)
        ? prev.filter((e) => e.id !== extra.id)
        : [...prev, extra],
    );
  };

  const handleDateChange = (event, selected) => {
    setShowDatePicker(false);
    if (selected) {
      const now = new Date();
      if (selected < now) return Alert.alert('', 'Please select a future date.');
      setDate((prev) => {
        const next = new Date(selected);
        if (prev) {
          next.setHours(prev.getHours(), prev.getMinutes());
        }
        return next;
      });
    }
  };

  const handleTimeChange = (event, selected) => {
    setShowTimePicker(false);
    if (!selected) return;
    setDate((prev) => {
      const next = prev ? new Date(prev) : new Date();
      next.setHours(selected.getHours(), selected.getMinutes());
      return next;
    });
  };

  const handleNext = () => {
    if (step === 0) {
      if (!date) return Alert.alert('', t('booking.dateRequired'));
      // Check prayer overlap
      if (prayerCheck.isBlocked) {
        setShowPrayerAlert(true);
        return;
      }
    }
    if (step === 1) {
      if (!address.trim()) return Alert.alert('', t('booking.addressRequired'));
    }
    if (step < STEPS.length - 1) {
      setStep((s) => s + 1);
    } else {
      // Save draft and navigate to confirm
      updateDraft({
        date: date?.toISOString(),
        address,
        zone,
        landmark,
        propertyType,
        bedrooms,
        preferFemale,
        instructions,
        extras: selectedExtras,
        serviceId: service?.id,
      });
      navigation.navigate('BookingConfirm');
    }
  };

  const inputStyle = [
    styles.input,
    { borderColor: colors.border, backgroundColor: colors.surface, color: colors.textPrimary },
  ];

  const renderStepContent = () => {
    switch (step) {
      case 0:
        return (
          <View>
            <Text style={[styles.stepTitle, { color: colors.textPrimary }]}>
              📅 {t('booking.selectDate')}
            </Text>
            <TouchableOpacity
              style={[inputStyle, styles.pickerTrigger]}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={{ color: date ? colors.textPrimary : colors.textHint }}>
                {date ? date.toDateString() : 'Select date'}
              </Text>
              <Text>📅</Text>
            </TouchableOpacity>

            <Text style={[styles.stepTitle, { color: colors.textPrimary, marginTop: 16 }]}>
              🕐 {t('booking.selectTime')}
            </Text>
            <TouchableOpacity
              style={[inputStyle, styles.pickerTrigger]}
              onPress={() => setShowTimePicker(true)}
            >
              <Text style={{ color: date ? colors.textPrimary : colors.textHint }}>
                {date
                  ? date.toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit', hour12: true })
                  : 'Select time'}
              </Text>
              <Text>🕐</Text>
            </TouchableOpacity>

            {showDatePicker && (
              <DateTimePicker
                value={date || new Date()}
                mode="date"
                minimumDate={new Date()}
                onChange={handleDateChange}
              />
            )}
            {showTimePicker && (
              <DateTimePicker
                value={date || new Date()}
                mode="time"
                minuteInterval={15}
                onChange={handleTimeChange}
              />
            )}

            {prayerCheck.isBlocked && date && (
              <View style={[styles.warningBox, { backgroundColor: colors.warningLight, borderColor: colors.warning }]}>
                <Text style={[styles.warningText, { color: colors.accentDark }]}>
                  ⚠️ {t('booking.prayerTimeWarning', { prayers: prayerCheck.prayerName })}
                </Text>
              </View>
            )}
          </View>
        );

      case 1:
        return (
          <View>
            <Text style={[styles.stepTitle, { color: colors.textPrimary }]}>
              📍 {t('booking.address')}
            </Text>
            <TextInput
              style={[inputStyle, { height: 80, textAlignVertical: 'top', paddingTop: 12 }]}
              value={address}
              onChangeText={setAddress}
              placeholder={t('booking.addressPlaceholder')}
              placeholderTextColor={colors.textHint}
              multiline
            />
            <Text style={[styles.hint, { color: colors.textSecondary }]}>
              {t('booking.addressHint')}
            </Text>

            <Text style={[styles.stepTitle, { color: colors.textPrimary, marginTop: 16 }]}>
              🗺️ {t('booking.zone')}
            </Text>
            <TouchableOpacity
              style={[inputStyle, styles.pickerTrigger]}
              onPress={() => setShowZonePicker((v) => !v)}
            >
              <Text style={{ color: zone ? colors.textPrimary : colors.textHint }}>
                {zone ? zone.name : t('booking.selectZone')}
              </Text>
              <Text>{showZonePicker ? '▲' : '▼'}</Text>
            </TouchableOpacity>
            {showZonePicker && (
              <View style={[styles.dropList, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                {ZONES.map((z) => (
                  <TouchableOpacity
                    key={z.id}
                    style={[
                      styles.dropItem,
                      zone?.id === z.id && { backgroundColor: colors.primaryFaded },
                    ]}
                    onPress={() => { setZone(z); setShowZonePicker(false); }}
                  >
                    <Text style={{ color: colors.textPrimary }}>{z.name}</Text>
                    {z.surcharge > 0 && (
                      <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                        +₦{z.surcharge.toLocaleString()} surcharge
                      </Text>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <Text style={[styles.stepTitle, { color: colors.textPrimary, marginTop: 16 }]}>
              🏛️ {t('address.landmark')}
            </Text>
            <TextInput
              style={inputStyle}
              value={landmark}
              onChangeText={setLandmark}
              placeholder={t('address.landmarkPlaceholder')}
              placeholderTextColor={colors.textHint}
            />
          </View>
        );

      case 2:
        return (
          <View>
            <Text style={[styles.stepTitle, { color: colors.textPrimary }]}>
              🏠 Property Type
            </Text>
            <View style={styles.chipsRow}>
              {PROPERTY_TYPES.map((p) => (
                <TouchableOpacity
                  key={p}
                  style={[
                    styles.chip,
                    { borderColor: colors.border, backgroundColor: colors.surface },
                    propertyType === p && { backgroundColor: colors.primary, borderColor: colors.primary },
                  ]}
                  onPress={() => setPropertyType(p)}
                >
                  <Text style={[styles.chipText, { color: propertyType === p ? '#FFF' : colors.textPrimary }]}>
                    {p}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.stepTitle, { color: colors.textPrimary, marginTop: 20 }]}>
              🛏️ Bedrooms
            </Text>
            <View style={styles.chipsRow}>
              {BEDROOM_OPTIONS.map((b) => (
                <TouchableOpacity
                  key={b}
                  style={[
                    styles.chip,
                    { borderColor: colors.border, backgroundColor: colors.surface },
                    bedrooms === b && { backgroundColor: colors.primary, borderColor: colors.primary },
                  ]}
                  onPress={() => setBedrooms(b)}
                >
                  <Text style={[styles.chipText, { color: bedrooms === b ? '#FFF' : colors.textPrimary }]}>
                    {b}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        );

      case 3:
        return (
          <View>
            {/* Female preference */}
            <View style={[styles.toggleRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.flex1}>
                <Text style={[styles.toggleLabel, { color: colors.textPrimary }]}>
                  {t('booking.femaleOnly')}
                </Text>
                <Text style={[styles.toggleHint, { color: colors.textSecondary }]}>
                  {t('booking.femaleOnlyHint')}
                </Text>
              </View>
              <Switch
                value={preferFemale}
                onValueChange={setPreferFemale}
                trackColor={{ false: colors.border, true: colors.primaryLight }}
                thumbColor={preferFemale ? colors.primary : colors.gray400}
              />
            </View>

            {/* Add-ons */}
            {service?.extras?.length > 0 && (
              <>
                <Text style={[styles.stepTitle, { color: colors.textPrimary, marginTop: 20 }]}>
                  ✨ {t('services.extras.title')}
                </Text>
                {service.extras.map((extra) => {
                  const selected = !!selectedExtras.find((e) => e.id === extra.id);
                  return (
                    <TouchableOpacity
                      key={extra.id}
                      style={[
                        styles.extraRow,
                        { borderColor: selected ? colors.primary : colors.border, backgroundColor: colors.surface },
                      ]}
                      onPress={() => toggleExtra(extra)}
                    >
                      <View>
                        <Text style={{ color: colors.textPrimary, fontWeight: '600' }}>
                          {t(extra.labelKey)}
                        </Text>
                        <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
                          +₦{extra.price.toLocaleString()}
                        </Text>
                      </View>
                      <View style={[styles.checkbox, selected && { backgroundColor: colors.primary }]}>
                        {selected && <Text style={styles.checkmark}>✓</Text>}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </>
            )}

            {/* Instructions */}
            <Text style={[styles.stepTitle, { color: colors.textPrimary, marginTop: 20 }]}>
              📝 {t('booking.specialInstructions')}
            </Text>
            <TextInput
              style={[inputStyle, { height: 100, textAlignVertical: 'top', paddingTop: 12 }]}
              value={instructions}
              onChangeText={setInstructions}
              placeholder={t('booking.specialInstructionsPlaceholder')}
              placeholderTextColor={colors.textHint}
              multiline
            />
          </View>
        );

      case 4:
        const extrasTotal = selectedExtras.reduce((s, e) => s + e.price, 0);
        return (
          <View>
            <Text style={[styles.stepTitle, { color: colors.textPrimary }]}>
              📋 {t('booking.summary')}
            </Text>
            <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Row label="Service" value={t(service?.nameKey || '')} colors={colors} />
              <Row label="Date" value={date?.toDateString()} colors={colors} />
              <Row
                label="Time"
                value={date?.toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit', hour12: true })}
                colors={colors}
              />
              <Row label="Area" value={zone?.name || '—'} colors={colors} />
              <Row label="Property" value={propertyType || '—'} colors={colors} />
              <Row label="Bedrooms" value={bedrooms || '—'} colors={colors} />
              <Row label="Female only" value={preferFemale ? 'Yes' : 'No'} colors={colors} />
              {extrasTotal > 0 && (
                <Row label="Add-ons" value={`₦${extrasTotal.toLocaleString()}`} colors={colors} />
              )}
            </View>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Prayer time alert */}
      <PrayerTimeAlert
        visible={showPrayerAlert}
        prayerName={prayerCheck.prayerName}
        suggestedTime={prayerCheck.suggestedFormatted}
        onSuggest={() => {
          setShowPrayerAlert(false);
          if (prayerCheck.suggestedTime) {
            setDate(prayerCheck.suggestedTime);
          }
          setStep((s) => s + 1);
        }}
        onKeep={() => {
          setShowPrayerAlert(false);
          setStep((s) => s + 1);
        }}
        onClose={() => setShowPrayerAlert(false)}
      />

      {/* Progress bar */}
      <View style={styles.progressBar}>
        {STEPS.map((s, i) => (
          <View
            key={s}
            style={[
              styles.progressDot,
              {
                backgroundColor: i <= step ? colors.primary : colors.border,
                flex: i < STEPS.length - 1 ? 1 : 0,
              },
            ]}
          />
        ))}
      </View>
      <Text style={[styles.stepLabel, { color: colors.textSecondary }]}>
        Step {step + 1} of {STEPS.length}: {STEPS[step]}
      </Text>

      <KeyboardAvoidingView
        style={styles.flex1}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {renderStepContent()}
        </ScrollView>

        <View style={[styles.footer, { borderTopColor: colors.divider }]}>
          {step > 0 && (
            <TouchableOpacity
              style={[styles.prevBtn, { borderColor: colors.primary }]}
              onPress={() => setStep((s) => s - 1)}
            >
              <Text style={[styles.prevBtnText, { color: colors.primary }]}>
                ← {t('common.back')}
              </Text>
            </TouchableOpacity>
          )}
          <CustomButton
            title={step < STEPS.length - 1 ? t('common.next') : t('common.confirm')}
            onPress={handleNext}
            style={step > 0 ? styles.flexBtn : styles.fullBtn}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const Row = ({ label, value, colors }) => (
  <View style={styles.summaryRow}>
    <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>{label}</Text>
    <Text style={[styles.summaryValue, { color: colors.textPrimary }]}>{value || '—'}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex1: { flex: 1 },
  progressBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 4,
  },
  progressDot: { height: 4, borderRadius: 2, width: 20 },
  stepLabel: { paddingHorizontal: 16, paddingTop: 6, fontSize: 13 },
  content: { padding: 20, paddingBottom: 20 },
  stepTitle: { fontSize: 15, fontWeight: '700', marginBottom: 10 },
  input: {
    height: 50,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 15,
    marginBottom: 4,
  },
  pickerTrigger: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  hint: { fontSize: 12, marginBottom: 8 },
  dropList: {
    borderWidth: 1,
    borderRadius: 12,
    marginBottom: 8,
    overflow: 'hidden',
  },
  dropItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E0E0E0',
  },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  chipText: { fontSize: 13, fontWeight: '600' },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 14,
    padding: 16,
    marginBottom: 8,
  },
  flex1: { flex: 1 },
  toggleLabel: { fontSize: 14, fontWeight: '600' },
  toggleHint: { fontSize: 12, marginTop: 2 },
  extraRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderWidth: 1.5,
    borderRadius: 12,
    marginBottom: 8,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#9E9E9E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmark: { color: '#FFF', fontWeight: '700', fontSize: 14 },
  summaryCard: {
    borderWidth: 1.5,
    borderRadius: 14,
    overflow: 'hidden',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E0E0E0',
  },
  summaryLabel: { fontSize: 14 },
  summaryValue: { fontSize: 14, fontWeight: '600' },
  warningBox: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginTop: 8,
  },
  warningText: { fontSize: 13 },
  footer: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  prevBtn: {
    height: 50,
    borderRadius: 25,
    borderWidth: 1.5,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  prevBtnText: { fontSize: 15, fontWeight: '600' },
  flexBtn: { flex: 1 },
  fullBtn: { flex: 1 },
});

export default BookingFormScreen;
