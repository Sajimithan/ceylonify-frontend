import { useState, useRef, useEffect } from "react";
import { gql } from "@apollo/client";
import { useMutation } from "@apollo/client/react";
import { CREATE_LISTING } from "./listings.gql";
import {
  GoogleMap,
  Marker,
  useJsApiLoader,
} from "@react-google-maps/api";

const GmpAutocomplete = 'gmp-place-autocomplete' as any;
import { MAPS_LIBRARIES } from "../../lib/googleMaps";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { Input } from "../../ui/Input";
import { Button } from "../../ui/Button";
import { Card } from "../../ui/Card";
import { DashboardLayout } from "../../layouts/DashboardLayout";
import { useNavigate } from "react-router-dom";
import { useFeatureFlags } from "../../auth/useFeatureFlags";
import { useAuth } from "../../auth/useAuth";

const ENHANCE_DESCRIPTION = gql`
  mutation EnhanceDescription($text: String!) {
    enhanceDescription(text: $text)
  }
`;


type ListingType = "EVENT" | "RENTAL" | "ACCOMMODATION" | "ACTIVITY";
type ListingCategory =
  | "NATURE" | "CULTURE" | "ADVENTURE" | "FOOD" | "WELLNESS"
  | "BEACH" | "HERITAGE" | "PARTY" | "NIGHTLIFE" | "SPORTS"
  | "ARTS" | "MUSIC" | "FESTIVAL" | "FAMILY";

type ListingTemplate = {
  id: string;
  name: string;
  title: string;
  description: string;
  type: ListingType;
  category: ListingCategory | "";
  price: string;
  placeName: string;
  mapLink: string;
  isPremium: boolean;
};

