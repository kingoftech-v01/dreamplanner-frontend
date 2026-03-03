import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft, Sparkles, FileText, Shield, CheckCircle,
  ChevronRight, Heart, Download, RefreshCw,
} from "lucide-react";
import PageLayout from "../../components/shared/PageLayout";
import { useTheme } from "../../context/ThemeContext";
import { adaptColor, BRAND } from "../../styles/colors";
import { Capacitor } from "@capacitor/core";
import { apiGet } from "../../services/api";
import { USERS } from "../../services/endpoints";
import IconButton from "../../components/shared/IconButton";
import GlassCard from "../../components/shared/GlassCard";
import GlassAppBar from "../../components/shared/GlassAppBar";

var isNativePlatform = Capacitor.isNativePlatform();

export default function AppVersionScreen() {
  var navigate = useNavigate();
  var { resolved } = useTheme();
  var isLight = resolved === "light";
  var [mounted, setMounted] = useState(false);
  var [checkingUpdate, setCheckingUpdate] = useState(false);
  var [updateStatus, setUpdateStatus] = useState("idle"); // idle | checking | up-to-date | available | installing
  var [platformInfo, setPlatformInfo] = useState({
    platform: "Web (React)",
    version: "1.0.0",
    build: "2026.02.1",
  });
  var waitingSwRef = useRef(null);

  useEffect(function () { setTimeout(function () { setMounted(true); }, 50); }, []);

  // Detect platform + version on mount
  useEffect(function () {
    if (isNativePlatform) {
      import("@capacitor/device").then(function (mod) {
        mod.Device.getInfo().then(function (info) {
          setPlatformInfo({
            platform: (info.platform === "android" ? "Android" : info.platform === "ios" ? "iOS" : info.platform) + " (" + (info.manufacturer || "") + " " + (info.model || "") + ")",
            version: info.appVersion || "1.0.0",
            build: info.appBuild || "1",
          });
        });
      }).catch(function () {});
    }
  }, []);

  // Check for waiting service worker on mount (PWA)
  useEffect(function () {
    if (isNativePlatform || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.getRegistration().then(function (reg) {
      if (reg && reg.waiting) {
        waitingSwRef.current = reg.waiting;
        setUpdateStatus("available");
      }
    });
  }, []);

  var stagger = function (i) {
    return {
      opacity: mounted ? 1 : 0,
      transform: mounted ? "translateY(0)" : "translateY(16px)",
      transition: "all 0.5s cubic-bezier(0.4,0,0.2,1) " + (i * 60) + "ms",
    };
  };

  var handleCheckUpdate = function () {
    if (checkingUpdate) return;
    setCheckingUpdate(true);
    setUpdateStatus("checking");

    if (isNativePlatform) {
      // Native: open Play Store / App Store
      import("@capacitor/browser").then(function (mod) {
        var storeUrl = Capacitor.getPlatform() === "android"
          ? "https://play.google.com/store/apps/details?id=com.dreamplanner.app"
          : "https://apps.apple.com/app/dreamplanner/id0000000000";
        mod.Browser.open({ url: storeUrl });
        setCheckingUpdate(false);
        setUpdateStatus("idle");
      }).catch(function () {
        setCheckingUpdate(false);
        setUpdateStatus("up-to-date");
      });
      return;
    }

    // PWA: check for service worker update
    if (!("serviceWorker" in navigator)) {
      setCheckingUpdate(false);
      setUpdateStatus("up-to-date");
      return;
    }

    navigator.serviceWorker.getRegistration().then(function (reg) {
      if (!reg) {
        setCheckingUpdate(false);
        setUpdateStatus("up-to-date");
        return;
      }

      // If there's already a waiting SW
      if (reg.waiting) {
        waitingSwRef.current = reg.waiting;
        setCheckingUpdate(false);
        setUpdateStatus("available");
        return;
      }

      // Force check for new SW
      reg.update().then(function () {
        // Listen for new SW becoming available
        function onUpdateFound() {
          var newSw = reg.installing;
          if (!newSw) return;

          function onStateChange() {
            if (newSw.state === "installed" && navigator.serviceWorker.controller) {
              // New version ready to install
              waitingSwRef.current = newSw;
              setCheckingUpdate(false);
              setUpdateStatus("available");
              newSw.removeEventListener("statechange", onStateChange);
              reg.removeEventListener("updatefound", onUpdateFound);
            }
          }
          newSw.addEventListener("statechange", onStateChange);
        }

        reg.addEventListener("updatefound", onUpdateFound);

        // Timeout: if no update found within 5s, we're up to date
        setTimeout(function () {
          reg.removeEventListener("updatefound", onUpdateFound);
          setCheckingUpdate(function (current) {
            if (current) setUpdateStatus("up-to-date");
            return false;
          });
        }, 5000);
      }).catch(function () {
        setCheckingUpdate(false);
        setUpdateStatus("up-to-date");
      });
    }).catch(function () {
      setCheckingUpdate(false);
      setUpdateStatus("up-to-date");
    });
  };

  var handleInstallUpdate = function () {
    if (!waitingSwRef.current) return;
    setUpdateStatus("installing");
    waitingSwRef.current.postMessage({ type: "SKIP_WAITING" });
    // controllerchange listener in main.jsx will reload the page
  };

  var updateBtnContent = function () {
    if (updateStatus === "checking" || checkingUpdate) {
      return (
        <>
          <div style={{
            width: 16, height: 16, border: "2px solid rgba(196,181,253,0.2)",
            borderTopColor: "var(--dp-accent)", borderRadius: "50%",
            animation: "dpSpin 0.8s linear infinite",
          }} />
          Checking for updates...
        </>
      );
    }
    if (updateStatus === "available") {
      return (
        <>
          <Download size={16} />
          Update Available — Install Now
        </>
      );
    }
    if (updateStatus === "installing") {
      return (
        <>
          <div style={{
            width: 16, height: 16, border: "2px solid rgba(93,229,168,0.2)",
            borderTopColor: "var(--dp-success)", borderRadius: "50%",
            animation: "dpSpin 0.8s linear infinite",
          }} />
          Installing update...
        </>
      );
    }
    if (updateStatus === "up-to-date") {
      return (
        <>
          <CheckCircle size={16} />
          You're up to date!
        </>
      );
    }
    return (
      <>
        <RefreshCw size={16} />
        {isNativePlatform ? "Check Store for Updates" : "Check for Updates"}
      </>
    );
  };

  var updateBtnColor = function () {
    if (updateStatus === "available") return adaptColor(BRAND.orange, isLight);
    if (updateStatus === "up-to-date") return "var(--dp-success)";
    return "var(--dp-accent)";
  };

  var updateBtnBg = function () {
    if (updateStatus === "available") return "rgba(245,158,11,0.08)";
    if (updateStatus === "up-to-date") return "rgba(93,229,168,0.08)";
    return "rgba(139,92,246,0.1)";
  };

  var updateBtnBorder = function () {
    if (updateStatus === "available") return "1px solid rgba(245,158,11,0.2)";
    if (updateStatus === "up-to-date") return "1px solid rgba(93,229,168,0.2)";
    return "1px solid rgba(139,92,246,0.2)";
  };

  var dashboardQuery = useQuery({
    queryKey: ["dashboard"],
    queryFn: function () { return apiGet(USERS.DASHBOARD); },
    staleTime: 60000,
  });

  var lastSyncLabel = (function () {
    if (!dashboardQuery.dataUpdatedAt || dashboardQuery.dataUpdatedAt === 0) return "Not synced";
    var diff = Math.floor((Date.now() - dashboardQuery.dataUpdatedAt) / 1000);
    if (diff < 10) return "Just now";
    if (diff < 60) return diff + "s ago";
    if (diff < 3600) return Math.floor(diff / 60) + "m ago";
    return Math.floor(diff / 3600) + "h ago";
  })();

  var apiVersionLabel = (function () {
    if (!dashboardQuery.data) return "v" + platformInfo.version;
    var meta = dashboardQuery.data.meta || dashboardQuery.data;
    return meta.apiVersion || meta.api_version || "v" + platformInfo.version;
  })();

  var infoItems = [
    { label: "Platform", value: platformInfo.platform },
    { label: "Environment", value: "Production" },
    { label: "API Version", value: apiVersionLabel },
    { label: "Last Sync", value: lastSyncLabel },
  ];

  return (
    <PageLayout showNav={false} header={
      <GlassAppBar
        left={<IconButton icon={ArrowLeft} onClick={function () { navigate(-1); }} />}
        title="About"
      />
    }>
      <div style={{ paddingBottom: 40 }}>

        {/* App Icon & Name */}
        <div style={{ textAlign: "center", marginBottom: 32, ...stagger(1) }}>
          <div style={{
            width: 88, height: 88, borderRadius: 24, margin: "0 auto 16px",
            background: "linear-gradient(135deg, rgba(139,92,246,0.3), rgba(196,181,253,0.15))",
            border: "2px solid rgba(139,92,246,0.3)", display: "flex", alignItems: "center",
            justifyContent: "center", boxShadow: "0 0 50px rgba(139,92,246,0.2)",
          }}>
            <Sparkles size={36} color="var(--dp-accent)" />
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--dp-text)", margin: "0 0 4px", letterSpacing: "-0.5px" }}>
            DreamPlanner
          </h1>
          <p style={{ fontSize: 14, color: "var(--dp-text-tertiary)", margin: "0 0 2px" }}>
            Version {platformInfo.version}
          </p>
          <p style={{ fontSize: 12, color: "var(--dp-text-muted)", margin: 0 }}>
            Build {platformInfo.build}
          </p>
        </div>

        {/* Check for Updates */}
        <div style={{ marginBottom: 24, ...stagger(2) }}>
          <button
            onClick={updateStatus === "available" ? handleInstallUpdate : handleCheckUpdate}
            disabled={checkingUpdate || updateStatus === "installing"}
            style={{
              width: "100%", padding: "14px 16px", borderRadius: 16,
              background: updateBtnBg(),
              border: updateBtnBorder(),
              cursor: (checkingUpdate || updateStatus === "installing") ? "default" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              fontFamily: "inherit", fontSize: 14, fontWeight: 600,
              color: updateBtnColor(),
              transition: "all 0.3s",
            }}
          >
            {updateBtnContent()}
          </button>
        </div>

        {/* Info Cards */}
        <div style={{ marginBottom: 24, ...stagger(3) }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "var(--dp-text-muted)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>
            Information
          </div>
          {infoItems.map(function (item, i) {
            return (
              <GlassCard key={i} padding="12px 16px" radius={14} mb={4} style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
              }}>
                <span style={{ fontSize: 13, color: "var(--dp-text-secondary)" }}>{item.label}</span>
                <span style={{ fontSize: 13, fontWeight: 500, color: "var(--dp-text-primary)" }}>{item.value}</span>
              </GlassCard>
            );
          })}
        </div>

        {/* Links */}
        <div style={{ marginBottom: 24, ...stagger(4) }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "var(--dp-text-muted)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>
            Legal
          </div>
          {[
            { icon: FileText, label: "Terms of Service", route: "/terms" },
            { icon: Shield, label: "Privacy Policy", route: "/privacy" },
          ].map(function (item, i) {
            var I = item.icon;
            return (
              <GlassCard key={i} hover onClick={function () { navigate(item.route); }} padding="12px 16px" radius={14} mb={4} style={{
                display: "flex", alignItems: "center", gap: 12,
                cursor: "pointer",
              }}>
                <I size={16} color="var(--dp-text-tertiary)" />
                <span style={{ flex: 1, fontSize: 13, color: "var(--dp-text-primary)", fontWeight: 500 }}>{item.label}</span>
                <ChevronRight size={16} color="var(--dp-text-muted)" />
              </GlassCard>
            );
          })}
        </div>

        {/* Footer */}
        <div style={{ textAlign: "center", marginTop: 32, ...stagger(5) }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4, marginBottom: 6 }}>
            <span style={{ fontSize: 12, color: "var(--dp-text-muted)" }}>Made with</span>
            <Heart size={12} color="var(--dp-danger)" fill="var(--dp-danger)" />
            <span style={{ fontSize: 12, color: "var(--dp-text-muted)" }}>for dreamers</span>
          </div>
          <p style={{ fontSize: 11, color: "var(--dp-text-muted)", margin: 0 }}>
            &copy; 2026 DreamPlanner. All rights reserved.
          </p>
        </div>
      </div>

      <style>{"@keyframes dpSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }"}</style>
    </PageLayout>
  );
}
