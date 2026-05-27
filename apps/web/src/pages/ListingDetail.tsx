import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@apollo/client/react";
import { DashboardLayout } from "../layouts/DashboardLayout";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { GET_LISTING_DETAIL, ME_QUERY, RELATED_LISTINGS_QUERY } from "./browse.gql";
import { MY_SAVED_LISTINGS, SAVE_LISTING, UNSAVE_LISTING } from "./host/saved.gql";

type WeatherData = {
  main: { temp: number; feels_like: number; humidity: number };
  weather: { description: string; icon: string }[];
  name: string;
};

function WeatherWidget({ lat, lng }: { lat: number; lng: number }) {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const apiKey = import.meta.env.VITE_WEATHER_API_KEY as string | undefined;

  useEffect(() => {
    if (!apiKey || lat === 0 || lng === 0) return;
    fetch(
      `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&appid=${apiKey}&units=metric`
    )
      .then((r) => r.json())
      .then((d) => setWeather(d as WeatherData))
      .catch(() => null);
  }, [lat, lng, apiKey]);

  if (!apiKey || lat === 0 || lng === 0) return null;
  if (!weather) return (
    <div className="text-xs text-slate-400 font-semibold">Loading weather…</div>
  );

  const icon = weather.weather[0]?.icon;
  return (
    <div className="flex items-center gap-3">
      {icon && (
        <img
          src={`https://openweathermap.org/img/wn/${icon}.png`}
          alt="weather"
          className="w-10 h-10"
        />
      )}
      <div>
        <div className="text-2xl font-bold text-slate-700">
          {Math.round(weather.main.temp)}°C
        </div>
        <div className="text-xs text-slate-400 capitalize">
          {weather.weather[0]?.description}
        </div>
        <div className="text-xs text-slate-400">
          Humidity {weather.main.humidity}%
        </div>
      </div>
    </div>
  );
}

function MapEmbed({ lat, lng }: { lat: number; lng: number }) {
  if (lat === 0 && lng === 0) return null;
  const bbox = `${lng - 0.01},${lat - 0.01},${lng + 0.01},${lat + 0.01}`;
  return (
    <iframe
      title="Location Map"
      src={`https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat},${lng}`}
      className="w-full rounded-lg shadow"
      height={280}
      style={{ border: 0 }}
      loading="lazy"
    />
  );
}

