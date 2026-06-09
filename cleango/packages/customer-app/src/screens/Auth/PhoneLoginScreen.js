import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  SafeAreaView,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import PhoneInput from '../../components/PhoneInput';
import CustomButton from '../../components/CustomButton';

const PhoneLoginScreen = ({ navigation }) => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { sendOTP } = useAuth();
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  const isValid = phone.replace(/\D/g, '').length >= 10;

  const handleSend = async () => {
    if (!isValid) {
      Alert.alert(t('common.error'), t('auth.invalidPhone'));
      return;
    }
    setLoading(true);
    const result = await sendOTP(phone);
    setLoading(false);

    if (result.success) {
      navigation.navigate('OTPVerification', { phone });
    } else {
      Alert.alert(t('common.error'), result.error || t('errors.network'));
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          {/* Back */}
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
          >
            <Text style={[styles.backText, { color: colors.primary }]}>
              ← {t('common.back')}
            </Text>
          </TouchableOpacity>

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerEmoji}>📱</Text>
            <Text style={[styles.title, { color: colors.textPrimary }]}>
              {t('auth.welcome')}
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              {t('auth.welcomeSubtitle')}
            </Text>
          </View>

          {/* Phone input */}
          <View style={styles.inputSection}>
            <Text style={[styles.label, { color: colors.textPrimary }]}>
              {t('auth.phoneNumber')}
            </Text>
            <PhoneInput
              value={phone}
              onChangeText={setPhone}
              placeholder={t('auth.phonePlaceholder')}
            />
            <Text style={[styles.hint, { color: colors.textSecondary }]}>
              {t('auth.phoneHint')}
            </Text>
          </View>

          {/* Send button */}
          <CustomButton
            title={t('auth.sendOTP')}
            onPress={handleSend}
            loading={loading}
            disabled={!isValid}
            style={styles.sendBtn}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  content: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 40,
  },
  backBtn: { paddingVertical: 8, alignSelf: 'flex-start' },
  backText: { fontSize: 15, fontWeight: '600' },
  header: {
    alignItems: 'center',
    marginTop: 32,
    marginBottom: 40,
  },
  headerEmoji: { fontSize: 52, marginBottom: 16 },
  title: { fontSize: 26, fontWeight: '800', textAlign: 'center' },
  subtitle: { fontSize: 15, textAlign: 'center', marginTop: 8, lineHeight: 22 },
  inputSection: { marginBottom: 28 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  hint: { fontSize: 13, marginTop: 8 },
  sendBtn: { marginTop: 4 },
});

export default PhoneLoginScreen;
