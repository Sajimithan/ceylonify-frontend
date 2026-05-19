import { useState } from "react";
import { useMutation } from "@apollo/client/react";
import { CREATE_LISTING } from "./listings.gql";
import { Input } from "../../ui/Input";
import { Button } from "../../ui/Button";
import { Card } from "../../ui/Card";
import { DashboardLayout } from "../../layouts/DashboardLayout";
import { useNavigate } from "react-router-dom";

type ListingType = "EVENT" | "RENTAL" | "ACCOMMODATION" | "ACTIVITY";
type ListingCategory = "NATURE" | "CULTURE" | "ADVENTURE" | "FOOD" | "WELLNESS" | "BEACH" | "HERITAGE";

export function CreateListing() {
  const nav = useNavigate();

  // Required fields
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<ListingType>("EVENT");
  const [placeName, setPlaceName] = useState("");
  const [mapLink, setMapLink] = useState("");
  
  // Media fields
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Optional fields
  const [category, setCategory] = useState<ListingCategory | "">("");
  const [price, setPrice] = useState("");
  const [startDateTime, setStartDateTime] = useState("");

  const [err, setErr] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [createListing, { loading }] = useMutation(CREATE_LISTING);

  const invalid =
    !title.trim() ||
    !description.trim() ||
    !placeName.trim();

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

        if (!uploadRes.ok) {
          throw new Error("Failed to upload image. Please try again.");
        }

        const uploadData = await uploadRes.json();
        // The backend returns a relative url like "/uploads/1234.png"
        // In local development, we prefix with our server base url to form a full URL
        finalImageUrl = "http://localhost:3000" + uploadData.url;
        
        setUploading(false);
      }

      await createListing({
        variables: {
          input: {
            title: title.trim(),
            description: description.trim(),
            type,
            lat: 0,
            lng: 0,
            placeName: placeName.trim(),
            ...(mapLink ? { mapLink: mapLink.trim() } : {}),
            ...(finalImageUrl ? { imageUrl: finalImageUrl } : {}),
            ...(category ? { category } : {}),
            ...(price ? { price: Number(price) } : {}),
            ...(startDateTime ? { startDateTime } : {}),
          },
        },
      });
      setSuccess(true);
      setTimeout(() => nav("/", { replace: true }), 800);
    } catch (e: unknown) {
      setUploading(false);
      const error = e as Error;
      setErr(error?.message ?? "Failed to create listing");
    }
  }

  return (
    <DashboardLayout
      title="Create Listing"
      subtitle="Add a new experience for travelers"
      actions={
        <Button variant="ghost" onClick={() => nav("/")}>
          ← Back
        </Button>
      }
    >
      <div className="mx-auto w-full max-w-2xl">
        <form onSubmit={onSubmit} className="space-y-6">
          {/* Media */}
          <Card className="mb-6">
            <h6 className="text-slate-400 text-sm mb-6 font-bold uppercase">Media</h6>
            <div className="space-y-4">
              <label className="block justify-center">
                <div className="mb-2 uppercase text-slate-600 text-xs font-bold">Cover Image</div>
                <div className="mt-2 flex items-center gap-4">
                  {imagePreview ? (
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="h-24 w-24 rounded object-cover shadow"
                    />
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
                <div className="mt-1 text-right text-xs font-semibold text-slate-400">
                  {description.length}/1200
                </div>
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
                  </select>
                </label>
              </div>
            </div>
          </Card>

          {/* Pricing & Date */}
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
                <input
                  type="datetime-local"
                  className="border-0 px-3 py-3 text-slate-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full ease-linear transition-all duration-150"
                  value={startDateTime}
                  onChange={(e) => setStartDateTime(e.target.value)}
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
            </div>
          </Card>

          {/* Error / Success */}
          {err && (
            <div className="rounded border-0 bg-red-100 px-4 py-3 text-sm font-bold shadow text-red-800">{err}</div>
          )}
          {success && (
            <div className="rounded border-0 bg-emerald-100 px-4 py-3 text-sm font-bold shadow text-emerald-800">
              ✅ Listing created! Redirecting...
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pb-10">
            <Button type="submit" disabled={loading || uploading || invalid}>
              {uploading ? "Uploading Image..." : loading ? "Creating…" : "Create Listing"}
            </Button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
