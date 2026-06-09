import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  Switch,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { profileApi } from '../../services/api';
import { getServiceableZones } from '../../constants/zones';
import CustomButton from '../../components/CustomButton';

const ZONES = getServiceableZones();

const ProfileSetupScreen = ({ navigation }) => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { updateUser } = useAuth();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [selectedZone, setSelectedZone] = useState(null);
  const [preferFemale, setPreferFemale] = useState(false);
  const [showZonePicker, setShowZonePicker] = useState(false);
  const [loading, setLoading] = useState(false);

  const isValid = firstName.trim().length >= 2 && lastName.trim().length >= 2;

  const handleSubmit = async () => {
    if (!isValid) return;

    setLoading(true);
    try {
      const res = await profileApi.update({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim() || undefined,
        preferFemaleWorker: preferFemale,
        defaultZoneId: selectedZone?.id,
      });
      const profile = res.data?.data || res.data;
      updateUser(profile);
    } catch (err) {
      Alert.alert(
        t('common.error'),
        err.response?.data?.message || t('errors.server'),
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    // AuthContext state already has firebaseUser → AppNavigator redirects
    updateUser({ firstName: '', lastName: '', profileComplete: false });
  };

  const inputStyle = [
    styles.input,
    { borderColor: colors.border, backgroundColor: colors.surface, color: colors.textPrimary },
  ];

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
          {/* Header */}
          <Text style={styles.headerEmoji}>🙋‍♀️</Text>
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            {t('auth.profileSetup')}
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {t('auth.profileSubtitle')}
          </Text>

          {/* First name */}
          <Text style={[styles.label, { color: colors.textPrimary }]}>
            {t('auth.firstName')} *
          </Text>
          <TextInput
            style={inputStyle}
            value={firstName}
            onChangeText={setFirstName}
            placeholder={t('auth.firstName')}
            placeholderTextColor={colors.textHint}
            autoCapitalize="words"
          />

          {/* Last name */}
          <Text style={[styles.label, { color: colors.textPrimary }]}>
            {t('auth.lastName')} *
          </Text>
          <TextInput
            style={inputStyle}
            value={lastName}
            onChangeText={setLastName}
            placeholder={t('auth.lastName')}
            placeholderTextColor={colors.textHint}
            autoCapitalize="words"
          />

          {/* Email (optional) */}
          <Text style={[styles.label, { color: colors.textPrimary }]}>
            {t('auth.emailOptional')}
          </Text>
          <TextInput
            style={inputStyle}
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            placeholderTextColor={colors.textHint}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          {/* Zone selector */}
          <Text style={[styles.label, { color: colors.textPrimary }]}>
            {t('booking.zone')} ({t('common.optional')})
          </Text>
          <TouchableOpacity
            style={[inputStyle, styles.zonePicker]}
            onPress={() => setShowZonePicker((v) => !v)}
          >
            <Text style={{ color: selectedZone ? colors.textPrimary : colors.textHint }}>
              {selectedZone ? selectedZone.name : t('booking.selectZone')}
            </Text>
            <Text>{showZonePicker ? '▲' : '▼'}</Text>
          </TouchableOpacity>

          {showZonePicker && (
            <View
              style={[
                styles.zoneList,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              {ZONES.map((z) => (
                <TouchableOpacity
                  key={z.id}
                  style={[
                    styles.zoneItem,
                    selectedZone?.id === z.id && { backgroundColor: colors.primaryFaded },
                  ]}
                  onPress={() => {
                    setSelectedZone(z);
                    setShowZonePicker(false);
                  }}
                >
                  <Text style={{ color: colors.textPrimary }}>{z.name}</Text>
                  <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{z.lga}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Female preference toggle */}
          <View
            style={[
              styles.toggleRow,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <View style={styles.toggleText}>
              <Text style={[styles.toggleLabel, { color: colors.textPrimary }]}>
                {t('auth.preferFemale')}
              </Text>
              <Text style={[styles.toggleHint, { color: colors.textSecondary }]}>
                {t('auth.preferFemaleHint')}
              </Text>
            </View>
            <Switch
              value={preferFemale}
              onValueChange={setPreferFemale}
              trackColor={{ false: colors.border, true: colors.primaryLight }}
              thumbColor={preferFemale ? colors.primary : colors.gray400}
            />
          </View>

          {/* Buttons */}
          <CustomButton
            title={t('auth.createProfile')}
            onPress={handleSubmit}
            loading={loading}
            disabled={!isValid}
            style={styles.submitBtn}
          />

          <TouchableOpacity style={styles.skipBtn} onPress={handleSkip}>
            <Text style={[styles.skipText, { color: colors.textSecondary }]}>
              {t('auth.skipForNow')}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  content: { padding: 24, paddingBottom: 40, alignItems: 'center' },
  headerEmoji: { fontSize: 48, marginBottom: 12 },
  title: { fontSize: 24, fontWeight: '800', textAlign: 'center' },
  subtitle: { fontSize: 14, textAlign: 'center', marginTop: 6, marginBottom: 28 },
  label: { fontSize: 14, fontWeight: '600', alignSelf: 'flex-start', marginBottom: 6, marginTop: 12 },
  input: {
    width: '100%',
    height: 50,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 15,
  },
  zonePicker: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
  },
  zoneList: {
    width: '100%',
    borderWidth: 1,
    borderRadius: 12,
    marginTop: 4,
    maxHeight: 200,
    overflow: 'scroll',
  },
  zoneItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E0E0E0',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 14,
    padding: 16,
    marginTop: 16,
    width: '100%',
  },
  toggleText: { flex: 1, marginRight: 12 },
  toggleLabel: { fontSize: 14, fontWeight: '600' },
  toggleHint: { fontSize: 12, marginTop: 2 },
  submitBtn: { marginTop: 24, width: '100%' },
  skipBtn: { marginTop: 14, padding: 8 },
  skipText: { fontSize: 14 },
});

export default ProfileSetupScreen;
