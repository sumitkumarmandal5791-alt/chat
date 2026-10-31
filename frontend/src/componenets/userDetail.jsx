import React, { useState, useRef } from 'react';
import {
    Camera,
    Check,
    Pencil,
    ArrowLeft,
    Mail,
    Phone,
    Shield,
    Star,
    Image as ImageIcon,
    Lock,
    X,
    ChevronRight
} from 'lucide-react';
import useuserStore from '../store/useruserStore';
import useThemeStore from '../store/themeStore';
import { updateProfile } from '../services/user.services';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';

const UserDetail = ({ onBack }) => {
    const { user, setUser } = useuserStore();
    const { theme } = useThemeStore();
    const navigate = useNavigate();
    const isDark = theme === 'dark';

    const [isEditingName, setIsEditingName] = useState(false);
    const [nameValue, setNameValue] = useState(user?.username || '');

    const [isEditingAbout, setIsEditingAbout] = useState(false);
    const [aboutValue, setAboutValue] = useState(user?.about || 'Hey there! I am using WhatsApp.');

    const [isSaving, setIsSaving] = useState(false);
    const fileInputRef = useRef(null);

    if (!user) return null;

    const handleSaveName = async () => {
        if (!nameValue.trim() || isSaving) return;
        setIsSaving(true);
        try {
            const res = await updateProfile({ username: nameValue.trim() });
            if (res?.user && setUser) {
                setUser({ ...user, ...res.user });
            }
            toast.success('Name updated');
            setIsEditingName(false);
        } catch (err) {
            toast.error(typeof err === 'string' ? err : 'Failed to update name');
        } finally {
            setIsSaving(false);
        }
    };

    const handleSaveAbout = async () => {
        if (!aboutValue.trim() || isSaving) return;
        setIsSaving(true);
        try {
            const res = await updateProfile({ about: aboutValue.trim() });
            if (res?.user && setUser) {
                setUser({ ...user, ...res.user });
            }
            toast.success('About updated');
            setIsEditingAbout(false);
        } catch (err) {
            toast.error(typeof err === 'string' ? err : 'Failed to update about');
        } finally {
            setIsSaving(false);
        }
    };

    const handleAvatarChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('media', file);

        toast.info('Uploading photo...');
        try {
            const res = await updateProfile(formData);
            if (res?.user && setUser) {
                setUser({ ...user, ...res.user });
            }
            toast.success('Profile photo updated');
        } catch (err) {
            toast.error('Failed to upload photo');
        }
    };

    return (
        <div
            className={`w-full h-full flex flex-col select-none transition-colors duration-150 ${
                isDark ? 'bg-[#111b21] text-[#e9edef]' : 'bg-[#f0f2f5] text-[#111b21]'
            }`}
        >
            {/* 1. HEADER (108px green accent header on WhatsApp Web) */}
            <div
                className={`h-24 px-6 pb-4 flex items-end shrink-0 ${
                    isDark ? 'bg-[#202c33]' : 'bg-[#008069]'
                } text-white`}
            >
                <div className="flex items-center gap-6">
                    <button
                        onClick={onBack || (() => navigate(-1))}
                        aria-label="Back"
                        className="p-1 rounded-full hover:bg-black/10 transition-colors"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <h1 className="text-lg font-medium tracking-tight">Profile</h1>
                </div>
            </div>

            {/* 2. BODY CONTENT */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6 max-w-xl mx-auto w-full">
                {/* Avatar with Camera Overlay */}
                <div className="flex justify-center my-4">
                    <div
                        onClick={() => fileInputRef.current?.click()}
                        className="relative w-40 h-40 rounded-full overflow-hidden cursor-pointer group shadow-sm ring-1 ring-black/5"
                    >
                        <img
                            src={user.profilePicture || 'https://via.placeholder.com/160'}
                            alt="Profile"
                            className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity">
                            <Camera size={26} className="mb-1" />
                            <span className="text-[11px] font-semibold text-center uppercase tracking-wider px-2">
                                Change Profile Photo
                            </span>
                        </div>
                    </div>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarChange}
                        className="hidden"
                    />
                </div>

                {/* Section 1: Your Name */}
                <div
                    className={`p-4 rounded-lg shadow-xs border ${
                        isDark ? 'bg-[#202c33] border-[#222d34]' : 'bg-white border-[#e9edef]'
                    }`}
                >
                    <p className="text-xs font-semibold text-[#00a884] uppercase tracking-wider mb-2">
                        Your name
                    </p>

                    {isEditingName ? (
                        <div className="flex items-center gap-2">
                            <input
                                type="text"
                                value={nameValue}
                                onChange={(e) => setNameValue(e.target.value)}
                                autoFocus
                                className={`flex-1 text-sm pb-1 outline-none border-b-2 border-[#00a884] bg-transparent text-inherit`}
                            />
                            <button
                                onClick={handleSaveName}
                                className="p-1 text-[#00a884] hover:opacity-80"
                            >
                                <Check size={18} />
                            </button>
                            <button
                                onClick={() => {
                                    setNameValue(user.username || '');
                                    setIsEditingName(false);
                                }}
                                className="p-1 text-[#8696a0] hover:text-inherit"
                            >
                                <X size={18} />
                            </button>
                        </div>
                    ) : (
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-inherit">{user.username}</span>
                            <button
                                onClick={() => setIsEditingName(true)}
                                aria-label="Edit name"
                                className="p-1 text-[#8696a0] hover:text-inherit"
                            >
                                <Pencil size={15} />
                            </button>
                        </div>
                    )}

                    <p className="text-xs text-[#8696a0] mt-3 leading-relaxed">
                        This is not your username or pin. This name will be visible to your WhatsApp contacts.
                    </p>
                </div>

                {/* Section 2: About */}
                <div
                    className={`p-4 rounded-lg shadow-xs border ${
                        isDark ? 'bg-[#202c33] border-[#222d34]' : 'bg-white border-[#e9edef]'
                    }`}
                >
                    <p className="text-xs font-semibold text-[#00a884] uppercase tracking-wider mb-2">
                        About
                    </p>

                    {isEditingAbout ? (
                        <div className="flex items-center gap-2">
                            <input
                                type="text"
                                value={aboutValue}
                                onChange={(e) => setAboutValue(e.target.value)}
                                autoFocus
                                className="flex-1 text-sm pb-1 outline-none border-b-2 border-[#00a884] bg-transparent text-inherit"
                            />
                            <button
                                onClick={handleSaveAbout}
                                className="p-1 text-[#00a884] hover:opacity-80"
                            >
                                <Check size={18} />
                            </button>
                            <button
                                onClick={() => {
                                    setAboutValue(user.about || 'Hey there! I am using WhatsApp.');
                                    setIsEditingAbout(false);
                                }}
                                className="p-1 text-[#8696a0] hover:text-inherit"
                            >
                                <X size={18} />
                            </button>
                        </div>
                    ) : (
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-inherit">
                                {user.about || 'Hey there! I am using WhatsApp.'}
                            </span>
                            <button
                                onClick={() => setIsEditingAbout(true)}
                                aria-label="Edit about"
                                className="p-1 text-[#8696a0] hover:text-inherit"
                            >
                                <Pencil size={15} />
                            </button>
                        </div>
                    )}
                </div>

                {/* Section 3: Contact Info */}
                <div
                    className={`p-4 rounded-lg shadow-xs border space-y-3 ${
                        isDark ? 'bg-[#202c33] border-[#222d34]' : 'bg-white border-[#e9edef]'
                    }`}
                >
                    <p className="text-xs font-semibold text-[#00a884] uppercase tracking-wider mb-1">
                        Contact details
                    </p>

                    <div className="flex items-center gap-3 text-sm">
                        <Mail size={16} className="text-[#8696a0] shrink-0" />
                        <span className="truncate">{user.email || 'Not provided'}</span>
                    </div>

                    <div className="flex items-center gap-3 text-sm">
                        <Phone size={16} className="text-[#8696a0] shrink-0" />
                        <span>{user.phoneNumber ? `+${user.phoneSuffix || ''} ${user.phoneNumber}` : 'Not provided'}</span>
                    </div>
                </div>

                {/* Section 4: Media, Links & Docs Navigation */}
                <div
                    className={`rounded-lg shadow-xs border overflow-hidden ${
                        isDark ? 'bg-[#202c33] border-[#222d34]' : 'bg-white border-[#e9edef]'
                    }`}
                >
                    <div
                        onClick={() => toast.info('Media, links, and docs gallery')}
                        className={`p-4 flex items-center justify-between cursor-pointer transition-colors border-b ${
                            isDark ? 'hover:bg-[#182229] border-[#2a3942]' : 'hover:bg-[#f5f6f6] border-[#e9edef]'
                        }`}
                    >
                        <div className="flex items-center gap-3">
                            <ImageIcon size={18} className="text-[#8696a0]" />
                            <span className="text-sm font-medium">Media, Links, and Docs</span>
                        </div>
                        <ChevronRight size={16} className="text-[#8696a0]" />
                    </div>

                    <div
                        onClick={() => toast.info('Starred messages')}
                        className={`p-4 flex items-center justify-between cursor-pointer transition-colors ${
                            isDark ? 'hover:bg-[#182229]' : 'hover:bg-[#f5f6f6]'
                        }`}
                    >
                        <div className="flex items-center gap-3">
                            <Star size={18} className="text-[#8696a0]" />
                            <span className="text-sm font-medium">Starred Messages</span>
                        </div>
                        <ChevronRight size={16} className="text-[#8696a0]" />
                    </div>
                </div>

                {/* Section 5: Security Note */}
                <div className="flex items-center justify-center gap-2 text-xs text-[#8696a0] py-3 text-center">
                    <Lock size={12} className="text-[#00a884]" />
                    <span>Your personal messages and calls are end-to-end encrypted</span>
                </div>
            </div>
        </div>
    );
};

export default UserDetail;
