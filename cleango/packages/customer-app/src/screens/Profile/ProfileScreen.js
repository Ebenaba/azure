import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  Share,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import Constants from 'expo-constants';

const MENU_ITEMS = [
  { key: 'editProfile', icon: '✏️', labelKey: 'profile.editProfile', screen: 'EditProfile' },
  { key: 'savedAddresses', icon: '📍', labelKey: 'profile.savedAddresses', screen: 'SavedAddresses' },
  { key: 'referral', icon: '🎁', labelKey: 'profile.referral', screen: null, action: 'referral' },
  { key: 'settings', icon: '⚙️', labelKey: 'profile.settings', screen: 'Settings' },
];

const ProfileScreen = ({ navigation }) => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { user, signOut } = useAuth();

  const version =
    Constants.expoConfig?.version || Constants.manifest?.version || '1.0.0';

  const memberSince = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-NG', {
        month: 'long',
        year: 'numeric',
      })
    : '—';

  const handleMenuItem = (item) => {
    if (item.action === 'referral') {
      handleReferral();
      return;
    }
    if (item.screen) {
      navigation.navigate(item.screen);
    }
  };

  const handleReferral = async () => {
    const code = user?.referralCode || 'CLEANGO';
    try {
      await Share.share({
        message: `Use my referral code ${code} on CleanGo to get ₦1,000 off your first booking! Download: https://cleango.ng/app`,
        title: 'CleanGo Referral',
      });
    } catch {}
  };

  const handleSignOut = () => {
    Alert.alert(
      t('auth.signOut'),
      t('auth.logoutConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('auth.signOut'),
          style: 'destructive',
          onPress: signOut,
        },
      ],
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: colors.primary }]}>
          <View style={[styles.avatarLarge, { backgroundColor: 'rgba(255,255,255,0.25)' }]}>
            <Text style={styles.avatarLargeText}>
              {user?.firstName?.[0]?.toUpperCase() || '?'}
            </Text>
          </View>
          <Text style={styles.name}>
            {user?.firstName} {user?.lastName}
          </Text>
          <Text style={styles.phone}>{user?.phone || ''}</Text>
          <Text style={styles.since}>
            {t('profile.memberSince')} {memberSince}
          </Text>
        </View>

        {/* Stats */}
        <View style={[styles.statsRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <StatItem
            value={user?.totalBookings || 0}
            label={t('profile.totalBookings')}
            colors={colors}
          />
          <View style={[styles.statDivider, { backgroundColor: colors.divider }]} />
          <StatItem
            value={user?.rating ? `${user.rating}★` : '—'}
            label="Your Rating"
            colors={colors}
          />
          <View style={[styles.statDivider, { backgroundColor: colors.divider }]} />
          <StatItem
            value={user?.totalSaved ? `₦${(user.totalSaved / 1000).toFixed(0)}k` : '₦0'}
            label={t('profile.savedAmount')}
            colors={colors}
          />
        </View>

        {/* Menu */}
        <View style={styles.menuSection}>
          {MENU_ITEMS.map((item) => (
            <TouchableOpacity
              key={item.key}
              style={[
                styles.menuItem,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
              onPress={() => handleMenuItem(item)}
              activeOpacity={0.7}
            >
              <Text style={styles.menuIcon}>{item.icon}</Text>
              <Text style={[styles.menuLabel, { color: colors.textPrimary }]}>
                {t(item.labelKey)}
              </Text>
              <Text style={[styles.menuChevron, { color: colors.textHint }]}>›</Text>
            </TouchableOpacity>
          ))}

          {/* Sign out */}
          <TouchableOpacity
            style={[
              styles.menuItem,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
            onPress={handleSignOut}
            activeOpacity={0.7}
          >
            <Text style={styles.menuIcon}>🚪</Text>
            <Text style={[styles.menuLabel, { color: colors.error }]}>
              {t('profile.logout')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Version */}
        <Text style={[styles.version, { color: colors.textHint }]}>
          CleanGo v{version}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
};

const StatItem = ({ value, label, colors }) => (
  <View style={styles.statItem}>
    <Text style={[styles.statValue, { color: colors.textPrimary }]}>{value}</Text>
    <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    alignItems: 'center',
    paddingTop: 24,
    paddingBottom: 28,
    paddingHorizontal: 24,
  },
  avatarLarge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarLargeText: { fontSize: 34, fontWeight: '700', color: '#FFFFFF' },
  name: { fontSize: 22, fontWeight: '800', color: '#FFFFFF' },
  phone: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  since: { fontSize: 12, color: 'rgba(255,255,255,0.65)', marginTop: 4 },
  statsRow: {
    flexDirection: 'row',
    margin: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 16,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: '800' },
  statLabel: { fontSize: 12, marginTop: 2, textAlign: 'center' },
  statDivider: { width: 1, marginVertical: 4 },
  menuSection: { paddingHorizontal: 16, gap: 10 },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1.5,
    gap: 12,
  },
  menuIcon: { fontSize: 22 },
  menuLabel: { flex: 1, fontSize: 15, fontWeight: '600' },
  menuChevron: { fontSize: 22, fontWeight: '300' },
  version: { textAlign: 'center', fontSize: 12, marginTop: 24, marginBottom: 16 },
});

export default ProfileScreen;
