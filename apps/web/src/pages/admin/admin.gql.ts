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
