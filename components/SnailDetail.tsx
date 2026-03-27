"use client";

import { useState, useEffect } from "react";
import PipelineProgress from "./PipelineProgress";
import DetailSection, { type EditFormProps } from "./DetailSection";
import FileUpload from "./FileUpload";
import AddressAutocomplete from "./AddressAutocomplete";
import EmailList from "./gmail/EmailList";
import ComposeEmail from "./gmail/ComposeEmail";
import { attachmentConfig } from "@/lib/attachment-config";
import {
  diversityTags as diversityTagConfig,
  parseDiversityTags,
  getDiversityLabel,
  serializeDiversityTags,
} from "@/lib/diversity-tags";

/* ── shared types ── */

type SnailData = Record<string, unknown> & {
  id: number;
  name: string;
  track: string;
  stage: string | null;
  formerAwardee: boolean;
  chapter: { name: string };
  category: { name: string; parent: { name: string } | null } | null;
  assignee: { name: string } | null;
  notes: {
    id: number;
    content: string;
    createdAt: string;
    author: { name: string };
  }[];
  attachments: {
    id: number;
    fileName: string;
    fileUrl: string;
    fileType: string;
    fileSize: number;
    category: string;
    createdAt: string;
    uploadedBy: { name: string };
  }[];
};

type Chapter = { id: number; name: string };
type Category = { id: number; name: string; parentId: number | null };
type UserOption = { id: number; name: string };

/* ── shared styles ── */

const inputClass =
  "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none";
const labelClass = "block text-sm font-medium text-gray-700 mb-1";
const checkboxClass =
  "h-4 w-4 rounded border-gray-300 text-amber-700 focus:ring-amber-500";

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-gray-500">{label}</dt>
      <dd className="text-sm text-gray-900 mt-0.5">{value || "—"}</dd>
    </div>
  );
}

function SaveCancel({ onSave, onCancel, saving }: { onSave: () => void; onCancel: () => void; saving: boolean }) {
  return (
    <div className="flex gap-2 mt-4">
      <button type="button" onClick={onSave} disabled={saving} className="bg-amber-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-amber-800 disabled:opacity-50 transition-colors">
        {saving ? "Saving..." : "Save"}
      </button>
      <button type="button" onClick={onCancel} className="border border-gray-300 px-4 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors">
        Cancel
      </button>
    </div>
  );
}

/* ── edit form components (each is a proper component so hooks are safe) ── */

