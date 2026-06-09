import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../contexts/ThemeContext';
import { formatPrice } from '../constants/services';

const ServiceCard = ({ service, onPress, compact = false, showDetails = false, selected = false }) => {
  const { t } = useTranslation();
  const { colors } = useTheme();

  if (compact) {
    return (
      <TouchableOpacity
        style={[
          styles.compact,
          {
            backgroundColor: selected ? service.bgColor : colors.surface,
            borderColor: selected ? service.color : colors.border,
          },
        ]}
        onPress={onPress}
        activeOpacity={0.75}
      >
        <Text style={styles.compactEmoji}>{service.emoji}</Text>
        <Text style={[styles.compactName, { color: colors.textPrimary }]} numberOfLines={2}>
          {t(service.nameKey)}
        </Text>
        <Text style={[styles.compactPrice, { color: service.color }]}>
          {formatPrice(service.basePrice)}
        </Text>
        {service.popular && (
          <View style={[styles.popularBadgeSmall, { backgroundColor: service.color }]}>
            <Text style={styles.popularBadgeText}>🔥</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: selected ? service.color : colors.border,
          borderLeftColor: service.color,
          borderLeftWidth: 4,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      {/* Icon + Popular badge */}
      <View style={[styles.iconContainer, { backgroundColor: service.bgColor }]}>
        <Text style={styles.emoji}>{service.emoji}</Text>
      </View>

      <View style={styles.info}>
        <View style={styles.nameRow}>
          <Text style={[styles.name, { color: colors.textPrimary }]}>
            {t(service.nameKey)}
          </Text>
          {service.popular && (
            <View style={[styles.popularBadge, { backgroundColor: service.color }]}>
              <Text style={styles.popularBadgeText}>Popular</Text>
            </View>
          )}
        </View>

        <Text style={[styles.desc, { color: colors.textSecondary }]} numberOfLines={2}>
          {t(service.descKey)}
        </Text>

        <View style={styles.metaRow}>
          <Text style={[styles.price, { color: service.color }]}>
            {t('services.from')} {formatPrice(service.basePrice)}
          </Text>
          <Text style={[styles.duration, { color: colors.textHint }]}>
            ⏱ {service.durationHours}h
          </Text>
        </View>

        {/* Includes preview */}
        {showDetails && service.includes?.length > 0 && (
          <View style={styles.includesRow}>
            {service.includes.slice(0, 3).map((key) => (
              <Text key={key} style={[styles.includeItem, { color: colors.textSecondary }]}>
                ✓ {t(key)}
              </Text>
            ))}
            {service.includes.length > 3 && (
              <Text style={[styles.includeItem, { color: colors.textHint }]}>
                +{service.includes.length - 3} more
              </Text>
            )}
          </View>
        )}
      </View>

      <Text style={[styles.chevron, { color: colors.textHint }]}>›</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  // Full card
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
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  emoji: { fontSize: 28 },
  info: { flex: 1 },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
    flexWrap: 'wrap',
  },
  name: { fontSize: 15, fontWeight: '700' },
  popularBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  popularBadgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: '700' },
  desc: { fontSize: 13, lineHeight: 18, marginBottom: 6 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  price: { fontSize: 14, fontWeight: '700' },
  duration: { fontSize: 12 },
  includesRow: { marginTop: 8, gap: 2 },
  includeItem: { fontSize: 12 },
  chevron: { fontSize: 22, alignSelf: 'center' },

  // Compact 2-column card
  compact: {
    width: '48%',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'flex-start',
    position: 'relative',
    minHeight: 100,
  },
  compactEmoji: { fontSize: 30, marginBottom: 8 },
  compactName: { fontSize: 13, fontWeight: '700', lineHeight: 18, marginBottom: 4 },
  compactPrice: { fontSize: 12, fontWeight: '700' },
  popularBadgeSmall: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default ServiceCard;
