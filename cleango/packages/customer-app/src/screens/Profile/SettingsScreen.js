import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Linking,
  SafeAreaView,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../contexts/ThemeContext';
import { changeLanguage } from '../../i18n';
import Constants from 'expo-constants';

const SettingsScreen = ({ navigation }) => {
  const { t, i18n } = useTranslation();
  const { colors, isDark, toggleTheme } = useTheme();
  const [currentLang, setCurrentLang] = useState(i18n.language || 'en');
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [bookingUpdates, setBookingUpdates] = useState(true);
  const [promotions, setPromotions] = useState(true);
  const [prayerReminders, setPrayerReminders] = useState(false);

  const version =
    Constants.expoConfig?.version || Constants.manifest?.version || '1.0.0';

  const handleLanguageChange = async (lang) => {
    setCurrentLang(lang);
    await changeLanguage(lang);
  };

  const handleWhatsApp = () => {
    Linking.openURL('https://wa.me/2348001234567?text=Hi+CleanGo+support');
  };

  const handleEmail = () => {
    Linking.openURL('mailto:support@cleango.ng');
  };

  const handleRateApp = () => {
    const storeUrl =
      Platform.OS === 'ios'
        ? 'https://apps.apple.com/app/cleango'
        : 'https://play.google.com/store/apps/details?id=ng.cleango.customer';
    Linking.openURL(storeUrl);
  };

  const s = [styles.card, { backgroundColor: colors.surface, borderColor: colors.border }];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.divider }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={[styles.backText, { color: colors.primary }]}>← {t('common.back')}</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.textPrimary }]}>{t('settings.title')}</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Language */}
        <SectionTitle title={t('settings.language')} colors={colors} />
        <View style={s}>
          <TouchableOpacity
            style={[styles.langOption, currentLang === 'en' && { backgroundColor: colors.primaryFaded }]}
            onPress={() => handleLanguageChange('en')}
          >
            <Text style={styles.langFlag}>🇬🇧</Text>
            <Text style={[styles.langLabel, { color: colors.textPrimary }]}>{t('settings.english')}</Text>
            {currentLang === 'en' && <Text style={[styles.checkmark, { color: colors.primary }]}>✓</Text>}
          </TouchableOpacity>
          <View style={[styles.divider, { backgroundColor: colors.divider }]} />
          <TouchableOpacity
            style={[styles.langOption, currentLang === 'ha' && { backgroundColor: colors.primaryFaded }]}
            onPress={() => handleLanguageChange('ha')}
          >
            <Text style={styles.langFlag}>🇳🇬</Text>
            <Text style={[styles.langLabel, { color: colors.textPrimary }]}>{t('settings.hausa')}</Text>
            {currentLang === 'ha' && <Text style={[styles.checkmark, { color: colors.primary }]}>✓</Text>}
          </TouchableOpacity>
        </View>

        {/* Appearance */}
        <SectionTitle title="Appearance" colors={colors} />
        <View style={s}>
          <ToggleRow
            icon="🌙"
            label={t('settings.darkMode')}
            desc={t('settings.darkModeDesc')}
            value={isDark}
            onValueChange={toggleTheme}
            colors={colors}
          />
        </View>

        {/* Notifications */}
        <SectionTitle title={t('settings.notifications')} colors={colors} />
        <View style={s}>
          <ToggleRow
            icon="🔔"
            label={t('settings.bookingUpdates')}
            value={bookingUpdates}
            onValueChange={setBookingUpdates}
            colors={colors}
          />
          <View style={[styles.divider, { backgroundColor: colors.divider }]} />
          <ToggleRow
            icon="🎁"
            label={t('settings.promotions')}
            value={promotions}
            onValueChange={setPromotions}
            colors={colors}
          />
          <View style={[styles.divider, { backgroundColor: colors.divider }]} />
          <ToggleRow
            icon="🕌"
            label={t('settings.prayerReminders')}
            value={prayerReminders}
            onValueChange={setPrayerReminders}
            colors={colors}
          />
        </View>

        {/* Support */}
        <SectionTitle title={t('settings.contactUs')} colors={colors} />
        <View style={s}>
          <ActionRow icon="💬" label={t('settings.whatsapp')} onPress={handleWhatsApp} colors={colors} />
          <View style={[styles.divider, { backgroundColor: colors.divider }]} />
          <ActionRow icon="✉️" label={t('settings.emailUs')} onPress={handleEmail} colors={colors} />
          <View style={[styles.divider, { backgroundColor: colors.divider }]} />
          <ActionRow icon="⭐" label={t('settings.rateApp')} onPress={handleRateApp} colors={colors} />
        </View>

        {/* Legal */}
        <SectionTitle title="Legal" colors={colors} />
        <View style={s}>
          <ActionRow
            icon="📄"
            label={t('settings.privacy')}
            onPress={() => Linking.openURL('https://cleango.ng/privacy')}
            colors={colors}
          />
          <View style={[styles.divider, { backgroundColor: colors.divider }]} />
          <ActionRow
            icon="📋"
            label={t('settings.terms')}
            onPress={() => Linking.openURL('https://cleango.ng/terms')}
            colors={colors}
          />
        </View>

        <Text style={[styles.version, { color: colors.textHint }]}>
          {t('common.version')} {version}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
};

const SectionTitle = ({ title, colors }) => (
  <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{title}</Text>
);

const ToggleRow = ({ icon, label, desc, value, onValueChange, colors }) => (
  <View style={styles.row}>
    <Text style={styles.rowIcon}>{icon}</Text>
    <View style={styles.rowText}>
      <Text style={[styles.rowLabel, { color: colors.textPrimary }]}>{label}</Text>
      {desc && <Text style={[styles.rowDesc, { color: colors.textSecondary }]}>{desc}</Text>}
    </View>
    <Switch
      value={value}
      onValueChange={onValueChange}
      trackColor={{ false: colors.border, true: colors.primaryLight }}
      thumbColor={value ? colors.primary : colors.gray400}
    />
  </View>
);

const ActionRow = ({ icon, label, onPress, colors }) => (
  <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.7}>
    <Text style={styles.rowIcon}>{icon}</Text>
    <Text style={[styles.rowLabel, { color: colors.textPrimary, flex: 1 }]}>{label}</Text>
    <Text style={[styles.chevron, { color: colors.textHint }]}>›</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backText: { fontSize: 15, fontWeight: '600', width: 60 },
  title: { fontSize: 17, fontWeight: '700' },
  content: { padding: 16, paddingBottom: 40 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: 20,
    marginBottom: 8,
    marginLeft: 4,
  },
  card: { borderRadius: 14, borderWidth: 1.5, overflow: 'hidden', marginBottom: 4 },
  langOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  langFlag: { fontSize: 22 },
  langLabel: { flex: 1, fontSize: 15, fontWeight: '600' },
  checkmark: { fontSize: 18, fontWeight: '700' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  rowIcon: { fontSize: 20 },
  rowText: { flex: 1 },
  rowLabel: { fontSize: 15, fontWeight: '500' },
  rowDesc: { fontSize: 12, marginTop: 1 },
  chevron: { fontSize: 22 },
  divider: { height: StyleSheet.hairlineWidth, marginLeft: 52 },
  version: { textAlign: 'center', fontSize: 12, marginTop: 28 },
});

export default SettingsScreen;
