import { gql } from "@apollo/client";

export const ADMIN_STATS = gql`
  query AdminStats {
    adminListingStats {
      total
      pending
      approved
      rejected
    }
    adminUserStats {
      total
      travelers
      hosts
      admins
    }
  }
`;

export const ADMIN_CREATE_ADMIN_ACCOUNT = gql`
  mutation AdminCreateAdminAccount($email: String!) {
    adminCreateAdminAccount(email: $email)
  }
`;

export const ADMIN_DELETE_USER = gql`
  mutation AdminDeleteUser($firebaseUid: String!) {
    adminDeleteUser(firebaseUid: $firebaseUid)
  }
`;

export const ADMIN_ALL_USERS = gql`
  query AdminAllUsers {
    adminAllUsers {
      id
      firebaseUid
      email
      role
      createdAt
      badgeLevel
      approvedCount
      phone
      isSuspended
      subscriptionExpiresAt
      avatarUrl
    }
  }
`;

export const ADMIN_SUSPEND_USER = gql`
  mutation AdminSuspendUser($firebaseUid: String!) {
    adminSuspendUser(firebaseUid: $firebaseUid)
  }
`;

export const ADMIN_ACTIVATE_USER = gql`
  mutation AdminActivateUser($firebaseUid: String!) {
    adminActivateUser(firebaseUid: $firebaseUid)
  }
`;

export const ADMIN_SUSPEND_LISTING = gql`
  mutation AdminSuspendListing($id: String!, $reason: String) {
    adminSuspendListing(id: $id, reason: $reason)
  }
`;

export const ADMIN_BROADCAST_ANNOUNCEMENT = gql`
  mutation AdminBroadcastAnnouncement($title: String!, $body: String!, $roles: [String!]) {
    adminBroadcastAnnouncement(title: $title, body: $body, roles: $roles)
  }
`;

export const ADMIN_SUBSCRIPTION_HISTORY = gql`
  query AdminSubscriptionHistory($firebaseUid: String!) {
    adminSubscriptionHistory(firebaseUid: $firebaseUid) {
      id
      fromTier
      toTier
      changedAt
      changedBy
    }
  }
`;


export const ADMIN_CHANGE_USER_ROLE = gql`
  mutation AdminChangeUserRole($id: String!, $role: String!) {
    adminChangeUserRole(id: $id, role: $role) {
      id
      role
    }
  }
`;

export const ADMIN_UPDATE_SUBSCRIPTION = gql`
  mutation AdminUpdateSubscription($targetFirebaseUid: String!, $tier: String!) {
    adminUpdateUserSubscription(targetFirebaseUid: $targetFirebaseUid, tier: $tier)
  }
`;

export const ADMIN_FEATURE_FLAGS = gql`
  query AdminFeatureFlags {
    featureFlags {
      key
      label
      description
      enabledForTravelers
      enabledForHosts
      updatedAt
      updatedByAdminUid
      updatedByAdminEmail
      updatedByAdminName
    }
  }
`;

export const ADMIN_UPDATE_FEATURE_FLAG = gql`
  mutation AdminUpdateFeatureFlag($key: String!, $enabledForTravelers: Boolean, $enabledForHosts: Boolean) {
    adminUpdateFeatureFlag(key: $key, enabledForTravelers: $enabledForTravelers, enabledForHosts: $enabledForHosts)
  }
`;

export const ADMIN_UPDATE_USER_PHONE = gql`
  mutation AdminUpdateUserPhone($firebaseUid: String!, $phone: String!) {
    adminUpdateUserPhone(firebaseUid: $firebaseUid, phone: $phone)
  }
`;

export const ADMIN_ALL_SUPPORT_TICKETS = gql`
  query AdminAllSupportTickets {
    adminAllSupportTickets {
      id
      subject
      message
      status
      createdAt
      userEmail
      userDisplayName
      replies {
        id
        fromAdmin
        senderUid
        message
        createdAt
      }
    }
  }
`;

export const ADMIN_REPLY_TO_SUPPORT_TICKET = gql`
  mutation AdminReplyToSupportTicket($ticketId: String!, $message: String!) {
    adminReplyToSupportTicket(ticketId: $ticketId, message: $message)
  }
`;

export const ADMIN_CLOSE_SUPPORT_TICKET = gql`
  mutation AdminCloseSupportTicket($ticketId: String!) {
    adminCloseSupportTicket(ticketId: $ticketId)
  }
`;

export const AI_SUPPORT_SUMMARY = gql`
  mutation AiSupportSummary($subject: String!, $conversation: String!) {
    aiSupportSummary(subject: $subject, conversation: $conversation) {
      summary
      suggestedReply
    }
  }
`;

export const ADMIN_ALL_LISTINGS = gql`
  query AdminAllListings {
    adminAllListings {
      id
      title
      description
      type
      category
      price
      placeName
      startDateTime
      lat
      lng
      status
      isRepost
      rejectionReason
      suspensionReason
      createdAt
      createdBy
      imageUrl
    }
  }
`;
