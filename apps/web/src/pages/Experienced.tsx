import { useState } from "react";
import { useQuery, useMutation, useLazyQuery } from "@apollo/client/react";
import { DashboardLayout } from "../layouts/DashboardLayout";
import { Button } from "../ui/Button";
import { useAuth } from "../auth/useAuth";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "../auth/firebase";
import { MY_EXPERIENCES, SHARE_EXPERIENCE, DELETE_MY_EXPERIENCE } from "./experiences.gql";
import { SEARCH_LISTINGS } from "./browse.gql";
import { TrashIcon, PencilSquareIcon, ShareIcon } from "@heroicons/react/24/outline";

type Experience = {
  id: string;
  listingId: string;
  rating: number;
  text: string;
  imageUrls: string[];
  createdAt: string;
};

type Listing = {
  id: string;
  title: string;
  type: string;
};

function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => onChange(s)}
          className={`text-2xl transition-transform hover:scale-110 ${s <= value ? "text-amber-400" : "text-slate-300"}`}
        >
          ★
        </button>
      ))}
    </div>
  );
}

function ShareModal({
  listingId,
  onClose,
}: {
  listingId: string;
  onClose: () => void;
}) {
  const url = `${window.location.origin}/listing/${listingId}`;
  const text = encodeURIComponent(`Check out my experience on Ceylonify! 🌴 ${url}`);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="bg-white rounded-2xl shadow-2xl p-7 max-w-sm w-full">
        <h3 className="font-bold text-slate-700 text-lg mb-4">Share Your Experience</h3>
        <div className="flex flex-col gap-3">
          <a
            href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`}
            target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold text-sm hover:bg-blue-700 transition-colors"
          >
            Facebook
          </a>
          <a
            href={`https://wa.me/?text=${text}`}
            target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg font-semibold text-sm hover:bg-emerald-600 transition-colors"
          >
            WhatsApp
          </a>
          <a
            href={`https://www.instagram.com/`}
            target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 bg-pink-500 text-white rounded-lg font-semibold text-sm hover:bg-pink-600 transition-colors"
          >
            Instagram (copy link)
          </a>
        </div>
        <button onClick={onClose} className="mt-5 w-full py-2 text-sm font-bold text-slate-500 hover:text-slate-700 transition-colors">
          Close
        </button>
      </div>
    </div>
  );
}

