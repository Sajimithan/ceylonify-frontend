import { useState, useEffect, useCallback } from "react";
import { GoogleMap, Marker, InfoWindow, useJsApiLoader } from "@react-google-maps/api";
import { MAPS_LIBRARIES } from "../lib/googleMaps";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@apollo/client/react";
import { useSmartPoll } from "../hooks/useSmartPoll";
import { DashboardLayout } from "../layouts/DashboardLayout";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { GET_LISTING_DETAIL, ME_QUERY, RELATED_LISTINGS_QUERY, HOST_BADGE_QUERY } from "./browse.gql";
import { MY_SAVED_LISTINGS, SAVE_LISTING, UNSAVE_LISTING } from "./host/saved.gql";
import { IS_GOING, MARK_GOING, UNMARK_GOING } from "./going.gql";
import { LISTING_EXPERIENCES } from "./experiences.gql";
import { REPORT_LISTING } from "./report.gql";

type WeatherData = {
  main: { temp: number; feels_like: number; humidity: number };
  weather: { description: string; icon: string }[];
  name: string;
};

type ForecastEntry = {
  dt: number;
  main: { temp: number; feels_like: number; humidity: number };
  weather: { description: string; icon: string }[];
};

function WeatherWidget({ lat, lng, eventDate }: { lat: number; lng: number; eventDate?: string }) {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [forecastLabel, setForecastLabel] = useState<string | null>(null);
  const [outOfRange, setOutOfRange] = useState<string | null>(null);
  const apiKey = import.meta.env.VITE_WEATHER_API_KEY as string | undefined;

  useEffect(() => {
    if (!apiKey || lat === 0 || lng === 0) return;
    setWeather(null);
    setForecastLabel(null);
    setOutOfRange(null);

    const fetchCurrent = () => {
      fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&appid=${apiKey}&units=metric`)
        .then((r) => r.json())
        .then((d) => setWeather(d as WeatherData))
        .catch(() => null);
    };

    if (!eventDate) {
      fetchCurrent();
      return;
    }

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const eventDt = new Date(eventDate);
    const eventDayStart = new Date(eventDt.getFullYear(), eventDt.getMonth(), eventDt.getDate());
    const diffDays = Math.round((eventDayStart.getTime() - todayStart.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      setOutOfRange('Weather data unavailable for past events.');
      return;
    }
    if (diffDays > 5) {
      setOutOfRange('beyond5');
      return;
    }
    if (diffDays === 0) {
      fetchCurrent();
      return;
    }

    // 1–5 days ahead: use 5-day forecast, find closest 3-hour slot
    fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lng}&appid=${apiKey}&units=metric`)
      .then((r) => r.json())
      .then((d: { list: ForecastEntry[] }) => {
        const list = d.list;
        if (!list?.length) return;
        const target = eventDt.getTime();
        const closest = list.reduce((best, entry) =>
          Math.abs(entry.dt * 1000 - target) < Math.abs(best.dt * 1000 - target) ? entry : best
        );
        setWeather({ main: closest.main, weather: closest.weather, name: '' });
        setForecastLabel(
          `Forecast for ${eventDt.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}`
        );
      })
      .catch(() => null);
  }, [lat, lng, apiKey, eventDate]);

  if (!apiKey || lat === 0 || lng === 0) return null;

  if (outOfRange) return (
    <div className="space-y-1">
      <div className="text-xs text-slate-400 italic">
        {outOfRange === 'beyond5'
          ? 'Forecast available up to 5 days before the event.'
          : outOfRange}
      </div>
      {outOfRange === 'beyond5' && (
        <div className="text-xs text-brand-500 font-medium">
          Upgrade to Premium to unlock extended weather forecasts and plan ahead with confidence.
        </div>
      )}
    </div>
  );

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
        {forecastLabel && (
          <div className="text-xs text-brand-500 font-medium mt-0.5">{forecastLabel}</div>
        )}
      </div>
    </div>
  );
}

function ListingMap({ lat, lng, title }: { lat: number; lng: number; title: string }) {
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string,
    libraries: MAPS_LIBRARIES,
  });
  const [infoOpen, setInfoOpen] = useState(true);
  const center = { lat, lng };
  const onLoad = useCallback(() => {}, []);

  if (!isLoaded) {
    return (
      <div className="w-full h-72 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 text-sm font-semibold">
        Loading map…
      </div>
    );
  }

  return (
    <GoogleMap
      mapContainerClassName="w-full h-72 rounded-xl shadow"
      center={center}
      zoom={15}
      onLoad={onLoad}
      options={{ streetViewControl: false, mapTypeControl: false, fullscreenControl: false }}
    >
      <Marker position={center} onClick={() => setInfoOpen(true)} />
      {infoOpen && (
        <InfoWindow position={center} onCloseClick={() => setInfoOpen(false)}>
          <div className="text-slate-700 font-semibold text-sm max-w-[180px]">{title}</div>
        </InfoWindow>
      )}
    </GoogleMap>
  );
}

