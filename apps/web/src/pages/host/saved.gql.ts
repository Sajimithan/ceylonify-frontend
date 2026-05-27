import { gql } from "@apollo/client";

export const MY_SAVED_LISTINGS = gql`
  query MySavedListings {
    savedListings {
      id title description type category price placeName imageUrl createdAt
    }
  }
`;

export const SAVE_LISTING = gql`
  mutation SaveListing($listingId: ID!) {
    saveListing(listingId: $listingId)
  }
`;

export const UNSAVE_LISTING = gql`
  mutation UnsaveListing($listingId: ID!) {
    unsaveListing(listingId: $listingId)
  }
`;
