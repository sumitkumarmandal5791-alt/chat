import React, { useState, useEffect } from 'react';
import { X, Trash2, Eye, Loader2 } from 'lucide-react';
import { getStatusViewersApi } from '../../services/statusService';
import formatTimestamp from '../../utils/formatTime';

const ViewersModal = ({ isOpen, status, onClose, onDelete }) => {
    const [viewers, setViewers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        if (isOpen && status?._id) {
            fetchViewers();
        } else {
            setViewers([]);
        }
    }, [isOpen, status]);

    const fetchViewers = async () => {
        setLoading(true);
        try {
            const res = await getStatusViewersApi(status._id);
            if (res.success && res.data) {
                setViewers(res.data.viewers || []);
            }
        } catch (err) {
            console.error('Error fetching status viewers:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!status?._id || deleting) return;
        setDeleting(true);
        try {
            await onDelete(status._id);
            onClose();
        } catch (err) {
            console.error('Failed to delete status:', err);
        } finally {
            setDeleting(false);
        }
    };

    if (!isOpen || !status) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-xs">
            <div className="w-full max-w-md bg-[#202c33] border border-[#2a3942] rounded-t-2xl sm:rounded-2xl p-4 text-[#e9edef] max-h-[75vh] flex flex-col shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between pb-3 border-b border-[#2a3942]">
                    <div className="flex items-center gap-2">
                        <Eye className="text-[#00a884]" size={18} />
                        <h3 className="font-semibold text-sm">
                            Viewed by {viewers.length}
                        </h3>
                    </div>

                    <div className="flex items-center gap-1">
                        <button
                            onClick={handleDelete}
                            disabled={deleting}
                            aria-label="Delete status"
                            title="Delete status"
                            className="p-2 rounded-full text-rose-400 hover:bg-rose-500/10 transition-colors"
                        >
                            {deleting ? <Loader2 className="animate-spin" size={16} /> : <Trash2 size={16} />}
                        </button>

                        <button
                            onClick={onClose}
                            aria-label="Close"
                            className="p-2 rounded-full text-[#8696a0] hover:text-white transition-colors"
                        >
                            <X size={16} />
                        </button>
                    </div>
                </div>

                {/* Viewers List */}
                <div className="flex-1 overflow-y-auto custom-scrollbar py-2 space-y-1">
                    {loading ? (
                        <div className="py-8 flex flex-col items-center justify-center text-[#8696a0]">
                            <Loader2 className="animate-spin text-[#00a884] mb-2" size={20} />
                            <p className="text-xs">Loading viewers...</p>
                        </div>
                    ) : viewers.length === 0 ? (
                        <div className="py-10 text-center text-[#8696a0]">
                            <Eye className="mx-auto mb-1 opacity-30" size={26} />
                            <p className="text-xs font-medium">No views yet</p>
                        </div>
                    ) : (
                        viewers.map((item, idx) => {
                            const viewerUser = item.user;
                            return (
                                <div
                                    key={viewerUser?._id || idx}
                                    className="flex items-center justify-between p-2 rounded-lg hover:bg-[#182229] transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        <img
                                            src={viewerUser?.profilePicture || 'https://via.placeholder.com/40'}
                                            alt={viewerUser?.username}
                                            className="w-9 h-9 rounded-full object-cover"
                                        />
                                        <div>
                                            <p className="text-sm font-medium text-[#e9edef]">
                                                {viewerUser?.username || viewerUser?.name || 'User'}
                                            </p>
                                            <p className="text-xs text-[#8696a0]">
                                                {formatTimestamp(item.viewedAt)}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
};

export default ViewersModal;
