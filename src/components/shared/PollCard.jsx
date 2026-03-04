import { useState, useEffect } from "react";
import { Check, Plus, Minus, Clock, BarChart3 } from "lucide-react";

// ═══════════════════════════════════════════════════════════════
// DreamPlanner — PollCard
// Renders a poll within a circle post.
// Three states: voting, results, creation form.
// Glass morphism styling consistent with the design system.
// ═══════════════════════════════════════════════════════════════

// ── AnimatedBar ── percentage result bar with spring animation ──
function AnimatedBar({ percent, isMyVote, color }) {
  var [width, setWidth] = useState(0);
  useEffect(function () {
    var t = setTimeout(function () { setWidth(percent); }, 80);
    return function () { clearTimeout(t); };
  }, [percent]);

  return (
    <div style={{
      position: "absolute", top: 0, left: 0, bottom: 0,
      width: width + "%",
      background: isMyVote
        ? (color || "var(--dp-accent)") + "28"
        : "var(--dp-glass-bg)",
      borderRadius: 10,
      transition: "width 0.6s cubic-bezier(0.34,1.56,0.64,1)",
    }} />
  );
}

// ── PollResults ── shows results with animated horizontal bars ──
function PollResults({ poll, accentColor }) {
  var totalVotes = poll.totalVotes || 0;
  var myVotes = poll.myVotes || [];

  return (
    <div>
      {(poll.options || []).map(function (opt) {
        var count = opt.voteCount || 0;
        var pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
        var isMyVote = myVotes.indexOf(String(opt.id)) >= 0;

        return (
          <div key={opt.id} style={{
            position: "relative", marginBottom: 8, borderRadius: 10,
            border: isMyVote
              ? "1px solid " + (accentColor || "var(--dp-accent)") + "40"
              : "1px solid var(--dp-glass-border)",
            overflow: "hidden", background: "var(--dp-surface)",
          }}>
            <AnimatedBar percent={pct} isMyVote={isMyVote} color={accentColor} />
            <div style={{
              position: "relative", zIndex: 1, padding: "10px 14px",
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 0 }}>
                {isMyVote && (
                  <div style={{
                    width: 18, height: 18, borderRadius: 9, flexShrink: 0,
                    background: accentColor || "var(--dp-accent)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <Check size={11} color="#fff" strokeWidth={3} />
                  </div>
                )}
                <span style={{
                  fontSize: 13, fontWeight: isMyVote ? 600 : 500,
                  color: isMyVote ? "var(--dp-text)" : "var(--dp-text-secondary)",
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>
                  {opt.text}
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: "var(--dp-text)" }}>
                  {pct}%
                </span>
                <span style={{ fontSize: 11, color: "var(--dp-text-muted)" }}>
                  ({count})
                </span>
              </div>
            </div>
          </div>
        );
      })}

      <div style={{
        display: "flex", alignItems: "center", gap: 6, marginTop: 4,
        fontSize: 11, color: "var(--dp-text-muted)",
      }}>
        <BarChart3 size={12} />
        <span>{totalVotes} vote{totalVotes !== 1 ? "s" : ""}</span>
        {poll.isEnded && (
          <span style={{ marginLeft: 4, color: "var(--dp-text-muted)" }}>
            &middot; Poll ended
          </span>
        )}
        {!poll.isEnded && poll.endsAt && (
          <span style={{ marginLeft: 4, display: "flex", alignItems: "center", gap: 3 }}>
            <Clock size={11} />
            Ends {new Date(poll.endsAt).toLocaleDateString()}
          </span>
        )}
      </div>
    </div>
  );
}

// ── PollVoting ── pre-vote state: selectable options + vote button ──
function PollVoting({ poll, onVote, isSubmitting }) {
  var allowsMultiple = poll.allowsMultiple;
  var [selected, setSelected] = useState([]);

  function toggle(optId) {
    if (allowsMultiple) {
      setSelected(function (prev) {
        return prev.indexOf(optId) >= 0
          ? prev.filter(function (id) { return id !== optId; })
          : prev.concat([optId]);
      });
    } else {
      setSelected([optId]);
    }
  }

  function handleVote() {
    if (selected.length === 0 || isSubmitting) return;
    onVote(selected);
  }

  return (
    <div>
      {(poll.options || []).map(function (opt) {
        var isSelected = selected.indexOf(String(opt.id)) >= 0;
        return (
          <button
            key={opt.id}
            onClick={function () { toggle(String(opt.id)); }}
            style={{
              display: "flex", alignItems: "center", gap: 10,
              width: "100%", padding: "11px 14px", marginBottom: 8,
              borderRadius: 10, cursor: "pointer", fontFamily: "inherit",
              background: isSelected ? "var(--dp-accent)" + "12" : "var(--dp-surface)",
              border: isSelected
                ? "1.5px solid var(--dp-accent)"
                : "1px solid var(--dp-glass-border)",
              color: isSelected ? "var(--dp-text)" : "var(--dp-text-secondary)",
              transition: "all 0.2s",
              textAlign: "left",
            }}
          >
            {/* Checkbox / Radio indicator */}
            <div style={{
              width: 20, height: 20, flexShrink: 0,
              borderRadius: allowsMultiple ? 5 : 10,
              border: isSelected
                ? "2px solid var(--dp-accent)"
                : "2px solid var(--dp-glass-border)",
              background: isSelected ? "var(--dp-accent)" : "transparent",
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "all 0.2s",
            }}>
              {isSelected && <Check size={12} color="#fff" strokeWidth={3} />}
            </div>
            <span style={{ fontSize: 14, fontWeight: 500 }}>{opt.text}</span>
          </button>
        );
      })}

      <button
        onClick={handleVote}
        disabled={selected.length === 0 || isSubmitting}
        style={{
          width: "100%", padding: "11px 0", marginTop: 4, borderRadius: 12,
          border: "none", fontFamily: "inherit", fontSize: 14, fontWeight: 600,
          cursor: selected.length === 0 || isSubmitting ? "default" : "pointer",
          background: selected.length > 0 ? "var(--dp-accent)" : "var(--dp-surface)",
          color: selected.length > 0 ? "#fff" : "var(--dp-text-muted)",
          opacity: isSubmitting ? 0.6 : 1,
          transition: "all 0.2s",
        }}
      >
        {isSubmitting ? "Voting..." : "Vote"}
      </button>

      {poll.allowsMultiple && (
        <div style={{ fontSize: 11, color: "var(--dp-text-muted)", marginTop: 6, textAlign: "center" }}>
          You can select multiple options
        </div>
      )}

      {!poll.isEnded && poll.endsAt && (
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          gap: 4, marginTop: 6, fontSize: 11, color: "var(--dp-text-muted)",
        }}>
          <Clock size={11} />
          Ends {new Date(poll.endsAt).toLocaleDateString()}
        </div>
      )}
    </div>
  );
}

