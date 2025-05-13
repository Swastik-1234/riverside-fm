import { io, Socket } from "socket.io-client";

const URL = "http://localhost:5000"; // Replace with backend server if hosted
export const socket: Socket = io(URL, {
  autoConnect: false,
});
