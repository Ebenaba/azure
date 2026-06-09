import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  SafeAreaView,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import CustomButton from '../../components/CustomButton';

const OTP_LENGTH = 6;
const RESEND_SECONDS = 60;

const OTPVerificationScreen = ({ navigation, route }) => {
  const { phone } = route.params || {};
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { verifyOTP, sendOTP } = useAuth();

  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(RESEND_SECONDS);
  const [canResend, setCanResend] = useState(false);
  const inputRef = useRef(null);
  const timerRef = useRef(null);

  // Countdown timer
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          setCanResend(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, []);

  const handleVerify = useCallback(async (codeToVerify) => {
    const c = codeToVerify || code;
    if (c.length < OTP_LENGTH) return;

    setLoading(true);
    const result = await verifyOTP(c);
    setLoading(false);

    if (result.success) {
      if (result.isNewUser) {
        navigation.replace('ProfileSetup');
      }
      // AuthContext will update state → AppNavigator handles redirect
    } else {
      setCode('');
      Alert.alert(t('common.error'), result.error || t('auth.invalidOTP'));
      inputRef.current?.focus();
    }
  }, [code, verifyOTP, navigation, t]);

  const handleCodeChange = (text) => {
    const cleaned = text.replace(/\D/g, '').slice(0, OTP_LENGTH);
    setCode(cleaned);
    // Auto-verify on last digit
    if (cleaned.length === OTP_LENGTH) {
      handleVerify(cleaned);
    }
  };

  const handleResend = async () => {
    if (!canResend) return;
    setCanResend(false);
    setCountdown(RESEND_SECONDS);
    setCode('');

    const result = await sendOTP(phone);
    if (result.success) {
      Alert.alert(t('auth.otpSent'), '');
      timerRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      Alert.alert(t('common.error'), result.error || t('errors.network'));
      setCanResend(true);
    }
  };

  // Display the code as individual boxes
  const renderCodeBoxes = () => {
    return Array.from({ length: OTP_LENGTH }).map((_, i) => {
      const char = code[i] || '';
      const isFocused = code.length === i;
      return (
        <TouchableOpacity
          key={i}
          style={[
            styles.codeBox,
            {
              borderColor: isFocused
                ? colors.primary
                : char
                ? colors.primaryLight
                : colors.border,
              backgroundColor: colors.surface,
            },
          ]}
          onPress={() => inputRef.current?.focus()}
          activeOpacity={1}
        >
          <Text style={[styles.codeChar, { color: colors.textPrimary }]}>{char}</Text>
        </TouchableOpacity>
      );
    });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
        >
          <Text style={[styles.backText, { color: colors.primary }]}>
            ← {t('common.back')}
          </Text>
        </TouchableOpacity>

        <View style={styles.content}>
          {/* Header */}
          <Text style={styles.headerEmoji}>🔐</Text>
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            {t('auth.otpTitle')}
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {t('auth.otpSubtitle')}
          </Text>
          <Text style={[styles.phone, { color: colors.primary }]}>{phone}</Text>

          {/* Code boxes */}
          <View style={styles.codeRow}>{renderCodeBoxes()}</View>

          {/* Hidden input captures keyboard */}
          <TextInput
            ref={inputRef}
            style={styles.hiddenInput}
            value={code}
            onChangeText={handleCodeChange}
            keyboardType="number-pad"
            maxLength={OTP_LENGTH}
            autoFocus
            caretHidden
          />

          {/* Verify button */}
          <CustomButton
            title={t('auth.verifyOTP')}
            onPress={() => handleVerify(code)}
            loading={loading}
            disabled={code.length < OTP_LENGTH}
            style={styles.verifyBtn}
          />

          {/* Resend */}
          <TouchableOpacity
            onPress={handleResend}
            disabled={!canResend}
            style={styles.resendBtn}
          >
            <Text
              style={[
                styles.resendText,
                { color: canResend ? colors.primary : colors.textHint },
              ]}
            >
              {canResend
                ? t('auth.resendOTP')
                : t('auth.resendIn', { seconds: countdown })}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  backBtn: { paddingHorizontal: 24, paddingVertical: 12 },
  backText: { fontSize: 15, fontWeight: '600' },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    alignItems: 'center',
    paddingTop: 20,
  },
  headerEmoji: { fontSize: 52, marginBottom: 16 },
  title: { fontSize: 26, fontWeight: '800' },
  subtitle: { fontSize: 15, marginTop: 8, textAlign: 'center' },
  phone: { fontSize: 16, fontWeight: '700', marginTop: 4 },
  codeRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 40,
    marginBottom: 12,
  },
  codeBox: {
    width: 48,
    height: 58,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  codeChar: { fontSize: 24, fontWeight: '700' },
  hiddenInput: {
    position: 'absolute',
    opacity: 0,
    height: 0,
    width: 0,
  },
  verifyBtn: { width: '100%', marginTop: 32 },
  resendBtn: { marginTop: 20, padding: 8 },
  resendText: { fontSize: 15, fontWeight: '600' },
});

export default OTPVerificationScreen;
