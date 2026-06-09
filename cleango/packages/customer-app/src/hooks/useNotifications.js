import { useEffect, useRef } from 'react';
import { useNavigation } from '@react-navigation/native';
import {
  registerForPushNotifications,
  setupNotificationHandlers,
  getLastNotificationResponse,
} from '../services/notifications';
import { profileApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

/**
 * Set up push notifications on mount:
 * - Register device and obtain Expo + FCM tokens
 * - Post FCM token to backend
 * - Handle foreground notifications
 * - Navigate on notification tap
 */
const useNotifications = () => {
  const { isAuthenticated } = useAuth();
  const navigation = useNavigation();
  const cleanupRef = useRef(null);
  const tokenSentRef = useRef(false);

  useEffect(() => {
    if (!isAuthenticated) return;

    let mounted = true;

    const setup = async () => {
      // Register for push and get tokens
      const tokens = await registerForPushNotifications();

      if (!tokens || !mounted) return;

      // Post FCM / Expo token to backend (once per session)
      if (!tokenSentRef.current) {
        try {
          await profileApi.updateFCMToken(
            tokens.fcmToken || tokens.expoPushToken,
          );
          tokenSentRef.current = true;
        } catch {}
      }

      // Handle notification while app is foregrounded
      const handleForeground = (notification) => {
        const data = notification.request.content.data || {};
        // Could show an in-app toast / badge update here
        console.log('[Push] Foreground notification:', data);
      };

      // Handle tap on notification (app in background / killed)
      const handleResponse = (response) => {
        const data = response.notification.request.content.data || {};
        navigateFromNotification(data);
      };

      cleanupRef.current = setupNotificationHandlers({
        onForeground: handleForeground,
        onResponse: handleResponse,
      });

      // Handle case where app was opened via notification tap (killed state)
      const lastResponse = await getLastNotificationResponse();
      if (lastResponse && mounted) {
        const data = lastResponse.notification.request.content.data || {};
        navigateFromNotification(data);
      }
    };

    setup();

    return () => {
      mounted = false;
      cleanupRef.current?.();
    };
  }, [isAuthenticated]);

  const navigateFromNotification = (data) => {
    try {
      if (!navigation) return;

      switch (data.type) {
        case 'booking_update':
        case 'worker_assigned':
        case 'worker_en_route':
          if (data.bookingId) {
            navigation.navigate('Main', {
              screen: 'Track',
              params: { bookingId: data.bookingId },
            });
          }
          break;
        case 'job_complete':
          if (data.bookingId) {
            navigation.navigate('Main', {
              screen: 'Bookings',
              params: {
                screen: 'BookingDetail',
                params: { bookingId: data.bookingId },
              },
            });
          }
          break;
        case 'promotion':
          navigation.navigate('Main', { screen: 'Home' });
          break;
        default:
          break;
      }
    } catch {}
  };
};

export default useNotifications;
