// lib/signaling.ts
import { io, Socket } from "socket.io-client";
import { getPeerClient } from "./peerClient";

let socket: Socket | null = null;

export const initSignaling = (serverUrl: string, roomId: string, myPeerId: string) => {
  if (socket) return socket; // prevent multiple init

  socket = io(serverUrl, {
    transports: ["websocket"],
  });

  const peerClient = getPeerClient(myPeerId);

  socket.on("connect", () => {
    console.log("🔗 Connected to signaling server:", socket?.id);
    socket?.emit("join-room", { roomId, peerId: myPeerId });
  });

  // Incoming signal from another peer
  socket.on("signal", ({ from, data }) => {
    console.log("📡 Incoming signal from:", from, data.type);
    peerClient.handleIncomingSignal(from, data);
  });

  // When a new user joins, create connection
  socket.on("user-joined", ({ peerId }) => {
    console.log("👋 New peer joined:", peerId);
    peerClient.createConnection(peerId);
  });

  // Outgoing signals → send via socket
  peerClient.onSignal((to, signalData) => {
    console.log("📡 Sending signal to:", to, signalData.type);
    socket?.emit("signal", { to, from: myPeerId, roomId, data: signalData });
  });

  return socket;
};
