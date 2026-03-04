import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTheme } from "../../context/ThemeContext";
import { useToast } from "../../context/ToastContext";
import { useT } from "../../context/I18nContext";
import BottomNav from "../../components/shared/BottomNav";
import GlassAppBar from "../../components/shared/GlassAppBar";
import IconButton from "../../components/shared/IconButton";
import GlassCard from "../../components/shared/GlassCard";
import GlassModal from "../../components/shared/GlassModal";
import GlassInput from "../../components/shared/GlassInput";
import GradientButton from "../../components/shared/GradientButton";
import EmptyState from "../../components/shared/EmptyState";
import ErrorState from "../../components/shared/ErrorState";
import { SkeletonCard } from "../../components/shared/Skeleton";
import RichTextEditor from "../../components/shared/RichTextEditor";
import { apiGet, apiPost, apiPatch, apiDelete } from "../../services/api";
import { DREAMS } from "../../services/endpoints";
import {
  ArrowLeft, Plus, Edit3, Trash2, BookOpen, X,
} from "lucide-react";

/* ═══════════════════════════════════════════════════════════════════
 * DreamPlanner -- Dream Journal Screen
 * ═══════════════════════════════════════════════════════════════════ */

var MOOD_OPTIONS = [
  { key: "excited", emoji: "\uD83E\uDD29", label: "Excited" },
  { key: "happy", emoji: "\uD83D\uDE0A", label: "Happy" },
  { key: "neutral", emoji: "\uD83D\uDE10", label: "Neutral" },
  { key: "frustrated", emoji: "\uD83D\uDE24", label: "Frustrated" },
  { key: "motivated", emoji: "\uD83D\uDCAA", label: "Motivated" },
  { key: "reflective", emoji: "\uD83E\uDD14", label: "Reflective" },
];

function moodEmoji(mood) {
  var found = MOOD_OPTIONS.find(function (m) { return m.key === mood; });
  return found ? found.emoji : "";
}

/** Strip HTML tags for preview text */
function stripHtml(html) {
  if (!html) return "";
  var tmp = document.createElement("div");
  tmp.textContent = html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  return tmp.textContent.slice(0, 140);
}

