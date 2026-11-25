import MapComponent from '@/components/Map';
import { useDatabase } from '@/contexts/DatabaseContext';
import { calculateDistance, requestLocationPermissions, startLocationUpdates } from '@/services/location';
import { notificationManager, requestNotificationPermissions } from '@/services/notifications';
import { MarkerData } from '@/types';
import * as Location from 'expo-location';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, View } from 'react-native';

const PROXIMITY_THRESHOLD = 50;

export default function MapScreen() {
  const router = useRouter();
  const { getMarkers, addMarker } = useDatabase();

  const [markers, setMarkers] = useState<MarkerData[]>([]);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState(false);

  const markersRef = useRef<MarkerData[]>([]);

  const loadMarkers = async () => {
    try {
      const data = await getMarkers();
      setMarkers(data);
      markersRef.current = data;
    } catch (error) {
      Alert.alert('Ошибка', 'Не удалось загрузить маркеры из БД');
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadMarkers();
    }, [])
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!mapReady) setMapError(true);
    }, 15000);
    return () => clearTimeout(timer);
  }, [mapReady]);

  useEffect(() => {
    let locationSubscription: Location.LocationSubscription;

    const setupServices = async () => {
      try {
        await requestNotificationPermissions();
        await requestLocationPermissions();

        locationSubscription = await startLocationUpdates((location) => {
          checkProximity(location, markersRef.current);
        });
      } catch (error) {
        Alert.alert('Предупреждение', 'Не удалось запустить геолокацию или уведомления. Проверьте разрешения.');
      }
    };

    setupServices();

    return () => {
      if (locationSubscription) {
        locationSubscription.remove();
      }
    };
  }, []);

  const checkProximity = (userLocation: Location.LocationObject, currentMarkers: MarkerData[]) => {
    currentMarkers.forEach((marker) => {
      const distance = calculateDistance(
        userLocation.coords.latitude,
        userLocation.coords.longitude,
        marker.latitude,
        marker.longitude
      );

      if (distance <= PROXIMITY_THRESHOLD) {
        notificationManager.showNotification(marker);
      } else {
        notificationManager.removeNotification(marker.id);
      }
    });
  };

  const handleLongPress = async (latitude: number, longitude: number) => {
    try {
      await addMarker(latitude, longitude);
      await loadMarkers();
    } catch (error) {
      Alert.alert('Ошибка', 'Не удалось сохранить маркер');
    }
  };

  const openMarker = (id: number) => {
    try {
      router.push({ pathname: '/marker/[id]', params: { id: id.toString() } });
    } catch (error) {
      Alert.alert('Ошибка', 'Не удалось открыть экран маркера');
    }
  };

  if (mapError) {
    return (
      <View style={styles.center}>
        <Text>Не удалось загрузить карту. Проверьте интернет.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapComponent
        markers={markers}
        onMapReady={() => setMapReady(true)}
        onLongPress={handleLongPress}
        onMarkerPress={openMarker}
      />

      {!mapReady && (
        <View style={styles.loading}>
          <ActivityIndicator size="large" />
          <Text>Загрузка карты...</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  loading: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
  },
});