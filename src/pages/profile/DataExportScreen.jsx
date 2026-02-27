import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Download, FileJson, FileSpreadsheet, Shield, Info, Loader, CheckCircle, Clock, FileText, Database } from "lucide-react";
import PageLayout from "../../components/shared/PageLayout";
import { useTheme } from "../../context/ThemeContext";
import { useToast } from "../../context/ToastContext";
import { apiGet } from "../../services/api";
import { USERS } from "../../services/endpoints";
import { saveBlobFile } from "../../services/native";

var glassStyle = {
  background: "var(--dp-glass-bg)",
  backdropFilter: "blur(40px)",
  WebkitBackdropFilter: "blur(40px)",
  border: "1px solid var(--dp-input-border)",
  borderRadius: 20,
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)",
};

var EXPORT_FORMATS = [
  { id: "json", label: "JSON", description: "Structured data format, ideal for developers", icon: FileJson, color: "#8B5CF6" },
  { id: "csv", label: "CSV", description: "Spreadsheet compatible, great for analysis", icon: FileSpreadsheet, color: "#10B981" },
];

var DATA_CATEGORIES = [
  {
    icon: FileText,
    title: "Dreams & Goals",
    description: "All your dreams, milestones, progress logs, and associated notes",
  },
  {
    icon: Database,
    title: "Profile & Settings",
    description: "Your profile information, preferences, timezone, and notification settings",
  },
  {
    icon: Clock,
    title: "Activity History",
    description: "Task completions, streaks, XP earned, achievements, and calendar events",
  },
];

