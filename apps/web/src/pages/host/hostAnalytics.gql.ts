import { gql } from "@apollo/client";

export const HOST_PAST_EVENT_REVIEWS = gql`
  query HostPastEventReviews {
    hostPastEventReviews {
      averageRating
      reviewCount
      event {
        id
        title
        imageUrl
        placeName
        startDateTime
        type
        viewCount
      }
      reviews {
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
  }
`;
