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

export const ADMIN_ALL_LISTINGS = gql`
  query AdminAllListings {
    adminAllListings {
      id
      title
      description
      type
      status
      createdAt
      createdBy
      imageUrl
    }
  }
`;
