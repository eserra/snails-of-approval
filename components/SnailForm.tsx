"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import AddressAutocomplete from "./AddressAutocomplete";
import FileUpload from "./FileUpload";
import { validateStageChange } from "@/lib/stage-requirements";

type Chapter = { id: number; name: string };
type Category = {
  id: number;
  name: string;
  parentId: number | null;
  children?: { id: number; name: string }[];
};
type UserOption = { id: number; name: string };
type NoteData = {
  id: number;
  content: string;
  createdAt: string;
  author: { name: string };
};
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

type SnailData = {
  id?: number;
  name: string;
  yearAwarded: number | string;
  description: string;
  address: string;
  latitude: string;
  longitude: string;
  email: string;
  phone: string;
  website: string;
  facebookUrl: string;
  instagramUrl: string;
  photoUrl: string;
  status: string;
  categoryId: string;
  chapterId: string;
  // CRM fields
  track: string;
  stage: string;
  formerAwardee: boolean;
  renewalDueYear: string;
  businessStatus: string;
  source: string;
  blockedReason: string;
  contactName: string;
  borough: string;
  zip: string;
  onSfusaMap: boolean;

  establishmentType: string;
  assigneeId: string;
  lastTouchDate: string;
  welcomeLetterSent: boolean;
  stickersDelivered: boolean;
  diversityTags: string;
  // Notes and attachments (read-only, for display)
  notes?: NoteData[];
  attachments?: AttachmentData[];
};

const emptySnail: SnailData = {
  name: "",
  yearAwarded: new Date().getFullYear(),
  description: "",
  address: "",
  latitude: "",
  longitude: "",
  email: "",
  phone: "",
  website: "",
  facebookUrl: "",
  instagramUrl: "",
  photoUrl: "",
  status: "draft",
  categoryId: "",
  chapterId: "",
  track: "lead",
  stage: "New",
  formerAwardee: false,
  renewalDueYear: "",
  businessStatus: "",
  source: "",
  blockedReason: "",
  contactName: "",
  borough: "",
  zip: "",
  onSfusaMap: false,

  establishmentType: "",
  assigneeId: "",
  lastTouchDate: "",
  welcomeLetterSent: false,
  stickersDelivered: false,
  diversityTags: "",
};

const inputClass =
  "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none";
const labelClass = "block text-sm font-medium text-gray-700 mb-1";
const checkboxClass =
  "h-4 w-4 rounded border-gray-300 text-amber-700 focus:ring-amber-500";

