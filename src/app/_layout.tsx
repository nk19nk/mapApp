import { DatabaseProvider, useDatabase } from '@/contexts/DatabaseContext';
import { Stack } from 'expo-router';
import { ActivityIndicator, Button, StyleSheet, Text, View } from 'react-native';

function AppStack() {
  const { isLoading, error, retry } = useDatabase();

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text>Подготовка базы данных...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Ошибка базы данных: {error.message}</Text>
        <Button title="Повторить" onPress={retry} />
      </View>
    );
  }

  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'Карта' }} />
      <Stack.Screen
        name="marker/[id]"
        options={{ title: 'Детали маркера', headerBackVisible: false }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <DatabaseProvider>
      <AppStack />
    </DatabaseProvider>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  errorText: { marginBottom: 12, textAlign: 'center' },
});