import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

// How foreground notifications are presented
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Request notification permissions from the user.
 * Returns true if granted.
 */
export const requestPermission = async () => {
  if (!Device.isDevice) return false;

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  return finalStatus === 'granted';
};

/**
 * Register device for push notifications.
 * Returns { expoPushToken, fcmToken } or null if permission denied.
 */
export const registerForPushNotifications = async () => {
  const granted = await requestPermission();
  if (!granted) return null;

  // Android notification channel
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'CleanGo',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#2E7D32',
      sound: 'default',
    });

    await Notifications.setNotificationChannelAsync('bookings', {
      name: 'Booking Updates',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#2E7D32',
      sound: 'default',
    });

    await Notifications.setNotificationChannelAsync('promotions', {
      name: 'Promotions',
      importance: Notifications.AndroidImportance.DEFAULT,
      sound: null,
    });
  }

  try {
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ||
      Constants.expoConfig?.extra?.expoProjectId;

    const expoPushTokenData = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined,
    );
    const expoPushToken = expoPushTokenData.data;

    // FCM token (Android only via getDevicePushTokenAsync)
    let fcmToken = null;
    if (Platform.OS === 'android') {
      const deviceToken = await Notifications.getDevicePushTokenAsync();
      fcmToken = deviceToken.data;
    }

    return { expoPushToken, fcmToken };
  } catch (error) {
    console.warn('[Notifications] Failed to get push token:', error);
    return null;
  }
};

/**
 * Set up notification handlers for foreground and background/tap events.
 * @param {object} handlers
 * @param {function} handlers.onForeground   - called when notification received in foreground
 * @param {function} handlers.onResponse     - called when user taps a notification
 * Returns a cleanup function.
 */
export const setupNotificationHandlers = ({ onForeground, onResponse } = {}) => {
  const foregroundSub = Notifications.addNotificationReceivedListener(
    (notification) => {
      onForeground?.(notification);
    },
  );

  const responseSub = Notifications.addNotificationResponseReceivedListener(
    (response) => {
      onResponse?.(response);
    },
  );

  // Return cleanup
  return () => {
    Notifications.removeNotificationSubscription(foregroundSub);
    Notifications.removeNotificationSubscription(responseSub);
  };
};

/**
 * Schedule a local notification.
 * @param {object} opts
 * @param {string} opts.title
 * @param {string} opts.body
 * @param {object} [opts.data]
 * @param {Date|number} [opts.triggerDate]  - Date object or seconds from now
 * @param {string} [opts.channelId]
 * @returns {string} notificationId
 */
export const scheduleLocalNotification = async ({
  title,
  body,
  data = {},
  triggerDate,
  channelId = 'default',
}) => {
  let trigger = null;

  if (triggerDate instanceof Date) {
    trigger = { date: triggerDate };
  } else if (typeof triggerDate === 'number') {
    trigger = { seconds: triggerDate };
  }

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data,
      sound: 'default',
      ...(Platform.OS === 'android' ? { channelId } : {}),
    },
    trigger,
  });

  return id;
};

/**
 * Cancel a previously scheduled notification.
 */
export const cancelNotification = (id) =>
  Notifications.cancelScheduledNotificationAsync(id);

/**
 * Cancel all scheduled notifications.
 */
export const cancelAllNotifications = () =>
  Notifications.cancelAllScheduledNotificationsAsync();

/**
 * Get the last notification that launched the app (deep-link handling).
 */
export const getLastNotificationResponse = () =>
  Notifications.getLastNotificationResponseAsync();

export default {
  requestPermission,
  registerForPushNotifications,
  setupNotificationHandlers,
  scheduleLocalNotification,
  cancelNotification,
  cancelAllNotifications,
  getLastNotificationResponse,
};
