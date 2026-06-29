import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@apollo/client/react";
import { useSearchParams } from "react-router-dom";
import { DashboardLayout } from "../../layouts/DashboardLayout";
import { Card } from "../../ui/Card";
import { Button } from "../../ui/Button";
import { XMarkIcon, SparklesIcon } from "@heroicons/react/24/outline";
import {
  ADMIN_ALL_SUPPORT_TICKETS,
  ADMIN_REPLY_TO_SUPPORT_TICKET,
  ADMIN_CLOSE_SUPPORT_TICKET,
  AI_SUPPORT_SUMMARY,
} from "./admin.gql";

type SupportStatus = "OPEN" | "REPLIED" | "CLOSED";

interface SupportReply {
  id: string;
  fromAdmin: boolean;
  senderUid: string;
  message: string;
  imageUrls?: string[];
  createdAt: string;
}

interface SupportTicket {
  id: string;
  subject: string;
  message: string;
  imageUrls?: string[];
  status: SupportStatus;
  createdAt: string;
  userEmail?: string;
  userDisplayName?: string;
  sourceType?: string;
  sourceId?: string;
  listingId?: string;
  replies: SupportReply[];
}

const STATUS_STYLES: Record<SupportStatus, string> = {
  OPEN: "text-amber-700 bg-amber-100",
  REPLIED: "text-sky-700 bg-sky-100",
  CLOSED: "text-slate-500 bg-slate-100",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function ChatImages({ urls }: { urls?: string[] }) {
  if (!urls?.length) return null;
  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {urls.map((url) => (
        <a key={url} href={url} target="_blank" rel="noreferrer">
          <img src={url} alt="Attachment" className="w-20 h-20 object-cover rounded-lg border border-slate-200" />
        </a>
      ))}
    </div>
  );
}

function StatusBadge({ status }: { status: SupportStatus }) {
  return (
    <span
      className={`text-xs font-bold inline-block py-1 px-2 uppercase rounded ${STATUS_STYLES[status] ?? "bg-slate-100 text-slate-500"}`}
    >
      {status}
    </span>
  );
}

type AISupportResult = { summary: string; suggestedReply: string };

