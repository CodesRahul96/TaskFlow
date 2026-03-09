import { useEffect } from "react";
import { io } from "socket.io-client";
import useTaskStore from "../store/taskStore";

let socket = null;

export const useSocket = (enabled = true) => {
  const { handleSocketUpdate, handleSocketDelete } = useTaskStore();

  useEffect(() => {
    if (!enabled) return;

    const socketUrl = import.meta.env.VITE_API_URL || "/";
    socket = io(socketUrl, { transports: ["websocket", "polling"] });

    socket.on("task-created", ({ task }) => handleSocketUpdate(task));
    socket.on("task-updated", ({ task }) => handleSocketUpdate(task));
    socket.on("task-deleted", ({ taskId }) => handleSocketDelete(taskId));

    return () => {
      socket?.disconnect();
      socket = null;
    };
  }, [enabled]);

  return {
    joinTask: (taskId) => socket?.emit("join-task", taskId),
    leaveTask: (taskId) => socket?.emit("leave-task", taskId),
  };
};

export const getSocket = () => socket;