export function ListingDetail() {
  const { id } = useParams<{ id: string }>();
  const nav = useNavigate();

  const { data: listingData, loading, startPolling, stopPolling } = useQuery(GET_LISTING_DETAIL, {
    variables: { id },
    skip: !id,
    fetchPolicy: "cache-and-network",
  });
  useSmartPoll(startPolling, stopPolling, 15_000);
  const { data: meData } = useQuery(ME_QUERY);
  const { data: relatedData } = useQuery(RELATED_LISTINGS_QUERY, {
    variables: { listingId: id },
    skip: !id,
  });
  const { data: savedData, refetch: refetchSaved } = useQuery(MY_SAVED_LISTINGS);
  const [saveListing] = useMutation(SAVE_LISTING);
  const [unsaveListing] = useMutation(UNSAVE_LISTING);
  const { data: isGoingData, refetch: refetchGoing } = useQuery(IS_GOING, { variables: { listingId: id }, skip: !id });
  const [markGoing] = useMutation(MARK_GOING);
  const [unmarkGoing] = useMutation(UNMARK_GOING);
  const { data: experiencesData } = useQuery(LISTING_EXPERIENCES, { variables: { listingId: id }, skip: !id });
  const hostUid: string | undefined = listingData?.listing?.createdBy;
  const { data: hostBadgeData } = useQuery(HOST_BADGE_QUERY, { variables: { firebaseUid: hostUid ?? "" }, skip: !hostUid });
  const [reportListing] = useMutation(REPORT_LISTING);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState("INAPPROPRIATE");
  const [reportComment, setReportComment] = useState("");
  const [reportSubmitted, setReportSubmitted] = useState(false);

  const listing = listingData?.listing;
  const isPremiumUser: boolean =
    meData?.me?.isPremium === true ||
    meData?.me?.role === "HOST" ||
    meData?.me?.role === "ADMIN";

  const savedIds = new Set<string>(
    (savedData?.savedListings ?? []).map((l: { id: string }) => l.id)
  );
  const isSaved = id ? savedIds.has(id) : false;
  const isGoing: boolean = isGoingData?.isGoing ?? false;

  async function handleSubmitReport() {
    if (!id) return;
    await reportListing({ variables: { listingId: id, reason: reportReason, comment: reportComment || undefined } });
    setReportSubmitted(true);
    setTimeout(() => { setShowReportModal(false); setReportSubmitted(false); setReportComment(""); }, 1500);
  }

  async function handleGoing() {
    if (!id) return;
    if (isGoing) {
      await unmarkGoing({ variables: { listingId: id } });
    } else {
      await markGoing({ variables: { listingId: id } });
    }
    refetchGoing();
  }

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
      {/* Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white rounded-2xl shadow-2xl p-7 max-w-sm w-full">
            {reportSubmitted ? (
              <div className="text-center py-4">
                <div className="text-3xl mb-2">✅</div>
                <div className="font-bold text-slate-700">Report submitted. Thank you!</div>
              </div>
            ) : (
              <>
                <h3 className="font-bold text-slate-700 text-lg mb-4">Report Listing</h3>
                <div className="mb-3">
                  <label className="block text-xs font-bold text-slate-500 mb-1">Reason *</label>
                  <select
                    value={reportReason}
                    onChange={(e) => setReportReason(e.target.value)}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300"
                  >
                    <option value="INAPPROPRIATE">Inappropriate content</option>
                    <option value="MISLEADING">Misleading information</option>
                    <option value="SPAM">Spam</option>
                    <option value="ILLEGAL">Illegal activity</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
                <div className="mb-5">
                  <label className="block text-xs font-bold text-slate-500 mb-1">Additional details (optional)</label>
                  <textarea
                    value={reportComment}
                    onChange={(e) => setReportComment(e.target.value)}
                    rows={3}
                    placeholder="Describe the issue…"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-300"
                  />
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setShowReportModal(false)} className="flex-1 py-2 border border-slate-200 rounded-lg text-slate-500 font-bold text-sm hover:bg-slate-50 transition-colors">
                    Cancel
                  </button>
                  <button onClick={handleSubmitReport} className="flex-1 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-bold text-sm transition-colors">
                    Submit Report
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

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
                <ListingMap lat={listing.lat} lng={listing.lng} title={listing.title} />
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
                {!(listing.type === "EVENT" && listing.startDateTime && new Date(listing.startDateTime) < new Date()) && (
                  <button
                    onClick={toggleSave}
                    className="w-full py-2 rounded-lg font-bold text-sm border-2 border-sky-500 text-sky-600 hover:bg-sky-50 transition-colors flex items-center justify-center gap-2"
                  >
                    {isSaved ? "❤️ Saved" : "🤍 Save Listing"}
                  </button>
                )}
                {listing.type === "EVENT" && !(listing.startDateTime && new Date(listing.startDateTime) < new Date()) && (
                  <button
                    onClick={handleGoing}
                    className={`w-full py-2 rounded-lg font-bold text-sm border-2 transition-colors flex items-center justify-center gap-2 ${
                      isGoing
                        ? "bg-emerald-500 border-emerald-500 text-white"
                        : "border-emerald-500 text-emerald-600 hover:bg-emerald-50"
                    }`}
                  >
                    {isGoing ? "✓ I'm Going" : "🎫 I'm Going"}
                  </button>
                )}

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
                <button
                  onClick={() => setShowReportModal(true)}
                  className="w-full py-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors border border-transparent hover:border-red-100"
                >
                  🚩 Report this listing
                </button>
              </div>
            </div>

            {/* Host info card */}
            {hostUid && (
              <div className="bg-white rounded-xl shadow p-5">
                <h2 className="text-slate-400 text-xs font-bold uppercase mb-3">Host</h2>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center text-brand-600 font-bold text-sm flex-shrink-0">
                    {hostUid.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-slate-700 truncate">
                      {hostBadgeData?.hostBadge?.badgeLevel && hostBadgeData.hostBadge.badgeLevel !== 'NONE'
                        ? `${hostBadgeData.hostBadge.badgeLevel === 'DIAMOND' ? '💎' : hostBadgeData.hostBadge.badgeLevel === 'GOLD' ? '🥇' : hostBadgeData.hostBadge.badgeLevel === 'SILVER' ? '🥈' : '🥉'} ${hostBadgeData.hostBadge.badgeLevel} Host`
                        : 'Ceylonify Host'}
                    </div>
                    {hostBadgeData?.hostBadge?.approvedCount > 0 && (
                      <div className="text-[11px] text-slate-400">{hostBadgeData.hostBadge.approvedCount} approved experiences</div>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => nav(`/hosts/${hostUid}`)}
                  className="mt-3 w-full py-1.5 rounded-lg text-xs font-bold text-brand-600 border border-brand-200 hover:bg-brand-50 transition-colors"
                >
                  View Host Profile →
                </button>
              </div>
            )}

            {/* Weather */}
            {hasCoords && (
              <div className="bg-white rounded-xl shadow p-5">
                <h2 className="text-slate-400 text-xs font-bold uppercase mb-3">
                  Weather
                </h2>
                <WeatherWidget lat={listing.lat} lng={listing.lng} eventDate={listing.startDateTime ?? undefined} />
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

        {/* Traveler Experiences */}
        {(() => {
          const experiences = experiencesData?.listingExperiences ?? [];
          if (experiences.length === 0) return null;
          const avgRating = (experiences.reduce((s: number, e: { rating: number }) => s + e.rating, 0) / experiences.length).toFixed(1);
          return (
            <div className="mt-10">
              <h2 className="text-slate-600 font-bold text-sm uppercase mb-1">Traveler Experiences</h2>
              <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl font-bold text-amber-500">{"⭐".repeat(Math.round(Number(avgRating)))}</span>
                <span className="text-slate-500 text-sm font-semibold">{avgRating} / 5 ({experiences.length} review{experiences.length !== 1 ? "s" : ""})</span>
              </div>
              <div className="space-y-4">
                {experiences.map((exp: { id: string; rating: number; text: string; imageUrls: string[]; createdAt: string; user?: { displayName?: string; avatarUrl?: string } }) => (
                  <div key={exp.id} className="bg-white rounded-xl shadow p-5">
                    <div className="flex items-center gap-3 mb-2">
                      {exp.user?.avatarUrl ? (
                        <img src={exp.user.avatarUrl} alt={exp.user.displayName ?? "Traveler"} className="w-8 h-8 rounded-full object-cover" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-xs font-bold text-brand-600">
                          {(exp.user?.displayName ?? "T").slice(0, 1).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <div className="text-sm font-semibold text-slate-700">{exp.user?.displayName ?? "Traveler"}</div>
                        <div className="text-[10px] text-slate-400">{new Date(exp.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</div>
                      </div>
                      <div className="ml-auto text-amber-400 text-sm">{"⭐".repeat(exp.rating)}</div>
                    </div>
                    <p className="text-sm text-slate-600 leading-relaxed">{exp.text}</p>
                    {exp.imageUrls.length > 0 && (
                      <div className="flex gap-2 mt-3 overflow-x-auto">
                        {exp.imageUrls.map((url, i) => (
                          <img key={i} src={url} alt={`Experience photo ${i + 1}`} className="h-20 w-20 object-cover rounded-lg flex-shrink-0" />
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })()}
      </div>
    </DashboardLayout>
  );
}
