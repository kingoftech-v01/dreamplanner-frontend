// ═══════════════════════════════════════════════════════════════
// DreamPlanner — Native Bridge (Capacitor plugin wrappers)
//
// Every function detects native vs web and uses the right API.
// Dynamic imports ensure web builds never bundle native plugins.
// ═══════════════════════════════════════════════════════════════

import { Capacitor } from "@capacitor/core";

var isNative = Capacitor.isNativePlatform();

// ── Clipboard ─────────────────────────────────────────────────

export function clipboardWrite(text) {
  if (isNative) {
    return import("@capacitor/clipboard").then(function (mod) {
      return mod.Clipboard.write({ string: text });
    });
  }
  if (navigator.clipboard && navigator.clipboard.writeText) {
    return navigator.clipboard.writeText(text);
  }
  return Promise.resolve();
}

// ── Haptics ───────────────────────────────────────────────────

var VIBRATE_MAP = { Light: 10, Medium: 25, Heavy: [30, 20, 30] };

export function hapticImpact(style) {
  if (isNative) {
    return import("@capacitor/haptics").then(function (mod) {
      return mod.Haptics.impact({ style: mod.ImpactStyle[style || "Light"] });
    });
  }
  if (navigator.vibrate) navigator.vibrate(VIBRATE_MAP[style || "Light"] || 10);
  return Promise.resolve();
}

export function hapticVibrate(pattern) {
  if (isNative) {
    return import("@capacitor/haptics").then(function (mod) {
      var duration = Array.isArray(pattern)
        ? pattern.reduce(function (a, b) { return a + b; }, 0)
        : pattern || 200;
      return mod.Haptics.vibrate({ duration: duration });
    });
  }
  if (navigator.vibrate) navigator.vibrate(pattern);
  return Promise.resolve();
}

export function hapticStop() {
  if (!isNative && navigator.vibrate) navigator.vibrate(0);
  return Promise.resolve();
}

// ── Share ─────────────────────────────────────────────────────

export function nativeShare(options) {
  if (isNative) {
    return import("@capacitor/share").then(function (mod) {
      return mod.Share.share({
        title: options.title || "",
        text: options.text || "",
        url: options.url || "",
        dialogTitle: options.dialogTitle || "Share",
      });
    });
  }
  if (navigator.share) return navigator.share(options);
  return Promise.reject(new Error("Share not supported"));
}

// ── Browser (OAuth, external links) ──────────────────────────

export function openBrowser(url) {
  if (isNative) {
    return import("@capacitor/browser").then(function (mod) {
      return mod.Browser.open({ url: url, presentationStyle: "popover" });
    });
  }
  window.open(url, "_blank");
  return Promise.resolve();
}

export function closeBrowser() {
  if (isNative) {
    return import("@capacitor/browser").then(function (mod) {
      return mod.Browser.close();
    });
  }
  return Promise.resolve();
}

export function addBrowserListener(event, handler) {
  if (isNative) {
    return import("@capacitor/browser").then(function (mod) {
      return mod.Browser.addListener(event, handler);
    });
  }
  return Promise.resolve({ remove: function () {} });
}

// ── Filesystem (file downloads) ──────────────────────────────

export function saveBlobFile(blob, fileName) {
  if (isNative) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onloadend = function () {
        var base64 = reader.result.split(",")[1];
        import("@capacitor/filesystem").then(function (mod) {
          mod.Filesystem.writeFile({
            path: fileName,
            data: base64,
            directory: mod.Directory.Documents,
          }).then(resolve).catch(reject);
        });
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }
  // Web fallback: anchor click download
  var url = URL.createObjectURL(blob);
  var a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  return Promise.resolve();
}

// ── Camera (avatar / cover uploads) ──────────────────────────

export function takePicture(options) {
  if (isNative) {
    return import("@capacitor/camera").then(function (mod) {
      return mod.Camera.getPhoto({
        quality: (options && options.quality) || 80,
        resultType: mod.CameraResultType.DataUrl,
        source: (options && options.source) === "gallery"
          ? mod.CameraSource.Photos
          : mod.CameraSource.Camera,
        width: (options && options.width) || 800,
        height: (options && options.height) || 800,
      });
    });
  }
  // Web: return null so caller falls back to <input type="file">
  return Promise.resolve(null);
}

export function pickPhoto(options) {
  if (isNative) {
    return import("@capacitor/camera").then(function (mod) {
      return mod.Camera.getPhoto({
        quality: (options && options.quality) || 80,
        resultType: mod.CameraResultType.DataUrl,
        source: mod.CameraSource.Photos,
        width: (options && options.width) || 800,
        height: (options && options.height) || 800,
      });
    });
  }
  return Promise.resolve(null);
}

// ── Wake Lock ─────────────────────────────────────────────────

export function acquireWakeLock() {
  if (isNative) {
    return import("@capacitor-community/keep-awake").then(function (mod) {
      return mod.KeepAwake.keepAwake();
    });
  }
  if ("wakeLock" in navigator) {
    return navigator.wakeLock.request("screen");
  }
  return Promise.resolve(null);
}

export function releaseWakeLock(lockRef) {
  if (isNative) {
    return import("@capacitor-community/keep-awake").then(function (mod) {
      return mod.KeepAwake.allowSleep();
    });
  }
  if (lockRef && lockRef.release) return lockRef.release();
  return Promise.resolve();
}

// ── Network ───────────────────────────────────────────────────

export function getNetworkStatus() {
  if (isNative) {
    return import("@capacitor/network").then(function (mod) {
      return mod.Network.getStatus();
    });
  }
  return Promise.resolve({ connected: navigator.onLine, connectionType: "unknown" });
}

export function addNetworkListener(handler) {
  if (isNative) {
    return import("@capacitor/network").then(function (mod) {
      return mod.Network.addListener("networkStatusChange", handler);
    });
  }
  // Web fallback
  var onlineHandler = function () { handler({ connected: true }); };
  var offlineHandler = function () { handler({ connected: false }); };
  window.addEventListener("online", onlineHandler);
  window.addEventListener("offline", offlineHandler);
  return Promise.resolve({
    remove: function () {
      window.removeEventListener("online", onlineHandler);
      window.removeEventListener("offline", offlineHandler);
    },
  });
}

// ── Keyboard ──────────────────────────────────────────────────

export function setupKeyboard() {
  if (isNative) {
    return import("@capacitor/keyboard").then(function (mod) {
      mod.Keyboard.setAccessoryBarVisible({ isVisible: true });
      return mod.Keyboard;
    });
  }
  return Promise.resolve(null);
}

// ── Platform check re-export ─────────────────────────────────

export { isNative };
