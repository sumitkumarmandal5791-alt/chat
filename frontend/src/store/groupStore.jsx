import { create } from 'zustand';
import {
    getMyGroups,
    getGroupDetails,
    getGroupMessages,
    sendGroupMessage as apiSendGroupMessage,
    markGroupMessagesRead,
    updateGroup as apiUpdateGroup,
    addMembers as apiAddMembers,
    removeMember as apiRemoveMember,
    leaveGroup as apiLeaveGroup,
    changeRole as apiChangeRole,
    transferOwnership as apiTransferOwnership,
    deleteGroup as apiDeleteGroup
} from '../services/groupService';
import { getSocket } from '../services/chatService';

export const useGroupStore = create((set, get) => ({
    groups: [],
    activeGroup: null,
    activeGroupDetails: null,
    groupMessages: [],
    nextCursor: null,
    hasMoreMessages: false,
    isLoadingGroups: false,
    isLoadingMessages: false,
    typingMembers: {}, // { [groupId]: { [userId]: username } }
    isSocketInitialized: false,

    fetchMyGroups: async () => {
        set({ isLoadingGroups: true });
        try {
            const data = await getMyGroups();
            if (data?.success) {
                set({ groups: data.groups || [] });
            }
        } catch (err) {
            console.error('Failed to load groups:', err);
        } finally {
            set({ isLoadingGroups: false });
        }
    },

    setActiveGroup: async (group) => {
        set({
            activeGroup: group,
            groupMessages: [],
            activeGroupDetails: null,
            nextCursor: null,
            hasMoreMessages: false
        });

        if (!group) return;

        const groupId = group._id || group.id;

        // Auto mark as read in store & backend
        try {
            await markGroupMessagesRead(groupId);
            set((state) => ({
                groups: state.groups.map((g) =>
                    (g._id || g.id) === groupId ? { ...g, unreadCount: 0 } : g
                )
            }));
        } catch (e) {
            console.warn('Mark read failed:', e.message);
        }

        // Fetch details & initial messages
        get().fetchGroupDetails(groupId);
        get().fetchGroupMessages(groupId);

        // Tell socket we're actively viewing this room
        const socket = getSocket();
        if (socket) {
            socket.emit('group:join_room', { groupId });
        }
    },

    fetchGroupDetails: async (groupId) => {
        try {
            const data = await getGroupDetails(groupId);
            if (data?.success) {
                set({ activeGroupDetails: data.group });
            }
        } catch (err) {
            console.error('Failed to get group details:', err);
        }
    },

    fetchGroupMessages: async (groupId, cursor = null) => {
        set({ isLoadingMessages: true });
        try {
            const data = await getGroupMessages(groupId, cursor, 50);
            if (data?.success) {
                set((state) => ({
                    groupMessages: cursor
                        ? [...data.messages, ...state.groupMessages]
                        : data.messages,
                    nextCursor: data.nextCursor,
                    hasMoreMessages: data.hasMore
                }));
            }
        } catch (err) {
            console.error('Failed to get group messages:', err);
        } finally {
            set({ isLoadingMessages: false });
        }
    },

    sendMessage: async (groupId, payload) => {
        try {
            const res = await apiSendGroupMessage(groupId, payload);
            if (res?.success && res.message) {
                // Optimistically update
                set((state) => {
                    const exists = state.groupMessages.some((m) => m._id === res.message._id);
                    return {
                        groupMessages: exists
                            ? state.groupMessages
                            : [...state.groupMessages, res.message],
                        groups: state.groups.map((g) =>
                            (g._id || g.id) === groupId
                                ? { ...g, lastMessage: res.message, updatedAt: new Date() }
                                : g
                        )
                    };
                });
                return res.message;
            }
        } catch (err) {
            console.error('Failed to send group message:', err);
            throw err;
        }
    },

    updateGroupInfo: async (groupId, payload) => {
        const res = await apiUpdateGroup(groupId, payload);
        if (res?.success) {
            set((state) => ({
                activeGroupDetails: res.group,
                activeGroup: state.activeGroup?._id === groupId ? { ...state.activeGroup, ...res.group } : state.activeGroup,
                groups: state.groups.map((g) => (g._id === groupId ? { ...g, ...res.group } : g))
            }));
            return res.group;
        }
    },

    addMembers: async (groupId, memberIds) => {
        const res = await apiAddMembers(groupId, memberIds);
        if (res?.success) {
            set((state) => ({
                activeGroupDetails: res.group,
                groups: state.groups.map((g) => (g._id === groupId ? { ...g, ...res.group } : g))
            }));
            return res.group;
        }
    },

    removeMember: async (groupId, userId) => {
        const res = await apiRemoveMember(groupId, userId);
        if (res?.success) {
            set((state) => ({
                activeGroupDetails: res.group,
                groups: state.groups.map((g) => (g._id === groupId ? { ...g, ...res.group } : g))
            }));
            return res.group;
        }
    },

    changeRole: async (groupId, userId, role) => {
        const res = await apiChangeRole(groupId, userId, role);
        if (res?.success) {
            set((state) => ({
                activeGroupDetails: res.group
            }));
            return res.group;
        }
    },

    transferOwnership: async (groupId, newOwnerId) => {
        const res = await apiTransferOwnership(groupId, newOwnerId);
        if (res?.success) {
            set((state) => ({
                activeGroupDetails: res.group
            }));
            return res.group;
        }
    },

    leaveGroup: async (groupId) => {
        const res = await apiLeaveGroup(groupId);
        if (res?.success) {
            set((state) => ({
                groups: state.groups.filter((g) => (g._id || g.id) !== groupId),
                activeGroup: state.activeGroup?._id === groupId ? null : state.activeGroup,
                activeGroupDetails: state.activeGroupDetails?._id === groupId ? null : state.activeGroupDetails,
                groupMessages: []
            }));
            return res;
        }
    },

    deleteGroup: async (groupId) => {
        const res = await apiDeleteGroup(groupId);
        if (res?.success) {
            set((state) => ({
                groups: state.groups.filter((g) => (g._id || g.id) !== groupId),
                activeGroup: state.activeGroup?._id === groupId ? null : state.activeGroup,
                activeGroupDetails: state.activeGroupDetails?._id === groupId ? null : state.activeGroupDetails,
                groupMessages: []
            }));
            return res;
        }
    },

    initGroupSocketListeners: () => {
        const socket = getSocket();
        if (!socket || get().isSocketInitialized) return;

        set({ isSocketInitialized: true });

        // Listen for new group messages (and system messages)
        socket.on('message:new', (newMsg) => {
            if (!newMsg || !newMsg.groupId) return;

            const active = get().activeGroup;
            const activeId = active?._id || active?.id;
            const msgGroupId = newMsg.groupId.toString();

            if (activeId && activeId.toString() === msgGroupId) {
                // If currently viewing, append message and mark as read
                set((state) => {
                    const alreadyPresent = state.groupMessages.some((m) => m._id === newMsg._id);
                    return {
                        groupMessages: alreadyPresent
                            ? state.groupMessages
                            : [...state.groupMessages, newMsg]
                    };
                });
                markGroupMessagesRead(msgGroupId, newMsg._id).catch(() => {});
            }

            // Update lastMessage and unread count in group list
            set((state) => ({
                groups: state.groups.map((grp) => {
                    const gId = (grp._id || grp.id).toString();
                    if (gId === msgGroupId) {
                        const isCurrentlyActive = activeId && activeId.toString() === msgGroupId;
                        return {
                            ...grp,
                            lastMessage: newMsg,
                            updatedAt: new Date(),
                            unreadCount: isCurrentlyActive ? 0 : (grp.unreadCount || 0) + 1
                        };
                    }
                    return grp;
                })
            }));
        });

        // Group typing events
        socket.on('group:typing', ({ groupId, userId, username, isTyping }) => {
            set((state) => {
                const currentGroupTyping = { ...(state.typingMembers[groupId] || {}) };
                if (isTyping) {
                    currentGroupTyping[userId] = username;
                } else {
                    delete currentGroupTyping[userId];
                }
                return {
                    typingMembers: {
                        ...state.typingMembers,
                        [groupId]: currentGroupTyping
                    }
                };
            });
        });

        // Group reaction updates
        socket.on('reaction_updated', ({ messageId, reaction }) => {
            set((state) => ({
                groupMessages: state.groupMessages.map((m) =>
                    m._id === messageId ? { ...m, reaction } : m
                )
            }));
        });

        // Group member changes or updates
        socket.on('group:updated', (data) => {
            if (data?.group) {
                set((state) => ({
                    groups: state.groups.map((g) => (g._id === data.group._id ? { ...g, ...data.group } : g)),
                    activeGroupDetails: state.activeGroupDetails?._id === data.group._id ? data.group : state.activeGroupDetails
                }));
            }
        });

        socket.on('group:member-added', (data) => {
            get().fetchMyGroups();
            if (get().activeGroup?._id === data?.groupId) {
                get().fetchGroupDetails(data.groupId);
            }
        });

        socket.on('group:member-removed', (data) => {
            get().fetchMyGroups();
            if (get().activeGroup?._id === data?.groupId) {
                get().fetchGroupDetails(data.groupId);
            }
        });

        socket.on('group:role-changed', (data) => {
            if (get().activeGroup?._id === data?.groupId) {
                get().fetchGroupDetails(data.groupId);
            }
        });

        socket.on('group:deleted', ({ groupId }) => {
            set((state) => ({
                groups: state.groups.filter((g) => g._id !== groupId),
                activeGroup: state.activeGroup?._id === groupId ? null : state.activeGroup,
                activeGroupDetails: state.activeGroupDetails?._id === groupId ? null : state.activeGroupDetails
            }));
        });
    }
}));

