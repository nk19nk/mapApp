import { MarkerImage } from '@/types';
import { Button, FlatList, Image, StyleSheet, Text, View } from 'react-native';

interface Props {
    images: MarkerImage[];
    onDelete: (imageId: number) => void;
}

export default function ImageList({ images, onDelete }: Props) {
    if (images.length === 0) {
        return <Text style={styles.empty}>Изображений пока нет</Text>;
    }

    return (
        <FlatList
            data={images}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => (
                <View style={styles.item}>
                    <Image source={{ uri: item.uri }} style={styles.image} />
                    <Button title="Удалить" color="red" onPress={() => onDelete(item.id)} />
                </View>
            )}
        />
    );
}

const styles = StyleSheet.create({
    empty: { textAlign: 'center', marginTop: 20, color: 'gray' },
    item: { marginBottom: 16 },
    image: { width: '100%', height: 200, borderRadius: 8, marginBottom: 4 },
});