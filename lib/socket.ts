import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

export function getSocket() {
  if (!socket) {
    console.log('🔌 Creating new Socket.IO client connection...');
    
    // Get the current URL to build the socket connection
    const isProduction = process.env.NODE_ENV === 'production';
    const socketUrl = isProduction ? window.location.origin : 'http://localhost:3000';
    
    // Mobile-friendly configuration
    socket = io(socketUrl, {
      path: "/api/socket",
      transports: ["polling"], // Start with polling only for mobile compatibility
      timeout: 30000, // longer timeout for mobile networks
      forceNew: true,
      upgrade: true, // allow upgrade to websocket after connection
      rememberUpgrade: false, // don't remember upgrade for mobile
      // Mobile-specific options
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    socket.on("connect", () => {
      console.log('✅ Socket.IO client connected:', socket?.id);
      console.log('✅ Transport:', socket?.io.engine.transport.name);
      console.log('📱 User agent:', navigator.userAgent);
    });

    socket.on("disconnect", (reason) => {
      console.log('❌ Socket.IO client disconnected:', reason);
    });

    socket.on("connect_error", (error) => {
      console.error('❌ Socket.IO connection error:', error);
      console.log('📱 Trying polling-only fallback...');
      
      // Force polling-only on mobile connection errors
      if (socket && !socket.connected) {
        socket.io.opts.transports = ["polling"];
        socket.connect();
      }
    });

    socket.on("reconnect", (attemptNumber) => {
      console.log('🔄 Socket.IO reconnected after', attemptNumber, 'attempts');
    });

    // Mobile-specific error handling
    socket.on("error", (error) => {
      console.error('❌ Socket.IO error:', error);
    });
  }
  return socket;
}