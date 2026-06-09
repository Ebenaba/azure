import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  SafeAreaView,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../contexts/ThemeContext';
import { useUpcomingBookings, usePastBookings } from '../../hooks/useBooking';
import BookingCard from '../../components/BookingCard';

const TABS = ['upcoming', 'past'];

const BookingHistoryScreen = ({ navigation }) => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [activeTab, setActiveTab] = useState('upcoming');

  const {
    data: upcoming = [],
    isLoading: upcomingLoading,
    refetch: refetchUpcoming,
    isRefetching: upcomingRefetching,
  } = useUpcomingBookings();

  const {
    data: past = [],
    isLoading: pastLoading,
    refetch: refetchPast,
    isRefetching: pastRefetching,
  } = usePastBookings();

  const data = activeTab === 'upcoming' ? upcoming : past;
  const isLoading = activeTab === 'upcoming' ? upcomingLoading : pastLoading;
  const isRefetching = activeTab === 'upcoming' ? upcomingRefetching : pastRefetching;
  const refetch = activeTab === 'upcoming' ? refetchUpcoming : refetchPast;

  const noDataKey = activeTab === 'upcoming' ? 'history.noUpcoming' : 'history.noPast';

  const renderEmpty = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyEmoji}>{activeTab === 'upcoming' ? '📅' : '📂'}</Text>
      <Text style={[styles.emptyText, { color: colors.textPrimary }]}>{t(noDataKey)}</Text>
      {activeTab === 'upcoming' && (
        <TouchableOpacity
          style={[styles.bookNowBtn, { backgroundColor: colors.primary }]}
          onPress={() => navigation.navigate('Home')}
        >
          <Text style={styles.bookNowText}>{t('home.bookNow')}</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Page title */}
      <View style={[styles.header, { borderBottomColor: colors.divider }]}>
        <Text style={[styles.pageTitle, { color: colors.textPrimary }]}>
          {t('history.title')}
        </Text>
      </View>

      {/* Tabs */}
      <View style={[styles.tabRow, { borderBottomColor: colors.divider }]}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[
              styles.tab,
              activeTab === tab && {
                borderBottomColor: colors.primary,
                borderBottomWidth: 2.5,
              },
            ]}
            onPress={() => setActiveTab(tab)}
          >
            <Text
              style={[
                styles.tabText,
                { color: activeTab === tab ? colors.primary : colors.textSecondary },
              ]}
            >
              {t(`history.${tab}`)}
            </Text>
            {tab === 'upcoming' && upcoming.length > 0 && (
              <View style={[styles.badge, { backgroundColor: colors.primary }]}>
                <Text style={styles.badgeText}>{upcoming.length}</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={data}
        keyExtractor={(item) => item.id || item._id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        ListEmptyComponent={!isLoading ? renderEmpty() : null}
        renderItem={({ item }) => (
          <BookingCard
            booking={item}
            onPress={() =>
              navigation.navigate('BookingDetail', { bookingId: item.id || item._id })
            }
            style={styles.card}
          />
        )}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  pageTitle: { fontSize: 22, fontWeight: '800' },
  tabRow: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 20,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    marginRight: 28,
    gap: 6,
  },
  tabText: { fontSize: 15, fontWeight: '600' },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  badgeText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
  list: { padding: 16, paddingBottom: 40 },
  card: { marginBottom: 0 },
  emptyState: { alignItems: 'center', paddingTop: 60 },
  emptyEmoji: { fontSize: 56, marginBottom: 16 },
  emptyText: { fontSize: 16, fontWeight: '600', textAlign: 'center' },
  bookNowBtn: {
    marginTop: 20,
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 24,
  },
  bookNowText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
});

export default BookingHistoryScreen;
