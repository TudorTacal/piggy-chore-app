import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { AuthProvider, useAuth } from '@/contexts/auth';
import InitialLoading from '@/components/InitialLoading';

function RootLayoutNav() {
  const { session, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  
  useEffect(() => {
    console.log('Auth state changed:', { isLoading, session: !!session, segments });
    
    if (!isLoading) {
      const inAuthGroup = segments[0] === '(auth)';

      if (!session && !inAuthGroup) {
        console.log('No session, redirecting to login');
        router.replace('/(auth)/login');
      } else if (session && inAuthGroup) {
        console.log('Has session, redirecting to tabs');
        router.replace('/(tabs)');
      }
    }
  }, [session, segments, isLoading]);

  // Only show loading screen if we're actually loading and don't have a session
  if (isLoading && !session) {
    return <InitialLoading />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen 
        name="(auth)" 
        options={{ 
          headerShown: false,
          gestureEnabled: false 
        }} 
      />
      <Stack.Screen 
        name="(tabs)" 
        options={{ 
          headerShown: false,
          gestureEnabled: false 
        }} 
      />
    </Stack>
  );
}

export default function RootLayout() {
  useFrameworkReady();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <RootLayoutNav />
        <StatusBar style="auto" />
      </AuthProvider>
    </GestureHandlerRootView>
  );
}