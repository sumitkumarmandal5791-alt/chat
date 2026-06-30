import { io } from "socket.io-client"
import userUserStore from "../store/useruserStore";

let socket = null;

export const initialzeSocket = (inputUser) => {
    if (socket) return socket;

    const user = inputUser || userUserStore.getState().user;
    if (!user) return null;

    socket = io(import.meta.env.VITE_API_URL, {
        withCredentials: true,
        transports: ["websocket"],
        // reconnection:true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        // reconnectionDelayMax:5000,
        // randomizationFactor:0.5,
    });

    socket.on("connect", () => {
        console.log("socket connected,", socket.id)
        socket.emit("user_connected", user._id);
    })

    socket.on("connect_error", (err) => {
        console.log("socket connection error", err.message);
    })

    socket.on("disconnect", (reason) => {
        console.log("socket disconnected", reason)
    })




    return socket;
}


export const getSocket = () => {
    if (!socket) {
        initialzeSocket()
    }
    return socket;
}
export const disconnectSocket = () => {
    if (socket) {
        socket.disconnect();
        socket = null;
    }
}