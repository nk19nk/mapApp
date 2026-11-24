// Маркер (строка из таблицы markers)
export interface MarkerData {
    id: number;
    latitude: number;
    longitude: number;
    created_at: string;
}

// Изображение (строка из таблицы marker_images)
export interface MarkerImage {
    id: number;
    marker_id: number;
    uri: string;
    created_at: string;
}

// Параметры навигации: id из адреса всегда приходит строкой
export type MarkerScreenParams = {
    id: string;
};