export function CreateListing() {
  const nav = useNavigate();
  const { isEnabledFor } = useFeatureFlags();
  const { user } = useAuth();
  const templateKey = `ceylonify_templates_${user?.uid ?? "guest"}`;

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<ListingType>("EVENT");
  const [placeName, setPlaceName] = useState("");
  const [mapLink, setMapLink] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [category, setCategory] = useState<ListingCategory | "">("");
  const [price, setPrice] = useState("");
  const [startDateTime, setStartDateTime] = useState<Date | null>(null);
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [isPremium, setIsPremium] = useState(false);

  const [err, setErr] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [aiApplied, setAiApplied] = useState(false);

  const [templates, setTemplates] = useState<ListingTemplate[]>([]);
  const [showTemplateSave, setShowTemplateSave] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [templateSaved, setTemplateSaved] = useState(false);

  const autocompleteRef = useRef<HTMLElement | null>(null);

  // Load templates scoped to this user's account
  useEffect(() => {
    try {
      setTemplates(JSON.parse(localStorage.getItem(templateKey) || "[]"));
    } catch {
      setTemplates([]);
    }
  }, [templateKey]);

  const [createListing, { loading }] = useMutation(CREATE_LISTING);
  const [enhance, { loading: enhancing }] = useMutation(ENHANCE_DESCRIPTION);
  const { isLoaded: mapsLoaded } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string,
    libraries: MAPS_LIBRARIES,
  });

  async function handleEnhance() {
    if (!description.trim()) return;
    setAiApplied(false);
    const { data } = await enhance({ variables: { text: description } });
    if (data?.enhanceDescription) {
      setDescription(data.enhanceDescription);
      setAiApplied(true);
    }
  }

  useEffect(() => {
    const el = autocompleteRef.current;
    if (!el) return;
    async function handleSelect(e: Event) {
      const { place } = (e as CustomEvent).detail;
      await place.fetchFields({ fields: ['displayName', 'location'] });
      if (place.displayName) setPlaceName(place.displayName);
      if (place.location) {
        const pLat = place.location.lat();
        const pLng = place.location.lng();
        setLat(pLat);
        setLng(pLng);
        setMapLink(`https://www.google.com/maps/search/?api=1&query=${pLat},${pLng}`);
      }
    }
    el.addEventListener('gmp-placeselect', handleSelect);
    return () => el.removeEventListener('gmp-placeselect', handleSelect);
  }, [mapsLoaded]);

  function applyTemplate(template: ListingTemplate) {
    setTitle(template.title);
    setDescription(template.description);
    setType(template.type);
    setCategory(template.category);
    setPrice(template.price);
    setPlaceName(template.placeName);
    setMapLink(template.mapLink);
    setIsPremium(template.isPremium);
  }

  function saveTemplate() {
    if (!templateName.trim()) return;
    const newTemplate: ListingTemplate = {
      id: Date.now().toString(),
      name: templateName.trim(),
      title, description, type, category, price, placeName, mapLink, isPremium,
    };
    const updated = [...templates, newTemplate];
    localStorage.setItem(templateKey, JSON.stringify(updated));
    setTemplates(updated);
    setTemplateName("");
    setShowTemplateSave(false);
    setTemplateSaved(true);
    setTimeout(() => setTemplateSaved(false), 3000);
  }

  function deleteTemplate(id: string) {
    const updated = templates.filter((t) => t.id !== id);
    localStorage.setItem(templateKey, JSON.stringify(updated));
    setTemplates(updated);
  }

  const invalid = !title.trim() || !description.trim() || !placeName.trim();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setSuccess(false);

    try {
      let finalImageUrl = null;

      if (imageFile) {
        setUploading(true);
        const formData = new FormData();
        formData.append("file", imageFile);

        const uploadRes = await fetch("http://localhost:3000/upload", {
          method: "POST",
          body: formData,
        });

        if (!uploadRes.ok) throw new Error("Failed to upload image. Please try again.");

        const uploadData = await uploadRes.json();
        finalImageUrl = "http://localhost:3000" + uploadData.url;
        setUploading(false);
      }

      await createListing({
        variables: {
          input: {
            title: title.trim(),
            description: description.trim(),
            type,
            lat: lat ?? 0,
            lng: lng ?? 0,
            placeName: placeName.trim(),
            ...(mapLink ? { mapLink: mapLink.trim() } : {}),
            ...(finalImageUrl ? { imageUrl: finalImageUrl } : {}),
            ...(category ? { category } : {}),
            ...(price ? { price: Number(price) } : {}),
            ...(startDateTime ? { startDateTime: startDateTime.toISOString() } : {}),
            isPremium,
          },
        },
      });
      setSuccess(true);
      setTimeout(() => nav("/dashboard", { replace: true }), 800);
    } catch (e: unknown) {
      setUploading(false);
      const error = e as Error;
      setErr(error?.message ?? "Failed to create listing");
    }
  }

  if (!isEnabledFor("HOST_LISTING_CREATION", "HOST")) {
    return (
      <DashboardLayout title="Create Listing" subtitle="New experience">
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="text-5xl mb-4">🔒</div>
          <h2 className="text-xl font-bold text-slate-700 mb-2">Feature Disabled</h2>
          <p className="text-slate-400 text-sm max-w-sm">
            Listing creation has been temporarily disabled by the admin. Please check back later.
          </p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="Create Listing"
      subtitle="Add a new experience for travelers"
      actions={
        <Button variant="ghost" onClick={() => nav("/dashboard")}>
          ← Back
        </Button>
      }
    >
      <div className="mx-auto w-full max-w-2xl">
        <form onSubmit={onSubmit} className="space-y-6">

          {/* Template Load Panel */}
          {templates.length > 0 && (
            <Card className="mb-6">
              <h6 className="text-slate-400 text-sm mb-3 font-bold uppercase">Load from Template</h6>
              <div className="space-y-2">
                {templates.map((t) => (
                  <div key={t.id} className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => applyTemplate(t)}
                      className="flex-1 text-left px-3 py-2 text-sm text-slate-700 bg-slate-50 hover:bg-sky-50 hover:text-sky-700 rounded shadow-sm transition-colors font-medium"
                    >
                      {t.name}
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteTemplate(t.id)}
                      className="text-xs text-slate-400 hover:text-red-500 px-2 py-2 transition-colors"
                      title="Delete template"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Media */}
          <Card className="mb-6">
            <h6 className="text-slate-400 text-sm mb-6 font-bold uppercase">Media</h6>
            <div className="space-y-4">
              <label className="block justify-center">
                <div className="mb-2 uppercase text-slate-600 text-xs font-bold">Cover Image</div>
                <div className="mt-2 flex items-center gap-4">
                  {imagePreview ? (
                    <img src={imagePreview} alt="Preview" className="h-24 w-24 rounded object-cover shadow" />
                  ) : (
                    <div className="flex h-24 w-24 flex-col items-center justify-center rounded border-0 bg-slate-100 text-slate-400 shadow">
                      <span className="text-xl">📷</span>
                    </div>
                  )}
                  <div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setImageFile(file);
                          setImagePreview(URL.createObjectURL(file));
                        }
                      }}
                      className="block w-full text-sm text-slate-500 file:mr-4 file:rounded file:border-0 file:bg-sky-500 file:px-4 file:py-2 file:text-xs file:font-bold file:uppercase file:text-white file:shadow hover:file:bg-sky-600 transition-all duration-150 cursor-pointer"
                    />
                    <div className="mt-2 text-xs font-semibold text-slate-400">
                      Supported: JPG, PNG, WEBP (max 5MB)
                    </div>
                  </div>
                </div>
              </label>
            </div>
          </Card>

          {/* Basic Info */}
          <Card className="mb-6">
            <h6 className="text-slate-400 text-sm mb-6 font-bold uppercase">Basic Info</h6>
            <div className="space-y-4">
              <Input
                label="Title"
                hint="Short and clear (max 80 chars)"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={80}
              />

              <label className="block">
                <div className="mb-2 uppercase text-slate-600 text-xs font-bold">Description</div>
                <textarea
                  className="border-0 px-3 py-3 placeholder-slate-300 text-slate-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full ease-linear transition-all duration-150"
                  rows={5}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the experience in detail..."
                  maxLength={1200}
                />
                <div className="mt-1 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={handleEnhance}
                    disabled={enhancing || !description.trim()}
                    className="text-xs font-bold text-violet-600 hover:text-violet-800 disabled:opacity-40 transition-colors"
                  >
                    {enhancing ? "Enhancing…" : "✨ Enhance with AI"}
                  </button>
                  <span className="text-xs font-semibold text-slate-400">{description.length}/1200</span>
                </div>
                {aiApplied && (
                  <p className="mt-1 text-xs text-violet-500 font-semibold">AI suggestion applied — edit freely.</p>
                )}
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <div className="mb-2 uppercase text-slate-600 text-xs font-bold">Type</div>
                  <select
                    className="border-0 px-3 py-3 text-slate-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full ease-linear transition-all duration-150"
                    value={type}
                    onChange={(e) => setType(e.target.value as ListingType)}
                  >
                    <option value="EVENT">Event</option>
                    <option value="RENTAL">Rental</option>
                    <option value="ACCOMMODATION">Accommodation</option>
                    <option value="ACTIVITY">Activity</option>
                  </select>
                </label>

                <label className="block">
                  <div className="mb-2 uppercase text-slate-600 text-xs font-bold">
                    Category <span className="text-slate-400 normal-case">(optional)</span>
                  </div>
                  <select
                    className="border-0 px-3 py-3 text-slate-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full ease-linear transition-all duration-150"
                    value={category}
                    onChange={(e) => setCategory(e.target.value as ListingCategory | "")}
                  >
                    <option value="">— Select category —</option>
                    <option value="NATURE">Nature</option>
                    <option value="CULTURE">Culture</option>
                    <option value="ADVENTURE">Adventure</option>
                    <option value="FOOD">Food</option>
                    <option value="WELLNESS">Wellness</option>
                    <option value="BEACH">Beach</option>
                    <option value="HERITAGE">Heritage</option>
                    <option value="PARTY">Party</option>
                    <option value="NIGHTLIFE">Nightlife</option>
                    <option value="SPORTS">Sports</option>
                    <option value="ARTS">Arts &amp; Crafts</option>
                    <option value="MUSIC">Music</option>
                    <option value="FESTIVAL">Festival</option>
                    <option value="FAMILY">Family</option>
                  </select>
                </label>
              </div>

              <label className="flex items-center gap-3 cursor-pointer group mt-2">
                <input
                  type="checkbox"
                  checked={isPremium}
                  onChange={(e) => setIsPremium(e.target.checked)}
                  className="w-4 h-4 accent-violet-600"
                />
                <span className="text-xs font-bold uppercase text-slate-600 group-hover:text-slate-800">
                  Premium-only listing{" "}
                  <span className="text-slate-400 normal-case font-normal">(visible to premium subscribers only)</span>
                </span>
              </label>
            </div>
          </Card>

          {/* Pricing & Schedule */}
          <Card className="mb-6">
            <h6 className="text-slate-400 text-sm mb-6 font-bold uppercase">Pricing & Schedule</h6>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Price (LKR)"
                hint="Leave blank if free"
                value={price}
                onChange={(e) => setPrice(e.target.value.replace(/[^0-9.]/g, ""))}
                placeholder="e.g. 2500"
              />
              <label className="block">
                <div className="mb-2 uppercase text-slate-600 text-xs font-bold">
                  Start Date & Time <span className="text-slate-400 normal-case">(optional)</span>
                </div>
                <DatePicker
                  selected={startDateTime}
                  onChange={(date) => setStartDateTime(date)}
                  showTimeSelect
                  timeFormat="HH:mm"
                  timeIntervals={15}
                  dateFormat="MMM d, yyyy h:mm aa"
                  minDate={new Date()}
                  placeholderText="Pick a date & time"
                  className="border-0 px-3 py-3 text-slate-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full ease-linear transition-all duration-150"
                  wrapperClassName="w-full"
                  calendarClassName="shadow-lg rounded-xl"
                />
              </label>
            </div>
          </Card>

          {/* Location */}
          <Card className="mb-6">
            <h6 className="text-slate-400 text-sm mb-6 font-bold uppercase">Location</h6>
            <div className="space-y-4">
              <Input
                label="Place Name"
                hint="e.g. Lotus Tower, Colombo"
                value={placeName}
                onChange={(e) => setPlaceName(e.target.value)}
                placeholder="Name of the venue or area"
              />
              <Input
                label="Google Maps Link"
                hint="Paste the URL from Google Maps (optional)"
                value={mapLink}
                onChange={(e) => setMapLink(e.target.value)}
                placeholder="https://maps.app.goo.gl/..."
              />
              {mapsLoaded && (
                <label className="block">
                  <div className="mb-2 uppercase text-slate-600 text-xs font-bold">
                    Search by Place Name
                  </div>
                  <GmpAutocomplete
                    ref={autocompleteRef}
                    country="lk"
                    placeholder="Search for a place in Sri Lanka…"
                    style={{ width: '100%', display: 'block' }}
                  />
                </label>
              )}
              <p className="text-xs text-slate-500">
                Click anywhere on the map to drop a pin, or drag the marker to fine-tune.
              </p>
              {mapsLoaded ? (
                <GoogleMap
                  mapContainerStyle={{ width: "100%", height: "300px", borderRadius: "10px" }}
                  center={lat !== null && lng !== null ? { lat, lng } : { lat: 7.8731, lng: 80.7718 }}
                  zoom={lat !== null ? 14 : 8}
                  onClick={(e) => { if (e.latLng) { setLat(e.latLng.lat()); setLng(e.latLng.lng()); } }}
                  options={{ streetViewControl: false, mapTypeControl: false, fullscreenControl: false }}
                >
                  {lat !== null && lng !== null && (
                    <Marker
                      position={{ lat, lng }}
                      draggable
                      onDragEnd={(e) => { if (e.latLng) { setLat(e.latLng.lat()); setLng(e.latLng.lng()); } }}
                    />
                  )}
                </GoogleMap>
              ) : (
                <div className="w-full h-72 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 text-sm font-semibold">
                  Loading map…
                </div>
              )}
              {lat !== null && lng !== null && (
                <p className="text-xs text-slate-500 font-mono">
                  📍 {lat.toFixed(6)}, {lng.toFixed(6)}
                </p>
              )}
            </div>
          </Card>

          {/* Error / Success / Template feedback */}
          {err && (
            <div className="rounded border-0 bg-red-100 px-4 py-3 text-sm font-bold shadow text-red-800">{err}</div>
          )}
          {success && (
            <div className="rounded border-0 bg-emerald-100 px-4 py-3 text-sm font-bold shadow text-emerald-800">
              ✅ Listing created! Redirecting...
            </div>
          )}
          {templateSaved && (
            <div className="rounded border-0 bg-violet-100 px-4 py-3 text-sm font-bold shadow text-violet-800">
              💾 Template saved!
            </div>
          )}

          {/* Actions */}
          <div className="space-y-3 pb-10">
            <div className="flex gap-3 flex-wrap">
              <Button type="submit" disabled={loading || uploading || invalid}>
                {uploading ? "Uploading Image..." : loading ? "Creating…" : "Create Listing"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => { setShowTemplateSave(!showTemplateSave); setTemplateName(""); }}
                disabled={invalid}
              >
                💾 Save as Template
              </Button>
            </div>
            {showTemplateSave && (
              <div className="flex gap-2 items-center flex-wrap">
                <input
                  type="text"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="Template name (e.g. Weekly Beach Party)"
                  className="flex-1 min-w-0 border-0 px-3 py-2 text-slate-600 bg-white rounded text-sm shadow focus:outline-none focus:ring ease-linear transition-all duration-150"
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); saveTemplate(); } }}
                  autoFocus
                />
                <Button type="button" onClick={saveTemplate} disabled={!templateName.trim()}>
                  Save
                </Button>
                <Button type="button" variant="ghost" onClick={() => setShowTemplateSave(false)}>
                  Cancel
                </Button>
              </div>
            )}
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
