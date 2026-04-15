import { useEffect } from "react";
import { io } from "socket.io-client";
import useTaskStore from "../store/taskStore";

let socket = null;

export const useSocket = (enabled = true) => {
  const { handleSocketUpdate, handleSocketDelete } = useTaskStore();

  useEffect(() => {
    if (!enabled) return;

    // Direct connect to backend port is often more reliable for WS than Vite proxy in some envs
    const socketUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";
    socket = io(socketUrl, { 
      transports: ["websocket", "polling"],
      withCredentials: true
    });

    const user = JSON.parse(localStorage.getItem('tf_user') || '{}');
    if (user?._id) {
       socket.emit('join-room', user._id);
    }

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
    emit: (event, data) => socket?.emit(event, data),
    on: (event, cb) => socket?.on(event, cb),
    off: (event, cb) => socket?.off(event, cb),
  };
};

export const getSocket = () => socket;
