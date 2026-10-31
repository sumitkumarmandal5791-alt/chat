import React, { useState, useEffect, useRef, useMemo, lazy, Suspense } from 'react';
import {
    Send,
    Mic,
    Paperclip,
    ArrowLeft,
    X,
    Lock,
    Smile,
    Image as ImageIcon,
    FileText,
    ChevronDown,
    Search,
    Phone,
    Video,
    MoreVertical,
    Reply
} from 'lucide-react';
import { useChatStore } from '../../store/chatStore';
import { useGroupStore } from '../../store/groupStore';
import useuserStore from '../../store/useruserStore';
import useThemeStore from '../../store/themeStore';
import formatTimestamp from '../../utils/formatTime';
import { isToday, isYesterday, format } from 'date-fns';
import MessageBubble from './messageBubble';
import GroupChatHeader from './GroupChatHeader';
import GroupMessageBubble from './GroupMessageBubble';
import GroupInfoPanel from './GroupInfoPanel';
import MessageInfoModal from './MessageInfoModal';
import { Virtuoso } from 'react-virtuoso';
import { toast } from 'react-toastify';
import { getSocket } from '../../services/chatService';

const Picker = lazy(() => import('emoji-picker-react'));

const ChatWindow = ({ selectedContact, setSelectedContact, isMobile, allContacts = [] }) => {
    const [message, setMessage] = useState('');
    const [replyTarget, setReplyTarget] = useState(null);
    const [showEmoji, setShowEmoji] = useState(false);
    const [showFileMenu, setShowFileMenu] = useState(false);
    const [filePreview, setFilePreview] = useState(null);
    const [attachment, setAttachment] = useState(null);
    const [lightboxMedia, setLightboxMedia] = useState(null);
    const [showScrollBottom, setShowScrollBottom] = useState(false);
    const [newMessagesWhileScrolled, setNewMessagesWhileScrolled] = useState(0);

    // Group-specific UI state
    const [showGroupInfoPanel, setShowGroupInfoPanel] = useState(false);
    const [messageInfoTarget, setMessageInfoTarget] = useState(null);
    const [mentionQuery, setMentionQuery] = useState(null); // string query or null

    const { theme } = useThemeStore();
    const isDark = theme === 'dark';
    const { user: currentUser } = useuserStore();

    const typingTimeoutRef = useRef(null);
    const virtuosoRef = useRef(null);
    const fileInputRef = useRef(null);
    const emojiPickerRef = useRef(null);
    const fileMenuRef = useRef(null);
    const textareaRef = useRef(null);

    // 1-to-1 Chat Store
    const {
        messages,
        conversations,
        currentConversation,
        fetchMessages,
        sendMessage,
        deleteMessage,
        addReaction,
        startTyping,
        endTyping,
        isUserTyping,
        isUserOnline,
        getUserLastSeen,
        markMessageAsRead
    } = useChatStore();

    // Group Chat Store
    const {
        activeGroup,
        activeGroupDetails,
        groupMessages,
        setActiveGroup,
        sendMessage: sendGroupMessage,
        typingMembers
    } = useGroupStore();

    const isGroupMode = !!activeGroup;
    const currentGroupId = activeGroup?._id || activeGroup?.id;
    const currentGroup = activeGroupDetails || activeGroup;

    const contactId = selectedContact?._id || selectedContact?.id;
    const isOnline = contactId ? isUserOnline(contactId) : false;
    const lastSeen = contactId ? getUserLastSeen(contactId) : null;
    const isTyping = contactId ? isUserTyping(contactId) : false;

    // Determine if current user can send in this group
    const isGroupAdmin = useMemo(() => {
        if (!isGroupMode || !currentGroup?.members) return false;
        const currentUserId = (currentUser?._id || currentUser?.id)?.toString();
        const m = currentGroup.members.find(
            (mem) => (mem.userId?._id || mem.userId)?.toString() === currentUserId
        );
        return m?.role === 'admin' || m?.role === 'owner';
    }, [isGroupMode, currentGroup, currentUser]);

    const canSendInGroup = useMemo(() => {
        if (!isGroupMode) return true;
        const setting = currentGroup?.settings?.whoCanSend || 'all';
        if (setting === 'admins') {
            return isGroupAdmin;
        }
        return true;
    }, [isGroupMode, currentGroup, isGroupAdmin]);

    // Group typing text
    const groupTypingText = useMemo(() => {
        if (!isGroupMode || !currentGroupId) return null;
        const typingObj = typingMembers[currentGroupId];
        if (!typingObj) return null;
        const currentUserId = (currentUser?._id || currentUser?.id)?.toString();
        const names = Object.entries(typingObj)
            .filter(([uid]) => uid !== currentUserId)
            .map(([, name]) => name);

        if (names.length === 0) return null;
        if (names.length === 1) return `${names[0]} is typing...`;
        if (names.length === 2) return `${names[0]} and ${names[1]} are typing...`;
        return `${names[0]} and ${names.length - 1} others are typing...`;
    }, [isGroupMode, currentGroupId, typingMembers, currentUser]);

    // Group mention suggestions
    const mentionSuggestions = useMemo(() => {
        if (!isGroupMode || mentionQuery === null || !currentGroup?.members) return [];
        const q = mentionQuery.toLowerCase();
        return currentGroup.members
            .map((m) => m.userId)
            .filter(Boolean)
            .filter((u) => {
                const name = u.username || u.name || '';
                return name.toLowerCase().includes(q);
            })
            .slice(0, 5);
    }, [isGroupMode, mentionQuery, currentGroup]);

    // Load draft on contact or group switch
    useEffect(() => {
        const key = isGroupMode ? `wa_draft_group_${currentGroupId}` : contactId ? `wa_draft_${contactId}` : null;
        if (key) {
            const savedDraft = localStorage.getItem(key) || '';
            setMessage(savedDraft);
            setReplyTarget(null);
            setAttachment(null);
            setFilePreview(null);
        }
    }, [contactId, currentGroupId, isGroupMode]);

    // Save draft
    useEffect(() => {
        const key = isGroupMode ? `wa_draft_group_${currentGroupId}` : contactId ? `wa_draft_${contactId}` : null;
        if (key) {
            if (message) {
                localStorage.setItem(key, message);
            } else {
                localStorage.removeItem(key);
            }
        }
    }, [message, contactId, currentGroupId, isGroupMode]);

    // 1-to-1 conversation messages
    useEffect(() => {
        if (!isGroupMode && contactId) {
            const conversation = conversations?.data?.find((c) =>
                c?.participants?.some((p) => (p._id || p)?.toString() === contactId?.toString())
            );
            if (conversation?._id) {
                if (currentConversation?._id !== conversation._id) {
                    fetchMessages(conversation);
                }
            } else {
                useChatStore.setState({ messages: [], currentConversation: null });
            }
        }
    }, [isGroupMode, contactId, conversations, currentConversation, fetchMessages]);

    // Mark 1-to-1 messages as read
    useEffect(() => {
        if (!isGroupMode && messages.length > 0 && currentConversation?._id && contactId) {
            markMessageAsRead();
        }
    }, [isGroupMode, messages.length, currentConversation, contactId, markMessageAsRead]);

    // Group typing socket emission
    const handleGroupTyping = (text) => {
        if (!isGroupMode || !currentGroupId) return;
        const socket = getSocket();
        if (!socket) return;

        socket.emit('group:typing_start', {
            groupId: currentGroupId,
            username: currentUser?.username || currentUser?.name || 'Someone'
        });

        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
        }

        typingTimeoutRef.current = setTimeout(() => {
            socket.emit('group:typing_stop', {
                groupId: currentGroupId,
                username: currentUser?.username || currentUser?.name || 'Someone'
            });
        }, 2000);
    };

    // 1-to-1 typing socket emission
    useEffect(() => {
        if (!isGroupMode && message && contactId) {
            startTyping(contactId);

            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
            }

            typingTimeoutRef.current = setTimeout(() => {
                endTyping(contactId);
            }, 2000);

            return () => {
                if (typingTimeoutRef.current) {
                    clearTimeout(typingTimeoutRef.current);
                    endTyping(contactId);
                }
            };
        }
    }, [isGroupMode, message, contactId, startTyping, endTyping]);

    // Click outside handler
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (fileMenuRef.current && !fileMenuRef.current.contains(e.target)) {
                setShowFileMenu(false);
            }
            if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target)) {
                setShowEmoji(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Text input handler with mention trigger
    const handleTextChange = (e) => {
        const val = e.target.value;
        setMessage(val);

        if (isGroupMode) {
            handleGroupTyping(val);

            // Check for @mention trigger
            const cursor = e.target.selectionStart;
            const textBeforeCursor = val.slice(0, cursor);
            const lastAt = textBeforeCursor.lastIndexOf('@');
            if (lastAt !== -1 && !textBeforeCursor.slice(lastAt).includes(' ')) {
                setMentionQuery(textBeforeCursor.slice(lastAt + 1));
            } else {
                setMentionQuery(null);
            }
        }
    };

    const handleSelectMention = (userToMention) => {
        const username = userToMention.username || userToMention.name || '';
        const cursor = textareaRef.current?.selectionStart || message.length;
        const textBeforeCursor = message.slice(0, cursor);
        const lastAt = textBeforeCursor.lastIndexOf('@');
        const textAfterCursor = message.slice(cursor);

        const newText = `${message.slice(0, lastAt)}@${username} ${textAfterCursor}`;
        setMessage(newText);
        setMentionQuery(null);
        setTimeout(() => {
            textareaRef.current?.focus();
        }, 50);
    };

    // File selection
    const handleFileChange = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 50 * 1024 * 1024) {
            toast.error('File size exceeds 50 MB limit');
            return;
        }

        setAttachment(file);
        setFilePreview(URL.createObjectURL(file));
        setShowFileMenu(false);
    };

    // Send Message (Direct or Group)
    const handleSendMessage = async () => {
        if (!message.trim() && !attachment) return;

        const currentReply = replyTarget;
        const currentAttachment = attachment;
        const trimmed = message.trim();

        // Clear input state immediately
        setMessage('');
        setAttachment(null);
        setFilePreview(null);
        setReplyTarget(null);
        setMentionQuery(null);

        try {
            if (isGroupMode) {
                // Group Message Sending
                const formData = new FormData();
                if (currentAttachment) {
                    formData.append('media', currentAttachment);
                }
                if (trimmed) {
                    formData.append('message', trimmed);
                }
                if (currentReply) {
                    formData.append('replyTo', currentReply._id);
                }

                // Extract mentions
                const mentionMatches = trimmed.match(/@(\w+)/g) || [];
                if (mentionMatches.length > 0 && currentGroup?.members) {
                    const cleanNames = mentionMatches.map((m) => m.slice(1).toLowerCase());
                    const matchedUserIds = currentGroup.members
                        .filter((mem) => {
                            const uname = (mem.userId?.username || mem.userId?.name || '').toLowerCase();
                            return cleanNames.includes(uname);
                        })
                        .map((mem) => mem.userId?._id || mem.userId);

                    if (matchedUserIds.length > 0) {
                        formData.append('mentions', JSON.stringify(matchedUserIds));
                    }
                }

                await sendGroupMessage(currentGroupId, formData);
            } else {
                // 1-to-1 Message Sending
                const formData = new FormData();
                formData.append('senderId', currentUser?._id || currentUser?.id);
                formData.append('receiverId', contactId);

                let determinedContentType = 'text';
                if (currentAttachment) {
                    formData.append('media', currentAttachment);
                    determinedContentType = currentAttachment.type.startsWith('video') ? 'video' : 'image';
                }
                formData.append('contentType', determinedContentType);

                const status = isOnline ? 'delivered' : 'sent';
                formData.append('messageStatus', status);

                if (trimmed) {
                    formData.append('content', trimmed);
                }

                if (currentReply) {
                    const replyPayload = {
                        messageId: currentReply._id,
                        statusId: currentReply.statusId,
                        senderName:
                            currentReply.senderName ||
                            currentReply.senderId?.username ||
                            currentReply.senderId?.name ||
                            'User',
                        text: currentReply.content || currentReply.message || currentReply.text || '',
                        mediaUrl: currentReply.image || currentReply.video || currentReply.mediaUrl || null,
                        contentType: currentReply.contentType || 'text'
                    };
                    formData.append('replyTo', JSON.stringify(replyPayload));
                }

                await sendMessage(formData);
            }

            setTimeout(() => {
                const total = isGroupMode ? groupMessages.length : messages.length;
                virtuosoRef.current?.scrollToIndex({
                    index: total,
                    behavior: 'smooth'
                });
            }, 60);
        } catch (error) {
            console.error('Failed to send message:', error);
            toast.error(error.response?.data?.message || 'Failed to deliver message');
        }
    };

    // Formatted items with date separators
    const formattedItems = useMemo(() => {
        const activeList = isGroupMode ? groupMessages : messages;
        const items = [];
        let lastDate = null;

        activeList.forEach((msg) => {
            const createdAt = new Date(msg.createdAt || Date.now());
            const dateStr = createdAt.toDateString();

            if (dateStr !== lastDate) {
                lastDate = dateStr;
                let label = format(createdAt, 'MMMM d, yyyy');
                if (isToday(createdAt)) label = 'Today';
                else if (isYesterday(createdAt)) label = 'Yesterday';

                items.push({
                    type: 'date',
                    id: `date-${dateStr}`,
                    label
                });
            }

            items.push({
                type: 'message',
                id: msg._id,
                data: msg
            });
        });

        return items;
    }, [isGroupMode, groupMessages, messages]);

    /* ── Empty State ────────────────────────────────── */
    if (!selectedContact && !activeGroup) {
        return (
            <div
                className={`flex-1 flex flex-col items-center justify-center h-full select-none border-b-[6px] border-[#00a884] ${
                    isDark ? 'bg-[#222e35] text-[#8696a0]' : 'bg-[#f0f2f5] text-[#54656f]'
                }`}
            >
                <div className="max-w-md px-6 text-center">
                    <h2 className={`text-2xl font-light tracking-tight mb-3 ${isDark ? 'text-[#e9edef]' : 'text-[#41525d]'}`}>
                        WhatsApp Web
                    </h2>
                    <p className="text-sm leading-relaxed mb-6 opacity-80">
                        Send and receive messages with friends and groups without keeping your phone online.
                    </p>
                    <div className="inline-flex items-center gap-1.5 text-xs text-[#8696a0] opacity-80">
                        <Lock size={12} />
                        <span>End-to-end encrypted</span>
                    </div>
                </div>
            </div>
        );
    }

    const hasContentToSend = message.trim().length > 0 || attachment !== null;

    return (
        <div className="flex-1 flex flex-col h-full w-full relative overflow-hidden select-none">
            {/* 1. HEADER */}
            {isGroupMode ? (
                <GroupChatHeader
                    group={activeGroup}
                    groupDetails={activeGroupDetails}
                    onBack={() => setActiveGroup(null)}
                    onOpenInfo={() => setShowGroupInfoPanel(true)}
                    typingText={groupTypingText}
                    isMobile={isMobile}
                />
            ) : (
                <header
                    className={`h-14 px-4 flex items-center justify-between border-b z-20 shrink-0 ${
                        isDark ? 'bg-[#202c33] border-[#222d34] text-[#e9edef]' : 'bg-[#f0f2f5] border-[#e9edef] text-[#111b21]'
                    }`}
                >
                    <div className="flex items-center gap-3 min-w-0">
                        {isMobile && (
                            <button
                                onClick={() => setSelectedContact(null)}
                                aria-label="Back to chat list"
                                className="p-1 -ml-1 text-[#8696a0] hover:text-inherit"
                            >
                                <ArrowLeft size={18} />
                            </button>
                        )}

                        <div className="relative shrink-0">
                            <img
                                src={selectedContact?.profilePicture || 'https://via.placeholder.com/40'}
                                alt={selectedContact?.username}
                                className="w-10 h-10 rounded-full object-cover"
                            />
                            {isOnline && (
                                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-[#25d366] rounded-full ring-2 ring-[#202c33]" />
                            )}
                        </div>

                        <div className="min-w-0 flex-1">
                            <h2 className="font-medium text-sm leading-tight truncate">
                                {selectedContact?.username || selectedContact?.name}
                            </h2>
                            <p className="text-xs text-[#8696a0] truncate mt-0.5">
                                {isTyping
                                    ? 'typing...'
                                    : isOnline
                                    ? 'online'
                                    : lastSeen
                                    ? `last seen ${formatTimestamp(lastSeen)}`
                                    : 'offline'}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 text-[#8696a0]">
                        <button
                            onClick={() => toast.info('Starting voice call...')}
                            className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                        >
                            <Phone size={18} />
                        </button>
                        <button
                            onClick={() => toast.info('Starting video call...')}
                            className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                        >
                            <Video size={18} />
                        </button>
                        <button
                            onClick={() => toast.info('Search in chat')}
                            className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                        >
                            <Search size={18} />
                        </button>
                    </div>
                </header>
            )}

            {/* 2. CHAT MESSAGES BODY */}
            <div
                className={`flex-1 relative overflow-hidden transition-colors ${
                    isDark ? 'bg-[#0b141a]' : 'bg-[#efeae2]'
                }`}
                style={{
                    backgroundImage: isDark
                        ? `radial-gradient(circle at 50% 50%, rgba(255,255,255,0.015) 0%, transparent 100%)`
                        : `radial-gradient(circle at 50% 50%, rgba(0,0,0,0.02) 0%, transparent 100%)`
                }}
            >
                <Virtuoso
                    ref={virtuosoRef}
                    data={formattedItems}
                    initialTopMostItemIndex={formattedItems.length - 1}
                    followOutput="auto"
                    atBottomStateChange={(atBottom) => {
                        setShowScrollBottom(!atBottom);
                        if (atBottom) setNewMessagesWhileScrolled(0);
                    }}
                    itemContent={(index, item) => {
                        if (item.type === 'date') {
                            return (
                                <div key={item.id} className="flex justify-center my-3 select-none">
                                    <span
                                        className={`px-3 py-1 rounded-lg text-xs font-medium uppercase tracking-wider shadow-2xs ${
                                            isDark ? 'bg-[#182229] text-[#8696a0]' : 'bg-[#ffffff] text-[#54656f]'
                                        }`}
                                    >
                                        {item.label}
                                    </span>
                                </div>
                            );
                        }

                        if (isGroupMode) {
                            return (
                                <GroupMessageBubble
                                    key={item.id}
                                    message={item.data}
                                    currentUserId={currentUser?._id || currentUser?.id}
                                    onReply={(targetMsg) => setReplyTarget(targetMsg)}
                                    onDelete={(msgId) => {
                                        deleteMessage(msgId);
                                    }}
                                    onReaction={(msgId, emoji) => {
                                        const socket = getSocket();
                                        if (socket) {
                                            socket.emit('add_reaction', {
                                                messageId: msgId,
                                                reactionuserId: currentUser?._id || currentUser?.id,
                                                emoji
                                            });
                                        }
                                    }}
                                    onOpenInfo={(msg) => setMessageInfoTarget(msg)}
                                    onOpenLightbox={(url) => setLightboxMedia({ url, type: 'image' })}
                                />
                            );
                        }

                        return (
                            <MessageBubble
                                key={item.id}
                                message={item.data}
                                theme={theme}
                                onReact={addReaction}
                                currentUser={currentUser}
                                deleteMessage={deleteMessage}
                                onStartReply={(targetMsg) => setReplyTarget(targetMsg)}
                                onOpenMedia={(url, type) => setLightboxMedia({ url, type })}
                            />
                        );
                    }}
                />

                {/* Floating Scroll-to-Bottom Button */}
                {showScrollBottom && (
                    <button
                        onClick={() => {
                            virtuosoRef.current?.scrollToIndex({
                                index: formattedItems.length - 1,
                                behavior: 'smooth'
                            });
                        }}
                        aria-label="Scroll to bottom"
                        className={`absolute bottom-3 right-5 p-2 rounded-full shadow-lg border transition-all active:scale-95 z-20 ${
                            isDark
                                ? 'bg-[#202c33] border-[#2a3942] text-[#8696a0] hover:text-white'
                                : 'bg-white border-[#e9edef] text-[#54656f] hover:text-[#111b21]'
                        }`}
                    >
                        <ChevronDown size={18} />
                        {newMessagesWhileScrolled > 0 && (
                            <span className="absolute -top-1 -right-1 px-1 rounded-full bg-[#00a884] text-white text-[10px] font-bold min-w-[16px] text-center">
                                {newMessagesWhileScrolled}
                            </span>
                        )}
                    </button>
                )}
            </div>

            {/* 3. INPUT COMPOSER */}
            {isGroupMode && !canSendInGroup ? (
                /* Disabled Input Banner for Group non-admins */
                <footer
                    className={`p-3 text-center text-xs flex items-center justify-center gap-2 border-t select-none ${
                        isDark ? 'bg-[#202c33] border-[#222d34] text-[#8696a0]' : 'bg-[#f0f2f5] border-[#e9edef] text-[#54656f]'
                    }`}
                >
                    <Lock className="w-3.5 h-3.5" />
                    <span>Only admins can send messages to this group</span>
                </footer>
            ) : (
                <footer
                    className={`p-2 border-t shrink-0 relative z-20 ${
                        isDark ? 'bg-[#202c33] border-[#222d34]' : 'bg-[#f0f2f5] border-[#e9edef]'
                    }`}
                >
                    {/* Mentions Suggestion Popup */}
                    {mentionSuggestions.length > 0 && (
                        <div
                            className={`absolute bottom-full left-12 mb-2 w-64 rounded-xl shadow-2xl border overflow-hidden z-50 ${
                                isDark ? 'bg-[#202c33] border-[#222d34] text-[#e9edef]' : 'bg-white border-[#e9edef] text-[#111b21]'
                            }`}
                        >
                            <div className="px-3 py-1.5 text-[10px] uppercase font-semibold text-[#8696a0] border-b border-[#222d34]/20">
                                Mention Group Member
                            </div>
                            <div className="max-h-48 overflow-y-auto">
                                {mentionSuggestions.map((mUser) => (
                                    <div
                                        key={mUser._id}
                                        onClick={() => handleSelectMention(mUser)}
                                        className={`flex items-center gap-2.5 px-3 py-2 cursor-pointer text-xs ${
                                            isDark ? 'hover:bg-[#111b21]' : 'hover:bg-[#f0f2f5]'
                                        }`}
                                    >
                                        <div className="w-6 h-6 rounded-full bg-[#00a884]/20 text-[#00a884] flex items-center justify-center font-bold text-[10px]">
                                            {(mUser.name || mUser.username || 'U').charAt(0).toUpperCase()}
                                        </div>
                                        <span className="font-medium truncate">
                                            {mUser.username || mUser.name}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Reply Banner */}
                    {replyTarget && (
                        <div
                            className={`mb-2 px-3 py-2 rounded-lg flex items-center justify-between border-l-4 border-[#00a884] text-xs ${
                                isDark ? 'bg-[#111b21] text-[#e9edef]' : 'bg-white text-[#111b21]'
                            }`}
                        >
                            <div className="flex items-center gap-2 truncate">
                                <Reply size={13} className="text-[#00a884] shrink-0" />
                                <div className="truncate">
                                    <span className="font-semibold text-[#00a884] block truncate">
                                        Replying to{' '}
                                        {replyTarget.senderName ||
                                            replyTarget.senderId?.username ||
                                            replyTarget.senderId?.name ||
                                            'Member'}
                                    </span>
                                    <span className="opacity-80 truncate block text-[11px]">
                                        {replyTarget.content || replyTarget.message || replyTarget.text || 'Media attachment'}
                                    </span>
                                </div>
                            </div>
                            <button
                                onClick={() => setReplyTarget(null)}
                                aria-label="Cancel reply"
                                className="p-1 text-[#8696a0] hover:text-inherit"
                            >
                                <X size={14} />
                            </button>
                        </div>
                    )}

                    {/* File Attachment Preview */}
                    {filePreview && (
                        <div
                            className={`mb-2 p-2 rounded-lg flex items-center justify-between border ${
                                isDark ? 'bg-[#111b21] border-[#222d34]' : 'bg-white border-[#e9edef]'
                            }`}
                        >
                            <div className="flex items-center gap-2">
                                {attachment?.type?.startsWith('video') ? (
                                    <video src={filePreview} className="w-10 h-10 rounded object-cover" />
                                ) : (
                                    <img src={filePreview} alt="Preview" className="w-10 h-10 rounded object-cover" />
                                )}
                                <span className="text-xs truncate max-w-xs">{attachment?.name}</span>
                            </div>
                            <button
                                onClick={() => {
                                    setAttachment(null);
                                    setFilePreview(null);
                                }}
                                className="p-1 text-[#8696a0] hover:text-rose-500"
                            >
                                <X size={15} />
                            </button>
                        </div>
                    )}

                    {/* Input Bar Row */}
                    <div className="flex items-end gap-1.5">
                        {/* Emoji Button */}
                        <button
                            onClick={() => setShowEmoji((prev) => !prev)}
                            aria-label="Emoji picker"
                            className="p-2 text-[#8696a0] hover:text-inherit rounded-full transition-colors"
                        >
                            <Smile size={20} />
                        </button>

                        {/* Paperclip Button */}
                        <div className="relative" ref={fileMenuRef}>
                            <button
                                onClick={() => setShowFileMenu((prev) => !prev)}
                                aria-label="Attach file"
                                className="p-2 text-[#8696a0] hover:text-inherit rounded-full transition-colors"
                            >
                                <Paperclip size={20} />
                            </button>

                            {showFileMenu && (
                                <div
                                    className={`absolute bottom-full left-0 mb-2 py-1 rounded-lg shadow-xl border min-w-[140px] z-50 text-xs ${
                                        isDark ? 'bg-[#233138] border-[#2a3942] text-[#d1d7db]' : 'bg-white border-[#e9edef] text-[#111b21]'
                                    }`}
                                >
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        onChange={handleFileChange}
                                        className="hidden"
                                        accept="image/*,video/*"
                                    />
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        className={`w-full px-3 py-2 flex items-center gap-2.5 transition-colors ${
                                            isDark ? 'hover:bg-[#182229]' : 'hover:bg-[#f5f6f6]'
                                        }`}
                                    >
                                        <ImageIcon size={15} className="text-[#00a884]" />
                                        <span>Photos & Videos</span>
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Auto-growing Textarea */}
                        <div className="flex-1 bg-transparent">
                            <textarea
                                ref={textareaRef}
                                rows={1}
                                value={message}
                                onChange={handleTextChange}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleSendMessage();
                                    }
                                }}
                                placeholder={isGroupMode ? "Type a message (or @ to mention)" : "Type a message"}
                                className={`w-full px-3.5 py-2.5 rounded-lg text-sm outline-none resize-none max-h-32 transition-colors ${
                                    isDark
                                        ? 'bg-[#2a3942] text-[#e9edef] placeholder-[#8696a0]'
                                        : 'bg-white text-[#111b21] placeholder-[#8696a0]'
                                }`}
                            />
                        </div>

                        {/* Dynamic Mic <-> Send Morphing Button */}
                        {hasContentToSend ? (
                            <button
                                onClick={handleSendMessage}
                                aria-label="Send message"
                                title="Send"
                                className="p-2.5 rounded-full text-[#8696a0] hover:text-[#00a884] transition-colors shrink-0"
                            >
                                <Send size={19} />
                            </button>
                        ) : (
                            <button
                                onClick={() => toast.info('Hold to record voice message (available soon)')}
                                aria-label="Voice message"
                                title="Voice message"
                                className="p-2.5 rounded-full text-[#8696a0] hover:text-[#00a884] transition-colors shrink-0"
                            >
                                <Mic size={19} />
                            </button>
                        )}
                    </div>

                    {/* Lazy Emoji Picker Popover */}
                    {showEmoji && (
                        <div ref={emojiPickerRef} className="absolute bottom-14 left-2 z-50 shadow-2xl rounded-lg overflow-hidden">
                            <Suspense fallback={<div className="p-4 bg-[#202c33] text-xs text-[#8696a0]">Loading emojis...</div>}>
                                <Picker
                                    onEmojiClick={(emojiData) => setMessage((prev) => prev + emojiData.emoji)}
                                    theme={isDark ? 'dark' : 'light'}
                                />
                            </Suspense>
                        </div>
                    )}
                </footer>
            )}

            {/* Slide-over Group Info Drawer */}
            {isGroupMode && (
                <GroupInfoPanel
                    isOpen={showGroupInfoPanel}
                    onClose={() => setShowGroupInfoPanel(false)}
                    group={activeGroup}
                    groupDetails={activeGroupDetails}
                    currentUserId={currentUser?._id || currentUser?.id}
                    allContacts={allContacts}
                />
            )}

            {/* Message Info Modal */}
            {messageInfoTarget && (
                <MessageInfoModal
                    isOpen={!!messageInfoTarget}
                    onClose={() => setMessageInfoTarget(null)}
                    message={messageInfoTarget}
                />
            )}

            {/* Fullscreen Lightbox Modal */}
            {lightboxMedia && (
                <div
                    onClick={() => setLightboxMedia(null)}
                    className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 animate-fade-in"
                >
                    <button
                        onClick={() => setLightboxMedia(null)}
                        className="absolute top-4 right-4 p-2 rounded-full bg-slate-800 text-white hover:bg-slate-700 transition"
                    >
                        <X size={18} />
                    </button>

                    {lightboxMedia.type === 'video' ? (
                        <video src={lightboxMedia.url} controls autoPlay className="max-h-[90vh] max-w-[90vw] rounded-lg" />
                    ) : (
                        <img src={lightboxMedia.url} alt="Full view" className="max-h-[90vh] max-w-[90vw] object-contain rounded-lg" />
                    )}
                </div>
            )}
        </div>
    );
};

export default ChatWindow;
