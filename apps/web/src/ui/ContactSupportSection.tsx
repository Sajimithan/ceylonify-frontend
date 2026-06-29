import { useState } from "react";
import { useQuery, useMutation } from "@apollo/client/react";
import { Button } from "./Button";
import {
  MY_SUPPORT_TICKETS,
  CREATE_SUPPORT_TICKET,
  REPLY_TO_SUPPORT_TICKET,
} from "../pages/host/support.gql";

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
  status: "OPEN" | "REPLIED" | "CLOSED";
  createdAt: string;
  replies: SupportReply[];
}

const STATUS_STYLES: Record<string, string> = {
  OPEN: "bg-amber-100 text-amber-700",
  REPLIED: "bg-sky-100 text-sky-700",
  CLOSED: "bg-slate-100 text-slate-500",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function ChatImages({ urls }: { urls?: string[] }) {
  if (!urls?.length) return null;
  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {urls.map((url) => (
        <a key={url} href={url} target="_blank" rel="noreferrer">
          <img src={url} alt="Attachment" className="w-16 h-16 object-cover rounded-lg border border-slate-200" />
        </a>
      ))}
    </div>
  );
}

export function ContactSupportSection({ isSuperAdmin }: { isSuperAdmin?: boolean }) {
  if (isSuperAdmin) return null;
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [replyDraft, setReplyDraft] = useState("");
  const [replyError, setReplyError] = useState("");
  const [replying, setReplying] = useState(false);

  const { data, loading, refetch } = useQuery<{ mySupportTickets: SupportTicket[] }>(
    MY_SUPPORT_TICKETS,
    { fetchPolicy: "cache-and-network" }
  );

  const [submit, { loading: submitting }] = useMutation(CREATE_SUPPORT_TICKET, {
    onCompleted: () => {
      setSubject("");
      setMessage("");
      setSuccess(true);
      setError("");
      void refetch();
      setTimeout(() => setSuccess(false), 4000);
    },
    onError: (e) => setError(e.message),
  });

  const [replyToTicket] = useMutation(REPLY_TO_SUPPORT_TICKET);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) return;
    setError("");
    void submit({ variables: { subject: subject.trim(), message: message.trim() } });
  };

  const handleReply = async (ticketId: string) => {
    const draft = replyDraft.trim();
    if (!draft) {
      setReplyError("Please enter a message.");
      return;
    }
    setReplyError("");
    setReplying(true);
    try {
      await replyToTicket({ variables: { ticketId, message: draft } });
      setReplyDraft("");
      await refetch();
    } catch (e) {
      setReplyError(e instanceof Error ? e.message : "Failed to send reply.");
    } finally {
      setReplying(false);
    }
  };

  const tickets = data?.mySupportTickets ?? [];
  const selected = tickets.find((t) => t.id === selectedId) ?? null;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
      <h2 className="text-slate-700 font-bold text-sm mb-4">💬 Contact Support</h2>

      <form onSubmit={handleSubmit} className="space-y-3 mb-6">
        <div>
          <label className="block uppercase text-slate-600 text-xs font-bold mb-2">
            Subject
          </label>
          <input
            className="border-0 px-3 py-3 placeholder-slate-300 text-slate-600 bg-slate-50 rounded text-sm shadow-inner focus:outline-none focus:ring w-full"
            placeholder="What do you need help with?"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            maxLength={120}
            required
          />
        </div>
        <div>
          <label className="block uppercase text-slate-600 text-xs font-bold mb-2">
            Message
          </label>
          <textarea
            className="border-0 px-3 py-3 placeholder-slate-300 text-slate-600 bg-slate-50 rounded text-sm shadow-inner focus:outline-none focus:ring w-full resize-none"
            placeholder="Describe your issue in detail..."
            rows={4}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            maxLength={2000}
            required
          />
        </div>

        {error && (
          <p className="text-xs text-red-500 font-semibold">{error}</p>
        )}
        {success && (
          <p className="text-xs text-emerald-600 font-semibold">
            ✓ Message sent! We'll get back to you soon.
          </p>
        )}

        <div className="flex justify-end">
          <Button type="submit" disabled={submitting || !subject.trim() || !message.trim()}>
            {submitting ? "Sending..." : "Send Message"}
          </Button>
        </div>
      </form>

      {loading && (
        <p className="text-xs text-slate-400 text-center py-2">Loading tickets...</p>
      )}

      {tickets.length > 0 && (
        <div>
          <p className="text-xs font-bold text-slate-400 uppercase mb-3">
            Previous Tickets
          </p>
          <div className="space-y-2">
            {tickets.map((ticket) => (
              <button
                key={ticket.id}
                type="button"
                onClick={() => setSelectedId(selectedId === ticket.id ? null : ticket.id)}
                className={`w-full text-left border rounded-xl px-4 py-3 transition-colors ${
                  selectedId === ticket.id
                    ? "border-brand-300 bg-brand-50"
                    : "border-slate-100 bg-slate-50 hover:bg-slate-100"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-700 truncate">{ticket.subject}</p>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${STATUS_STYLES[ticket.status] ?? "bg-slate-100 text-slate-500"}`}
                  >
                    {ticket.status}
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  {formatDate(ticket.createdAt)}
                  {ticket.replies.length > 0 ? ` · ${ticket.replies.length} repl${ticket.replies.length === 1 ? "y" : "ies"}` : ""}
                </p>
              </button>
            ))}
          </div>

          {selected && (
            <div className="mt-4 border border-slate-200 rounded-xl p-4 bg-white space-y-3">
              <p className="text-sm font-bold text-slate-700">{selected.subject}</p>

              <div className="rounded-lg px-3 py-2 text-xs bg-blue-50 border border-blue-100">
                <span className="font-bold text-blue-600">You: </span>
                {selected.message !== "(Image attached)" && selected.message}
                <ChatImages urls={selected.imageUrls} />
              </div>

              {selected.replies.map((reply) => (
                <div
                  key={reply.id}
                  className={`rounded-lg px-3 py-2 text-xs ${
                    reply.fromAdmin
                      ? "bg-brand-50 border border-brand-100 text-brand-800"
                      : "bg-slate-50 border border-slate-200 text-slate-600"
                  }`}
                >
                  <span className="font-bold mr-1">
                    {reply.fromAdmin ? "Support:" : "You:"}
                  </span>
                  {reply.message !== "(Image attached)" && reply.message}
                  <ChatImages urls={reply.imageUrls} />
                  <span className="ml-2 text-[10px] text-slate-400">
                    {formatDate(reply.createdAt)}
                  </span>
                </div>
              ))}

              {selected.status !== "CLOSED" ? (
                <div className="border-t border-slate-100 pt-3 space-y-2">
                  <textarea
                    className="border border-slate-200 px-3 py-2 placeholder-slate-300 text-slate-600 bg-white rounded text-xs focus:outline-none focus:ring w-full resize-none"
                    placeholder="Write a reply..."
                    rows={3}
                    value={replyDraft}
                    onChange={(e) => setReplyDraft(e.target.value)}
                    maxLength={2000}
                  />
                  {replyError && (
                    <p className="text-xs text-red-500 font-semibold">{replyError}</p>
                  )}
                  <div className="flex justify-end">
                    <Button
                      type="button"
                      disabled={replying || !replyDraft.trim()}
                      onClick={() => void handleReply(selected.id)}
                    >
                      {replying ? "Sending..." : "Send Reply"}
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">This ticket is closed.</p>
              )}
            </div>
          )}
        </div>
      )}

      {!loading && tickets.length === 0 && (
        <p className="text-xs text-slate-400 text-center py-2">
          No previous support tickets.
        </p>
      )}
    </div>
  );
}
