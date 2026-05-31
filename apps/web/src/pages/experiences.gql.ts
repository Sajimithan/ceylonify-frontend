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
  query ListingExperiences($listingId: ID!) {
    listingExperiences(listingId: $listingId) {
      id
      listingId
      rating
      text
      imageUrls
      createdAt
      user {
        firebaseUid
        displayName
        avatarUrl
      }
    }
  }
`;
