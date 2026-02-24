import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "../services/api";

/**
 * Infinite-scroll hook for paginated DRF endpoints.
 *
 * Uses LimitOffsetPagination: ?limit=N&offset=M
 * Auto-loads more data when a sentinel element becomes visible.
 *
 * @param {Object} opts
 * @param {Array}  opts.queryKey   — React Query cache key
 * @param {string} opts.url        — API endpoint (may already contain query params)
 * @param {number} [opts.limit=20] — Items per page
 * @param {boolean} [opts.enabled=true]
 * @returns {{ items, isLoading, isError, error, hasMore, loadingMore, sentinelRef, refetch }}
 */
export default function useInfiniteList(opts) {
  var queryKey = opts.queryKey;
  var url = opts.url;
  var limit = opts.limit || 20;
  var enabled = opts.enabled !== false;

  var [items, setItems] = useState([]);
  var [hasMore, setHasMore] = useState(false);
  var [loadingMore, setLoadingMore] = useState(false);

  // Refs to avoid stale closures in IntersectionObserver callback
  var offsetRef = useRef(0);
  var hasMoreRef = useRef(false);
  var loadingMoreRef = useRef(false);
  var sentinelRef = useRef(null);

  // First page via React Query (cached, auto-refetched)
  var sep = url.includes("?") ? "&" : "?";
  var firstPage = useQuery({
    queryKey: queryKey,
    queryFn: function () {
      return apiGet(url + sep + "limit=" + limit);
    },
    enabled: enabled,
  });

  // Sync first-page results into local state
  useEffect(function () {
    if (!firstPage.data) return;
    var results = firstPage.data.results || firstPage.data;
    if (!Array.isArray(results)) results = [];
    setItems(results);
    offsetRef.current = results.length;
    var more = !!firstPage.data.next;
    setHasMore(more);
    hasMoreRef.current = more;
  }, [firstPage.data]);

  // Stable loadMore — refs guarantee fresh values
  var loadMore = useCallback(function () {
    if (loadingMoreRef.current || !hasMoreRef.current) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);

    var joiner = url.includes("?") ? "&" : "?";
    apiGet(url + joiner + "limit=" + limit + "&offset=" + offsetRef.current)
      .then(function (data) {
        var results = data.results || data;
        if (!Array.isArray(results)) results = [];
        if (results.length > 0) {
          setItems(function (prev) { return prev.concat(results); });
          offsetRef.current += results.length;
        }
        var more = !!data.next;
        setHasMore(more);
        hasMoreRef.current = more;
      })
      .catch(function () {})
      .finally(function () {
        loadingMoreRef.current = false;
        setLoadingMore(false);
      });
  }, [url, limit]);

  // Auto-load when sentinel scrolls into view
  useEffect(function () {
    var el = sentinelRef.current;
    if (!el) return;
    var observer = new IntersectionObserver(
      function (entries) {
        if (entries[0].isIntersecting) loadMore();
      },
      { rootMargin: "300px" }
    );
    observer.observe(el);
    return function () { observer.disconnect(); };
  }, [loadMore]);

  // Reset helper — used by pull-to-refresh or manual refetch
  function refetch() {
    offsetRef.current = 0;
    hasMoreRef.current = false;
    loadingMoreRef.current = false;
    setItems([]);
    setHasMore(false);
    setLoadingMore(false);
    return firstPage.refetch();
  }

  return {
    items: items,
    isLoading: firstPage.isLoading,
    isError: firstPage.isError,
    error: firstPage.error,
    hasMore: hasMore,
    loadingMore: loadingMore,
    sentinelRef: sentinelRef,
    refetch: refetch,
  };
}
