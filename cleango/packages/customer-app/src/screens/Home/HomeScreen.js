import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { useBookingContext } from '../../contexts/BookingContext';
import { getPopularServices, SERVICES } from '../../constants/services';
import ServiceCard from '../../components/ServiceCard';
import BookingCard from '../../components/BookingCard';
import { useUpcomingBookings } from '../../hooks/useBooking';

const POPULAR = getPopularServices();
const QUICK_SERVICES = SERVICES.slice(0, 6);

const getGreeting = (hour) => {
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  if (hour < 20) return 'evening';
  return 'night';
};

const TRUST_ITEMS = [
  { emoji: '🪪', key: 'home.trustSection.verified' },
  { emoji: '👩', key: 'home.trustSection.female' },
  { emoji: '⭐', key: 'home.trustSection.rated' },
  { emoji: '🛡️', key: 'home.trustSection.insured' },
];

const isHarmattanSeason = () => {
  const m = new Date().getMonth(); // Nov(10) - Feb(1)
  return m >= 10 || m <= 1;
};

const HomeScreen = ({ navigation }) => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { user } = useAuth();
  const { activeJob } = useBookingContext();
  const hour = new Date().getHours();
  const greeting = t(`home.greeting.${getGreeting(hour)}`);
  const firstName = user?.firstName || '';

  const { data: upcomingBookings = [] } = useUpcomingBookings();

  const handleServiceSelect = (service) => {
    navigation.navigate('BookingNavigator', {
      screen: 'ServiceSelection',
      params: { preselected: service.id },
    });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={colors.background === '#121212' ? 'light-content' : 'dark-content'} />
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* ── Header ── */}
        <View style={[styles.header, { backgroundColor: colors.primary }]}>
          <View>
            <Text style={styles.greeting}>
              {greeting}{firstName ? `, ${firstName}` : ''}! 👋
            </Text>
            <Text style={styles.subGreeting}>{t('home.howCanWeHelp')}</Text>
          </View>
          <TouchableOpacity
            onPress={() => navigation.navigate('Profile')}
            style={styles.avatarBtn}
          >
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {firstName ? firstName[0].toUpperCase() : '?'}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* ── Harmattan banner ── */}
        {isHarmattanSeason() && (
          <View style={[styles.banner, { backgroundColor: colors.accentFaded, borderColor: colors.accent }]}>
            <Text style={styles.bannerEmoji}>🌬️</Text>
            <View>
              <Text style={[styles.bannerTitle, { color: colors.accentDark }]}>
                Harmattan Season!
              </Text>
              <Text style={[styles.bannerText, { color: colors.textSecondary }]}>
                Deep cleaning deals for dusty homes. Book now!
              </Text>
            </View>
          </View>
        )}

        {/* ── Active job card ── */}
        {activeJob && (
          <TouchableOpacity
            style={[styles.activeJobBanner, { backgroundColor: colors.primaryFaded, borderColor: colors.primary }]}
            onPress={() => navigation.navigate('Track', { bookingId: activeJob.id })}
          >
            <Text style={styles.activeJobEmoji}>🔴</Text>
            <View style={styles.activeJobText}>
              <Text style={[styles.activeJobTitle, { color: colors.primary }]}>
                Cleaner is {activeJob.status === 'en_route' ? 'on the way' : 'working now'}
              </Text>
              <Text style={[styles.activeJobSub, { color: colors.textSecondary }]}>
                Tap to track live →
              </Text>
            </View>
          </TouchableOpacity>
        )}

        {/* ── Welcome promo ── */}
        <View style={[styles.promoBanner, { backgroundColor: colors.primary }]}>
          <Text style={styles.promoText}>{t('home.banner.firstBooking')}</Text>
          <Text style={styles.promoCode}>{t('home.banner.useCode')}</Text>
        </View>

        {/* ── Quick services grid ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              {t('home.popularServices')}
            </Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('BookingNavigator', { screen: 'ServiceSelection' })}
            >
              <Text style={[styles.viewAll, { color: colors.primary }]}>
                {t('home.viewAll')}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.grid}>
            {QUICK_SERVICES.map((service) => (
              <ServiceCard
                key={service.id}
                service={service}
                onPress={() => handleServiceSelect(service)}
                compact
              />
            ))}
          </View>
        </View>

        {/* ── Trust badges ── */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            {t('home.trustSection.title')}
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.trustScroll}
          >
            {TRUST_ITEMS.map((item) => (
              <View
                key={item.key}
                style={[styles.trustBadge, { backgroundColor: colors.surface, borderColor: colors.border }]}
              >
                <Text style={styles.trustEmoji}>{item.emoji}</Text>
                <Text style={[styles.trustText, { color: colors.textPrimary }]}>
                  {t(item.key)}
                </Text>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* ── Upcoming booking ── */}
        {upcomingBookings.length > 0 && (
          <View style={[styles.section, styles.lastSection]}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              {t('home.upcomingBookings')}
            </Text>
            <BookingCard
              booking={upcomingBookings[0]}
              onPress={() =>
                navigation.navigate('Bookings', {
                  screen: 'BookingDetail',
                  params: { bookingId: upcomingBookings[0].id },
                })
              }
            />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
  },
  greeting: { fontSize: 22, fontWeight: '800', color: '#FFFFFF' },
  subGreeting: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  avatarBtn: {},
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#FFFFFF', fontSize: 18, fontWeight: '700' },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    gap: 10,
  },
  bannerEmoji: { fontSize: 28 },
  bannerTitle: { fontSize: 14, fontWeight: '700' },
  bannerText: { fontSize: 12, marginTop: 2 },
  activeJobBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    gap: 10,
  },
  activeJobEmoji: { fontSize: 18 },
  activeJobText: { flex: 1 },
  activeJobTitle: { fontSize: 14, fontWeight: '700' },
  activeJobSub: { fontSize: 12, marginTop: 2 },
  promoBanner: {
    marginHorizontal: 16,
    borderRadius: 14,
    padding: 16,
    marginBottom: 8,
  },
  promoText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  promoCode: { color: 'rgba(255,255,255,0.8)', fontSize: 13, marginTop: 2 },
  section: { paddingHorizontal: 16, marginTop: 20 },
  lastSection: { marginBottom: 32 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 17, fontWeight: '700' },
  viewAll: { fontSize: 14, fontWeight: '600' },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  trustScroll: { marginTop: 12 },
  trustBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 10,
    gap: 6,
  },
  trustEmoji: { fontSize: 18 },
  trustText: { fontSize: 12, fontWeight: '600' },
});

export default HomeScreen;
