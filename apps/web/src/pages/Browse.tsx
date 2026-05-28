import { useState, useEffect, useCallback } from "react";
import { useQuery, useLazyQuery, useMutation } from "@apollo/client/react";
import { useNavigate } from "react-router-dom";
import { GoogleMap, Marker, InfoWindow, useJsApiLoader } from "@react-google-maps/api";
import { DashboardLayout } from "../layouts/DashboardLayout";
import { Badge } from "../ui/Badge";
import { ME_QUERY, SEARCH_LISTINGS, NEARBY_LISTINGS_QUERY } from "./browse.gql";
import { MY_SAVED_LISTINGS, SAVE_LISTING, UNSAVE_LISTING } from "./host/saved.gql";

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
  lat?: number;
  lng?: number;
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

  const { isLoaded: mapsLoaded } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string,
  });

  const { data: meData } = useQuery(ME_QUERY);
  const { data: savedData, refetch: refetchSaved } = useQuery(MY_SAVED_LISTINGS);
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
        },
      });
    },
    [search, debouncedQ, category, type, offset, startAfter, startBefore]
  );

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
          <button
            onClick={handleNearMe}
            disabled={nearMeLoading}
            className="px-3 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-bold rounded shadow text-xs transition-colors whitespace-nowrap"
          >
            {nearMeLoading ? "Locating…" : "📍 Near Me"}
          </button>
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
                    >
                      {activeMarkerId === l.id && (
                        <InfoWindow onCloseClick={() => setActiveMarkerId(null)}>
                          <div className="max-w-[200px]">
                            {l.imageUrl && (
                              <img src={l.imageUrl} alt={l.title} className="w-full h-20 object-cover rounded mb-2" />
                            )}
                            <div className="font-bold text-slate-700 text-sm leading-snug mb-1">{l.title}</div>
                            {l.placeName && (
                              <div className="text-xs text-slate-400 mb-1">📍 {l.placeName}</div>
                            )}
                            <div className="text-xs font-bold text-sky-600 mb-2">
                              {l.price ? `LKR ${Number(l.price).toLocaleString()}` : "Free"}
                            </div>
                            <button
                              onClick={() => handleCardClick(l)}
                              className="text-xs font-bold text-white bg-sky-500 hover:bg-sky-600 px-3 py-1 rounded transition-colors"
                            >
                              View →
                            </button>
                          </div>
                        </InfoWindow>
                      )}
                    </Marker>
                  ))}
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
                      {listing.placeName && (
                        <span className="text-[10px] text-slate-400 font-semibold truncate max-w-[100px]">
                          📍 {listing.placeName}
                        </span>
                      )}
                    </div>
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
    </DashboardLayout>
  );
}
