import { useState } from "react";
import { XMarkIcon, ClipboardDocumentIcon, CheckIcon, ShareIcon } from "@heroicons/react/24/outline";

function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
      <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.41c0-3.025 1.792-4.697 4.533-4.697 1.312 0 2.686.236 2.686.236v2.97h-1.513c-1.491 0-1.956.93-1.956 1.874v2.25h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z" />
    </svg>
  );
}

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
    </svg>
  );
}

function TikTokIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.27 8.27 0 004.84 1.55V6.79a4.85 4.85 0 01-1.07-.1z" />
    </svg>
  );
}

export function ExperienceShareModal({
  listingId,
  onClose,
}: {
  listingId: string;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const url = `${window.location.origin}/listing/${listingId}`;
  const text = `Check out my experience on Ceylonify! 🌴 ${url}`;

  async function copy(platform?: string) {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setHint(platform ?? null);
    setTimeout(() => { setCopied(false); setHint(null); }, 3000);
  }

  const platforms = [
    {
      label: "Facebook",
      icon: <FacebookIcon />,
      bg: "bg-[#1877F2] hover:bg-[#166fe5]",
      action: () => window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, "_blank", "width=600,height=450"),
    },
    {
      label: "WhatsApp",
      icon: <WhatsAppIcon />,
      bg: "bg-[#25D366] hover:bg-[#20bc59]",
      action: () => window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank"),
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
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-slate-800 font-bold text-lg">Share Your Experience</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>
        <p className="text-slate-500 text-xs mb-5">Spread the word about your Sri Lanka adventure</p>

        <div className="grid grid-cols-2 gap-3 mb-5">
          {platforms.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={p.action}
              className={`flex items-center gap-2.5 px-4 py-3 rounded-xl text-white text-sm font-semibold transition-all ${p.bg}`}
            >
              {p.icon}
              {p.label}
            </button>
          ))}
        </div>

        {hint && (
          <div className="mb-4 rounded-xl bg-emerald-50 border border-emerald-100 px-4 py-3 text-xs text-emerald-700 font-semibold">
            ✓ Link copied! {hint}
          </div>
        )}

        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5">
          <span className="flex-1 text-xs text-slate-500 truncate font-mono">{url}</span>
          <button
            type="button"
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

        {"share" in navigator && (
          <button
            type="button"
            onClick={() => navigator.share({ title: "My Ceylonify Experience", text, url }).catch(() => null)}
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
