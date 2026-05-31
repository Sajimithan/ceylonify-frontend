import { useState, useEffect, useCallback } from "react";
import { useQuery, useLazyQuery, useMutation } from "@apollo/client/react";
import { useNavigate } from "react-router-dom";
import { GoogleMap, Marker, InfoWindow, useJsApiLoader } from "@react-google-maps/api";
import { MAPS_LIBRARIES } from "../lib/googleMaps";
import { DashboardLayout } from "../layouts/DashboardLayout";
import { Badge } from "../ui/Badge";
import { ME_QUERY, SEARCH_LISTINGS, NEARBY_LISTINGS_QUERY } from "./browse.gql";
import { useFeatureFlags } from "../auth/useFeatureFlags";
import { MY_SAVED_LISTINGS, SAVE_LISTING, UNSAVE_LISTING } from "./host/saved.gql";
import { ALL_HOSTS } from "./hosts.gql";
import { MARK_GOING, UNMARK_GOING, MY_ITINERARY_GOING } from "./going.gql";

const BADGE_EMOJI: Record<string, string> = { DIAMOND: '💎', GOLD: '🥇', SILVER: '🥈', BRONZE: '🥉', NONE: '' };

type Listing = {
  id: string;
  title: string;
  description: string;
  type: string;
  category?: string;
  price?: string;
  placeName?: string;
  imageUrl?: string;
  isPremium: boolean;
  viewCount: number;
  createdAt: string;
  startDateTime?: string;
  lat?: number;
  lng?: number;
};

type HostCard = {
  firebaseUid: string;
  displayName?: string;
  avatarUrl?: string;
  badgeLevel: string;
  approvedCount: number;
  createdAt: string;
};

const LIMIT = 12;

const CATEGORIES = ["NATURE", "CULTURE", "ADVENTURE", "FOOD", "WELLNESS", "BEACH", "HERITAGE"];
const TYPES = ["EVENT", "RENTAL", "ACCOMMODATION", "ACTIVITY"];

