import React, { useRef, useState, lazy, Suspense } from 'react';
import {
    Check,
    CheckCheck,
    Smile,
    Reply,
    Copy,
    Trash2,
    MoreVertical,
    Plus,
    X
} from 'lucide-react';
import { format } from 'date-fns';
import useOutside from '../../hooks/useOutside';
import { toast } from 'react-toastify';

const Picker = lazy(() => import('emoji-picker-react'));

const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

const MessageBubble = ({
    message,
    theme,
    onReact,
    currentUser,
    deleteMessage,
    onStartReply,
    onOpenMedia
}) => {
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [showReactions, setShowReactions] = useState(false);
    const [showOptions, setShowOptions] = useState(false);

    const messageRef = useRef(null);
    const optionRef = useRef(null);
    const emojiPickerRef = useRef(null);
    const reactionsMenuRef = useRef(null);

    const isDark = theme === 'dark';

    const senderId =
        message?.senderId?._id ||
        message?.senderId ||
        message?.sender?._id ||
        message?.sender;
    const currentUserId = (currentUser?._id || currentUser?.id)?.toString();
    const isUserMessage = senderId?.toString() === currentUserId;

    useOutside(emojiPickerRef, () => setShowEmojiPicker(false));
    useOutside(reactionsMenuRef, () => setShowReactions(false));
    useOutside(optionRef, () => setShowOptions(false));

    if (!message) return null;

    const handleReact = (emoji) => {
        onReact(message._id, emoji);
        setShowEmojiPicker(false);
        setShowReactions(false);
    };

    const handleCopy = () => {
        const textToCopy = message.content || message.message || '';
        if (textToCopy) {
            navigator.clipboard.writeText(textToCopy);
            toast.success('Message copied');
        }
        setShowOptions(false);
    };

    const handleReply = () => {
        if (onStartReply) {
            onStartReply(message);
        }
        setShowOptions(false);
    };

    const timeStr = format(new Date(message.createdAt || Date.now()), 'HH:mm');

    return (
        <div className={`flex w-full my-1 px-4 md:px-8 ${isUserMessage ? 'justify-end' : 'justify-start'}`}>
            <div
                ref={messageRef}
                className={`relative group max-w-[85%] md:max-w-[65%] rounded-lg p-2 text-sm shadow-[0_1px_0.5px_rgba(11,20,26,0.13)] transition-colors ${
                    isUserMessage
                        ? isDark
                            ? 'bg-[#005c4b] text-[#e9edef] rounded-tr-none wa-bubble-sent-tail'
                            : 'bg-[#d9fdd3] text-[#111b21] rounded-tr-none wa-bubble-sent-tail'
                        : isDark
                        ? 'bg-[#202c33] text-[#e9edef] rounded-tl-none wa-bubble-received-tail'
                        : 'bg-[#ffffff] text-[#111b21] rounded-tl-none wa-bubble-received-tail'
                }`}
            >
                {/* 1. QUOTED REPLY BLOCK */}
                {message.replyTo && (
                    <div
                        className={`mb-1.5 p-1.5 rounded flex gap-2 border-l-4 text-xs transition-colors ${
                            isUserMessage
                                ? isDark
                                    ? 'bg-[#025142] border-[#25d366] text-[#d1d7db]'
                                    : 'bg-[#cfeec9] border-[#00a884] text-[#111b21]'
                                : isDark
                                ? 'bg-[#182229] border-[#00a884] text-[#8696a0]'
                                : 'bg-[#f0f2f5] border-[#00a884] text-[#54656f]'
                        }`}
                    >
                        {message.replyTo.mediaUrl && (
                            <div className="w-10 h-10 rounded shrink-0 overflow-hidden bg-black/10">
                                {message.replyTo.contentType === 'video' ? (
                                    <video src={message.replyTo.mediaUrl} className="w-full h-full object-cover" />
                                ) : (
                                    <img src={message.replyTo.mediaUrl} alt="Reply media" className="w-full h-full object-cover" />
                                )}
                            </div>
                        )}
                        <div className="flex-1 min-w-0">
                            <p className="font-semibold text-[11px] text-[#00a884] truncate">
                                {message.replyTo.statusId ? 'Status Update' : message.replyTo.senderName || 'Reply'}
                            </p>
                            <p className="truncate opacity-80 text-[11px] mt-0.5">
                                {message.replyTo.text || (message.replyTo.mediaUrl ? 'Media' : '')}
                            </p>
                        </div>
                    </div>
                )}

                {/* 2. MEDIA ATTACHMENTS */}
                {message.contentType === 'image' && (
                    <div className="rounded overflow-hidden mb-1 cursor-pointer">
                        <img
                            src={message.image || message.imageOrVideoUrl}
                            alt="Attachment"
                            onClick={() => onOpenMedia && onOpenMedia(message.image || message.imageOrVideoUrl, 'image')}
                            className="w-full max-h-80 object-cover rounded hover:opacity-95 transition-opacity"
                            loading="lazy"
                        />
                    </div>
                )}

                {message.contentType === 'video' && (
                    <div className="rounded overflow-hidden mb-1">
                        <video
                            src={message.video || message.imageOrVideoUrl}
                            controls
                            playsInline
                            className="w-full max-h-80 object-cover rounded"
                        />
                    </div>
                )}

                {/* 3. MESSAGE TEXT + INLINE TIMESTAMP & TICKS */}
                <div className="flex flex-wrap items-end justify-between gap-x-3 gap-y-0.5 leading-snug">
                    {(message.content || message.message) && (
                        <p className="break-words whitespace-pre-wrap flex-1 min-w-[60px] text-sm">
                            {message.content || message.message}
                        </p>
                    )}

                    {/* Timestamp & Status Ticks */}
                    <div className="flex items-center gap-1 text-[11px] opacity-70 shrink-0 self-end ml-auto select-none pt-0.5">
                        <span>{timeStr}</span>
                        {isUserMessage && (
                            <>
                                {message.messageStatus === 'sent' && (
                                    <Check size={13} className="text-inherit" />
                                )}
                                {message.messageStatus === 'delivered' && (
                                    <CheckCheck size={13} className="text-inherit" />
                                )}
                                {message.messageStatus === 'read' && (
                                    <CheckCheck size={13} className="text-[#53bdeb]" />
                                )}
                            </>
                        )}
                    </div>
                </div>

                {/* 4. HOVER TRIGGER ACTIONS */}
                <div
                    className={`absolute top-1 ${
                        isUserMessage ? '-left-12' : '-right-12'
                    } opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 z-20`}
                >
                    <button
                        onClick={() => setShowReactions((prev) => !prev)}
                        aria-label="React"
                        title="React"
                        className={`p-1.5 rounded-full shadow transition-colors ${
                            isDark ? 'bg-[#202c33] text-[#8696a0] hover:text-[#e9edef]' : 'bg-white text-[#54656f] hover:text-[#111b21] border border-[#e9edef]'
                        }`}
                    >
                        <Smile size={14} />
                    </button>

                    <button
                        onClick={() => setShowOptions((prev) => !prev)}
                        aria-label="Message options"
                        title="Options"
                        className={`p-1.5 rounded-full shadow transition-colors ${
                            isDark ? 'bg-[#202c33] text-[#8696a0] hover:text-[#e9edef]' : 'bg-white text-[#54656f] hover:text-[#111b21] border border-[#e9edef]'
                        }`}
                    >
                        <MoreVertical size={14} />
                    </button>
                </div>

                {/* Quick Emoji Reaction Pill */}
                {showReactions && (
                    <div
                        ref={reactionsMenuRef}
                        className={`absolute -top-10 ${
                            isUserMessage ? 'right-0' : 'left-0'
                        } flex items-center bg-[#202c33] border border-[#2a3942] rounded-full px-2 py-1 gap-1 shadow-lg z-40 select-none`}
                    >
                        {QUICK_REACTIONS.map((emoji) => (
                            <button
                                key={emoji}
                                onClick={() => handleReact(emoji)}
                                className="text-sm p-0.5 hover:scale-125 transition-transform"
                            >
                                {emoji}
                            </button>
                        ))}
                        <div className="w-[1px] h-3.5 bg-[#374248] mx-0.5" />
                        <button
                            onClick={() => {
                                setShowReactions(false);
                                setShowEmojiPicker(true);
                            }}
                            className="p-1 rounded-full text-[#8696a0] hover:text-white"
                        >
                            <Plus size={12} />
                        </button>
                    </div>
                )}

                {/* Emoji Picker Popover */}
                {showEmojiPicker && (
                    <div ref={emojiPickerRef} className="absolute bottom-10 left-0 z-50 shadow-2xl rounded-lg overflow-hidden">
                        <Suspense fallback={<div className="p-4 bg-[#202c33] text-xs text-[#8696a0]">Loading emojis...</div>}>
                            <Picker
                                onEmojiClick={(emojiData) => handleReact(emojiData.emoji)}
                                theme={isDark ? 'dark' : 'light'}
                            />
                        </Suspense>
                    </div>
                )}

                {/* Dropdown Options Menu */}
                {showOptions && (
                    <div
                        ref={optionRef}
                        className={`absolute right-1 top-8 rounded-lg shadow-xl border py-1 min-w-[130px] z-40 text-xs ${
                            isDark ? 'bg-[#233138] border-[#2a3942] text-[#d1d7db]' : 'bg-white border-[#e9edef] text-[#111b21]'
                        }`}
                    >
                        <button
                            onClick={handleReply}
                            className={`w-full px-3 py-1.5 flex items-center gap-2 text-left transition-colors ${
                                isDark ? 'hover:bg-[#182229]' : 'hover:bg-[#f5f6f6]'
                            }`}
                        >
                            <Reply size={13} className="text-[#00a884]" />
                            <span>Reply</span>
                        </button>

                        <button
                            onClick={handleCopy}
                            className={`w-full px-3 py-1.5 flex items-center gap-2 text-left transition-colors ${
                                isDark ? 'hover:bg-[#182229]' : 'hover:bg-[#f5f6f6]'
                            }`}
                        >
                            <Copy size={13} />
                            <span>Copy</span>
                        </button>

                        <button
                            onClick={() => {
                                deleteMessage(message._id, 'me');
                                setShowOptions(false);
                            }}
                            className={`w-full px-3 py-1.5 flex items-center gap-2 text-left text-rose-500 transition-colors ${
                                isDark ? 'hover:bg-[#182229]' : 'hover:bg-[#f5f6f6]'
                            }`}
                        >
                            <Trash2 size={13} />
                            <span>Delete for me</span>
                        </button>

                        {isUserMessage && (
                            <button
                                onClick={() => {
                                    deleteMessage(message._id, 'everyone');
                                    setShowOptions(false);
                                }}
                                className={`w-full px-3 py-1.5 flex items-center gap-2 text-left text-rose-500 font-medium transition-colors ${
                                    isDark ? 'hover:bg-[#182229]' : 'hover:bg-[#f5f6f6]'
                                }`}
                            >
                                <Trash2 size={13} />
                                <span>Delete for everyone</span>
                            </button>
                        )}
                    </div>
                )}

                {/* 5. FLOATING REACTIONS PILL */}
                {message.reaction && message.reaction.length > 0 && (
                    <div
                        className={`absolute -bottom-2.5 ${
                            isUserMessage ? 'right-2' : 'left-2'
                        } flex items-center gap-0.5 px-1.5 py-0.5 rounded-full shadow-sm text-xs border ${
                            isDark
                                ? 'bg-[#202c33] border-[#2a3942] text-white'
                                : 'bg-white border-[#e9edef] text-slate-800'
                        }`}
                    >
                        {message.reaction.map((r, idx) => (
                            <span key={idx}>{r.emoji}</span>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default MessageBubble;
