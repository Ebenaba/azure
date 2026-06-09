import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../contexts/ThemeContext';
import { useBookingStatus } from '../../hooks/useBooking';
import StatusTimeline from '../../components/StatusTimeline';

const JOB_STEPS = [
  { status: 'pending', labelKey: 'booking.status.pending', icon: '📋' },
  { status: 'confirmed', labelKey: 'booking.status.confirmed', icon: '✅' },
  { status: 'en_route', labelKey: 'booking.status.en_route', icon: '🚗' },
  { status: 'in_progress', labelKey: 'booking.status.in_progress', icon: '🧹' },
  { status: 'completed', labelKey: 'booking.status.completed', icon: '🎉' },
];

const JobStatusScreen = ({ navigation, route }) => {
  const { bookingId } = route.params || {};
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { status, statusData, loading } = useBookingStatus(bookingId);

  const currentIdx = JOB_STEPS.findIndex((s) => s.status === status);

  const steps = JOB_STEPS.map((s, i) => ({
    ...s,
    label: t(s.labelKey),
    completed: i < currentIdx,
    active: i === currentIdx,
    timestamp: statusData?.timeline?.[s.status],
  }));

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.divider }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={[styles.backText, { color: colors.primary }]}>← {t('common.back')}</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          {t('tracking.timeline')}
        </Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {loading ? (
          <Text style={[styles.loading, { color: colors.textSecondary }]}>{t('common.loading')}</Text>
        ) : (
          <>
            {/* Current status banner */}
            {status && (
              <View
                style={[
                  styles.currentStatus,
                  { backgroundColor: getStatusBg(status, colors), borderColor: getStatusColor(status, colors) },
                ]}
              >
                <Text style={styles.currentStatusEmoji}>
                  {JOB_STEPS.find((s) => s.status === status)?.icon || '📋'}
                </Text>
                <View>
                  <Text style={[styles.currentStatusLabel, { color: getStatusColor(status, colors) }]}>
                    Current Status
                  </Text>
                  <Text style={[styles.currentStatusValue, { color: getStatusColor(status, colors) }]}>
                    {t(`booking.status.${status}`)}
                  </Text>
                </View>
              </View>
            )}

            <StatusTimeline steps={steps} />

            {/* View full tracking if active */}
            {['en_route', 'in_progress'].includes(status) && (
              <TouchableOpacity
                style={[styles.trackBtn, { backgroundColor: colors.primary }]}
                onPress={() => navigation.navigate('ActiveJob', { bookingId })}
              >
                <Text style={styles.trackBtnText}>🗺️ {t('tracking.title')}</Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const getStatusColor = (status, colors) => {
  const m = {
    pending: colors.statusPending,
    confirmed: colors.statusConfirmed,
    en_route: colors.statusEnRoute,
    in_progress: colors.statusInProgress,
    completed: colors.statusCompleted,
    cancelled: colors.statusCancelled,
  };
  return m[status] || colors.textSecondary;
};

const getStatusBg = (status, colors) => {
  const m = {
    pending: colors.warningLight,
    confirmed: colors.secondaryFaded,
    en_route: '#F3E5F5',
    in_progress: '#FFF3E0',
    completed: colors.successLight,
    cancelled: colors.errorLight,
  };
  return m[status] || colors.surface;
};

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
  content: { padding: 20, paddingBottom: 40 },
  loading: { textAlign: 'center', marginTop: 40 },
  currentStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1.5,
    marginBottom: 24,
  },
  currentStatusEmoji: { fontSize: 32 },
  currentStatusLabel: { fontSize: 12, fontWeight: '600' },
  currentStatusValue: { fontSize: 18, fontWeight: '800', marginTop: 2 },
  trackBtn: {
    borderRadius: 25,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
  },
  trackBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});

export default JobStatusScreen;