function AISupportPanel({
  ticket,
  onUseSuggestion,
}: {
  ticket: SupportTicket;
  onUseSuggestion: (text: string) => void;
}) {
  const [state, setState] = useState<"idle" | "loading" | "result">("idle");
  const [result, setResult] = useState<AISupportResult | null>(null);
  const [aiError, setAiError] = useState("");

  const [runSummary] = useMutation<{ aiSupportSummary: AISupportResult }>(
    AI_SUPPORT_SUMMARY,
    {
      onCompleted: (data) => {
        setResult(data.aiSupportSummary);
        setState("result");
        setAiError("");
      },
      onError: (e) => {
        setAiError(e.message);
        setState("idle");
      },
    }
  );

  const buildConversation = () => {
    const parts = [`User: ${ticket.message}`];
    ticket.replies.forEach((r) => {
      parts.push(`${r.fromAdmin ? "Admin" : "User"}: ${r.message}`);
    });
    return parts.join("\n\n");
  };

  const handleRun = () => {
    setState("loading");
    setResult(null);
    void runSummary({
      variables: {
        subject: ticket.subject,
        conversation: buildConversation(),
      },
    });
  };

  if (state === "idle") {
    return (
      <div className="rounded-xl border border-violet-200 bg-violet-50 p-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <SparklesIcon className="w-4 h-4 text-violet-500 shrink-0" />
          <div>
            <div className="text-xs font-bold text-violet-700">AI Assist</div>
            <div className="text-xs text-violet-500">Summarize the query and get a suggested reply</div>
          </div>
        </div>
        <button
          onClick={handleRun}
          className="shrink-0 flex items-center gap-1.5 bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors"
        >
          <SparklesIcon className="w-3.5 h-3.5" />
          Summarize
        </button>
        {aiError && (
          <p className="text-xs text-red-500 font-semibold mt-1">{aiError}</p>
        )}
      </div>
    );
  }

  if (state === "loading") {
    return (
      <div className="rounded-xl border border-violet-200 bg-violet-50 p-4 flex items-center gap-3">
        <div className="w-4 h-4 border-2 border-violet-400 border-t-transparent rounded-full animate-spin shrink-0" />
        <span className="text-xs font-semibold text-violet-700">
          AI is reading the conversation…
        </span>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-violet-200 bg-violet-50 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-violet-200">
        <div className="flex items-center gap-1.5">
          <SparklesIcon className="w-3.5 h-3.5 text-violet-600" />
          <span className="text-xs font-bold text-violet-700 uppercase tracking-wide">
            AI Assist
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRun}
            className="text-[10px] text-violet-500 hover:text-violet-700 font-semibold transition-colors"
          >
            Re-run
          </button>
          <button
            onClick={() => setState("idle")}
            className="text-violet-400 hover:text-violet-600 transition-colors"
          >
            <XMarkIcon className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {result && (
        <div className="p-4 space-y-3">
          {/* Summary */}
          <div className="bg-white rounded-lg p-3 border border-violet-100">
            <p className="text-[10px] font-bold uppercase text-violet-500 mb-1.5 tracking-wide">
              Summary
            </p>
            <p className="text-sm text-slate-700 leading-relaxed">{result.summary}</p>
          </div>

          {/* Suggested Reply */}
          <div className="bg-white rounded-lg p-3 border border-violet-100">
            <p className="text-[10px] font-bold uppercase text-violet-500 mb-1.5 tracking-wide">
              Suggested Reply
            </p>
            <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
              {result.suggestedReply}
            </p>
            <div className="flex justify-end mt-2.5">
              <button
                onClick={() => onUseSuggestion(result.suggestedReply)}
                className="text-xs font-bold text-violet-600 hover:text-violet-800 bg-violet-100 hover:bg-violet-200 px-3 py-1 rounded-lg transition-colors"
              >
                Use this reply ↓
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TicketDetailModal({
  ticket,
  onClose,
  onRefetch,
}: {
  ticket: SupportTicket;
  onClose: () => void;
  onRefetch: () => void;
}) {
  const [replyText, setReplyText] = useState("");
  const [replyError, setReplyError] = useState("");

  const [sendReply, { loading: replying }] = useMutation(ADMIN_REPLY_TO_SUPPORT_TICKET, {
    onCompleted: () => {
      setReplyText("");
      setReplyError("");
      onRefetch();
    },
    onError: (e) => setReplyError(e.message),
  });

  const [closeTicket, { loading: closing }] = useMutation(ADMIN_CLOSE_SUPPORT_TICKET, {
    onCompleted: () => {
      onRefetch();
      onClose();
    },
  });

  const handleSendReply = () => {
    if (!replyText.trim()) return;
    void sendReply({ variables: { ticketId: ticket.id, message: replyText.trim() } });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-6 pt-5 pb-3 border-b border-slate-100">
          <div className="flex-1 min-w-0 mr-4">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <StatusBadge status={ticket.status} />
              {ticket.sourceType === "LISTING_REPORT" && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                  LISTING REPORT
                </span>
              )}
              <span className="text-xs text-slate-400">{formatDate(ticket.createdAt)}</span>
            </div>
            <h2 className="text-base font-bold text-slate-800 leading-tight">
              {ticket.subject}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {ticket.userDisplayName
                ? `${ticket.userDisplayName} · `
                : ""}
              {ticket.userEmail ?? "Unknown user"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-slate-100 transition-colors shrink-0"
          >
            <XMarkIcon className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Message thread */}
          <div>
            <h3 className="text-xs font-bold uppercase text-slate-400 mb-3">
              Conversation
            </h3>
            <div className="space-y-3">
              {/* Original message */}
              <div className="flex flex-col items-end">
                <div className="max-w-[85%] bg-blue-50 border border-blue-100 rounded-2xl rounded-tr-sm px-4 py-3">
                  <p className="text-xs font-bold text-blue-600 mb-1">User</p>
                  <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                    {ticket.message}
                  </p>
                  <ChatImages urls={ticket.imageUrls} />
                  <p className="text-[10px] text-slate-400 mt-1.5 text-right">
                    {formatDate(ticket.createdAt)} · {formatTime(ticket.createdAt)}
                  </p>
                </div>
              </div>

              {/* Replies */}
              {ticket.replies.map((reply) => (
                <div
                  key={reply.id}
                  className={`flex flex-col ${reply.fromAdmin ? "items-start" : "items-end"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                      reply.fromAdmin
                        ? "bg-slate-100 border border-slate-200 rounded-tl-sm"
                        : "bg-blue-50 border border-blue-100 rounded-tr-sm"
                    }`}
                  >
                    <p
                      className={`text-xs font-bold mb-1 ${
                        reply.fromAdmin ? "text-slate-600" : "text-blue-600"
                      }`}
                    >
                      {reply.fromAdmin ? "Support Team" : "User"}
                    </p>
                    <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                      {reply.message}
                    </p>
                    <ChatImages urls={reply.imageUrls} />
                    <p className="text-[10px] text-slate-400 mt-1.5">
                      {formatDate(reply.createdAt)} · {formatTime(reply.createdAt)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Reply box (only when ticket not closed) */}
          {ticket.status !== "CLOSED" && (
            <div className="border-t border-slate-100 pt-4 space-y-4">
              {/* AI Assist panel */}
              <AISupportPanel
                ticket={ticket}
                onUseSuggestion={(text) => setReplyText(text)}
              />

              <div>
              <h3 className="text-xs font-bold uppercase text-slate-400 mb-2">
                Reply
              </h3>
              <textarea
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-700 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-300 resize-none"
                rows={4}
                placeholder="Type your reply..."
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                maxLength={2000}
              />
              {replyError && (
                <p className="text-xs text-red-500 font-semibold mt-1">{replyError}</p>
              )}
              <div className="flex gap-3 mt-3">
                <Button
                  onClick={handleSendReply}
                  disabled={replying || !replyText.trim()}
                  className="flex-1"
                >
                  {replying ? "Sending..." : "Send Reply"}
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => closeTicket({ variables: { ticketId: ticket.id } })}
                  disabled={closing}
                  className="text-slate-500"
                >
                  {closing ? "Closing..." : "Close Ticket"}
                </Button>
              </div>
              </div>
            </div>
          )}

          {ticket.status === "CLOSED" && (
            <div className="border-t border-slate-100 pt-4">
              <p className="text-xs text-slate-400 text-center font-semibold">
                This ticket is closed.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function AdminSupport() {
  const [searchParams, setSearchParams] = useSearchParams();
  const openedFromUrl = useRef(false);
  const [filter, setFilter] = useState<"ALL" | SupportStatus>("ALL");
  const [selected, setSelected] = useState<SupportTicket | null>(null);

  const { data, loading, error, refetch } = useQuery<{
    adminAllSupportTickets: SupportTicket[];
  }>(ADMIN_ALL_SUPPORT_TICKETS, { fetchPolicy: "cache-and-network" });

  const tickets = data?.adminAllSupportTickets ?? [];

  useEffect(() => {
    if (loading || openedFromUrl.current || tickets.length === 0) return;

    const ticketParam = searchParams.get("ticket");
    const reportParam = searchParams.get("reportId");
    if (!ticketParam && !reportParam) return;

    let match: SupportTicket | undefined;
    if (ticketParam) {
      match = tickets.find((t) => t.id === ticketParam);
    } else if (reportParam) {
      match = tickets.find(
        (t) => t.sourceType === "LISTING_REPORT" && t.sourceId === reportParam,
      );
    }

    if (match) {
      openedFromUrl.current = true;
      setFilter("ALL");
      setSelected(match);
      setSearchParams({}, { replace: true });
    }
  }, [loading, tickets, searchParams, setSearchParams]);

  const filtered =
    filter === "ALL" ? tickets : tickets.filter((t) => t.status === filter);

  const openCount = tickets.filter((t) => t.status === "OPEN").length;

  return (
    <DashboardLayout
      title="User Support"
      subtitle="Manage and reply to support tickets from hosts and travelers"
    >
      <div className="mx-auto w-full max-w-4xl space-y-4">
        {/* Filter tabs */}
        <div className="flex gap-2 flex-wrap">
          {(["ALL", "OPEN", "REPLIED", "CLOSED"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase transition-colors flex items-center gap-1.5 ${
                filter === f
                  ? "bg-slate-800 text-white"
                  : "bg-white text-slate-500 border border-slate-200 hover:bg-slate-50"
              }`}
            >
              {f}
              {f === "OPEN" && openCount > 0 && (
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                    filter === "OPEN"
                      ? "bg-white text-slate-800"
                      : "bg-amber-100 text-amber-700"
                  }`}
                >
                  {openCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {loading && (
          <div className="text-center py-12 text-slate-400 font-semibold">
            Loading tickets…
          </div>
        )}
        {error && (
          <div className="rounded bg-red-100 px-4 py-3 text-sm text-red-800 font-bold">
            {error.message}
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <Card className="text-center py-12">
            <div className="text-4xl mb-3">💬</div>
            <p className="text-slate-400 font-semibold">
              No {filter === "ALL" ? "" : filter.toLowerCase() + " "}support tickets.
            </p>
          </Card>
        )}

        {filtered.map((ticket) => (
          <Card
            key={ticket.id}
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => setSelected(ticket)}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  <StatusBadge status={ticket.status} />
                  {ticket.sourceType === "LISTING_REPORT" && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                      LISTING REPORT
                    </span>
                  )}
                  <span className="text-xs text-slate-400">
                    {formatDate(ticket.createdAt)}
                  </span>
                  {ticket.replies.length > 0 && (
                    <span className="text-[10px] bg-slate-100 text-slate-500 font-semibold px-2 py-0.5 rounded-full">
                      {ticket.replies.length} repl{ticket.replies.length === 1 ? "y" : "ies"}
                    </span>
                  )}
                </div>
                <p className="text-sm font-bold text-slate-800 mb-0.5 leading-tight">
                  {ticket.subject}
                </p>
                <p className="text-xs text-slate-500 line-clamp-2 mb-2">
                  {ticket.message}
                </p>
                <p className="text-xs text-slate-400">
                  From:{" "}
                  <span className="font-semibold text-slate-600">
                    {ticket.userDisplayName
                      ? `${ticket.userDisplayName} · `
                      : ""}
                    {ticket.userEmail ?? "Unknown"}
                  </span>
                </p>
              </div>
              <div className="text-xs text-slate-300 font-semibold shrink-0">
                Click to reply →
              </div>
            </div>
          </Card>
        ))}
      </div>

      {selected && (
        <TicketDetailModal
          ticket={selected}
          onClose={() => setSelected(null)}
          onRefetch={() => {
            void refetch();
            // Update the selected ticket from fresh data after refetch
            refetch().then(({ data: fresh }) => {
              const updated = fresh?.adminAllSupportTickets?.find(
                (t: SupportTicket) => t.id === selected.id
              );
              if (updated) setSelected(updated);
              else setSelected(null);
            });
          }}
        />
      )}
    </DashboardLayout>
  );
}
