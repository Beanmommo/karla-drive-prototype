import { Fredoka_400Regular } from '@expo-google-fonts/fredoka/400Regular';
import { Fredoka_500Medium } from '@expo-google-fonts/fredoka/500Medium';
import { Fredoka_600SemiBold } from '@expo-google-fonts/fredoka/600SemiBold';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { colors } from '../theme';
import { ModuleStatusesProvider } from '../features/modules/ModuleStatusesProvider';
import { LearnersProvider } from '../features/learners/LearnersProvider';

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    Fredoka_400Regular,
    Fredoka_500Medium,
    Fredoka_600SemiBold,
  });

  useEffect(() => {
    if (loaded || error) {
      void SplashScreen.hideAsync();
    }
  }, [loaded, error]);

  if (!loaded && !error) {
    return null;
  }

  return (
    <LearnersProvider>
      <ModuleStatusesProvider>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.background },
          }}
        >
          <Stack.Screen name="index" options={{ title: 'Karla Drive' }} />
          <Stack.Screen name="tutorial" options={{ title: 'What is Karla Drive?' }} />
          <Stack.Screen name="(main)" options={{ title: 'Karla Drive' }} />
          <Stack.Screen name="learners/new" options={{ title: 'Add learner', gestureEnabled: false }} />
        </Stack>
      </ModuleStatusesProvider>
    </LearnersProvider>
  );
}
