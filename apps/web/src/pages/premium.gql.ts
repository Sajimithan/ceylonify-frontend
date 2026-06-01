import { gql } from "@apollo/client";

export const ME_VERIFICATION_STATUS = gql`
  query MeVerificationStatus {
    me {
      firebaseUid
      isPremium
      subscriptionTier
      emailVerifiedAt
      phoneVerifiedAt
      phone
      subscriptionExpiresAt
    }
  }
`;

export const SEND_EMAIL_VERIFICATION = gql`
  mutation SendEmailVerification {
    sendEmailVerification
  }
`;

export const MARK_EMAIL_VERIFIED = gql`
  mutation MarkEmailVerified {
    markEmailVerified
  }
`;

export const MARK_PHONE_VERIFIED = gql`
  mutation MarkPhoneVerified($phone: String!) {
    markPhoneVerified(phone: $phone)
  }
`;

export const SELF_UPGRADE_PREMIUM = gql`
  mutation SelfUpgradeToPremium {
    selfUpgradeToPremium {
      firebaseUid
      isPremium
      subscriptionTier
      emailVerifiedAt
      phoneVerifiedAt
    }
  }
`;

export const DELETE_MY_ACCOUNT = gql`
  mutation DeleteMyAccount {
    deleteMyAccount
  }
`;
