// Импортируем хуки React:
// useState — хранение состояний экрана (маркеры, статус загрузки и ошибки карты)
// useEffect — запуск побочных эффектов (таймер загрузки, подписка на GPS и пуши)
// useCallback — мемоизация функции (обязательна для useFocusEffect)
// useRef — хранение изменяемой ссылки, которая не вызывает перерисовку и обходит замыкания
import { useState, useEffect, useCallback, useRef } from 'react';
// Импортируем базовые UI-компоненты React Native
import { View, Text, StyleSheet, ActivityIndicator, Alert } from 'react-native';
// Импортируем хуки Expo Router:
// useRouter — программные переходы между экранами (router.push)
// useFocusEffect — запуск кода каждый раз, когда пользователь возвращается на этот экран
import { useRouter, useFocusEffect } from 'expo-router';
// Импорт библиотеки Expo для работы с GPS
// Импортируем библиотеку геолокации Expo (здесь нужна для типов LocationSubscription и LocationObject)
import * as Location from 'expo-location';
// Импортируем кастомный хук для работы с SQLite
import { useDatabase } from '@/contexts/DatabaseContext';
// Импортируем интерфейс данных маркера
import { MarkerData } from '@/types';
// Импорт сервисных функций для геолокации (права, подписка на GPS, формула Хаверсина)
import { requestLocationPermissions, startLocationUpdates, calculateDistance } from '@/services/location';
// Импорт менеджера уведомлений
// Импортируем синглтон-менеджер уведомлений и запрос прав на пуши
import { notificationManager, requestNotificationPermissions } from '@/services/notifications';
// Импорт UI-компонента самой карты
import MapComponent from '@/components/Map';

