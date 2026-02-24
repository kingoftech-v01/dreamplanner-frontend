import { createContext, useContext, useState, useEffect } from "react";
import { getNetworkStatus, addNetworkListener } from "../services/native";

var NetworkContext = createContext({ isOnline: true });

export function useNetwork() {
  return useContext(NetworkContext);
}

export function NetworkProvider({ children }) {
  var [isOnline, setIsOnline] = useState(true);

  useEffect(function () {
    // Get initial status
    getNetworkStatus().then(function (status) {
      setIsOnline(status.connected);
    });

    // Listen for changes (works on both native and web)
    var listenerHandle = null;
    addNetworkListener(function (status) {
      setIsOnline(status.connected);
    }).then(function (handle) {
      listenerHandle = handle;
    });

    return function () {
      if (listenerHandle && listenerHandle.remove) {
        listenerHandle.remove();
      }
    };
  }, []);

  return (
    <NetworkContext.Provider value={{ isOnline: isOnline }}>
      {children}
    </NetworkContext.Provider>
  );
}
