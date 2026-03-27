"use client";

import { useState, useEffect, useCallback } from "react";

interface CachedEmail {
  id: number;
  gmailMessageId: string;
  threadId: string;
  subject: string | null;
  fromAddress: string;
  toAddresses: string;
  snippet: string | null;
  receivedAt: string;
  isRead: boolean;
  snail: { id: number; name: string; slug: string } | null;
}

interface EmailListProps {
  chapterId?: number;
  userId?: number;
  snailId?: number;
  compact?: boolean;
  onSelectThread?: (threadId: string) => void;
  selectedThreadId?: string;
}

export default function EmailList({
  chapterId,
  userId,
  snailId,
  compact,
  onSelectThread,
  selectedThreadId,
}: EmailListProps) {
  const [emails, setEmails] = useState<CachedEmail[]>([]);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [syncing, setSyncing] = useState(false);

  const pageSize = compact ? 5 : 20;

  const fetchEmails = useCallback(async () => {
    if (!chapterId && !userId) return;
    setLoading(true);
    const params = new URLSearchParams();
    if (chapterId) params.set("chapterId", String(chapterId));
    if (userId) params.set("userId", String(userId));
    if (snailId) params.set("snailId", String(snailId));
    params.set("page", String(page));
    params.set("pageSize", String(pageSize));

    const res = await fetch(`/api/admin/gmail/messages?${params}`);
    const data = await res.json();
    setEmails(data.messages || []);
    setTotalPages(data.totalPages || 1);
    setConnected(data.connected !== false);
    setLoading(false);
  }, [chapterId, userId, snailId, page, pageSize]);

  useEffect(() => {
    fetchEmails();
  }, [fetchEmails]);

  async function handleSync() {
    setSyncing(true);
    await fetch("/api/admin/gmail/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chapterId, userId }),
    });
    setSyncing(false);
    fetchEmails();
  }

  if (loading) {
    return (
      <div className="text-sm text-gray-500 py-4 text-center">
        Loading emails...
      </div>
    );
  }

  if (!connected) {
    return (
      <div className="text-sm text-gray-500 py-4 text-center">
        Gmail not connected for this chapter.
      </div>
    );
  }

  if (emails.length === 0) {
    return (
      <div className="text-sm text-gray-500 py-4 text-center">
        <p>No emails found.</p>
        <button
          onClick={handleSync}
          disabled={syncing}
          className="mt-2 text-amber-700 hover:text-amber-800 text-sm font-medium"
        >
          {syncing ? "Syncing..." : "Sync now"}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex justify-end">
        <button
          onClick={handleSync}
          disabled={syncing}
          className="text-amber-700 hover:text-amber-800 text-xs font-medium"
        >
          {syncing ? "Syncing..." : "Sync"}
        </button>
      </div>

      <div className="divide-y divide-gray-100">
        {emails.map((email) => (
          <button
            key={email.id}
            onClick={() => onSelectThread?.(email.threadId)}
            className={`w-full text-left px-3 py-2 hover:bg-gray-50 transition-colors ${
              selectedThreadId === email.threadId ? "bg-amber-50" : ""
            } ${!email.isRead ? "font-medium" : ""}`}
          >
            <div className="flex items-center justify-between gap-2">
              <span
                className={`text-sm truncate ${compact ? "max-w-[180px]" : ""}`}
              >
                {email.fromAddress}
              </span>
              <span className="text-xs text-gray-400 whitespace-nowrap">
                {new Date(email.receivedAt).toLocaleDateString()}
              </span>
            </div>
            <p className="text-sm text-gray-900 truncate">
              {email.subject || "(no subject)"}
            </p>
            {!compact && (
              <p className="text-xs text-gray-500 truncate mt-0.5">
                {email.snippet}
              </p>
            )}
            {!compact && email.snail && (
              <span className="inline-block mt-1 text-xs bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded">
                {email.snail.name}
              </span>
            )}
          </button>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="text-xs text-gray-600 hover:text-gray-900 disabled:opacity-30"
          >
            Previous
          </button>
          <span className="text-xs text-gray-500">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="text-xs text-gray-600 hover:text-gray-900 disabled:opacity-30"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
