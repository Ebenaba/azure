import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  SafeAreaView,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../contexts/ThemeContext';
import usePaystack from '../../hooks/usePaystack';
import { paymentsApi } from '../../services/api';

// Paystack redirects to this after payment
const CALLBACK_URL = 'https://cleango.ng/payment/callback';
const CANCEL_URL = 'https://cleango.ng/payment/cancel';

const PaymentWebviewScreen = ({ navigation, route }) => {
  const { authorizationUrl, reference, bookingId } = route.params || {};
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { verify } = usePaystack();
  const webViewRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);

  const handleNavigationChange = async (navState) => {
    const { url } = navState;

    // Intercept Paystack callback URL
    if (url && (url.startsWith(CALLBACK_URL) || url.includes('trxref=') || url.includes('reference='))) {
      // Extract reference from URL params
      const urlRef =
        reference ||
        url.match(/[?&]trxref=([^&]+)/)?.[1] ||
        url.match(/[?&]reference=([^&]+)/)?.[1];

      if (urlRef && !verifying) {
        setVerifying(true);
        const result = await verify(urlRef);
        setVerifying(false);

        if (result.success && result.data?.status === 'success') {
          navigation.replace('Main', {
            screen: 'Bookings',
            params: {
              screen: 'BookingDetail',
              params: { bookingId, paymentSuccess: true },
            },
          });
        } else {
          Alert.alert(
            t('payment.failed'),
            t('booking.paymentFailed'),
            [
              { text: t('common.cancel'), onPress: () => navigation.goBack(), style: 'cancel' },
              { text: t('common.retry'), onPress: () => webViewRef.current?.reload() },
            ],
          );
        }
      }
      return;
    }

    // Intercept cancel URL
    if (url && url.startsWith(CANCEL_URL)) {
      Alert.alert(t('payment.cancelled'), t('booking.paymentCancelled'), [
        { text: t('common.ok'), onPress: () => navigation.goBack() },
      ]);
    }
  };

  if (!authorizationUrl) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.error }]}>
          Missing payment URL. Please go back and try again.
        </Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={{ color: colors.primary }}>← Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.divider }]}>
        <TouchableOpacity onPress={() => {
          Alert.alert('Cancel Payment', 'Are you sure you want to cancel?', [
            { text: 'No', style: 'cancel' },
            { text: 'Yes', onPress: () => navigation.goBack() },
          ]);
        }}>
          <Text style={[styles.cancelText, { color: colors.error }]}>Cancel</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
          {t('booking.paymentTitle')}
        </Text>
        <Text style={[styles.secureText, { color: colors.textSecondary }]}>🔒</Text>
      </View>

      {/* WebView */}
      <View style={styles.webViewContainer}>
        <WebView
          ref={webViewRef}
          source={{ uri: authorizationUrl }}
          onNavigationStateChange={handleNavigationChange}
          onLoadStart={() => setLoading(true)}
          onLoadEnd={() => setLoading(false)}
          javaScriptEnabled
          domStorageEnabled
          startInLoadingState
          style={styles.webView}
        />

        {/* Overlay loader */}
        {(loading || verifying) && (
          <View style={[styles.loadingOverlay, { backgroundColor: colors.surface }]}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
              {verifying ? t('booking.paymentProcessing') : t('common.loading')}
            </Text>
          </View>
        )}
      </View>

      <Text style={[styles.paystackNote, { color: colors.textHint }]}>
        {t('payment.secure')}
      </Text>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  cancelText: { fontSize: 15, fontWeight: '600' },
  headerTitle: { fontSize: 16, fontWeight: '700' },
  secureText: { fontSize: 18 },
  webViewContainer: { flex: 1, position: 'relative' },
  webView: { flex: 1 },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: { marginTop: 12, fontSize: 14 },
  paystackNote: { textAlign: 'center', fontSize: 11, paddingVertical: 8 },
  errorText: { textAlign: 'center', padding: 24, fontSize: 14 },
  backBtn: { padding: 16, alignSelf: 'center' },
});

export default PaymentWebviewScreen;
