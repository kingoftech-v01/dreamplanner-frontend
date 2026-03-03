import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiPost, apiUpload } from "../../services/api";
import { CIRCLES } from "../../services/endpoints";
import { takePicture, isNative } from "../../services/native";
import { useToast } from "../../context/ToastContext";
import { useTheme } from "../../context/ThemeContext";
import { sanitizeText, validateRequired } from "../../utils/sanitize";
import { BRAND, CATEGORIES as CAT_MAP, catSolid, adaptColor } from "../../styles/colors";
import {
  ArrowLeft, Users, Image, ChevronDown, Globe, Lock,
  Check, X
} from "lucide-react";
import PageLayout from "../../components/shared/PageLayout";
import SubscriptionGate from "../../components/shared/SubscriptionGate";
import IconButton from "../../components/shared/IconButton";
import GlassCard from "../../components/shared/GlassCard";
import GlassAppBar from "../../components/shared/GlassAppBar";
import GradientButton from "../../components/shared/GradientButton";
import GlassInput from "../../components/shared/GlassInput";

// ═══════════════════════════════════════════════════════════════
// DreamPlanner — Circle Create Screen
// ═══════════════════════════════════════════════════════════════

var CATEGORIES = [
  { id: "career", label: "Career", color: catSolid("career") },
  { id: "health", label: "Health", color: catSolid("health") },
  { id: "fitness", label: "Fitness", color: "#3B82F6" },
  { id: "education", label: "Education", color: "#6366F1" },
  { id: "finance", label: "Finance", color: catSolid("finance") },
  { id: "creativity", label: "Creativity", color: "#EC4899" },
  { id: "relationships", label: "Relationships", color: "#14B8A6" },
  { id: "personal_growth", label: "Personal Growth", color: catSolid("personal") },
  { id: "hobbies", label: "Hobbies", color: catSolid("hobbies") },
  { id: "other", label: "Other", color: "#9CA3AF" },
];

