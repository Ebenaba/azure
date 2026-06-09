import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';

import { useTheme } from '../contexts/ThemeContext';
import { useBookingContext } from '../contexts/BookingContext';

// Tab screens
import HomeScreen from '../screens/Home/HomeScreen';
import BookingHistoryScreen from '../screens/History/BookingHistoryScreen';
import BookingDetailScreen from '../screens/History/BookingDetailScreen';
import ProfileScreen from '../screens/Profile/ProfileScreen';
import SettingsScreen from '../screens/Profile/SettingsScreen';
import ActiveJobScreen from '../screens/Tracking/ActiveJobScreen';
import JobStatusScreen from '../screens/Tracking/JobStatusScreen';
import RateWorkerScreen from '../screens/Reviews/RateWorkerScreen';
import BookingNavigator from './BookingNavigator';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// ── Nested stacks for each tab ──────────────────────────────────────────────

const HomeStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="HomeMain" component={HomeScreen} />
    <Stack.Screen name="BookingNavigator" component={BookingNavigator} />
  </Stack.Navigator>
);

const BookingsStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="BookingHistory" component={BookingHistoryScreen} />
    <Stack.Screen name="BookingDetail" component={BookingDetailScreen} />
    <Stack.Screen name="RateWorker" component={RateWorkerScreen} />
  </Stack.Navigator>
);

const TrackStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="ActiveJob" component={ActiveJobScreen} />
    <Stack.Screen name="JobStatus" component={JobStatusScreen} />
  </Stack.Navigator>
);

const ProfileStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="ProfileMain" component={ProfileScreen} />
    <Stack.Screen name="Settings" component={SettingsScreen} />
  </Stack.Navigator>
);

// ── Tab icon component ────────────────────────────────────────────────────────
const TabIcon = ({ emoji, label, focused, colors, badge }) => (
  <View style={tabStyles.iconContainer}>
    <Text style={[tabStyles.emoji, focused && { transform: [{ scale: 1.15 }] }]}>
      {emoji}
    </Text>
    <Text
      style={[
        tabStyles.label,
        { color: focused ? colors.primary : colors.textHint },
      ]}
    >
      {label}
    </Text>
    {badge ? (
      <View style={[tabStyles.badge, { backgroundColor: colors.error }]}>
        <Text style={tabStyles.badgeText}>{badge}</Text>
      </View>
    ) : null}
  </View>
);

const tabStyles = StyleSheet.create({
  iconContainer: { alignItems: 'center', justifyContent: 'center', position: 'relative' },
  emoji: { fontSize: 22 },
  label: { fontSize: 10, marginTop: 2, fontWeight: '600' },
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: { color: '#FFFFFF', fontSize: 9, fontWeight: '700' },
});

// ── Main Tab Navigator ────────────────────────────────────────────────────────
const MainNavigator = () => {
  const { colors, isDark } = useTheme();
  const { hasActiveJob } = useBookingContext();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.divider,
          borderTopWidth: StyleSheet.hairlineWidth,
          height: 70,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarShowLabel: false,
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeStack}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="🏠" label="Home" focused={focused} colors={colors} />
          ),
        }}
      />
      <Tab.Screen
        name="Bookings"
        component={BookingsStack}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="📅" label="Bookings" focused={focused} colors={colors} />
          ),
        }}
      />
      <Tab.Screen
        name="Track"
        component={TrackStack}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon
              emoji="📍"
              label="Track"
              focused={focused}
              colors={colors}
              badge={hasActiveJob ? '●' : null}
            />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileStack}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="👤" label="Profile" focused={focused} colors={colors} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

export default MainNavigator;
