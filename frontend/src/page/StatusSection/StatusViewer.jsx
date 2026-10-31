import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
    X,
    VolumeX,
    Volume2,
    MoreVertical,
    Eye,
    Send,
    Trash2,
    Ban,
    Loader2
} from 'lucide-react';
import formatTimestamp from '../../utils/formatTime';
import ViewersModal from './ViewersModal';
import { toast } from 'react-toastify';

const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

const StatusViewer = ({
    isOpen,
    groups = [],
    initialGroupIndex = 0,
    initialStatusIndex = 0,
    currentUserId,
    onClose,
    onViewStatus,
    onDeleteStatus,
    onMuteUser,
    onReplyStatus
}) => {
    const [groupIndex, setGroupIndex] = useState(initialGroupIndex);
    const [statusIndex, setStatusIndex] = useState(initialStatusIndex);
    const [progress, setProgress] = useState(0);
    const [isPaused, setIsPaused] = useState(false);
    const [isMuted, setIsMuted] = useState(true);
    const [replyText, setReplyText] = useState('');
    const [isReplying, setIsReplying] = useState(false);
    const [isReplyInputFocused, setIsReplyInputFocused] = useState(false);
    const [showMenu, setShowMenu] = useState(false);
    const [showViewersSheet, setShowViewersSheet] = useState(false);
    const [isVideoBuffering, setIsVideoBuffering] = useState(false);

    const videoRef = useRef(null);
    const timerRef = useRef(null);
    const touchStartRef = useRef({ x: 0, y: 0, time: 0 });
    const pressTimeoutRef = useRef(null);
    const isLongPressRef = useRef(false);

    const currentGroup = groups[groupIndex] || null;
    const currentStatuses = currentGroup?.statuses || [];
    const currentStatus = currentStatuses[statusIndex] || null;

    const isOwner =
        currentGroup &&
        (currentGroup.user?._id || currentGroup.user)?.toString() === currentUserId?.toString();

    useEffect(() => {
        if (isOpen) {
            setGroupIndex(initialGroupIndex);
            setStatusIndex(initialStatusIndex);
            setProgress(0);
            setIsPaused(false);
            setReplyText('');
            setShowMenu(false);
            setShowViewersSheet(false);
        }
    }, [isOpen, initialGroupIndex, initialStatusIndex]);

    useEffect(() => {
        if (isOpen && currentStatus?._id) {
            onViewStatus(currentStatus._id, (currentGroup.user?._id || currentGroup.user)?.toString());
        }
    }, [isOpen, currentStatus?._id, groupIndex, statusIndex, onViewStatus, currentGroup]);

    const handleNext = useCallback(() => {
        if (statusIndex < currentStatuses.length - 1) {
            setStatusIndex((prev) => prev + 1);
            setProgress(0);
        } else if (groupIndex < groups.length - 1) {
            setGroupIndex((prev) => prev + 1);
            setStatusIndex(0);
            setProgress(0);
        } else {
            onClose();
        }
    }, [statusIndex, currentStatuses.length, groupIndex, groups.length, onClose]);

    const handlePrevious = useCallback(() => {
        if (statusIndex > 0) {
            setStatusIndex((prev) => prev - 1);
            setProgress(0);
        } else if (groupIndex > 0) {
            setGroupIndex((prev) => prev - 1);
            const prevGroupStatuses = groups[groupIndex - 1]?.statuses || [];
            setStatusIndex(Math.max(0, prevGroupStatuses.length - 1));
            setProgress(0);
        }
    }, [statusIndex, groupIndex, groups]);

    useEffect(() => {
        if (!isOpen) return;
        const nextStatus = currentStatuses[statusIndex + 1];
        if (nextStatus?.media?.url && nextStatus.type === 'image') {
            const img = new Image();
            img.src = nextStatus.media.url;
        }
    }, [isOpen, statusIndex, currentStatuses]);

    const totalDurationMs = currentStatus?.type === 'video'
        ? Math.max(3000, (currentStatus?.media?.durationInSeconds || 5) * 1000)
        : 5000;

    useEffect(() => {
        if (!isOpen || !currentStatus || isPaused || isReplyInputFocused || showViewersSheet || showMenu) {
            if (timerRef.current) clearInterval(timerRef.current);
            if (videoRef.current && !videoRef.current.paused) {
                videoRef.current.pause();
            }
            return;
        }

        if (currentStatus.type === 'video' && videoRef.current) {
            videoRef.current.play().catch(() => {});
        }

        const intervalMs = 50;
        const step = (intervalMs / totalDurationMs) * 100;

        timerRef.current = setInterval(() => {
            setProgress((prev) => {
                if (prev >= 100) {
                    clearInterval(timerRef.current);
                    handleNext();
                    return 0;
                }
                return prev + step;
            });
        }, intervalMs);

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [
        isOpen,
        currentStatus,
        isPaused,
        isReplyInputFocused,
        showViewersSheet,
        showMenu,
        totalDurationMs,
        handleNext
    ]);

    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.hidden) {
                setIsPaused(true);
            } else {
                setIsPaused(false);
            }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, []);

    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e) => {
            if (isReplyInputFocused) return;

            if (e.key === 'Escape') {
                onClose();
            } else if (e.key === 'ArrowRight') {
                handleNext();
            } else if (e.key === 'ArrowLeft') {
                handlePrevious();
            } else if (e.key === ' ') {
                e.preventDefault();
                setIsPaused((prev) => !prev);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, isReplyInputFocused, handleNext, handlePrevious, onClose]);

    const handleTouchStart = (e) => {
        const touch = e.touches ? e.touches[0] : e;
        touchStartRef.current = {
            x: touch.clientX,
            y: touch.clientY,
            time: Date.now()
        };
        isLongPressRef.current = false;

        pressTimeoutRef.current = setTimeout(() => {
            isLongPressRef.current = true;
            setIsPaused(true);
        }, 250);
    };

    const handleTouchEnd = (e) => {
        if (pressTimeoutRef.current) {
            clearTimeout(pressTimeoutRef.current);
        }

        const touch = e.changedTouches ? e.changedTouches[0] : e;
        const deltaX = touch.clientX - touchStartRef.current.x;
        const deltaY = touch.clientY - touchStartRef.current.y;
        const elapsedTime = Date.now() - touchStartRef.current.time;

        if (isLongPressRef.current) {
            setIsPaused(false);
            isLongPressRef.current = false;
            return;
        }

        if (deltaY > 80 && Math.abs(deltaY) > Math.abs(deltaX)) {
            onClose();
            return;
        }

        const containerWidth = window.innerWidth;
        if (elapsedTime < 300 && Math.abs(deltaX) < 20 && Math.abs(deltaY) < 20) {
            if (touch.clientX < containerWidth * 0.33) {
                handlePrevious();
            } else {
                handleNext();
            }
        }
    };

    const handleSendReply = async () => {
        if (!replyText.trim() || !currentStatus?._id || isReplying) return;

        setIsReplying(true);
        try {
            await onReplyStatus(currentStatus._id, replyText.trim());
            toast.success('Reply sent');
            setReplyText('');
            setIsReplyInputFocused(false);
        } catch (err) {
            toast.error('Failed to send reply');
        } finally {
            setIsReplying(false);
        }
    };

    const handleQuickReaction = async (emoji) => {
        if (!currentStatus?._id || isReplying) return;
        setIsReplying(true);
        try {
            await onReplyStatus(currentStatus._id, emoji);
            toast.success(`Sent ${emoji}`);
        } catch (err) {
            console.error('Failed to send reaction:', err);
        } finally {
            setIsReplying(false);
        }
    };

    const handleDelete = async () => {
        if (!currentStatus?._id) return;
        try {
            await onDeleteStatus(currentStatus._id);
            toast.success('Status deleted');
            if (currentStatuses.length <= 1) {
                onClose();
            } else {
                handleNext();
            }
        } catch (err) {
            toast.error('Failed to delete status');
        }
    };

    const handleMute = async () => {
        const ownerId = (currentGroup.user?._id || currentGroup.user)?.toString();
        if (!ownerId) return;
        try {
            await onMuteUser(ownerId);
            toast.info('Status muted');
            onClose();
        } catch (err) {
            toast.error('Failed to mute status');
        }
    };

    if (!isOpen || !currentStatus) return null;

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 select-none animate-fade-in">
            {/* 9:16 Portrait Box on Desktop, Fullscreen on Mobile */}
            <div
                className="relative w-full h-full md:max-w-md md:h-[92vh] md:max-h-[850px] md:rounded-2xl overflow-hidden flex flex-col bg-[#0b141a] text-[#e9edef] shadow-2xl"
                onMouseDown={handleTouchStart}
                onMouseUp={handleTouchEnd}
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
            >
                {/* 1. TOP SEGMENTED PROGRESS BARS */}
                <div className="absolute top-0 left-0 right-0 z-30 p-3 pt-3 flex gap-1 bg-gradient-to-b from-black/80 via-black/40 to-transparent">
                    {currentStatuses.map((st, idx) => {
                        let fillPercent = 0;
                        if (idx < statusIndex) {
                            fillPercent = 100;
                        } else if (idx === statusIndex) {
                            fillPercent = progress;
                        }

                        return (
                            <div
                                key={st._id || idx}
                                className="flex-1 h-0.5 bg-white/30 rounded-full overflow-hidden"
                            >
                                <div
                                    className="h-full bg-white transition-all duration-75 ease-linear rounded-full"
                                    style={{ width: `${fillPercent}%` }}
                                />
                            </div>
                        );
                    })}
                </div>

                {/* 2. TOP HEADER */}
                <div className="absolute top-6 left-0 right-0 z-30 px-3 py-1 flex items-center justify-between pointer-events-auto">
                    <div className="flex items-center gap-3">
                        <img
                            src={currentGroup?.user?.profilePicture || 'https://via.placeholder.com/40'}
                            alt="Avatar"
                            className="w-10 h-10 rounded-full object-cover ring-1 ring-white/20"
                        />
                        <div>
                            <p className="text-sm font-medium text-white drop-shadow-sm leading-tight">
                                {isOwner ? 'My status' : currentGroup?.user?.username || currentGroup?.user?.name || 'Contact'}
                            </p>
                            <p className="text-xs text-white/75 drop-shadow-sm">
                                {formatTimestamp(currentStatus.createdAt)}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        {currentStatus.type === 'video' && (
                            <button
                                onClick={() => setIsMuted((prev) => !prev)}
                                aria-label="Toggle mute"
                                className="p-2 rounded-full text-white/80 hover:text-white transition-colors"
                            >
                                {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                            </button>
                        )}

                        <div className="relative">
                            <button
                                onClick={() => setShowMenu((prev) => !prev)}
                                aria-label="Status menu"
                                className="p-2 rounded-full text-white/80 hover:text-white transition-colors"
                            >
                                <MoreVertical size={18} />
                            </button>

                            {showMenu && (
                                <div className="absolute right-0 mt-1 w-36 rounded-lg bg-[#233138] border border-[#2a3942] shadow-xl py-1 z-40 text-xs">
                                    {isOwner ? (
                                        <button
                                            onClick={() => {
                                                setShowMenu(false);
                                                handleDelete();
                                            }}
                                            className="w-full px-3 py-2 text-left flex items-center gap-2 text-rose-400 hover:bg-[#182229] transition-colors"
                                        >
                                            <Trash2 size={13} />
                                            <span>Delete status</span>
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => {
                                                setShowMenu(false);
                                                handleMute();
                                            }}
                                            className="w-full px-3 py-2 text-left flex items-center gap-2 text-[#d1d7db] hover:bg-[#182229] transition-colors"
                                        >
                                            <Ban size={13} />
                                            <span>Mute updates</span>
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>

                        <button
                            onClick={onClose}
                            aria-label="Close status"
                            className="p-2 rounded-full text-white/80 hover:text-white transition-colors"
                        >
                            <X size={18} />
                        </button>
                    </div>
                </div>

                {/* 3. CONTENT AREA */}
                <div className="flex-1 flex items-center justify-center relative overflow-hidden bg-black">
                    {currentStatus.type === 'text' && (
                        <div
                            className="w-full h-full flex items-center justify-center p-8 text-center"
                            style={{ backgroundColor: currentStatus.backgroundColor || '#075E54' }}
                        >
                            <p
                                className={`text-2xl font-normal text-white max-w-full break-words leading-relaxed ${
                                    currentStatus.fontStyle === 'serif'
                                        ? 'font-serif'
                                        : currentStatus.fontStyle === 'mono'
                                        ? 'font-mono'
                                        : currentStatus.fontStyle === 'cursive'
                                        ? 'italic font-serif'
                                        : 'font-sans'
                                }`}
                            >
                                {currentStatus.text}
                            </p>
                        </div>
                    )}

                    {currentStatus.type === 'image' && (
                        <div className="w-full h-full flex flex-col justify-center items-center relative">
                            <img
                                src={currentStatus.media?.url}
                                alt="Status"
                                className="max-h-full max-w-full object-contain"
                            />
                            {currentStatus.caption && (
                                <div className="absolute bottom-20 left-0 right-0 p-3 text-center bg-gradient-to-t from-black/80 to-transparent">
                                    <p className="text-white text-sm drop-shadow">
                                        {currentStatus.caption}
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    {currentStatus.type === 'video' && (
                        <div className="w-full h-full flex flex-col justify-center items-center relative">
                            <video
                                ref={videoRef}
                                src={currentStatus.media?.url}
                                muted={isMuted}
                                playsInline
                                onWaiting={() => setIsVideoBuffering(true)}
                                onPlaying={() => setIsVideoBuffering(false)}
                                className="max-h-full max-w-full object-contain"
                            />
                            {isVideoBuffering && (
                                <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                                    <Loader2 className="animate-spin text-[#00a884]" size={28} />
                                </div>
                            )}
                            {currentStatus.caption && (
                                <div className="absolute bottom-20 left-0 right-0 p-3 text-center bg-gradient-to-t from-black/80 to-transparent">
                                    <p className="text-white text-sm drop-shadow">
                                        {currentStatus.caption}
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* 4. BOTTOM BAR */}
                <div
                    className="p-3 z-30 bg-gradient-to-t from-black via-black/70 to-transparent pointer-events-auto"
                    onClick={(e) => e.stopPropagation()}
                >
                    {isOwner ? (
                        <div className="flex flex-col items-center">
                            <button
                                onClick={() => setShowViewersSheet(true)}
                                className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#202c33]/80 hover:bg-[#202c33] border border-[#2a3942] text-white text-xs font-medium transition-colors"
                            >
                                <Eye className="text-[#00a884]" size={14} />
                                <span>{currentStatus.viewCount || currentStatus.viewers?.length || 0} views</span>
                            </button>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-2">
                            <div className="flex justify-around py-0.5">
                                {QUICK_REACTIONS.map((emoji) => (
                                    <button
                                        key={emoji}
                                        onClick={() => handleQuickReaction(emoji)}
                                        className="text-lg hover:scale-125 transition-transform"
                                    >
                                        {emoji}
                                    </button>
                                ))}
                            </div>

                            <div className="flex items-center gap-2">
                                <input
                                    type="text"
                                    value={replyText}
                                    onFocus={() => {
                                        setIsReplyInputFocused(true);
                                        setIsPaused(true);
                                    }}
                                    onBlur={() => {
                                        setIsReplyInputFocused(false);
                                        setIsPaused(false);
                                    }}
                                    onChange={(e) => setReplyText(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            handleSendReply();
                                        }
                                    }}
                                    placeholder="Reply to status..."
                                    className="flex-1 bg-[#202c33] text-white placeholder-[#8696a0] px-3.5 py-2 rounded-full text-xs outline-none border border-[#2a3942] focus:border-[#00a884]"
                                />

                                <button
                                    onClick={handleSendReply}
                                    disabled={!replyText.trim() || isReplying}
                                    className="p-2.5 rounded-full bg-[#00a884] text-white hover:bg-[#008f6f] disabled:opacity-40 transition-colors shadow"
                                >
                                    <Send size={14} />
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {isOwner && (
                    <ViewersModal
                        isOpen={showViewersSheet}
                        status={currentStatus}
                        onClose={() => setShowViewersSheet(false)}
                        onDelete={onDeleteStatus}
                    />
                )}
            </div>
        </div>,
        document.body
    );
};

export default StatusViewer;
