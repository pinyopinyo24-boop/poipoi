import { WebSocketServer, WebSocket } from "ws";
import { Server } from "http";

export interface WSMessage {
  type: "collaboration-update" | "training-progress" | "api-result" | "presence" | "sync";
  data: any;
  timestamp: number;
  userId?: string;
}

export class PoiPoiWebSocketServer {
  private wss: WebSocketServer;
  private clients: Map<string, WebSocket> = new Map();
  private sessions: Map<string, Set<string>> = new Map();
  private messageBuffer: Map<string, WSMessage[]> = new Map();

  constructor(server: Server) {
    this.wss = new WebSocketServer({ server });
    this.setupHandlers();
  }

  private setupHandlers() {
    this.wss.on("connection", (ws: WebSocket, req) => {
      const clientId = this.generateClientId();
      this.clients.set(clientId, ws);

      console.log(`[WebSocket] Client connected: ${clientId}`);

      ws.on("message", (data: string) => {
        try {
          const message: WSMessage = JSON.parse(data);
          this.handleMessage(clientId, message);
        } catch (error) {
          console.error("[WebSocket] Message parse error:", error);
        }
      });

      ws.on("close", () => {
        this.clients.delete(clientId);
        this.removeClientFromAllSessions(clientId);
        console.log(`[WebSocket] Client disconnected: ${clientId}`);
      });

      ws.on("error", (error) => {
        console.error(`[WebSocket] Error for ${clientId}:`, error);
      });

      // Send welcome message
      this.sendToClient(clientId, {
        type: "sync",
        data: { clientId, status: "connected" },
        timestamp: Date.now(),
      });
    });
  }

  private handleMessage(clientId: string, message: WSMessage) {
    console.log(`[WebSocket] Message from ${clientId}:`, message.type);

    switch (message.type) {
      case "collaboration-update":
        this.broadcastToSession(message.data.sessionId, message, clientId);
        break;
      case "training-progress":
        this.broadcastToSession(message.data.sessionId, message, clientId);
        break;
      case "api-result":
        this.broadcastToSession(message.data.sessionId, message, clientId);
        break;
      case "presence":
        this.broadcastToSession(message.data.sessionId, message, clientId);
        break;
      default:
        console.warn(`[WebSocket] Unknown message type: ${message.type}`);
    }
  }

  public joinSession(sessionId: string, clientId: string) {
    if (!this.sessions.has(sessionId)) {
      this.sessions.set(sessionId, new Set());
      this.messageBuffer.set(sessionId, []);
    }

    this.sessions.get(sessionId)!.add(clientId);
    console.log(`[WebSocket] Client ${clientId} joined session ${sessionId}`);

    // Send buffer to new client
    const buffer = this.messageBuffer.get(sessionId) || [];
    buffer.forEach((msg) => {
      this.sendToClient(clientId, msg);
    });
  }

  public leaveSession(sessionId: string, clientId: string) {
    this.sessions.get(sessionId)?.delete(clientId);
    console.log(`[WebSocket] Client ${clientId} left session ${sessionId}`);
  }

  public broadcastToSession(sessionId: string, message: WSMessage, excludeClientId?: string) {
    const clients = this.sessions.get(sessionId);
    if (!clients) return;

    // Store in buffer
    const buffer = this.messageBuffer.get(sessionId) || [];
    if (buffer.length > 100) buffer.shift(); // Keep last 100 messages
    buffer.push(message);

    // Broadcast to all clients in session
    clients.forEach((clientId) => {
      if (excludeClientId !== clientId) {
        this.sendToClient(clientId, message);
      }
    });
  }

  public sendToClient(clientId: string, message: WSMessage) {
    const ws = this.clients.get(clientId);
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  private removeClientFromAllSessions(clientId: string) {
    this.sessions.forEach((clients, sessionId) => {
      clients.delete(clientId);
    });
  }

  private generateClientId(): string {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  public getSessionClients(sessionId: string): number {
    return this.sessions.get(sessionId)?.size || 0;
  }

  public getSessions(): string[] {
    return Array.from(this.sessions.keys());
  }
}

// Export singleton instance
let wsServer: PoiPoiWebSocketServer | null = null;

export function initializeWebSocket(server: Server): PoiPoiWebSocketServer {
  if (!wsServer) {
    wsServer = new PoiPoiWebSocketServer(server);
  }
  return wsServer;
}

export function getWebSocketServer(): PoiPoiWebSocketServer | null {
  return wsServer;
}