function InfoEditForm({ onSave, onCancel, saving, snail, chapters, categories }: EditFormProps & { snail: SnailData; chapters: Chapter[]; categories: Category[] }) {
  const [f, setF] = useState({
    name: snail.name,
    chapterId: String(snail.chapterId as number),
    categoryId: snail.categoryId ? String(snail.categoryId) : "",
    establishmentType: (snail.establishmentType as string) || "",
    diversityTags: (snail.diversityTags as string) || "",
    description: (snail.description as string) || "",
  });
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2"><label className={labelClass}>Name *</label><input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} className={inputClass} /></div>
        <div>
          <label className={labelClass}>Chapter</label>
          <select value={f.chapterId} onChange={(e) => setF({ ...f, chapterId: e.target.value })} className={`${inputClass} bg-white`}>
            {chapters.map((ch) => (<option key={ch.id} value={ch.id}>{ch.name}</option>))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Category</label>
          <select value={f.categoryId} onChange={(e) => setF({ ...f, categoryId: e.target.value })} className={`${inputClass} bg-white`}>
            <option value="">Select...</option>
            {categories.filter((c) => !c.parentId).map((parent) => (
              <optgroup key={parent.id} label={parent.name}>
                {categories.filter((c) => c.parentId === parent.id).map((child) => (
                  <option key={child.id} value={child.id}>{child.name}</option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className={labelClass}>Diversity / Ownership</label>
          <div className="flex flex-wrap gap-3 mt-1">
            {diversityTagConfig.map((tag) => {
              const sel = parseDiversityTags(f.diversityTags);
              return (
                <label key={tag.slug} className="flex items-center gap-1.5 text-sm text-gray-700">
                  <input type="checkbox" checked={sel.includes(tag.slug)} onChange={(e) => { const next = e.target.checked ? [...sel, tag.slug] : sel.filter((s) => s !== tag.slug); setF({ ...f, diversityTags: serializeDiversityTags(next) || "" }); }} className={checkboxClass} />
                  {tag.label}
                </label>
              );
            })}
          </div>
        </div>
        <div className="sm:col-span-2"><label className={labelClass}>Description</label><textarea rows={3} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} className={inputClass} /></div>
      </div>
      <SaveCancel onSave={() => onSave(f)} onCancel={onCancel} saving={saving} />
    </div>
  );
}

function PipelineEditForm({ onSave, onCancel, saving, snail }: EditFormProps & { snail: SnailData }) {
  const [f, setF] = useState({
    track: snail.track,
    stage: snail.stage || "",
    blockedReason: (snail.blockedReason as string) || "",
  });
  const leadStages = ["Lapsed", "New", "Contacted", "Applied", "Visited", "Voted", "Blocked"];
  const activeStages = ["Onboarding", "Active", "Renewal Due", "Renewal Submitted", "Blocked"];
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div><label className={labelClass}>Track</label><select value={f.track} onChange={(e) => setF({ ...f, track: e.target.value, stage: e.target.value === "lead" ? "New" : "Onboarding" })} className={`${inputClass} bg-white`}><option value="lead">Lead</option><option value="active">Active</option></select></div>
        <div><label className={labelClass}>Stage</label><select value={f.stage} onChange={(e) => setF({ ...f, stage: e.target.value })} className={`${inputClass} bg-white`}>{(f.track === "lead" ? leadStages : activeStages).map((s) => (<option key={s} value={s}>{s}</option>))}</select></div>
        {f.stage === "Blocked" && <div className="sm:col-span-2"><label className={labelClass}>Blocked Reason</label><input value={f.blockedReason} onChange={(e) => setF({ ...f, blockedReason: e.target.value })} className={inputClass} /></div>}
      </div>
      <SaveCancel onSave={() => onSave(f)} onCancel={onCancel} saving={saving} />
    </div>
  );
}

function HistoryEditForm({ onSave, onCancel, saving, snail }: EditFormProps & { snail: SnailData }) {
  const [f, setF] = useState({
    formerAwardee: snail.formerAwardee,
    yearAwarded: snail.yearAwarded != null ? String(snail.yearAwarded) : "",
    source: (snail.source as string) || "",
    businessStatus: (snail.businessStatus as string) || "",
  });
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex items-center gap-2"><input type="checkbox" checked={f.formerAwardee} onChange={(e) => setF({ ...f, formerAwardee: e.target.checked })} className={checkboxClass} id="fa-edit" /><label htmlFor="fa-edit" className="text-sm text-gray-700">Former Awardee</label></div>
        {f.formerAwardee && <div><label className={labelClass}>Year (First) Awarded</label><input type="number" value={f.yearAwarded} onChange={(e) => setF({ ...f, yearAwarded: e.target.value })} className={inputClass} /></div>}
        <div><label className={labelClass}>Source</label><input value={f.source} onChange={(e) => setF({ ...f, source: e.target.value })} className={inputClass} /></div>
        <div><label className={labelClass}>Business Status</label><select value={f.businessStatus} onChange={(e) => setF({ ...f, businessStatus: e.target.value })} className={`${inputClass} bg-white`}><option value="">Select...</option><option value="Confirmed - In Business">Confirmed - In Business</option><option value="TBC">TBC</option></select></div>
      </div>
      <SaveCancel onSave={() => onSave(f)} onCancel={onCancel} saving={saving} />
    </div>
  );
}

function ContactEditForm({ onSave, onCancel, saving, snail }: EditFormProps & { snail: SnailData }) {
  const [f, setF] = useState({
    contactName: (snail.contactName as string) || "",
    email: (snail.email as string) || "",
    phone: (snail.phone as string) || "",
    website: (snail.website as string) || "",
    facebookUrl: (snail.facebookUrl as string) || "",
    instagramUrl: (snail.instagramUrl as string) || "",
  });
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2"><label className={labelClass}>Contact Name</label><input value={f.contactName} onChange={(e) => setF({ ...f, contactName: e.target.value })} className={inputClass} /></div>
        <div><label className={labelClass}>Email</label><input type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} className={inputClass} /></div>
        <div><label className={labelClass}>Phone</label><input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} className={inputClass} /></div>
        <div className="sm:col-span-2"><label className={labelClass}>Website</label><input type="url" value={f.website} onChange={(e) => setF({ ...f, website: e.target.value })} className={inputClass} /></div>
        <div><label className={labelClass}>Facebook</label><input type="url" value={f.facebookUrl} onChange={(e) => setF({ ...f, facebookUrl: e.target.value })} className={inputClass} /></div>
        <div><label className={labelClass}>Instagram</label><input type="url" value={f.instagramUrl} onChange={(e) => setF({ ...f, instagramUrl: e.target.value })} className={inputClass} /></div>
      </div>
      <SaveCancel onSave={() => onSave(f)} onCancel={onCancel} saving={saving} />
    </div>
  );
}

