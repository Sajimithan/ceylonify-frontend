export const FORGOT_PASSWORD = `
  mutation ForgotPassword($email: String!) {
    forgotPassword(email: $email)
  }
`;