function formatDate(dateStr) {
  if (!dateStr) return "";
  var d = new Date(dateStr);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export default function DreamJournal() {
  var navigate = useNavigate();
  var { id: dreamId } = useParams();
  var queryClient = useQueryClient();
  var { resolved, uiOpacity } = useTheme();
  var { showToast } = useToast();
  var { t } = useT();

  // ── State ──
  var [showEditor, setShowEditor] = useState(false);
  var [editingEntry, setEditingEntry] = useState(null); // null = create, object = edit
  var [entryTitle, setEntryTitle] = useState("");
  var [entryContent, setEntryContent] = useState("");
  var [entryMood, setEntryMood] = useState("");
  var [showDeleteConfirm, setShowDeleteConfirm] = useState(null); // entry id or null

  // ── Queries ──
  var dreamQuery = useQuery({
    queryKey: ["dream", dreamId],
    queryFn: function () { return apiGet(DREAMS.DETAIL(dreamId)); },
  });

  var journalQuery = useQuery({
    queryKey: ["journal", dreamId],
    queryFn: function () { return apiGet(DREAMS.JOURNAL.LIST + "?dream=" + dreamId); },
  });

  var entries = (journalQuery.data && journalQuery.data.results) || journalQuery.data || [];

  // ── Mutations ──
  var createMut = useMutation({
    mutationFn: function (data) { return apiPost(DREAMS.JOURNAL.LIST, data); },
    onSuccess: function () {
      queryClient.invalidateQueries({ queryKey: ["journal", dreamId] });
      showToast("Journal entry saved", "success");
      closeEditor();
    },
    onError: function (err) { showToast(err.userMessage || err.message || "Failed to save entry", "error"); },
  });

  var updateMut = useMutation({
    mutationFn: function (data) { return apiPatch(DREAMS.JOURNAL.DETAIL(data.id), data); },
    onSuccess: function () {
      queryClient.invalidateQueries({ queryKey: ["journal", dreamId] });
      showToast("Entry updated", "success");
      closeEditor();
    },
    onError: function (err) { showToast(err.userMessage || err.message || "Failed to update entry", "error"); },
  });

  var deleteMut = useMutation({
    mutationFn: function (entryId) { return apiDelete(DREAMS.JOURNAL.DETAIL(entryId)); },
    onSuccess: function () {
      queryClient.invalidateQueries({ queryKey: ["journal", dreamId] });
      showToast("Entry deleted", "success");
      setShowDeleteConfirm(null);
    },
    onError: function (err) { showToast(err.userMessage || err.message || "Failed to delete entry", "error"); },
  });

  // ── Helpers ──
  function openCreate() {
    setEditingEntry(null);
    setEntryTitle("");
    setEntryContent("");
    setEntryMood("");
    setShowEditor(true);
  }

  function openEdit(entry) {
    setEditingEntry(entry);
    setEntryTitle(entry.title || "");
    setEntryContent(entry.content || "");
    setEntryMood(entry.mood || "");
    setShowEditor(true);
  }

  function closeEditor() {
    setShowEditor(false);
    setEditingEntry(null);
    setEntryTitle("");
    setEntryContent("");
    setEntryMood("");
  }

  function handleSave() {
    if (!entryContent.trim()) {
      showToast("Please write some content", "warning");
      return;
    }
    var payload = {
      dream: dreamId,
      title: entryTitle.trim(),
      content: entryContent,
      mood: entryMood,
    };
    if (editingEntry) {
      updateMut.mutate(Object.assign({ id: editingEntry.id }, payload));
    } else {
      createMut.mutate(payload);
    }
  }

  var dreamTitle = (dreamQuery.data && dreamQuery.data.title) || "Dream";

  // ── Loading / Error ──
  if (journalQuery.isLoading) return (
    <div style={{ width: "100%", padding: "60px 16px 0" }}>
      <SkeletonCard height={60} style={{ marginBottom: 12 }} />
      <SkeletonCard height={60} style={{ marginBottom: 12 }} />
      <SkeletonCard height={60} />
    </div>
  );

  if (journalQuery.isError) return (
    <div style={{ width: "100%", padding: "60px 16px 0" }}>
      <ErrorState message={journalQuery.error?.userMessage || journalQuery.error?.message} onRetry={function () { journalQuery.refetch(); }} />
    </div>
  );

  return (
    <div className="dp-desktop-main" style={{ position: "absolute", inset: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}>

      <GlassAppBar
        className="dp-desktop-header"
        left={<IconButton icon={ArrowLeft} onClick={function () { navigate("/dream/" + dreamId); }} label="Back to dream" />}
        title={<h1 style={{ fontSize: 18, fontWeight: 700, color: "var(--dp-text)", margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>Journal</h1>}
        right={
          <GradientButton gradient="primaryDark" size="sm" icon={Plus} onClick={openCreate}>
            New
          </GradientButton>
        }
      />

      <main style={{ flex: 1, overflowY: "auto", overflowX: "hidden", zIndex: 10, padding: "16px 0 100px", opacity: uiOpacity, transition: "opacity 0.3s ease" }}>
        <div className="dp-content-area" style={{ padding: "0 16px" }}>

          {/* Dream title breadcrumb */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 16 }}>
            <BookOpen size={14} color="var(--dp-accent)" strokeWidth={2.5} />
            <span style={{ fontSize: 13, color: "var(--dp-text-secondary)", fontWeight: 500 }}>{dreamTitle}</span>
          </div>

          {entries.length === 0 ? (
            <EmptyState
              icon={<BookOpen size={40} color="var(--dp-text-muted)" />}
              title="No journal entries yet"
              subtitle="Start writing about your progress, thoughts, and reflections."
              action="Write first entry"
              onAction={openCreate}
            />
          ) : (
            entries.map(function (entry, i) {
              var preview = stripHtml(entry.content);
              return (
                <div key={entry.id} className="dp-a dp-s" style={{ animationDelay: (i * 60) + "ms" }}>
                  <GlassCard mb={10} padding="14px 16px" hover>
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                      {/* Mood indicator */}
                      <div style={{
                        width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        background: "var(--dp-accent-soft)",
                        border: "1px solid var(--dp-accent-border)",
                        fontSize: 18,
                      }}>
                        {entry.mood ? moodEmoji(entry.mood) : <BookOpen size={16} color="var(--dp-accent)" />}
                      </div>

                      {/* Content */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                          {entry.title && (
                            <span style={{ fontSize: 14, fontWeight: 600, color: "var(--dp-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 200 }}>
                              {entry.title}
                            </span>
                          )}
                          {entry.mood && (
                            <span style={{
                              padding: "2px 8px", borderRadius: 8,
                              fontSize: 10, fontWeight: 700, textTransform: "uppercase",
                              background: "var(--dp-accent-soft)",
                              color: "var(--dp-accent)",
                            }}>
                              {entry.mood}
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: 13, color: "var(--dp-text-secondary)", lineHeight: 1.5, marginTop: 4, overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                          {preview || "(empty)"}
                        </div>
                        <div style={{ fontSize: 11, color: "var(--dp-text-muted)", marginTop: 6 }}>
                          {formatDate(entry.created_at || entry.createdAt)}
                        </div>
                      </div>

                      {/* Actions */}
                      <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                        <button
                          aria-label="Edit entry"
                          onClick={function () { openEdit(entry); }}
                          style={{
                            width: 30, height: 30, borderRadius: 8,
                            border: "1px solid var(--dp-input-border)",
                            background: "var(--dp-surface)",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            cursor: "pointer", fontFamily: "inherit",
                          }}
                        >
                          <Edit3 size={13} color="var(--dp-text-secondary)" strokeWidth={2} />
                        </button>
                        <button
                          aria-label="Delete entry"
                          onClick={function () { setShowDeleteConfirm(entry.id); }}
                          style={{
                            width: 30, height: 30, borderRadius: 8,
                            border: "1px solid rgba(239,68,68,0.15)",
                            background: "rgba(239,68,68,0.04)",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            cursor: "pointer", fontFamily: "inherit",
                          }}
                        >
                          <Trash2 size={13} color="rgba(239,68,68,0.7)" strokeWidth={2} />
                        </button>
                      </div>
                    </div>
                  </GlassCard>
                </div>
              );
            })
          )}
        </div>
      </main>

      <BottomNav />

      {/* ── Editor Modal ── */}
      <GlassModal
        open={showEditor}
        onClose={closeEditor}
        variant="center"
        title={editingEntry ? "Edit Journal Entry" : "New Journal Entry"}
        maxWidth={480}
      >
        <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Title */}
          <GlassInput
            value={entryTitle}
            onChange={function (e) { setEntryTitle(e.target.value); }}
            placeholder="Entry title (optional)"
            label="Title"
            maxLength={200}
          />

          {/* Mood selector */}
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, color: "var(--dp-text-secondary)", display: "block", marginBottom: 8 }}>
              Mood
            </label>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {MOOD_OPTIONS.map(function (m) {
                var isActive = entryMood === m.key;
                return (
                  <button
                    key={m.key}
                    type="button"
                    onClick={function () { setEntryMood(isActive ? "" : m.key); }}
                    aria-label={m.label}
                    title={m.label}
                    style={{
                      width: 42, height: 42, borderRadius: 12,
                      border: isActive ? "2px solid var(--dp-accent)" : "1px solid var(--dp-input-border)",
                      background: isActive ? "var(--dp-accent-soft)" : "var(--dp-surface)",
                      fontSize: 20,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      cursor: "pointer", transition: "all 0.2s",
                      fontFamily: "inherit",
                      boxShadow: isActive ? "0 0 0 3px var(--dp-accent-soft)" : "none",
                    }}
                  >
                    {m.emoji}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Rich Text Editor */}
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, color: "var(--dp-text-secondary)", display: "block", marginBottom: 8 }}>
              Content
            </label>
            <RichTextEditor
              value={entryContent}
              onChange={setEntryContent}
              placeholder="Write your thoughts, reflections, progress notes..."
            />
          </div>

          {/* Actions */}
          <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
            <button
              onClick={closeEditor}
              style={{
                flex: 1, padding: "12px", borderRadius: 12,
                border: "1px solid var(--dp-input-border)",
                background: "var(--dp-pill-bg)",
                color: "var(--dp-text-secondary)",
                fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
              }}
            >
              Cancel
            </button>
            <GradientButton
              gradient="primaryDark"
              onClick={handleSave}
              disabled={!entryContent.trim() || createMut.isPending || updateMut.isPending}
              loading={createMut.isPending || updateMut.isPending}
              style={{ flex: 1 }}
            >
              {editingEntry ? "Update" : "Save"}
            </GradientButton>
          </div>
        </div>
      </GlassModal>

      {/* ── Delete Confirmation ── */}
      <GlassModal open={!!showDeleteConfirm} onClose={function () { setShowDeleteConfirm(null); }} variant="center" maxWidth={360}>
        <div style={{ padding: 24 }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 12 }}>
            <div style={{ width: 48, height: 48, borderRadius: 14, background: "rgba(239,68,68,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Trash2 size={22} color="#EF4444" strokeWidth={2} />
            </div>
            <span style={{ fontSize: 18, fontWeight: 700, color: "var(--dp-text)" }}>Delete Entry?</span>
            <span style={{ fontSize: 14, lineHeight: 1.5, color: "var(--dp-text-secondary)" }}>This journal entry will be permanently removed.</span>
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
            <button onClick={function () { setShowDeleteConfirm(null); }} style={{ flex: 1, padding: "12px", borderRadius: 12, border: "1px solid var(--dp-input-border)", background: "var(--dp-pill-bg)", color: "var(--dp-text-primary)", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
            <GradientButton gradient="danger" disabled={deleteMut.isPending} loading={deleteMut.isPending} onClick={function () { deleteMut.mutate(showDeleteConfirm); }} style={{ flex: 1 }}>Delete</GradientButton>
          </div>
        </div>
      </GlassModal>
    </div>
  );
}
