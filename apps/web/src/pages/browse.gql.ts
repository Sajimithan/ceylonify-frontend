import { gql } from "@apollo/client";

export const ME_QUERY = gql`
  query Me {
    me {
      firebaseUid
      role
      isPremium
      isSuperAdmin
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
    $hidePastEvents: Boolean
    $priceMin: Float
    $priceMax: Float
    $sortBy: String
    $sortOrder: String
  ) {
    searchListings(
      q: $q
      category: $category
      type: $type
      limit: $limit
      offset: $offset
      startAfter: $startAfter
      startBefore: $startBefore
      hidePastEvents: $hidePastEvents
      priceMin: $priceMin
      priceMax: $priceMax
      sortBy: $sortBy
      sortOrder: $sortOrder
    ) {
      listings {
        id
        title
        description
        type
        category
        price
        priceTiers { label price description }
        placeName
        startDateTime
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
      priceTiers { label price description }
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
      priceTiers { label price description }
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
      createdBy
    }
  }
`;

export const HOST_BADGE_QUERY = gql`
  query HostBadge($firebaseUid: String!) {
    hostBadge(firebaseUid: $firebaseUid) {
      approvedCount
      badgeLevel
    }
  }
`;
