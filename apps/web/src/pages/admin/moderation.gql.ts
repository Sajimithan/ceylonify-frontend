import { gql } from "@apollo/client";

export const PENDING_LISTINGS = gql`
  query PendingListings {
    pendingListings {
      id
      title
      description
      type
      status
      createdAt
      lat
      lng
      createdBy
      imageUrl
    }
  }
`;

export const APPROVE_LISTING = gql`
  mutation ApproveListing($id: ID!) {
    approveListing(id: $id) {
      id
      status
    }
  }
`;

export const REJECT_LISTING = gql`
  mutation RejectListing($id: ID!, $reason: String!) {
    rejectListing(id: $id, reason: $reason) {
      id
      status
    }
  }
`;

