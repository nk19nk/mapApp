import { MarkerData } from '@/types';
import * as Notifications from 'expo-notifications';

Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
    }),
});

export const requestNotificationPermissions = async () => {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
    }

    if (finalStatus !== 'granted') {
        throw new Error('Доступ к уведомлениям не разрешён');
    }
};

interface ActiveNotification {
    markerId: number;
    notificationId: string;
    timestamp: number;
}

class NotificationManager {
    private activeNotifications: Map<number, ActiveNotification>;

    constructor() {
        this.activeNotifications = new Map();
    }

    async showNotification(marker: MarkerData): Promise<void> {
        if (this.activeNotifications.has(marker.id)) {
            return;
        }

        const notificationId = await Notifications.scheduleNotificationAsync({
            content: {
                title: "Вы рядом с меткой!",
                body: `Вы находитесь рядом с сохранённой точкой.`,
            },
            trigger: null,
        });

        this.activeNotifications.set(marker.id, {
            markerId: marker.id,
            notificationId,
            timestamp: Date.now(),
        });
    }

    async removeNotification(markerId: number): Promise<void> {
        const notification = this.activeNotifications.get(markerId);
        if (notification) {
            await Notifications.cancelScheduledNotificationAsync(notification.notificationId);
            this.activeNotifications.delete(markerId);
        }
    }
}

export const notificationManager = new NotificationManager();