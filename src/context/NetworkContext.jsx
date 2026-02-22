import { createContext, useContext, useState, useEffect } from "react";

var NetworkContext = createContext({ isOnline: true });

export function useNetwork() {
  return useContext(NetworkContext);
}

export function NetworkProvider({ children }) {
  var [isOnline, setIsOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );

  useEffect(function () {
    function goOnline() { setIsOnline(true); }
    function goOffline() { setIsOnline(false); }
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return function () {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  return (
    <NetworkContext.Provider value={{ isOnline: isOnline }}>
      {children}
    </NetworkContext.Provider>
  );
}
