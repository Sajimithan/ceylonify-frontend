import { gql } from "@apollo/client";

export const ALL_HOSTS = gql`
  query AllHosts($limit: Int, $offset: Int) {
    allHosts(limit: $limit, offset: $offset) {
      firebaseUid
      displayName
      businessName
      avatarUrl
      badgeLevel
      approvedCount
      createdAt
    }
  }
`;

export const HOST_PUBLIC_PROFILE = gql`
  query HostPublicProfile($firebaseUid: String!) {
    hostPublicProfile(firebaseUid: $firebaseUid) {
      firebaseUid
      displayName
      businessName
      avatarUrl
      createdAt
      badgeLevel
      approvedCount
      upcomingEvents {
        id
        title
        imageUrl
        startDateTime
        type
        category
        price
        placeName
      }
      pastEvents {
        id
        title
        imageUrl
        startDateTime
        type
        category
        price
        placeName
      }
      pastExperiences {
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
  }
`;

export const ADMIN_HOST_DETAIL = gql`
  query AdminHostDetail($firebaseUid: String!) {
    adminHostDetail(firebaseUid: $firebaseUid) {
      firebaseUid
      displayName
      businessName
      avatarUrl
      email
      createdAt
      badgeLevel
      approvedCount
      totalViews
      upcomingEvents {
        id
        title
        imageUrl
        startDateTime
        type
        category
        placeName
        status
      }
      pastEvents {
        id
        title
        imageUrl
        startDateTime
        type
        category
        placeName
        status
      }
    }
  }
`;
