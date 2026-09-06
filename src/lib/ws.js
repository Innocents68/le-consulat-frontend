import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { API_URL } from './api';
import { useAuthStore } from '../store/authStore';

// Base URL for the WS endpoint is the API host without the /api/v1 suffix, per contract: `/ws` (SockJS).
const WS_BASE = API_URL.replace(/\/api\/v1\/?$/, '');

let client = null;
let refCount = 0;
const subscriptions = new Map(); // topic -> Set<callback>

function ensureClient() {
  if (client) return client;
  client = new Client({
    // Restrict to modern transports: the legacy iframe-based fallbacks (htmlfile, iframe-xhr-polling...)
    // rely on an `unload` handler that recent Chrome blocks via Permissions-Policy, spamming the console
    // with "unload is not allowed in this document" without changing actual behavior.
    webSocketFactory: () => new SockJS(`${WS_BASE}/ws`, null, { transports: ['websocket', 'xhr-streaming', 'xhr-polling'] }),
    connectHeaders: () => {
      const token = useAuthStore.getState().token;
      return token ? { Authorization: `Bearer ${token}` } : {};
    },
    reconnectDelay: 4000,
    heartbeatIncoming: 10000,
    heartbeatOutgoing: 10000,
    onConnect: () => {
      for (const [topic] of subscriptions) {
        subscribeTopic(topic);
      }
    },
    onStompError: () => {},
    onWebSocketError: () => {},
  });
  client.activate();
  return client;
}

const stompSubs = new Map(); // topic -> stomp subscription

function subscribeTopic(topic) {
  if (!client || !client.connected) return;
  if (stompSubs.has(topic)) return;
  const sub = client.subscribe(topic, (message) => {
    const callbacks = subscriptions.get(topic);
    if (!callbacks) return;
    let payload = message.body;
    try {
      payload = JSON.parse(message.body);
    } catch {
      // leave as raw string
    }
    callbacks.forEach((cb) => cb(payload));
  });
  stompSubs.set(topic, sub);
}

/**
 * Subscribe to a STOMP topic (e.g. /topic/commandes, /topic/tables, /topic/cuisine).
 * Returns an unsubscribe function. If the socket never connects, the caller's
 * polling fallback (see usePollingFallback) keeps data fresh regardless.
 */
export function subscribeWs(topic, callback) {
  refCount += 1;
  ensureClient();
  if (!subscriptions.has(topic)) subscriptions.set(topic, new Set());
  subscriptions.get(topic).add(callback);
  if (client?.connected) subscribeTopic(topic);

  return () => {
    const set = subscriptions.get(topic);
    if (set) {
      set.delete(callback);
      if (set.size === 0) {
        subscriptions.delete(topic);
        const sub = stompSubs.get(topic);
        if (sub) {
          try { sub.unsubscribe(); } catch { /* noop */ }
          stompSubs.delete(topic);
        }
      }
    }
    refCount -= 1;
    if (refCount <= 0 && client) {
      client.deactivate();
      client = null;
      stompSubs.clear();
      subscriptions.clear();
      refCount = 0;
    }
  };
}

export function isWsConnected() {
  return !!client?.connected;
}
