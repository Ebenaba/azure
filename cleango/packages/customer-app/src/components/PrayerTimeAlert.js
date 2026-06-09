import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../contexts/ThemeContext';

/**
 * PrayerTimeAlert
 * @param {boolean} visible
 * @param {string} prayerName       - e.g. "Asr"
 * @param {string} suggestedTime    - e.g. "04:30 PM"
 * @param {function} onSuggest      - use suggested time
 * @param {function} onKeep         - keep current time
 * @param {function} onClose        - dismiss
 */
const PrayerTimeAlert = ({
  visible,
  prayerName,
  suggestedTime,
  onSuggest,
  onKeep,
  onClose,
}) => {
  const { t } = useTranslation();
  const { colors } = useTheme();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop} />
      </TouchableWithoutFeedback>

      <View style={styles.sheetWrapper} pointerEvents="box-none">
        <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
          {/* Handle */}
          <View style={[styles.handle, { backgroundColor: colors.border }]} />

          {/* Icon */}
          <Text style={styles.prayerIcon}>🕌</Text>

          {/* Title */}
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            {t('prayer.alertTitle')}
          </Text>

          {/* Body */}
          <Text style={[styles.body, { color: colors.textSecondary }]}>
            Your selected time overlaps with{' '}
            <Text style={{ fontWeight: '700', color: colors.textPrimary }}>
              {prayerName}
            </Text>{' '}
            prayer. Your cleaner may take a short break to pray.
          </Text>

          {/* Suggestion */}
          {suggestedTime && (
            <View style={[styles.suggestionBox, { backgroundColor: colors.primaryFaded, borderColor: colors.primary }]}>
              <Text style={styles.suggestionIcon}>💡</Text>
              <Text style={[styles.suggestionText, { color: colors.primary }]}>
                {t('prayer.suggestion', { suggested: suggestedTime })}
              </Text>
            </View>
          )}

          {/* Buttons */}
          <View style={styles.buttonRow}>
            {suggestedTime && (
              <TouchableOpacity
                style={[styles.suggestBtn, { backgroundColor: colors.primary }]}
                onPress={onSuggest}
                activeOpacity={0.85}
              >
                <Text style={styles.suggestBtnText}>
                  {t('booking.suggestAlternative')}
                </Text>
                {suggestedTime && (
                  <Text style={styles.suggestBtnSub}>{suggestedTime}</Text>
                )}
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.keepBtn, { borderColor: colors.border }]}
              onPress={onKeep}
              activeOpacity={0.8}
            >
              <Text style={[styles.keepBtnText, { color: colors.textSecondary }]}>
                {t('booking.confirmAnyway')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheetWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 10,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    marginBottom: 20,
  },
  prayerIcon: { fontSize: 52, marginBottom: 14 },
  title: { fontSize: 20, fontWeight: '800', textAlign: 'center', marginBottom: 10 },
  body: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 16,
  },
  suggestionBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1.5,
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
    gap: 8,
  },
  suggestionIcon: { fontSize: 18, marginTop: 1 },
  suggestionText: { flex: 1, fontSize: 14, fontWeight: '600', lineHeight: 20 },
  buttonRow: { width: '100%', gap: 10 },
  suggestBtn: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  suggestBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  suggestBtnSub: { color: 'rgba(255,255,255,0.8)', fontSize: 12, marginTop: 2 },
  keepBtn: {
    borderRadius: 14,
    borderWidth: 1.5,
    paddingVertical: 14,
    alignItems: 'center',
  },
  keepBtnText: { fontSize: 15, fontWeight: '600' },
});

export default PrayerTimeAlert;