// Радиус срабатывания уведомления (в метрах)
const PROXIMITY_THRESHOLD = 50;
// Главный экран приложения (export default обязателен для маршрутов Expo Router)
export default function MapScreen() {
  // Объект роутера\навигации для перехода на экран деталей маркера
  const router = useRouter();
  // Достаём из контекста БД только нужные на этом экране методы (получить все и добавить новый)
  //деструктуризация: забираем из контекста БД только 2 нужных метода.
  const { getMarkers, addMarker } = useDatabase();
  
  // Состояние для хранения маркеров, которые отображаются на карте
  // Состояние для массива маркеров — при изменении вызывает перерисовку булавок на карте
  const [markers, setMarkers] = useState<MarkerData[]>([]);
  // Флаг, указывающий, что карта успешно загрузилась
  // Флаг готовности карты: изначально false, станет true, когда MapView вызовет onMapReady
  const [mapReady, setMapReady] = useState(false);
  // Флаг ошибки загрузки карты (например, из-за интернета)
  // Флаг критической ошибки загрузки карты (сработает, если за 15 секунд карта так и не загрузилась)
  const [mapError, setMapError] = useState(false);

  // Ref хранит актуальный список маркеров, чтобы слушатель геолокации (который создается один раз) 
  // всегда имел доступ к свежим данным, обходя проблему замыканий в JavaScript
  // нужен для коллбэка геолокации, который создаётся один раз при старте.
  // Благодаря markersRef.current слушатель GPS всегда видит свежие маркеры (обход проблемы устаревшего замыкания)
  const markersRef = useRef<MarkerData[]>([]);

  // Функция загрузки маркеров из базы данных
  const loadMarkers = async () => {
    try {
      const data = await getMarkers();// Получаем актуальный массив маркеров из таблицы markers
      setMarkers(data); // Обновляем стейт для отрисовки, Обновляем React-состояние -> перерисовываются булавки на карте
      markersRef.current = data; // Обновляем ref для логики уведомлений, Синхронно обновляем ref -> GPS-слушатель сразу видит новые метки
    } catch (error) {
      Alert.alert('Ошибка', 'Не удалось загрузить маркеры из БД');
    }
  };

  // Хук, который запускает функцию каждый раз, когда пользователь возвращается на этот экран
  // Срабатывает при первом открытии экрана И при каждом возврате на него (например, после удаления маркера в [id].tsx).
  // useCallback(..., []) сохраняет одну и ту же ссылку на функцию, чтобы useFocusEffect не перезапускался лишний раз
  useFocusEffect(
    useCallback(() => {
      loadMarkers();
    }, [])
  );

  // Эффект, который запускает таймер на 15 секунд при монтировании экрана
  // Таймер контроля загрузки карты: запускается при старте и перезапускается при изменении mapReady
  useEffect(() => {
    const timer = setTimeout(() => {
      // Если за 15 секунд карта не загрузилась (mapReady === false), ставим ошибку
      if (!mapReady) setMapError(true);
    }, 15000);
    // Очищаем таймер, если компонент размонтируется
    // Функция очистки: как только mapReady станет true (или экран закроется), таймер отменяется
    return () => clearTimeout(timer);
  }, [mapReady]);

  // Эффект для инициализации системных служб (GPS и Push)
  // Инициализация системных служб (уведомления и GPS) один раз при запуске экрана ([] в зависимостях)
  useEffect(() => {
    // Переменная для хранения "подписки" на обновление координат
    // Локальная переменная для хранения объекта подписки, чтобы отписаться от него в функции очистки
    let locationSubscription: Location.LocationSubscription;

    const setupServices = async () => {
      try {
        // Запрашиваем права\разрешение ОС на пуш-уведомления
        await requestNotificationPermissions();
        // Запрашиваем права на доступ к GPS(геолокации)
        await requestLocationPermissions();

        // Запускаем постоянное отслеживание (слушатель) геопозиции
        // 3. Запускаем отслеживание координат. Коллбэк внутри будет вызываться при каждом изменении позиции
        locationSubscription = await startLocationUpdates((location) => {
          // При каждом новом шаге пользователя проверяем расстояние до маркеров
          // Проверяем расстояние от текущей точки пользователя до всех актуальных маркеров из markersRef.current
          checkProximity(location, markersRef.current);
        });
      } catch (error) {
        Alert.alert('Предупреждение', 'Не удалось запустить геолокацию или уведомления. Проверьте разрешения.');
      }
    };

    setupServices();// Запускаем асинхронную настройку служб

    // Функция очистки: отписываемся от GPS при закрытии экрана для экономии батареи
    return () => {
      if (locationSubscription) {
        locationSubscription.remove();
      }
    };
  }, []);

  // Функция для расчета расстояния до каждой метки
  const checkProximity = (userLocation: Location.LocationObject, currentMarkers: MarkerData[]) => {
    // Перебираем все маркеры в переданном массиве циклом
    currentMarkers.forEach((marker) => {
      // Считаем расстояние в метрах между пользователем и маркером по формуле Хаверсина
      const distance = calculateDistance(
        userLocation.coords.latitude,
        userLocation.coords.longitude,
        marker.latitude,
        marker.longitude
      );

      // Если пользователь вошел в радиус 50 метров
      if (distance <= PROXIMITY_THRESHOLD) {
        // Пытаемся показать уведомление (менеджер сам проверит, не отправлялось ли оно уже)
        notificationManager.showNotification(marker);
      } else {
        // Если пользователь отошёл дальше 50 метров — удаляем маркер из кэша уведомлений\списка активных уведомлений,
        // чтобы при следующем приближении уведомление снова могло сработать
        notificationManager.removeNotification(marker.id);
      }
    });
  };

  // Обработчик долгого нажатия на карту(передаётся как проп onLongPress в MapComponent)
  const handleLongPress = async (latitude: number, longitude: number) => {
    try {
      // Добавляем новый маркер с полученными координатами в SQLite
      await addMarker(latitude, longitude);
      // Перезагружаем маркеры, чтобы новый маркер появился на экране
      await loadMarkers();
    } catch (error) {
      Alert.alert('Ошибка', 'Не удалось сохранить маркер');
    }
  };

  // Обработчик клика по самому маркеру на карте(передаётся как проп onMarkerPress в MapComponent)
  const openMarker = (id: number) => {
    try {
      // Переходим на экран деталей, передавая id в URL
      // Переходим на динамический маршрут app/marker/[id].tsx.
      // id переводим в строку через .toString(), так как URL-параметры всегда передаются строками
      router.push({ pathname: '/marker/[id]', params: { id: id.toString() } });
    } catch (error) {
      Alert.alert('Ошибка', 'Не удалось открыть экран маркера');
    }
  };

  //если за 15 секунд карта не загрузилась, показываем экран ошибки
  if (mapError) {
    return (
      <View style={styles.center}>
        <Text>Не удалось загрузить карту. Проверьте интернет.</Text>
      </View>
    );
  }

  // Основной интерфейс экрана
  return (
    <View style={styles.container}>
      {/* Вставляем компонент карты и передаем ему необходимые данные и функции */}
      <MapComponent
        markers={markers}
        // Когда карта загружена системой, меняем флаг (это отключит таймер загрузки)
        onMapReady={() => setMapReady(true)}
        onLongPress={handleLongPress}
        onMarkerPress={openMarker}
      />

      {/* Если карта еще грузится - показываем поверх нее белый экран со спиннером загрузки*/}
      {!mapReady && (
        <View style={styles.loading}>
          <ActivityIndicator size="large" />
          <Text>Загрузка карты...</Text>
        </View>
      )}
    </View>
  );
}
// Таблица стилей экрана
const styles = StyleSheet.create({
  // Главный контейнер на всю доступную область экрана
  container: { flex: 1 },
  // Центрирование текста ошибки по центру экрана
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  loading: {
    // absoluteFill растягивает слой загрузки на весь экран поверх карты
    ...StyleSheet.absoluteFill,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
  },
});