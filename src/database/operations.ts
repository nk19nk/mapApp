import { MarkerData, MarkerImage } from '@/types';
import * as SQLite from 'expo-sqlite';

type DB = SQLite.SQLiteDatabase;

export const addMarker = async (db: DB, latitude: number, longitude: number): Promise<number> => {
    const result = await db.runAsync(
        'INSERT INTO markers (latitude, longitude) VALUES (?, ?)',
        latitude,
        longitude
    );
    return result.lastInsertRowId;
};

export const deleteMarker = async (db: DB, id: number): Promise<void> => {
    await db.withTransactionAsync(async () => {
        await db.runAsync('DELETE FROM marker_images WHERE marker_id = ?', id);
        await db.runAsync('DELETE FROM markers WHERE id = ?', id);
    });
};

export const getMarkers = async (db: DB): Promise<MarkerData[]> => {
    return await db.getAllAsync<MarkerData>('SELECT * FROM markers ORDER BY id');
};

export const addImage = async (db: DB, markerId: number, uri: string): Promise<void> => {
    await db.runAsync('INSERT INTO marker_images (marker_id, uri) VALUES (?, ?)', markerId, uri);
};

export const deleteImage = async (db: DB, id: number): Promise<void> => {
    await db.runAsync('DELETE FROM marker_images WHERE id = ?', id);
};

export const getMarkerImages = async (db: DB, markerId: number): Promise<MarkerImage[]> => {
    return await db.getAllAsync<MarkerImage>(
        'SELECT * FROM marker_images WHERE marker_id = ? ORDER BY id',
        markerId
    );
};