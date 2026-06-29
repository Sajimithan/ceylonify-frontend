export type HostNameFields = {
  businessName?: string | null;
  displayName?: string | null;
  email?: string | null;
};

/** Business/restaurant name first; otherwise profile display name; otherwise email prefix. */
export function getHostPublicName(host: HostNameFields): string {
  const business = host.businessName?.trim();
  if (business) return business;
  const display = host.displayName?.trim();
  if (display) return display;
  const emailLocal = host.email?.split('@')[0]?.trim();
  if (emailLocal) return emailLocal;
  return 'Host';
}

export function getHostPublicInitial(host: HostNameFields): string {
  return getHostPublicName(host).charAt(0).toUpperCase();
}
