import { gql } from "@apollo/client";

export const SUBMIT_HOST_APPLICATION = gql`
  mutation SubmitHostApplication($input: SubmitHostApplicationInput!) {
    submitHostApplication(input: $input)
  }
`;

export const ADMIN_PENDING_HOST_APPLICATIONS = gql`
  query AdminPendingHostApplications {
    adminPendingHostApplications {
      id
      firebaseUid
      email
      hostTypes
      businessName
      businessAddress
      businessLat
      businessLng
      phoneNumber
      licenseNumber
      idType
      idDocumentUrl
      businessDocUrl
      healthCertUrl
      licenseDocUrl
      bankDocUrl
      status
      submittedAt
      reviewNote
    }
  }
`;

export const ADMIN_REVIEW_HOST_APPLICATION = gql`
  mutation AdminReviewHostApplication(
    $firebaseUid: String!
    $approve: Boolean!
    $reviewNote: String
  ) {
    adminReviewHostApplication(
      firebaseUid: $firebaseUid
      approve: $approve
      reviewNote: $reviewNote
    )
  }
`;
