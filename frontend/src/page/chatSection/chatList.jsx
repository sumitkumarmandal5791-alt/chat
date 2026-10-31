import React, { useState, useMemo, useEffect, useRef } from 'react';
import useLayoutStore from '../../store/layoutStore';
import useThemeStore from '../../store/themeStore';
import useuserStore from '../../store/useruserStore';
import { useGroupStore } from '../../store/groupStore';
import {
    Plus,
    Search,
    Camera,
    Video,
    Mic,
    Pin,
    BellOff,
    Archive,
    Trash2,
    Check,
    CheckCheck,
    X,
    Users,
    MessageSquareDashed,
    UserPlus
} from 'lucide-react';
import formatTimestamp from '../../utils/formatTime';
import { useChatStore } from '../../store/chatStore';
import { useStatusStore } from '../../store/statusStore';
import StatusRing from '../StatusSection/StatusRing';
import useOutside from '../../hooks/useOutside';
import { toast } from 'react-toastify';
import NewGroupModal from './NewGroupModal';
import GroupListItem from './GroupListItem';

const ChatList = ({ contacts = [] }) => {
    const selectedContact = useLayoutStore((state) => state.selectedContact);
    const setSelectedContact = useLayoutStore((state) => state.setSelectedContact);
    const { theme } = useThemeStore();
    const { user } = useuserStore();
    const conversations = useChatStore((state) => state.conversations?.data || []);
    const onlineUsers = useChatStore((state) => state.onlineUsers || new Map());
    const isUserTyping = useChatStore((state) => state.isUserTyping);

    const {
        groups,
        activeGroup,
        setActiveGroup,
        fetchMyGroups,
        initGroupSocketListeners,
        typingMembers
    } = useGroupStore();

    const statusContacts = useStatusStore((state) => state.contacts || []);

    const [filterTab, setFilterTab] = useState('all'); // 'all' | 'unread' | 'groups'
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isNewGroupModalOpen, setIsNewGroupModalOpen] = useState(false);
    const [modalSearchTerm, setModalSearchTerm] = useState('');

    // Right-click / context menu state
    const [contextMenu, setContextMenu] = useState(null); // { x, y, contact }
    const [pinnedChatIds, setPinnedChatIds] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem('wa_pinned_chats') || '[]');
        } catch {
            return [];
        }
    });
    const [mutedChatIds, setMutedChatIds] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem('wa_muted_chats') || '[]');
        } catch {
            return [];
        }
    });

    const contextMenuRef = useRef(null);
    useOutside(contextMenuRef, () => setContextMenu(null));

    const isDark = theme === 'dark';

    // Init groups on mount
    useEffect(() => {
        fetchMyGroups();
        initGroupSocketListeners();
    }, [fetchMyGroups, initGroupSocketListeners]);

    // Debounce search input
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearch(searchTerm);
        }, 180);
        return () => clearTimeout(handler);
    }, [searchTerm]);

    // Save pinned and muted chats
    useEffect(() => {
        localStorage.setItem('wa_pinned_chats', JSON.stringify(pinnedChatIds));
    }, [pinnedChatIds]);

    useEffect(() => {
        localStorage.setItem('wa_muted_chats', JSON.stringify(mutedChatIds));
    }, [mutedChatIds]);

    // Build contacts with conversation & status data
    const enhancedContacts = useMemo(() => {
        const currentUserId = (user?._id || user?.id)?.toString();

        return (contacts || [])
            .filter((c) => (c._id || c.id)?.toString() !== currentUserId)
            .map((contact) => {
                const cId = (contact._id || contact.id)?.toString();
                const storeConversation = conversations.find((conv) =>
                    conv.participants?.some((p) => (p._id || p)?.toString() === cId)
                );

                const isOnline = onlineUsers.get(cId)?.isOnline || false;
                const isTyping = isUserTyping ? isUserTyping(cId) : false;

                const statusGroup = statusContacts.find(
                    (sg) => (sg.user?._id || sg.user)?.toString() === cId
                );

                const conv = storeConversation || contact.conversation;
                const lastMsg = conv?.lastMessage;
                const isReceiver = String(lastMsg?.receiverId?._id || lastMsg?.receiverId || '') === currentUserId;
                const hasUnread = conv && conv.unreadCount > 0 && isReceiver;

                return {
                    ...contact,
                    cId,
                    type: 'direct',
                    isOnline,
                    isTyping,
                    isPinned: pinnedChatIds.includes(cId),
                    isMuted: mutedChatIds.includes(cId),
                    statuses: statusGroup?.statuses || [],
                    conversation: conv,
                    hasUnread: !!hasUnread,
                    latestTimestamp: new Date(conv?.lastMessage?.createdAt || 0).getTime()
                };
            });
    }, [contacts, conversations, onlineUsers, isUserTyping, statusContacts, user, pinnedChatIds, mutedChatIds]);

    // Enhanced groups list
    const enhancedGroups = useMemo(() => {
        return (groups || []).map((grp) => {
            const gId = (grp._id || grp.id)?.toString();
            return {
                ...grp,
                type: 'group',
                cId: gId,
                isPinned: pinnedChatIds.includes(gId),
                isMuted: mutedChatIds.includes(gId),
                hasUnread: (grp.unreadCount || 0) > 0,
                latestTimestamp: new Date(grp.lastMessage?.createdAt || grp.updatedAt || 0).getTime()
            };
        });
    }, [groups, pinnedChatIds, mutedChatIds]);

    // Filter & sort list based on active tab and search
    const displayedItems = useMemo(() => {
        const query = debouncedSearch.toLowerCase().trim();

        if (filterTab === 'groups') {
            return enhancedGroups
                .filter((g) => (g.name || '').toLowerCase().includes(query))
                .sort((a, b) => b.latestTimestamp - a.latestTimestamp);
        }

        if (filterTab === 'unread') {
            const unreadDirect = enhancedContacts.filter((c) => c.hasUnread);
            const unreadGroups = enhancedGroups.filter((g) => g.hasUnread);
            return [...unreadDirect, ...unreadGroups]
                .filter((item) => {
                    const name = item.name || item.username || '';
                    return name.toLowerCase().includes(query);
                })
                .sort((a, b) => b.latestTimestamp - a.latestTimestamp);
        }

        // 'all' tab: Combine direct contacts and groups, sort pinned first, then latest activity
        const combined = [...enhancedContacts, ...enhancedGroups].filter((item) => {
            const name = item.name || item.username || '';
            return name.toLowerCase().includes(query);
        });

        return combined.sort((a, b) => {
            if (a.isPinned && !b.isPinned) return -1;
            if (!a.isPinned && b.isPinned) return 1;
            return b.latestTimestamp - a.latestTimestamp;
        });
    }, [enhancedContacts, enhancedGroups, filterTab, debouncedSearch]);

    // Helper to get group typing label
    const getGroupTypingText = (groupId) => {
        const typingObj = typingMembers[groupId];
        if (!typingObj) return null;
        const currentUserId = (user?._id || user?.id)?.toString();
        const names = Object.entries(typingObj)
            .filter(([uid]) => uid !== currentUserId)
            .map(([, name]) => name);

        if (names.length === 0) return null;
        if (names.length === 1) return `${names[0]} is typing...`;
        if (names.length === 2) return `${names[0]} and ${names[1]} are typing...`;
        return `${names[0]} and ${names.length - 1} others are typing...`;
    };

    const handleContextMenu = (e, item) => {
        e.preventDefault();
        setContextMenu({
            x: Math.min(e.clientX, window.innerWidth - 180),
            y: Math.min(e.clientY, window.innerHeight - 200),
            item
        });
    };

    const togglePin = (cId) => {
        setPinnedChatIds((prev) =>
            prev.includes(cId) ? prev.filter((id) => id !== cId) : [...prev, cId]
        );
        toast.info(pinnedChatIds.includes(cId) ? 'Chat unpinned' : 'Chat pinned');
        setContextMenu(null);
    };

    const toggleMute = (cId) => {
        setMutedChatIds((prev) =>
            prev.includes(cId) ? prev.filter((id) => id !== cId) : [...prev, cId]
        );
        toast.info(mutedChatIds.includes(cId) ? 'Notifications unmuted' : 'Notifications muted');
        setContextMenu(null);
    };

    const renderDirectMessagePreview = (contact) => {
        if (contact.isTyping) {
            return (
                <span className="text-[#00a884] font-medium text-xs">
                    typing...
                </span>
            );
        }

        const lastMsg = contact.conversation?.lastMessage;
        if (!lastMsg) {
            return (
                <span className="text-[#8696a0] text-xs italic">
                    Tap to start chatting
                </span>
            );
        }

        const isSenderMe = String(lastMsg.senderId?._id || lastMsg.senderId) === String(user?._id || user?.id);

        return (
            <div className="flex items-center gap-1 text-xs text-[#8696a0] truncate">
                {isSenderMe && (
                    <span className="shrink-0">
                        {lastMsg.messageStatus === 'read' ? (
                            <CheckCheck size={14} className="text-[#53bdeb]" />
                        ) : lastMsg.messageStatus === 'delivered' ? (
                            <CheckCheck size={14} className="text-[#8696a0]" />
                        ) : (
                            <Check size={14} className="text-[#8696a0]" />
                        )}
                    </span>
                )}

                {lastMsg.contentType === 'image' && <Camera size={13} className="shrink-0 text-[#8696a0]" />}
                {lastMsg.contentType === 'video' && <Video size={13} className="shrink-0 text-[#8696a0]" />}
                {lastMsg.contentType === 'audio' && <Mic size={13} className="shrink-0 text-[#8696a0]" />}

                <span className="truncate">
                    {lastMsg.message ||
                        (lastMsg.contentType === 'image'
                            ? 'Photo'
                            : lastMsg.contentType === 'video'
                            ? 'Video'
                            : lastMsg.contentType === 'audio'
                            ? 'Audio'
                            : 'Attachment')}
                </span>
            </div>
        );
    };

    return (
        <div
            className={`w-full h-full flex flex-col border-r transition-colors duration-150 select-none ${
                isDark
                    ? 'bg-[#111b21] border-[#222d34] text-[#e9edef]'
                    : 'bg-[#ffffff] border-[#e9edef] text-[#111b21]'
            }`}
        >
            {/* 1. HEADER (48px height) */}
            <header
                className={`h-14 px-4 flex items-center justify-between shrink-0 border-b ${
                    isDark ? 'bg-[#202c33] border-[#222d34]' : 'bg-[#f0f2f5] border-[#e9edef]'
                }`}
            >
                <h1 className="text-xl font-bold tracking-tight">Chats</h1>

                <div className="flex items-center gap-1">
                    {/* New Group Button */}
                    <button
                        onClick={() => setIsNewGroupModalOpen(true)}
                        aria-label="New group"
                        title="New group"
                        className={`p-2 rounded-full transition-colors duration-150 ${
                            isDark
                                ? 'text-[#aebac1] hover:bg-[#374248] hover:text-[#e9edef]'
                                : 'text-[#54656f] hover:bg-[#e9edef] hover:text-[#111b21]'
                        }`}
                    >
                        <Users size={19} />
                    </button>

                    {/* New Direct Chat Button */}
                    <button
                        onClick={() => setIsModalOpen(true)}
                        aria-label="New chat"
                        title="New chat"
                        className={`p-2 rounded-full transition-colors duration-150 ${
                            isDark
                                ? 'text-[#aebac1] hover:bg-[#374248] hover:text-[#e9edef]'
                                : 'text-[#54656f] hover:bg-[#e9edef] hover:text-[#111b21]'
                        }`}
                    >
                        <Plus size={20} />
                    </button>
                </div>
            </header>

            {/* 2. SEARCH BAR (44px) */}
            <div className={`px-3 py-2 border-b ${isDark ? 'border-[#222d34]' : 'border-[#e9edef]'}`}>
                <div
                    className={`h-9 flex items-center gap-3 px-3 rounded-lg transition-colors ${
                        isDark ? 'bg-[#202c33] focus-within:bg-[#111b21]' : 'bg-[#f0f2f5] focus-within:bg-[#ffffff]'
                    } border border-transparent focus-within:border-[#00a884]/40`}
                >
                    <Search size={16} className="text-[#8696a0] shrink-0" />
                    <input
                        type="text"
                        placeholder="Search or start new chat"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="bg-transparent w-full text-sm outline-none placeholder-[#8696a0] text-inherit"
                    />
                    {searchTerm && (
                        <button
                            onClick={() => setSearchTerm('')}
                            aria-label="Clear search"
                            className="text-[#8696a0] hover:text-inherit"
                        >
                            <X size={15} />
                        </button>
                    )}
                </div>
            </div>

            {/* 3. FILTER CHIPS (All / Unread / Groups) */}
            <div className={`flex items-center gap-2 px-3 py-2 border-b ${isDark ? 'border-[#222d34]' : 'border-[#e9edef]'}`}>
                {[
                    { id: 'all', label: 'All' },
                    { id: 'unread', label: 'Unread' },
                    { id: 'groups', label: 'Groups' }
                ].map((tab) => {
                    const isActive = filterTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setFilterTab(tab.id)}
                            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                                isActive
                                    ? isDark
                                        ? 'bg-[#00a884]/20 text-[#00a884] font-semibold'
                                        : 'bg-[#e7fce3] text-[#008069] font-semibold'
                                    : isDark
                                    ? 'bg-[#202c33] text-[#8696a0] hover:bg-[#2a3942]'
                                    : 'bg-[#f0f2f5] text-[#54656f] hover:bg-[#e9edef]'
                            }`}
                        >
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {/* 4. CHAT ROWS LIST */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                {displayedItems.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
                        <MessageSquareDashed size={40} className="text-[#8696a0] mb-2 opacity-50" />
                        <p className="text-sm font-medium text-[#8696a0]">
                            {filterTab === 'unread'
                                ? 'No unread chats'
                                : filterTab === 'groups'
                                ? 'No groups found'
                                : 'No chats found'}
                        </p>
                        <p className="text-xs text-[#8696a0] opacity-80 mt-1">
                            {filterTab === 'groups'
                                ? 'Click the group icon above to create a new group'
                                : 'Click the + icon above to start a conversation'}
                        </p>
                    </div>
                ) : (
                    displayedItems.map((item) => {
                        // Render Group Item
                        if (item.type === 'group') {
                            const isSelected = activeGroup?._id === item._id;
                            return (
                                <GroupListItem
                                    key={`group-${item._id}`}
                                    group={item}
                                    isSelected={isSelected}
                                    typingText={getGroupTypingText(item._id)}
                                    onClick={() => {
                                        setSelectedContact(null);
                                        setActiveGroup(item);
                                    }}
                                />
                            );
                        }

                        // Render Direct 1:1 Contact Item
                        const contact = item;
                        const isSelected =
                            !activeGroup &&
                            (selectedContact?._id || selectedContact?.id)?.toString() === contact.cId;

                        return (
                            <div
                                key={`direct-${contact.cId}`}
                                onClick={() => {
                                    setActiveGroup(null);
                                    setSelectedContact(contact);
                                }}
                                onContextMenu={(e) => handleContextMenu(e, contact)}
                                className={`h-[72px] px-3 flex items-center cursor-pointer transition-colors border-b ${
                                    isDark ? 'border-[#222d34]' : 'border-[#f0f2f5]'
                                } ${
                                    isSelected
                                        ? isDark
                                            ? 'bg-[#2a3942]'
                                            : 'bg-[#f0f2f5]'
                                        : isDark
                                        ? 'hover:bg-[#202c33]'
                                        : 'hover:bg-[#f5f6f6]'
                                }`}
                            >
                                {/* Avatar with Story Ring & Presence Indicator */}
                                <div className="relative shrink-0 mr-3">
                                    {contact.statuses.length > 0 ? (
                                        <StatusRing statuses={contact.statuses} size={48} strokeWidth={2}>
                                            <img
                                                src={contact.profilePicture || 'https://via.placeholder.com/48'}
                                                alt={contact.username}
                                                className="w-full h-full object-cover rounded-full"
                                            />
                                        </StatusRing>
                                    ) : (
                                        <img
                                            src={contact.profilePicture || 'https://via.placeholder.com/48'}
                                            alt={contact.username}
                                            className="w-12 h-12 rounded-full object-cover"
                                        />
                                    )}

                                    {contact.isOnline && (
                                        <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-[#25d366] ring-2 ring-[#111b21]" />
                                    )}
                                </div>

                                {/* Text Column (1-line preview strictly truncated) */}
                                <div className="flex-1 min-w-0 flex flex-col justify-center">
                                    <div className="flex items-center justify-between mb-1">
                                        <h2 className="font-medium text-sm text-inherit truncate leading-tight">
                                            {contact.username || contact.name}
                                        </h2>
                                        {contact.conversation?.lastMessage && (
                                            <span
                                                className={`text-[11px] shrink-0 ml-2 ${
                                                    contact.hasUnread
                                                        ? 'text-[#25d366] font-semibold'
                                                        : 'text-[#8696a0]'
                                                }`}
                                            >
                                                {formatTimestamp(contact.conversation.lastMessage.createdAt)}
                                            </span>
                                        )}
                                    </div>

                                    <div className="flex items-center justify-between gap-2">
                                        <div className="truncate flex-1">
                                            {renderDirectMessagePreview(contact)}
                                        </div>

                                        <div className="flex items-center gap-1.5 shrink-0">
                                            {contact.isMuted && (
                                                <BellOff size={13} className="text-[#8696a0]" />
                                            )}
                                            {contact.isPinned && (
                                                <Pin size={13} className="text-[#8696a0] rotate-45" />
                                            )}
                                            {contact.hasUnread && (
                                                <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-[#25d366] text-[#111b21] font-bold text-[10px] flex items-center justify-center">
                                                    {contact.conversation.unreadCount}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Context Menu for Pin/Mute */}
            {contextMenu && (
                <div
                    ref={contextMenuRef}
                    style={{ top: `${contextMenu.y}px`, left: `${contextMenu.x}px` }}
                    className={`fixed z-50 w-44 rounded-xl shadow-2xl border py-1 select-none text-xs ${
                        isDark ? 'bg-[#202c33] border-[#2a3942] text-[#e9edef]' : 'bg-[#ffffff] border-[#e9edef] text-[#111b21]'
                    }`}
                >
                    <button
                        onClick={() => togglePin(contextMenu.item.cId)}
                        className={`w-full px-4 py-2 flex items-center gap-3 text-left transition-colors ${
                            isDark ? 'hover:bg-[#182229]' : 'hover:bg-[#f5f6f6]'
                        }`}
                    >
                        <Pin size={15} className="text-[#8696a0]" />
                        <span>{contextMenu.item.isPinned ? 'Unpin chat' : 'Pin chat'}</span>
                    </button>

                    <button
                        onClick={() => toggleMute(contextMenu.item.cId)}
                        className={`w-full px-4 py-2 flex items-center gap-3 text-left transition-colors ${
                            isDark ? 'hover:bg-[#182229]' : 'hover:bg-[#f5f6f6]'
                        }`}
                    >
                        <BellOff size={15} className="text-[#8696a0]" />
                        <span>{contextMenu.item.isMuted ? 'Unmute' : 'Mute notifications'}</span>
                    </button>

                    <button
                        onClick={() => {
                            toast.info('Chat archived');
                            setContextMenu(null);
                        }}
                        className={`w-full px-4 py-2 flex items-center gap-3 text-left transition-colors ${
                            isDark ? 'hover:bg-[#182229]' : 'hover:bg-[#f5f6f6]'
                        }`}
                    >
                        <Archive size={15} className="text-[#8696a0]" />
                        <span>Archive chat</span>
                    </button>

                    <div className={`h-[1px] my-1 ${isDark ? 'bg-[#2a3942]' : 'bg-[#e9edef]'}`} />

                    <button
                        onClick={() => {
                            toast.info('Chat deleted');
                            setContextMenu(null);
                        }}
                        className={`w-full px-4 py-2 flex items-center gap-3 text-left text-rose-500 transition-colors ${
                            isDark ? 'hover:bg-[#182229]' : 'hover:bg-[#f5f6f6]'
                        }`}
                    >
                        <Trash2 size={15} />
                        <span>Delete chat</span>
                    </button>
                </div>
            )}

            {/* New Group Modal */}
            <NewGroupModal
                isOpen={isNewGroupModalOpen}
                onClose={() => setIsNewGroupModalOpen(false)}
                contacts={contacts}
                onGroupCreated={(createdGroup) => {
                    setSelectedContact(null);
                    setActiveGroup(createdGroup);
                }}
            />

            {/* New Chat Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
                    <div
                        className={`relative w-full max-w-md max-h-[80vh] flex flex-col rounded-lg shadow-2xl border overflow-hidden ${
                            isDark ? 'bg-[#111b21] border-[#222d34] text-[#e9edef]' : 'bg-white border-[#e9edef] text-[#111b21]'
                        }`}
                    >
                        <div className={`h-14 px-4 flex items-center justify-between border-b ${isDark ? 'border-[#222d34]' : 'border-[#e9edef]'}`}>
                            <h3 className="font-bold text-base">New Chat</h3>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="p-1 text-[#8696a0] hover:text-inherit"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className={`p-3 border-b ${isDark ? 'border-[#222d34]' : 'border-[#e9edef]'}`}>
                            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${isDark ? 'bg-[#202c33]' : 'bg-[#f0f2f5]'}`}>
                                <Search size={15} className="text-[#8696a0]" />
                                <input
                                    type="text"
                                    placeholder="Search contacts..."
                                    value={modalSearchTerm}
                                    onChange={(e) => setModalSearchTerm(e.target.value)}
                                    className="bg-transparent w-full text-sm outline-none text-inherit placeholder-[#8696a0]"
                                />
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
                            {contacts
                                .filter((c) => (c._id || c.id)?.toString() !== (user?._id || user?.id)?.toString())
                                .filter((c) => (c.username || c.name || '').toLowerCase().includes(modalSearchTerm.toLowerCase()))
                                .map((contactItem) => (
                                    <div
                                        key={contactItem._id || contactItem.id}
                                        onClick={() => {
                                            setActiveGroup(null);
                                            setSelectedContact(contactItem);
                                            setIsModalOpen(false);
                                        }}
                                        className={`flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-colors ${
                                            isDark ? 'hover:bg-[#202c33]' : 'hover:bg-[#f0f2f5]'
                                        }`}
                                    >
                                        <img
                                            src={contactItem.profilePicture || 'https://via.placeholder.com/40'}
                                            alt={contactItem.username}
                                            className="w-10 h-10 rounded-full object-cover"
                                        />
                                        <div>
                                            <p className="text-sm font-medium">{contactItem.username || contactItem.name}</p>
                                            <p className="text-xs text-[#8696a0]">{contactItem.about || 'Hey there! I am using WhatsApp.'}</p>
                                        </div>
                                    </div>
                                ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ChatList;