export default function DataExportScreen() {
  var navigate = useNavigate();
  var { resolved } = useTheme(); var isLight = resolved === "light";
  var { showToast } = useToast();

  var [mounted, setMounted] = useState(false);
  var [selectedFormat, setSelectedFormat] = useState("json");
  var [isExporting, setIsExporting] = useState(false);
  var [exportProgress, setExportProgress] = useState(0);
  var [exportDone, setExportDone] = useState(false);

  useEffect(function () {
    var timer = setTimeout(function () { setMounted(true); }, 50);
    return function () { clearTimeout(timer); };
  }, []);

  var handleExport = function () {
    if (isExporting) return;
    setIsExporting(true);
    setExportProgress(0);
    setExportDone(false);

    // Simulate progress while waiting for the download
    var progressInterval = setInterval(function () {
      setExportProgress(function (prev) {
        if (prev >= 90) return prev;
        return prev + Math.random() * 15;
      });
    }, 300);

    apiGet(USERS.EXPORT_DATA + "?format=" + selectedFormat, { responseType: "blob" })
      .then(function (blob) {
        clearInterval(progressInterval);
        setExportProgress(100);

        // Download file (native: saves to Documents, web: anchor download)
        var exportFileName = "dreamplanner-export-" + new Date().toISOString().slice(0, 10) + "." + selectedFormat;
        saveBlobFile(blob, exportFileName);

        setExportDone(true);
        showToast("Data exported successfully!", "success");

        // Reset state after a delay
        setTimeout(function () {
          setIsExporting(false);
          setExportProgress(0);
          setExportDone(false);
        }, 3000);
      })
      .catch(function (err) {
        clearInterval(progressInterval);
        setIsExporting(false);
        setExportProgress(0);
        if (err.status === 429) {
          showToast("Export limit reached. Please try again later.", "error");
        } else {
          showToast(err.message || "Failed to export data", "error");
        }
      });
  };

  return (
    <PageLayout>
      <style>{"\n        @keyframes progressPulse {\n          0%, 100% { opacity: 1; }\n          50% { opacity: 0.7; }\n        }\n        @keyframes checkBounce {\n          0% { transform: scale(0); }\n          50% { transform: scale(1.2); }\n          100% { transform: scale(1); }\n        }\n        @keyframes spin {\n          from { transform: rotate(0deg); }\n          to { transform: rotate(360deg); }\n        }\n      "}</style>

      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", gap: 16,
        paddingTop: 16, paddingBottom: 16,
        opacity: mounted ? 1 : 0, transform: mounted ? "translateY(0)" : "translateY(-10px)",
        transition: "all 0.5s cubic-bezier(0.4, 0, 0.2, 1)",
      }}>
        <button className="dp-ib" onClick={function () { navigate(-1); }}>
          <ArrowLeft size={20} strokeWidth={2} />
        </button>
        <h1 style={{
          fontSize: 24, fontWeight: 700, color: "var(--dp-text)",
          fontFamily: "Inter, sans-serif", margin: 0,
        }}>
          Export Data
        </h1>
      </div>

      {/* Info card explaining what data can be exported */}
      <div style={{
        ...glassStyle, borderRadius: 16, padding: 20, marginBottom: 16,
        opacity: mounted ? 1 : 0, transform: mounted ? "translateY(0)" : "translateY(10px)",
        transition: "all 0.5s cubic-bezier(0.4, 0, 0.2, 1) 0.08s",
      }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 12, marginBottom: 14,
        }}>
          <div style={{
            width: 44, height: 44, borderRadius: 14, flexShrink: 0,
            background: "linear-gradient(135deg, rgba(139,92,246,0.2), rgba(109,40,217,0.1))",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Info size={22} color="#8B5CF6" />
          </div>
          <div>
            <div style={{
              fontSize: 16, fontWeight: 700, color: "var(--dp-text)",
              fontFamily: "Inter, sans-serif",
            }}>
              What is included
            </div>
            <div style={{
              fontSize: 12, color: "var(--dp-text-secondary)",
              fontFamily: "Inter, sans-serif", marginTop: 2,
            }}>
              Download a complete copy of your DreamPlanner data
            </div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {DATA_CATEGORIES.map(function (cat, index) {
            var Icon = cat.icon;
            return (
              <div
                key={index}
                style={{
                  display: "flex", alignItems: "flex-start", gap: 12,
                  padding: "10px 12px", borderRadius: 12,
                  background: "var(--dp-surface)",
                  border: "1px solid var(--dp-input-border)",
                }}
              >
                <div style={{
                  width: 32, height: 32, borderRadius: 10, flexShrink: 0,
                  background: isLight ? "rgba(139,92,246,0.08)" : "rgba(139,92,246,0.12)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <Icon size={16} color="#8B5CF6" />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontSize: 13, fontWeight: 600, color: "var(--dp-text)",
                    fontFamily: "Inter, sans-serif", marginBottom: 2,
                  }}>
                    {cat.title}
                  </div>
                  <div style={{
                    fontSize: 12, color: "var(--dp-text-muted)",
                    fontFamily: "Inter, sans-serif", lineHeight: 1.4,
                  }}>
                    {cat.description}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Export format selection */}
      <div style={{
        marginBottom: 16,
        opacity: mounted ? 1 : 0, transform: mounted ? "translateY(0)" : "translateY(10px)",
        transition: "all 0.5s cubic-bezier(0.4, 0, 0.2, 1) 0.15s",
      }}>
        <div style={{
          fontSize: 13, fontWeight: 600, color: "var(--dp-text-secondary)",
          fontFamily: "Inter, sans-serif", marginBottom: 10,
        }}>
          Export Format
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {EXPORT_FORMATS.map(function (format) {
            var Icon = format.icon;
            var isSelected = selectedFormat === format.id;
            return (
              <button
                key={format.id}
                onClick={function () { if (!isExporting) setSelectedFormat(format.id); }}
                disabled={isExporting}
                style={{
                  display: "flex", alignItems: "center", gap: 14,
                  padding: "16px 18px", width: "100%", textAlign: "left",
                  ...glassStyle,
                  borderRadius: 16,
                  border: isSelected
                    ? "1px solid " + format.color + "40"
                    : "1px solid var(--dp-input-border)",
                  background: isSelected
                    ? format.color + "08"
                    : "var(--dp-glass-bg)",
                  cursor: isExporting ? "not-allowed" : "pointer",
                  transition: "all 0.25s ease",
                  opacity: isExporting && !isSelected ? 0.5 : 1,
                }}
              >
                <div style={{
                  width: 44, height: 44, borderRadius: 14, flexShrink: 0,
                  background: format.color + "15",
                  border: "1px solid " + format.color + "25",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <Icon size={22} color={format.color} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontSize: 15, fontWeight: 600, color: "var(--dp-text)",
                    fontFamily: "Inter, sans-serif", marginBottom: 2,
                  }}>
                    {format.label}
                  </div>
                  <div style={{
                    fontSize: 12, color: "var(--dp-text-muted)",
                    fontFamily: "Inter, sans-serif",
                  }}>
                    {format.description}
                  </div>
                </div>
                {/* Radio indicator */}
                <div style={{
                  width: 22, height: 22, borderRadius: 11, flexShrink: 0,
                  border: isSelected
                    ? "2px solid " + format.color
                    : "2px solid var(--dp-input-border)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "all 0.25s ease",
                }}>
                  {isSelected && (
                    <div style={{
                      width: 12, height: 12, borderRadius: 6,
                      background: format.color,
                    }} />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Download progress indicator */}
      {isExporting && (
        <div style={{
          ...glassStyle, borderRadius: 16, padding: 18, marginBottom: 16,
        }}>
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            marginBottom: 10,
          }}>
            <div style={{
              display: "flex", alignItems: "center", gap: 8,
              fontSize: 13, fontWeight: 600, color: "var(--dp-text)",
              fontFamily: "Inter, sans-serif",
            }}>
              {exportDone ? (
                <CheckCircle
                  size={18}
                  color="#10B981"
                  style={{ animation: "checkBounce 0.4s ease" }}
                />
              ) : (
                <Loader
                  size={18}
                  color="#8B5CF6"
                  style={{ animation: "spin 1s linear infinite" }}
                />
              )}
              {exportDone ? "Export complete!" : "Preparing your data..."}
            </div>
            <span style={{
              fontSize: 12, fontWeight: 600, color: "var(--dp-text-muted)",
              fontFamily: "Inter, sans-serif",
            }}>
              {Math.round(exportProgress)}%
            </span>
          </div>
          {/* Progress bar */}
          <div style={{
            height: 6, borderRadius: 3,
            background: "var(--dp-surface)",
            overflow: "hidden",
          }}>
            <div style={{
              height: "100%", borderRadius: 3,
              width: Math.round(exportProgress) + "%",
              background: exportDone
                ? "linear-gradient(90deg, #10B981, #059669)"
                : "linear-gradient(90deg, #8B5CF6, #6D28D9)",
              transition: "width 0.3s ease, background 0.3s ease",
              animation: !exportDone ? "progressPulse 1.5s ease-in-out infinite" : "none",
            }} />
          </div>
        </div>
      )}

      {/* Export button */}
      <div style={{
        marginBottom: 16,
        opacity: mounted ? 1 : 0, transform: mounted ? "translateY(0)" : "translateY(10px)",
        transition: "all 0.5s cubic-bezier(0.4, 0, 0.2, 1) 0.2s",
      }}>
        <button
          onClick={handleExport}
          disabled={isExporting}
          style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            padding: "16px 0", width: "100%", borderRadius: 16,
            background: isExporting
              ? "var(--dp-surface-hover)"
              : "linear-gradient(135deg, #8B5CF6, #6D28D9)",
            border: "none",
            color: "#fff", fontSize: 16, fontWeight: 700, fontFamily: "Inter, sans-serif",
            cursor: isExporting ? "not-allowed" : "pointer",
            opacity: isExporting ? 0.6 : 1,
            boxShadow: isExporting ? "none" : "0 4px 20px rgba(139,92,246,0.3)",
            transition: "all 0.25s ease",
          }}
        >
          <Download size={20} />
          {isExporting ? "Exporting..." : "Export My Data"}
        </button>
      </div>

      {/* Privacy note card */}
      <div style={{
        ...glassStyle, borderRadius: 16, padding: 18,
        opacity: mounted ? 1 : 0, transform: mounted ? "translateY(0)" : "translateY(10px)",
        transition: "all 0.5s cubic-bezier(0.4, 0, 0.2, 1) 0.25s",
      }}>
        <div style={{
          display: "flex", alignItems: "flex-start", gap: 12,
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: 12, flexShrink: 0,
            background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Shield size={18} color="#10B981" />
          </div>
          <div>
            <div style={{
              fontSize: 15, fontWeight: 600, color: "var(--dp-text)",
              fontFamily: "Inter, sans-serif", marginBottom: 6,
            }}>
              Your data, your control
            </div>
            <div style={{
              fontSize: 13, color: "var(--dp-text-secondary)",
              fontFamily: "Inter, sans-serif", lineHeight: 1.6,
            }}>
              We believe in full data portability. You can export all of your data at any time. Your export is generated on-demand and downloaded directly to your device. No data is shared with third parties during this process.
            </div>
          </div>
        </div>
      </div>

      {/* Bottom spacer */}
      <div style={{ height: 32 }} />
    </PageLayout>
  );
}
