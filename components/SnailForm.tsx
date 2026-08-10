"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import AddressAutocomplete from "./AddressAutocomplete";
import FileUpload from "./FileUpload";
import { validateStageChange } from "@/lib/stage-requirements";
import { attachmentConfig } from "@/lib/attachment-config";
import { diversityTags, parseDiversityTags, serializeDiversityTags } from "@/lib/diversity-tags";
import { contactRoles } from "@/lib/contact-roles";
import { businessStatuses } from "@/lib/business-status";
import { locationKinds, boroughs } from "@/lib/location-kinds";
import PipelineProgress from "./PipelineProgress";

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

type ContactInput = {
  name: string;
  role: string;
  email: string;
  phone: string;
  phoneVanity: string;
  isPublic: boolean;
  isPrimary: boolean;
};

type LocationInput = {
  label: string;
  kind: string;
  address: string;
  city: string;
  state: string;
  borough: string;
  zip: string;
  latitude: string;
  longitude: string;
  isPublic: boolean;
  isPrimary: boolean;
};

type SnailData = {
  id?: number;
  name: string;
  yearAwarded: number | string;
  description: string;
  contacts: ContactInput[];
  locations: LocationInput[];
  website: string;
  facebookUrl: string;
  instagramUrl: string;
  otherSocial: string;
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
  onSfusaMap: boolean;

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
  contacts: [],
  locations: [],
  website: "",
  facebookUrl: "",
  instagramUrl: "",
  otherSocial: "",
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
  onSfusaMap: false,

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

export default function SnailForm({
  snail,
  userRole,
  userId,
}: {
  snail?: SnailData;
  userRole?: string;
  userId?: string;
}) {
  const router = useRouter();
  const isAdmin = userRole === "admin";
  const defaults = snail || {
    ...emptySnail,
    assigneeId: userId || "",
  };
  const [form, setForm] = useState<SnailData>(defaults);
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

  function addContact() {
    setForm((prev) => ({
      ...prev,
      contacts: [
        ...prev.contacts,
        // The first contact added is the main one by default.
        { name: "", role: "general", email: "", phone: "", phoneVanity: "", isPublic: false, isPrimary: prev.contacts.length === 0 },
      ],
    }));
  }

  function updateContact(index: number, field: keyof ContactInput, value: string | boolean) {
    setForm((prev) => ({
      ...prev,
      contacts: prev.contacts.map((c, i) =>
        // Only one contact can be the main one.
        field === "isPrimary" && value === true
          ? { ...c, isPrimary: i === index }
          : i === index
            ? { ...c, [field]: value }
            : c
      ),
    }));
  }

  function removeContact(index: number) {
    setForm((prev) => {
      const contacts = prev.contacts.filter((_, i) => i !== index);
      // Dropping the main contact hands the role to the first one left.
      if (contacts.length && !contacts.some((c) => c.isPrimary)) {
        contacts[0] = { ...contacts[0], isPrimary: true };
      }
      return { ...prev, contacts };
    });
  }

  function addLocation() {
    setForm((prev) => ({
      ...prev,
      locations: [
        ...prev.locations,
        {
          label: "",
          kind: "storefront",
          address: "",
          city: "",
          state: "",
          borough: "",
          zip: "",
          latitude: "",
          longitude: "",
          isPublic: true,
          // The first location added is the main one by default.
          isPrimary: prev.locations.length === 0,
        },
      ],
    }));
  }

  function updateLocation(
    index: number,
    field: keyof LocationInput,
    value: string | boolean
  ) {
    setForm((prev) => ({
      ...prev,
      locations: prev.locations.map((l, i) =>
        // Only one location can be the main one.
        field === "isPrimary" && value === true
          ? { ...l, isPrimary: i === index }
          : i === index
            ? { ...l, [field]: value }
            : l
      ),
    }));
  }

  function removeLocation(index: number) {
    setForm((prev) => {
      const locations = prev.locations.filter((_, i) => i !== index);
      // Dropping the main location hands the role to the first one left.
      if (locations.length && !locations.some((l) => l.isPrimary)) {
        locations[0] = { ...locations[0], isPrimary: true };
      }
      return { ...prev, locations };
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Mirrors the check in POST /api/admin/snails: a snail needs someone to talk
    // to and somewhere to point at.
    const missing = [
      !form.contacts.some((c) => c.name.trim()) ? "one contact" : null,
      !form.locations.some((l) => l.address.trim()) ? "one location" : null,
    ].filter(Boolean);
    if (missing.length) {
      setError(`A snail needs at least ${missing.join(" and ")}.`);
      return;
    }

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
      {/* Pipeline Progress (only on edit) */}
      {isEdit && (
        <PipelineProgress
          track={form.track}
          currentStage={form.stage}
          attachments={attachments.map((a) => ({ category: a.category }))}
        />
      )}

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
          {error}
        </p>
      )}

      {/* Basic Info */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-5">
        <h2 className="text-sm font-semibold text-gray-900">Info</h2>
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

          <div className="sm:col-span-2">
            <label className={labelClass}>Diversity / Ownership</label>
            <div className="flex flex-wrap gap-3 mt-1">
              {diversityTags.map((tag) => {
                const selected = parseDiversityTags(form.diversityTags);
                const isChecked = selected.includes(tag.slug);
                return (
                  <label
                    key={tag.slug}
                    className="flex items-center gap-1.5 text-sm text-gray-700"
                    title={tag.description}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={(e) => {
                        const next = e.target.checked
                          ? [...selected, tag.slug]
                          : selected.filter((s) => s !== tag.slug);
                        update("diversityTags", serializeDiversityTags(next) || "");
                      }}
                      className={checkboxClass}
                    />
                    {tag.label}
                  </label>
                );
              })}
            </div>
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

      {/* Links */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-5">
        <h2 className="text-sm font-semibold text-gray-900">Links</h2>
        <div className="grid gap-4 sm:grid-cols-2">
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

          <div className="sm:col-span-2">
            <label className={labelClass}>Other Social Media</label>
            <input
              value={form.otherSocial}
              onChange={(e) => update("otherSocial", e.target.value)}
              className={inputClass}
            />
          </div>
        </div>
      </div>

      {/* Contacts */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900">Contacts *</h2>
          <button
            type="button"
            onClick={addContact}
            className="text-amber-700 hover:text-amber-800 text-sm font-medium"
          >
            + Add Contact
          </button>
        </div>

        {form.contacts.length === 0 && (
          <p className="text-sm text-gray-400">
            No contacts yet. At least one is required.
          </p>
        )}

        {form.contacts.map((contact, i) => (
          <div key={i} className="border border-gray-200 rounded-lg p-4 space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Name *</label>
                <input
                  value={contact.name}
                  onChange={(e) => updateContact(i, "name", e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Role</label>
                <select
                  value={contact.role}
                  onChange={(e) => updateContact(i, "role", e.target.value)}
                  className={`${inputClass} bg-white`}
                >
                  {contactRoles.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Email</label>
                <input
                  type="email"
                  value={contact.email}
                  onChange={(e) => updateContact(i, "email", e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Phone</label>
                <input
                  value={contact.phone}
                  onChange={(e) => updateContact(i, "phone", e.target.value)}
                  className={inputClass}
                />
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass}>
                  Vanity phone{" "}
                  <span className="text-gray-400 font-normal">
                    (if the number spells something)
                  </span>
                </label>
                <input
                  value={contact.phoneVanity}
                  onChange={(e) => updateContact(i, "phoneVanity", e.target.value)}
                  placeholder="e.g. 1-800-EAT-SLOW"
                  className={inputClass}
                />
              </div>
            </div>
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={contact.isPrimary}
                    onChange={(e) => updateContact(i, "isPrimary", e.target.checked)}
                    className={checkboxClass}
                  />
                  Main contact (business phone/email for submissions)
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={contact.isPublic}
                    onChange={(e) => updateContact(i, "isPublic", e.target.checked)}
                    className={checkboxClass}
                  />
                  Show email/phone on public page
                </label>
              </div>
              <button
                type="button"
                onClick={() => removeContact(i)}
                className="text-red-600 hover:text-red-700 text-sm font-medium self-start"
              >
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Locations */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900">Locations *</h2>
          <button
            type="button"
            onClick={addLocation}
            className="text-amber-700 hover:text-amber-800 text-sm font-medium"
          >
            + Add Location
          </button>
        </div>

        {form.locations.length === 0 && (
          <p className="text-sm text-gray-400">
            No locations yet. At least one is required.
          </p>
        )}

        {form.locations.map((location, i) => (
          <div key={i} className="border border-gray-200 rounded-lg p-4 space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className={labelClass}>Address *</label>
                <AddressAutocomplete
                  value={location.address}
                  onChange={(address, lat, lon) => {
                    updateLocation(i, "address", address);
                    if (lat && lon) {
                      updateLocation(i, "latitude", lat);
                      updateLocation(i, "longitude", lon);
                    }
                  }}
                  placeholder="Start typing to search..."
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>Type</label>
                <select
                  value={location.kind}
                  onChange={(e) => updateLocation(i, "kind", e.target.value)}
                  className={`${inputClass} bg-white`}
                >
                  {locationKinds.map((k) => (
                    <option key={k.value} value={k.value}>
                      {k.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className={labelClass}>
                  Label{" "}
                  <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <input
                  value={location.label}
                  onChange={(e) => updateLocation(i, "label", e.target.value)}
                  placeholder="e.g. Union Square stall"
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>City</label>
                <input
                  value={location.city}
                  onChange={(e) => updateLocation(i, "city", e.target.value)}
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>State</label>
                <input
                  value={location.state}
                  onChange={(e) => updateLocation(i, "state", e.target.value)}
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>Borough</label>
                <select
                  value={location.borough}
                  onChange={(e) => updateLocation(i, "borough", e.target.value)}
                  className={`${inputClass} bg-white`}
                >
                  <option value="">Select...</option>
                  {boroughs.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className={labelClass}>ZIP</label>
                <input
                  value={location.zip}
                  onChange={(e) => updateLocation(i, "zip", e.target.value)}
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>Latitude</label>
                <input
                  value={location.latitude}
                  onChange={(e) => updateLocation(i, "latitude", e.target.value)}
                  placeholder="Auto-filled from address"
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>Longitude</label>
                <input
                  value={location.longitude}
                  onChange={(e) => updateLocation(i, "longitude", e.target.value)}
                  placeholder="Auto-filled from address"
                  className={inputClass}
                />
              </div>
            </div>
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={location.isPrimary}
                    onChange={(e) => updateLocation(i, "isPrimary", e.target.checked)}
                    className={checkboxClass}
                  />
                  Main location (address used for submissions)
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={location.isPublic}
                    onChange={(e) => updateLocation(i, "isPublic", e.target.checked)}
                    className={checkboxClass}
                  />
                  Show on the public map and page
                </label>
              </div>
              <button
                type="button"
                onClick={() => removeLocation(i)}
                className="text-red-600 hover:text-red-700 text-sm font-medium self-start"
              >
                Remove
              </button>
            </div>
          </div>
        ))}
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

      {/* Pipeline */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-5">
        <h2 className="text-sm font-semibold text-gray-900">Pipeline</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass}>Track</label>
            <select
              value={form.track}
              onChange={(e) => {
                const newTrack = e.target.value;
                update("track", newTrack);
                if (newTrack === "lead") {
                  update("stage", form.formerAwardee ? "Lapsed" : "New");
                } else {
                  update("stage", "Onboarding");
                }
              }}
              className={`${inputClass} bg-white`}
            >
              <option value="lead">Lead</option>
              {isAdmin && <option value="active">Active</option>}
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
                  attachments: attachments.map((a) => ({ category: a.category })),
                });
                setStageWarnings(warnings);
              }}
              className={`${inputClass} bg-white`}
            >
              {form.track === "lead" ? (
                isAdmin ? (
                  <>
                    <option value="Lapsed">Lapsed</option>
                    <option value="New">New</option>
                    <option value="Contacted">Contacted</option>
                    <option value="Applied">Applied</option>
                    <option value="Visited">Visited</option>
                    <option value="Voted">Voted</option>
                    <option value="Blocked">Blocked</option>
                  </>
                ) : (
                  <>
                    <option value="New">New</option>
                    <option value="Applied">Applied</option>
                  </>
                )
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

          {form.stage === "Blocked" && (
            <div className="sm:col-span-2">
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

      {/* History */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-5">
        <h2 className="text-sm font-semibold text-gray-900">History</h2>
        <div className="grid gap-4 sm:grid-cols-2">
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

          {/* Always occupies the cell so toggling Former Awardee doesn't reflow the grid */}
          <div>
            {form.formerAwardee && (
              <>
                <label className={labelClass}>Year (First) Awarded</label>
                <input
                  type="number"
                  value={form.yearAwarded}
                  onChange={(e) => update("yearAwarded", e.target.value)}
                  className={inputClass}
                />
              </>
            )}
          </div>

          <div>
            <label className={labelClass}>Source</label>
            <input
              value={form.source}
              onChange={(e) => update("source", e.target.value)}
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Business Status</label>
            <select
              value={form.businessStatus}
              onChange={(e) => update("businessStatus", e.target.value)}
              className={`${inputClass} bg-white`}
            >
              <option value="">Select...</option>
              {businessStatuses.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
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

          <div>
            <label className={labelClass}>Renewal Due Year</label>
            <input
              type="number"
              value={form.renewalDueYear}
              onChange={(e) => update("renewalDueYear", e.target.value)}
              className={inputClass}
            />
          </div>

          {isEdit && (
            <>
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
            </>
          )}
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
          {Object.entries(attachmentConfig).map(([category, config]) => (
            <FileUpload
              key={category}
              snailId={snail!.id!}
              category={category}
              label={config.label}
              maxCount={config.maxCount}
              attachments={attachments.filter((a) => a.category === category)}
              onUpload={(a) => setAttachments((prev) => [a, ...prev])}
              onDelete={(id) =>
                setAttachments((prev) => prev.filter((a) => a.id !== id))
              }
            />
          ))}
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
