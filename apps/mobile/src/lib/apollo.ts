import { ApolloClient, InMemoryCache, createHttpLink } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { auth } from './firebase';
import Constants from 'expo-constants';

const httpLink = createHttpLink({
  uri: Constants.expoConfig?.extra?.apiUrl || process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:3000/graphql',
});

const authLink = setContext(async (_, { headers }) => {
  try {
    if (!auth) {
      console.warn("⚠️ Firebase Auth not initialized, skipping token");
      return { headers };
    }
    
    const user = auth.currentUser;
    
    if (user) {
      const token = await user.getIdToken();
      return {
        headers: {
          ...headers,
          authorization: token ? `Bearer ${token}` : '',
        },
      };
    }
  } catch (error) {
    console.error('Error getting auth token:', error);
  }

  return { headers };
});

export const apolloClient = new ApolloClient({
  link: authLink.concat(httpLink),
  cache: new InMemoryCache(),
  defaultOptions: {
    watchQuery: {
      fetchPolicy: 'cache-and-network',
    },
  },
});
