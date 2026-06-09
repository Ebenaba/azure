import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { StatusBar, Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// ── i18n (must be imported early) ─────────────────────────────────────────────
import './src/i18n';

// ── Providers ─────────────────────────────────────────────────────────────────
import { ThemeProvider, useTheme } from './src/contexts/ThemeContext';
import { AuthProvider } from './src/contexts/AuthContext';
import { BookingProvider } from './src/contexts/BookingContext';

// ── Navigation ────────────────────────────────────────────────────────────────
import AppNavigator from './src/navigation/AppNavigator';

// ── Notifications setup ───────────────────────────────────────────────────────
import { setupNotificationHandlers } from './src/services/notifications';

// ── React Query client ────────────────────────────────────────────────────────
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60 * 1000,
      retry: (failureCount, error) => {
        // Don't retry on 4xx errors
        if (error?.response?.status >= 400 && error?.response?.status < 500) {
          return false;
        }
        return failureCount < 2;
      },
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 1,
    },
  },
});

// ── Background notification handler (registered at module level) ──────────────
setupNotificationHandlers({
  onForeground: (notification) => {
    // Global foreground handler — individual screens can override
    console.log('[App] Foreground notification:', notification.request.content.title);
  },
  onResponse: (response) => {
    // Deep-link handling is done per-screen via useNotifications hook
    console.log('[App] Notification tapped:', response.notification.request.content.data);
  },
});

// ── Inner app with theme access ───────────────────────────────────────────────
const ThemedApp = () => {
  const { colors, isDark } = useTheme();

  return (
    <>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={colors.background}
        translucent={Platform.OS === 'android'}
      />
      <AuthProvider>
        <BookingProvider>
          <AppNavigator />
        </BookingProvider>
      </AuthProvider>
    </>
  );
};

// ── Root ──────────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            <ThemedApp />
          </ThemeProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
