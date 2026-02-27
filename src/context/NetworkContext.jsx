import { createContext, useContext, useState, useEffect } from "react";
import { getNetworkStatus, addNetworkListener } from "../services/native";
import { flushOfflineQueue, getOfflineQueueCount } from "../services/api";

var NetworkContext = createContext({ isOnline: true, queueCount: 0 });

export function useNetwork() {
  return useContext(NetworkContext);
}

export function NetworkProvider({ children }) {
  var [isOnline, setIsOnline] = useState(true);
  var [queueCount, setQueueCount] = useState(getOfflineQueueCount());

  useEffect(function () {
    // Get initial status
    getNetworkStatus().then(function (status) {
      setIsOnline(status.connected);
    });

    // Listen for changes (works on both native and web)
    var listenerHandle = null;
    addNetworkListener(function (status) {
      setIsOnline(status.connected);
      // Flush queued mutations when coming back online
      if (status.connected) {
        flushOfflineQueue();
      }
    }).then(function (handle) {
      listenerHandle = handle;
    });

    // Listen for queue changes to keep count in sync
    function onQueueChange(e) {
      setQueueCount(e.detail ? e.detail.count : getOfflineQueueCount());
    }
    window.addEventListener("dp-offline-queue-change", onQueueChange);

    return function () {
      if (listenerHandle && listenerHandle.remove) {
        listenerHandle.remove();
      }
      window.removeEventListener("dp-offline-queue-change", onQueueChange);
    };
  }, []);

  return (
    <NetworkContext.Provider value={{ isOnline: isOnline, queueCount: queueCount }}>
      {children}
    </NetworkContext.Provider>
  );
}
