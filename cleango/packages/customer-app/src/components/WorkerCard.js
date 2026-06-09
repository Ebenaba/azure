import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../contexts/ThemeContext';

const WorkerCard = ({ worker, onPress }) => {
  const { t } = useTranslation();
  const { colors } = useTheme();

  if (!worker) return null;

  const initials = [worker.firstName, worker.lastName]
    .filter(Boolean)
    .map((n) => n[0].toUpperCase())
    .join('') || (worker.name?.[0]?.toUpperCase() || '?');

  const displayName = worker.name || `${worker.firstName || ''} ${worker.lastName || ''}`.trim();
  const isFemale = worker.gender === 'female' || worker.gender === 'F';

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
      onPress={onPress}
      activeOpacity={onPress ? 0.75 : 1}
    >
      {/* Avatar */}
      <View style={[styles.avatarContainer, { backgroundColor: colors.primaryFaded }]}>
        <Text style={[styles.initials, { color: colors.primary }]}>{initials}</Text>
        {isFemale && (
          <View style={[styles.femaleIndicator, { backgroundColor: '#E91E63' }]}>
            <Text style={styles.femaleIcon}>♀</Text>
          </View>
        )}
      </View>

      {/* Info */}
      <View style={styles.info}>
        <View style={styles.nameRow}>
          <Text style={[styles.name, { color: colors.textPrimary }]}>{displayName}</Text>
          {worker.ninVerified && (
            <View style={[styles.verifiedBadge, { backgroundColor: colors.successLight }]}>
              <Text style={[styles.verifiedText, { color: colors.success }]}>
                ✓ {t('worker.ninVerified')}
              </Text>
            </View>
          )}
        </View>

        {/* Star rating */}
        <View style={styles.ratingRow}>
          <Text style={[styles.starIcon, { color: colors.starFilled }]}>★</Text>
          <Text style={[styles.rating, { color: colors.textPrimary }]}>
            {(worker.rating || 5.0).toFixed(1)}
          </Text>
          <Text style={[styles.jobs, { color: colors.textSecondary }]}>
            · {worker.jobsCount || worker.totalJobs || 0} {t('worker.jobs')}
          </Text>
        </View>

        {/* Trust badges */}
        <View style={styles.badgesRow}>
          {worker.ninVerified && (
            <View style={[styles.badge, { backgroundColor: colors.successLight }]}>
              <Text style={[styles.badgeText, { color: colors.success }]}>🪪 NIN</Text>
            </View>
          )}
          {worker.backgroundChecked && (
            <View style={[styles.badge, { backgroundColor: colors.secondaryFaded }]}>
              <Text style={[styles.badgeText, { color: colors.secondary }]}>✅ Checked</Text>
            </View>
          )}
          {isFemale && (
            <View style={[styles.badge, { backgroundColor: '#FCE4EC' }]}>
              <Text style={[styles.badgeText, { color: '#C2185B' }]}>👩 {t('worker.female')}</Text>
            </View>
          )}
          {worker.experience && (
            <View style={[styles.badge, { backgroundColor: colors.accentFaded }]}>
              <Text style={[styles.badgeText, { color: colors.accentDark }]}>
                {worker.experience} {t('worker.years')}
              </Text>
            </View>
          )}
        </View>
      </View>

      {onPress && <Text style={[styles.chevron, { color: colors.textHint }]}>›</Text>}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  avatarContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    position: 'relative',
  },
  initials: { fontSize: 22, fontWeight: '800' },
  femaleIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  femaleIcon: { color: '#FFFFFF', fontSize: 10, fontWeight: '700' },
  info: { flex: 1 },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
    marginBottom: 4,
  },
  name: { fontSize: 15, fontWeight: '700' },
  verifiedBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  verifiedText: { fontSize: 11, fontWeight: '700' },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginBottom: 8,
  },
  starIcon: { fontSize: 14 },
  rating: { fontSize: 14, fontWeight: '700' },
  jobs: { fontSize: 13 },
  badgesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  badgeText: { fontSize: 11, fontWeight: '600' },
  chevron: { fontSize: 22, alignSelf: 'center' },
});

export default WorkerCard;
