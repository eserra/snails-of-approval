"use client";

import { useState, useEffect } from "react";
import DOMPurify from "isomorphic-dompurify";

interface EmailAddress {
  name?: string;
  email: string;
}

interface Message {
  id: string;
  threadId: string;
  subject: string;
  from: EmailAddress;
  to: EmailAddress[];
  cc?: EmailAddress[];
  date: string;
  snippet: string;
  body: { text?: string; html?: string };
  isRead: boolean;
}

interface Thread {
  id: string;
  messages: Message[];
  subject: string;
}

interface EmailThreadProps {
  threadId: string;
  chapterId?: number;
  userId?: number;
  onReply?: (params: {
    threadId: string;
    messageId: string;
    subject: string;
    to: string;
  }) => void;
  onClose?: () => void;
}

function formatAddress(addr: EmailAddress) {
  return addr.name ? `${addr.name} <${addr.email}>` : addr.email;
}

export default function EmailThread({
  threadId,
  chapterId,
  userId,
  onReply,
  onClose,
}: EmailThreadProps) {
  const [thread, setThread] = useState<Thread | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedMessages, setExpandedMessages] = useState<Set<string>>(
    new Set()
  );

  useEffect(() => {
    async function load() {
      setLoading(true);
      const params = new URLSearchParams();
      if (chapterId) params.set("chapterId", String(chapterId));
      if (userId) params.set("userId", String(userId));

      const res = await fetch(
        `/api/admin/gmail/threads/${threadId}?${params}`
      );
      const data = await res.json();
      setThread(data);
      // Expand the last message by default
      if (data.messages?.length > 0) {
        setExpandedMessages(
          new Set([data.messages[data.messages.length - 1].id])
        );
      }
      setLoading(false);
    }
    load();
  }, [threadId, chapterId, userId]);

  if (loading) {
    return (
      <div className="text-sm text-gray-500 py-8 text-center">
        Loading thread...
      </div>
    );
  }

  if (!thread) {
    return (
      <div className="text-sm text-red-600 py-4 text-center">
        Failed to load thread.
      </div>
    );
  }

  const lastMessage = thread.messages[thread.messages.length - 1];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900 truncate">
          {thread.subject}
        </h3>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-sm"
          >
            Close
          </button>
        )}
      </div>

      <div className="space-y-2">
        {thread.messages.map((msg) => {
          const isExpanded = expandedMessages.has(msg.id);
          return (
            <div
              key={msg.id}
              className="border border-gray-200 rounded-lg overflow-hidden"
            >
              <button
                onClick={() => {
                  setExpandedMessages((prev) => {
                    const next = new Set(prev);
                    if (next.has(msg.id)) next.delete(msg.id);
                    else next.add(msg.id);
                    return next;
                  });
                }}
                className="w-full text-left px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-900">
                    {msg.from.name || msg.from.email}
                  </span>
                  <span className="text-xs text-gray-400">
                    {new Date(msg.date).toLocaleString()}
                  </span>
                </div>
                {!isExpanded && (
                  <p className="text-xs text-gray-500 mt-1 truncate">
                    {msg.snippet}
                  </p>
                )}
              </button>

              {isExpanded && (
                <div className="px-4 py-3 space-y-2">
                  <div className="text-xs text-gray-500 space-y-0.5">
                    <p>From: {formatAddress(msg.from)}</p>
                    <p>To: {msg.to.map(formatAddress).join(", ")}</p>
                    {msg.cc && msg.cc.length > 0 && (
                      <p>Cc: {msg.cc.map(formatAddress).join(", ")}</p>
                    )}
                  </div>
                  <div className="border-t border-gray-100 pt-2">
                    {msg.body.html ? (
                      <div
                        className="prose prose-sm max-w-none text-sm"
                        dangerouslySetInnerHTML={{
                          __html: DOMPurify.sanitize(msg.body.html),
                        }}
                      />
                    ) : (
                      <pre className="text-sm text-gray-900 whitespace-pre-wrap font-sans">
                        {msg.body.text || msg.snippet}
                      </pre>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {onReply && lastMessage && (
        <div className="pt-2">
          <button
            onClick={() =>
              onReply({
                threadId: thread.id,
                messageId: lastMessage.id,
                subject: thread.subject,
                to: lastMessage.from.email,
              })
            }
            className="bg-amber-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-amber-800 transition-colors"
          >
            Reply
          </button>
        </div>
      )}
    </div>
  );
}
