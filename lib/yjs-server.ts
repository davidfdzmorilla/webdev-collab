import http from 'node:http';
import { WebSocketServer, WebSocket } from 'ws';
import * as Y from 'yjs';
import * as encoding from 'lib0/encoding';
import * as decoding from 'lib0/decoding';
import * as awarenessProtocol from 'y-protocols/awareness';
import * as syncProtocol from 'y-protocols/sync';

// Message types
const messageAwareness = 1;

const docs = new Map<string, WSSharedDoc>();

class WSSharedDoc extends Y.Doc {
  name: string;
  connections: Map<WebSocket, Set<number>>;
  awareness: awarenessProtocol.Awareness;

  constructor(name: string) {
    super({ gc: true });
    this.name = name;
    this.connections = new Map();
    this.awareness = new awarenessProtocol.Awareness(this);
  }
}

function getYDoc(docname: string): WSSharedDoc {
  let doc = docs.get(docname);
  if (!doc) {
    doc = new WSSharedDoc(docname);
    docs.set(docname, doc);
    console.log(`[Yjs] Created new document: ${docname}`);
  }
  return doc;
}

function closeConn(doc: WSSharedDoc, conn: WebSocket) {
  const controlledIds = doc.connections.get(conn);
  doc.connections.delete(conn);

  if (controlledIds !== undefined) {
    awarenessProtocol.removeAwarenessStates(doc.awareness, Array.from(controlledIds), null);
  }

  if (doc.connections.size === 0) {
    doc.destroy();
    docs.delete(doc.name);
    console.log(`[Yjs] Cleaned up document: ${doc.name}`);
  }
}

function handleMessage(conn: WebSocket, doc: WSSharedDoc, message: Uint8Array) {
  const encoder = encoding.createEncoder();
  const decoder = decoding.createDecoder(message);
  const messageType = decoding.readVarUint(decoder);

  switch (messageType) {
    case syncProtocol.messageYjsSyncStep1:
      encoding.writeVarUint(encoder, syncProtocol.messageYjsSyncStep2);
      syncProtocol.readSyncStep1(decoder, encoder, doc);
      send(doc, conn, encoding.toUint8Array(encoder));
      break;
    case syncProtocol.messageYjsSyncStep2:
      syncProtocol.readSyncStep2(decoder, doc, null);
      break;
    case syncProtocol.messageYjsUpdate:
      syncProtocol.readUpdate(decoder, doc, null);
      break;
    case messageAwareness:
      awarenessProtocol.applyAwarenessUpdate(
        doc.awareness,
        decoding.readVarUint8Array(decoder),
        conn
      );
      break;
  }
}

function send(doc: WSSharedDoc, conn: WebSocket, message: Uint8Array) {
  if (conn.readyState === WebSocket.OPEN) {
    conn.send(message);
  }
}

export function setupYjsServer(server: http.Server) {
  const wss = new WebSocketServer({ noServer: true });

  wss.on('connection', (conn: WebSocket, req: http.IncomingMessage, docName: string) => {
    console.log(`[Yjs] New connection to document: ${docName}`);

    const doc = getYDoc(docName);
    doc.connections.set(conn, new Set());

    // Send sync step 1
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, syncProtocol.messageYjsSyncStep1);
    syncProtocol.writeSyncStep1(encoder, doc);
    send(doc, conn, encoding.toUint8Array(encoder));

    // Send awareness states
    const awarenessStates = doc.awareness.getStates();
    if (awarenessStates.size > 0) {
      const encoder2 = encoding.createEncoder();
      encoding.writeVarUint(encoder2, messageAwareness);
      encoding.writeVarUint8Array(
        encoder2,
        awarenessProtocol.encodeAwarenessUpdate(doc.awareness, Array.from(awarenessStates.keys()))
      );
      send(doc, conn, encoding.toUint8Array(encoder2));
    }

    // Listen to incoming messages
    conn.on('message', (message: ArrayBuffer) => {
      handleMessage(conn, doc, new Uint8Array(message));
    });

    conn.on('close', () => {
      closeConn(doc, conn);
      console.log(`[Yjs] Connection closed for document: ${docName}`);
    });
  });

  // Listen to awareness changes and broadcast
  docs.forEach((doc) => {
    doc.awareness.on(
      'update',
      ({ added, updated, removed }: { added: number[]; updated: number[]; removed: number[] }) => {
        const changedClients = added.concat(updated).concat(removed);
        const encoder = encoding.createEncoder();
        encoding.writeVarUint(encoder, messageAwareness);
        encoding.writeVarUint8Array(
          encoder,
          awarenessProtocol.encodeAwarenessUpdate(doc.awareness, changedClients)
        );
        const buff = encoding.toUint8Array(encoder);
        doc.connections.forEach((_, conn) => {
          send(doc, conn, buff);
        });
      }
    );
  });

  // Handle WebSocket upgrade
  server.on('upgrade', (request, socket, head) => {
    const { pathname } = new URL(request.url!, `http://${request.headers.host}`);

    // Check if this is a Yjs WebSocket request
    if (pathname && pathname.startsWith('/room-')) {
      const docName = pathname.substring(1); // Remove leading slash

      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request, docName);
      });
    }
  });

  console.log('✅ Yjs WebSocket server initialized');

  return wss;
}
