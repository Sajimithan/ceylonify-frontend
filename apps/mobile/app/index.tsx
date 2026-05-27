import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { View, ActivityIndicator } from 'react-native';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../src/lib/firebase';

export default function Index() {
  const [ready, setReady] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(false);

  useEffect(() => {
    let authResolved = false;
    let storageResolved = false;
    let authLoggedIn = false;
    let seenOnboarding = false;

    const checkAll = () => {
      if (authResolved && storageResolved) {
        setIsLoggedIn(authLoggedIn);
        setHasSeenOnboarding(seenOnboarding);
        setReady(true);
      }
    };

    const unsubscribe = onAuthStateChanged(auth!, (user) => {
      authLoggedIn = !!user;
      authResolved = true;
      checkAll();
    });

    AsyncStorage.getItem('onboarding_done').then((val) => {
      seenOnboarding = val === 'true';
      storageResolved = true;
      checkAll();
    });

    return () => unsubscribe();
  }, []);

  if (!ready) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0B1220' }}>
        <ActivityIndicator size="large" color="#0EA5A4" />
      </View>
    );
  }

  if (isLoggedIn) return <Redirect href="/(tabs)/home" />;
  if (!hasSeenOnboarding) return <Redirect href="/(auth)/onboarding" />;
  return <Redirect href="/(auth)/landing" />;
}