function LocationEditForm({ onSave, onCancel, saving, snail }: EditFormProps & { snail: SnailData }) {
  const [f, setF] = useState({
    address: (snail.address as string) || "",
    borough: (snail.borough as string) || "",
    zip: (snail.zip as string) || "",
    latitude: snail.latitude ? String(snail.latitude) : "",
    longitude: snail.longitude ? String(snail.longitude) : "",
  });
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2"><label className={labelClass}>Address</label><AddressAutocomplete value={f.address} onChange={(addr, lat, lon) => setF({ ...f, address: addr, ...(lat && lon ? { latitude: lat, longitude: lon } : {}) })} className={inputClass} placeholder="Start typing to search..." /></div>
        <div><label className={labelClass}>Borough</label><select value={f.borough} onChange={(e) => setF({ ...f, borough: e.target.value })} className={`${inputClass} bg-white`}><option value="">Select...</option><option value="Manhattan">Manhattan</option><option value="Brooklyn">Brooklyn</option><option value="Queens">Queens</option><option value="The Bronx">The Bronx</option><option value="Staten Island">Staten Island</option><option value="Other">Other</option></select></div>
        <div><label className={labelClass}>ZIP</label><input value={f.zip} onChange={(e) => setF({ ...f, zip: e.target.value })} className={inputClass} /></div>
        <div><label className={labelClass}>Latitude</label><input value={f.latitude} onChange={(e) => setF({ ...f, latitude: e.target.value })} className={inputClass} /></div>
        <div><label className={labelClass}>Longitude</label><input value={f.longitude} onChange={(e) => setF({ ...f, longitude: e.target.value })} className={inputClass} /></div>
      </div>
      <SaveCancel onSave={() => onSave(f)} onCancel={onCancel} saving={saving} />
    </div>
  );
}

function MapEditForm({ onSave, onCancel, saving, snail }: EditFormProps & { snail: SnailData }) {
  const [f, setF] = useState({
    status: (snail.status as string) || "draft",
    onSfusaMap: snail.onSfusaMap as boolean,
  });
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div><label className={labelClass}>SFNYC Map Status</label><select value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })} className={`${inputClass} bg-white`}><option value="draft">Draft (hidden)</option><option value="published">Published (visible)</option></select></div>
        <div className="flex items-center gap-2 self-end pb-2"><input type="checkbox" checked={f.onSfusaMap} onChange={(e) => setF({ ...f, onSfusaMap: e.target.checked })} className={checkboxClass} id="sfusa-edit" /><label htmlFor="sfusa-edit" className="text-sm text-gray-700">On SFUSA Map</label></div>
      </div>
      <SaveCancel onSave={() => onSave(f)} onCancel={onCancel} saving={saving} />
    </div>
  );
}

function TrackingEditForm({ onSave, onCancel, saving, snail, users }: EditFormProps & { snail: SnailData; users: UserOption[] }) {
  const [f, setF] = useState({
    assigneeId: snail.assigneeId ? String(snail.assigneeId) : "",
    lastTouchDate: snail.lastTouchDate ? new Date(snail.lastTouchDate as string).toISOString().split("T")[0] : "",
    renewalDueYear: snail.renewalDueYear != null ? String(snail.renewalDueYear) : "",
    welcomeLetterSent: snail.welcomeLetterSent as boolean,
    stickersDelivered: snail.stickersDelivered as boolean,
  });
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div><label className={labelClass}>Assignee</label><select value={f.assigneeId} onChange={(e) => setF({ ...f, assigneeId: e.target.value })} className={`${inputClass} bg-white`}><option value="">Unassigned</option>{users.map((u) => (<option key={u.id} value={u.id}>{u.name}</option>))}</select></div>
        <div><label className={labelClass}>Last Touch Date</label><input type="date" value={f.lastTouchDate} onChange={(e) => setF({ ...f, lastTouchDate: e.target.value })} className={inputClass} /></div>
        <div><label className={labelClass}>Renewal Due Year</label><input type="number" value={f.renewalDueYear} onChange={(e) => setF({ ...f, renewalDueYear: e.target.value })} className={inputClass} /></div>
        <div className="flex items-center gap-2"><input type="checkbox" checked={f.welcomeLetterSent} onChange={(e) => setF({ ...f, welcomeLetterSent: e.target.checked })} className={checkboxClass} id="wl-edit" /><label htmlFor="wl-edit" className="text-sm text-gray-700">Welcome Letter Sent</label></div>
        <div className="flex items-center gap-2"><input type="checkbox" checked={f.stickersDelivered} onChange={(e) => setF({ ...f, stickersDelivered: e.target.checked })} className={checkboxClass} id="sd-edit" /><label htmlFor="sd-edit" className="text-sm text-gray-700">Stickers Delivered</label></div>
      </div>
      <SaveCancel onSave={() => onSave(f)} onCancel={onCancel} saving={saving} />
    </div>
  );
}

