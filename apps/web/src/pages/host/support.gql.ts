import { gql } from "@apollo/client";

export const MY_SUPPORT_TICKETS = gql`
  query MySupportTickets {
    mySupportTickets {
      id
      subject
      message
      status
      imageUrls
      createdAt
      replies {
        id
        fromAdmin
        senderUid
        message
        imageUrls
        createdAt
      }
    }
  }
`;

export const CREATE_SUPPORT_TICKET = gql`
  mutation CreateSupportTicket($subject: String!, $message: String!, $imageUrls: [String!]) {
    createSupportTicket(subject: $subject, message: $message, imageUrls: $imageUrls)
  }
`;

export const REPLY_TO_SUPPORT_TICKET = gql`
  mutation ReplyToSupportTicket($ticketId: String!, $message: String!, $imageUrls: [String!]) {
    replyToSupportTicket(ticketId: $ticketId, message: $message, imageUrls: $imageUrls)
  }
`;
