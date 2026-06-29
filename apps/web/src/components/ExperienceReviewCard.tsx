import { useState } from "react";
import { useMutation } from "@apollo/client/react";
import { HeartIcon, ChatBubbleLeftIcon } from "@heroicons/react/24/outline";
import { HeartIcon as HeartSolidIcon } from "@heroicons/react/24/solid";
import { useAuth } from "../auth/useAuth";
import { TOGGLE_EXPERIENCE_LIKE, REPLY_TO_EXPERIENCE } from "../pages/experiences.gql";

export type ExperienceReply = {
  id: string;
  senderUid: string;
  authorRole: string;
  message: string;
  createdAt: string;
};

export type ExperienceReview = {
  id: string;
  rating: number;
  text: string;
  imageUrls: string[];
  createdAt: string;
  likeCount: number;
  likedByMe: boolean;
  replyCount?: number;
  user?: { firebaseUid?: string; displayName?: string; avatarUrl?: string };
  replies?: ExperienceReply[];
};

function roleLabel(role: string): string {
  if (role === "HOST") return "Host";
  if (role === "ADMIN") return "Admin";
  return "Traveler";
}

function roleBadgeClass(role: string): string {
  if (role === "HOST") return "bg-amber-100 text-amber-700";
  if (role === "ADMIN") return "bg-purple-100 text-purple-700";
  return "bg-slate-100 text-slate-600";
}

export function ExperienceReviewCard({
  review,
  onUpdated,
}: {
  review: ExperienceReview;
  onUpdated?: () => void;
}) {
  const { user } = useAuth();
  const [liked, setLiked] = useState(review.likedByMe);
  const [likeCount, setLikeCount] = useState(review.likeCount ?? 0);
  const [replies, setReplies] = useState<ExperienceReply[]>(review.replies ?? []);
  const [showReplyBox, setShowReplyBox] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [replyError, setReplyError] = useState<string | null>(null);

  const [toggleLike, { loading: likeLoading }] = useMutation(TOGGLE_EXPERIENCE_LIKE);
  const [postReply, { loading: replyLoading }] = useMutation(REPLY_TO_EXPERIENCE);

  async function handleToggleLike() {
    if (!user) {
      setReplyError("Sign in to react to reviews.");
      return;
    }
    try {
      const { data } = await toggleLike({ variables: { experienceId: review.id } });
      const result = data?.toggleExperienceLike;
      if (result) {
        setLiked(result.liked);
        setLikeCount(result.likeCount);
        onUpdated?.();
      }
    } catch {
      setReplyError("Could not update reaction.");
    }
  }

  async function handleSubmitReply() {
    if (!user) {
      setReplyError("Sign in to reply.");
      return;
    }
    const trimmed = replyText.trim();
    if (!trimmed) return;
    setReplyError(null);
    try {
      const { data } = await postReply({
        variables: { experienceId: review.id, message: trimmed },
      });
      const reply = data?.replyToExperience;
      if (reply) {
        setReplies((prev) => [...prev, reply]);
        setReplyText("");
        setShowReplyBox(true);
        onUpdated?.();
      }
    } catch (e: unknown) {
      setReplyError(e instanceof Error ? e.message : "Could not post reply.");
    }
  }

  return (
    <div className="bg-white rounded-xl shadow p-5">
      <div className="flex items-center gap-3 mb-2">
        {review.user?.avatarUrl ? (
          <img
            src={review.user.avatarUrl}
            alt={review.user.displayName ?? "Traveler"}
            className="w-8 h-8 rounded-full object-cover"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-xs font-bold text-brand-600">
            {(review.user?.displayName ?? "T").slice(0, 1).toUpperCase()}
          </div>
        )}
        <div>
          <div className="text-sm font-semibold text-slate-700">
            {review.user?.displayName ?? "Traveler"}
          </div>
          <div className="text-[10px] text-slate-400">
            {new Date(review.createdAt).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </div>
        </div>
        <div className="ml-auto text-amber-400 text-sm">{"⭐".repeat(review.rating)}</div>
      </div>

      <p className="text-sm text-slate-600 leading-relaxed">{review.text}</p>

      {review.imageUrls.length > 0 && (
        <div className="flex gap-2 mt-3 overflow-x-auto">
          {review.imageUrls.map((url, i) => (
            <img
              key={i}
              src={url}
              alt={`Experience photo ${i + 1}`}
              className="h-20 w-20 object-cover rounded-lg flex-shrink-0"
            />
          ))}
        </div>
      )}

      <div className="flex items-center gap-4 mt-4 pt-3 border-t border-slate-100">
        <button
          type="button"
          onClick={() => void handleToggleLike()}
          disabled={likeLoading}
          className={`inline-flex items-center gap-1.5 text-sm font-semibold transition-colors ${
            liked ? "text-rose-500" : "text-slate-500 hover:text-rose-500"
          }`}
        >
          {liked ? (
            <HeartSolidIcon className="w-4 h-4" />
          ) : (
            <HeartIcon className="w-4 h-4" />
          )}
          {likeCount}
        </button>

        <button
          type="button"
          onClick={() => setShowReplyBox((v) => !v)}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-brand-600 transition-colors"
        >
          <ChatBubbleLeftIcon className="w-4 h-4" />
          Reply{replies.length > 0 ? ` (${replies.length})` : ""}
        </button>
      </div>

      {showReplyBox && replies.length > 0 && (
        <div className="mt-3 space-y-2">
          {replies.map((reply) => (
            <div key={reply.id} className="rounded-lg bg-slate-50 px-3 py-2">
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${roleBadgeClass(reply.authorRole)}`}>
                  {roleLabel(reply.authorRole)}
                </span>
                <span className="text-[10px] text-slate-400">
                  {new Date(reply.createdAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              </div>
              <p className="text-sm text-slate-600">{reply.message}</p>
            </div>
          ))}
        </div>
      )}

      {showReplyBox && (
        <div className="mt-3">
          <textarea
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder="Share feedback or ask a question…"
            rows={2}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
          />
          <div className="flex items-center justify-between mt-2">
            {replyError && <span className="text-xs text-red-500">{replyError}</span>}
            <button
              type="button"
              onClick={() => void handleSubmitReply()}
              disabled={replyLoading || !replyText.trim()}
              className="ml-auto px-4 py-1.5 rounded-lg bg-brand-500 text-white text-sm font-semibold disabled:opacity-50"
            >
              {replyLoading ? "Posting…" : "Post reply"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
