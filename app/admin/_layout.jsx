import { Stack } from 'expo-router';

export default function AdminLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="dashboard" />
      <Stack.Screen name="app-analytics" />
      <Stack.Screen name="create_curriculum" />
      <Stack.Screen name="manage_curriculum" />
      <Stack.Screen name="manage_teachers" />
      <Stack.Screen name="manage_content" />
      <Stack.Screen name="upload_materials" />
    </Stack>
  );
}