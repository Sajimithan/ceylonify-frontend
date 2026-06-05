import { useQuery, useMutation } from '@apollo/client/react';
import { useSmartPoll } from '../../hooks/useSmartPoll';
import { Link } from 'react-router-dom';
import { MY_LISTINGS, DELETE_LISTING, UPDATE_LISTING } from './listings.gql';
import { Card } from '../../ui/Card';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { DashboardLayout } from '../../layouts/DashboardLayout';
import { listenForegroundMessages } from '../../notifications/fcm';
import { useEffect, useState } from 'react';
import { useFeatureFlags } from '../../auth/useFeatureFlags';
import { ShareIcon, XMarkIcon, ClipboardDocumentIcon, CheckIcon } from '@heroicons/react/24/outline';
import { ConfirmModal } from '../../ui/ConfirmModal';

type Listing = {
  id: string;
  title: string;
  description: string;
  type: string;
  status: string;
  createdAt: string;
  startDateTime?: string;
  rejectionReason?: string;
  imageUrl?: string;
  isPremium?: boolean;
  viewCount?: number;
};

interface MyListingsData {
  myListings: Listing[];
}

// ── Social share icons (inline SVGs) ─────────────────────────────────────────
function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
      <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.41c0-3.025 1.792-4.697 4.533-4.697 1.312 0 2.686.236 2.686.236v2.97h-1.513c-1.491 0-1.956.93-1.956 1.874v2.25h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z"/>
    </svg>
  );
}

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
    </svg>
  );
}

function TikTokIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.27 8.27 0 004.84 1.55V6.79a4.85 4.85 0 01-1.07-.1z"/>
    </svg>
  );
}

