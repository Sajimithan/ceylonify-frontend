import { gql } from "@apollo/client";

export const ME_QUERY = gql`
  query Me {
    me {
      role
      isPremium
    }
  }
`;

export const SEARCH_LISTINGS = gql`
  query SearchListings(
    $q: String
    $category: String
    $type: String
    $limit: Int
    $offset: Int
    $startAfter: String
    $startBefore: String
  ) {
    searchListings(
      q: $q
      category: $category
      type: $type
      limit: $limit
      offset: $offset
      startAfter: $startAfter
      startBefore: $startBefore
    ) {
      listings {
        id
        title
        description
        type
        category
        price
        placeName
        imageUrl
        isPremium
        viewCount
        createdAt
        lat
        lng
      }
      total
    }
  }
`;

export const NEARBY_LISTINGS_QUERY = gql`
  query NearbyListings($lat: Float!, $lng: Float!, $radiusKm: Float, $limit: Int) {
    nearbyListings(lat: $lat, lng: $lng, radiusKm: $radiusKm, limit: $limit) {
      id
      title
      description
      type
      category
      price
      placeName
      imageUrl
      isPremium
      viewCount
      createdAt
      lat
      lng
    }
  }
`;

export const RELATED_LISTINGS_QUERY = gql`
  query RelatedListings($listingId: String!) {
    relatedListings(listingId: $listingId) {
      id
      title
      type
      category
      price
      imageUrl
      isPremium
    }
  }
`;

export const GET_LISTING_DETAIL = gql`
  query GetListingDetail($id: String!) {
    listing(id: $id) {
      id
      title
      description
      type
      category
      price
      startDateTime
      placeName
      mapLink
      imageUrl
      isPremium
      viewCount
      lat
      lng
      status
      createdAt
    }
  }
`;
