import { useState, useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { paymentsApi } from '../services/api';

/**
 * Hook for initiating and verifying Paystack payments.
 *
 * Usage:
 *   const { initiate, verify, loading, error } = usePaystack();
 *   await initiate(bookingId);  // navigates to PaymentWebview screen
 */
const usePaystack = () => {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [verifyResult, setVerifyResult] = useState(null);

  /**
   * Initiate payment for a booking.
   * Navigates to the PaymentWebview screen with the authorization URL.
   */
  const initiate = useCallback(async (bookingId) => {
    setLoading(true);
    setError(null);
    try {
      const res = await paymentsApi.initiate(bookingId);
      const { authorization_url, reference, access_code } =
        res.data?.data || res.data;

      navigation.navigate('PaymentWebview', {
        authorizationUrl: authorization_url,
        reference,
        bookingId,
      });

      return { success: true, reference };
    } catch (err) {
      const msg =
        err.response?.data?.message || err.message || 'Failed to initiate payment';
      setError(msg);
      return { success: false, error: msg };
    } finally {
      setLoading(false);
    }
  }, [navigation]);

  /**
   * Verify payment after Paystack callback.
   * Call this from PaymentWebviewScreen when the callback URL is intercepted.
   */
  const verify = useCallback(async (reference) => {
    setLoading(true);
    setError(null);
    try {
      const res = await paymentsApi.verify(reference);
      const result = res.data?.data || res.data;
      setVerifyResult(result);
      return { success: true, data: result };
    } catch (err) {
      const msg =
        err.response?.data?.message || err.message || 'Payment verification failed';
      setError(msg);
      return { success: false, error: msg };
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setError(null);
    setVerifyResult(null);
    setLoading(false);
  }, []);

  return { initiate, verify, loading, error, verifyResult, reset };
};

export default usePaystack;
