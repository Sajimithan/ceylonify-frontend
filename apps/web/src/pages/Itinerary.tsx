import { useState } from "react";
import { useQuery, useMutation } from "@apollo/client/react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "../layouts/DashboardLayout";
import { Button } from "../ui/Button";
import { ConfirmModal } from "../ui/ConfirmModal";
import { MY_FULL_ITINERARY, UPDATE_ITINERARY_NOTE, REMOVE_FROM_ITINERARY } from "./itinerary.gql";
import { PencilSquareIcon, TrashIcon, CheckIcon, XMarkIcon } from "@heroicons/react/24/outline";

type ItineraryItem = {
  id: string;
  listingId: string;
  plannedDate: string;
  note?: string;
  isGoingEntry: boolean;
  createdAt: string;
  listingTitle?: string;
  listingImageUrl?: string;
  listingType?: string;
  listingPlaceName?: string;
};

type GroupedDay = {
  label: string;
  dateKey: string;
  items: ItineraryItem[];
};

function groupByDay(items: ItineraryItem[]): GroupedDay[] {
  const map = new Map<string, ItineraryItem[]>();
  for (const item of items) {
    const d = new Date(item.plannedDate);
    const key = d.toDateString();
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(item);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
    .map(([dateKey, items]) => ({
      dateKey,
      label: new Date(dateKey).toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      }),
      items: items.sort((a, b) => new Date(a.plannedDate).getTime() - new Date(b.plannedDate).getTime()),
    }));
}

function NoteEditor({
  item,
  onSave,
  onCancel,
}: {
  item: ItineraryItem;
  onSave: (note: string) => void;
  onCancel: () => void;
}) {
  const [note, setNote] = useState(item.note ?? "");
  return (
    <div className="mt-2 flex gap-2">
      <input
        type="text"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Add a note…"
        className="flex-1 border border-slate-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-brand-400"
        autoFocus
      />
      <button onClick={() => onSave(note)} className="p-1.5 rounded-lg bg-brand-500 text-white hover:bg-brand-600 transition-colors">
        <CheckIcon className="w-3.5 h-3.5" />
      </button>
      <button onClick={onCancel} className="p-1.5 rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors">
        <XMarkIcon className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

export function Itinerary() {
  const nav = useNavigate();
  const { data, loading, refetch } = useQuery(MY_FULL_ITINERARY);
  const [updateNote] = useMutation(UPDATE_ITINERARY_NOTE);
  const [removeItem] = useMutation(REMOVE_FROM_ITINERARY);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [removeTarget, setRemoveTarget] = useState<ItineraryItem | null>(null);

  const items: ItineraryItem[] = data?.myItinerary ?? [];
  const grouped = groupByDay(items);

  async function handleSaveNote(itemId: string, note: string) {
    await updateNote({ variables: { itemId, note } });
    setEditingId(null);
    refetch();
  }


  const TYPE_ICON: Record<string, string> = {
    EVENT: "🎪", RENTAL: "🚗", ACCOMMODATION: "🏠", ACTIVITY: "🏄",
  };

  return (
    <DashboardLayout title="My Itinerary" subtitle="Your planned experiences grouped by day">
      <div className="mx-auto w-full max-w-3xl">
        {loading && (
          <div className="text-sm text-slate-400 font-semibold py-10 text-center">Loading itinerary…</div>
        )}

        {!loading && items.length === 0 && (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">🗓️</div>
            <div className="text-slate-500 font-semibold mb-2">Your itinerary is empty.</div>
            <p className="text-xs text-slate-400 mb-6">
              Mark events as "I'm Going" or add listings to your itinerary from listing detail pages.
            </p>
            <Button onClick={() => nav("/browse")}>Browse Experiences</Button>
          </div>
        )}

        <div className="space-y-8">
          {grouped.map((day) => (
            <div key={day.dateKey}>
              {/* Day header */}
              <div className="flex items-center gap-3 mb-4">
                <div className="flex-shrink-0 w-1 h-10 bg-brand-400 rounded-full" />
                <div>
                  <div className="text-base font-bold text-slate-700">{day.label}</div>
                  <div className="text-xs text-slate-400">{day.items.length} experience{day.items.length !== 1 ? "s" : ""}</div>
                </div>
              </div>

              {/* Day items */}
              <div className="space-y-3 pl-4">
                {day.items.map((item) => (
                  <div
                    key={item.id}
                    className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden flex gap-0"
                  >
                    {/* Thumbnail */}
                    <div className="flex-shrink-0 w-20 h-20">
                      {item.listingImageUrl ? (
                        <img
                          src={item.listingImageUrl}
                          alt={item.listingTitle ?? ""}
                          className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
                          onClick={() => nav(`/listing/${item.listingId}`)}
                        />
                      ) : (
                        <div
                          className="w-full h-full bg-slate-100 flex items-center justify-center text-3xl cursor-pointer"
                          onClick={() => nav(`/listing/${item.listingId}`)}
                        >
                          {TYPE_ICON[item.listingType ?? ""] ?? "🏝️"}
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 px-4 py-3 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div
                          className="font-bold text-slate-700 text-sm leading-snug cursor-pointer hover:text-brand-600 transition-colors line-clamp-1"
                          onClick={() => nav(`/listing/${item.listingId}`)}
                        >
                          {item.listingTitle ?? "Untitled"}
                        </div>
                        <div className="flex gap-1 flex-shrink-0">
                          {item.isGoingEntry && (
                            <span className="text-[10px] font-bold bg-emerald-100 text-emerald-600 px-1.5 py-0.5 rounded-full whitespace-nowrap">
                              🎫 Going
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 mt-0.5 text-[11px] text-slate-400">
                        {item.listingType && (
                          <span>{item.listingType.charAt(0) + item.listingType.slice(1).toLowerCase()}</span>
                        )}
                        {item.listingPlaceName && <span>📍 {item.listingPlaceName}</span>}
                        <span className="ml-auto">
                          {new Date(item.plannedDate).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>

                      {/* Note */}
                      {editingId === item.id ? (
                        <NoteEditor
                          item={item}
                          onSave={(note) => handleSaveNote(item.id, note)}
                          onCancel={() => setEditingId(null)}
                        />
                      ) : (
                        <div className="mt-1.5 flex items-center gap-2">
                          {item.note ? (
                            <span className="text-xs text-slate-500 italic line-clamp-1 flex-1">"{item.note}"</span>
                          ) : (
                            <span className="text-[11px] text-slate-300 italic flex-1">No note</span>
                          )}
                          <button
                            onClick={() => setEditingId(item.id)}
                            className="p-1 rounded text-slate-300 hover:text-brand-500 transition-colors"
                            title="Edit note"
                          >
                            <PencilSquareIcon className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setRemoveTarget(item)}
                            className="p-1 rounded text-slate-300 hover:text-red-500 transition-colors"
                            title="Remove"
                          >
                            <TrashIcon className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {removeTarget && (
        <ConfirmModal
          title="Remove from Itinerary"
          description="This item will be removed from your trip plan."
          detail={removeTarget.listingTitle ?? undefined}
          confirmLabel="Remove"
          onConfirm={async () => {
            await removeItem({ variables: { itemId: removeTarget.id } });
            setRemoveTarget(null);
            refetch();
          }}
          onCancel={() => setRemoveTarget(null)}
        />
      )}
    </DashboardLayout>
  );
}
