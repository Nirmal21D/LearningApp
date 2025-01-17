import { Stack } from 'expo-router';

export default function Layout() {
  return (
    <Stack>
      <Stack.Screen 
        name="index" 
        options={{ headerShown: false }} 
      />
      <Stack.Screen 
        name="login/index"
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="signup/index"
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="home/index"
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="subject/index"
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="subject/videos/index"
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="subject/tests/index"
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="subject/pdfs/index"
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="progress/index"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="notification/index"
        options={{headerShown: false}}
      /> 
    </Stack>
  );
} 