export default function CircleCreateScreen() {
  var navigate = useNavigate();
  var { showToast } = useToast();
  var queryClient = useQueryClient();
  var { resolved } = useTheme(); var isLight = resolved === "light";
  var [mounted, setMounted] = useState(false);
  var [name, setName] = useState("");
  var [description, setDescription] = useState("");
  var [category, setCategory] = useState("");
  var [privacy, setPrivacy] = useState("public");
  var [coverImage, setCoverImage] = useState(null);
  var [coverPreview, setCoverPreview] = useState(null);
  var [showCategoryDropdown, setShowCategoryDropdown] = useState(false);

  useEffect(function () {
    setTimeout(function () { setMounted(true); }, 100);
  }, []);

  // ─── Cover Image Handler ─────────────────────────────────────
  var handleCoverChange = function (e) {
    var file = e.target.files && e.target.files[0];
    if (!file) return;
    setCoverImage(file);
    var reader = new FileReader();
    reader.onload = function (ev) {
      setCoverPreview(ev.target.result);
    };
    reader.readAsDataURL(file);
  };

  var handleNativeCover = function (source) {
    takePicture({ source: source || "gallery", width: 1200, height: 600 }).then(function (photo) {
      if (photo && photo.dataUrl) {
        setCoverPreview(photo.dataUrl);
        fetch(photo.dataUrl).then(function (res) { return res.blob(); }).then(function (blob) {
          var file = new File([blob], "cover.jpg", { type: "image/jpeg" });
          setCoverImage(file);
        });
      }
    }).catch(function () {});
  };

  var removeCover = function () {
    setCoverImage(null);
    setCoverPreview(null);
  };

  // ─── Create Circle Mutation ──────────────────────────────────
  var createMutation = useMutation({
    mutationFn: function (payload) {
      if (coverImage) {
        var formData = new FormData();
        formData.append("name", payload.name);
        formData.append("description", payload.description);
        formData.append("category", payload.category);
        formData.append("privacy", payload.privacy);
        formData.append("cover_image", coverImage);
        return apiUpload(CIRCLES.LIST, formData);
      }
      return apiPost(CIRCLES.LIST, payload);
    },
    onSuccess: function (data) {
      queryClient.invalidateQueries({ queryKey: ["circles"] });
      showToast("Circle created!", "success");
      var newId = data && (data.id || data.circleId);
      if (newId) {
        navigate("/circle/" + newId);
      } else {
        navigate(-1);
      }
    },
    onError: function (err) {
      showToast(err.message || "Failed to create circle", "error");
    },
  });

  var handleSubmit = function () {
    var missing = validateRequired({ name: name });
    if (missing.length > 0) {
      showToast("Circle name is required", "error");
      return;
    }
    if (!category) {
      showToast("Please select a category", "error");
      return;
    }

    var cleanName = sanitizeText(name, 100);
    var cleanDescription = sanitizeText(description, 500);
    var cleanCategory = sanitizeText(category, 100);

    createMutation.mutate({
      name: cleanName,
      description: cleanDescription,
      category: cleanCategory,
      privacy: privacy,
    });
  };

  var selectedCategory = CATEGORIES.find(function (c) { return c.id === category; });

  return (
    <PageLayout header={
      <GlassAppBar
        left={<IconButton icon={ArrowLeft} onClick={function () { navigate(-1); }} label="Back" />}
        title={<span style={{ display: "flex", alignItems: "center", gap: 8 }}><Users size={20} color={adaptColor(BRAND.purpleLight, isLight)} strokeWidth={2} /><span style={{ fontSize: 17, fontWeight: 700, color: "var(--dp-text)", letterSpacing: "-0.3px" }}>Create Circle</span></span>}
      />
    }>
      <SubscriptionGate required="pro" feature="Create Circle">
        <div
          style={{
            paddingBottom: 80,
          }}
        >

          {/* Form Card */}
          <div
            style={{
              opacity: mounted ? 1 : 0,
              transform: mounted ? "translateY(0)" : "translateY(16px)",
              transition: "all 0.5s cubic-bezier(0.16, 1, 0.3, 1) 0.1s",
            }}
          >
            <GlassCard padding={20} mb={16}>
              {/* Name */}
              <div style={{ marginBottom: 16 }}>
                <label
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: "var(--dp-text-secondary)",
                    marginBottom: 8,
                    display: "block",
                  }}
                >
                  Circle Name
                </label>
                <GlassInput
                  value={name}
                  onChange={function (e) { setName(e.target.value); }}
                  placeholder="Enter circle name"
                  maxLength={60}
                />
              </div>

              {/* Description */}
              <div style={{ marginBottom: 16 }}>
                <label
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: "var(--dp-text-secondary)",
                    marginBottom: 8,
                    display: "block",
                  }}
                >
                  Description
                </label>
                <GlassInput
                  value={description}
                  onChange={function (e) { setDescription(e.target.value); }}
                  placeholder="What is this circle about?"
                  multiline
                  maxLength={300}
                  inputStyle={{ rows: 3, lineHeight: 1.5 }}
                />
                <div
                  style={{
                    fontSize: 11,
                    color: "var(--dp-text-muted)",
                    textAlign: "right",
                    marginTop: 4,
                  }}
                >
                  {description.length}/300
                </div>
              </div>

              {/* Category Dropdown */}
              <div style={{ marginBottom: 16, position: "relative" }}>
                <label
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: "var(--dp-text-secondary)",
                    marginBottom: 8,
                    display: "block",
                  }}
                >
                  Category
                </label>
                <button
                  onClick={function () { setShowCategoryDropdown(!showCategoryDropdown); }}
                  style={{
                    width: "100%",
                    padding: "14px 16px",
                    borderRadius: 14,
                    border: "1px solid var(--dp-input-border)",
                    background: "var(--dp-input-bg)",
                    color: selectedCategory ? "var(--dp-text)" : "var(--dp-text-muted)",
                    fontSize: 15,
                    outline: "none",
                    transition: "border-color 0.25s ease, box-shadow 0.25s ease",
                    boxSizing: "border-box",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    textAlign: "left",
                    fontFamily: "inherit",
                  }}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {selectedCategory && (
                      <span
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: 5,
                          background: selectedCategory.color,
                          flexShrink: 0,
                        }}
                      />
                    )}
                    {selectedCategory ? selectedCategory.label : "Select a category"}
                  </span>
                  <ChevronDown
                    size={16}
                    strokeWidth={2}
                    color="var(--dp-text-muted)"
                    style={{
                      transform: showCategoryDropdown ? "rotate(180deg)" : "rotate(0deg)",
                      transition: "transform 0.2s",
                    }}
                  />
                </button>

                {/* Dropdown */}
                {showCategoryDropdown && (
                  <div
                    style={{
                      position: "absolute",
                      top: "100%",
                      left: 0,
                      right: 0,
                      marginTop: 4,
                      borderRadius: 14,
                      background: "var(--dp-modal-bg)",
                      backdropFilter: "blur(40px)",
                      WebkitBackdropFilter: "blur(40px)",
                      border: "1px solid var(--dp-glass-border)",
                      boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
                      zIndex: 50,
                      padding: "6px",
                      overflow: "hidden",
                    }}
                  >
                    {CATEGORIES.map(function (cat) {
                      var isSelected = category === cat.id;
                      return (
                        <button
                          key={cat.id}
                          className="dp-gh"
                          onClick={function () {
                            setCategory(cat.id);
                            setShowCategoryDropdown(false);
                          }}
                          style={{
                            width: "100%",
                            padding: "11px 14px",
                            borderRadius: 10,
                            border: "none",
                            background: isSelected ? "rgba(139,92,246,0.1)" : "transparent",
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                            cursor: "pointer",
                            fontFamily: "inherit",
                            transition: "background 0.15s",
                          }}
                        >
                          <span
                            style={{
                              width: 10,
                              height: 10,
                              borderRadius: 5,
                              background: cat.color,
                              flexShrink: 0,
                            }}
                          />
                          <span
                            style={{
                              fontSize: 14,
                              fontWeight: isSelected ? 600 : 400,
                              color: isSelected ? "var(--dp-accent)" : "var(--dp-text)",
                            }}
                          >
                            {cat.label}
                          </span>
                          {isSelected && <Check size={14} color="var(--dp-accent)" strokeWidth={2.5} style={{ marginLeft: "auto" }} />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Privacy Toggle */}
              <div style={{ marginBottom: 16 }}>
                <label
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: "var(--dp-text-secondary)",
                    marginBottom: 8,
                    display: "block",
                  }}
                >
                  Privacy
                </label>
                <div style={{ display: "flex", gap: 8 }}>
                  {[
                    { id: "public", label: "Public", icon: Globe, sub: "Anyone can find & join" },
                    { id: "private", label: "Private", icon: Lock, sub: "Invite only" },
                  ].map(function (opt) {
                    var Icon = opt.icon;
                    var isActive = privacy === opt.id;
                    return (
                      <button
                        key={opt.id}
                        onClick={function () { setPrivacy(opt.id); }}
                        style={{
                          flex: 1,
                          padding: "14px 12px",
                          borderRadius: 14,
                          border: isActive
                            ? "1px solid rgba(139,92,246,0.4)"
                            : "1px solid var(--dp-glass-border)",
                          background: isActive
                            ? "var(--dp-accent-soft)"
                            : "var(--dp-surface)",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          gap: 6,
                          cursor: "pointer",
                          fontFamily: "inherit",
                          transition: "all 0.2s",
                        }}
                      >
                        <Icon
                          size={18}
                          color={isActive ? "var(--dp-accent)" : "var(--dp-text-muted)"}
                          strokeWidth={2}
                        />
                        <span
                          style={{
                            fontSize: 13,
                            fontWeight: isActive ? 600 : 500,
                            color: isActive ? "var(--dp-accent)" : "var(--dp-text-secondary)",
                          }}
                        >
                          {opt.label}
                        </span>
                        <span
                          style={{
                            fontSize: 11,
                            color: "var(--dp-text-muted)",
                          }}
                        >
                          {opt.sub}
                        </span>
                        {isActive && (
                          <div
                            style={{
                              width: 6,
                              height: 6,
                              borderRadius: 3,
                              background: "var(--dp-accent)",
                              boxShadow: "0 0 6px rgba(196,181,253,0.5)",
                            }}
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Cover Image Upload */}
              <div>
                <label
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: "var(--dp-text-secondary)",
                    marginBottom: 8,
                    display: "block",
                  }}
                >
                  Cover Image (optional)
                </label>
                {coverPreview ? (
                  <div style={{ position: "relative", marginBottom: 4 }}>
                    <img
                      src={coverPreview}
                      alt="Cover preview"
                      style={{
                        width: "100%",
                        height: 140,
                        objectFit: "cover",
                        borderRadius: 14,
                        display: "block",
                      }}
                    />
                    <button
                      onClick={removeCover}
                      style={{
                        position: "absolute",
                        top: 8,
                        right: 8,
                        width: 28,
                        height: 28,
                        borderRadius: 8,
                        border: "none",
                        background: "rgba(0,0,0,0.6)",
                        color: "#fff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                        fontFamily: "inherit",
                      }}
                    >
                      <X size={14} strokeWidth={2.5} />
                    </button>
                  </div>
                ) : isNative ? (
                    <button
                      type="button"
                      onClick={function () { handleNativeCover("gallery"); }}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        width: "100%",
                        padding: "24px 16px",
                        borderRadius: 14,
                        border: "2px dashed var(--dp-glass-border)",
                        background: "var(--dp-surface)",
                        cursor: "pointer",
                        transition: "all 0.2s",
                        fontFamily: "inherit",
                      }}
                    >
                      <Image size={28} color="var(--dp-text-muted)" strokeWidth={1.5} style={{ marginBottom: 8 }} />
                      <span style={{ fontSize: 13, color: "var(--dp-text-tertiary)", fontWeight: 500 }}>
                        Tap to choose a cover image
                      </span>
                    </button>
                  ) : (
                    <label
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: "24px 16px",
                        borderRadius: 14,
                        border: "2px dashed var(--dp-glass-border)",
                        background: "var(--dp-surface)",
                        cursor: "pointer",
                        transition: "all 0.2s",
                      }}
                    >
                      <Image size={28} color="var(--dp-text-muted)" strokeWidth={1.5} style={{ marginBottom: 8 }} />
                      <span style={{ fontSize: 13, color: "var(--dp-text-tertiary)", fontWeight: 500 }}>
                        Tap to upload a cover image
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleCoverChange}
                        style={{ display: "none" }}
                      />
                    </label>
                  )}
              </div>
            </GlassCard>
          </div>

          {/* Create Button */}
          <div
            style={{
              opacity: mounted ? 1 : 0,
              transform: mounted ? "translateY(0)" : "translateY(16px)",
              transition: "all 0.5s cubic-bezier(0.16, 1, 0.3, 1) 0.2s",
            }}
          >
            <GradientButton
              gradient="primaryDark"
              icon={Users}
              onClick={handleSubmit}
              disabled={createMutation.isPending || !name.trim()}
              loading={createMutation.isPending}
              fullWidth
              size="lg"
            >
              {createMutation.isPending ? "Creating..." : "Create Circle"}
            </GradientButton>
          </div>

          <style>{`
            @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            input::placeholder, textarea::placeholder { color: var(--dp-text-muted); }
          `}</style>
        </div>
      </SubscriptionGate>
    </PageLayout>
  );
}
