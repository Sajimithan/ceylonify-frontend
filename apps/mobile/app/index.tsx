import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { View, ActivityIndicator } from 'react-native';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../src/lib/firebase';

type Destination = '/(tabs)/home' | '/(auth)/onboarding' | '/(auth)/landing';

export default function Index() {
  const [destination, setDestination] = useState<Destination | null>(null);

  useEffect(() => {
    let storageResolved = false;
    let authDestination: Destination | null = null;
    let seenOnboarding = false;

    const resolve = () => {
      if (authDestination !== null && storageResolved) {
        // If not logged in, fallback to onboarding or landing based on storage
        if (authDestination !== '/(tabs)/home') {
          setDestination(seenOnboarding ? '/(auth)/landing' : '/(auth)/onboarding');
        } else {
          setDestination('/(tabs)/home');
        }
      }
    };

    const unsubscribe = onAuthStateChanged(auth!, async (user) => {
      if (user) {
        try {
          // Force-refresh the token — catches expired / revoked sessions
          await user.getIdToken(true);
          authDestination = '/(tabs)/home';
        } catch {
          // Token invalid — sign out and send to auth flow
          await auth!.signOut().catch(() => {});
          authDestination = '/(auth)/landing';
        }
      } else {
        authDestination = '/(auth)/landing';
      }
      resolve();
    });

    AsyncStorage.getItem('onboarding_done').then((val) => {
      seenOnboarding = val === 'true';
      storageResolved = true;
      resolve();
    });

    return () => unsubscribe();
  }, []);

  if (!destination) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0B1220' }}>
        <ActivityIndicator size="large" color="#0EA5A4" />
      </View>
    );
  }

  return <Redirect href={destination} />;
}
