import React, { useState, useEffect } from 'react';
import {
    Plus,
    CircleDashed,
    Eye,
    ChevronDown,
    ChevronUp,
    RefreshCw,
    Shield,
    MoreVertical
} from 'lucide-react';
import useuserStore from '../../store/useruserStore';
import useThemeStore from '../../store/themeStore';
import { useStatusStore } from '../../store/statusStore';
import StatusRing from './StatusRing';
import StatusCreator from './StatusCreator';
import StatusViewer from './StatusViewer';
import formatTimestamp from '../../utils/formatTime';
import { useNavigate } from 'react-router-dom';

const Status = () => {
    const { user: currentUser } = useuserStore();
    const { theme } = useThemeStore();
    const isDark = theme === 'dark';
    const navigate = useNavigate();

    const [isCreatorOpen, setIsCreatorOpen] = useState(false);
    const [showMutedSection, setShowMutedSection] = useState(false);

    const {
        myStatus,
        contacts,
        muted,
        loading,
        error,
        fetchFeed,
        markViewed,
        deleteStatus,
        muteUser,
        unmuteUser,
        replyToStatus,
        initSocketListeners,
        checkExpiredStatuses,
        viewerState,
        openViewer,
        closeViewer
    } = useStatusStore();

    useEffect(() => {
        fetchFeed();
        initSocketListeners();

        const interval = setInterval(() => {
            checkExpiredStatuses();
        }, 60000);

        return () => clearInterval(interval);
    }, [fetchFeed, initSocketListeners, checkExpiredStatuses]);

    const recentContacts = (contacts || []).filter((c) => c.hasUnviewed);
    const viewedContacts = (contacts || []).filter((c) => !c.hasUnviewed);

    const allViewerGroups = [];
    if (myStatus && myStatus.statuses?.length > 0) {
        allViewerGroups.push(myStatus);
    }
    allViewerGroups.push(...recentContacts);
    allViewerGroups.push(...viewedContacts);
    allViewerGroups.push(...muted);

    const handleOpenGroup = (targetGroup) => {
        const foundIdx = allViewerGroups.findIndex(
            (g) => (g.user?._id || g.user)?.toString() === (targetGroup.user?._id || targetGroup.user)?.toString()
        );
        if (foundIdx !== -1) {
            openViewer(allViewerGroups, foundIdx, 0);
        }
    };

    return (
        <div
            className={`w-full h-full flex flex-col select-none overflow-y-auto transition-colors duration-150 ${
                isDark ? 'bg-[#111b21] text-[#e9edef]' : 'bg-[#f0f2f5] text-[#111b21]'
            }`}
        >
            {/* 1. HEADER (56px) */}
            <header
                className={`h-14 px-4 flex items-center justify-between shrink-0 border-b ${
                    isDark ? 'bg-[#202c33] border-[#222d34]' : 'bg-[#f0f2f5] border-[#e9edef]'
                }`}
            >
                <h1 className="text-xl font-bold tracking-tight">Status</h1>

                <div className="flex items-center gap-1">
                    <button
                        onClick={() => navigate('/setting')}
                        aria-label="Status privacy"
                        title="Status privacy"
                        className={`p-2 rounded-full transition-colors ${
                            isDark ? 'text-[#8696a0] hover:text-[#e9edef]' : 'text-[#54656f] hover:text-[#111b21]'
                        }`}
                    >
                        <Shield size={19} />
                    </button>

                    <button
                        onClick={() => setIsCreatorOpen(true)}
                        aria-label="Add status"
                        title="Add status"
                        className="p-2 rounded-full bg-[#00a884] text-white hover:bg-[#008f6f] transition-colors shadow-xs ml-1"
                    >
                        <Plus size={18} />
                    </button>
                </div>
            </header>

            {/* Error Banner */}
            {error && (
                <div className="m-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-between text-xs">
                    <span>{error}</span>
                    <button
                        onClick={fetchFeed}
                        className="flex items-center gap-1 font-semibold hover:underline"
                    >
                        <RefreshCw size={12} />
                        <span>Retry</span>
                    </button>
                </div>
            )}

            {/* Content List */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-3 max-w-xl mx-auto w-full space-y-4">
                {/* 1. MY STATUS ROW */}
                <div
                    className={`p-3 rounded-lg border transition-colors shadow-xs ${
                        isDark ? 'bg-[#202c33] border-[#222d34]' : 'bg-white border-[#e9edef]'
                    }`}
                >
                    <div className="flex items-center justify-between">
                        <div
                            className="flex items-center gap-3.5 cursor-pointer flex-1 min-w-0"
                            onClick={() => {
                                if (myStatus && myStatus.statuses?.length > 0) {
                                    handleOpenGroup(myStatus);
                                } else {
                                    setIsCreatorOpen(true);
                                }
                            }}
                        >
                            <div className="relative shrink-0">
                                {myStatus && myStatus.statuses?.length > 0 ? (
                                    <StatusRing statuses={myStatus.statuses} size={52} strokeWidth={2}>
                                        <img
                                            src={currentUser?.profilePicture || 'https://via.placeholder.com/48'}
                                            alt="My avatar"
                                            className="w-full h-full object-cover rounded-full"
                                        />
                                    </StatusRing>
                                ) : (
                                    <div className="w-12 h-12 rounded-full overflow-hidden bg-slate-700">
                                        <img
                                            src={currentUser?.profilePicture || 'https://via.placeholder.com/48'}
                                            alt="My avatar"
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                )}

                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setIsCreatorOpen(true);
                                    }}
                                    aria-label="Add status update"
                                    className="absolute bottom-0 right-0 w-4 h-4 rounded-full bg-[#00a884] text-white flex items-center justify-center ring-2 ring-[#202c33]"
                                >
                                    <Plus size={10} strokeWidth={3} />
                                </button>
                            </div>

                            <div className="min-w-0 flex-1">
                                <h2 className="font-medium text-sm text-inherit truncate">My status</h2>
                                <p className="text-xs text-[#8696a0] truncate mt-0.5">
                                    {myStatus && myStatus.statuses?.length > 0
                                        ? `${formatTimestamp(myStatus.latestAt)} • ${myStatus.totalViews || 0} views`
                                        : 'Tap to add status update'}
                                </p>
                            </div>
                        </div>

                        {myStatus && myStatus.statuses?.length > 0 && (
                            <button
                                onClick={() => handleOpenGroup(myStatus)}
                                aria-label="View my status"
                                className={`p-2 rounded-full text-[#8696a0] hover:text-[#00a884] transition-colors`}
                            >
                                <Eye size={18} />
                            </button>
                        )}
                    </div>
                </div>

                {/* Skeletons Loading */}
                {loading && (
                    <div className="space-y-3 py-2">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="flex items-center gap-3 animate-pulse px-2">
                                <div className="w-12 h-12 rounded-full bg-slate-700/50" />
                                <div className="space-y-1.5 flex-1">
                                    <div className="w-1/3 h-3.5 bg-slate-700/50 rounded" />
                                    <div className="w-1/4 h-2.5 bg-slate-700/30 rounded" />
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* 2. RECENT UPDATES (Unviewed) */}
                {!loading && recentContacts.length > 0 && (
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-[#00a884] px-2 mb-2">
                            Recent updates
                        </p>
                        <div className="space-y-1">
                            {recentContacts.map((group) => {
                                const cId = group.user?._id || group.user;
                                return (
                                    <div
                                        key={cId}
                                        onClick={() => handleOpenGroup(group)}
                                        className={`flex items-center gap-3.5 p-2.5 rounded-lg cursor-pointer transition-colors ${
                                            isDark ? 'hover:bg-[#202c33]' : 'hover:bg-white'
                                        }`}
                                    >
                                        <StatusRing statuses={group.statuses} size={48} strokeWidth={2}>
                                            <img
                                                src={group.user?.profilePicture || 'https://via.placeholder.com/48'}
                                                alt={group.user?.username}
                                                className="w-full h-full object-cover rounded-full"
                                            />
                                        </StatusRing>

                                        <div className="min-w-0 flex-1">
                                            <p className="font-medium text-sm text-inherit truncate">
                                                {group.user?.username || group.user?.name || 'Contact'}
                                            </p>
                                            <p className="text-xs text-[#8696a0] truncate mt-0.5">
                                                {formatTimestamp(group.latestAt)}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* 3. VIEWED UPDATES */}
                {!loading && viewedContacts.length > 0 && (
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-[#8696a0] px-2 mb-2">
                            Viewed updates
                        </p>
                        <div className="space-y-1">
                            {viewedContacts.map((group) => {
                                const cId = group.user?._id || group.user;
                                return (
                                    <div
                                        key={cId}
                                        onClick={() => handleOpenGroup(group)}
                                        className={`flex items-center gap-3.5 p-2.5 rounded-lg cursor-pointer transition-colors opacity-75 hover:opacity-100 ${
                                            isDark ? 'hover:bg-[#202c33]' : 'hover:bg-white'
                                        }`}
                                    >
                                        <StatusRing statuses={group.statuses} size={48} strokeWidth={2}>
                                            <img
                                                src={group.user?.profilePicture || 'https://via.placeholder.com/48'}
                                                alt={group.user?.username}
                                                className="w-full h-full object-cover rounded-full"
                                            />
                                        </StatusRing>

                                        <div className="min-w-0 flex-1">
                                            <p className="font-medium text-sm text-inherit truncate">
                                                {group.user?.username || group.user?.name || 'Contact'}
                                            </p>
                                            <p className="text-xs text-[#8696a0] truncate mt-0.5">
                                                {formatTimestamp(group.latestAt)}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* 4. MUTED UPDATES */}
                {!loading && muted.length > 0 && (
                    <div className="pt-2 border-t border-[#222d34]">
                        <button
                            onClick={() => setShowMutedSection((prev) => !prev)}
                            className="w-full flex items-center justify-between py-2 px-2 text-xs font-semibold uppercase tracking-wider text-[#8696a0] hover:text-inherit"
                        >
                            <span>Muted updates ({muted.length})</span>
                            {showMutedSection ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </button>

                        {showMutedSection && (
                            <div className="space-y-1 pt-1">
                                {muted.map((group) => {
                                    const cId = group.user?._id || group.user;
                                    return (
                                        <div
                                            key={cId}
                                            className={`flex items-center justify-between p-2.5 rounded-lg ${
                                                isDark ? 'hover:bg-[#202c33]' : 'hover:bg-white'
                                            }`}
                                        >
                                            <div
                                                className="flex items-center gap-3.5 cursor-pointer flex-1 min-w-0"
                                                onClick={() => handleOpenGroup(group)}
                                            >
                                                <StatusRing statuses={group.statuses} size={48} strokeWidth={2}>
                                                    <img
                                                        src={group.user?.profilePicture || 'https://via.placeholder.com/48'}
                                                        alt={group.user?.username}
                                                        className="w-full h-full object-cover rounded-full"
                                                    />
                                                </StatusRing>

                                                <div className="min-w-0 flex-1">
                                                    <p className="font-medium text-sm text-inherit truncate">
                                                        {group.user?.username || group.user?.name || 'Contact'}
                                                    </p>
                                                    <p className="text-xs text-[#8696a0] truncate mt-0.5">
                                                        {formatTimestamp(group.latestAt)}
                                                    </p>
                                                </div>
                                            </div>

                                            <button
                                                onClick={() => unmuteUser(cId)}
                                                className="text-xs px-2.5 py-1 rounded-full border border-[#00a884] text-[#00a884] hover:bg-[#00a884]/10 transition-colors"
                                            >
                                                Unmute
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                {/* Empty State */}
                {!loading && recentContacts.length === 0 && viewedContacts.length === 0 && (
                    <div className="py-20 text-center text-[#8696a0]">
                        <CircleDashed className="mx-auto mb-2 opacity-40 text-[#00a884]" size={36} />
                        <p className="text-sm font-medium">No status updates</p>
                        <p className="text-xs opacity-75 mt-0.5">
                            Recent updates from your contacts will appear here
                        </p>
                    </div>
                )}
            </div>

            {/* Status Creator Modal */}
            <StatusCreator
                isOpen={isCreatorOpen}
                onClose={() => setIsCreatorOpen(false)}
                contacts={contacts.map((c) => c.user)}
            />

            {/* Status Viewer Modal */}
            {viewerState.isOpen && (
                <StatusViewer
                    isOpen={viewerState.isOpen}
                    groups={viewerState.groups}
                    initialGroupIndex={viewerState.currentGroupIndex}
                    initialStatusIndex={viewerState.currentStatusIndex}
                    currentUserId={currentUser?._id || currentUser?.id}
                    onClose={closeViewer}
                    onViewStatus={markViewed}
                    onDeleteStatus={deleteStatus}
                    onMuteUser={muteUser}
                    onReplyStatus={replyToStatus}
                />
            )}
        </div>
    );
};

export default Status;
