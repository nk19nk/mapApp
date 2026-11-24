import { createContext, useContext, useState, ReactNode } from 'react';
import { MarkerData } from '@/types';

// Что умеет наше хранилище
interface MarkersContextType {
    markers: MarkerData[];
    addMarker: (latitude: number, longitude: number) => void;
    addImage: (markerId: string, uri: string) => void;
    deleteImage: (markerId: string, imageId: string) => void;
}

const MarkersContext = createContext<MarkersContextType | null>(null);

export function MarkersProvider({ children }: { children: ReactNode }) {
    const [markers, setMarkers] = useState<MarkerData[]>([]);

    // Добавить новый маркер
    const addMarker = (latitude: number, longitude: number) => {
        const newMarker: MarkerData = {
            id: Date.now().toString(), // уникальный id из текущего времени
            latitude,
            longitude,
            images: [],
        };
        setMarkers([...markers, newMarker]);
    };

    // Добавить картинку в нужный маркер
    const addImage = (markerId: string, uri: string) => {
        setMarkers(
            markers.map((marker) =>
                marker.id === markerId
                    ? {
                        ...marker,
                        images: [...marker.images, { id: Date.now().toString(), uri }],
                    }
                    : marker
            )
        );
    };

    // Удалить картинку из маркера
    const deleteImage = (markerId: string, imageId: string) => {
        setMarkers(
            markers.map((marker) =>
                marker.id === markerId
                    ? {
                        ...marker,
                        images: marker.images.filter((img) => img.id !== imageId),
                    }
                    : marker
            )
        );
    };

    return (
        <MarkersContext.Provider value={{ markers, addMarker, addImage, deleteImage }}>
            {children}
        </MarkersContext.Provider>
    );
}

// Удобная функция, чтобы брать данные из хранилища на экранах
export function useMarkers() {
    const context = useContext(MarkersContext);
    if (!context) {
        throw new Error('useMarkers нужно использовать внутри MarkersProvider');
    }
    return context;
}