/* ── main detail component ── */

export default function SnailDetail({ snail }: { snail: SnailData }) {
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [notes, setNotes] = useState(snail.notes);
  const [attachments, setAttachments] = useState(snail.attachments);
  const [newNote, setNewNote] = useState("");
  const [addingNote, setAddingNote] = useState(false);
  const [showCompose, setShowCompose] = useState(false);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/chapters"),
      fetch("/api/categories"),
      fetch("/api/admin/users/list"),
    ]).then(async ([chRes, catRes, uRes]) => {
      setChapters(await chRes.json());
      setCategories(await catRes.json());
      if (uRes.ok) setUsers(await uRes.json());
    });
  }, []);

  async function handleAddNote() {
    if (!newNote.trim()) return;
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

  const diversitySlugs = parseDiversityTags(snail.diversityTags as string | null);

  return (
    <div className="max-w-2xl space-y-3">
      <PipelineProgress
        track={snail.track}
        currentStage={snail.stage || ""}
        attachments={attachments.map((a) => ({ category: a.category }))}
        snailId={snail.id}
        onStageChange={() => window.location.reload()}
      />

      {/* Info */}
      <DetailSection
        title="Info"
        snailId={snail.id}
        EditForm={(props) => <InfoEditForm {...props} snail={snail} chapters={chapters} categories={categories} />}
      >
        <dl className="grid gap-2 sm:grid-cols-2">
          <Field label="Name" value={snail.name} />
          <Field label="Chapter" value={snail.chapter.name} />
          <Field label="Category" value={snail.category ? `${snail.category.parent?.name || ""} > ${snail.category.name}`.replace(/^ > /, "") : null} />
          <Field label="Establishment Type" value={<span className="text-gray-400">{(snail.establishmentType as string) || "—"}</span>} />
          {diversitySlugs.length > 0 && <Field label="Diversity / Ownership" value={diversitySlugs.map(getDiversityLabel).join(", ")} />}
          {(snail.description as string) ? <div className="sm:col-span-2"><Field label="Description" value={snail.description as string} /></div> : null}
        </dl>
      </DetailSection>

      {/* Pipeline */}
      <DetailSection title="Pipeline" snailId={snail.id} EditForm={(props) => <PipelineEditForm {...props} snail={snail} />}>
        <dl className="grid gap-2 sm:grid-cols-2">
          <Field label="Track" value={<span className="capitalize">{snail.track}</span>} />
          <Field label="Stage" value={snail.stage} />
          {snail.stage === "Blocked" && <Field label="Blocked Reason" value={snail.blockedReason as string} />}
        </dl>
      </DetailSection>

      {/* History */}
      <DetailSection title="History" snailId={snail.id} EditForm={(props) => <HistoryEditForm {...props} snail={snail} />}>
        <dl className="grid gap-2 sm:grid-cols-2">
          {snail.formerAwardee && <><Field label="Former Awardee" value="Yes" />{snail.yearAwarded && <Field label="Year (First) Awarded" value={String(snail.yearAwarded)} />}</>}
          <Field label="Source" value={snail.source as string} />
          <Field label="Business Status" value={snail.businessStatus as string} />
        </dl>
      </DetailSection>

      {/* Contact & Links */}
      <DetailSection title="Contact & Links" snailId={snail.id} EditForm={(props) => <ContactEditForm {...props} snail={snail} />}>
        <dl className="grid gap-2 sm:grid-cols-2">
          <Field label="Contact" value={snail.contactName as string} />
          <Field label="Email" value={snail.email ? <a href={`mailto:${snail.email}`} className="text-amber-700 hover:text-amber-800">{snail.email as string}</a> : null} />
          <Field label="Phone" value={snail.phone as string} />
          <Field label="Website" value={snail.website ? <a href={snail.website as string} target="_blank" rel="noopener noreferrer" className="text-amber-700 hover:text-amber-800 truncate block">{(snail.website as string).replace(/^https?:\/\//, "")}</a> : null} />
        </dl>
      </DetailSection>

      {/* Location */}
      <DetailSection title="Location" snailId={snail.id} EditForm={(props) => <LocationEditForm {...props} snail={snail} />}>
        <dl className="grid gap-2 sm:grid-cols-2">
          <Field label="Address" value={snail.address as string} />
          <Field label="Borough" value={snail.borough as string} />
          <Field label="ZIP" value={snail.zip as string} />
          {snail.latitude ? <Field label="Coordinates" value={`${snail.latitude}, ${snail.longitude}`} /> : null}
        </dl>
      </DetailSection>

      {/* Map & Visibility */}
      <DetailSection title="Map & Visibility" snailId={snail.id} EditForm={(props) => <MapEditForm {...props} snail={snail} />}>
        <dl className="grid gap-2 sm:grid-cols-2">
          <Field label="SFNYC Map" value={<span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${snail.status === "published" ? "bg-green-50 text-green-700 ring-1 ring-green-600/20" : "bg-gray-100 text-gray-600"}`}>{snail.status === "published" ? "Published" : "Draft"}</span>} />
          <Field label="SFUSA Map" value={snail.onSfusaMap ? "Yes" : "No"} />
        </dl>
      </DetailSection>

      {/* Tracking */}
      <DetailSection title="Tracking" snailId={snail.id} EditForm={(props) => <TrackingEditForm {...props} snail={snail} users={users} />}>
        <dl className="grid gap-2 sm:grid-cols-2">
          <Field label="Assignee" value={snail.assignee?.name} />
          <Field label="Last Touch" value={snail.lastTouchDate ? new Date(snail.lastTouchDate as string).toLocaleDateString() : null} />
          <Field label="Renewal Due Year" value={snail.renewalDueYear ? String(snail.renewalDueYear) : null} />
          <Field label="Welcome Letter" value={(snail.welcomeLetterSent as boolean) ? "Sent" : "Not sent"} />
          <Field label="Stickers" value={(snail.stickersDelivered as boolean) ? "Delivered" : "Not delivered"} />
        </dl>
      </DetailSection>

      {/* Attachments */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 space-y-4">
        <h2 className="text-sm font-semibold text-gray-900">Attachments</h2>
        {Object.entries(attachmentConfig).map(([category, config]) => (
          <FileUpload key={category} snailId={snail.id} category={category} label={config.label} maxCount={config.maxCount} attachments={attachments.filter((a) => a.category === category)} onUpload={(a) => setAttachments((prev) => [a, ...prev])} onDelete={(id) => setAttachments((prev) => prev.filter((a) => a.id !== id))} />
        ))}
      </div>

      {/* Notes */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 space-y-4">
        <h2 className="text-sm font-semibold text-gray-900">Notes</h2>
        <div className="flex gap-2">
          <textarea rows={2} value={newNote} onChange={(e) => setNewNote(e.target.value)} placeholder="Add a note..." className={`${inputClass} flex-1`} />
          <button type="button" onClick={handleAddNote} disabled={addingNote || !newNote.trim()} className="self-end bg-amber-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-amber-800 disabled:opacity-50 transition-colors">
            {addingNote ? "Adding..." : "Add"}
          </button>
        </div>
        {notes.length > 0 && (
          <div className="space-y-3">
            {notes.map((note) => (
              <div key={note.id} className="border border-gray-100 rounded-lg p-3">
                <p className="text-sm text-gray-900 whitespace-pre-line">{note.content}</p>
                <p className="text-xs text-gray-500 mt-2">{note.author.name} &middot; {new Date(note.createdAt).toLocaleDateString()}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Emails */}
      {snail.email && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900">Emails</h2>
            <button
              type="button"
              onClick={() => { setShowCompose(true); setSelectedThreadId(null); }}
              className="text-amber-700 hover:text-amber-800 text-sm font-medium"
            >
              + New Email
            </button>
          </div>
          {showCompose && !selectedThreadId && (
            <ComposeEmail
              chapterId={snail.chapterId as number}
              defaultTo={snail.email as string}
              onSent={() => setShowCompose(false)}
              onCancel={() => setShowCompose(false)}
            />
          )}
          <EmailList
            chapterId={snail.chapterId as number}
            snailId={snail.id}
            compact
            onSelectThread={(threadId) => setSelectedThreadId(threadId)}
            selectedThreadId={selectedThreadId || undefined}
          />
        </div>
      )}
    </div>
  );
}
