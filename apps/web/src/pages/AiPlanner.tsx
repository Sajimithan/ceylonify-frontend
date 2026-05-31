import { useState, useRef, useEffect } from "react";
import { useMutation, useQuery } from "@apollo/client/react";
import {
  PaperAirplaneIcon,
  BookmarkIcon,
  TrashIcon,
  SparklesIcon,
  LockClosedIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";
import { DashboardLayout } from "../layouts/DashboardLayout";
import {
  PLAN_ITINERARY,
  MY_AI_USAGE,
  SAVE_CHAT,
  SAVED_CHATS,
  DELETE_SAVED_CHAT,
} from "./ai-planner.gql";
import { gql } from "@apollo/client";

type Message = {
  role: "user" | "assistant";
  content: string;
};

type PlanListing = {
  id: string;
  title: string;
  imageUrl?: string;
  placeName?: string;
  price?: string;
  type: string;
};

type AiUsage = {
  requestsUsed: number;
  monthlyLimit: number;
  remaining: number;
  resetAt: string;
};

type MeData = {
  me: {
    subscriptionTier: string;
    isPremium: boolean;
    role: string;
    aiUsage: AiUsage;
  };
};

type FlagItem = { key: string; enabledForTravelers: boolean; enabledForHosts: boolean };

const FEATURE_FLAGS_QUERY = gql`
  query FeatureFlagsForPlanner {
    featureFlags { key enabledForTravelers enabledForHosts }
  }
`;

type SavedChat = {
  id: string;
  name: string;
  messages: string;
  createdAt: string;
};

type SavedChatsData = {
  savedChats: SavedChat[];
};

function UsagePill({ usage }: { usage: AiUsage }) {
  const pct = usage.monthlyLimit > 0 ? usage.requestsUsed / usage.monthlyLimit : 0;
  const color =
    pct >= 1
      ? "bg-red-100 text-red-700 border-red-200"
      : pct >= 0.7
      ? "bg-amber-100 text-amber-700 border-amber-200"
      : "bg-green-100 text-green-700 border-green-200";
  const reset = new Date(usage.resetAt).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${color}`}>
      <SparklesIcon className="w-3 h-3" />
      {usage.requestsUsed}/{usage.monthlyLimit} requests · resets {reset}
    </span>
  );
}

function ListingCard({ listing }: { listing: PlanListing }) {
  return (
    <a
      href={`/listing/${listing.id}`}
      className="flex items-center gap-3 bg-white border border-slate-100 rounded-xl p-3 shadow-sm hover:shadow-md hover:border-brand-200 transition-all group"
    >
      {listing.imageUrl ? (
        <img
          src={listing.imageUrl}
          alt={listing.title}
          className="w-14 h-14 rounded-lg object-cover flex-shrink-0"
        />
      ) : (
        <div className="w-14 h-14 rounded-lg bg-brand-50 flex items-center justify-center flex-shrink-0">
          <SparklesIcon className="w-6 h-6 text-brand-400" />
        </div>
      )}
      <div className="min-w-0">
        <div className="text-sm font-semibold text-slate-800 truncate group-hover:text-brand-600 transition-colors">
          {listing.title}
        </div>
        {listing.placeName && (
          <div className="text-[11px] text-slate-400 truncate">{listing.placeName}</div>
        )}
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[10px] font-bold uppercase tracking-wide bg-brand-50 text-brand-600 px-2 py-0.5 rounded-full">
            {listing.type}
          </span>
          {listing.price && (
            <span className="text-[11px] text-slate-500 font-medium">
              LKR {listing.price}
            </span>
          )}
        </div>
      </div>
    </a>
  );
}

function MessageBubble({
  msg,
  listings,
}: {
  msg: Message;
  listings?: PlanListing[];
}) {
  const isUser = msg.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-4`}>
      <div className={`max-w-[85%] ${isUser ? "items-end" : "items-start"} flex flex-col gap-2`}>
        <div
          className={`px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
            isUser
              ? "bg-brand-600 text-white rounded-br-sm"
              : "bg-white border border-slate-100 text-slate-800 rounded-bl-sm shadow-sm"
          }`}
        >
          {msg.content}
        </div>
        {!isUser && listings && listings.length > 0 && (
          <div className="w-full space-y-2 mt-1">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-1">
              Book on Ceylonify
            </p>
            {listings.map((l) => (
              <ListingCard key={l.id} listing={l} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const SUGGESTED_PROMPTS = [
  "Plan a 3-day cultural trip starting from Colombo",
  "Best beach experiences in Sri Lanka for 5 days",
  "Adventure trip: hiking, rafting, and wildlife safari",
  "Wellness and ayurveda retreat itinerary",
  "Budget trip for 7 days covering the main highlights",
];

export function AiPlanner() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [lastListings, setLastListings] = useState<PlanListing[]>([]);
  const [input, setInput] = useState("");
  const [saveName, setSaveName] = useState("");
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [localSaving, setLocalSaving] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data: usageData, refetch: refetchUsage } = useQuery<MeData>(MY_AI_USAGE, {
    fetchPolicy: "network-only",
  });
  const { data: historyData, refetch: refetchHistory } = useQuery<SavedChatsData>(SAVED_CHATS, {
    fetchPolicy: "network-only",
  });
  const { data: flagsData } = useQuery<{ featureFlags: FlagItem[] }>(FEATURE_FLAGS_QUERY);

  const [planItinerary, { loading: aiLoading }] = useMutation(PLAN_ITINERARY);
  const [saveChat] = useMutation(SAVE_CHAT);
  const [deleteSavedChat] = useMutation(DELETE_SAVED_CHAT);

  const usage = usageData?.me?.aiUsage;
  const tier = usageData?.me?.subscriptionTier ?? "FREE";
  const role = usageData?.me?.role ?? "TRAVELER";
  const isLocked = usage ? usage.remaining <= 0 : false;

  const plannerFlag = flagsData?.featureFlags?.find((f) => f.key === "AI_TRIP_PLANNER");
  const featureDisabled = plannerFlag
    ? (role === "TRAVELER" && !plannerFlag.enabledForTravelers) ||
      (role === "HOST" && !plannerFlag.enabledForHosts)
    : false;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, aiLoading]);

  async function handleSend() {
    const trimmed = input.trim();
    if (!trimmed || aiLoading || isLocked) return;

    const userMsg: Message = { role: "user", content: trimmed };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput("");

    try {
      const { data } = await planItinerary({
        variables: {
          prompt: trimmed,
          history: messages.map((m) => ({ role: m.role, content: m.content })),
        },
      });
      const result = data?.planItinerary;
      if (result) {
        setMessages([...nextMessages, { role: "assistant", content: result.text }]);
        setLastListings(result.listings ?? []);
        refetchUsage();
      }
    } catch (err: any) {
      const msg = err?.message ?? "";
      const isQuota = msg.includes("QUOTA_EXCEEDED");
      setMessages([
        ...nextMessages,
        {
          role: "assistant",
          content: isQuota
            ? `You have reached your monthly AI request limit (${usage?.requestsUsed}/${usage?.monthlyLimit}). ${
                tier === "FREE"
                  ? "Ask an admin to upgrade your account to Premium for more requests."
                  : "Your quota will reset at the start of next month."
              }`
            : "Sorry, I couldn't generate a plan right now. Please try again.",
        },
      ]);
      refetchUsage();
    }
  }

  async function handleSaveChat() {
    if (!saveName.trim() || messages.length === 0) return;
    setLocalSaving(true);
    try {
      await saveChat({
        variables: {
          name: saveName.trim(),
          messages: JSON.stringify(messages),
        },
      });
      setShowSaveModal(false);
      setSaveName("");
      refetchHistory();
    } finally {
      setLocalSaving(false);
    }
  }

  function loadSavedChat(chat: SavedChat) {
    try {
      const parsed = JSON.parse(chat.messages) as Message[];
      setMessages(parsed);
      setLastListings([]);
    } catch {}
    setShowHistory(false);
  }

  async function handleDeleteChat(chatId: string) {
    await deleteSavedChat({ variables: { chatId } });
    refetchHistory();
  }

  function clearChat() {
    setMessages([]);
    setLastListings([]);
  }

  if (featureDisabled) {
    return (
      <DashboardLayout title="AI Travel Planner" subtitle="Plan your perfect Sri Lanka trip with AI assistance">
        <div className="max-w-lg mx-auto mt-16 text-center">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
            <LockClosedIcon className="w-7 h-7 text-slate-400" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Feature Disabled</h2>
          <p className="text-slate-500 text-sm">
            The AI Trip Planner has been temporarily disabled by an administrator.
            Please check back later or contact support.
          </p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="AI Travel Planner"
      subtitle="Plan your perfect Sri Lanka trip with AI assistance"
      actions={
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {usage && <UsagePill usage={usage} />}
          {tier === "FREE" && !usageData?.me?.isPremium && (
            <span className="text-[11px] font-semibold bg-amber-400/20 text-amber-300 border border-amber-400/30 px-2.5 py-1 rounded-full">
              Free Tier
            </span>
          )}
          {(usageData?.me?.isPremium) && tier === "PREMIUM" && (
            <span className="text-[11px] font-semibold bg-brand-400/20 text-brand-200 border border-brand-400/30 px-2.5 py-1 rounded-full">
              Premium
            </span>
          )}
        </div>
      }
    >
      <div className="mx-auto w-full max-w-4xl flex flex-col" style={{ height: "calc(100vh - 220px)" }}>
        {/* Toolbar */}
        <div className="flex items-center gap-2 mb-3">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-700 border border-slate-200 bg-white rounded-lg px-3 py-1.5 transition-colors shadow-sm"
          >
            <BookmarkIcon className="w-3.5 h-3.5" />
            Saved Chats ({historyData?.savedChats?.length ?? 0})
          </button>
          {messages.length > 0 && (
            <>
              <button
                onClick={() => { setSaveName(""); setShowSaveModal(true); }}
                className="flex items-center gap-1.5 text-xs font-semibold text-brand-600 hover:text-brand-800 border border-brand-200 bg-brand-50 rounded-lg px-3 py-1.5 transition-colors shadow-sm"
              >
                <BookmarkIcon className="w-3.5 h-3.5" />
                Save
              </button>
              <button
                onClick={clearChat}
                className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-red-600 border border-slate-200 bg-white rounded-lg px-3 py-1.5 transition-colors shadow-sm"
              >
                <TrashIcon className="w-3.5 h-3.5" />
                Clear
              </button>
            </>
          )}
        </div>

        {/* Saved Chats Panel */}
        {showHistory && (
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 mb-3 max-h-56 overflow-y-auto">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
              Saved Conversations
            </p>
            {(historyData?.savedChats ?? []).length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-4">No saved chats yet.</p>
            ) : (
              <ul className="space-y-1.5">
                {(historyData?.savedChats ?? []).map((c) => (
                  <li key={c.id} className="flex items-center justify-between gap-2 hover:bg-slate-50 rounded-lg px-2 py-1.5 transition-colors">
                    <button
                      onClick={() => loadSavedChat(c)}
                      className="flex-1 text-left text-sm font-medium text-slate-700 hover:text-brand-600 transition-colors truncate"
                    >
                      {c.name}
                      <span className="ml-2 text-[10px] text-slate-400">
                        {new Date(c.createdAt).toLocaleDateString()}
                      </span>
                    </button>
                    <button
                      onClick={() => handleDeleteChat(c.id)}
                      className="text-slate-300 hover:text-red-500 transition-colors flex-shrink-0"
                    >
                      <TrashIcon className="w-3.5 h-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Chat Area */}
        <div className="flex-1 bg-white rounded-xl border border-slate-100 shadow-sm overflow-y-auto p-4 min-h-0">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-6 text-center">
              <div className="w-16 h-16 rounded-2xl bg-brand-50 flex items-center justify-center shadow-sm">
                <SparklesIcon className="w-8 h-8 text-brand-500" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-800">
                  AI Travel Planner
                </h2>
                <p className="text-sm text-slate-500 mt-1 max-w-sm">
                  Ask me to plan your Sri Lanka trip — I'll build a personalised itinerary using real experiences on Ceylonify.
                </p>
              </div>
              {isLocked ? (
                <div className="flex flex-col items-center gap-2 bg-red-50 border border-red-100 rounded-xl px-6 py-4 max-w-sm">
                  <LockClosedIcon className="w-5 h-5 text-red-400" />
                  <p className="text-sm font-semibold text-red-700">Monthly limit reached</p>
                  <p className="text-xs text-red-500">
                    {tier === "FREE"
                      ? "Contact an admin to upgrade to Premium for 30 requests/month."
                      : "Your quota resets at the start of next month."}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg">
                  {SUGGESTED_PROMPTS.map((p) => (
                    <button
                      key={p}
                      onClick={() => setInput(p)}
                      className="text-left text-xs font-medium text-slate-600 bg-slate-50 hover:bg-brand-50 hover:text-brand-700 border border-slate-100 hover:border-brand-200 rounded-xl px-3 py-2.5 transition-all"
                    >
                      {p}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <>
              {messages.map((msg, i) => (
                <MessageBubble
                  key={i}
                  msg={msg}
                  listings={
                    msg.role === "assistant" && i === messages.length - 1
                      ? lastListings
                      : undefined
                  }
                />
              ))}
              {aiLoading && (
                <div className="flex justify-start mb-4">
                  <div className="bg-white border border-slate-100 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm flex items-center gap-2">
                    <ArrowPathIcon className="w-4 h-4 text-brand-500 animate-spin" />
                    <span className="text-sm text-slate-400">Planning your trip…</span>
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </>
          )}
        </div>

        {/* Input Area */}
        <div className="mt-3">
          {isLocked && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-xl px-4 py-2.5 mb-2">
              <LockClosedIcon className="w-4 h-4 text-red-400 flex-shrink-0" />
              <p className="text-xs text-red-600 font-medium">
                Monthly limit reached ({usage?.requestsUsed}/{usage?.monthlyLimit}).{" "}
                {tier === "FREE"
                  ? "Contact an admin to upgrade to Premium."
                  : "Resets next month."}
              </p>
            </div>
          )}
          <div className="flex items-end gap-2">
            <textarea
              rows={2}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder={
                isLocked
                  ? "AI requests exhausted for this month…"
                  : "Ask me to plan a trip — e.g. 'Plan 5 days in Kandy and Nuwara Eliya'"
              }
              disabled={isLocked || aiLoading}
              className="flex-1 resize-none border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent transition-all shadow-sm disabled:bg-slate-50 disabled:text-slate-400"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || aiLoading || isLocked}
              className="flex-shrink-0 w-11 h-11 rounded-xl bg-brand-600 hover:bg-brand-700 disabled:bg-slate-200 disabled:cursor-not-allowed flex items-center justify-center transition-colors shadow-sm"
            >
              <PaperAirplaneIcon className="w-5 h-5 text-white" />
            </button>
          </div>
          <p className="text-[10px] text-slate-400 mt-1.5 px-1">
            Press Enter to send · Shift+Enter for newline
          </p>
        </div>
      </div>

      {/* Save Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm">
            <h3 className="text-base font-bold text-slate-800 mb-1">Save Conversation</h3>
            <p className="text-sm text-slate-500 mb-4">Give this conversation a name to find it later.</p>
            <input
              type="text"
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSaveChat()}
              placeholder="e.g. Kandy 5-day trip"
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-400 mb-4"
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={handleSaveChat}
                disabled={!saveName.trim() || localSaving}
                className="flex-1 bg-brand-600 hover:bg-brand-700 disabled:bg-slate-200 text-white disabled:text-slate-400 font-semibold text-sm py-2.5 rounded-xl transition-colors"
              >
                {localSaving ? "Saving…" : "Save"}
              </button>
              <button
                onClick={() => setShowSaveModal(false)}
                className="flex-1 border border-slate-200 text-slate-600 font-semibold text-sm py-2.5 rounded-xl hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
