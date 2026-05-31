import { gql } from "@apollo/client";

export const MY_FULL_ITINERARY = gql`
  query MyFullItinerary {
    myItinerary {
      id
      listingId
      plannedDate
      note
      isGoingEntry
      createdAt
      listingTitle
      listingImageUrl
      listingType
      listingPlaceName
    }
  }
`;

export const UPDATE_ITINERARY_NOTE = gql`
  mutation UpdateItineraryNote($itemId: ID!, $note: String!) {
    updateItineraryNote(itemId: $itemId, note: $note) {
      id
      note
    }
  }
`;

export const REMOVE_FROM_ITINERARY = gql`
  mutation RemoveFromItinerary($itemId: ID!) {
    removeFromItinerary(itemId: $itemId)
  }
`;
