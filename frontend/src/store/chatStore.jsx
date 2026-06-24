


export const useChatStore = create((set, get) => ({
    conversations: [], //list of all converstions
    currentConversation: null,
    messages: [],
    loading: false,
    error: null,
    onlineUsers: new Map(),
    typingUsers: new Map(),

    //socket event listners setup
    initsocketListners: () => {
        const socket = getSocket();
        if (!socket) return;

        //remove exiting listerners to prevent dup
        socket.off("receive_message");
        socket.off("user_typing");
        socket.off("user_status");
        socket.off("message_send");
        socket.off("message_error");
        socket.off("message_deleted");

        //listen for i
    },
}));