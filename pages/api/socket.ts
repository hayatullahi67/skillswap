import { Server as IOServer } from "socket.io";
import type { NextApiRequest, NextApiResponse } from "next";

export const config = {
  api: {
    bodyParser: false,
  },
};

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Reuse existing server on hot reload
    const anyRes = res as any;
    if (!anyRes.socket.server.io) {
      console.log('🚀 Initializing Socket.IO server...');
      const io = new IOServer(anyRes.socket.server, {
        path: "/api/socket",
        cors: { 
          origin: process.env.NODE_ENV === 'production' 
            ? true // Allow all origins in production for now
            : ["http://localhost:3000", "http://127.0.0.1:3000"],
          methods: ["GET", "POST"],
          credentials: false
        },
        allowEIO3: true, // allow Engine.IO v3 clients
        transports: ["polling", "websocket"],
        // Mobile-friendly server options
        pingTimeout: 60000, // 60 seconds
        pingInterval: 25000, // 25 seconds
        upgradeTimeout: 30000, // 30 seconds for mobile networks
        maxHttpBufferSize: 1e6, // 1MB buffer
        allowUpgrades: true,
        // Add error handling
        serveClient: false,
        connectTimeout: 45000,
      });
      anyRes.socket.server.io = io;

    io.engine.on("connection_error", (err) => {
      console.log('❌ Socket.IO engine connection error:', err.req);
      console.log('❌ Error code:', err.code);
      console.log('❌ Error message:', err.message);
      console.log('❌ Error context:', err.context);
    });

    io.on("connection", (socket) => {
      console.log('🔌 New socket connection:', socket.id, 'transport:', socket.conn.transport.name);

      // peer registers its "peerId" and joins a room with that id
      socket.on("register", (peerId: string) => {
        console.log('📝 Peer registered:', peerId, 'socket:', socket.id);
        socket.join(peerId);
        socket.data.peerId = peerId;
        
        // Confirm registration
        socket.emit("registered", { peerId, socketId: socket.id });
      });

      // relay signaling messages
      socket.on("signal", ({ to, from, data }) => {
        console.log('📡 Relaying signal:', {
          from,
          to,
          type: data.type,
          socketId: socket.id
        });
        
        // Check if target peer is connected
        const targetSockets = io.sockets.adapter.rooms.get(to);
        if (targetSockets && targetSockets.size > 0) {
          io.to(to).emit("signal", { from, data });
          console.log('✅ Signal delivered to', targetSockets.size, 'socket(s)');
        } else {
          console.log('❌ Target peer not found:', to);
          console.log('📋 Available rooms:', Array.from(io.sockets.adapter.rooms.keys()));
          console.log('📋 All connected sockets:', Array.from(io.sockets.sockets.keys()));
          
          // Send error back to sender
          socket.emit("error", { message: "Target peer not found", targetPeer: to });
        }
      });

      // handle call-ended messages
      socket.on("call-ended", ({ to, from, sessionId }) => {
        console.log('📞 Relaying call-ended:', {
          from,
          to,
          sessionId,
          socketId: socket.id
        });
        
        // Check if target peer is connected
        const targetSockets = io.sockets.adapter.rooms.get(to);
        if (targetSockets && targetSockets.size > 0) {
          io.to(to).emit("call-ended", { from, sessionId });
          console.log('✅ Call-ended delivered to', targetSockets.size, 'socket(s)');
        } else {
          console.log('❌ Target peer not found for call-ended:', to);
        }
      });

      socket.on("disconnect", (reason) => {
        console.log('🔌 Socket disconnected:', socket.id, 'peerId:', socket.data.peerId, 'reason:', reason);
      });

      socket.on("error", (error) => {
        console.log('❌ Socket error:', socket.id, error);
      });
    });

    console.log('✅ Socket.IO server initialized');
  } else {
    console.log('♻️ Socket.IO server already exists, reusing...');
  }
  
  // Set proper headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  res.status(200).json({ status: 'Socket.IO server running' });
  } catch (error) {
    console.error('❌ Socket.IO server error:', error);
    res.status(500).json({ error: 'Socket.IO server failed to initialize' });
  }
}