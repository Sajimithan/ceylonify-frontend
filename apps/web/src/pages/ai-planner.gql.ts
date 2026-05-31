import { gql } from "@apollo/client";

export const PLAN_ITINERARY = gql`
  mutation PlanItinerary(
    $prompt: String!
    $history: [ChatMessageInput!]
    $listingId: ID
  ) {
    planItinerary(prompt: $prompt, history: $history, listingId: $listingId) {
      text
      listings {
        id
        title
        imageUrl
        placeName
        price
        type
      }
    }
  }
`;

export const MY_AI_USAGE = gql`
  query MyAiUsage {
    me {
      subscriptionTier
      isPremium
      role
      aiUsage {
        requestsUsed
        monthlyLimit
        remaining
        resetAt
      }
    }
  }
`;

export const SAVE_CHAT = gql`
  mutation SaveChat($name: String!, $messages: String!) {
    saveChat(name: $name, messages: $messages) {
      id
      name
      createdAt
    }
  }
`;

export const SAVED_CHATS = gql`
  query SavedChats {
    savedChats {
      id
      name
      messages
      createdAt
      updatedAt
    }
  }
`;

export const DELETE_SAVED_CHAT = gql`
  mutation DeleteSavedChat($chatId: ID!) {
    deleteSavedChat(chatId: $chatId)
  }
`;
