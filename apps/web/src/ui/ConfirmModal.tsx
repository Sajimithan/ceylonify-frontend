import { useState } from "react";
import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";

export function ConfirmModal({
  title,
  description,
  detail,
  confirmLabel = "Confirm",
  onConfirm,
  onCancel,
}: {
  title: string;
  description: string;
  detail?: string;
  confirmLabel?: string;
  onConfirm: () => Promise<void> | void;
  onCancel: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function run() {
    setLoading(true);
    setError("");
    try {
      await onConfirm();
    } catch (e: unknown) {
      setError((e as Error)?.message ?? "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        <div className="bg-red-50 border-b border-red-100 px-6 py-5 flex items-start gap-4">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
            <ExclamationTriangleIcon className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <div className="font-bold text-slate-800 text-base">{title}</div>
            <div className="text-xs text-slate-500 mt-0.5">{description}</div>
          </div>
        </div>
        <div className="px-6 py-5 space-y-4">
          {detail && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
              <div className="text-sm font-semibold text-slate-700">{detail}</div>
            </div>
          )}
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 font-semibold">
              {error}
            </div>
          )}
          <div className="flex gap-3 pt-1">
            <button
              onClick={onCancel}
              disabled={loading}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-40"
            >
              Cancel
            </button>
            <button
              onClick={run}
              disabled={loading}
              className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-bold transition-colors disabled:opacity-40"
            >
              {loading ? "Please wait…" : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
