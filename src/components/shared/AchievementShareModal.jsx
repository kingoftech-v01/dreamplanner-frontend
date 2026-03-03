import { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiUpload } from "../../services/api";
import { SOCIAL } from "../../services/endpoints";
import { BRAND, GRADIENTS } from "../../styles/colors";
import { useToast } from "../../context/ToastContext";
import GlassModal from "./GlassModal";
import GlassInput from "./GlassInput";
import GradientButton from "./GradientButton";
import { Trophy, Sparkles, Image, Video, Music, X } from "lucide-react";

/* ═══════════════════════════════════════════════════════════════════
 * AchievementShareModal — Celebration popup after completing a
 * goal, milestone, or dream. Lets the user share with media.
 * ═══════════════════════════════════════════════════════════════════ */

export default function AchievementShareModal({
  open,
  onClose,
  achievementType = "achievement",
  achievementTitle = "",
  dreamId,
  goalId,
  milestoneId,
  taskId,
}) {
  var { showToast } = useToast();
  var qc = useQueryClient();
  var [content, setContent] = useState("");
  var [mediaFile, setMediaFile] = useState(null);
  var [mediaType, setMediaType] = useState("none");
  var [mediaPreview, setMediaPreview] = useState("");
  var mediaInputRef = useRef(null);

  var createMut = useMutation({
    mutationFn: function (fd) { return apiUpload(SOCIAL.POSTS.LIST, fd); },
    onSuccess: function () {
      showToast("Shared on your feed!", "success");
      qc.invalidateQueries({ queryKey: ["social-posts-feed"] });
      _close();
    },
    onError: function (e) { showToast(e.message || "Failed to share", "error"); },
  });

  function _close() {
    setContent("");
    setMediaFile(null);
    setMediaType("none");
    if (mediaPreview && mediaPreview.startsWith("blob:")) {
      URL.revokeObjectURL(mediaPreview);
    }
    setMediaPreview("");
    onClose();
  }

  function handleMediaPick(type) {
    setMediaType(type);
    var accept = type === "image" ? "image/*" : type === "video" ? "video/*" : "audio/*";
    if (mediaInputRef.current) {
      mediaInputRef.current.accept = accept;
      mediaInputRef.current.click();
    }
  }

  function handleMediaSelected(e) {
    var file = e.target.files && e.target.files[0];
    if (!file) return;
    // Validate file type
    var allowedTypes = {
      image: ["image/jpeg", "image/png", "image/webp", "image/gif"],
      video: ["video/mp4", "video/webm", "video/quicktime"],
      audio: ["audio/mpeg", "audio/ogg", "audio/wav", "audio/webm"],
    };
    var allowed = allowedTypes[mediaType] || allowedTypes.image;
    if (!allowed.includes(file.type)) {
      showToast("Unsupported file type", "error");
      return;
    }
    // Validate file size (50MB max)
    if (file.size > 50 * 1024 * 1024) {
      showToast("File too large. Max 50MB.", "error");
      return;
    }
    // Revoke previous object URL if any
    if (mediaPreview && mediaPreview.startsWith("blob:")) {
      URL.revokeObjectURL(mediaPreview);
    }
    setMediaFile(file);
    if (mediaType === "image") {
      setMediaPreview(URL.createObjectURL(file));
    } else {
      setMediaPreview(file.name);
    }
  }

  function handleShare() {
    var fd = new FormData();
    fd.append("content", content || ("Just completed: " + achievementTitle + "!"));
    fd.append("visibility", "public");
    fd.append("post_type", achievementType === "milestone" ? "milestone" : "achievement");
    if (dreamId) fd.append("dream_id", dreamId);
    if (goalId) fd.append("linked_goal_id", goalId);
    if (milestoneId) fd.append("linked_milestone_id", milestoneId);
    if (taskId) fd.append("linked_task_id", taskId);
    if (mediaFile) {
      var fieldName = mediaType === "image" ? "image_file" : mediaType === "video" ? "video_file" : "audio_file";
      fd.append(fieldName, mediaFile);
    }
    createMut.mutate(fd);
  }

  if (!open) return null;

  return (
    <GlassModal open={open} onClose={_close} variant="center" maxWidth={400}>
      <div style={{ padding: 24, textAlign: "center" }}>
        <input type="file" ref={mediaInputRef} style={{ display: "none" }} onChange={handleMediaSelected} />

        {/* Celebration icon */}
        <div style={{ width: 64, height: 64, borderRadius: 20, background: "var(--dp-accent-soft)", border: "1px solid var(--dp-accent-border)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
          {achievementType === "milestone" ? (
            <Sparkles size={28} color="var(--dp-accent)" strokeWidth={1.5} />
          ) : (
            <Trophy size={28} color="var(--dp-accent)" strokeWidth={1.5} />
          )}
        </div>

        <div style={{ fontSize: 18, fontWeight: 700, color: "var(--dp-text)", marginBottom: 6 }}>
          Achievement Unlocked!
        </div>
        <div style={{ fontSize: 14, color: "var(--dp-text-secondary)", marginBottom: 4 }}>
          You completed:
        </div>
        <div style={{ fontSize: 16, fontWeight: 600, color: "var(--dp-accent)", marginBottom: 20 }}>
          "{achievementTitle}"
        </div>

        {/* Content */}
        <GlassInput
          value={content}
          onChange={function (e) { setContent(e.target.value); }}
          placeholder="Say something about your achievement..."
          multiline
          style={{ borderRadius: 16, width: "100%", marginBottom: 14, textAlign: "left" }}
          inputStyle={{ minHeight: 60, lineHeight: 1.5 }}
        />

        {/* Media buttons */}
        <div style={{ display: "flex", gap: 8, marginBottom: 14, justifyContent: "center" }}>
          {[
            { type: "image", Icon: Image, label: "Photo" },
            { type: "video", Icon: Video, label: "Video" },
            { type: "audio", Icon: Music, label: "Audio" },
          ].map(function (m) {
            var active = mediaType === m.type && mediaFile;
            return (
              <button key={m.type} onClick={function () { handleMediaPick(m.type); }} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 12, border: active ? "1px solid var(--dp-accent-border)" : "1px solid var(--dp-input-border)", background: active ? "var(--dp-accent-soft)" : "var(--dp-glass-bg)", color: active ? "var(--dp-accent)" : "var(--dp-text-secondary)", fontSize: 13, fontWeight: 500, fontFamily: "inherit", cursor: "pointer", transition: "all 0.2s" }}>
                <m.Icon size={16} strokeWidth={2} />{m.label}
              </button>
            );
          })}
        </div>

        {/* Media preview */}
        {mediaFile && (
          <div style={{ marginBottom: 14, position: "relative" }}>
            {mediaType === "image" && mediaPreview && (
              <img src={mediaPreview} alt="Preview" style={{ width: "100%", maxHeight: 160, objectFit: "cover", borderRadius: 14 }} />
            )}
            {mediaType !== "image" && (
              <div style={{ padding: "10px 14px", borderRadius: 14, background: "var(--dp-glass-bg)", border: "1px solid var(--dp-input-border)", color: "var(--dp-text-secondary)", fontSize: 13, textAlign: "left" }}>
                {mediaFile.name}
              </div>
            )}
            <button onClick={function () { if (mediaPreview && mediaPreview.startsWith("blob:")) { URL.revokeObjectURL(mediaPreview); } setMediaFile(null); setMediaType("none"); setMediaPreview(""); }} style={{ position: "absolute", top: 6, right: 6, width: 24, height: 24, borderRadius: "50%", background: "rgba(0,0,0,0.5)", border: "none", color: BRAND.white, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
              <X size={14} />
            </button>
          </div>
        )}

        {/* Actions */}
        <GradientButton gradient="primary" onClick={handleShare} loading={createMut.isPending} disabled={createMut.isPending} fullWidth size="lg" style={{ marginBottom: 10 }}>
          Share on Feed
        </GradientButton>
        <button onClick={_close} style={{ width: "100%", padding: "12px 0", border: "none", background: "transparent", color: "var(--dp-text-secondary)", fontSize: 14, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>
          Maybe Later
        </button>
      </div>
    </GlassModal>
  );
}
