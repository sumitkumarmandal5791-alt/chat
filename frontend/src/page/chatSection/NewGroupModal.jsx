import React, { useState, useMemo } from 'react';
import { X, ArrowRight, ArrowLeft, Camera, Check, Search, Users, Loader2 } from 'lucide-react';
import useThemeStore from '../../store/themeStore';
import { useGroupStore } from '../../store/groupStore';
import { createGroup as apiCreateGroup } from '../../services/groupService';
import { toast } from 'react-toastify';

const NewGroupModal = ({ isOpen, onClose, contacts = [], onGroupCreated }) => {
    const { theme } = useThemeStore();
    const isDark = theme === 'dark';
    const { fetchMyGroups, setActiveGroup } = useGroupStore();

    const [step, setStep] = useState(1); // 1: select members, 2: name & avatar
    const [selectedUsers, setSelectedUsers] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [groupName, setGroupName] = useState('');
    const [description, setDescription] = useState('');
    const [avatarFile, setAvatarFile] = useState(null);
    const [avatarPreview, setAvatarPreview] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const filteredContacts = useMemo(() => {
        if (!searchTerm.trim()) return contacts;
        const q = searchTerm.toLowerCase();
        return contacts.filter((c) =>
            (c.name || c.username || '').toLowerCase().includes(q)
        );
    }, [contacts, searchTerm]);

    if (!isOpen) return null;

    const toggleUser = (user) => {
        const uId = user._id || user.id;
        if (selectedUsers.some((u) => (u._id || u.id) === uId)) {
            setSelectedUsers(selectedUsers.filter((u) => (u._id || u.id) !== uId));
        } else {
            if (selectedUsers.length >= 256) {
                toast.warning('Maximum 256 members allowed in a group');
                return;
            }
            setSelectedUsers([...selectedUsers, user]);
        }
    };

    const handleAvatarSelect = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            setAvatarFile(file);
            const previewUrl = URL.createObjectURL(file);
            setAvatarPreview(previewUrl);
        }
    };

    const handleCreateGroup = async (e) => {
        e.preventDefault();
        if (!groupName.trim()) {
            toast.error('Please enter a group subject / name');
            return;
        }

        setIsSubmitting(true);
        try {
            const formData = new FormData();
            formData.append('name', groupName.trim());
            if (description.trim()) {
                formData.append('description', description.trim());
            }
            const memberIds = selectedUsers.map((u) => u._id || u.id);
            formData.append('memberIds', JSON.stringify(memberIds));

            if (avatarFile) {
                formData.append('media', avatarFile);
            }

            const result = await apiCreateGroup(formData);

            if (result?.success && result.group) {
                toast.success(`Group "${groupName}" created!`);
                await fetchMyGroups();
                setActiveGroup(result.group);
                if (onGroupCreated) onGroupCreated(result.group);
                handleClose();
            }
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to create group');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        setStep(1);
        setSelectedUsers([]);
        setSearchTerm('');
        setGroupName('');
        setDescription('');
        setAvatarFile(null);
        setAvatarPreview(null);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
            <div
                className={`w-full max-w-md h-[580px] flex flex-col rounded-2xl shadow-2xl overflow-hidden border transition-all ${
                    isDark
                        ? 'bg-[#111b21] border-[#222d34] text-[#e9edef]'
                        : 'bg-white border-[#e9edef] text-[#111b21]'
                }`}
            >
                {/* Header */}
                <div
                    className={`h-16 px-5 flex items-center justify-between border-b shrink-0 ${
                        isDark ? 'bg-[#202c33] border-[#222d34]' : 'bg-[#008069] text-white border-transparent'
                    }`}
                >
                    <div className="flex items-center gap-3">
                        {step === 2 && (
                            <button
                                onClick={() => setStep(1)}
                                className="p-1 hover:bg-white/10 rounded-full transition-colors"
                            >
                                <ArrowLeft className="w-5 h-5" />
                            </button>
                        )}
                        <div>
                            <h2 className="font-semibold text-base leading-tight">
                                {step === 1 ? 'Add group members' : 'New group'}
                            </h2>
                            <p className="text-xs opacity-80">
                                {step === 1
                                    ? `${selectedUsers.length} of 256 selected`
                                    : 'Provide group name and optional icon'}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={handleClose}
                        className="p-1 hover:bg-white/10 rounded-full transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body Step 1: Member Selection */}
                {step === 1 && (
                    <div className="flex-1 flex flex-col overflow-hidden">
                        {/* Selected chips carousel */}
                        {selectedUsers.length > 0 && (
                            <div
                                className={`p-2.5 flex items-center gap-2 overflow-x-auto border-b shrink-0 ${
                                    isDark ? 'bg-[#0c1317] border-[#222d34]' : 'bg-[#f0f2f5] border-[#e9edef]'
                                }`}
                            >
                                {selectedUsers.map((u) => {
                                    const uId = u._id || u.id;
                                    return (
                                        <div
                                            key={uId}
                                            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs bg-[#00a884]/20 text-[#00a884] shrink-0 border border-[#00a884]/30"
                                        >
                                            <span className="font-medium max-w-[100px] truncate">
                                                {u.name || u.username}
                                            </span>
                                            <button
                                                onClick={() => toggleUser(u)}
                                                className="hover:text-red-400"
                                            >
                                                <X className="w-3 h-3" />
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* Search bar */}
                        <div className="p-3">
                            <div
                                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm border ${
                                    isDark
                                        ? 'bg-[#202c33] border-transparent text-[#e9edef]'
                                        : 'bg-[#f0f2f5] border-transparent text-[#111b21]'
                                }`}
                            >
                                <Search className="w-4 h-4 text-[#8696a0]" />
                                <input
                                    type="text"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder="Search contact name..."
                                    className="bg-transparent outline-none w-full placeholder:text-[#8696a0]"
                                />
                            </div>
                        </div>

                        {/* Contacts list */}
                        <div className="flex-1 overflow-y-auto px-2 divide-y divide-[#222d34]/20">
                            {filteredContacts.length === 0 ? (
                                <div className="text-center py-10 text-xs text-[#8696a0]">
                                    No contacts found
                                </div>
                            ) : (
                                filteredContacts.map((contact) => {
                                    const cId = contact._id || contact.id;
                                    const isSelected = selectedUsers.some(
                                        (u) => (u._id || u.id) === cId
                                    );
                                    return (
                                        <div
                                            key={cId}
                                            onClick={() => toggleUser(contact)}
                                            className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-colors ${
                                                isDark
                                                    ? 'hover:bg-[#202c33]'
                                                    : 'hover:bg-[#f0f2f5]'
                                            }`}
                                        >
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 bg-[#00a884]/20 flex items-center justify-center font-bold text-sm text-[#00a884]">
                                                    {contact.profilePicture ? (
                                                        <img
                                                            src={contact.profilePicture}
                                                            alt=""
                                                            className="w-full h-full object-cover"
                                                        />
                                                    ) : (
                                                        (contact.name || contact.username || 'U')
                                                            .charAt(0)
                                                            .toUpperCase()
                                                    )}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="font-medium text-sm truncate">
                                                        {contact.name || contact.username}
                                                    </p>
                                                    <p className="text-xs text-[#8696a0] truncate">
                                                        {contact.about || contact.email || ''}
                                                    </p>
                                                </div>
                                            </div>
                                            <div
                                                className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${
                                                    isSelected
                                                        ? 'bg-[#00a884] border-[#00a884] text-white'
                                                        : isDark
                                                        ? 'border-[#8696a0]'
                                                        : 'border-[#aebac1]'
                                                }`}
                                            >
                                                {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        {/* Footer button to step 2 */}
                        <div
                            className={`p-4 border-t flex justify-end shrink-0 ${
                                isDark ? 'border-[#222d34]' : 'border-[#e9edef]'
                            }`}
                        >
                            <button
                                disabled={selectedUsers.length === 0}
                                onClick={() => setStep(2)}
                                className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-medium text-sm transition-all shadow-md ${
                                    selectedUsers.length > 0
                                        ? 'bg-[#00a884] hover:bg-[#02906f] text-white cursor-pointer active:scale-95'
                                        : 'bg-gray-500/20 text-[#8696a0] cursor-not-allowed'
                                }`}
                            >
                                Next
                                <ArrowRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}

                {/* Body Step 2: Name & Photo */}
                {step === 2 && (
                    <form onSubmit={handleCreateGroup} className="flex-1 flex flex-col justify-between p-6">
                        <div className="flex flex-col items-center gap-5">
                            {/* Avatar selector */}
                            <label className="relative group cursor-pointer">
                                <div
                                    className={`w-28 h-28 rounded-full flex items-center justify-center overflow-hidden border-2 border-dashed ${
                                        isDark
                                            ? 'bg-[#202c33] border-[#8696a0]/40'
                                            : 'bg-[#f0f2f5] border-[#8696a0]/40'
                                    }`}
                                >
                                    {avatarPreview ? (
                                        <img
                                            src={avatarPreview}
                                            alt="Preview"
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <Camera className="w-10 h-10 text-[#8696a0] group-hover:scale-110 transition-transform" />
                                    )}
                                </div>
                                <span className="absolute bottom-1 right-1 p-2 rounded-full bg-[#00a884] text-white shadow-lg">
                                    <Camera className="w-4 h-4" />
                                </span>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleAvatarSelect}
                                    className="hidden"
                                />
                            </label>

                            {/* Name Input */}
                            <div className="w-full">
                                <label className="text-xs font-medium text-[#8696a0] block mb-1">
                                    Group Subject / Name *
                                </label>
                                <input
                                    type="text"
                                    maxLength={100}
                                    value={groupName}
                                    onChange={(e) => setGroupName(e.target.value)}
                                    placeholder="e.g. Family, Weekend Football..."
                                    className={`w-full px-3 py-2.5 rounded-lg text-sm border outline-none transition-colors ${
                                        isDark
                                            ? 'bg-[#202c33] border-[#222d34] focus:border-[#00a884] text-[#e9edef]'
                                            : 'bg-[#f0f2f5] border-[#e9edef] focus:border-[#00a884] text-[#111b21]'
                                    }`}
                                    autoFocus
                                    required
                                />
                                <span className="text-[11px] text-[#8696a0] float-right mt-1">
                                    {100 - groupName.length}
                                </span>
                            </div>

                            {/* Description Input */}
                            <div className="w-full">
                                <label className="text-xs font-medium text-[#8696a0] block mb-1">
                                    Group Description (optional)
                                </label>
                                <textarea
                                    maxLength={500}
                                    rows={3}
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="What is this group about?"
                                    className={`w-full px-3 py-2 rounded-lg text-sm border outline-none resize-none transition-colors ${
                                        isDark
                                            ? 'bg-[#202c33] border-[#222d34] focus:border-[#00a884] text-[#e9edef]'
                                            : 'bg-[#f0f2f5] border-[#e9edef] focus:border-[#00a884] text-[#111b21]'
                                    }`}
                                />
                            </div>
                        </div>

                        {/* Create button */}
                        <div className="flex justify-end pt-4">
                            <button
                                type="submit"
                                disabled={isSubmitting || !groupName.trim()}
                                className={`flex items-center gap-2 px-6 py-2.5 rounded-full font-medium text-sm transition-all shadow-md ${
                                    groupName.trim() && !isSubmitting
                                        ? 'bg-[#00a884] hover:bg-[#02906f] text-white cursor-pointer active:scale-95'
                                        : 'bg-gray-500/20 text-[#8696a0] cursor-not-allowed'
                                }`}
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Creating...
                                    </>
                                ) : (
                                    <>
                                        <Check className="w-4 h-4" />
                                        Create Group ({selectedUsers.length} members)
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};

export default NewGroupModal;
