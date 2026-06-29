// import { ApolloProvider } from '@apollo/client';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
// import { apolloClient } from '../src/lib/apollo';
// import Toast from 'react-native-toast-message';
// import { GestureHandlerRootView } from 'react-native-gesture-handler';
// import "./global.css"; // NativeWind removed

import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View } from 'react-native';
import { ThemeProvider, useTheme } from '../src/context/ThemeContext';
import { UserLocationProvider } from '../src/context/UserLocationContext';

function RootLayoutInner() {
  const { colors, isDark } = useTheme();

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* <ApolloProvider client={apolloClient}> */}
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.background },
          }}
        >
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="(auth)" options={{ presentation: 'formSheet' }} />
          <Stack.Screen name="listing/[id]" options={{ presentation: 'card' }} />
          <Stack.Screen name="premium" options={{ presentation: 'modal' }} />
        </Stack>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        {/* <Toast /> */}
      {/* </ApolloProvider> */}
    </View>
  );
}

export default function RootLayout() {
  console.log("✅ RootLayout: Using native fetch (Apollo removed for React 19 compat)");
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <UserLocationProvider>
          <RootLayoutInner />
        </UserLocationProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
