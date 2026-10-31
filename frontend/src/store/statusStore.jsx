import { create } from 'zustand';
import {
    getStatusFeedApi,
    createStatusApi,
    markStatusViewedApi,
    deleteStatusApi,
    muteStatusUserApi,
    unmuteStatusUserApi,
    replyStatusApi
} from '../services/statusService';
import { getSocket } from '../services/chatService';

export const useStatusStore = create((set, get) => ({
    myStatus: null,
    contacts: [],
    muted: [],
    loading: false,
    error: null,
    uploading: false,
    uploadProgress: 0,
    hasUnviewed: false,

    // Status Viewer & Viewers Modal state
    viewerState: {
        isOpen: false,
        groups: [],
        currentGroupIndex: 0,
        currentStatusIndex: 0
    },
    viewersModalStatus: null,

    setUploadProgress: (progress) => set({ uploadProgress: progress }),
    setUploading: (uploading) => set({ uploading }),

    openViewer: (groups, groupIndex = 0, statusIndex = 0) => {
        set({
            viewerState: {
                isOpen: true,
                groups,
                currentGroupIndex: groupIndex,
                currentStatusIndex: statusIndex
            }
        });
    },

    closeViewer: () => {
        set({
            viewerState: {
                isOpen: false,
                groups: [],
                currentGroupIndex: 0,
                currentStatusIndex: 0
            }
        });
    },

    setViewerStatusIndex: (newIndex) => {
        set((state) => ({
            viewerState: {
                ...state.viewerState,
                currentStatusIndex: newIndex
            }
        }));
    },

    setViewerGroupIndex: (newGroupIndex, newStatusIndex = 0) => {
        set((state) => ({
            viewerState: {
                ...state.viewerState,
                currentGroupIndex: newGroupIndex,
                currentStatusIndex: newStatusIndex
            }
        }));
    },

    openViewersModal: (status) => set({ viewersModalStatus: status }),
    closeViewersModal: () => set({ viewersModalStatus: null }),

    fetchFeed: async () => {
        set({ loading: true, error: null });
        try {
            const res = await getStatusFeedApi();
            if (res.success) {
                const { myStatus, contacts, muted } = res.data;
                const hasAnyUnviewed = (contacts || []).some((c) => c.hasUnviewed);
                set({
                    myStatus,
                    contacts: contacts || [],
                    muted: muted || [],
                    hasUnviewed: hasAnyUnviewed,
                    loading: false
                });
            }
        } catch (err) {
            console.error('Error fetching status feed:', err);
            set({ error: err.message || 'Failed to load status updates', loading: false });
        }
    },

    markViewed: async (statusId, ownerId) => {
        // Optimistic UI update
        set((state) => {
            const updateGroupStatuses = (groups) =>
                groups.map((grp) => {
                    const grpOwnerId = grp.user?._id || grp.user;
                    if (grpOwnerId === ownerId) {
                        const updatedStatuses = grp.statuses.map((st) =>
                            st._id === statusId ? { ...st, hasViewed: true } : st
                        );
                        const hasUnviewed = updatedStatuses.some((st) => !st.hasViewed);
                        return { ...grp, statuses: updatedStatuses, hasUnviewed };
                    }
                    return grp;
                });

            const newContacts = updateGroupStatuses(state.contacts);
            const newMuted = updateGroupStatuses(state.muted);
            const hasAnyUnviewed = newContacts.some((c) => c.hasUnviewed);

            return {
                contacts: newContacts,
                muted: newMuted,
                hasUnviewed: hasAnyUnviewed
            };
        });

        try {
            await markStatusViewedApi(statusId);
        } catch (err) {
            console.error('Failed to report status view to server:', err);
        }
    },

    deleteStatus: async (statusId) => {
        try {
            await deleteStatusApi(statusId);
            set((state) => {
                if (!state.myStatus) return state;
                const filtered = state.myStatus.statuses.filter((st) => st._id !== statusId);
                const updatedMyStatus = filtered.length > 0 ? {
                    ...state.myStatus,
                    statuses: filtered,
                    latestAt: filtered[filtered.length - 1]?.createdAt || null
                } : null;

                return { myStatus: updatedMyStatus };
            });
            return true;
        } catch (err) {
            console.error('Failed to delete status:', err);
            throw err;
        }
    },

    muteUser: async (userId) => {
        try {
            await muteStatusUserApi(userId);
            await get().fetchFeed();
        } catch (err) {
            console.error('Failed to mute user:', err);
            throw err;
        }
    },

    unmuteUser: async (userId) => {
        try {
            await unmuteStatusUserApi(userId);
            await get().fetchFeed();
        } catch (err) {
            console.error('Failed to unmute user:', err);
            throw err;
        }
    },

    replyToStatus: async (statusId, message) => {
        try {
            const res = await replyStatusApi(statusId, message);
            return res.data;
        } catch (err) {
            console.error('Failed to reply to status:', err);
            throw err;
        }
    },

    initSocketListeners: () => {
        const socket = getSocket();
        if (!socket) return;

        socket.off('status:new');
        socket.off('status:viewed');
        socket.off('status:deleted');

        // New status received: refetch or update feed
        socket.on('status:new', () => {
            get().fetchFeed();
        });

        // Someone viewed my status: update viewer count live
        socket.on('status:viewed', ({ statusId, viewer, viewedAt, viewCount }) => {
            set((state) => {
                if (!state.myStatus) return state;

                const updatedStatuses = state.myStatus.statuses.map((st) => {
                    if (st._id === statusId) {
                        const existingViewers = st.viewers || [];
                        const alreadyExists = existingViewers.some(
                            (v) => (v.user?._id || v.user)?.toString() === viewer._id.toString()
                        );
                        const viewers = alreadyExists
                            ? existingViewers
                            : [{ user: viewer, viewedAt }, ...existingViewers];
                        return {
                            ...st,
                            viewCount: viewCount || viewers.length,
                            viewers
                        };
                    }
                    return st;
                });

                return {
                    myStatus: {
                        ...state.myStatus,
                        statuses: updatedStatuses
                    }
                };
            });
        });

        // Status deleted
        socket.on('status:deleted', ({ statusId }) => {
            get().fetchFeed();
        });
    },

    // Client-side minute timer to remove expired statuses instantly
    checkExpiredStatuses: () => {
        const now = new Date();
        set((state) => {
            let changed = false;

            let updatedMyStatus = state.myStatus;
            if (state.myStatus && state.myStatus.statuses) {
                const active = state.myStatus.statuses.filter((st) => new Date(st.expiresAt) > now);
                if (active.length !== state.myStatus.statuses.length) {
                    changed = true;
                    updatedMyStatus = active.length > 0 ? {
                        ...state.myStatus,
                        statuses: active
                    } : null;
                }
            }

            const filterGroups = (groups) =>
                groups.map((grp) => {
                    const active = grp.statuses.filter((st) => new Date(st.expiresAt) > now);
                    if (active.length !== grp.statuses.length) {
                        changed = true;
                    }
                    return {
                        ...grp,
                        statuses: active,
                        hasUnviewed: active.some((st) => !st.hasViewed)
                    };
                }).filter((grp) => grp.statuses.length > 0);

            if (!changed) return state;

            const newContacts = filterGroups(state.contacts);
            const newMuted = filterGroups(state.muted);

            return {
                myStatus: updatedMyStatus,
                contacts: newContacts,
                muted: newMuted,
                hasUnviewed: newContacts.some((c) => c.hasUnviewed)
            };
        });
    }
}));

