export function isAdminEmail(email: string | null | undefined) {
  if (!email) return false;
  // ✅ replace with your admin emails
  const admins = new Set(["admin@test.com"]);
  return admins.has(email.toLowerCase());
}
