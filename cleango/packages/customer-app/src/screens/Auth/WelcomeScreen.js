import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  StatusBar,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../contexts/ThemeContext';
import { changeLanguage } from '../../i18n';

const TRUST_BADGES = [
  { icon: '🪪', labelKey: 'home.trustSection.verified', descKey: 'home.trustSection.verifiedDesc' },
  { icon: '👩', labelKey: 'home.trustSection.female', descKey: 'home.trustSection.femaleDesc' },
  { icon: '⭐', labelKey: 'home.trustSection.rated', descKey: 'home.trustSection.ratedDesc' },
];

const WelcomeScreen = ({ navigation }) => {
  const { t, i18n } = useTranslation();
  const { colors, isDark } = useTheme();
  const [selectedLang, setSelectedLang] = useState(i18n.language || 'en');

  const handleLanguage = async (lang) => {
    setSelectedLang(lang);
    await changeLanguage(lang);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={colors.primaryDark}
        translucent={false}
      />

      {/* Hero gradient */}
      <LinearGradient
        colors={[colors.primaryDark, colors.primary, colors.primaryLight]}
        style={styles.hero}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {/* Language selector */}
        <View style={styles.langRow}>
          {['en', 'ha'].map((lang) => (
            <TouchableOpacity
              key={lang}
              style={[
                styles.langBtn,
                selectedLang === lang && styles.langBtnActive,
              ]}
              onPress={() => handleLanguage(lang)}
              activeOpacity={0.8}
            >
              <Text style={styles.langFlag}>{lang === 'en' ? '🇬🇧' : '🇳🇬'}</Text>
              <Text
                style={[
                  styles.langText,
                  selectedLang === lang && styles.langTextActive,
                ]}
              >
                {lang === 'en' ? 'EN' : 'HA'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Logo & brand */}
        <View style={styles.logoArea}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoEmoji}>🧹</Text>
          </View>
          <Text style={styles.appName}>{t('common.appName')}</Text>
          <Text style={styles.tagline}>{t('common.tagline')}</Text>
        </View>
      </LinearGradient>

      {/* Body */}
      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.bodyContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Trust badges */}
        <View style={styles.trustRow}>
          {TRUST_BADGES.map((badge) => (
            <View
              key={badge.labelKey}
              style={[styles.trustCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
            >
              <Text style={styles.trustIcon}>{badge.icon}</Text>
              <Text style={[styles.trustLabel, { color: colors.textPrimary }]}>
                {t(badge.labelKey)}
              </Text>
              <Text style={[styles.trustDesc, { color: colors.textSecondary }]}>
                {t(badge.descKey)}
              </Text>
            </View>
          ))}
        </View>

        {/* CTA buttons */}
        <TouchableOpacity
          style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
          onPress={() => navigation.navigate('PhoneLogin')}
          activeOpacity={0.85}
        >
          <Text style={styles.primaryBtnText}>{t('auth.getStarted')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.secondaryBtn, { borderColor: colors.primary }]}
          onPress={() => navigation.navigate('PhoneLogin')}
          activeOpacity={0.8}
        >
          <Text style={[styles.secondaryBtnText, { color: colors.primary }]}>
            {t('auth.alreadyHaveAccount')}{'  '}
            <Text style={styles.signInLink}>{t('auth.signIn')}</Text>
          </Text>
        </TouchableOpacity>

        {/* Terms note */}
        <Text style={[styles.terms, { color: colors.textHint }]}>
          {t('auth.termsAgreement')}{' '}
          <Text style={{ color: colors.primary, textDecorationLine: 'underline' }}>
            {t('auth.termsOfService')}
          </Text>{' '}
          &{' '}
          <Text style={{ color: colors.primary, textDecorationLine: 'underline' }}>
            {t('auth.privacyPolicy')}
          </Text>
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  hero: {
    paddingTop: 50,
    paddingBottom: 40,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  langRow: {
    flexDirection: 'row',
    alignSelf: 'flex-end',
    marginBottom: 24,
    gap: 8,
  },
  langBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    gap: 4,
  },
  langBtnActive: {
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  langFlag: { fontSize: 16 },
  langText: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.75)' },
  langTextActive: { color: '#FFFFFF' },
  logoArea: { alignItems: 'center', marginTop: 8 },
  logoCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  logoEmoji: { fontSize: 44 },
  appName: {
    fontSize: 40,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  tagline: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
    marginTop: 8,
    maxWidth: 260,
    lineHeight: 22,
  },
  body: { flex: 1 },
  bodyContent: {
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 40,
    alignItems: 'center',
  },
  trustRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 32,
  },
  trustCard: {
    flex: 1,
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  trustIcon: { fontSize: 26, marginBottom: 6 },
  trustLabel: { fontSize: 11, fontWeight: '700', textAlign: 'center', lineHeight: 14 },
  trustDesc: { fontSize: 10, textAlign: 'center', marginTop: 2, lineHeight: 13 },
  primaryBtn: {
    width: '100%',
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  primaryBtnText: { color: '#FFFFFF', fontSize: 17, fontWeight: '700' },
  secondaryBtn: {
    width: '100%',
    height: 50,
    borderRadius: 25,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  secondaryBtnText: { fontSize: 15 },
  signInLink: { fontWeight: '700' },
  terms: { fontSize: 12, textAlign: 'center', lineHeight: 18 },
});

export default WelcomeScreen;
