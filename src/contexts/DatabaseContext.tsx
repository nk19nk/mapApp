import * as ops from '@/database/operations';
import { initDatabase } from '@/database/schema';
import { MarkerData, MarkerImage } from '@/types';
import * as SQLite from 'expo-sqlite';
import { createContext, ReactNode, useContext, useEffect, useState } from 'react';

interface DatabaseContextType {
    addMarker: (latitude: number, longitude: number) => Promise<number>;
    deleteMarker: (id: number) => Promise<void>;
    getMarkers: () => Promise<MarkerData[]>;
    addImage: (markerId: number, uri: string) => Promise<void>;
    deleteImage: (id: number) => Promise<void>;
    getMarkerImages: (markerId: number) => Promise<MarkerImage[]>;
    isLoading: boolean;
    error: Error | null;
    retry: () => void;
}

const DatabaseContext = createContext<DatabaseContextType | null>(null);

export function DatabaseProvider({ children }: { children: ReactNode }) {
    const [db, setDb] = useState<SQLite.SQLiteDatabase | null>(null);
    const [error, setError] = useState<Error | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [attempt, setAttempt] = useState(0);

    useEffect(() => {
        let cancelled = false;
        let database: SQLite.SQLiteDatabase | null = null;

        setIsLoading(true);
        setError(null);

        initDatabase()
            .then((openedDb) => {
                if (cancelled) {
                    openedDb.closeAsync();
                    return;
                }
                database = openedDb;
                setDb(openedDb);
            })
            .catch((e) => {
                if (!cancelled) setError(e instanceof Error ? e : new Error(String(e)));
            })
            .finally(() => {
                if (!cancelled) setIsLoading(false);
            });

        return () => {
            cancelled = true;
            database?.closeAsync();
        };
    }, [attempt]);

    const getDb = () => {
        if (!db) throw new Error('База данных не подключена');
        return db;
    };

    const value: DatabaseContextType = {
        addMarker: (latitude, longitude) => ops.addMarker(getDb(), latitude, longitude),
        deleteMarker: (id) => ops.deleteMarker(getDb(), id),
        getMarkers: () => ops.getMarkers(getDb()),
        addImage: (markerId, uri) => ops.addImage(getDb(), markerId, uri),
        deleteImage: (id) => ops.deleteImage(getDb(), id),
        getMarkerImages: (markerId) => ops.getMarkerImages(getDb(), markerId),
        isLoading,
        error,
        retry: () => setAttempt(attempt + 1),
    };

    return (
        <DatabaseContext.Provider value={value}>{children}</DatabaseContext.Provider>
    );
}

export function useDatabase() {
    const context = useContext(DatabaseContext);
    if (!context) {
        throw new Error('useDatabase нужно использовать внутри DatabaseProvider');
    }
    return context;
}