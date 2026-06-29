import { gql } from "@apollo/client";

export const SHARE_EXPERIENCE = gql`
  mutation ShareExperience(
    $listingId: ID!
    $rating: Int!
    $text: String!
    $imageUrls: [String!]
  ) {
    shareExperience(
      listingId: $listingId
      rating: $rating
      text: $text
      imageUrls: $imageUrls
    ) {
      id
      listingId
      rating
      text
      imageUrls
      createdAt
    }
  }
`;

export const UPDATE_MY_EXPERIENCE = gql`
  mutation UpdateMyExperience(
    $id: ID!
    $rating: Int!
    $text: String!
    $imageUrls: [String!]
  ) {
    updateMyExperience(
      id: $id
      rating: $rating
      text: $text
      imageUrls: $imageUrls
    ) {
      id
      listingId
      rating
      text
      imageUrls
      createdAt
    }
  }
`;

export const DELETE_MY_EXPERIENCE = gql`
  mutation DeleteMyExperience($id: ID!) {
    deleteMyExperience(id: $id)
  }
`;

export const MY_EXPERIENCES = gql`
  query MyExperiences {
    myExperiences {
      id
      listingId
      rating
      text
      imageUrls
      createdAt
    }
  }
`;

export const LISTING_EXPERIENCES = gql`
  query ListingExperiences($listingId: ID!, $viewerUid: String) {
    listingExperiences(listingId: $listingId, viewerUid: $viewerUid) {
      id
      listingId
      rating
      text
      imageUrls
      createdAt
      likeCount
      likedByMe
      replyCount
      user {
        firebaseUid
        displayName
        avatarUrl
      }
      replies {
        id
        senderUid
        authorRole
        message
        createdAt
      }
    }
  }
`;

export const TOGGLE_EXPERIENCE_LIKE = gql`
  mutation ToggleExperienceLike($experienceId: ID!) {
    toggleExperienceLike(experienceId: $experienceId) {
      liked
      likeCount
    }
  }
`;

export const REPLY_TO_EXPERIENCE = gql`
  mutation ReplyToExperience($experienceId: ID!, $message: String!) {
    replyToExperience(experienceId: $experienceId, message: $message) {
      id
      senderUid
      authorRole
      message
      createdAt
    }
  }
`;
