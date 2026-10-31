import React from 'react';
import { Users, BellOff, Check, CheckCheck, Camera, Video, FileText, Mic } from 'lucide-react';
import useThemeStore from '../../store/themeStore';
import formatTimestamp from '../../utils/formatTime';

const GroupListItem = ({ group, isSelected, onClick, typingText }) => {
    const { theme } = useThemeStore();
    const isDark = theme === 'dark';

    const lastMsg = group.lastMessage;
    const unreadCount = group.unreadCount || 0;

    const renderMessagePreview = () => {
        if (typingText) {
            return (
                <span className="text-[#00a884] font-medium animate-pulse truncate">
                    {typingText}
                </span>
            );
        }

        if (!lastMsg) {
            return <span className="italic text-[#8696a0]">Tap to start chatting</span>;
        }

        if (lastMsg.type === 'system' || lastMsg.contentType === 'system') {
            return <span className="italic text-[#8696a0] truncate">{lastMsg.message}</span>;
        }

        const senderName = lastMsg.senderId?.username || lastMsg.senderId?.name || 'Member';

        if (lastMsg.contentType === 'image' || lastMsg.image) {
            return (
                <span className="flex items-center gap-1 truncate text-[#8696a0]">
                    <span className="text-[#8696a0] font-medium">{senderName}:</span>
                    <Camera className="w-3.5 h-3.5 inline text-[#8696a0]" />
                    <span>Photo</span>
                </span>
            );
        }

        if (lastMsg.contentType === 'video' || lastMsg.video) {
            return (
                <span className="flex items-center gap-1 truncate text-[#8696a0]">
                    <span className="text-[#8696a0] font-medium">{senderName}:</span>
                    <Video className="w-3.5 h-3.5 inline text-[#8696a0]" />
                    <span>Video</span>
                </span>
            );
        }

        if (lastMsg.contentType === 'audio') {
            return (
                <span className="flex items-center gap-1 truncate text-[#8696a0]">
                    <span className="text-[#8696a0] font-medium">{senderName}:</span>
                    <Mic className="w-3.5 h-3.5 inline text-[#8696a0]" />
                    <span>Voice</span>
                </span>
            );
        }

        if (lastMsg.contentType === 'file') {
            return (
                <span className="flex items-center gap-1 truncate text-[#8696a0]">
                    <span className="text-[#8696a0] font-medium">{senderName}:</span>
                    <FileText className="w-3.5 h-3.5 inline text-[#8696a0]" />
                    <span>Document</span>
                </span>
            );
        }

        return (
            <span className="truncate text-[#8696a0]">
                <span className="font-medium text-[#e9edef]/90">{senderName}: </span>
                {lastMsg.message || lastMsg.content || ''}
            </span>
        );
    };

    return (
        <div
            onClick={onClick}
            className={`group relative flex items-center gap-3 px-3.5 py-3 cursor-pointer transition-colors duration-150 border-b ${
                isDark ? 'border-[#222d34]/40' : 'border-[#e9edef]/60'
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
            {/* Group Avatar */}
            <div className="relative shrink-0">
                <div
                    className={`w-12 h-12 rounded-full overflow-hidden flex items-center justify-center font-bold text-base ${
                        isDark ? 'bg-[#202c33] text-[#8696a0]' : 'bg-[#e9edef] text-[#54656f]'
                    }`}
                >
                    {group.avatar ? (
                        <img
                            src={group.avatar}
                            alt={group.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                                e.target.style.display = 'none';
                            }}
                        />
                    ) : (
                        <Users className="w-6 h-6 text-[#00a884]" />
                    )}
                </div>
            </div>

            {/* Group Name & Preview */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                    <h3
                        className={`font-medium text-sm leading-tight truncate ${
                            isDark ? 'text-[#e9edef]' : 'text-[#111b21]'
                        }`}
                    >
                        {group.name}
                    </h3>
                    {lastMsg && (
                        <span
                            className={`text-[11px] shrink-0 ${
                                unreadCount > 0 ? 'text-[#00a884] font-medium' : 'text-[#8696a0]'
                            }`}
                        >
                            {formatTimestamp(lastMsg.createdAt || group.updatedAt)}
                        </span>
                    )}
                </div>

                <div className="flex items-center justify-between gap-2">
                    <p className="text-xs leading-normal truncate min-w-0">
                        {renderMessagePreview()}
                    </p>

                    <div className="flex items-center gap-1.5 shrink-0">
                        {unreadCount > 0 && (
                            <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[11px] font-semibold bg-[#00a884] text-white">
                                {unreadCount > 99 ? '99+' : unreadCount}
                            </span>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GroupListItem;

