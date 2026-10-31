import React, { useState, useMemo } from 'react';
import {
    X,
    Users,
    Camera,
    Pencil,
    Check,
    UserPlus,
    Link,
    LogOut,
    Trash2,
    Shield,
    MoreVertical,
    Search,
    Lock,
    Copy,
    RefreshCw,
    Loader2
} from 'lucide-react';
import useThemeStore from '../../store/themeStore';
import { useGroupStore } from '../../store/groupStore';
import { generateInviteLink as apiGenerateInviteLink } from '../../services/groupService';
import { toast } from 'react-toastify';

const GroupInfoPanel = ({
    isOpen,
    onClose,
    group,
    groupDetails,
    currentUserId,
    allContacts = []
}) => {
    const { theme } = useThemeStore();
    const isDark = theme === 'dark';

    const {
        updateGroupInfo,
        addMembers,
        removeMember,
        changeRole,
        transferOwnership,
        leaveGroup,
        deleteGroup
    } = useGroupStore();

    const [isEditingName, setIsEditingName] = useState(false);
    const [nameText, setNameText] = useState('');
    const [isEditingDesc, setIsEditingDesc] = useState(false);
    const [descText, setDescText] = useState('');
    const [searchTerm, setSearchTerm] = useState('');

    const [showAddMembersModal, setShowAddMembersModal] = useState(false);
    const [selectedNewMembers, setSelectedNewMembers] = useState([]);
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [inviteLink, setInviteLink] = useState('');
    const [isGeneratingLink, setIsGeneratingLink] = useState(false);
    const [memberActionMenu, setMemberActionMenu] = useState(null); // member object

    const targetGroup = groupDetails || group;
    const members = targetGroup?.members || [];

    // Current user's membership & role
    const myMembership = useMemo(() => {
        return members.find(
            (m) => (m.userId?._id || m.userId)?.toString() === currentUserId?.toString()
        );
    }, [members, currentUserId]);

    const isOwner = myMembership?.role === 'owner';
    const isAdmin = isOwner || myMembership?.role === 'admin';
    const canEditInfo = isAdmin || targetGroup?.settings?.whoCanEditInfo === 'all';

    // Filtered members list
    const filteredMembers = useMemo(() => {
        if (!searchTerm.trim()) return members;
        const q = searchTerm.toLowerCase();
        return members.filter((m) => {
            const name = m.userId?.username || m.userId?.name || '';
            return name.toLowerCase().includes(q);
        });
    }, [members, searchTerm]);

    // Available contacts not yet in group
    const nonGroupContacts = useMemo(() => {
        const memberUserIds = new Set(
            members.map((m) => (m.userId?._id || m.userId)?.toString())
        );
        return allContacts.filter(
            (c) => !memberUserIds.has((c._id || c.id)?.toString())
        );
    }, [allContacts, members]);

    if (!isOpen || !targetGroup) return null;

    // Handle name edit save
    const handleSaveName = async () => {
        if (!nameText.trim() || nameText === targetGroup.name) {
            setIsEditingName(false);
            return;
        }
        try {
            await updateGroupInfo(targetGroup._id, { name: nameText.trim() });
            toast.success('Group name updated');
            setIsEditingName(false);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to update name');
        }
    };

    // Handle desc edit save
    const handleSaveDesc = async () => {
        try {
            await updateGroupInfo(targetGroup._id, { description: descText.trim() });
            toast.success('Group description updated');
            setIsEditingDesc(false);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to update description');
        }
    };

    // Handle avatar upload
    const handleAvatarChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const formData = new FormData();
        formData.append('media', file);
        try {
            await updateGroupInfo(targetGroup._id, formData);
            toast.success('Group photo updated');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to update photo');
        }
    };

    // Handle permission toggle
    const handleToggleSetting = async (field, value) => {
        try {
            await updateGroupInfo(targetGroup._id, {
                settings: {
                    ...targetGroup.settings,
                    [field]: value
                }
            });
            toast.success('Group permissions updated');
        } catch (err) {
            toast.error('Failed to change permission');
        }
    };

    // Handle invite link generation
    const handleOpenInviteModal = async () => {
        setShowInviteModal(true);
        setIsGeneratingLink(true);
        try {
            const data = await apiGenerateInviteLink(targetGroup._id, false);
            if (data?.inviteCode) {
                setInviteLink(`${window.location.origin}/join/${data.inviteCode}`);
            }
        } catch (err) {
            toast.error('Could not generate invite link');
        } finally {
            setIsGeneratingLink(false);
        }
    };

    const handleResetInviteLink = async () => {
        setIsGeneratingLink(true);
        try {
            const data = await apiGenerateInviteLink(targetGroup._id, true);
            if (data?.inviteCode) {
                setInviteLink(`${window.location.origin}/join/${data.inviteCode}`);
                toast.info('Invite link was reset');
            }
        } catch (err) {
            toast.error('Could not reset link');
        } finally {
            setIsGeneratingLink(false);
        }
    };

    // Handle exit group
    const handleLeaveGroup = async () => {
        if (!window.confirm('Are you sure you want to leave this group?')) return;
        try {
            await leaveGroup(targetGroup._id);
            toast.info('You left the group');
            onClose();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to leave group');
        }
    };

    // Handle delete group
    const handleDeleteGroup = async () => {
        if (!window.confirm('Are you sure you want to permanently delete this group for all members?')) return;
        try {
            await deleteGroup(targetGroup._id);
            toast.info('Group deleted');
            onClose();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to delete group');
        }
    };

    return (
        <div className="fixed inset-y-0 right-0 z-40 w-full sm:w-[420px] shadow-2xl flex flex-col border-l transition-all animate-in slide-in-from-right duration-200">
            <div
                className={`h-full flex flex-col overflow-hidden ${
                    isDark ? 'bg-[#111b21] border-[#222d34] text-[#e9edef]' : 'bg-[#f0f2f5] border-[#e9edef] text-[#111b21]'
                }`}
            >
                {/* Header */}
                <div
                    className={`h-16 px-4 flex items-center justify-between border-b shrink-0 ${
                        isDark ? 'bg-[#202c33] border-[#222d34]' : 'bg-[#008069] text-white border-transparent'
                    }`}
                >
                    <div className="flex items-center gap-3">
                        <button
                            onClick={onClose}
                            className="p-1 hover:bg-white/10 rounded-full transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                        <h2 className="font-semibold text-base">Group Info</h2>
                    </div>
                </div>

                {/* Scrollable Body */}
                <div className="flex-1 overflow-y-auto divide-y divide-[#222d34]/20">
                    {/* 1. Avatar & Name Section */}
                    <div
                        className={`p-6 flex flex-col items-center text-center ${
                            isDark ? 'bg-[#111b21]' : 'bg-white'
                        }`}
                    >
                        <div className="relative group mb-4">
                            <div
                                className={`w-32 h-32 rounded-full overflow-hidden flex items-center justify-center font-bold text-3xl shadow-md border ${
                                    isDark ? 'bg-[#202c33] border-[#222d34]' : 'bg-[#e9edef] border-[#e9edef]'
                                }`}
                            >
                                {targetGroup.avatar ? (
                                    <img
                                        src={targetGroup.avatar}
                                        alt={targetGroup.name}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <Users className="w-16 h-16 text-[#00a884]" />
                                )}
                            </div>
                            {canEditInfo && (
                                <label className="absolute inset-0 rounded-full bg-black/40 text-white flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                                    <Camera className="w-6 h-6 mb-1" />
                                    <span className="text-[10px] font-medium uppercase tracking-wider">
                                        Change
                                    </span>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleAvatarChange}
                                        className="hidden"
                                    />
                                </label>
                            )}
                        </div>

                        {/* Name */}
                        {isEditingName ? (
                            <div className="flex items-center gap-2 w-full max-w-xs">
                                <input
                                    type="text"
                                    value={nameText}
                                    onChange={(e) => setNameText(e.target.value)}
                                    className={`w-full px-2 py-1 text-base font-semibold border-b outline-none text-center ${
                                        isDark
                                            ? 'bg-transparent border-[#00a884] text-[#e9edef]'
                                            : 'bg-transparent border-[#00a884] text-[#111b21]'
                                    }`}
                                    autoFocus
                                />
                                <button
                                    onClick={handleSaveName}
                                    className="p-1 text-[#00a884] hover:bg-[#00a884]/10 rounded-full"
                                >
                                    <Check className="w-4 h-4" />
                                </button>
                            </div>
                        ) : (
                            <div className="flex items-center justify-center gap-2 group/edit cursor-pointer">
                                <h1 className="text-xl font-bold truncate max-w-[280px]">
                                    {targetGroup.name}
                                </h1>
                                {canEditInfo && (
                                    <button
                                        onClick={() => {
                                            setNameText(targetGroup.name);
                                            setIsEditingName(true);
                                        }}
                                        className="opacity-0 group-hover/edit:opacity-100 p-1 text-[#8696a0] hover:text-[#00a884] transition-opacity"
                                    >
                                        <Pencil className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        )}

                        <p className="text-xs text-[#8696a0] mt-1">
                            Group · {members.length} participants
                        </p>
                    </div>

                    {/* 2. Description Section */}
                    <div className={`p-4 ${isDark ? 'bg-[#111b21]' : 'bg-white'}`}>
                        <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-medium text-[#8696a0]">Description</span>
                            {canEditInfo && !isEditingDesc && (
                                <button
                                    onClick={() => {
                                        setDescText(targetGroup.description || '');
                                        setIsEditingDesc(true);
                                    }}
                                    className="text-xs text-[#00a884] flex items-center gap-1 hover:underline"
                                >
                                    <Pencil className="w-3 h-3" /> Edit
                                </button>
                            )}
                        </div>
                        {isEditingDesc ? (
                            <div>
                                <textarea
                                    rows={3}
                                    value={descText}
                                    onChange={(e) => setDescText(e.target.value)}
                                    className={`w-full p-2 text-xs rounded border outline-none resize-none ${
                                        isDark
                                            ? 'bg-[#202c33] border-[#222d34] text-[#e9edef]'
                                            : 'bg-[#f0f2f5] border-[#e9edef] text-[#111b21]'
                                    }`}
                                />
                                <div className="flex justify-end gap-2 mt-2">
                                    <button
                                        onClick={() => setIsEditingDesc(false)}
                                        className="text-xs px-3 py-1 rounded text-[#8696a0]"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleSaveDesc}
                                        className="text-xs px-3 py-1 rounded bg-[#00a884] text-white"
                                    >
                                        Save
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <p className="text-xs text-[#8696a0] whitespace-pre-wrap">
                                {targetGroup.description || 'No description provided.'}
                            </p>
                        )}
                    </div>

                    {/* 3. Group Settings (Admins only) */}
                    {isAdmin && (
                        <div className={`p-4 ${isDark ? 'bg-[#111b21]' : 'bg-white'}`}>
                            <span className="text-xs font-semibold text-[#00a884] uppercase tracking-wider block mb-3">
                                Group Permissions
                            </span>
                            <div className="space-y-3 text-xs">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="font-medium">Send messages</p>
                                        <p className="text-[11px] text-[#8696a0]">
                                            Who can send messages to this group
                                        </p>
                                    </div>
                                    <select
                                        value={targetGroup.settings?.whoCanSend || 'all'}
                                        onChange={(e) =>
                                            handleToggleSetting('whoCanSend', e.target.value)
                                        }
                                        className={`px-2 py-1 rounded border outline-none text-xs ${
                                            isDark
                                                ? 'bg-[#202c33] border-[#222d34] text-[#e9edef]'
                                                : 'bg-[#f0f2f5] border-[#e9edef] text-[#111b21]'
                                        }`}
                                    >
                                        <option value="all">All participants</option>
                                        <option value="admins">Only admins</option>
                                    </select>
                                </div>

                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="font-medium">Edit group info</p>
                                        <p className="text-[11px] text-[#8696a0]">
                                            Who can change name, icon and description
                                        </p>
                                    </div>
                                    <select
                                        value={targetGroup.settings?.whoCanEditInfo || 'all'}
                                        onChange={(e) =>
                                            handleToggleSetting('whoCanEditInfo', e.target.value)
                                        }
                                        className={`px-2 py-1 rounded border outline-none text-xs ${
                                            isDark
                                                ? 'bg-[#202c33] border-[#222d34] text-[#e9edef]'
                                                : 'bg-[#f0f2f5] border-[#e9edef] text-[#111b21]'
                                        }`}
                                    >
                                        <option value="all">All participants</option>
                                        <option value="admins">Only admins</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 4. Participants Section */}
                    <div className={`p-4 ${isDark ? 'bg-[#111b21]' : 'bg-white'}`}>
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-xs font-medium text-[#8696a0]">
                                {members.length} participants
                            </span>
                            <div className="flex items-center gap-2">
                                {isAdmin && (
                                    <button
                                        onClick={() => setShowAddMembersModal(true)}
                                        className="text-xs text-[#00a884] flex items-center gap-1 hover:underline font-medium"
                                    >
                                        <UserPlus className="w-3.5 h-3.5" /> Add
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Search in members */}
                        <div
                            className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs mb-3 border ${
                                isDark
                                    ? 'bg-[#202c33] border-transparent text-[#e9edef]'
                                    : 'bg-[#f0f2f5] border-transparent text-[#111b21]'
                            }`}
                        >
                            <Search className="w-3.5 h-3.5 text-[#8696a0]" />
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Search participant..."
                                className="bg-transparent outline-none w-full"
                            />
                        </div>

                        {/* Invite link button for Admins */}
                        {isAdmin && (
                            <button
                                onClick={handleOpenInviteModal}
                                className={`w-full flex items-center gap-3 p-2.5 rounded-xl text-left text-xs mb-2 transition-colors ${
                                    isDark ? 'hover:bg-[#202c33]' : 'hover:bg-[#f0f2f5]'
                                }`}
                            >
                                <div className="w-9 h-9 rounded-full bg-[#00a884]/20 text-[#00a884] flex items-center justify-center">
                                    <Link className="w-4 h-4" />
                                </div>
                                <div className="min-w-0">
                                    <p className="font-semibold text-[#00a884]">
                                        Invite to group via link
                                    </p>
                                </div>
                            </button>
                        )}

                        {/* Members list */}
                        <div className="space-y-1">
                            {filteredMembers.map((m) => {
                                const memberUser = m.userId || {};
                                const mId = (memberUser._id || memberUser.id || m.userId)?.toString();
                                const isSelf = mId === currentUserId?.toString();
                                const isMemAdmin = m.role === 'admin' || m.role === 'owner';

                                return (
                                    <div
                                        key={mId}
                                        className={`group/mem relative flex items-center justify-between p-2 rounded-xl transition-colors ${
                                            isDark ? 'hover:bg-[#202c33]' : 'hover:bg-[#f0f2f5]'
                                        }`}
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="w-9 h-9 rounded-full overflow-hidden shrink-0 bg-[#00a884]/20 flex items-center justify-center font-bold text-xs text-[#00a884]">
                                                {memberUser.profilePicture ? (
                                                    <img
                                                        src={memberUser.profilePicture}
                                                        alt=""
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    (memberUser.name || memberUser.username || 'U')
                                                        .charAt(0)
                                                        .toUpperCase()
                                                )}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="font-medium text-xs leading-tight truncate">
                                                    {isSelf ? 'You' : memberUser.name || memberUser.username}
                                                </p>
                                                <p className="text-[11px] text-[#8696a0] truncate">
                                                    {memberUser.about || ''}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 shrink-0">
                                            {isMemAdmin && (
                                                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded border border-[#00a884]/40 text-[#00a884]">
                                                    {m.role === 'owner' ? 'Group Creator' : 'Group Admin'}
                                                </span>
                                            )}

                                            {/* Admin actions on other members */}
                                            {isAdmin && !isSelf && m.role !== 'owner' && (
                                                <div className="relative">
                                                    <button
                                                        onClick={() =>
                                                            setMemberActionMenu(
                                                                memberActionMenu === mId ? null : mId
                                                            )
                                                        }
                                                        className="p-1 text-[#8696a0] hover:text-[#e9edef] rounded-full"
                                                    >
                                                        <MoreVertical className="w-3.5 h-3.5" />
                                                    </button>

                                                    {memberActionMenu === mId && (
                                                        <div
                                                            className={`absolute right-0 top-6 w-44 rounded-xl shadow-2xl border py-1 z-30 ${
                                                                isDark
                                                                    ? 'bg-[#202c33] border-[#222d34] text-[#e9edef]'
                                                                    : 'bg-white border-[#e9edef] text-[#111b21]'
                                                            }`}
                                                        >
                                                            {m.role === 'member' ? (
                                                                <button
                                                                    onClick={async () => {
                                                                        await changeRole(targetGroup._id, mId, 'admin');
                                                                        setMemberActionMenu(null);
                                                                    }}
                                                                    className="w-full px-3 py-1.5 text-left text-xs hover:bg-black/10 flex items-center gap-2"
                                                                >
                                                                    <Shield className="w-3.5 h-3.5" /> Make admin
                                                                </button>
                                                            ) : (
                                                                <button
                                                                    onClick={async () => {
                                                                        await changeRole(targetGroup._id, mId, 'member');
                                                                        setMemberActionMenu(null);
                                                                    }}
                                                                    className="w-full px-3 py-1.5 text-left text-xs hover:bg-black/10 flex items-center gap-2"
                                                                >
                                                                    <Shield className="w-3.5 h-3.5" /> Dismiss as admin
                                                                </button>
                                                            )}

                                                            {isOwner && (
                                                                <button
                                                                    onClick={async () => {
                                                                        if (window.confirm('Transfer full group ownership to this member?')) {
                                                                            await transferOwnership(targetGroup._id, mId);
                                                                            setMemberActionMenu(null);
                                                                        }
                                                                    }}
                                                                    className="w-full px-3 py-1.5 text-left text-xs hover:bg-black/10 flex items-center gap-2 text-amber-500"
                                                                >
                                                                    Transfer ownership
                                                                </button>
                                                            )}

                                                            <button
                                                                onClick={async () => {
                                                                    if (window.confirm('Remove this member from group?')) {
                                                                        await removeMember(targetGroup._id, mId);
                                                                        setMemberActionMenu(null);
                                                                    }
                                                                }}
                                                                className="w-full px-3 py-1.5 text-left text-xs hover:bg-black/10 flex items-center gap-2 text-red-500"
                                                            >
                                                                <Trash2 className="w-3.5 h-3.5" /> Remove member
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* 5. Danger Zone: Exit & Delete */}
                    <div className={`p-4 space-y-2 ${isDark ? 'bg-[#111b21]' : 'bg-white'}`}>
                        <button
                            onClick={handleLeaveGroup}
                            className="w-full flex items-center gap-3 p-3 rounded-xl text-left text-xs font-semibold text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
                        >
                            <LogOut className="w-4 h-4" />
                            Exit group
                        </button>

                        {isOwner && (
                            <button
                                onClick={handleDeleteGroup}
                                className="w-full flex items-center gap-3 p-3 rounded-xl text-left text-xs font-semibold text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
                            >
                                <Trash2 className="w-4 h-4" />
                                Delete group for everyone
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Modal: Add More Members */}
            {showAddMembersModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
                    <div
                        className={`w-full max-w-sm h-[480px] flex flex-col rounded-2xl shadow-2xl overflow-hidden border ${
                            isDark
                                ? 'bg-[#111b21] border-[#222d34] text-[#e9edef]'
                                : 'bg-white border-[#e9edef] text-[#111b21]'
                        }`}
                    >
                        <div
                            className={`p-4 flex items-center justify-between border-b ${
                                isDark ? 'border-[#222d34]' : 'border-[#e9edef]'
                            }`}
                        >
                            <h3 className="font-semibold text-sm">Add participants</h3>
                            <button
                                onClick={() => {
                                    setShowAddMembersModal(false);
                                    setSelectedNewMembers([]);
                                }}
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-2">
                            {nonGroupContacts.length === 0 ? (
                                <p className="text-center py-10 text-xs text-[#8696a0]">
                                    All your contacts are already in this group
                                </p>
                            ) : (
                                nonGroupContacts.map((c) => {
                                    const cId = c._id || c.id;
                                    const isSelected = selectedNewMembers.includes(cId);
                                    return (
                                        <div
                                            key={cId}
                                            onClick={() => {
                                                if (isSelected) {
                                                    setSelectedNewMembers(
                                                        selectedNewMembers.filter((id) => id !== cId)
                                                    );
                                                } else {
                                                    setSelectedNewMembers([...selectedNewMembers, cId]);
                                                }
                                            }}
                                            className={`flex items-center justify-between p-2 rounded-lg cursor-pointer ${
                                                isDark ? 'hover:bg-[#202c33]' : 'hover:bg-[#f0f2f5]'
                                            }`}
                                        >
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-full bg-[#00a884]/20 text-[#00a884] flex items-center justify-center font-bold text-xs">
                                                    {(c.name || c.username || 'U').charAt(0).toUpperCase()}
                                                </div>
                                                <span className="text-xs font-medium">
                                                    {c.name || c.username}
                                                </span>
                                            </div>
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                readOnly
                                                className="accent-[#00a884]"
                                            />
                                        </div>
                                    );
                                })
                            )}
                        </div>
                        <div
                            className={`p-3 border-t flex justify-end gap-2 ${
                                isDark ? 'border-[#222d34]' : 'border-[#e9edef]'
                            }`}
                        >
                            <button
                                onClick={() => {
                                    setShowAddMembersModal(false);
                                    setSelectedNewMembers([]);
                                }}
                                className="px-3 py-1.5 text-xs text-[#8696a0]"
                            >
                                Cancel
                            </button>
                            <button
                                disabled={selectedNewMembers.length === 0}
                                onClick={async () => {
                                    await addMembers(targetGroup._id, selectedNewMembers);
                                    toast.success('Members added');
                                    setShowAddMembersModal(false);
                                    setSelectedNewMembers([]);
                                }}
                                className="px-4 py-1.5 text-xs rounded-full bg-[#00a884] text-white disabled:opacity-40"
                            >
                                Add ({selectedNewMembers.length})
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal: Invite Link */}
            {showInviteModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
                    <div
                        className={`w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden border p-5 ${
                            isDark
                                ? 'bg-[#111b21] border-[#222d34] text-[#e9edef]'
                                : 'bg-white border-[#e9edef] text-[#111b21]'
                        }`}
                    >
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-semibold text-sm">Group Invite Link</h3>
                            <button onClick={() => setShowInviteModal(false)}>
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <p className="text-xs text-[#8696a0] mb-3">
                            Anyone with WhatsApp can use this link to join this group. Share it only with people you trust.
                        </p>
                        <div
                            className={`flex items-center gap-2 p-2.5 rounded-lg border text-xs break-all mb-4 ${
                                isDark
                                    ? 'bg-[#202c33] border-[#222d34] text-[#00a884]'
                                    : 'bg-[#f0f2f5] border-[#e9edef] text-[#00a884]'
                            }`}
                        >
                            {isGeneratingLink ? (
                                <Loader2 className="w-4 h-4 animate-spin text-[#8696a0]" />
                            ) : (
                                <span>{inviteLink || 'Generating link...'}</span>
                            )}
                        </div>
                        <div className="flex items-center justify-between gap-2">
                            <button
                                onClick={handleResetInviteLink}
                                className="flex items-center gap-1.5 text-xs text-red-400 hover:underline"
                            >
                                <RefreshCw className="w-3.5 h-3.5" /> Reset link
                            </button>
                            <button
                                onClick={() => {
                                    navigator.clipboard.writeText(inviteLink);
                                    toast.success('Invite link copied to clipboard!');
                                }}
                                className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#00a884] text-white text-xs font-medium cursor-pointer"
                            >
                                <Copy className="w-3.5 h-3.5" /> Copy link
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GroupInfoPanel;
