import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";

import { ApolloProvider } from "@apollo/client/react";
import { apolloClient } from "./app/apollo";

import { RouterProvider } from "react-router-dom";
import { router } from "./app/routes";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ApolloProvider client={apolloClient}>
      <RouterProvider router={router} />
    </ApolloProvider>
  </React.StrictMode>
);
