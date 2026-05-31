import { gql } from "@apollo/client";

export const REGISTER_DEVICE_TOKEN = gql`
  mutation RegisterDeviceToken($token: String!) {
    registerDeviceToken(token: $token)
  }
`;

export const MY_NOTIFICATIONS = gql`
  query MyNotifications {
    myNotifications {
      id
      title
      body
      type
      resourceId
      read
      createdAt
    }
  }
`;

export const MARK_NOTIFICATION_READ = gql`
  mutation MarkNotificationRead($notificationId: ID!) {
    markNotificationRead(notificationId: $notificationId)
  }
`;

export const MARK_ALL_NOTIFICATIONS_READ = gql`
  mutation MarkAllNotificationsRead {
    markAllNotificationsRead
  }
`;
