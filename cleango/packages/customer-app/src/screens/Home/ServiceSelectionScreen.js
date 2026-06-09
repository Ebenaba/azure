import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../contexts/ThemeContext';
import { useBookingContext } from '../../contexts/BookingContext';
import { SERVICES } from '../../constants/services';
import ServiceCard from '../../components/ServiceCard';

const ServiceSelectionScreen = ({ navigation, route }) => {
  const { preselected } = route.params || {};
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { updateDraft } = useBookingContext();

  const handleSelect = (service) => {
    updateDraft({ serviceId: service.id, service });
    navigation.navigate('BookingForm', { serviceId: service.id });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.divider }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={[styles.backText, { color: colors.primary }]}>← {t('common.back')}</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          {t('booking.selectService')}
        </Text>
        <View style={{ width: 60 }} />
      </View>

      <FlatList
        data={SERVICES}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <ServiceCard
            service={item}
            onPress={() => handleSelect(item)}
            selected={preselected === item.id}
            showDetails
          />
        )}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
      />
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
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { width: 60 },
  backText: { fontSize: 15, fontWeight: '600' },
  title: { fontSize: 17, fontWeight: '700' },
  list: { padding: 16, paddingBottom: 40 },
});

export default ServiceSelectionScreen;
