import { ApolloClient, InMemoryCache, createHttpLink } from "@apollo/client";
import { setContext } from "@apollo/client/link/context";
import { onError } from "@apollo/client/link/error";
import { signOut } from "firebase/auth";
import { auth } from "../auth/firebase";

const httpLink = createHttpLink({
  uri: import.meta.env.VITE_GRAPHQL_URL as string,
});

const authLink = setContext(async (_, { headers }) => {
  const u = auth.currentUser;
  const token = u ? await u.getIdToken() : null;

  return {
    headers: {
      ...headers,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  };
});

const errorLink = onError(({ graphQLErrors, networkError }) => {
  const isAuthError =
    graphQLErrors?.some((e) => e.extensions?.code === "UNAUTHENTICATED") ||
    (networkError && "statusCode" in networkError && networkError.statusCode === 401);
  if (isAuthError) {
    signOut(auth).then(() => { window.location.href = "/"; });
  }
});

export const apolloClient = new ApolloClient({
  link: errorLink.concat(authLink).concat(httpLink),
  cache: new InMemoryCache(),
});
