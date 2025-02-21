import { Stack } from 'expo-router';

export default function ChatLayout() {
  return (
    <Stack>
      <Stack.Screen 
        name="private"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen 
        name="group"
        options={{
          headerShown: false,
        }}
      />
    </Stack>
  );
} 