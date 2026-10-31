import React, { useState, useRef } from 'react';
import {
    Check,
    CheckCheck,
    Reply,
    Smile,
    MoreVertical,
    FileText,
    Download,
    Info,
    Trash2,
    Copy
} from 'lucide-react';
import useThemeStore from '../../store/themeStore';
import formatTimestamp from '../../utils/formatTime';
import useOutside from '../../hooks/useOutside';
import { toast } from 'react-toastify';

// WhatsApp-like consistent color generator for sender names
const SENDER_COLORS = [
    '#35cd96',
    '#6bcbef',
    '#e542a3',
    '#91a3b0',
    '#dfb235',
    '#a270ff',
    '#ff6b6b',
    '#53bdeb'
];

const getSenderColor = (userId = '') => {
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
        hash = userId.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % SENDER_COLORS.length;
    return SENDER_COLORS[index];
};

const GroupMessageBubble = ({
    message,
    currentUserId,
    onReply,
    onDelete,
    onReaction,
    onOpenInfo,
    onOpenLightbox
}) => {
    const { theme } = useThemeStore();
    const isDark = theme === 'dark';

    const [showMenu, setShowMenu] = useState(false);
    const [showQuickReactions, setShowQuickReactions] = useState(false);
    const menuRef = useRef(null);
    useOutside(menuRef, () => {
        setShowMenu(false);
        setShowQuickReactions(false);
    });

    const isSystem = message.type === 'system' || message.contentType === 'system';
    const senderId = (message.senderId?._id || message.senderId)?.toString();
    const isMe = senderId === currentUserId?.toString();
    const senderName = message.senderId?.username || message.senderId?.name || 'Member';

    // 1. System message: render centered capsule
    if (isSystem) {
        return (
            <div className="flex justify-center my-2.5 px-4 select-none">
                <span
                    className={`text-xs px-3 py-1 rounded-lg shadow-2xs font-normal text-center max-w-md ${
                        isDark
                            ? 'bg-[#182229] text-[#8696a0] border border-[#222d34]'
                            : 'bg-[#ffeecd] text-[#54656f] border border-[#fae29f]'
                    }`}
                >
                    {message.message || message.content}
                </span>
            </div>
        );
    }

    const quickEmojis = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

    const handleCopy = () => {
        const text = message.message || message.content || '';
        navigator.clipboard.writeText(text);
        toast.info('Message copied');
        setShowMenu(false);
    };

    // Render message status tick for sender's messages
    const renderStatusTick = () => {
        if (!isMe) return null;
        const readCount = message.readBy?.length || 0;
        // In group, if readBy has users other than sender, show blue double tick
        const isReadByOthers = message.readBy?.some(
            (r) => (r.user?._id || r.user)?.toString() !== currentUserId?.toString()
        );

        if (isReadByOthers || message.messageStatus === 'read') {
            return <CheckCheck className="w-3.5 h-3.5 text-[#53bdeb] inline ml-1" />;
        }
        if (message.deliveredTo?.length > 0 || message.messageStatus === 'delivered') {
            return <CheckCheck className="w-3.5 h-3.5 text-[#8696a0] inline ml-1" />;
        }
        return <Check className="w-3.5 h-3.5 text-[#8696a0] inline ml-1" />;
    };

    return (
        <div
            className={`group/msg relative flex my-1 px-4 ${
                isMe ? 'justify-end' : 'justify-start'
            }`}
        >
            <div
                className={`relative max-w-[85%] sm:max-w-[70%] rounded-lg px-2.5 pt-1.5 pb-1 shadow-2xs transition-shadow ${
                    isMe
                        ? isDark
                            ? 'bg-[#005c4b] text-[#e9edef] rounded-tr-none'
                            : 'bg-[#d9fdd3] text-[#111b21] rounded-tr-none'
                        : isDark
                        ? 'bg-[#202c33] text-[#e9edef] rounded-tl-none'
                        : 'bg-white text-[#111b21] rounded-tl-none border border-[#e9edef]/50'
                }`}
            >
                {/* Sender Name in Group (for non-me messages) */}
                {!isMe && (
                    <div
                        className="text-[12px] font-semibold leading-tight mb-1"
                        style={{ color: getSenderColor(senderId) }}
                    >
                        {senderName}
                    </div>
                )}

                {/* Reply-To Preview Box */}
                {message.replyTo && (
                    <div
                        className={`mb-1.5 p-1.5 rounded border-l-4 text-xs ${
                            isDark
                                ? 'bg-[#111b21]/60 border-[#00a884]'
                                : 'bg-[#f0f2f5] border-[#00a884]'
                        }`}
                    >
                        <span className="font-semibold block text-[#00a884] text-[11px]">
                            {message.replyTo.senderId?.username ||
                                message.replyTo.senderId?.name ||
                                'Reply'}
                        </span>
                        <p className="truncate text-[#8696a0] text-[11px]">
                            {message.replyTo.message ||
                                message.replyTo.content ||
                                'Media attachment'}
                        </p>
                    </div>
                )}

                {/* Media: Image */}
                {(message.contentType === 'image' || message.image || message.fileUrl?.match(/\.(jpg|jpeg|png|webp|gif)/i)) && (
                    <div className="mb-1 rounded overflow-hidden max-w-sm cursor-pointer">
                        <img
                            src={message.fileUrl || message.image}
                            alt=""
                            onClick={() => onOpenLightbox && onOpenLightbox(message.fileUrl || message.image)}
                            className="w-full max-h-72 object-cover rounded hover:opacity-95 transition-opacity"
                        />
                    </div>
                )}

                {/* Media: File / Document */}
                {message.contentType === 'file' && (
                    <div
                        className={`flex items-center gap-3 p-2 rounded mb-1 border ${
                            isDark
                                ? 'bg-[#111b21]/50 border-[#222d34]'
                                : 'bg-[#f0f2f5] border-[#e9edef]'
                        }`}
                    >
                        <div className="p-2 rounded bg-[#00a884]/20 text-[#00a884]">
                            <FileText className="w-5 h-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="text-xs font-medium truncate">
                                {message.fileName || 'Document'}
                            </p>
                            {message.fileSize && (
                                <p className="text-[10px] text-[#8696a0]">
                                    {(message.fileSize / 1024).toFixed(1)} KB
                                </p>
                            )}
                        </div>
                        {message.fileUrl && (
                            <a
                                href={message.fileUrl}
                                target="_blank"
                                rel="noreferrer"
                                download
                                className="p-1.5 hover:bg-black/10 rounded-full transition-colors text-[#8696a0]"
                            >
                                <Download className="w-4 h-4" />
                            </a>
                        )}
                    </div>
                )}

                {/* Message Text */}
                {(message.message || message.content) && (
                    <p className="text-[14px] leading-relaxed break-words whitespace-pre-wrap pr-12">
                        {message.message || message.content}
                    </p>
                )}

                {/* Timestamp & Status tick */}
                <div className="flex items-center justify-end gap-1 -mt-1 select-none">
                    <span className="text-[10px] text-[#8696a0]">
                        {formatTimestamp(message.createdAt)}
                    </span>
                    {renderStatusTick()}
                </div>

                {/* Reactions badge row */}
                {message.reaction && message.reaction.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                        {message.reaction.map((r, i) => (
                            <span
                                key={i}
                                className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs shadow-2xs border ${
                                    isDark
                                        ? 'bg-[#202c33] border-[#222d34]'
                                        : 'bg-white border-[#e9edef]'
                                }`}
                            >
                                <span>{r.emoji}</span>
                            </span>
                        ))}
                    </div>
                )}

                {/* Hover Action Menu Trigger */}
                <div
                    ref={menuRef}
                    className="absolute top-1 right-1 opacity-0 group-hover/msg:opacity-100 transition-opacity flex items-center gap-0.5"
                >
                    <button
                        onClick={() => setShowQuickReactions(!showQuickReactions)}
                        title="React"
                        className="p-1 hover:bg-black/10 rounded-full text-[#8696a0] hover:text-[#e9edef]"
                    >
                        <Smile className="w-3.5 h-3.5" />
                    </button>
                    <button
                        onClick={() => onReply(message)}
                        title="Reply"
                        className="p-1 hover:bg-black/10 rounded-full text-[#8696a0] hover:text-[#e9edef]"
                    >
                        <Reply className="w-3.5 h-3.5" />
                    </button>
                    <button
                        onClick={() => setShowMenu(!showMenu)}
                        title="More"
                        className="p-1 hover:bg-black/10 rounded-full text-[#8696a0] hover:text-[#e9edef]"
                    >
                        <MoreVertical className="w-3.5 h-3.5" />
                    </button>

                    {/* Quick Reactions Bar */}
                    {showQuickReactions && (
                        <div
                            className={`absolute -top-9 right-0 flex items-center gap-1 px-2 py-1 rounded-full shadow-lg border z-20 ${
                                isDark
                                    ? 'bg-[#202c33] border-[#222d34]'
                                    : 'bg-white border-[#e9edef]'
                            }`}
                        >
                            {quickEmojis.map((emoji) => (
                                <button
                                    key={emoji}
                                    onClick={() => {
                                        onReaction(message._id, emoji);
                                        setShowQuickReactions(false);
                                    }}
                                    className="hover:scale-125 transition-transform text-sm p-0.5"
                                >
                                    {emoji}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Context Dropdown Menu */}
                    {showMenu && (
                        <div
                            className={`absolute top-6 right-0 w-40 rounded-xl shadow-xl border py-1 z-30 ${
                                isDark
                                    ? 'bg-[#202c33] border-[#222d34] text-[#e9edef]'
                                    : 'bg-white border-[#e9edef] text-[#111b21]'
                            }`}
                        >
                            <button
                                onClick={() => {
                                    onReply(message);
                                    setShowMenu(false);
                                }}
                                className="w-full px-3 py-2 text-left text-xs flex items-center gap-2 hover:bg-black/10"
                            >
                                <Reply className="w-3.5 h-3.5" /> Reply
                            </button>
                            <button
                                onClick={handleCopy}
                                className="w-full px-3 py-2 text-left text-xs flex items-center gap-2 hover:bg-black/10"
                            >
                                <Copy className="w-3.5 h-3.5" /> Copy
                            </button>
                            {isMe && onOpenInfo && (
                                <button
                                    onClick={() => {
                                        onOpenInfo(message);
                                        setShowMenu(false);
                                    }}
                                    className="w-full px-3 py-2 text-left text-xs flex items-center gap-2 hover:bg-black/10"
                                >
                                    <Info className="w-3.5 h-3.5" /> Message info
                                </button>
                            )}
                            {isMe && onDelete && (
                                <button
                                    onClick={() => {
                                        onDelete(message._id);
                                        setShowMenu(false);
                                    }}
                                    className="w-full px-3 py-2 text-left text-xs flex items-center gap-2 text-red-500 hover:bg-black/10"
                                >
                                    <Trash2 className="w-3.5 h-3.5" /> Delete
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default GroupMessageBubble;