export function ListingDetail() {
  const { id } = useParams<{ id: string }>();
  const nav = useNavigate();

  const { data: listingData, loading } = useQuery(GET_LISTING_DETAIL, {
    variables: { id },
    skip: !id,
  });
  const { data: meData } = useQuery(ME_QUERY);
  const { data: relatedData } = useQuery(RELATED_LISTINGS_QUERY, {
    variables: { listingId: id },
    skip: !id,
  });
  const { data: savedData, refetch: refetchSaved } = useQuery(MY_SAVED_LISTINGS);
  const [saveListing] = useMutation(SAVE_LISTING);
  const [unsaveListing] = useMutation(UNSAVE_LISTING);

  const listing = listingData?.listing;
  const isPremiumUser: boolean =
    meData?.me?.isPremium === true ||
    meData?.me?.role === "HOST" ||
    meData?.me?.role === "ADMIN";

  const savedIds = new Set<string>(
    (savedData?.savedListings ?? []).map((l: { id: string }) => l.id)
  );
  const isSaved = id ? savedIds.has(id) : false;

  async function toggleSave() {
    if (!id) return;
    if (isSaved) {
      await unsaveListing({ variables: { listingId: id } });
    } else {
      await saveListing({ variables: { listingId: id } });
    }
    refetchSaved();
  }

  if (loading) {
    return (
      <DashboardLayout title="Listing">
        <div className="text-slate-500 font-bold text-center py-20">Loading…</div>
      </DashboardLayout>
    );
  }

  if (!listing) {
    return (
      <DashboardLayout title="Listing">
        <div className="text-slate-500 font-bold text-center py-20">Listing not found.</div>
      </DashboardLayout>
    );
  }

  const isLocked = listing.isPremium && !isPremiumUser;
  const hasCoords = listing.lat !== 0 && listing.lng !== 0 && listing.lat != null;
  const related = relatedData?.relatedListings ?? [];

  return (
    <DashboardLayout
      title={listing.title}
      subtitle={listing.placeName ?? listing.type}
      actions={
        <Button variant="ghost" onClick={() => nav(-1)}>
          ← Back
        </Button>
      }
    >
      <div className="mx-auto w-full max-w-5xl">
        {isLocked && (
          <div className="mb-6 rounded-xl bg-amber-50 border border-amber-200 px-5 py-4 flex items-start gap-3">
            <div className="text-2xl">🔒</div>
            <div>
              <div className="font-bold text-amber-700 text-sm">Premium Listing</div>
              <div className="text-xs text-amber-600 mt-1">
                Full details are visible to HOST accounts only. Contact an admin to upgrade your account.
              </div>
            </div>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Image */}
            {listing.imageUrl && (
              <div className="relative rounded-xl overflow-hidden shadow-lg">
                <img
                  src={listing.imageUrl}
                  alt={listing.title}
                  className={`w-full h-72 object-cover ${isLocked ? "blur-md" : ""}`}
                />
                {listing.isPremium && (
                  <div className="absolute top-3 left-3 bg-amber-400 text-white text-xs font-bold uppercase px-3 py-1 rounded-full shadow">
                    Premium
                  </div>
                )}
              </div>
            )}

            {/* Description */}
            <div className="bg-white rounded-xl shadow p-6">
              <h2 className="text-slate-400 text-xs font-bold uppercase mb-3">About</h2>
              {isLocked ? (
                <div className="text-sm text-slate-400 italic">
                  Description hidden. Upgrade your account to view full details.
                </div>
              ) : (
                <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-line">
                  {listing.description}
                </p>
              )}
            </div>

            {/* Map */}
            {hasCoords && (
              <div className="bg-white rounded-xl shadow p-6">
                <h2 className="text-slate-400 text-xs font-bold uppercase mb-3">Location</h2>
                <MapEmbed lat={listing.lat} lng={listing.lng} />
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Details card */}
            <div className="bg-white rounded-xl shadow p-5 space-y-3">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge value={listing.type} />
                {listing.category && (
                  <span className="text-[10px] font-bold uppercase text-slate-400">
                    {listing.category.charAt(0) + listing.category.slice(1).toLowerCase()}
                  </span>
                )}
              </div>

              {listing.price && (
                <div>
                  <div className="text-xs text-slate-400 font-bold uppercase">Price</div>
                  <div className="text-2xl font-bold text-sky-600">
                    LKR {Number(listing.price).toLocaleString()}
                  </div>
                </div>
              )}

              {listing.startDateTime && (
                <div>
                  <div className="text-xs text-slate-400 font-bold uppercase">Date & Time</div>
                  <div className="text-sm font-semibold text-slate-600">
                    {new Date(listing.startDateTime).toLocaleString()}
                  </div>
                </div>
              )}

              {listing.placeName && (
                <div>
                  <div className="text-xs text-slate-400 font-bold uppercase">Location</div>
                  <div className="text-sm font-semibold text-slate-600">
                    📍 {listing.placeName}
                  </div>
                </div>
              )}

              <div className="text-xs text-slate-400">
                {listing.viewCount} view{listing.viewCount !== 1 ? "s" : ""}
              </div>

              {/* Action buttons */}
              <div className="space-y-2 pt-2">
                <button
                  onClick={toggleSave}
                  className="w-full py-2 rounded-lg font-bold text-sm border-2 border-sky-500 text-sky-600 hover:bg-sky-50 transition-colors flex items-center justify-center gap-2"
                >
                  {isSaved ? "❤️ Saved" : "🤍 Save Listing"}
                </button>

                {hasCoords && (
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${listing.lat},${listing.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full py-2 rounded-lg font-bold text-sm bg-emerald-500 hover:bg-emerald-600 text-white text-center transition-colors"
                  >
                    🗺️ Get Directions
                  </a>
                )}

                {listing.mapLink && (
                  <a
                    href={listing.mapLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full py-2 rounded-lg font-bold text-sm bg-slate-100 hover:bg-slate-200 text-slate-600 text-center transition-colors"
                  >
                    View on Google Maps
                  </a>
                )}
              </div>
            </div>

            {/* Weather */}
            {hasCoords && (
              <div className="bg-white rounded-xl shadow p-5">
                <h2 className="text-slate-400 text-xs font-bold uppercase mb-3">
                  Current Weather
                </h2>
                <WeatherWidget lat={listing.lat} lng={listing.lng} />
                {(!import.meta.env.VITE_WEATHER_API_KEY) && (
                  <div className="text-xs text-slate-400 italic">
                    Add VITE_WEATHER_API_KEY to .env to enable weather.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Related listings */}
        {related.length > 0 && (
          <div className="mt-10">
            <h2 className="text-slate-600 font-bold text-sm uppercase mb-4">
              You might also like
            </h2>
            <div className="flex gap-4 overflow-x-auto pb-4">
              {related.map((r: { id: string; title: string; type: string; category?: string; price?: string; imageUrl?: string; isPremium: boolean }) => (
                <div
                  key={r.id}
                  onClick={() => nav(`/listing/${r.id}`)}
                  className="flex-shrink-0 w-52 bg-white rounded-xl shadow cursor-pointer hover:shadow-md transition-shadow overflow-hidden"
                >
                  <div className="relative h-32 bg-slate-100">
                    {r.imageUrl ? (
                      <img
                        src={r.imageUrl}
                        alt={r.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-3xl text-slate-300">
                        🏝️
                      </div>
                    )}
                    {r.isPremium && (
                      <div className="absolute top-1.5 left-1.5 bg-amber-400 text-white text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full">
                        Premium
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <div className="font-bold text-slate-700 text-xs line-clamp-1">{r.title}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      {r.type.charAt(0) + r.type.slice(1).toLowerCase()}
                    </div>
                    {r.price && (
                      <div className="text-xs font-bold text-sky-600 mt-1">
                        LKR {Number(r.price).toLocaleString()}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
