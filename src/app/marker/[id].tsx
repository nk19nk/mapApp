import ImageList from '@/components/ImageList';
import { useDatabase } from '@/contexts/DatabaseContext';
import { MarkerData, MarkerImage } from '@/types';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Button, StyleSheet, Text, View } from 'react-native';

export default function MarkerScreen() {
    const router = useRouter();
    const { id } = useLocalSearchParams<{ id: string }>();
    const markerId = Number(id);

    const { getMarkers, getMarkerImages, addImage, deleteImage, deleteMarker } = useDatabase();

    const [marker, setMarker] = useState<MarkerData | null>(null);
    const [images, setImages] = useState<MarkerImage[]>([]);
    const [loading, setLoading] = useState(true);

    const loadData = async () => {
        try {
            const allMarkers = await getMarkers();
            setMarker(allMarkers.find((m) => m.id === markerId) ?? null);
            setImages(await getMarkerImages(markerId));
        } catch (error) {
            Alert.alert('Ошибка', 'Не удалось загрузить данные из базы');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [id]);

    const goBack = () => {
        try {
            router.back();
        } catch (error) {
            Alert.alert('Ошибка', 'Не удалось вернуться назад');
        }
    };

    const pickImage = async () => {
        try {
            const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (!permission.granted) {
                Alert.alert('Нет доступа', 'Разрешите доступ к галерее в настройках');
                return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                quality: 0.7,
            });

            if (!result.canceled) {
                await addImage(markerId, result.assets[0].uri);
                await loadData();
            }
        } catch (error) {
            Alert.alert('Ошибка', 'Не удалось добавить изображение');
        }
    };

    const handleDeleteImage = async (imageId: number) => {
        try {
            await deleteImage(imageId);
            await loadData();
        } catch (error) {
            Alert.alert('Ошибка', 'Не удалось удалить изображение');
        }
    };

    const handleDeleteMarker = () => {
        Alert.alert('Удаление', 'Удалить маркер вместе со всеми изображениями?', [
            { text: 'Отмена', style: 'cancel' },
            {
                text: 'Удалить',
                style: 'destructive',
                onPress: async () => {
                    try {
                        await deleteMarker(markerId);
                        goBack();
                    } catch (error) {
                        Alert.alert('Ошибка', 'Не удалось удалить маркер');
                    }
                },
            },
        ]);
    };

    if (loading) {
        return (
            <View style={styles.container}>
                <ActivityIndicator size="large" />
            </View>
        );
    }

    if (!marker) {
        return (
            <View style={styles.container}>
                <Text>Маркер не найден</Text>
                <Button title="Назад к карте" onPress={goBack} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Местоположение</Text>
            <Text>Широта: {marker.latitude.toFixed(5)}</Text>
            <Text>Долгота: {marker.longitude.toFixed(5)}</Text>

            <Text style={styles.title}>Изображения ({images.length})</Text>
            <View style={styles.list}>
                <ImageList images={images} onDelete={handleDeleteImage} />
            </View>

            <Button title="Добавить изображение" onPress={pickImage} />
            <View style={{ height: 8 }} />
            <Button title="Удалить маркер" color="red" onPress={handleDeleteMarker} />
            <View style={{ height: 8 }} />
            <Button title="Назад к карте" onPress={goBack} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 16, paddingTop: 120 },
    title: { fontSize: 18, fontWeight: 'bold', marginTop: 12, marginBottom: 4 },
    list: { flex: 1, marginBottom: 12 },
});