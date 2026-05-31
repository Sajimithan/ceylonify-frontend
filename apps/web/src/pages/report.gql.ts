import { gql } from "@apollo/client";

export const REPORT_LISTING = gql`
  mutation ReportListing(
    $listingId: ID!
    $reason: String!
    $comment: String
  ) {
    reportListing(listingId: $listingId, reason: $reason, comment: $comment)
  }
`;
