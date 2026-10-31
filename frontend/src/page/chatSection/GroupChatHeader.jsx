import React from 'react';
import {
    ArrowLeft,
    Users,
    Search,
    Phone,
    Video,
    MoreVertical
} from 'lucide-react';
import useThemeStore from '../../store/themeStore';

const GroupChatHeader = ({
    group,
    groupDetails,
    onBack,
    onOpenInfo,
    typingText,
    isMobile
}) => {
    const { theme } = useThemeStore();
    const isDark = theme === 'dark';

    const members = groupDetails?.members || group?.members || [];
    const memberCount = members.length;

    const renderSubtitle = () => {
        if (typingText) {
            return (
                <span className="text-[#00a884] font-medium animate-pulse">
                    {typingText}
                </span>
            );
        }

        if (groupDetails?.members?.length > 0) {
            const memberNames = groupDetails.members
                .slice(0, 4)
                .map((m) => m.userId?.username || m.userId?.name || 'Member')
                .join(', ');
            const remaining = memberCount > 4 ? ` +${memberCount - 4} more` : '';
            return `${memberNames}${remaining}`;
        }

        return `${memberCount} members · tap here for group info`;
    };

    return (
        <div
            className={`h-16 px-4 flex items-center justify-between border-b shrink-0 select-none z-10 transition-colors ${
                isDark ? 'bg-[#202c33] border-[#222d34]' : 'bg-[#f0f2f5] border-[#e9edef]'
            }`}
        >
            {/* Left: Avatar, Name & Info Trigger */}
            <div className="flex items-center gap-3 min-w-0 cursor-pointer" onClick={onOpenInfo}>
                {isMobile && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onBack();
                        }}
                        className="p-1 -ml-1 hover:bg-white/10 rounded-full transition-colors text-[#8696a0]"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                )}

                <div className="relative shrink-0">
                    <div
                        className={`w-10 h-10 rounded-full overflow-hidden flex items-center justify-center font-bold text-sm ${
                            isDark ? 'bg-[#111b21] text-[#8696a0]' : 'bg-[#e9edef] text-[#54656f]'
                        }`}
                    >
                        {group.avatar ? (
                            <img
                                src={group.avatar}
                                alt={group.name}
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <Users className="w-5 h-5 text-[#00a884]" />
                        )}
                    </div>
                </div>

                <div className="min-w-0">
                    <h2
                        className={`font-semibold text-sm leading-tight truncate hover:underline ${
                            isDark ? 'text-[#e9edef]' : 'text-[#111b21]'
                        }`}
                    >
                        {group.name}
                    </h2>
                    <p className="text-xs text-[#8696a0] leading-tight truncate max-w-[280px] sm:max-w-md">
                        {renderSubtitle()}
                    </p>
                </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-1 sm:gap-2 text-[#8696a0]">
                <button
                    onClick={onOpenInfo}
                    title="Search in conversation"
                    className="p-2 hover:bg-white/10 rounded-full transition-colors"
                >
                    <Search className="w-5 h-5" />
                </button>
                <button
                    title="Video Call"
                    className="p-2 hover:bg-white/10 rounded-full transition-colors opacity-70 hover:opacity-100"
                >
                    <Video className="w-5 h-5" />
                </button>
                <button
                    title="Voice Call"
                    className="p-2 hover:bg-white/10 rounded-full transition-colors opacity-70 hover:opacity-100"
                >
                    <Phone className="w-5 h-5" />
                </button>
                <button
                    onClick={onOpenInfo}
                    title="Group details"
                    className="p-2 hover:bg-white/10 rounded-full transition-colors"
                >
                    <MoreVertical className="w-5 h-5" />
                </button>
            </div>
        </div>
    );
};

export default GroupChatHeader;

