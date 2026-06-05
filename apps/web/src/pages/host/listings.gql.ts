import { gql } from "@apollo/client";

export const MY_LISTINGS = gql`
  query MyListings {
    myListings {
      id
      title
      description
      type
      status
      createdAt
      startDateTime
      rejectionReason
      suspensionReason
      isRepost
      imageUrl
      isPremium
      viewCount
    }
  }
`;

export const GET_LISTING = gql`
  query GetListing($id: String!) {
    listing(id: $id) {
      id
      title
      description
      type
      category
      price
      priceTiers { label price description }
      startDateTime
      placeName
      mapLink
      imageUrl
      status
      createdAt
      lat
      lng
      isPremium
      viewCount
      rejectionReason
    }
  }
`;

export const CREATE_LISTING = gql`
  mutation CreateListing($input: CreateListingInput!) {
    createListing(input: $input) {
      id
      title
      status
      createdAt
    }
  }
`;

export const UPDATE_LISTING = gql`
  mutation UpdateListing($id: String!, $input: UpdateListingInput!) {
    updateListing(id: $id, input: $input) {
      id
      title
      status
    }
  }
`;

export const DELETE_LISTING = gql`
  mutation DeleteListing($id: String!) {
    deleteListing(id: $id) {
      id
    }
  }
`;
