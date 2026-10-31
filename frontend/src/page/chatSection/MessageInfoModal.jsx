import React, { useEffect, useState } from 'react';
import { X, CheckCheck, Loader2 } from 'lucide-react';
import useThemeStore from '../../store/themeStore';
import formatTimestamp from '../../utils/formatTime';
import { getMessageInfo } from '../../services/groupService';

const MessageInfoModal = ({ isOpen, onClose, message }) => {
    const { theme } = useThemeStore();
    const isDark = theme === 'dark';

    const [infoData, setInfoData] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen && message?._id) {
            setLoading(true);
            getMessageInfo(message._id)
                .then((data) => {
                    if (data?.success) {
                        setInfoData(data);
                    }
                })
                .catch((err) => {
                    console.error('Failed to load message info:', err);
                })
                .finally(() => {
                    setLoading(false);
                });
        }
    }, [isOpen, message]);

    if (!isOpen || !message) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
            <div
                className={`w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden border flex flex-col max-h-[500px] ${
                    isDark
                        ? 'bg-[#111b21] border-[#222d34] text-[#e9edef]'
                        : 'bg-white border-[#e9edef] text-[#111b21]'
                }`}
            >
                {/* Header */}
                <div
                    className={`h-14 px-4 flex items-center justify-between border-b shrink-0 ${
                        isDark ? 'bg-[#202c33] border-[#222d34]' : 'bg-[#008069] text-white border-transparent'
                    }`}
                >
                    <h3 className="font-semibold text-sm">Message info</h3>
                    <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-full">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Message preview snippet */}
                <div
                    className={`p-3.5 border-b text-xs shrink-0 ${
                        isDark ? 'bg-[#202c33]/50 border-[#222d34]' : 'bg-[#f0f2f5] border-[#e9edef]'
                    }`}
                >
                    <p className="line-clamp-2 italic text-[#8696a0]">
                        "{message.message || message.content || 'Media message'}"
                    </p>
                    <span className="text-[10px] text-[#8696a0] block mt-1">
                        Sent {formatTimestamp(message.createdAt)}
                    </span>
                </div>

                {/* Body: Read by and Delivered to */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 divide-y divide-[#222d34]/20">
                    {loading ? (
                        <div className="flex items-center justify-center py-10">
                            <Loader2 className="w-5 h-5 animate-spin text-[#00a884]" />
                        </div>
                    ) : (
                        <>
                            {/* Read By */}
                            <div>
                                <div className="flex items-center gap-1.5 text-xs font-semibold text-[#53bdeb] mb-2">
                                    <CheckCheck className="w-4 h-4 text-[#53bdeb]" />
                                    <span>Read by ({infoData?.readBy?.length || 0})</span>
                                </div>
                                {(!infoData?.readBy || infoData.readBy.length === 0) ? (
                                    <p className="text-xs text-[#8696a0] italic">Not read yet</p>
                                ) : (
                                    <div className="space-y-2">
                                        {infoData.readBy.map((entry, idx) => (
                                            <div
                                                key={idx}
                                                className="flex items-center justify-between text-xs"
                                            >
                                                <span className="font-medium">
                                                    {entry.user?.username || entry.user?.name || 'Member'}
                                                </span>
                                                <span className="text-[11px] text-[#8696a0]">
                                                    {formatTimestamp(entry.readAt)}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Delivered To */}
                            <div className="pt-3">
                                <div className="flex items-center gap-1.5 text-xs font-semibold text-[#8696a0] mb-2">
                                    <CheckCheck className="w-4 h-4 text-[#8696a0]" />
                                    <span>Delivered to ({infoData?.deliveredTo?.length || 0})</span>
                                </div>
                                {(!infoData?.deliveredTo || infoData.deliveredTo.length === 0) ? (
                                    <p className="text-xs text-[#8696a0] italic">
                                        No delivery records yet
                                    </p>
                                ) : (
                                    <div className="space-y-2">
                                        {infoData.deliveredTo.map((entry, idx) => (
                                            <div
                                                key={idx}
                                                className="flex items-center justify-between text-xs"
                                            >
                                                <span className="font-medium">
                                                    {entry.user?.username || entry.user?.name || 'Member'}
                                                </span>
                                                <span className="text-[11px] text-[#8696a0]">
                                                    {formatTimestamp(entry.deliveredAt)}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MessageInfoModal;

