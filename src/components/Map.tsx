import { MarkerData } from '@/types';
import { StyleSheet } from 'react-native';
import MapView, { Marker, Region } from 'react-native-maps';

interface MapComponentProps {
    markers: MarkerData[];
    onMapReady: () => void;
    onLongPress: (latitude: number, longitude: number) => void | Promise<void>;
    onMarkerPress: (id: number) => void;
}

export default function MapComponent({ markers, onMapReady, onLongPress, onMarkerPress }: MapComponentProps) {
    const initialRegion: Region = {
        latitude: 58.0105,
        longitude: 56.2502,
        latitudeDelta: 0.1,
        longitudeDelta: 0.1,
    };

    return (
        <MapView
            style={styles.map}
            showsUserLocation={true}
            showsMyLocationButton={true}
            initialRegion={initialRegion}
            onMapReady={onMapReady}
            onLongPress={(e) =>
                onLongPress(
                    e.nativeEvent.coordinate.latitude,
                    e.nativeEvent.coordinate.longitude
                )
            }
        >
            {markers.map((marker) => (
                <Marker
                    key={marker.id}
                    coordinate={{
                        latitude: marker.latitude,
                        longitude: marker.longitude,
                    }}
                    onPress={() => onMarkerPress(marker.id)}
                />
            ))}
        </MapView>
    );
}

const styles = StyleSheet.create({
    map: { flex: 1 },
});