"use client";

import { useState } from "react";

interface ComposeEmailProps {
  chapterId?: number;
  userId?: number;
  defaultTo?: string;
  replyTo?: {
    threadId: string;
    messageId: string;
    subject: string;
    to: string;
  };
  onSent?: () => void;
  onCancel?: () => void;
}

const inputClass =
  "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none";

export default function ComposeEmail({
  chapterId,
  userId,
  defaultTo,
  replyTo,
  onSent,
  onCancel,
}: ComposeEmailProps) {
  const [to, setTo] = useState(replyTo?.to || defaultTo || "");
  const [subject, setSubject] = useState(
    replyTo ? `Re: ${replyTo.subject.replace(/^Re:\s*/i, "")}` : ""
  );
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  async function handleSend() {
    if (!to || !subject || !body) return;
    setSending(true);
    setError("");

    const res = await fetch("/api/admin/gmail/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chapterId,
        userId,
        to,
        subject,
        body: `<div>${body.replace(/\n/g, "<br>")}</div>`,
        threadId: replyTo?.threadId,
        inReplyTo: replyTo?.messageId,
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Failed to send email");
      setSending(false);
      return;
    }

    setSending(false);
    onSent?.();
  }

  return (
    <div className="border border-gray-200 rounded-lg p-4 space-y-3 bg-gray-50">
      <h3 className="text-sm font-semibold text-gray-900">
        {replyTo ? "Reply" : "New Email"}
      </h3>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">
          To
        </label>
        <input
          type="email"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          className={inputClass}
          placeholder="recipient@example.com"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">
          Subject
        </label>
        <input
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className={inputClass}
          placeholder="Subject"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">
          Message
        </label>
        <textarea
          rows={6}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          className={inputClass}
          placeholder="Write your message..."
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-2">
        <button
          onClick={handleSend}
          disabled={sending || !to || !subject || !body}
          className="bg-amber-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-amber-800 disabled:opacity-50 transition-colors"
        >
          {sending ? "Sending..." : "Send"}
        </button>
        {onCancel && (
          <button
            onClick={onCancel}
            className="border border-gray-300 px-4 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}
