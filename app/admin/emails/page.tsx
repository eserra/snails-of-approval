"use client";

import { useState, useEffect } from "react";
import EmailList from "@/components/gmail/EmailList";
import EmailThread from "@/components/gmail/EmailThread";
import ComposeEmail from "@/components/gmail/ComposeEmail";
import GmailConnectionStatus from "@/components/gmail/GmailConnectionStatus";

interface Chapter {
  id: number;
  name: string;
  state: string;
}

export default function EmailsPage() {
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [selectedChapterId, setSelectedChapterId] = useState<number | null>(
    null
  );
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [showCompose, setShowCompose] = useState(false);
  const [replyTo, setReplyTo] = useState<{
    threadId: string;
    messageId: string;
    subject: string;
    to: string;
  } | null>(null);

  useEffect(() => {
    fetch("/api/chapters")
      .then((r) => r.json())
      .then((data) => {
        setChapters(data);
        if (data.length > 0) setSelectedChapterId(data[0].id);
      });
  }, []);

  function handleReply(params: {
    threadId: string;
    messageId: string;
    subject: string;
    to: string;
  }) {
    setReplyTo(params);
    setShowCompose(true);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-gray-900">Emails</h1>
        {selectedChapterId && (
          <button
            onClick={() => {
              setShowCompose(true);
              setReplyTo(null);
            }}
            className="bg-amber-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-amber-800 transition-colors"
          >
            Compose
          </button>
        )}
      </div>

      <div className="flex items-center gap-4">
        <select
          value={selectedChapterId || ""}
          onChange={(e) => {
            setSelectedChapterId(Number(e.target.value));
            setSelectedThreadId(null);
          }}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
        >
          {chapters.map((ch) => (
            <option key={ch.id} value={ch.id}>
              {ch.name} ({ch.state})
            </option>
          ))}
        </select>
        {selectedChapterId && (
          <GmailConnectionStatus chapterId={selectedChapterId} />
        )}
      </div>

      {showCompose && selectedChapterId && (
        <ComposeEmail
          chapterId={selectedChapterId}
          replyTo={replyTo || undefined}
          onSent={() => {
            setShowCompose(false);
            setReplyTo(null);
          }}
          onCancel={() => {
            setShowCompose(false);
            setReplyTo(null);
          }}
        />
      )}

      {selectedChapterId && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
            <EmailList
              chapterId={selectedChapterId}
              onSelectThread={(threadId) => setSelectedThreadId(threadId)}
              selectedThreadId={selectedThreadId || undefined}
            />
          </div>

          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
            {selectedThreadId ? (
              <EmailThread
                threadId={selectedThreadId}
                chapterId={selectedChapterId}
                onReply={handleReply}
                onClose={() => setSelectedThreadId(null)}
              />
            ) : (
              <div className="text-sm text-gray-500 py-8 text-center">
                Select an email to view the thread
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
