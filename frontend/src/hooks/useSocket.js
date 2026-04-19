import { useEffect } from "react";
import { io } from "socket.io-client";
import useTaskStore from "../store/taskStore";

let socket = null;
let connectionCount = 0;

export const useSocket = (enabled = true) => {
  useEffect(() => {
    if (!enabled) return;

    if (!socket) {
      const socketUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";
      socket = io(socketUrl, { 
        transports: ["websocket", "polling"],
        withCredentials: true
      });

      const user = JSON.parse(localStorage.getItem('tf_user') || '{}');
      if (user?._id) {
         socket.emit('join-room', user._id);
      }

      // Register core listeners only once for the singleton instance
      socket.on("task-created", ({ task }) => useTaskStore.getState().handleSocketUpdate(task));
      socket.on("task-updated", ({ task }) => useTaskStore.getState().handleSocketUpdate(task));
      socket.on("task-deleted", ({ taskId }) => useTaskStore.getState().handleSocketDelete(taskId));
    }

    connectionCount++;

    return () => {
      connectionCount--;
      
      // Cleanup: Only disconnect if this is the last component using the socket
      // We use a small delay to handle React 18 Strict Mode double-mounting in dev
      if (connectionCount <= 0 && socket) {
         const currentSocket = socket;
         setTimeout(() => {
           if (connectionCount <= 0 && currentSocket) {
             if (currentSocket.connected) currentSocket.disconnect();
             if (socket === currentSocket) socket = null;
           }
         }, 100);
      }
    };
  }, [enabled]);

  return {
    joinTask: (taskId) => socket?.emit("join-task", taskId),
    leaveTask: (taskId) => socket?.emit("leave-task", taskId),
    emit: (event, data) => socket?.emit(event, data),
    on: (event, cb) => socket?.on(event, cb),
    off: (event, cb) => socket?.off(event, cb),
  };
};

export const getSocket = () => socket;
