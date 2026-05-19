import { gql } from "@apollo/client";

export const REGISTER_DEVICE_TOKEN = gql`
  mutation RegisterDeviceToken($token: String!) {
    registerDeviceToken(token: $token)
  }
`;
