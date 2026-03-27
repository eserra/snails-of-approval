"use client";

import { useState, useEffect } from "react";

interface GmailConnectionStatusProps {
  chapterId: number;
  showActions?: boolean;
}

interface AccountStatus {
  connected: boolean;
  emailAddress?: string;
}

export default function GmailConnectionStatus({
  chapterId,
  showActions = true,
}: GmailConnectionStatusProps) {
  const [status, setStatus] = useState<AccountStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [disconnecting, setDisconnecting] = useState(false);

  useEffect(() => {
    async function check() {
      setLoading(true);
      const res = await fetch(
        `/api/admin/gmail/messages?chapterId=${chapterId}&pageSize=0`
      );
      const data = await res.json();
      setStatus({ connected: data.connected !== false });
      setLoading(false);
    }
    check();
  }, [chapterId]);

  async function handleConnect() {
    const res = await fetch(
      `/api/admin/gmail/oauth/authorize?chapterId=${chapterId}`
    );
    const data = await res.json();
    if (data.url) {
      window.location.href = data.url;
    }
  }

  async function handleDisconnect() {
    setDisconnecting(true);
    await fetch("/api/admin/gmail/oauth/disconnect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chapterId }),
    });
    setStatus({ connected: false });
    setDisconnecting(false);
  }

  if (loading) {
    return <span className="text-xs text-gray-400">Checking Gmail...</span>;
  }

  if (!status?.connected) {
    return showActions ? (
      <button
        onClick={handleConnect}
        className="text-xs text-amber-700 hover:text-amber-800 font-medium"
      >
        Connect Gmail
      </button>
    ) : (
      <span className="text-xs text-gray-400">Not connected</span>
    );
  }

  return (
    <span className="inline-flex items-center gap-2">
      <span className="inline-flex items-center gap-1 text-xs text-green-700">
        <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
        Gmail connected
      </span>
      {showActions && (
        <button
          onClick={handleDisconnect}
          disabled={disconnecting}
          className="text-xs text-gray-400 hover:text-red-600"
        >
          {disconnecting ? "..." : "Disconnect"}
        </button>
      )}
    </span>
  );
}
