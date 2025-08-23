import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

export function getSocket() {
  if (!socket) {
    console.log('🔌 Creating new Socket.IO client connection...');
    
    // Get the current URL to build the socket connection
    const isProduction = process.env.NODE_ENV === 'production';
    const socketUrl = isProduction ? window.location.origin : 'http://localhost:3000';
    
    socket = io(socketUrl, {
      path: "/api/socket",
      transports: ["polling", "websocket"], // try polling first, then websocket
      timeout: 20000, // increase timeout
      forceNew: true, // force new connection
    });

    socket.on("connect", () => {
      console.log('✅ Socket.IO client connected:', socket?.id);
      console.log('✅ Transport:', socket?.io.engine.transport.name);
    });

    socket.on("disconnect", (reason) => {
      console.log('❌ Socket.IO client disconnected:', reason);
    });

    socket.on("connect_error", (error) => {
      console.error('❌ Socket.IO connection error:', error);
      console.log('🔄 Retrying connection...');
    });

    socket.on("reconnect", (attemptNumber) => {
      console.log('🔄 Socket.IO reconnected after', attemptNumber, 'attempts');
    });
  }
  return socket;
}