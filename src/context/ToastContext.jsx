import { createContext, useContext, useState, useCallback, useRef } from "react";
import Toast from "../components/shared/Toast";

var ToastContext = createContext(null);

export function useToast() {
  var ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

export function ToastProvider({ children }) {
  var [toasts, setToasts] = useState([]);
  var idRef = useRef(0);

  var showToast = useCallback(function (message, type, duration) {
    if (!type) type = "info";
    if (!duration) duration = 3000;
    var id = ++idRef.current;
    setToasts(function (prev) {
      var next = prev.concat({ id: id, message: message, type: type, duration: duration });
      if (next.length > 3) next = next.slice(next.length - 3);
      return next;
    });
    setTimeout(function () {
      setToasts(function (prev) { return prev.filter(function (t) { return t.id !== id; }); });
    }, duration);
  }, []);

  var dismissToast = useCallback(function (id) {
    setToasts(function (prev) { return prev.filter(function (t) { return t.id !== id; }); });
  }, []);

  return (
    <ToastContext.Provider value={{ showToast: showToast }}>
      {children}
      <Toast toasts={toasts} onDismiss={dismissToast} />
    </ToastContext.Provider>
  );
}