export default function SnailForm({ snail }: { snail?: SnailData }) {
  const router = useRouter();
  const [form, setForm] = useState<SnailData>(snail || emptySnail);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notes, setNotes] = useState<NoteData[]>(snail?.notes || []);
  const [attachments, setAttachments] = useState<AttachmentData[]>(
    snail?.attachments || []
  );
  const [stageWarnings, setStageWarnings] = useState<
    { label: string; met: boolean }[]
  >([]);
  const [newNote, setNewNote] = useState("");
  const [addingNote, setAddingNote] = useState(false);
  const isEdit = !!snail?.id;

  useEffect(() => {
    Promise.all([
      fetch("/api/chapters"),
      fetch("/api/categories"),
      fetch("/api/admin/users/list"),
    ]).then(async ([chRes, catRes, usersRes]) => {
      setChapters(await chRes.json());
      setCategories(await catRes.json());
      if (usersRes.ok) setUsers(await usersRes.json());
    });
  }, []);

  function update(field: string, value: string | number | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    const url = isEdit
      ? `/api/admin/snails/${snail!.id}`
      : "/api/admin/snails";
    const method = isEdit ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Failed to save");
      setSaving(false);
      return;
    }

    router.push("/admin/snails");
    router.refresh();
  }

  async function handleAddNote() {
    if (!newNote.trim() || !snail?.id) return;
    setAddingNote(true);
    const res = await fetch(`/api/admin/snails/${snail.id}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: newNote }),
    });
    if (res.ok) {
      const note = await res.json();
      setNotes((prev) => [note, ...prev]);
      setNewNote("");
    }
    setAddingNote(false);
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
          {error}
        </p>
      )}

      {/* Basic Info */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-5">
        <h2 className="text-sm font-semibold text-gray-900">Basic Info</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className={labelClass}>Name *</label>
            <input
              required
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Chapter *</label>
            <select
              required
              value={form.chapterId}
              onChange={(e) => update("chapterId", e.target.value)}
              className={`${inputClass} bg-white`}
            >
              <option value="">Select chapter...</option>
              {chapters.map((ch) => (
                <option key={ch.id} value={ch.id}>
                  {ch.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass}>Category</label>
            <select
              value={form.categoryId}
              onChange={(e) => update("categoryId", e.target.value)}
              className={`${inputClass} bg-white`}
            >
              <option value="">Select category...</option>
              {categories
                .filter((cat) => !cat.parentId)
                .map((parent) => {
                  const children = categories.filter(
                    (c) => c.parentId === parent.id
                  );
                  return (
                    <optgroup key={parent.id} label={parent.name}>
                      {children.map((child) => (
                        <option key={child.id} value={child.id}>
                          {child.name}
                        </option>
                      ))}
                    </optgroup>
                  );
                })}
            </select>
          </div>

          <div>
            <label className={labelClass}>Establishment Type<br /><span className="text-gray-400 font-normal text-xs">DEPRECATED (SFNYC Legacy)</span></label>
            <input
              value={form.establishmentType}
              onChange={(e) => update("establishmentType", e.target.value)}
              className={`${inputClass} text-gray-400`}
            />
          </div>

          <div className="sm:col-span-2">
            <label className={labelClass}>Description</label>
            <textarea
              rows={4}
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
              className={inputClass}
            />
          </div>
        </div>
      </div>

      {/* CRM Pipeline */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-5">
        <h2 className="text-sm font-semibold text-gray-900">CRM Status</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass}>Track</label>
            <select
              value={form.track}
              onChange={(e) => {
                const newTrack = e.target.value;
                update("track", newTrack);
                // Reset stage to appropriate default when track changes
                if (newTrack === "lead") {
                  update("stage", form.formerAwardee ? "Lapsed" : "New");
                } else {
                  update("stage", "Onboarding");
                }
              }}
              className={`${inputClass} bg-white`}
            >
              <option value="lead">Lead</option>
              <option value="active">Active</option>
            </select>
          </div>

          <div>
            <label className={labelClass}>Stage</label>
            <select
              value={form.stage}
              onChange={(e) => {
                const newStage = e.target.value;
                update("stage", newStage);
                const warnings = validateStageChange(newStage, {
                  attachments: attachments.map((a) => ({
                    category: a.category,
                  })),
                });
                setStageWarnings(warnings);
              }}
              className={`${inputClass} bg-white`}
            >
              {form.track === "lead" ? (
                <>
                  <option value="Lapsed">Lapsed</option>
                  <option value="New">New</option>
                  <option value="Contacted">Contacted</option>
                  <option value="Application Filled">Application Filled</option>
                  <option value="Site Visit Completed">Site Visit Completed</option>
                  <option value="Up for Vote">Up for Vote</option>
                  <option value="Blocked">Blocked</option>
                </>
              ) : (
                <>
                  <option value="Onboarding">Onboarding</option>
                  <option value="Active">Active</option>
                  <option value="Renewal Due">Renewal Due</option>
                  <option value="Renewal Submitted">Renewal Submitted</option>
                  <option value="Blocked">Blocked</option>
                </>
              )}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.formerAwardee}
              onChange={(e) => update("formerAwardee", e.target.checked)}
              className={checkboxClass}
              id="formerAwardee"
            />
            <label htmlFor="formerAwardee" className="text-sm text-gray-700">
              Former Awardee
            </label>
          </div>

          <div>
            <label className={labelClass}>Business Status</label>
            <select
              value={form.businessStatus}
              onChange={(e) => update("businessStatus", e.target.value)}
              className={`${inputClass} bg-white`}
            >
              <option value="">Select...</option>
              <option value="Confirmed - In Business">Confirmed - In Business</option>
              <option value="TBC">TBC</option>
            </select>
          </div>

          <div>
            <label className={labelClass}>Year (First) Awarded</label>
            <input
              type="number"
              value={form.yearAwarded}
              onChange={(e) => update("yearAwarded", e.target.value)}
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Renewal Due Year</label>
            <input
              type="number"
              value={form.renewalDueYear}
              onChange={(e) => update("renewalDueYear", e.target.value)}
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Source</label>
            <input
              value={form.source}
              onChange={(e) => update("source", e.target.value)}
              className={inputClass}
            />
          </div>

          {form.stage === "Blocked" && (
            <div>
              <label className={labelClass}>Blocked/Rejected Reason</label>
              <input
                value={form.blockedReason}
                onChange={(e) => update("blockedReason", e.target.value)}
                className={inputClass}
              />
            </div>
          )}
        </div>
      </div>

      {/* Contact */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-5">
        <h2 className="text-sm font-semibold text-gray-900">Contact & Links</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className={labelClass}>Contact Name</label>
            <input
              value={form.contactName}
              onChange={(e) => update("contactName", e.target.value)}
              placeholder="Person at the establishment"
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Phone</label>
            <input
              value={form.phone}
              onChange={(e) => update("phone", e.target.value)}
              className={inputClass}
            />
          </div>

          <div className="sm:col-span-2">
            <label className={labelClass}>Website</label>
            <input
              type="url"
              value={form.website}
              onChange={(e) => update("website", e.target.value)}
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Facebook URL</label>
            <input
              type="url"
              value={form.facebookUrl}
              onChange={(e) => update("facebookUrl", e.target.value)}
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Instagram URL</label>
            <input
              type="url"
              value={form.instagramUrl}
              onChange={(e) => update("instagramUrl", e.target.value)}
              className={inputClass}
            />
          </div>
        </div>
      </div>

      {/* Location */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-5">
        <h2 className="text-sm font-semibold text-gray-900">Location</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className={labelClass}>Address</label>
            <AddressAutocomplete
              value={form.address}
              onChange={(address, lat, lon) => {
                update("address", address);
                if (lat && lon) {
                  update("latitude", lat);
                  update("longitude", lon);
                }
              }}
              placeholder="Start typing to search..."
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Borough</label>
            <select
              value={form.borough}
              onChange={(e) => update("borough", e.target.value)}
              className={`${inputClass} bg-white`}
            >
              <option value="">Select...</option>
              <option value="Manhattan">Manhattan</option>
              <option value="Brooklyn">Brooklyn</option>
              <option value="Queens">Queens</option>
              <option value="The Bronx">The Bronx</option>
              <option value="Staten Island">Staten Island</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div>
            <label className={labelClass}>ZIP</label>
            <input
              value={form.zip}
              onChange={(e) => update("zip", e.target.value)}
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Latitude</label>
            <input
              value={form.latitude}
              onChange={(e) => update("latitude", e.target.value)}
              placeholder="Auto-filled from address"
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Longitude</label>
            <input
              value={form.longitude}
              onChange={(e) => update("longitude", e.target.value)}
              placeholder="Auto-filled from address"
              className={inputClass}
            />
          </div>
        </div>
      </div>

      {/* Map & Visibility */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-5">
        <h2 className="text-sm font-semibold text-gray-900">Map & Visibility</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass}>SFNYC Map Status</label>
            <select
              value={form.status}
              onChange={(e) => update("status", e.target.value)}
              className={`${inputClass} bg-white`}
            >
              <option value="draft">Draft (hidden)</option>
              <option value="published">Published (visible)</option>
            </select>
          </div>

          <div className="flex items-center gap-2 self-end pb-2">
            <input
              type="checkbox"
              checked={form.onSfusaMap}
              onChange={(e) => update("onSfusaMap", e.target.checked)}
              className={checkboxClass}
              id="onSfusaMap"
            />
            <label htmlFor="onSfusaMap" className="text-sm text-gray-700">
              On SFUSA Map
            </label>
          </div>
        </div>
      </div>

      {/* Tracking */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-5">
        <h2 className="text-sm font-semibold text-gray-900">Tracking</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass}>Assignee</label>
            <select
              value={form.assigneeId}
              onChange={(e) => update("assigneeId", e.target.value)}
              className={`${inputClass} bg-white`}
            >
              <option value="">Unassigned</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass}>Last Touch Date</label>
            <input
              type="date"
              value={form.lastTouchDate}
              onChange={(e) => update("lastTouchDate", e.target.value)}
              className={inputClass}
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.welcomeLetterSent}
              onChange={(e) => update("welcomeLetterSent", e.target.checked)}
              className={checkboxClass}
              id="welcomeLetterSent"
            />
            <label htmlFor="welcomeLetterSent" className="text-sm text-gray-700">
              Welcome Letter Sent
            </label>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.stickersDelivered}
              onChange={(e) => update("stickersDelivered", e.target.checked)}
              className={checkboxClass}
              id="stickersDelivered"
            />
            <label htmlFor="stickersDelivered" className="text-sm text-gray-700">
              SOA Stickers Delivered
            </label>
          </div>

          <div className="sm:col-span-2">
            <label className={labelClass}>Diversity / Ownership</label>
            <input
              value={form.diversityTags}
              onChange={(e) => update("diversityTags", e.target.value)}
              placeholder="e.g., Woman, BIPOC, LGBTQIA2S+"
              className={inputClass}
            />
          </div>
        </div>
      </div>

      {/* Stage warnings */}
      {stageWarnings.length > 0 && stageWarnings.some((w) => !w.met) && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-sm font-medium text-amber-800 mb-2">
            Missing requirements for this stage:
          </p>
          <ul className="space-y-1">
            {stageWarnings
              .filter((w) => !w.met)
              .map((w) => (
                <li
                  key={w.label}
                  className="text-sm text-amber-700 flex items-center gap-2"
                >
                  <span className="text-amber-400">&#x26A0;</span>
                  {w.label}
                </li>
              ))}
          </ul>
        </div>
      )}

      {/* Attachments (only show on edit) */}
      {isEdit && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-5">
          <h2 className="text-sm font-semibold text-gray-900">Attachments</h2>
          <FileUpload
            snailId={snail!.id!}
            category="application"
            label="Application"
            attachments={attachments.filter((a) => a.category === "application")}
            onUpload={(a) => setAttachments((prev) => [a, ...prev])}
            onDelete={(id) =>
              setAttachments((prev) => prev.filter((a) => a.id !== id))
            }
          />
          <FileUpload
            snailId={snail!.id!}
            category="site-visit-report"
            label="Site Visit Report"
            attachments={attachments.filter(
              (a) => a.category === "site-visit-report"
            )}
            onUpload={(a) => setAttachments((prev) => [a, ...prev])}
            onDelete={(id) =>
              setAttachments((prev) => prev.filter((a) => a.id !== id))
            }
          />
        </div>
      )}

      {/* Notes (only show on edit) */}
      {isEdit && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-5">
          <h2 className="text-sm font-semibold text-gray-900">Notes</h2>

          <div className="flex gap-2">
            <textarea
              rows={2}
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="Add a note..."
              className={`${inputClass} flex-1`}
            />
            <button
              type="button"
              onClick={handleAddNote}
              disabled={addingNote || !newNote.trim()}
              className="self-end bg-amber-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-amber-800 disabled:opacity-50 transition-colors"
            >
              {addingNote ? "Adding..." : "Add"}
            </button>
          </div>

          {notes.length > 0 && (
            <div className="space-y-3 mt-4">
              {notes.map((note) => (
                <div
                  key={note.id}
                  className="border border-gray-100 rounded-lg p-3"
                >
                  <p className="text-sm text-gray-900 whitespace-pre-line">
                    {note.content}
                  </p>
                  <p className="text-xs text-gray-500 mt-2">
                    {note.author.name} &middot;{" "}
                    {new Date(note.createdAt).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={saving}
          className="bg-amber-700 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-amber-800 transition-colors disabled:opacity-50 shadow-sm"
        >
          {saving ? "Saving..." : isEdit ? "Update Snail" : "Create Snail"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/admin/snails")}
          className="border border-gray-300 px-5 py-2.5 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