export function Browse() {
  const nav = useNavigate();

  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [category, setCategory] = useState("");
  const [type, setType] = useState("");
  const [startAfter, setStartAfter] = useState("");
  const [startBefore, setStartBefore] = useState("");
  const [offset, setOffset] = useState(0);
  const [allListings, setAllListings] = useState<Listing[]>([]);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "map">("grid");
  const [activeMarkerId, setActiveMarkerId] = useState<string | null>(null);
  const [nearMeLoading, setNearMeLoading] = useState(false);
  const [nearMeError, setNearMeError] = useState<string | null>(null);
  const [browseMode, setBrowseMode] = useState<"experiences" | "hosts">("experiences");

  const { isLoaded: mapsLoaded } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string,
    libraries: MAPS_LIBRARIES,
  });

  const { data: meData } = useQuery(ME_QUERY);
  const { data: savedData, refetch: refetchSaved } = useQuery(MY_SAVED_LISTINGS);
  const { isEnabledFor } = useFeatureFlags();
  const userRole: "TRAVELER" | "HOST" = meData?.me?.role === "HOST" ? "HOST" : "TRAVELER";
  const nearMeEnabled = isEnabledFor("NEAR_ME_SEARCH", userRole);
  const mapViewEnabled = isEnabledFor("MAP_VIEW", userRole);
  const [saveListing] = useMutation(SAVE_LISTING);
  const [unsaveListing] = useMutation(UNSAVE_LISTING);

  const isPremiumUser: boolean =
    meData?.me?.isPremium === true ||
    meData?.me?.role === "HOST" ||
    meData?.me?.role === "ADMIN";

  const savedIds = new Set<string>(
    (savedData?.savedListings ?? []).map((l: { id: string }) => l.id)
  );

  const [search, { data, loading }] = useLazyQuery(SEARCH_LISTINGS);
  const [fetchNearby] = useLazyQuery(NEARBY_LISTINGS_QUERY);
  const [fetchHosts, { data: hostsData, loading: hostsLoading }] = useLazyQuery(ALL_HOSTS);
  const { data: itineraryGoingData } = useQuery(MY_ITINERARY_GOING);
  const [markGoing] = useMutation(MARK_GOING);
  const [unmarkGoing] = useMutation(UNMARK_GOING);

  const goingIds = new Set<string>(
    (itineraryGoingData?.myItinerary ?? [])
      .filter((i: { isGoingEntry: boolean }) => i.isGoingEntry)
      .map((i: { listingId: string }) => i.listingId)
  );

  const runSearch = useCallback(
    (resetOffset = false) => {
      const newOffset = resetOffset ? 0 : offset;
      search({
        variables: {
          q: debouncedQ || undefined,
          category: category || undefined,
          type: type || undefined,
          limit: LIMIT,
          offset: newOffset,
          startAfter: startAfter || undefined,
          startBefore: startBefore || undefined,
          hidePastEvents: true,
        },
      });
    },
    [search, debouncedQ, category, type, offset, startAfter, startBefore]
  );

  // If map view is disabled by admin while user is in map mode, switch back to grid
  useEffect(() => {
    if (!mapViewEnabled && viewMode === "map") setViewMode("grid");
  }, [mapViewEnabled, viewMode]);

  // Debounce search input
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 400);
    return () => clearTimeout(t);
  }, [q]);

  // Re-search when filters change
  useEffect(() => {
    setOffset(0);
    setAllListings([]);
    runSearch(true);
  }, [debouncedQ, category, type, startAfter, startBefore]); // eslint-disable-line

  // Append results when offset changes (load more)
  useEffect(() => {
    if (offset > 0) runSearch();
  }, [offset]); // eslint-disable-line

  // Accumulate listings
  useEffect(() => {
    if (data?.searchListings?.listings) {
      if (offset === 0) {
        setAllListings(data.searchListings.listings);
      } else {
        setAllListings((prev) => [...prev, ...data.searchListings.listings]);
      }
    }
  }, [data, offset]);

  const total: number = data?.searchListings?.total ?? 0;
  const hasMore = allListings.length < total;

  async function toggleSave(id: string) {
    if (savedIds.has(id)) {
      await unsaveListing({ variables: { listingId: id } });
    } else {
      await saveListing({ variables: { listingId: id } });
    }
    refetchSaved();
  }

  function handleCardClick(listing: Listing) {
    if (listing.isPremium && !isPremiumUser) {
      setShowUpgradeModal(true);
      return;
    }
    nav(`/listing/${listing.id}`);
  }

  async function handleGoing(e: React.MouseEvent, listingId: string, isGoing: boolean) {
    e.stopPropagation();
    if (isGoing) {
      await unmarkGoing({ variables: { listingId } });
    } else {
      await markGoing({ variables: { listingId } });
    }
  }

  useEffect(() => {
    if (browseMode === 'hosts') {
      fetchHosts({ variables: { limit: 40, offset: 0 } });
    }
  }, [browseMode]); // eslint-disable-line

  async function handleNearMe() {
    setNearMeError(null);
    if (!navigator.geolocation) {
      setNearMeError("Geolocation is not supported by your browser.");
      return;
    }
    setNearMeLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          const { data: nearbyData } = await fetchNearby({
            variables: { lat: latitude, lng: longitude, radiusKm: 50, limit: 40 },
          });
          if (nearbyData?.nearbyListings) {
            setAllListings(nearbyData.nearbyListings);
            setViewMode("map");
          }
        } catch {
          setNearMeError("Could not fetch nearby listings.");
        }
        setNearMeLoading(false);
      },
      () => {
        setNearMeError("Location permission denied.");
        setNearMeLoading(false);
      },
    );
  }

  return (
    <DashboardLayout
      title="Browse Experiences"
      subtitle="Discover authentic Sri Lankan experiences"
    >
      {/* Upgrade Modal */}
      {showUpgradeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full text-center">
            <div className="text-4xl mb-3">🔒</div>
            <h3 className="text-lg font-bold text-slate-700 mb-2">Premium Experience</h3>
            <p className="text-sm text-slate-500 mb-6">
              This is a premium listing. HOST accounts get full access to all listings.
              Contact an admin to upgrade your account.
            </p>
            <button
              onClick={() => setShowUpgradeModal(false)}
              className="px-6 py-2 bg-sky-500 hover:bg-sky-600 text-white font-bold rounded-lg text-sm transition-colors"
            >
              Got it
            </button>
          </div>
        </div>
      )}

      <div className="mx-auto w-full max-w-7xl">
        {/* Experiences | Hosts toggle */}
        <div className="mb-5 flex items-center gap-1 bg-white rounded-xl shadow px-2 py-1.5 w-fit">
          <button
            onClick={() => setBrowseMode("experiences")}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-colors ${browseMode === "experiences" ? "bg-brand-500 text-white" : "text-slate-500 hover:text-slate-700"}`}
          >
            🌴 Experiences
          </button>
          <button
            onClick={() => setBrowseMode("hosts")}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-colors ${browseMode === "hosts" ? "bg-brand-500 text-white" : "text-slate-500 hover:text-slate-700"}`}
          >
            👥 Hosts
          </button>
        </div>

        {/* Host grid */}
        {browseMode === "hosts" && (
          <div>
            {hostsLoading && (
              <div className="text-sm text-slate-400 font-semibold py-8 text-center">Loading hosts…</div>
            )}
            {!hostsLoading && (hostsData?.allHosts ?? []).length === 0 && (
              <div className="text-center py-16 text-slate-400 font-semibold">No hosts found.</div>
            )}
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {(hostsData?.allHosts ?? []).map((host: HostCard) => {
                const initials = (host.displayName ?? host.firebaseUid.slice(0, 2)).slice(0, 2).toUpperCase();
                return (
                  <div
                    key={host.firebaseUid}
                    className="bg-white rounded-xl shadow-lg p-5 cursor-pointer hover:shadow-xl transition-shadow flex flex-col items-center text-center gap-2"
                    onClick={() => nav(`/hosts/${host.firebaseUid}`)}
                  >
                    {host.avatarUrl ? (
                      <img src={host.avatarUrl} alt={host.displayName ?? "Host"} className="w-16 h-16 rounded-full object-cover" />
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-brand-100 flex items-center justify-center text-brand-600 font-bold text-xl">
                        {initials}
                      </div>
                    )}
                    <div className="font-bold text-slate-700">{host.displayName ?? "Host"}</div>
                    <div className="text-xs text-slate-400">
                      {BADGE_EMOJI[host.badgeLevel]} {host.badgeLevel !== 'NONE' ? host.badgeLevel : ''}
                      {host.approvedCount > 0 && ` · ${host.approvedCount} events`}
                    </div>
                    <div className="text-[10px] text-slate-300">
                      Joined {new Date(host.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {browseMode === "experiences" && (
        <div>

        {/* Filters */}
        <div className="mb-6 flex flex-wrap gap-3">
          <input
            type="text"
            placeholder="Search experiences…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="border-0 px-4 py-2 text-slate-600 bg-white rounded shadow text-sm focus:outline-none focus:ring w-full sm:w-72"
          />
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="border-0 px-3 py-2 text-slate-600 bg-white rounded shadow text-sm focus:outline-none focus:ring"
          >
            <option value="">All Types</option>
            {TYPES.map((t) => (
              <option key={t} value={t}>
                {t.charAt(0) + t.slice(1).toLowerCase()}
              </option>
            ))}
          </select>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="border-0 px-3 py-2 text-slate-600 bg-white rounded shadow text-sm focus:outline-none focus:ring"
          >
            <option value="">All Categories</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c.charAt(0) + c.slice(1).toLowerCase()}
              </option>
            ))}
          </select>
          <div className="flex items-center gap-2">
            <label className="text-xs font-bold text-slate-500 uppercase whitespace-nowrap">From</label>
            <input
              type="date"
              value={startAfter}
              onChange={(e) => setStartAfter(e.target.value)}
              className="border-0 px-3 py-2 text-slate-600 bg-white rounded shadow text-sm focus:outline-none focus:ring"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs font-bold text-slate-500 uppercase whitespace-nowrap">To</label>
            <input
              type="date"
              value={startBefore}
              onChange={(e) => setStartBefore(e.target.value)}
              className="border-0 px-3 py-2 text-slate-600 bg-white rounded shadow text-sm focus:outline-none focus:ring"
            />
          </div>
          {(startAfter || startBefore) && (
            <button
              onClick={() => { setStartAfter(""); setStartBefore(""); }}
              className="text-xs text-slate-400 hover:text-slate-700 font-semibold underline"
            >
              Clear dates
            </button>
          )}
          {nearMeEnabled && (
            <button
              onClick={handleNearMe}
              disabled={nearMeLoading}
              className="px-3 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-bold rounded shadow text-xs transition-colors whitespace-nowrap"
            >
              {nearMeLoading ? "Locating…" : "📍 Near Me"}
            </button>
          )}
          {mapViewEnabled && (
            <div className="ml-auto flex items-center gap-1 bg-white rounded shadow px-1 py-1">
              <button
                onClick={() => setViewMode("grid")}
                className={`px-3 py-1 rounded text-xs font-bold transition-colors ${viewMode === "grid" ? "bg-sky-500 text-white" : "text-slate-500 hover:text-slate-700"}`}
              >
                ⊞ Grid
              </button>
              <button
                onClick={() => setViewMode("map")}
                className={`px-3 py-1 rounded text-xs font-bold transition-colors ${viewMode === "map" ? "bg-sky-500 text-white" : "text-slate-500 hover:text-slate-700"}`}
              >
                🗺 Map
              </button>
            </div>
          )}
        </div>

        {/* Near Me error */}
        {nearMeError && (
          <div className="mb-4 rounded bg-red-100 px-4 py-2 text-xs font-bold text-red-700 shadow">
            {nearMeError}
          </div>
        )}

        {/* Results count */}
        {!loading && data && (
          <p className="text-xs font-semibold text-slate-400 mb-4">
            {total} result{total !== 1 ? "s" : ""} found
          </p>
        )}

        {/* Loading / empty states */}
        {loading && allListings.length === 0 && (
          <div className="text-sm text-slate-500 font-semibold py-10 text-center">
            Searching…
          </div>
        )}

        {!loading && allListings.length === 0 && data && (
          <div className="text-center py-16 text-slate-400 font-semibold">
            No listings found. Try a different search or filter.
          </div>
        )}

        {/* Map View */}
        {viewMode === "map" && (
          <div className="mb-6">
            {mapsLoaded ? (
              <GoogleMap
                mapContainerStyle={{ width: "100%", height: "560px", borderRadius: "12px" }}
                center={{ lat: 7.8731, lng: 80.7718 }}
                zoom={8}
                onClick={() => setActiveMarkerId(null)}
                options={{ streetViewControl: false, mapTypeControl: false, fullscreenControl: false }}
              >
                {allListings
                  .filter((l) => l.lat && l.lng && l.lat !== 0 && l.lng !== 0)
                  .map((l) => (
                    <Marker
                      key={l.id}
                      position={{ lat: l.lat!, lng: l.lng! }}
                      onClick={() => setActiveMarkerId(l.id)}
                    />
                  ))}
                {(() => {
                  const active = allListings.find((l) => l.id === activeMarkerId);
                  if (!active || !active.lat || !active.lng) return null;
                  return (
                    <InfoWindow
                      position={{ lat: active.lat, lng: active.lng }}
                      onCloseClick={() => setActiveMarkerId(null)}
                    >
                      <div className="max-w-[200px]">
                        {active.imageUrl && (
                          <img src={active.imageUrl} alt={active.title} className="w-full h-20 object-cover rounded mb-2" />
                        )}
                        <div className="font-bold text-slate-700 text-sm leading-snug mb-1">{active.title}</div>
                        {active.placeName && (
                          <div className="text-xs text-slate-400 mb-1">📍 {active.placeName}</div>
                        )}
                        <div className="text-xs font-bold text-brand-600 mb-2">
                          {active.price ? `LKR ${Number(active.price).toLocaleString()}` : "Free"}
                        </div>
                        <button
                          onClick={() => handleCardClick(active)}
                          className="text-xs font-bold text-white bg-brand-500 hover:bg-brand-600 px-3 py-1 rounded transition-colors"
                        >
                          View →
                        </button>
                      </div>
                    </InfoWindow>
                  );
                })()}
              </GoogleMap>
            ) : (
              <div className="w-full h-[560px] rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 text-sm font-semibold">
                Loading map…
              </div>
            )}
          </div>
        )}

        {/* Grid View */}
        {viewMode === "grid" && (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {allListings.map((listing) => {
              const locked = listing.isPremium && !isPremiumUser;
              const isSaved = savedIds.has(listing.id);
              return (
                <div
                  key={listing.id}
                  className="relative bg-white rounded-xl shadow-lg overflow-hidden cursor-pointer hover:shadow-xl transition-shadow duration-150"
                  onClick={() => handleCardClick(listing)}
                >
                  {/* Image */}
                  <div className="relative h-44 bg-slate-100">
                    {listing.imageUrl ? (
                      <img
                        src={listing.imageUrl}
                        alt={listing.title}
                        className={`w-full h-full object-cover ${locked ? "blur-sm" : ""}`}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-4xl text-slate-300">
                        🏝️
                      </div>
                    )}
                    {/* Premium badge */}
                    {listing.isPremium && (
                      <div className="absolute top-2 left-2 bg-amber-400 text-white text-[10px] font-bold uppercase px-2 py-0.5 rounded-full shadow">
                        Premium
                      </div>
                    )}
                    {/* Lock overlay */}
                    {locked && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/30">
                        <div className="text-3xl">🔒</div>
                        <div className="text-white text-xs font-bold mt-1">Host only</div>
                      </div>
                    )}
                    {/* Save button */}
                    <button
                      className="absolute top-2 right-2 w-8 h-8 flex items-center justify-center rounded-full bg-white/80 hover:bg-white shadow text-base transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSave(listing.id);
                      }}
                      title={isSaved ? "Unsave" : "Save"}
                    >
                      {isSaved ? "❤️" : "🤍"}
                    </button>
                  </div>

                  {/* Content */}
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h3 className="font-bold text-slate-700 text-sm leading-snug line-clamp-1">
                        {listing.title}
                      </h3>
                      <Badge value={listing.type} />
                    </div>

                    {listing.category && (
                      <div className="text-[10px] font-bold uppercase text-slate-400 mb-1">
                        {listing.category.charAt(0) + listing.category.slice(1).toLowerCase()}
                      </div>
                    )}

                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed mb-3">
                      {listing.description}
                    </p>

                    <div className="flex items-center justify-between">
                      {listing.price ? (
                        <span className="text-sm font-bold text-sky-600">
                          LKR {Number(listing.price).toLocaleString()}
                        </span>
                      ) : (
                        <span className="text-xs font-semibold text-emerald-500">Free</span>
                      )}
                      <div className="flex flex-col items-end gap-0.5">
                        {listing.placeName && (
                          <span className="text-[10px] text-slate-400 font-semibold truncate max-w-[110px]">
                            📍 {listing.placeName}
                          </span>
                        )}
                        {listing.startDateTime && (
                          <span className="text-[10px] text-slate-400 font-semibold">
                            🗓 {new Date(listing.startDateTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                        )}
                      </div>
                    </div>
                    {listing.type === "EVENT" && (
                      <button
                        onClick={(e) => handleGoing(e, listing.id, goingIds.has(listing.id))}
                        className={`mt-3 w-full py-1.5 rounded-lg text-xs font-bold border-2 transition-colors ${
                          goingIds.has(listing.id)
                            ? "bg-emerald-500 border-emerald-500 text-white"
                            : "border-emerald-500 text-emerald-600 hover:bg-emerald-50"
                        }`}
                      >
                        {goingIds.has(listing.id) ? "✓ I'm Going" : "🎫 I'm Going"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Load more (grid only) */}
        {viewMode === "grid" && hasMore && (
          <div className="mt-8 text-center">
            <button
              onClick={() => setOffset((o) => o + LIMIT)}
              disabled={loading}
              className="px-8 py-2 bg-sky-500 hover:bg-sky-600 disabled:opacity-50 text-white font-bold rounded-lg text-sm shadow transition-colors"
            >
              {loading ? "Loading…" : "Load more"}
            </button>
          </div>
        )}
        </div>
        )}
      </div>
    </DashboardLayout>
  );
}
