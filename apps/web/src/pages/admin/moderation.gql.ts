import { gql } from "@apollo/client";

export const PENDING_LISTINGS = gql`
  query PendingListings {
    pendingListings {
      id
      title
      description
      type
      category
      price
      startDateTime
      placeName
      status
      isRepost
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

export const AI_REVIEW_LISTING = gql`
  mutation AiReviewListing($title: String!, $description: String!) {
    aiReviewListing(title: $title, description: $description) {
      safe
      confidence
      flags
      summary
    }
  }
`;
