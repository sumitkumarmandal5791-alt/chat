import React, { useState, useRef, useEffect, lazy, Suspense } from 'react';
import axios from 'axios';
import {
    X,
    Type,
    Palette,
    Smile,
    Send,
    Image as ImageIcon,
    Video,
    Camera,
    Shield,
    ChevronDown,
    Loader2
} from 'lucide-react';
const Picker = lazy(() => import('emoji-picker-react'));
import { getUploadSignature, uploadToCloudinaryDirect, createStatusApi } from '../../services/statusService';
import { useStatusStore } from '../../store/statusStore';
import { toast } from 'react-toastify';

const BG_COLORS = [
    '#075E54', // WhatsApp Deep Green
    '#128C7E', // Teal Green
    '#25D366', // Bright Green
    '#6B21A8', // Rich Purple
    '#BE185D', // Magenta / Pink
    '#B91C1C', // Crimson Red
    '#1E3A8A', // Deep Blue
    '#B45309', // Amber Warm
    '#374151'  // Slate Dark
];

const FONTS = [
    { id: 'sans', label: 'Sans', fontClass: 'font-sans' },
    { id: 'serif', label: 'Serif', fontClass: 'font-serif' },
    { id: 'mono', label: 'Mono', fontClass: 'font-mono' },
    { id: 'cursive', label: 'Script', fontClass: 'italic font-serif' }
];

