import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  SafeAreaView,
  Dimensions,
  Platform,
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../contexts/ThemeContext';
import { useBooking } from '../../hooks/useBooking';
import useWorkerTracking from '../../hooks/useWorkerTracking';
import StatusTimeline from '../../components/StatusTimeline';

const { width: SCREEN_W } = Dimensions.get('window');

const JOB_STEPS = [
  { status: 'pending', label: 'Booked', icon: '📋' },
  { status: 'confirmed', label: 'Confirmed', icon: '✅' },
  { status: 'en_route', label: 'En Route', icon: '🚗' },
  { status: 'in_progress', label: 'In Progress', icon: '🧹' },
  { status: 'completed', label: 'Completed', icon: '🎉' },
];

const ActiveJobScreen = ({ navigation, route }) => {
  const { bookingId } = route.params || {};
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { data: booking } = useBooking(bookingId);
  const workerTracking = useWorkerTracking(booking?.workerId);
  const mapRef = useRef(null);
  const [activeTab, setActiveTab] = useState('status'); // 'status' | 'photos'

  const workerCoords =
    workerTracking.lat && workerTracking.lng
      ? { latitude: workerTracking.lat, longitude: workerTracking.lng }
      : null;

  const homeCoords = booking?.coordinates
    ? { latitude: booking.coordinates.lat, longitude: booking.coordinates.lng }
    : null;

  // Animate map to worker location
  useEffect(() => {
    if (workerCoords && mapRef.current) {
      mapRef.current.animateToRegion(
        {
          ...workerCoords,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        },
        600,
      );
    }
  }, [workerTracking.lat, workerTracking.lng]);

  const handleWhatsApp = () => {
    if (booking?.worker?.phone) {
      const phone = booking.worker.phone.replace(/^0/, '234').replace(/\s/g, '');
      Linking.openURL(`https://wa.me/${phone}`);
    }
  };

  const currentStatus = booking?.status || 'pending';
  const currentStepIndex = JOB_STEPS.findIndex((s) => s.status === currentStatus);
  const worker = booking?.worker;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Map */}
      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
          style={styles.map}
          initialRegion={
            homeCoords
              ? { ...homeCoords, latitudeDelta: 0.05, longitudeDelta: 0.05 }
              : { latitude: 10.5222, longitude: 7.4383, latitudeDelta: 0.05, longitudeDelta: 0.05 }
          }
          showsUserLocation
          showsMyLocationButton={false}
        >
          {workerCoords && (
            <Marker coordinate={workerCoords} title={worker?.name || 'Your Cleaner'}>
              <View style={[styles.workerMarker, { backgroundColor: colors.primary }]}>
                <Text style={styles.workerMarkerText}>🧹</Text>
              </View>
            </Marker>
          )}
          {homeCoords && (
            <Marker coordinate={homeCoords} title="Your Home">
              <View style={[styles.homeMarker, { backgroundColor: colors.accent }]}>
                <Text style={styles.homeMarkerText}>🏠</Text>
              </View>
            </Marker>
          )}
          {workerCoords && homeCoords && (
            <Polyline
              coordinates={[workerCoords, homeCoords]}
              strokeColor={colors.primary}
              strokeWidth={3}
              lineDashPattern={[8, 4]}
            />
          )}
        </MapView>

        {/* Status overlay on map */}
        <View style={[styles.statusOverlay, { backgroundColor: colors.surface }]}>
          <View style={[styles.statusDot, { backgroundColor: getStatusColor(currentStatus, colors) }]} />
          <Text style={[styles.statusText, { color: colors.textPrimary }]}>
            {t(`booking.status.${currentStatus}`)}
          </Text>
          {workerTracking.online && currentStatus === 'en_route' && (
            <Text style={[styles.etaText, { color: colors.textSecondary }]}>
              ETA ~{calculateETA(workerTracking, homeCoords)} {t('tracking.minutes')}
            </Text>
          )}
          {!workerTracking.online && (
            <Text style={[styles.etaText, { color: colors.textSecondary }]}>
              {t('tracking.workerOffline')}
            </Text>
          )}
        </View>
      </View>

      {/* Worker card */}
      {worker && (
        <View style={[styles.workerCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.workerAvatar, { backgroundColor: colors.primaryFaded }]}>
            <Text style={styles.workerAvatarText}>
              {worker.name?.[0]?.toUpperCase() || '?'}
            </Text>
          </View>
          <View style={styles.workerInfo}>
            <Text style={[styles.workerName, { color: colors.textPrimary }]}>{worker.name}</Text>
            <Text style={[styles.workerRating, { color: colors.textSecondary }]}>
              ⭐ {worker.rating || '5.0'} · {worker.jobsCount || 0} jobs · NIN ✓
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.whatsappBtn, { backgroundColor: '#25D366' }]}
            onPress={handleWhatsApp}
          >
            <Text style={styles.whatsappText}>💬 Chat</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Tabs */}
      <View style={[styles.tabBar, { borderBottomColor: colors.divider }]}>
        {['status', 'photos'].map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[
              styles.tab,
              activeTab === tab && { borderBottomColor: colors.primary, borderBottomWidth: 2 },
            ]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, { color: activeTab === tab ? colors.primary : colors.textSecondary }]}>
              {tab === 'status' ? t('tracking.timeline') : t('tracking.photos')}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      <ScrollView style={styles.scrollContent}>
        {activeTab === 'status' ? (
          <View style={styles.timelineContainer}>
            <StatusTimeline
              steps={JOB_STEPS.map((s, i) => ({
                ...s,
                completed: i < currentStepIndex,
                active: i === currentStepIndex,
                timestamp: booking?.timeline?.[s.status],
              }))}
            />
          </View>
        ) : (
          <View style={styles.photosContainer}>
            <PhotoTab
              title={t('tracking.beforePhoto')}
              photos={booking?.beforePhotos}
              colors={colors}
              noPhotosText={t('tracking.noPhotos')}
            />
            <PhotoTab
              title={t('tracking.afterPhoto')}
              photos={booking?.afterPhotos}
              colors={colors}
              noPhotosText={t('tracking.noPhotos')}
            />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const PhotoTab = ({ title, photos, colors, noPhotosText }) => (
  <View style={styles.photoSection}>
    <Text style={[styles.photoTitle, { color: colors.textPrimary }]}>{title}</Text>
    {!photos?.length ? (
      <Text style={[styles.noPhotos, { color: colors.textHint }]}>{noPhotosText}</Text>
    ) : (
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {photos.map((url, i) => (
          <View key={i} style={[styles.photoThumb, { backgroundColor: colors.border }]}>
            <Text>📷</Text>
          </View>
        ))}
      </ScrollView>
    )}
  </View>
);

const getStatusColor = (status, colors) => {
  const map = {
    pending: colors.statusPending,
    confirmed: colors.statusConfirmed,
    en_route: colors.statusEnRoute,
    in_progress: colors.statusInProgress,
    completed: colors.statusCompleted,
    cancelled: colors.statusCancelled,
  };
  return map[status] || colors.textSecondary;
};

const calculateETA = (workerTracking, homeCoords) => {
  if (!workerTracking.lat || !homeCoords) return '?';
  const latDiff = workerTracking.lat - homeCoords.latitude;
  const lngDiff = workerTracking.lng - homeCoords.longitude;
  const distKm = Math.sqrt(latDiff * latDiff + lngDiff * lngDiff) * 111;
  return Math.max(1, Math.round((distKm / 30) * 60)); // assume 30 km/h
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  mapContainer: { height: SCREEN_W * 0.65, position: 'relative' },
  map: { flex: 1 },
  workerMarker: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  workerMarkerText: { fontSize: 22 },
  homeMarker: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  homeMarkerText: { fontSize: 22 },
  statusOverlay: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    right: 12,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  statusText: { fontSize: 14, fontWeight: '700', flex: 1 },
  etaText: { fontSize: 13 },
  workerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginVertical: 10,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    gap: 12,
  },
  workerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  workerAvatarText: { fontSize: 20, fontWeight: '700' },
  workerInfo: { flex: 1 },
  workerName: { fontSize: 15, fontWeight: '700' },
  workerRating: { fontSize: 12, marginTop: 2 },
  whatsappBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  whatsappText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginHorizontal: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
  },
  tabText: { fontSize: 14, fontWeight: '600' },
  scrollContent: { flex: 1 },
  timelineContainer: { padding: 16 },
  photosContainer: { padding: 16 },
  photoSection: { marginBottom: 20 },
  photoTitle: { fontSize: 15, fontWeight: '700', marginBottom: 10 },
  noPhotos: { fontSize: 14, fontStyle: 'italic' },
  photoThumb: {
    width: 100,
    height: 100,
    borderRadius: 10,
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default ActiveJobScreen;