// ── PollCard (main export) ── wraps voting or results ──
export default function PollCard({ poll, onVote, isSubmitting, accentColor }) {
  if (!poll) return null;

  var hasVoted = poll.myVotes && poll.myVotes.length > 0;
  var showResults = hasVoted || poll.isEnded;

  return (
    <div style={{
      marginTop: 8, marginBottom: 4, padding: 14, borderRadius: 14,
      background: "var(--dp-glass-bg)",
      border: "1px solid var(--dp-glass-border)",
      backdropFilter: "blur(12px)",
      WebkitBackdropFilter: "blur(12px)",
    }}>
      {/* Question */}
      <div style={{
        fontSize: 15, fontWeight: 700, color: "var(--dp-text)",
        marginBottom: 12, lineHeight: 1.4,
      }}>
        {poll.question}
      </div>

      {showResults ? (
        <PollResults poll={poll} accentColor={accentColor} />
      ) : (
        <PollVoting poll={poll} onVote={onVote} isSubmitting={isSubmitting} />
      )}
    </div>
  );
}

// ── PollCreateForm ── used in post composer for creating a poll ──
export function PollCreateForm({ pollData, onChange, onRemove }) {
  var question = pollData.question || "";
  var options = pollData.options || ["", ""];
  var allowsMultiple = pollData.allowsMultiple || false;
  var endsAt = pollData.endsAt || "";

  function update(patch) {
    onChange(Object.assign({}, pollData, patch));
  }

  function setQuestion(val) {
    update({ question: val });
  }

  function setOption(idx, val) {
    var newOpts = options.slice();
    newOpts[idx] = val;
    update({ options: newOpts });
  }

  function addOption() {
    if (options.length >= 6) return;
    update({ options: options.concat([""]) });
  }

  function removeOption(idx) {
    if (options.length <= 2) return;
    var newOpts = options.slice();
    newOpts.splice(idx, 1);
    update({ options: newOpts });
  }

  return (
    <div style={{
      padding: 14, borderRadius: 14, marginTop: 10,
      background: "var(--dp-glass-bg)",
      border: "1px solid var(--dp-glass-border)",
      backdropFilter: "blur(12px)",
      WebkitBackdropFilter: "blur(12px)",
    }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <BarChart3 size={15} color="var(--dp-accent)" />
          <span style={{ fontSize: 14, fontWeight: 700, color: "var(--dp-text)" }}>Create Poll</span>
        </div>
        <button
          onClick={onRemove}
          style={{
            background: "none", border: "none", cursor: "pointer",
            fontSize: 12, color: "var(--dp-text-muted)", fontFamily: "inherit",
            padding: "4px 8px", borderRadius: 6,
          }}
        >
          Remove
        </button>
      </div>

      {/* Question */}
      <input
        type="text"
        value={question}
        onChange={function (e) { setQuestion(e.target.value); }}
        placeholder="Ask a question..."
        maxLength={300}
        style={{
          width: "100%", padding: "10px 12px", marginBottom: 10, borderRadius: 10,
          background: "var(--dp-input-bg)", border: "1px solid var(--dp-input-border)",
          color: "var(--dp-text)", fontSize: 14, fontFamily: "inherit",
          outline: "none", boxSizing: "border-box",
        }}
      />

      {/* Options */}
      {options.map(function (opt, idx) {
        return (
          <div key={idx} style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "center" }}>
            <div style={{
              width: 22, height: 22, borderRadius: 6, flexShrink: 0,
              background: "var(--dp-surface)", border: "1px solid var(--dp-glass-border)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 11, fontWeight: 600, color: "var(--dp-text-muted)",
            }}>
              {idx + 1}
            </div>
            <input
              type="text"
              value={opt}
              onChange={function (e) { setOption(idx, e.target.value); }}
              placeholder={"Option " + (idx + 1)}
              maxLength={200}
              style={{
                flex: 1, padding: "9px 12px", borderRadius: 10,
                background: "var(--dp-input-bg)", border: "1px solid var(--dp-input-border)",
                color: "var(--dp-text)", fontSize: 13, fontFamily: "inherit",
                outline: "none",
              }}
            />
            {options.length > 2 && (
              <button
                onClick={function () { removeOption(idx); }}
                style={{
                  width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                  border: "1px solid rgba(239,68,68,0.2)", background: "rgba(239,68,68,0.06)",
                  cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                  color: "#EF4444",
                }}
              >
                <Minus size={13} />
              </button>
            )}
          </div>
        );
      })}

      {options.length < 6 && (
        <button
          onClick={addOption}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "8px 12px", borderRadius: 10, marginBottom: 10,
            background: "none", border: "1px dashed var(--dp-glass-border)",
            color: "var(--dp-accent)", fontSize: 13, fontWeight: 500,
            cursor: "pointer", fontFamily: "inherit", width: "100%",
            justifyContent: "center",
          }}
        >
          <Plus size={14} /> Add Option
        </button>
      )}

      {/* Settings row */}
      <div style={{
        display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap",
        paddingTop: 8, borderTop: "1px solid var(--dp-divider)",
      }}>
        {/* Multiple choice toggle */}
        <label style={{
          display: "flex", alignItems: "center", gap: 6,
          fontSize: 12, color: "var(--dp-text-secondary)", cursor: "pointer",
        }}>
          <input
            type="checkbox"
            checked={allowsMultiple}
            onChange={function (e) { update({ allowsMultiple: e.target.checked }); }}
            style={{ accentColor: "var(--dp-accent)" }}
          />
          Multiple choice
        </label>

        {/* End time */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Clock size={12} color="var(--dp-text-muted)" />
          <input
            type="datetime-local"
            value={endsAt}
            onChange={function (e) { update({ endsAt: e.target.value }); }}
            style={{
              padding: "4px 8px", borderRadius: 8, fontSize: 12, fontFamily: "inherit",
              background: "var(--dp-input-bg)", border: "1px solid var(--dp-input-border)",
              color: "var(--dp-text-secondary)", outline: "none",
            }}
          />
        </div>
      </div>
    </div>
  );
}