const StatusCreator = ({ isOpen, onClose, contacts = [] }) => {
    const [mode, setMode] = useState('menu'); // 'menu' | 'text' | 'media'
    const [statusType, setStatusType] = useState('text'); // 'text' | 'image' | 'video'

    const [textContent, setTextContent] = useState('');
    const [bgColorIndex, setBgColorIndex] = useState(0);
    const [fontIndex, setFontIndex] = useState(0);

    const [mediaFile, setMediaFile] = useState(null);
    const [mediaPreview, setMediaPreview] = useState(null);
    const [caption, setCaption] = useState('');

    const [privacyMode, setPrivacyMode] = useState('contacts');
    const [selectedUserIds, setSelectedUserIds] = useState([]);
    const [showPrivacyPicker, setShowPrivacyPicker] = useState(false);
    const [privacySearch, setPrivacySearch] = useState('');

    const [showEmoji, setShowEmoji] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [uploadPercent, setUploadPercent] = useState(0);

    const cancelSourceRef = useRef(null);
    const fileInputRef = useRef(null);
    const cameraInputRef = useRef(null);
    const textareaRef = useRef(null);

    const fetchFeed = useStatusStore((state) => state.fetchFeed);

    useEffect(() => {
        if (!isOpen) {
            setMode('menu');
            setTextContent('');
            setMediaFile(null);
            setMediaPreview(null);
            setCaption('');
            setShowEmoji(false);
            setIsSubmitting(false);
            setUploadPercent(0);
            setShowPrivacyPicker(false);
        }
    }, [isOpen]);

    const handleCycleColor = () => {
        setBgColorIndex((prev) => (prev + 1) % BG_COLORS.length);
    };

    const handleCycleFont = () => {
        setFontIndex((prev) => (prev + 1) % FONTS.length);
    };

    const handleFileSelect = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const isImage = file.type.startsWith('image/');
        const isVideo = file.type.startsWith('video/');

        if (!isImage && !isVideo) {
            toast.error('Only images and videos are supported.');
            return;
        }

        if (isImage && file.size > 10 * 1024 * 1024) {
            toast.error('Image size must be 10MB or less.');
            return;
        }

        if (isVideo && file.size > 50 * 1024 * 1024) {
            toast.error('Video size must be 50MB or less.');
            return;
        }

        if (isVideo) {
            const tempVideo = document.createElement('video');
            tempVideo.preload = 'metadata';
            tempVideo.src = URL.createObjectURL(file);
            tempVideo.onloadedmetadata = () => {
                window.URL.revokeObjectURL(tempVideo.src);
                if (tempVideo.duration > 30.5) {
                    toast.error(`Video is too long (${Math.round(tempVideo.duration)}s). Maximum allowed is 30s.`);
                    return;
                }
                proceedWithFile(file, 'video');
            };
            tempVideo.onerror = () => {
                toast.error('Failed to read video file.');
            };
            return;
        }

        proceedWithFile(file, 'image');
    };

    const proceedWithFile = (file, type) => {
        setMediaFile(file);
        setStatusType(type);
        setMediaPreview(URL.createObjectURL(file));
        setMode('media');
    };

    const handleEmojiClick = (emojiData) => {
        if (mode === 'text') {
            setTextContent((prev) => prev + emojiData.emoji);
        } else {
            setCaption((prev) => prev + emojiData.emoji);
        }
    };

    const handleCancelUpload = () => {
        if (cancelSourceRef.current) {
            cancelSourceRef.current.cancel('Upload cancelled by user.');
        }
        setIsSubmitting(false);
        setUploadPercent(0);
    };

    const handleSendTextStatus = async () => {
        if (!textContent.trim() || isSubmitting) return;

        setIsSubmitting(true);
        try {
            const payload = {
                type: 'text',
                text: textContent.trim(),
                backgroundColor: BG_COLORS[bgColorIndex],
                fontStyle: FONTS[fontIndex].id,
                privacy: {
                    mode: privacyMode,
                    userIds: selectedUserIds
                }
            };

            await createStatusApi(payload);
            toast.success('Status updated');
            await fetchFeed();
            onClose();
        } catch (error) {
            console.error('Error submitting text status:', error);
            toast.error(error.response?.data?.message || 'Failed to update status');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSendMediaStatus = async () => {
        if (!mediaFile || isSubmitting) return;

        setIsSubmitting(true);
        setUploadPercent(0);

        try {
            const signatureResponse = await getUploadSignature();
            if (!signatureResponse.success) {
                throw new Error('Failed to obtain upload authorization');
            }

            cancelSourceRef.current = axios.CancelToken.source();
            const uploadResult = await uploadToCloudinaryDirect(
                mediaFile,
                signatureResponse.data,
                (percent) => setUploadPercent(percent),
                cancelSourceRef.current.token
            );

            const payload = {
                type: statusType,
                publicId: uploadResult.public_id,
                caption: caption.trim() || undefined,
                resourceType: statusType,
                privacy: {
                    mode: privacyMode,
                    userIds: selectedUserIds
                }
            };

            await createStatusApi(payload);
            toast.success('Status uploaded');
            await fetchFeed();
            onClose();
        } catch (error) {
            if (axios.isCancel(error)) {
                toast.info('Upload cancelled');
            } else {
                console.error('Error uploading media status:', error);
                toast.error(error.response?.data?.message || error.message || 'Failed to post status');
            }
        } finally {
            setIsSubmitting(false);
            setUploadPercent(0);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs select-none animate-fade-in">
            <div className="relative w-full h-full md:max-w-md md:h-[90vh] md:max-h-[800px] md:rounded-2xl overflow-hidden flex flex-col bg-[#111b21] text-[#e9edef] shadow-2xl">
                {/* 1. SELECTION MENU */}
                {mode === 'menu' && (
                    <div className="flex-1 flex flex-col justify-end p-6 bg-[#111b21]">
                        <button
                            onClick={onClose}
                            aria-label="Close"
                            className="absolute top-4 right-4 p-2 rounded-full text-[#8696a0] hover:text-white hover:bg-[#202c33] transition-colors"
                        >
                            <X size={20} />
                        </button>

                        <div className="mb-6 text-center">
                            <h2 className="text-xl font-bold tracking-tight">Add Status</h2>
                            <p className="text-xs text-[#8696a0] mt-1">Disappears after 24 hours</p>
                        </div>

                        <div className="grid grid-cols-3 gap-3 mb-6">
                            <button
                                onClick={() => setMode('text')}
                                className="flex flex-col items-center gap-2 p-3.5 rounded-lg border border-[#222d34] bg-[#202c33] hover:bg-[#2a3942] transition-colors active:scale-95"
                            >
                                <div className="p-2.5 bg-[#00a884] text-white rounded-full">
                                    <Type size={18} />
                                </div>
                                <span className="text-xs font-medium">Text</span>
                            </button>

                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="flex flex-col items-center gap-2 p-3.5 rounded-lg border border-[#222d34] bg-[#202c33] hover:bg-[#2a3942] transition-colors active:scale-95"
                            >
                                <div className="p-2.5 bg-[#00a884] text-white rounded-full">
                                    <ImageIcon size={18} />
                                </div>
                                <span className="text-xs font-medium">Media</span>
                            </button>

                            <button
                                onClick={() => cameraInputRef.current?.click()}
                                className="flex flex-col items-center gap-2 p-3.5 rounded-lg border border-[#222d34] bg-[#202c33] hover:bg-[#2a3942] transition-colors active:scale-95"
                            >
                                <div className="p-2.5 bg-[#00a884] text-white rounded-full">
                                    <Camera size={18} />
                                </div>
                                <span className="text-xs font-medium">Camera</span>
                            </button>
                        </div>

                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/png,image/jpeg,image/webp,video/mp4,video/webm,video/quicktime"
                            onChange={handleFileSelect}
                            className="hidden"
                        />
                        <input
                            ref={cameraInputRef}
                            type="file"
                            accept="image/*,video/*"
                            capture="environment"
                            onChange={handleFileSelect}
                            className="hidden"
                        />
                    </div>
                )}

                {/* 2. TEXT STATUS COMPOSER */}
                {mode === 'text' && (
                    <div
                        className="flex-1 flex flex-col relative transition-colors duration-200"
                        style={{ backgroundColor: BG_COLORS[bgColorIndex] }}
                    >
                        <div className="flex items-center justify-between p-3 z-20">
                            <button
                                onClick={() => setMode('menu')}
                                aria-label="Cancel"
                                className="p-2 rounded-full text-white/80 hover:text-white transition-colors"
                            >
                                <X size={20} />
                            </button>

                            <div className="flex items-center gap-2">
                                <button
                                    onClick={handleCycleFont}
                                    className="px-3 py-1 rounded-full bg-black/20 hover:bg-black/40 text-white text-xs font-medium transition-colors"
                                >
                                    {FONTS[fontIndex].label}
                                </button>

                                <button
                                    onClick={handleCycleColor}
                                    aria-label="Change color"
                                    className="p-2 rounded-full bg-black/20 hover:bg-black/40 text-white transition-colors"
                                >
                                    <Palette size={16} />
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 flex items-center justify-center p-6 overflow-y-auto">
                            <textarea
                                ref={textareaRef}
                                value={textContent}
                                onChange={(e) => setTextContent(e.target.value.slice(0, 700))}
                                placeholder="Type a status"
                                autoFocus
                                className={`w-full bg-transparent text-white text-center text-2xl md:text-3xl outline-none resize-none placeholder-white/50 ${FONTS[fontIndex].fontClass}`}
                                rows={5}
                            />
                        </div>

                        <div className="p-3 z-20 flex flex-col gap-2 bg-gradient-to-t from-black/60 to-transparent">
                            <div className="flex items-center justify-between text-xs text-white/80">
                                <button
                                    onClick={() => setShowPrivacyPicker(true)}
                                    className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/30 hover:bg-black/50 transition-colors"
                                >
                                    <Shield size={12} />
                                    <span>
                                        {privacyMode === 'contacts' && 'Status (Contacts)'}
                                        {privacyMode === 'contacts_except' && `Contacts except (${selectedUserIds.length})`}
                                        {privacyMode === 'only_share' && `Only share with (${selectedUserIds.length})`}
                                    </span>
                                    <ChevronDown size={10} />
                                </button>

                                <span>{700 - textContent.length} left</span>
                            </div>

                            <div className="flex items-center justify-between">
                                <button
                                    onClick={() => setShowEmoji((prev) => !prev)}
                                    aria-label="Add emoji"
                                    className="p-2.5 rounded-full text-white/80 hover:text-white transition-colors"
                                >
                                    <Smile size={20} />
                                </button>

                                <button
                                    onClick={handleSendTextStatus}
                                    disabled={!textContent.trim() || isSubmitting}
                                    aria-label="Send status"
                                    className="p-3 rounded-full bg-[#00a884] text-white hover:bg-[#008f6f] disabled:opacity-40 transition-colors shadow-xs active:scale-95"
                                >
                                    {isSubmitting ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}
                                </button>
                            </div>
                        </div>

                        {showEmoji && (
                            <div className="absolute bottom-16 left-3 z-40">
                                <Suspense fallback={<div className="p-3 bg-slate-900 rounded text-xs text-slate-400">Loading emoji...</div>}>
                                    <Picker onEmojiClick={handleEmojiClick} theme="dark" />
                                </Suspense>
                            </div>
                        )}
                    </div>
                )}

                {/* 3. MEDIA STATUS COMPOSER */}
                {mode === 'media' && (
                    <div className="flex-1 flex flex-col relative bg-[#0b141a]">
                        <div className="absolute top-0 left-0 right-0 p-3 z-20 flex items-center justify-between bg-gradient-to-b from-black/80 to-transparent">
                            <button
                                onClick={() => setMode('menu')}
                                aria-label="Cancel"
                                className="p-2 rounded-full text-white/80 hover:text-white transition-colors"
                            >
                                <X size={20} />
                            </button>

                            <div className="text-xs px-2.5 py-0.5 rounded-full bg-black/40 text-slate-300">
                                {statusType === 'video' ? 'Video (max 30s)' : 'Photo'}
                            </div>
                        </div>

                        <div className="flex-1 flex items-center justify-center p-2 overflow-hidden bg-black">
                            {statusType === 'image' && (
                                <img
                                    src={mediaPreview}
                                    alt="Preview"
                                    className="max-h-full max-w-full object-contain"
                                />
                            )}
                            {statusType === 'video' && (
                                <video
                                    src={mediaPreview}
                                    controls
                                    playsInline
                                    className="max-h-full max-w-full object-contain"
                                />
                            )}
                        </div>

                        {isSubmitting && (
                            <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/75 p-6 text-center">
                                <Loader2 className="animate-spin text-[#00a884] mb-3" size={32} />
                                <p className="font-semibold text-sm">Uploading status...</p>
                                <div className="w-full max-w-xs bg-slate-800 rounded-full h-1.5 mt-2.5 overflow-hidden">
                                    <div
                                        className="bg-[#00a884] h-full transition-all duration-150"
                                        style={{ width: `${uploadPercent}%` }}
                                    />
                                </div>
                                <span className="text-xs text-slate-400 mt-1">{uploadPercent}%</span>
                                <button
                                    onClick={handleCancelUpload}
                                    className="mt-3 px-3 py-1 rounded text-xs text-rose-400 hover:underline"
                                >
                                    Cancel
                                </button>
                            </div>
                        )}

                        <div className="p-3 z-20 flex flex-col gap-2 bg-gradient-to-t from-black via-black/80 to-transparent">
                            <div className="flex items-center justify-between text-xs text-slate-300">
                                <button
                                    onClick={() => setShowPrivacyPicker(true)}
                                    className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/40 hover:bg-black/60 transition-colors"
                                >
                                    <Shield size={12} className="text-[#00a884]" />
                                    <span>
                                        {privacyMode === 'contacts' && 'Status (Contacts)'}
                                        {privacyMode === 'contacts_except' && `Contacts except (${selectedUserIds.length})`}
                                        {privacyMode === 'only_share' && `Only share with (${selectedUserIds.length})`}
                                    </span>
                                    <ChevronDown size={10} />
                                </button>

                                <span>{700 - caption.length} left</span>
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setShowEmoji((prev) => !prev)}
                                    aria-label="Add emoji"
                                    className="p-2 text-[#8696a0] hover:text-white transition-colors"
                                >
                                    <Smile size={20} />
                                </button>

                                <input
                                    type="text"
                                    value={caption}
                                    onChange={(e) => setCaption(e.target.value.slice(0, 700))}
                                    placeholder="Add a caption..."
                                    className="flex-1 bg-[#202c33] text-white placeholder-[#8696a0] px-3.5 py-2 rounded-full text-xs outline-none border border-[#2a3942] focus:border-[#00a884]"
                                />

                                <button
                                    onClick={handleSendMediaStatus}
                                    disabled={isSubmitting}
                                    aria-label="Send status"
                                    className="p-2.5 rounded-full bg-[#00a884] text-white hover:bg-[#008f6f] disabled:opacity-50 transition-colors shadow-xs active:scale-95"
                                >
                                    <Send size={16} />
                                </button>
                            </div>
                        </div>

                        {showEmoji && (
                            <div className="absolute bottom-16 left-3 z-40">
                                <Suspense fallback={<div className="p-3 bg-slate-900 rounded text-xs text-slate-400">Loading emoji...</div>}>
                                    <Picker onEmojiClick={handleEmojiClick} theme="dark" />
                                </Suspense>
                            </div>
                        )}
                    </div>
                )}

                {/* 4. PRIVACY SELECTOR */}
                {showPrivacyPicker && (
                    <div className="absolute inset-0 z-50 flex flex-col bg-[#111b21] text-[#e9edef] animate-fade-in">
                        <div className="h-12 px-4 border-b border-[#222d34] flex items-center justify-between">
                            <h3 className="font-semibold text-sm">Status Privacy</h3>
                            <button
                                onClick={() => setShowPrivacyPicker(false)}
                                className="px-3 py-1 bg-[#00a884] text-white rounded-full text-xs font-semibold"
                            >
                                Done
                            </button>
                        </div>

                        <div className="p-4 space-y-2">
                            {[
                                { id: 'contacts', title: 'My contacts', desc: 'Share with all your contacts' },
                                { id: 'contacts_except', title: 'My contacts except...', desc: 'Hide status from selected contacts' },
                                { id: 'only_share', title: 'Only share with...', desc: 'Share only with selected contacts' }
                            ].map((item) => (
                                <label
                                    key={item.id}
                                    onClick={() => setPrivacyMode(item.id)}
                                    className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                                        privacyMode === item.id
                                            ? 'bg-[#202c33] border-[#00a884]'
                                            : 'bg-[#202c33] border-[#222d34] hover:bg-[#2a3942]'
                                    }`}
                                >
                                    <div>
                                        <p className="font-medium text-xs text-inherit">{item.title}</p>
                                        <p className="text-[11px] text-[#8696a0] mt-0.5">{item.desc}</p>
                                    </div>
                                    <input
                                        type="radio"
                                        name="privacy"
                                        checked={privacyMode === item.id}
                                        onChange={() => setPrivacyMode(item.id)}
                                        className="radio radio-primary radio-xs"
                                    />
                                </label>
                            ))}
                        </div>

                        {privacyMode !== 'contacts' && (
                            <div className="flex-1 flex flex-col px-4 pb-4 overflow-hidden border-t border-[#222d34]">
                                <input
                                    type="text"
                                    placeholder="Search contacts..."
                                    value={privacySearch}
                                    onChange={(e) => setPrivacySearch(e.target.value)}
                                    className="w-full bg-[#202c33] border border-[#222d34] rounded-lg px-3 py-1.5 text-xs text-white my-3 outline-none"
                                />

                                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1">
                                    {contacts
                                        .filter((c) =>
                                            (c.username || c.name || '').toLowerCase().includes(privacySearch.toLowerCase())
                                        )
                                        .map((contact) => {
                                            const cId = (contact._id || contact.id)?.toString();
                                            const isSelected = selectedUserIds.includes(cId);

                                            return (
                                                <div
                                                    key={cId}
                                                    onClick={() => {
                                                        setSelectedUserIds((prev) =>
                                                            isSelected ? prev.filter((id) => id !== cId) : [...prev, cId]
                                                        );
                                                    }}
                                                    className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${
                                                        isSelected ? 'bg-[#2a3942]' : 'hover:bg-[#202c33]'
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-2.5">
                                                        <img
                                                            src={contact.profilePicture || 'https://via.placeholder.com/36'}
                                                            alt={contact.username}
                                                            className="w-8 h-8 rounded-full object-cover"
                                                        />
                                                        <div>
                                                            <p className="text-xs font-medium">{contact.username || contact.name}</p>
                                                            <p className="text-[10px] text-[#8696a0]">{contact.about || 'Available'}</p>
                                                        </div>
                                                    </div>
                                                    <input
                                                        type="checkbox"
                                                        checked={isSelected}
                                                        readOnly
                                                        className="checkbox checkbox-xs checkbox-primary"
                                                    />
                                                </div>
                                            );
                                        })}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default StatusCreator;
