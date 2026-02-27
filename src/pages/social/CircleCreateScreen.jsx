import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiPost, apiUpload } from "../../services/api";
import { CIRCLES } from "../../services/endpoints";
import { takePicture, isNative } from "../../services/native";
import { useToast } from "../../context/ToastContext";
import { useTheme } from "../../context/ThemeContext";
import { sanitizeText, validateRequired } from "../../utils/sanitize";
import {
  ArrowLeft, Users, Image, ChevronDown, Globe, Lock,
  Loader, Check, X
} from "lucide-react";
import PageLayout from "../../components/shared/PageLayout";
import SubscriptionGate from "../../components/shared/SubscriptionGate";

// ═══════════════════════════════════════════════════════════════
// DreamPlanner — Circle Create Screen
// ═══════════════════════════════════════════════════════════════

var glass = {
  background: "var(--dp-glass-bg)",
  backdropFilter: "blur(40px)",
  WebkitBackdropFilter: "blur(40px)",
  border: "1px solid var(--dp-input-border)",
  borderRadius: 20,
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)",
};

var CATEGORIES = [
  { id: "Health", label: "Health", color: "#10B981" },
  { id: "Career", label: "Career", color: "#8B5CF6" },
  { id: "Growth", label: "Growth", color: "#6366F1" },
  { id: "Finance", label: "Finance", color: "#FCD34D" },
  { id: "Hobbies", label: "Hobbies", color: "#EC4899" },
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
  var [focusedField, setFocusedField] = useState(null);

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

  var inputStyle = {
    width: "100%",
    padding: "14px 16px",
    borderRadius: 14,
    border: "1px solid var(--dp-input-border)",
    background: "var(--dp-input-bg)",
    color: "var(--dp-text)",
    fontSize: 15,
    fontFamily: "Inter, sans-serif",
    outline: "none",
    transition: "border-color 0.25s ease, box-shadow 0.25s ease",
    boxSizing: "border-box",
  };

  var inputFocusStyle = {
    borderColor: "rgba(139,92,246,0.5)",
    boxShadow: "0 0 0 3px rgba(139,92,246,0.15)",
  };

  return (
    <PageLayout>
      <SubscriptionGate required="pro" feature="Create Circle">
        <div
          style={{
            fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
            minHeight: "100vh",
            paddingBottom: 80,
          }}
        >
          {/* Header */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "20px 0 16px",
              opacity: mounted ? 1 : 0,
              transform: mounted ? "translateY(0)" : "translateY(-10px)",
              transition: "all 0.5s cubic-bezier(0.16, 1, 0.3, 1)",
            }}
          >
            <button className="dp-ib" onClick={function () { navigate(-1); }}>
              <ArrowLeft size={20} strokeWidth={2} />
            </button>
            <Users size={20} color={isLight ? "#6D28D9" : "#C4B5FD"} strokeWidth={2} />
            <span
              style={{
                fontSize: 17,
                fontWeight: 700,
                color: "var(--dp-text)",
                letterSpacing: "-0.3px",
              }}
            >
              Create Circle
            </span>
          </div>

          {/* Form Card */}
          <div
            style={{
              opacity: mounted ? 1 : 0,
              transform: mounted ? "translateY(0)" : "translateY(16px)",
              transition: "all 0.5s cubic-bezier(0.16, 1, 0.3, 1) 0.1s",
            }}
          >
            <div style={{ ...glass, padding: 20, marginBottom: 16 }}>
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
                <input
                  value={name}
                  onChange={function (e) { setName(e.target.value); }}
                  onFocus={function () { setFocusedField("name"); }}
                  onBlur={function () { setFocusedField(null); }}
                  placeholder="Enter circle name"
                  maxLength={60}
                  style={{
                    ...inputStyle,
                    ...(focusedField === "name" ? inputFocusStyle : {}),
                  }}
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
                <textarea
                  value={description}
                  onChange={function (e) { setDescription(e.target.value); }}
                  onFocus={function () { setFocusedField("desc"); }}
                  onBlur={function () { setFocusedField(null); }}
                  placeholder="What is this circle about?"
                  rows={3}
                  maxLength={300}
                  style={{
                    ...inputStyle,
                    resize: "none",
                    lineHeight: 1.5,
                    ...(focusedField === "desc" ? inputFocusStyle : {}),
                  }}
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
                    ...inputStyle,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    textAlign: "left",
                    color: selectedCategory ? "var(--dp-text)" : "var(--dp-text-muted)",
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
                      background: isLight ? "rgba(255,255,255,0.97)" : "rgba(12,8,26,0.97)",
                      backdropFilter: "blur(40px)",
                      WebkitBackdropFilter: "blur(40px)",
                      border: isLight ? "1px solid rgba(139,92,246,0.15)" : "1px solid rgba(255,255,255,0.08)",
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
                          onMouseEnter={function (e) {
                            if (!isSelected) e.currentTarget.style.background = isLight ? "rgba(139,92,246,0.06)" : "rgba(255,255,255,0.04)";
                          }}
                          onMouseLeave={function (e) {
                            if (!isSelected) e.currentTarget.style.background = "transparent";
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
                              color: isSelected ? (isLight ? "#7C3AED" : "#C4B5FD") : (isLight ? "rgba(26,21,53,0.9)" : "rgba(255,255,255,0.85)"),
                            }}
                          >
                            {cat.label}
                          </span>
                          {isSelected && <Check size={14} color={isLight ? "#7C3AED" : "#C4B5FD"} strokeWidth={2.5} style={{ marginLeft: "auto" }} />}
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
                            : (isLight ? "1px solid rgba(139,92,246,0.12)" : "1px solid rgba(255,255,255,0.06)"),
                          background: isActive
                            ? "rgba(139,92,246,0.12)"
                            : (isLight ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.02)"),
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
                          color={isActive ? (isLight ? "#7C3AED" : "#C4B5FD") : (isLight ? "rgba(26,21,53,0.45)" : "rgba(255,255,255,0.4)")}
                          strokeWidth={2}
                        />
                        <span
                          style={{
                            fontSize: 13,
                            fontWeight: isActive ? 600 : 500,
                            color: isActive ? (isLight ? "#7C3AED" : "#C4B5FD") : (isLight ? "rgba(26,21,53,0.7)" : "rgba(255,255,255,0.85)"),
                          }}
                        >
                          {opt.label}
                        </span>
                        <span
                          style={{
                            fontSize: 11,
                            color: isLight ? "rgba(26,21,53,0.45)" : "rgba(255,255,255,0.4)",
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
                              background: isLight ? "#7C3AED" : "#C4B5FD",
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
                        border: isLight ? "2px dashed rgba(139,92,246,0.2)" : "2px dashed rgba(255,255,255,0.08)",
                        background: isLight ? "rgba(139,92,246,0.03)" : "rgba(255,255,255,0.02)",
                        cursor: "pointer",
                        transition: "all 0.2s",
                        fontFamily: "inherit",
                      }}
                    >
                      <Image size={28} color={isLight ? "rgba(26,21,53,0.3)" : "rgba(255,255,255,0.2)"} strokeWidth={1.5} style={{ marginBottom: 8 }} />
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
                        border: isLight ? "2px dashed rgba(139,92,246,0.2)" : "2px dashed rgba(255,255,255,0.08)",
                        background: isLight ? "rgba(139,92,246,0.03)" : "rgba(255,255,255,0.02)",
                        cursor: "pointer",
                        transition: "all 0.2s",
                      }}
                    >
                      <Image size={28} color={isLight ? "rgba(26,21,53,0.3)" : "rgba(255,255,255,0.2)"} strokeWidth={1.5} style={{ marginBottom: 8 }} />
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
            </div>
          </div>

          {/* Create Button */}
          <div
            style={{
              opacity: mounted ? 1 : 0,
              transform: mounted ? "translateY(0)" : "translateY(16px)",
              transition: "all 0.5s cubic-bezier(0.16, 1, 0.3, 1) 0.2s",
            }}
          >
            <button
              onClick={handleSubmit}
              disabled={createMutation.isPending || !name.trim()}
              style={{
                width: "100%",
                padding: "15px 0",
                borderRadius: 16,
                border: "none",
                background: name.trim()
                  ? "linear-gradient(135deg, #8B5CF6, #6D28D9)"
                  : "var(--dp-glass-bg)",
                color: name.trim() ? "#fff" : "var(--dp-text-muted)",
                fontSize: 15,
                fontWeight: 700,
                cursor: name.trim() && !createMutation.isPending ? "pointer" : "not-allowed",
                fontFamily: "inherit",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                boxShadow: name.trim() ? "0 4px 20px rgba(139,92,246,0.3)" : "none",
                transition: "all 0.25s",
                opacity: createMutation.isPending ? 0.7 : 1,
              }}
            >
              {createMutation.isPending
                ? <Loader size={18} strokeWidth={2} style={{ animation: "spin 1s linear infinite" }} />
                : <Users size={18} strokeWidth={2} />
              }
              {createMutation.isPending ? "Creating..." : "Create Circle"}
            </button>
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