// ── Share modal ───────────────────────────────────────────────────────────────
function ShareModal({
  listing,
  onClose,
}: {
  listing: Listing;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const url = `${window.location.origin}/listing/${listing.id}`;
  const text = `Check out "${listing.title}" on Ceylonify 🌴`;

  async function copy(platform?: string) {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setHint(platform ?? null);
    setTimeout(() => { setCopied(false); setHint(null); }, 3000);
  }

  const PLATFORMS = [
    {
      label: "Facebook",
      icon: <FacebookIcon />,
      bg: "bg-[#1877F2] hover:bg-[#166fe5]",
      action: () =>
        window.open(
          `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
          "_blank", "width=600,height=450"
        ),
    },
    {
      label: "WhatsApp",
      icon: <WhatsAppIcon />,
      bg: "bg-[#25D366] hover:bg-[#20bc59]",
      action: () =>
        window.open(
          `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`,
          "_blank"
        ),
    },
    {
      label: "Instagram",
      icon: <InstagramIcon />,
      bg: "bg-gradient-to-br from-[#f09433] via-[#e6683c] via-[#dc2743] via-[#cc2366] to-[#bc1888] hover:opacity-90",
      action: () => copy("Open Instagram and paste the copied link in your story or bio."),
    },
    {
      label: "TikTok",
      icon: <TikTokIcon />,
      bg: "bg-[#010101] hover:bg-[#1a1a1a]",
      action: () => copy("Open TikTok and paste the copied link in your video description."),
    },
  ];

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 relative">
        {/* Header */}
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-slate-800 font-bold text-lg">Share Listing</h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>
        <p className="text-slate-500 text-xs mb-5 truncate font-medium">{listing.title}</p>

        {/* Platform buttons */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          {PLATFORMS.map((p) => (
            <button
              key={p.label}
              onClick={p.action}
              className={`flex items-center gap-2.5 px-4 py-3 rounded-xl text-white text-sm font-semibold transition-all ${p.bg}`}
            >
              {p.icon}
              {p.label}
            </button>
          ))}
        </div>

        {/* Hint for Instagram/TikTok */}
        {hint && (
          <div className="mb-4 rounded-xl bg-emerald-50 border border-emerald-100 px-4 py-3 text-xs text-emerald-700 font-semibold">
            ✓ Link copied! {hint}
          </div>
        )}

        {/* Copy link row */}
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5">
          <span className="flex-1 text-xs text-slate-500 truncate font-mono">{url}</span>
          <button
            onClick={() => copy()}
            className="flex items-center gap-1.5 text-xs font-bold text-brand-600 hover:text-brand-800 transition-colors flex-shrink-0"
          >
            {copied && !hint ? (
              <>
                <CheckIcon className="w-4 h-4 text-emerald-500" />
                <span className="text-emerald-600">Copied!</span>
              </>
            ) : (
              <>
                <ClipboardDocumentIcon className="w-4 h-4" />
                Copy
              </>
            )}
          </button>
        </div>

        {/* Native share (mobile) */}
        {"share" in navigator && (
          <button
            onClick={() => navigator.share({ title: listing.title, text, url }).catch(() => null)}
            className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition-colors"
          >
            <ShareIcon className="w-4 h-4" />
            More sharing options…
          </button>
        )}
      </div>
    </div>
  );
}

export function MyListings() {
  const { data, loading, error, refetch, startPolling, stopPolling } = useQuery<MyListingsData>(MY_LISTINGS, {
    fetchPolicy: "cache-and-network",
  });
  useSmartPoll(startPolling, stopPolling, 10_000);
  const { isEnabledFor } = useFeatureFlags();
  const canCreateListing = isEnabledFor("HOST_LISTING_CREATION", "HOST");
  const [deleteListing] = useMutation(DELETE_LISTING, {
    onCompleted: () => refetch()
  });
  const [updateListing] = useMutation(UPDATE_LISTING, {
    onCompleted: () => refetch()
  });
  const [sharingListing, setSharingListing] = useState<Listing | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Listing | null>(null);

  useEffect(() => {
    listenForegroundMessages();
  }, []);


  async function handleResubmit(l: Listing) {
    if (!confirm("Resubmit this listing for review?")) return;
    await updateListing({ variables: { id: l.id, input: { title: l.title } } });
  }

  const allListings = data?.myListings ?? [];
  const now = new Date();
  const [listingTab, setListingTab] = useState<'active' | 'past'>('active');
  const activeListings = allListings.filter(
    (l: Listing) => l.type !== 'EVENT' || !l.startDateTime || new Date(l.startDateTime) >= now,
  );
  const pastListings = allListings.filter(
    (l: Listing) => l.type === 'EVENT' && l.startDateTime && new Date(l.startDateTime) < now,
  );
  const listings = listingTab === 'active' ? activeListings : pastListings;

  return (
    <DashboardLayout
      title="My Listings"
      subtitle="Manage your experiences"
      actions={
        <>
          <Button variant="ghost" className="text-white" onClick={() => refetch()}>
            Refresh
          </Button>
          {canCreateListing && (
            <Link to="/host/create">
              <Button variant="secondary">Create Listing</Button>
            </Link>
          )}
        </>
      }
    >
      <div className="mx-auto w-full max-w-7xl">
        {loading && !data ? (
          <div className="text-sm text-slate-500 font-semibold mb-4">Loading listings...</div>
        ) : null}

        {error ? (
          <div className="rounded border-0 bg-red-100 p-4 text-sm font-bold text-red-800 shadow mb-4">
            {error.message}
          </div>
        ) : null}

        {!loading && listings.length === 0 ? (
          <Card className="text-center py-10">
            <div className="text-lg text-slate-500 font-bold mb-4">No listings found.</div>
            {canCreateListing && (
              <Link to="/host/create">
                <Button>Create your first listing</Button>
              </Link>
            )}
          </Card>
        ) : null}

        {/* Active / Past tab */}
        <div className="mb-5 flex items-center gap-1 bg-white rounded-xl shadow px-2 py-1.5 w-fit">
          <button
            onClick={() => setListingTab('active')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-colors ${listingTab === 'active' ? 'bg-brand-500 text-white' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Active / Upcoming ({activeListings.length})
          </button>
          <button
            onClick={() => setListingTab('past')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-colors ${listingTab === 'past' ? 'bg-slate-600 text-white' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Past Events ({pastListings.length})
          </button>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {listings.map((l) => (
            <Card key={l.id}>
              <div className="flex items-start justify-between gap-3 mb-2">
                <div>
                  <h6 className="text-lg font-bold text-slate-700 capitalize">{l.title}</h6>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="text-xs font-bold uppercase text-slate-400">{l.type}</span>
                    {l.isPremium && (
                      <span className="text-[9px] font-bold uppercase bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded-full">
                        Premium
                      </span>
                    )}
                  </div>
                </div>
                <Badge value={l.status} />
              </div>

              {l.imageUrl && (
                <img
                  src={l.imageUrl}
                  alt={l.title}
                  className="w-full h-40 object-cover mt-2 mb-3 rounded shadow-sm opacity-95 transition-opacity hover:opacity-100"
                />
              )}

              <p className="mt-2 mb-4 line-clamp-3 text-sm font-light leading-relaxed text-slate-600">
                {l.description}
              </p>

              {l.status === 'REJECTED' && l.rejectionReason && (
                <div className="mb-4 text-xs font-bold text-red-600 bg-red-50 p-2 rounded shadow-sm border border-red-200">
                  Reason: {l.rejectionReason}
                </div>
              )}

              <div className="mt-auto pt-4 border-t border-slate-200 flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-slate-400">
                    {new Date(l.createdAt).toLocaleDateString()}
                  </div>
                  {typeof l.viewCount === 'number' && (
                    <div className="text-xs text-slate-400 mt-0.5">
                      {l.viewCount} view{l.viewCount !== 1 ? 's' : ''}
                    </div>
                  )}
                </div>
                <div className="flex gap-2 flex-wrap">
                  {l.status === 'APPROVED' && (
                    <Link to={`/listing/${l.id}`}>
                      <Button variant="ghost" className="!px-3 !py-1 !text-[10px] text-emerald-600">View</Button>
                    </Link>
                  )}
                  {l.status === 'REJECTED' && (
                    <Button
                      variant="ghost"
                      className="!px-3 !py-1 !text-[10px] text-amber-600 border border-amber-200 hover:bg-amber-50"
                      onClick={() => handleResubmit(l)}
                    >
                      Resubmit
                    </Button>
                  )}
                  <Link to={`/host/edit/${l.id}`}>
                    <Button variant="ghost" className="!px-3 !py-1 !text-[10px] text-sky-600">Edit</Button>
                  </Link>
                  <Button
                    variant="danger"
                    className="!px-3 !py-1 !text-[10px]"
                    onClick={() => setDeleteTarget(l)}
                  >
                    Delete
                  </Button>
                </div>
              </div>

              {/* Share row — only for approved listings */}
              {l.status === 'APPROVED' && (
                <div className="mt-3 pt-3 border-t border-slate-100">
                  <button
                    onClick={() => setSharingListing(l)}
                    className="w-full flex items-center justify-center gap-2 py-2 rounded-xl border border-brand-200 text-brand-600 hover:bg-brand-50 text-xs font-bold uppercase tracking-wide transition-colors"
                  >
                    <ShareIcon className="w-3.5 h-3.5" />
                    Share this listing
                  </button>
                </div>
              )}
            </Card>
          ))}
        </div>
      </div>

      {/* Share modal */}
      {sharingListing && (
        <ShareModal
          listing={sharingListing}
          onClose={() => setSharingListing(null)}
        />
      )}
      {deleteTarget && (
        <ConfirmModal
          title="Delete Listing"
          description="This listing will be permanently deleted and cannot be recovered."
          detail={deleteTarget.title}
          confirmLabel="Delete Listing"
          onConfirm={async () => {
            await deleteListing({ variables: { id: deleteTarget.id } });
            setDeleteTarget(null);
          }}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </DashboardLayout>
  );
}
