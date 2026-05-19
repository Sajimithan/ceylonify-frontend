// import { ApolloProvider } from '@apollo/client';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
// import { apolloClient } from '../src/lib/apollo';
// import Toast from 'react-native-toast-message';
// import { GestureHandlerRootView } from 'react-native-gesture-handler';
// import "./global.css"; // NativeWind removed

import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View } from 'react-native';

export default function RootLayout() {
  console.log("✅ RootLayout: Using native fetch (Apollo removed for React 19 compat)");
  return (
    <SafeAreaProvider>
      <View style={{ flex: 1 }}>
        {/* <ApolloProvider client={apolloClient}> */}
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: '#F7FAFC' },
            }}
          >
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="(auth)" options={{ presentation: 'formSheet' }} />
            <Stack.Screen name="listing/[id]" options={{ presentation: 'card' }} />
            <Stack.Screen name="premium" options={{ presentation: 'modal' }} />
          </Stack>
          <StatusBar style="dark" />
          {/* <Toast /> */}
        {/* </ApolloProvider> */}
      </View>
    </SafeAreaProvider>
  );
}
