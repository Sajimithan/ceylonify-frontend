export type ListingPriceTier = {
  label: string;
  price: number;
  description?: string | null;
};

export type ListingPricingFields = {
  price?: string | number | null;
  priceTiers?: ListingPriceTier[] | null;
};

export function getListingPriceTiers(listing: ListingPricingFields): ListingPriceTier[] {
  return (listing.priceTiers ?? []).filter(
    (tier) => tier?.label?.trim() && tier.price != null && !Number.isNaN(Number(tier.price)),
  );
}

export function listingHasPrice(listing: ListingPricingFields): boolean {
  if (getListingPriceTiers(listing).length > 0) return true;
  const value = listing.price;
  if (value == null || value === "") return false;
  return Number(value) > 0;
}

export function formatListingPriceSummary(listing: ListingPricingFields): string | null {
  const tiers = getListingPriceTiers(listing);
  if (tiers.length > 0) {
    const amounts = tiers.map((tier) => Number(tier.price)).filter((n) => !Number.isNaN(n));
    if (!amounts.length) return null;
    const min = Math.min(...amounts);
    const max = Math.max(...amounts);
    if (min === max) return `LKR ${min.toLocaleString()}`;
    return `LKR ${min.toLocaleString()} – ${max.toLocaleString()}`;
  }

  if (!listingHasPrice(listing)) return null;
  return `LKR ${Number(listing.price).toLocaleString()}`;
}
