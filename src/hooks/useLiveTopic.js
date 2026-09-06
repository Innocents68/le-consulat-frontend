import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { subscribeWs, isWsConnected } from '../lib/ws';

/**
 * Subscribes to a STOMP topic and invalidates the given query keys whenever a
 * message arrives. Also polls (refetch) every `pollMs` as a fallback in case the
 * WebSocket never connects (contract §4: "en repli, polling REST toutes les 5s").
 */
export function useLiveTopic(topic, queryKeys, { pollMs = 5000 } = {}) {
  const queryClient = useQueryClient();
  const [connected, setConnected] = useState(false);
  const keysRef = useRef(queryKeys);
  keysRef.current = queryKeys;

  useEffect(() => {
    const unsubscribe = subscribeWs(topic, () => {
      keysRef.current.forEach((key) => queryClient.invalidateQueries({ queryKey: key }));
    });

    const checkInterval = setInterval(() => setConnected(isWsConnected()), 2000);

    const pollInterval = setInterval(() => {
      if (!isWsConnected()) {
        keysRef.current.forEach((key) => queryClient.invalidateQueries({ queryKey: key }));
      }
    }, pollMs);

    return () => {
      unsubscribe();
      clearInterval(checkInterval);
      clearInterval(pollInterval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topic]);

  return { connected };
}
