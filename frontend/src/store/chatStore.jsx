import { create } from "zustand";
import { getSocket } from "../services/chatService";
import axiosInstance from "../services/url.service";

export const useChatStore = create((set, get) => ({
  conversations: { data: [] }, // list of all conversations
  currentConversation: null,
  messages: [],
  loading: false,
  error: null,
  onlineUsers: new Map(),
  typingUsers: new Map(),
  currentUser: null,

  // Set the current user in the store
  setCurrentUser: (user) => set({ currentUser: user }),

  // socket event listeners setup
  initsocketListners: () => {
    const socket = getSocket();
    if (!socket) return;

    // remove existing listeners to prevent duplicates
    socket.off("receive_message");
    socket.off("typing_start");
    socket.off("typing_stop");
    socket.off("user_status");
    socket.off("message_send");
    socket.off("message_error");
    socket.off("messageDeleted");
    socket.off("message_status_updated");
    socket.off("reaction_updated");

    // confirm message delivery
    socket.on("message_send", (message) => {
      set((state) => ({
        messages: state.messages.map((msg) =>
          msg._id === message._id ? { ...msg } : msg
        )
      }));
    });

    // update message status
    socket.on("message_status_updated", ({ messageId, messageStatus }) => {
      set((state) => ({
        messages: state.messages.map((msg) =>
          msg._id === messageId ? { ...msg, messageStatus } : msg
        )
      }));
    });

    socket.on("reaction_updated", ({ messageId, reaction }) => {
      set((state) => ({
        messages: state.messages.map((msg) =>
          msg._id === messageId ? { ...msg, reaction } : msg
        )
      }));
    });

    socket.on("messageDeleted", ({ messageId }) => {
      set((state) => ({
        messages: state.messages.filter((msg) => msg._id !== messageId)
      }));
    });

    socket.on("error", (error) => {
      console.error("socket error", error);
    });

    // receive new message
    socket.on("receive_message", (message) => {
      get().receiveMessage(message);
    });

    socket.on("newMessage", (message) => {
      get().receiveMessage(message);
    });

    // listen for typing indicator
    const handleTyping = ({ conversationId, userId, isTyping }) => {
      const convId = conversationId || get().currentConversation?._id;
      if (!convId || !userId) return;

      set((state) => {
        const newTypingUsers = new Map(state.typingUsers);

        if (!newTypingUsers.has(convId)) {
          newTypingUsers.set(convId, new Set());
        }

        const typingSet = newTypingUsers.get(convId);

        if (isTyping) {
          typingSet.add(userId);
        } else {
          typingSet.delete(userId);
        }

        // Update the map
        newTypingUsers.set(convId, typingSet);

        // remove empty sets
        if (typingSet.size === 0) {
          newTypingUsers.delete(convId);
        }

        return {
          typingUsers: newTypingUsers
        };
      });
    };

    socket.on("typing_start", (data) => handleTyping({ ...data, isTyping: true }));
    socket.on("typing_stop", (data) => handleTyping({ ...data, isTyping: false }));

    // listen for user status changes
    socket.on("user_status", ({ userId, isOnline, lastSeen }) => {
      set((state) => {
        const newOnlineUsers = new Map(state.onlineUsers);
        newOnlineUsers.set(userId, { isOnline, lastSeen });
        return { onlineUsers: newOnlineUsers };
      });
    });

    const { conversations, currentUser } = get();

    if (conversations?.data?.length > 0 && currentUser) {
      conversations.data.forEach((conv) => {
        const otherUser = conv.participants.find(
          (p) => p._id !== currentUser._id
        );

        if (otherUser?._id) {
          socket.emit("get_online_status", otherUser._id, (status) => {
            if (status) {
              set((state) => {
                const newOnlineUsers = new Map(state.onlineUsers);
                newOnlineUsers.set(otherUser._id, {
                  isOnline: status.isOnline,
                  lastSeen: status.lastSeen
                });

                return {
                  onlineUsers: newOnlineUsers
                };
              });
            }
          });
        }
      });
    }
  },

  fetchConversations: async () => {
    const { currentUser } = get();
    if (!currentUser) return;
    set({ loading: true, error: null });

    try {
      const { data } = await axiosInstance.get(`/chat/conversation/${currentUser._id}`);
      set({ conversations: data, loading: false });

      get().initsocketListners();
      return data;
    } catch (error) {
      set({
        error: error?.response?.data?.message || error.message,
        loading: false
      });
    }
  },

  fetchMessages: async (conversation) => {
    if (!conversation) return;

    set({ loading: true, error: null });
    try {
      const { data } = await axiosInstance.get(`/chat/conversations/${conversation._id}/messages`);
      const messageArray = data.data || data || [];

      set((state) => {
        const updatedConversations = state.conversations?.data?.map((conv) => {
          if (conv._id === conversation._id) {
            return { ...conv, unreadCount: 0 };
          }
          return conv;
        });
        return {
          messages: messageArray,
          currentConversation: conversation,
          conversations: {
            ...state.conversations,
            data: updatedConversations || []
          },
          loading: false,
          error: null
        };
      });

      return messageArray;
    } catch (error) {
      set({
        error: error?.response?.data?.message || error.message,
        loading: false
      });
      return [];
    }
  },

  sendMessage: async (messageData) => {
    const senderId = messageData.get("senderId");
    const receiverId = messageData.get("receiverId");
    const media = messageData.get("media");
    const content = messageData.get("content");
    const messageStatus = messageData.get("messageStatus");

    const socket = getSocket();

    const { conversations, currentConversation } = get();
    let conversationId = null;
    if (conversations?.data?.length > 0) {
      const foundConversation = conversations.data.find((conv) =>
        conv.participants.some((p) => p._id == senderId) &&
        conv.participants.some((p) => p._id == receiverId)
      );
      if (foundConversation) {
        conversationId = foundConversation._id;
        set({ currentConversation: foundConversation });
      }
    }

    if (!conversationId && currentConversation) {
      conversationId = currentConversation._id;
    }

    const tempId = `temp-${Date.now()}`;

    const optimisticMessage = {
      _id: tempId,
      conversationId: conversationId,
      senderId: senderId,
      receiverId: receiverId,
      message: content,
      image: media && typeof media !== "string" && media.type && media.type.startsWith("image/") ? URL.createObjectURL(media) : null,
      video: media && typeof media !== "string" && media.type && media.type.startsWith("video/") ? URL.createObjectURL(media) : null,
      contentType: content ? "text" : (media && media.type && media.type.startsWith("video/") ? "video" : "image"),
      createdAt: new Date(),
      messageStatus,
    };

    set((state) => ({
      messages: [...state.messages, optimisticMessage]
    }));

    try {
      const { data } = await axiosInstance.post("/chat/send-message", messageData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      const responseMsg = data.data || data;

      set((state) => ({
        messages: state.messages.map((msg) =>
          msg._id === tempId ? responseMsg : msg
        )
      }));
      return responseMsg;
    } catch (error) {
      console.error("error sending message ", error);
      set((state) => ({
        messages: state.messages.map((msg) =>
          msg._id === tempId ? { ...msg, messageStatus: "Failed" } : msg
        ),
        error: error?.response?.data?.message || "Failed to send message"
      }));

      throw error;
    }
  },

  receiveMessage: (message) => {
    if (!message) return;
    const { currentConversation, currentUser, messages } = get();

    const messageExists = messages.some((msg) => msg._id === message._id);
    if (messageExists) return;

    // Get the sender's ID from the message (handles both populated and raw ID)
    const messageSenderId = message?.senderId?._id || message?.senderId;

    if (message.conversationId === currentConversation?._id) {
      // Skip adding to messages if the current user sent this message,
      // because sendMessage already handles it via API response replacement.
      if (messageSenderId !== currentUser?._id) {
        set((state) => ({
          messages: [...state.messages, message]
        }));
      }

      if (message.receiverId?._id === currentUser?._id) {
        get().markMessageAsRead();
      }
    }

    set((state) => {
      const updatedConversations = state.conversations?.data?.map((conv) => {
        if (conv._id === message.conversationId) {
          return {
            ...conv,
            lastMessage: message,
            unreadCount: (message?.receiverId?._id === currentUser?._id && message.conversationId !== currentConversation?._id)
              ? (conv.unreadCount || 0) + 1
              : conv.unreadCount
          };
        }
        return conv;
      });

      return {
        conversations: {
          ...state.conversations,
          data: updatedConversations || []
        }
      };
    });
  },

  // mark as read
  markMessageAsRead: async () => {
    const { messages, currentUser } = get();

    if (!messages.length || !currentUser) return;

    const unreadIds = messages
      .filter((msg) => msg.messageStatus !== "read" && msg?.receiverId?._id === currentUser?._id)
      .map((msg) => msg._id)
      .filter(Boolean);

    if (unreadIds.length === 0) return;

    try {
      await axiosInstance.put("/chat/messages/read", {
        messageIds: unreadIds
      });

      set((state) => ({
        messages: state.messages.map((msg) =>
          unreadIds.includes(msg._id) ? { ...msg, messageStatus: "read" } : msg
        )
      }));

      const socket = getSocket();
      if (socket) {
        socket.emit("message_read", {
          messageId: unreadIds,
          readerId: messages[0]?.senderId?._id
        });
      }
    } catch (error) {
      console.error("failed to read message", error);
    }
  },

  deleteMessage: async (messageId) => {
    const { messages, currentUser, currentConversation } = get();

    try {
      set({ loading: true, error: null });

      await axiosInstance.delete(`/chat/messages/${messageId}`);

      // Remove message from local state
      set((state) => {
        const updatedMessages = state.messages.filter((msg) => msg._id !== messageId);

        // Update latest message in conversation if the deleted message was the latest
        let updatedConversations = state.conversations?.data || [];
        if (currentConversation?._id) {
          updatedConversations = updatedConversations.map((conv) => {
            if (conv._id === currentConversation._id) {
              // If the deleted message was the latest, find the new latest
              const newLatestMessage = updatedMessages.length
                ? updatedMessages[updatedMessages.length - 1]
                : null;

              return {
                ...conv,
                lastMessage: newLatestMessage,
                unreadCount: newLatestMessage?.receiverId?._id === currentUser?._id
                  ? (conv.unreadCount || 0)
                  : (newLatestMessage ? (conv.unreadCount || 0) - 1 : 0)
              };
            }
            return conv;
          });
        }

        return {
          messages: updatedMessages,
          conversations: {
            ...state.conversations,
            data: updatedConversations
          },
          loading: false
        };
      });

      // Notify socket
      const socket = getSocket();
      if (socket) {
        socket.emit("message_deleted", {
          messageId,
          conversationId: currentConversation?._id,
          receiverId: messages.find((m) => m._id === messageId)?.receiverId?._id
        });
      }
    } catch (error) {
      set({
        error: error?.response?.data?.message || error.message,
        loading: false
      });
      console.error("failed to delete message", error);
    }
  },

  addReaction: async (messageId, emoji) => {
    const socket = getSocket();
    const { currentUser } = get();

    if (socket && currentUser) {
      socket.emit("add_reaction", {
        messageId,
        emoji,
        reactionuserId: currentUser?._id
      });
    }
  },

  startTyping: (receiverId) => {
    const { currentConversation, currentUser } = get();
    const socket = getSocket();

    if (socket && currentUser) {
      socket.emit("typing_start", {
        conversationId: currentConversation?._id,
        receiverId
      });
    }
  },

  endTyping: (receiverId) => {
    const { currentConversation, currentUser } = get();
    const socket = getSocket();

    if (socket && currentUser) {
      socket.emit("typing_stop", {
        conversationId: currentConversation?._id,
        receiverId
      });
    }
  },

  isUserTyping: (userId) => {
    const { typingUsers, currentConversation } = get();

    if (!currentConversation?._id || !userId || !typingUsers.has(currentConversation._id)) {
      return false;
    }

    return typingUsers.get(currentConversation._id).has(userId);
  },

  isUserOnline: (userId) => {
    if (!userId) return false;

    const { onlineUsers } = get();
    return onlineUsers.get(userId)?.isOnline || false;
  },

  getUserLastSeen: (userId) => {
    if (!userId) return null;

    const { onlineUsers } = get();
    return onlineUsers.get(userId)?.lastSeen || null;
  },

  cleanUp: () => {
    set({
      conversations: { data: [] },
      currentConversation: null,
      messages: [],
      typingUsers: new Map(),
      onlineUsers: new Map(),
      loading: false,
      error: null
    });
  }
}));
