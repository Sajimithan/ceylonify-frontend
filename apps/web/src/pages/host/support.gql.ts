import { gql } from "@apollo/client";

export const MY_SUPPORT_TICKETS = gql`
  query MySupportTickets {
    mySupportTickets {
      id
      subject
      message
      status
      createdAt
      replies {
        id
        fromAdmin
        senderUid
        message
        createdAt
      }
    }
  }
`;

export const CREATE_SUPPORT_TICKET = gql`
  mutation CreateSupportTicket($subject: String!, $message: String!) {
    createSupportTicket(subject: $subject, message: $message)
  }
`;
