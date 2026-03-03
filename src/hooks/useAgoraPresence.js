import { useState, useEffect, useRef } from "react";
import { subscribePresence, unsubscribePresence, queryPresence, onPresenceChange } from "../services/agora";

/**
 * Hook that tracks real-time online/offline status for a list of user IDs
 * via Agora RTM Presence.
 *
 * @param {string[]} userIds - array of user ID strings to track
 * @returns {Object} map of userId -> boolean (true = online)
 */
export default function useAgoraPresence(userIds) {
  var [statusMap, setStatusMap] = useState({});
  var prevIdsRef = useRef("");

  useEffect(function () {
    if (!userIds || userIds.length === 0) return;

    var ids = userIds.map(String);
    var idsKey = ids.join(",");

    // Avoid re-subscribing if same IDs
    if (idsKey === prevIdsRef.current) return;
    prevIdsRef.current = idsKey;

    // Initial query
    queryPresence(ids).then(function (result) {
      if (result && Object.keys(result).length > 0) {
        setStatusMap(function (prev) { return Object.assign({}, prev, result); });
      }
    });

    // Subscribe for real-time updates
    subscribePresence(ids);

    // Listen for changes
    var unsub = onPresenceChange(function (changes) {
      setStatusMap(function (prev) { return Object.assign({}, prev, changes); });
    });

    return function () {
      unsub();
      unsubscribePresence(ids);
      prevIdsRef.current = "";
    };
  }, [userIds ? userIds.join(",") : ""]);

  return statusMap;
}
