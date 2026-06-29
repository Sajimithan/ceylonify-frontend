export const MY_SUPPORT_TICKETS = `
  query MySupportTickets {
    mySupportTickets {
      id
      subject
      message
      status
      sourceType
      sourceId
      listingId
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

export const CREATE_SUPPORT_TICKET = `
  mutation CreateSupportTicket($subject: String!, $message: String!, $imageUrls: [String!]) {
    createSupportTicket(subject: $subject, message: $message, imageUrls: $imageUrls)
  }
`;

export const REPLY_TO_SUPPORT_TICKET = `
  mutation ReplyToSupportTicket($ticketId: String!, $message: String!, $imageUrls: [String!]) {
    replyToSupportTicket(ticketId: $ticketId, message: $message, imageUrls: $imageUrls)
  }
`;

export type SupportReply = {
  id: string;
  fromAdmin: boolean;
  senderUid: string;
  message: string;
  imageUrls: string[];
  createdAt: string;
};

export type SupportTicket = {
  id: string;
  subject: string;
  message: string;
  status: 'OPEN' | 'REPLIED' | 'CLOSED';
  sourceType?: string;
  sourceId?: string | null;
  listingId?: string | null;
  imageUrls: string[];
  createdAt: string;
  replies: SupportReply[];
};