function ExperienceModal({
  initial,
  onClose,
  onSaved,
}: {
  initial?: Experience;
  onClose: () => void;
  onSaved: (exp: Experience) => void;
}) {
  const { user } = useAuth();
  const [listingSearch, setListingSearch] = useState("");
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [rating, setRating] = useState(initial?.rating ?? 5);
  const [text, setText] = useState(initial?.text ?? "");
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [searchListings, { data: searchData }] = useLazyQuery(SEARCH_LISTINGS);
  const [shareExperience] = useMutation(SHARE_EXPERIENCE);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    if (!initial && !selectedListing) { setError("Select an event."); return; }
    if (!text.trim()) { setError("Write something about your experience."); return; }
    setUploading(true);
    setError(null);
    try {
      const imageUrls: string[] = [];
      for (let i = 0; i < imageFiles.length; i++) {
        const storageRef = ref(storage, `experiences/${user.uid}/${Date.now()}_${i}`);
        await uploadBytes(storageRef, imageFiles[i]);
        imageUrls.push(await getDownloadURL(storageRef));
      }
      const { data, errors } = await shareExperience({
        variables: {
          listingId: initial?.listingId ?? selectedListing!.id,
          rating,
          text: text.trim(),
          imageUrls,
        },
      });
      if (errors?.length) throw new Error(errors[0].message);
      onSaved(data.shareExperience as Experience);
    } catch (err: unknown) {
      setError((err as Error).message ?? "Something went wrong.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 overflow-y-auto">
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-2xl shadow-2xl p-7 max-w-md w-full my-8"
      >
        <h3 className="font-bold text-slate-700 text-lg mb-5">
          {initial ? "Edit Experience" : "Share Your Experience"}
        </h3>

        {/* Listing picker (only for new experiences) */}
        {!initial && (
          <div className="mb-4">
            <label className="block text-xs font-bold text-slate-500 mb-1">Event *</label>
            {selectedListing ? (
              <div className="flex items-center justify-between bg-brand-50 rounded-lg px-3 py-2">
                <span className="text-sm font-semibold text-brand-700">{selectedListing.title}</span>
                <button type="button" onClick={() => setSelectedListing(null)} className="text-xs text-slate-400 hover:text-slate-700">✕</button>
              </div>
            ) : (
              <div>
                <input
                  type="text"
                  placeholder="Search events…"
                  value={listingSearch}
                  onChange={(e) => {
                    setListingSearch(e.target.value);
                    if (e.target.value.length > 1) searchListings({ variables: { q: e.target.value, type: "EVENT", limit: 5, hidePastEvents: false } });
                  }}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
                />
                {(searchData?.searchListings?.listings ?? []).length > 0 && (
                  <div className="mt-1 border border-slate-200 rounded-lg overflow-hidden shadow-sm">
                    {(searchData.searchListings.listings as Listing[]).map((l) => (
                      <button
                        key={l.id}
                        type="button"
                        onClick={() => { setSelectedListing(l); setListingSearch(""); }}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 border-b border-slate-100 last:border-0"
                      >
                        {l.title}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Rating */}
        <div className="mb-4">
          <label className="block text-xs font-bold text-slate-500 mb-1">Rating *</label>
          <StarPicker value={rating} onChange={setRating} />
        </div>

        {/* Text */}
        <div className="mb-4">
          <label className="block text-xs font-bold text-slate-500 mb-1">Your experience *</label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={4}
            placeholder="Tell others about your experience…"
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 resize-none"
          />
        </div>

        {/* Images */}
        <div className="mb-5">
          <label className="block text-xs font-bold text-slate-500 mb-1">Photos (up to 5)</label>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => setImageFiles(Array.from(e.target.files ?? []).slice(0, 5))}
            className="text-xs text-slate-500"
          />
          {imageFiles.length > 0 && (
            <div className="flex gap-2 mt-2">
              {imageFiles.map((f, i) => (
                <img key={i} src={URL.createObjectURL(f)} alt="" className="w-12 h-12 object-cover rounded" />
              ))}
            </div>
          )}
        </div>

        {error && <div className="mb-4 text-sm font-semibold text-red-600">{error}</div>}

        <div className="flex gap-3">
          <button type="button" onClick={onClose} className="flex-1 py-2 rounded-lg border border-slate-200 text-slate-500 font-bold text-sm hover:bg-slate-50 transition-colors">
            Cancel
          </button>
          <button
            type="submit"
            disabled={uploading}
            className="flex-1 py-2 rounded-lg bg-brand-500 text-white font-bold text-sm hover:bg-brand-600 disabled:opacity-60 transition-colors"
          >
            {uploading ? "Saving…" : "Share"}
          </button>
        </div>
      </form>
    </div>
  );
}

export function Experienced() {
  const { data, loading, refetch } = useQuery(MY_EXPERIENCES);
  const [deleteExperience] = useMutation(DELETE_MY_EXPERIENCE);
  const [showModal, setShowModal] = useState(false);
  const [editingExp, setEditingExp] = useState<Experience | undefined>();
  const [sharingListingId, setSharingListingId] = useState<string | null>(null);

  const experiences: Experience[] = data?.myExperiences ?? [];

  async function handleDelete(id: string) {
    if (!confirm("Delete this experience?")) return;
    await deleteExperience({ variables: { id } });
    refetch();
  }

  function handleSaved() {
    setShowModal(false);
    setEditingExp(undefined);
    refetch();
  }

  return (
    <DashboardLayout title="My Experiences" subtitle="Your shared travel stories">
      {showModal && (
        <ExperienceModal
          initial={editingExp}
          onClose={() => { setShowModal(false); setEditingExp(undefined); }}
          onSaved={(exp) => { handleSaved(); setSharingListingId(exp.listingId); }}
        />
      )}
      {sharingListingId && (
        <ShareModal listingId={sharingListingId} onClose={() => setSharingListingId(null)} />
      )}

      <div className="mx-auto w-full max-w-5xl">
        <div className="mb-6 flex justify-end">
          <Button onClick={() => { setEditingExp(undefined); setShowModal(true); }}>
            + Share Experience
          </Button>
        </div>

        {loading && (
          <div className="text-sm text-slate-400 font-semibold py-10 text-center">Loading…</div>
        )}

        {!loading && experiences.length === 0 && (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">⭐</div>
            <div className="text-slate-500 font-semibold mb-4">No experiences shared yet.</div>
            <Button onClick={() => setShowModal(true)}>Share Your First Experience</Button>
          </div>
        )}

        <div className="grid gap-6 sm:grid-cols-2">
          {experiences.map((exp) => (
            <div key={exp.id} className="bg-white rounded-xl shadow-lg p-5">
              <div className="flex items-center justify-between mb-2">
                <div className="text-amber-400 text-lg">{"⭐".repeat(exp.rating)}</div>
                <div className="flex gap-2">
                  <button
                    onClick={() => { setEditingExp(exp); setShowModal(true); }}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-slate-50 transition-colors"
                    title="Edit"
                  >
                    <PencilSquareIcon className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setSharingListingId(exp.listingId)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-slate-50 transition-colors"
                    title="Share"
                  >
                    <ShareIcon className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(exp.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-slate-50 transition-colors"
                    title="Delete"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <p className="text-sm text-slate-600 leading-relaxed mb-3">{exp.text}</p>
              {exp.imageUrls.length > 0 && (
                <div className="flex gap-2 overflow-x-auto">
                  {exp.imageUrls.map((url, i) => (
                    <img key={i} src={url} alt={`Experience ${i + 1}`} className="h-20 w-20 object-cover rounded-lg flex-shrink-0" />
                  ))}
                </div>
              )}
              <div className="mt-3 text-[10px] text-slate-300">
                {new Date(exp.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
