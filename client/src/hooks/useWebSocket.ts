import { useEffect, useRef, useCallback, useState } from "react";

export interface WSMessage {
  type: "collaboration-update" | "training-progress" | "api-result" | "presence" | "sync";
  data: any;
  timestamp: number;
  userId?: string;
}

export interface UseWebSocketOptions {
  url?: string;
  autoConnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const {
    url = `${window.location.protocol === "https:" ? "wss:" : "ws:"}//${window.location.host}/ws`,
    autoConnect = true,
    reconnectInterval = 3000,
    maxReconnectAttempts = 5,
  } = options;

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WSMessage | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const connect = useCallback(() => {
    try {
      const ws = new WebSocket(url);

      ws.onopen = () => {
        console.log("[WebSocket] Connected");
        setIsConnected(true);
        setError(null);
        reconnectAttemptsRef.current = 0;
      };

      ws.onmessage = (event) => {
        try {
          const message: WSMessage = JSON.parse(event.data);
          setLastMessage(message);
          console.log("[WebSocket] Message:", message.type);
        } catch (e) {
          console.error("[WebSocket] Parse error:", e);
        }
      };

      ws.onerror = (event) => {
        const error = new Error("WebSocket error");
        setError(error);
        console.error("[WebSocket] Error:", event);
      };

      ws.onclose = () => {
        console.log("[WebSocket] Disconnected");
        setIsConnected(false);

        // Attempt to reconnect
        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current++;
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log(`[WebSocket] Reconnecting... (attempt ${reconnectAttemptsRef.current})`);
            connect();
          }, reconnectInterval * Math.pow(2, reconnectAttemptsRef.current - 1));
        }
      };

      wsRef.current = ws;
    } catch (e) {
      const error = e instanceof Error ? e : new Error(String(e));
      setError(error);
      console.error("[WebSocket] Connection error:", error);
    }
  }, [url, reconnectInterval, maxReconnectAttempts]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);
  }, []);

  const send = useCallback((message: WSMessage) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.warn("[WebSocket] Not connected, cannot send message");
    }
  }, []);

  const joinSession = useCallback(
    (sessionId: string) => {
      send({
        type: "sync",
        data: { action: "joinSession", sessionId },
        timestamp: Date.now(),
      });
    },
    [send]
  );

  const leaveSession = useCallback(
    (sessionId: string) => {
      send({
        type: "sync",
        data: { action: "leaveSession", sessionId },
        timestamp: Date.now(),
      });
    },
    [send]
  );

  const sendCollaborationUpdate = useCallback(
    (sessionId: string, data: any) => {
      send({
        type: "collaboration-update",
        data: { sessionId, ...data },
        timestamp: Date.now(),
      });
    },
    [send]
  );

  const sendTrainingProgress = useCallback(
    (sessionId: string, progress: any) => {
      send({
        type: "training-progress",
        data: { sessionId, ...progress },
        timestamp: Date.now(),
      });
    },
    [send]
  );

  const sendAPIResult = useCallback(
    (sessionId: string, result: any) => {
      send({
        type: "api-result",
        data: { sessionId, ...result },
        timestamp: Date.now(),
      });
    },
    [send]
  );

  const sendPresence = useCallback(
    (sessionId: string, userInfo: any) => {
      send({
        type: "presence",
        data: { sessionId, ...userInfo },
        timestamp: Date.now(),
      });
    },
    [send]
  );

  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [autoConnect, connect, disconnect]);

  return {
    isConnected,
    lastMessage,
    error,
    send,
    connect,
    disconnect,
    joinSession,
    leaveSession,
    sendCollaborationUpdate,
    sendTrainingProgress,
    sendAPIResult,
    sendPresence,
  };
}
