import { Stack } from 'expo-router';

export default function TeacherLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="dashboard" />
      <Stack.Screen name="waiting-approval" />
      <Stack.Screen name="view_materials" />
      <Stack.Screen name="upload_materials" />
      <Stack.Screen name="upload-video" />
      <Stack.Screen name="organize_materials" />
    </Stack>
  );
} 