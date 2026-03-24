"use client";

import { useState, useRef } from "react";

type AttachmentData = {
  id: number;
  fileName: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  category: string;
  createdAt: string;
  uploadedBy: { name: string };
};

type Props = {
  snailId: number;
  category: string;
  label: string;
  attachments: AttachmentData[];
  onUpload: (attachment: AttachmentData) => void;
  onDelete: (attachmentId: number) => void;
};

function formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

export default function FileUpload({
  snailId,
  category,
  label,
  attachments,
  onUpload,
  onDelete,
}: Props) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    if (file.size > 10 * 1024 * 1024) {
      setError("File must be under 10MB");
      return;
    }
    setError("");
    setUploading(true);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("category", category);

    const res = await fetch(`/api/admin/snails/${snailId}/attachments`, {
      method: "POST",
      body: formData,
    });

    if (res.ok) {
      const attachment = await res.json();
      onUpload(attachment);
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Upload failed");
    }
    setUploading(false);
  }

  async function handleDelete(attachmentId: number) {
    if (!confirm("Delete this attachment?")) return;
    const res = await fetch(
      `/api/admin/snails/${snailId}/attachments/${attachmentId}`,
      { method: "DELETE" }
    );
    if (res.ok) {
      onDelete(attachmentId);
    }
  }

  return (
    <div>
      <h3 className="text-sm font-medium text-gray-700 mb-2">{label}</h3>

      {/* Existing attachments */}
      {attachments.length > 0 && (
        <div className="space-y-2 mb-3">
          {attachments.map((a) => (
            <div
              key={a.id}
              className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 text-sm"
            >
              <div className="flex items-center gap-2 min-w-0">
                <svg
                  className="w-4 h-4 text-gray-400 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                  />
                </svg>
                <a
                  href={a.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-amber-700 hover:text-amber-800 font-medium truncate"
                >
                  {a.fileName}
                </a>
                <span className="text-gray-400 flex-shrink-0">
                  {formatSize(a.fileSize)}
                </span>
                <span className="text-gray-400 flex-shrink-0">
                  &middot; {a.uploadedBy.name}
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleDelete(a.id)}
                className="text-red-500 hover:text-red-700 text-xs ml-2 flex-shrink-0"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Upload zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const file = e.dataTransfer.files[0];
          if (file) handleFile(file);
        }}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
          dragOver
            ? "border-amber-400 bg-amber-50"
            : "border-gray-200 hover:border-gray-300"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
            e.target.value = "";
          }}
        />
        {uploading ? (
          <p className="text-sm text-gray-500">Uploading...</p>
        ) : (
          <p className="text-sm text-gray-500">
            Drop a file here or{" "}
            <span className="text-amber-700 font-medium">browse</span>
            <br />
            <span className="text-xs text-gray-400">
              PDF, Word, or images up to 10MB
            </span>
          </p>
        )}
      </div>

      {error && (
        <p className="text-sm text-red-600 mt-2">{error}</p>
      )}
    </div>
  );
}
