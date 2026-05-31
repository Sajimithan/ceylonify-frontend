import { gql } from "@apollo/client";

export const IS_GOING = gql`
  query IsGoing($listingId: ID!) {
    isGoing(listingId: $listingId)
  }
`;

export const MARK_GOING = gql`
  mutation MarkGoing($listingId: ID!) {
    markGoing(listingId: $listingId) {
      id
      listingId
      plannedDate
      isGoingEntry
    }
  }
`;

export const UNMARK_GOING = gql`
  mutation UnmarkGoing($listingId: ID!) {
    unmarkGoing(listingId: $listingId)
  }
`;

export const MY_ITINERARY_GOING = gql`
  query MyItineraryGoing {
    myItinerary {
      id
      listingId
      isGoingEntry
    }
  }
`;
