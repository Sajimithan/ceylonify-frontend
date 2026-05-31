import { useQuery, useMutation } from "@apollo/client/react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "../../layouts/DashboardLayout";
import { Badge } from "../../ui/Badge";
import { Button } from "../../ui/Button";
import { MY_SAVED_LISTINGS, UNSAVE_LISTING } from "./saved.gql";

type Listing = {
  id: string;
  title: string;
  description: string;
  type: string;
  category?: string;
  price?: string;
  placeName?: string;
  imageUrl?: string;
  createdAt: string;
  startDateTime?: string;
};

export function SavedListings() {
  const nav = useNavigate();
  const { data, loading, refetch } = useQuery(MY_SAVED_LISTINGS);
  const [unsaveListing] = useMutation(UNSAVE_LISTING);

  const now = new Date();
  const allSaved: Listing[] = data?.savedListings ?? [];
  const listings = allSaved.filter((l) => {
    if (l.type !== 'EVENT' || !l.startDateTime) return true;
    return new Date(l.startDateTime) >= now;
  });

  async function handleUnsave(id: string) {
    await unsaveListing({ variables: { listingId: id } });
    refetch();
  }

  return (
    <DashboardLayout
      title="Saved Listings"
      subtitle="Your bookmarked experiences"
    >
      <div className="mx-auto w-full max-w-7xl">
        {loading && (
          <div className="text-sm text-slate-500 font-semibold py-10 text-center">
            Loading saved listings…
          </div>
        )}

        {!loading && listings.length === 0 && (
          <div className="text-center py-16">
            <div className="text-4xl mb-4">🤍</div>
            <div className="text-slate-500 font-semibold mb-4">
              No saved listings yet.
            </div>
            <Button onClick={() => nav("/browse")}>Browse Experiences</Button>
          </div>
        )}

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {listings.map((l) => (
            <div
              key={l.id}
              className="bg-white rounded-xl shadow-lg overflow-hidden"
            >
              <div
                className="relative h-44 bg-slate-100 cursor-pointer"
                onClick={() => nav(`/listing/${l.id}`)}
              >
                {l.imageUrl ? (
                  <img
                    src={l.imageUrl}
                    alt={l.title}
                    className="w-full h-full object-cover hover:opacity-95 transition-opacity"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-4xl text-slate-300">
                    🏝️
                  </div>
                )}
              </div>

              <div className="p-4">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h3
                    className="font-bold text-slate-700 text-sm leading-snug cursor-pointer hover:text-sky-600 transition-colors"
                    onClick={() => nav(`/listing/${l.id}`)}
                  >
                    {l.title}
                  </h3>
                  <Badge value={l.type} />
                </div>

                {l.placeName && (
                  <div className="text-xs text-slate-400 mb-2">
                    📍 {l.placeName}
                  </div>
                )}

                <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed mb-3">
                  {l.description}
                </p>

                <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                  {l.price ? (
                    <span className="text-sm font-bold text-sky-600">
                      LKR {Number(l.price).toLocaleString()}
                    </span>
                  ) : (
                    <span className="text-xs font-semibold text-emerald-500">Free</span>
                  )}
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      className="!px-3 !py-1 !text-[10px] text-sky-600"
                      onClick={() => nav(`/listing/${l.id}`)}
                    >
                      View
                    </Button>
                    <Button
                      variant="danger"
                      className="!px-3 !py-1 !text-[10px]"
                      onClick={() => handleUnsave(l.id)}
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
