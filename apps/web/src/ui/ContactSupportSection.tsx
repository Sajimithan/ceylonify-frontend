import { useState } from "react";
import { useQuery, useMutation } from "@apollo/client/react";
import { Button } from "./Button";
import {
  MY_SUPPORT_TICKETS,
  CREATE_SUPPORT_TICKET,
} from "../pages/host/support.gql";

interface SupportReply {
  id: string;
  fromAdmin: boolean;
  senderUid: string;
  message: string;
  createdAt: string;
}

interface SupportTicket {
  id: string;
  subject: string;
  message: string;
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

export function ContactSupportSection() {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) return;
    setError("");
    void submit({ variables: { subject: subject.trim(), message: message.trim() } });
  };

  const tickets = data?.mySupportTickets ?? [];

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
          <div className="space-y-3">
            {tickets.map((ticket) => (
              <div
                key={ticket.id}
                className="border border-slate-100 rounded-xl p-4 bg-slate-50"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <p className="text-sm font-semibold text-slate-700 leading-tight">
                    {ticket.subject}
                  </p>
                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_STYLES[ticket.status] ?? "bg-slate-100 text-slate-500"}`}
                    >
                      {ticket.status}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {formatDate(ticket.createdAt)}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-slate-500 leading-relaxed mb-2">
                  {ticket.message}
                </p>

                {ticket.replies.length > 0 && (
                  <div className="mt-3 space-y-2 border-t border-slate-200 pt-3">
                    {ticket.replies.map((reply) => (
                      <div
                        key={reply.id}
                        className={`rounded-lg px-3 py-2 text-xs leading-relaxed ${
                          reply.fromAdmin
                            ? "bg-brand-50 border border-brand-100 text-brand-800"
                            : "bg-white border border-slate-200 text-slate-600"
                        }`}
                      >
                        <span className="font-bold mr-1">
                          {reply.fromAdmin ? "Support:" : "You:"}
                        </span>
                        {reply.message}
                        <span className="ml-2 text-[10px] text-slate-400">
                          {formatDate(reply.createdAt)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
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
