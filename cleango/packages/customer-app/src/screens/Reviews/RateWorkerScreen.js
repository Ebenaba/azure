import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  Alert,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../contexts/ThemeContext';
import { reviewsApi } from '../../services/api';
import { useBooking } from '../../hooks/useBooking';
import CustomButton from '../../components/CustomButton';

const RATING_LABELS = ['terrible', 'poor', 'average', 'good', 'excellent'];

const REVIEW_TAGS = [
  { id: 'punctual', labelKey: 'review.tags.punctual', emoji: '⏰' },
  { id: 'thorough', labelKey: 'review.tags.thorough', emoji: '🔍' },
  { id: 'professional', labelKey: 'review.tags.professional', emoji: '💼' },
  { id: 'friendly', labelKey: 'review.tags.friendly', emoji: '😊' },
  { id: 'trustworthy', labelKey: 'review.tags.trustworthy', emoji: '🤝' },
  { id: 'goodAttention', labelKey: 'review.tags.goodAttention', emoji: '✨' },
  { id: 'recommended', labelKey: 'review.tags.recommended', emoji: '👍' },
];

const TIP_OPTIONS = [0, 500, 1000, 2000];

const RateWorkerScreen = ({ navigation, route }) => {
  const { bookingId } = route.params || {};
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { data: booking } = useBooking(bookingId);

  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [selectedTags, setSelectedTags] = useState([]);
  const [review, setReview] = useState('');
  const [anonymous, setAnonymous] = useState(false);
  const [tip, setTip] = useState(0);
  const [loading, setLoading] = useState(false);

  const worker = booking?.worker;
  const effectiveRating = hoveredRating || rating;
  const ratingLabel = effectiveRating > 0 ? t(`review.${RATING_LABELS[effectiveRating - 1]}`) : t('review.tapToRate');

  const toggleTag = (id) => {
    setSelectedTags((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id],
    );
  };

  const handleSubmit = async () => {
    if (rating === 0) {
      Alert.alert('', 'Please give a rating first.');
      return;
    }

    setLoading(true);
    try {
      await reviewsApi.create(bookingId, {
        rating,
        tags: selectedTags,
        comment: review.trim() || undefined,
        anonymous,
        tipAmount: tip || undefined,
      });

      Alert.alert(
        t('review.thankYou'),
        t('review.reviewHelps'),
        [{ text: t('common.done'), onPress: () => navigation.goBack() }],
      );
    } catch (err) {
      Alert.alert(t('common.error'), err.response?.data?.message || t('errors.server'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.divider }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={[styles.backText, { color: colors.primary }]}>← {t('common.back')}</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.textPrimary }]}>{t('review.title')}</Text>
        <View style={{ width: 60 }} />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {/* Worker info */}
          {worker && (
            <View style={[styles.workerCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={[styles.workerAvatar, { backgroundColor: colors.primaryFaded }]}>
                <Text style={styles.workerAvatarText}>{worker.name?.[0] || '?'}</Text>
              </View>
              <View>
                <Text style={[styles.workerName, { color: colors.textPrimary }]}>{worker.name}</Text>
                <Text style={[styles.workerSub, { color: colors.textSecondary }]}>
                  {booking?.serviceName || ''} · ⭐ {worker.rating}
                </Text>
              </View>
            </View>
          )}

          {/* Star rating */}
          <View style={styles.ratingSection}>
            <Text style={[styles.howWasIt, { color: colors.textPrimary }]}>
              {t('review.howWasIt')}
            </Text>
            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity
                  key={star}
                  onPressIn={() => setHoveredRating(star)}
                  onPressOut={() => setHoveredRating(0)}
                  onPress={() => setRating(star)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.star,
                      { color: star <= effectiveRating ? colors.starFilled : colors.starEmpty },
                    ]}
                  >
                    ★
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={[styles.ratingLabel, { color: colors.primary }]}>
              {ratingLabel}
            </Text>
          </View>

          {/* Tags */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              What made it great?
            </Text>
            <View style={styles.tagsRow}>
              {REVIEW_TAGS.map((tag) => {
                const selected = selectedTags.includes(tag.id);
                return (
                  <TouchableOpacity
                    key={tag.id}
                    style={[
                      styles.tagChip,
                      {
                        borderColor: selected ? colors.primary : colors.border,
                        backgroundColor: selected ? colors.primaryFaded : colors.surface,
                      },
                    ]}
                    onPress={() => toggleTag(tag.id)}
                  >
                    <Text style={styles.tagEmoji}>{tag.emoji}</Text>
                    <Text
                      style={[
                        styles.tagText,
                        { color: selected ? colors.primary : colors.textPrimary },
                      ]}
                    >
                      {t(tag.labelKey)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Written review */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              {t('review.writeReview')}
            </Text>
            <TextInput
              style={[
                styles.reviewInput,
                { borderColor: colors.border, backgroundColor: colors.surface, color: colors.textPrimary },
              ]}
              value={review}
              onChangeText={setReview}
              placeholder={t('review.reviewPlaceholder')}
              placeholderTextColor={colors.textHint}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          {/* Tip */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              {t('review.tipWorker')} ({t('common.optional')})
            </Text>
            <View style={styles.tipRow}>
              {TIP_OPTIONS.map((amount) => (
                <TouchableOpacity
                  key={amount}
                  style={[
                    styles.tipBtn,
                    {
                      borderColor: tip === amount ? colors.primary : colors.border,
                      backgroundColor: tip === amount ? colors.primaryFaded : colors.surface,
                    },
                  ]}
                  onPress={() => setTip(amount)}
                >
                  <Text
                    style={[
                      styles.tipText,
                      { color: tip === amount ? colors.primary : colors.textPrimary },
                    ]}
                  >
                    {amount === 0 ? t('review.noTip') : `₦${amount.toLocaleString()}`}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Anonymous toggle */}
          <View
            style={[styles.anonRow, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            <View style={styles.flex1}>
              <Text style={[styles.anonLabel, { color: colors.textPrimary }]}>
                Anonymous review
              </Text>
              <Text style={[styles.anonDesc, { color: colors.textSecondary }]}>
                Your name will not be shown publicly
              </Text>
            </View>
            <Switch
              value={anonymous}
              onValueChange={setAnonymous}
              trackColor={{ false: colors.border, true: colors.primaryLight }}
              thumbColor={anonymous ? colors.primary : colors.gray400}
            />
          </View>

          {/* Submit */}
          <CustomButton
            title={t('review.submitReview')}
            onPress={handleSubmit}
            loading={loading}
            disabled={rating === 0}
            style={styles.submitBtn}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
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
  content: { padding: 20, paddingBottom: 40 },
  workerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    marginBottom: 20,
  },
  workerAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  workerAvatarText: { fontSize: 22, fontWeight: '700' },
  workerName: { fontSize: 16, fontWeight: '700' },
  workerSub: { fontSize: 13, marginTop: 2 },
  ratingSection: { alignItems: 'center', marginBottom: 24 },
  howWasIt: { fontSize: 16, fontWeight: '600', marginBottom: 16 },
  starsRow: { flexDirection: 'row', gap: 8 },
  star: { fontSize: 48 },
  ratingLabel: { fontSize: 16, fontWeight: '700', marginTop: 8 },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 15, fontWeight: '700', marginBottom: 12 },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    gap: 4,
  },
  tagEmoji: { fontSize: 15 },
  tagText: { fontSize: 13, fontWeight: '600' },
  reviewInput: {
    borderWidth: 1.5,
    borderRadius: 12,
    padding: 14,
    fontSize: 14,
    minHeight: 100,
  },
  tipRow: { flexDirection: 'row', gap: 8 },
  tipBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  tipText: { fontSize: 13, fontWeight: '600' },
  anonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1.5,
    marginBottom: 20,
  },
  flex1: { flex: 1, marginRight: 12 },
  anonLabel: { fontSize: 14, fontWeight: '600' },
  anonDesc: { fontSize: 12, marginTop: 2 },
  submitBtn: {},
});

export default RateWorkerScreen;
