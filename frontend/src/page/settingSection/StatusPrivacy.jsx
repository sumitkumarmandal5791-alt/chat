import React, { useState, useEffect } from 'react';
import { ArrowLeft, Shield, Check, Search, Loader2 } from 'lucide-react';
import useuserStore from '../../store/useruserStore';
import useThemeStore from '../../store/themeStore';
import { getAllUsers } from '../../services/user.services';
import { updateStatusPrivacyApi } from '../../services/statusService';
import { toast } from 'react-toastify';

const StatusPrivacy = ({ onBack }) => {
    const { user, setUser } = useuserStore();
    const { theme } = useThemeStore();
    const isDark = theme === 'dark';

    const currentPrivacy = user?.statusPrivacy || { mode: 'contacts', userIds: [] };
    const [mode, setMode] = useState(currentPrivacy.mode || 'contacts');
    const [selectedUserIds, setSelectedUserIds] = useState(
        (currentPrivacy.userIds || []).map((id) => (id?._id || id).toString())
    );
    const [contacts, setContacts] = useState([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const fetchContacts = async () => {
            setLoading(true);
            try {
                const res = await getAllUsers();
                if (res?.users) {
                    setContacts(res.users);
                }
            } catch (err) {
                console.error('Error fetching contacts:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchContacts();
    }, []);

    const handleSave = async () => {
        setSaving(true);
        try {
            const res = await updateStatusPrivacyApi({
                mode,
                userIds: selectedUserIds
            });
            if (res.success) {
                if (setUser) {
                    setUser({
                        ...user,
                        statusPrivacy: res.data
                    });
                }
                toast.success('Status privacy updated. Changes apply to future status updates.');
                if (onBack) onBack();
            }
        } catch (err) {
            console.error('Error updating privacy:', err);
            toast.error(err.response?.data?.message || 'Failed to update privacy settings');
        } finally {
            setSaving(false);
        }
    };

    const toggleContact = (userId) => {
        setSelectedUserIds((prev) =>
            prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
        );
    };

    const filteredContacts = contacts.filter((c) =>
        (c.username || c.name || '').toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div
            className={`w-full h-full flex flex-col select-none transition-colors duration-150 ${
                isDark ? 'bg-[#111b21] text-[#e9edef]' : 'bg-[#f0f2f5] text-[#111b21]'
            }`}
        >
            {/* Header */}
            <div
                className={`h-24 px-6 pb-4 flex items-end shrink-0 ${
                    isDark ? 'bg-[#202c33]' : 'bg-[#008069]'
                } text-white`}
            >
                <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-6">
                        <button
                            onClick={onBack}
                            aria-label="Back"
                            className="p-1 rounded-full hover:bg-black/10 transition-colors"
                        >
                            <ArrowLeft size={20} />
                        </button>
                        <h1 className="text-lg font-medium tracking-tight">Status Privacy</h1>
                    </div>

                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-white text-[#008069] font-semibold text-xs shadow-sm hover:bg-slate-100 transition-colors disabled:opacity-50"
                    >
                        {saving ? <Loader2 className="animate-spin" size={14} /> : <Check size={14} />}
                        <span>Save</span>
                    </button>
                </div>
            </div>

            {/* Note banner */}
            <div className="p-4 mx-6 mt-4 rounded-lg bg-[#00a884]/10 border border-[#00a884]/20 text-[#00a884] text-xs leading-relaxed flex items-center gap-3">
                <Shield size={18} className="shrink-0" />
                <span>Changes to your privacy settings apply only to <strong>future status updates</strong> and will not affect updates you have already shared.</span>
            </div>

            {/* Privacy Mode Radios */}
            <div className="p-6 space-y-2.5 max-w-xl mx-auto w-full">
                <p className="text-xs font-semibold uppercase tracking-wider text-[#8696a0] mb-1">
                    Who can see my status updates
                </p>

                {[
                    { id: 'contacts', title: 'My contacts', desc: 'Share with all your contacts' },
                    {
                        id: 'contacts_except',
                        title: 'My contacts except...',
                        desc:
                            mode === 'contacts_except'
                                ? `${selectedUserIds.length} contact(s) excluded`
                                : 'Hide status from selected contacts'
                    },
                    {
                        id: 'only_share',
                        title: 'Only share with...',
                        desc:
                            mode === 'only_share'
                                ? `${selectedUserIds.length} contact(s) selected`
                                : 'Share only with selected contacts'
                    }
                ].map((item) => (
                    <label
                        key={item.id}
                        onClick={() => setMode(item.id)}
                        className={`flex items-center justify-between p-3.5 rounded-lg border cursor-pointer transition-colors ${
                            mode === item.id
                                ? isDark
                                    ? 'bg-[#202c33] border-[#00a884]'
                                    : 'bg-white border-[#00a884]'
                                : isDark
                                ? 'bg-[#202c33] border-[#222d34] hover:bg-[#2a3942]'
                                : 'bg-white border-[#e9edef] hover:bg-[#f5f6f6]'
                        }`}
                    >
                        <div>
                            <p className="font-medium text-sm text-inherit">{item.title}</p>
                            <p className="text-xs text-[#8696a0] mt-0.5">{item.desc}</p>
                        </div>
                        <input
                            type="radio"
                            name="privacyMode"
                            checked={mode === item.id}
                            onChange={() => setMode(item.id)}
                            className="radio radio-primary radio-sm"
                        />
                    </label>
                ))}
            </div>

            {/* Contact Multi-Select Picker */}
            {mode !== 'contacts' && (
                <div className="flex-1 flex flex-col px-6 pb-6 max-w-xl mx-auto w-full overflow-hidden">
                    <div
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg border mb-3 ${
                            isDark ? 'bg-[#202c33] border-[#222d34]' : 'bg-white border-[#e9edef]'
                        }`}
                    >
                        <Search size={14} className="text-[#8696a0]" />
                        <input
                            type="text"
                            placeholder="Search contacts..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="bg-transparent flex-1 text-sm outline-none text-inherit placeholder-[#8696a0]"
                        />
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1 pr-1">
                        {loading ? (
                            <div className="py-8 text-center text-[#8696a0]">
                                <Loader2 className="animate-spin mx-auto mb-2 text-[#00a884]" size={20} />
                                <p className="text-xs">Loading contacts...</p>
                            </div>
                        ) : filteredContacts.length === 0 ? (
                            <p className="text-xs text-center text-[#8696a0] py-6">No contacts found</p>
                        ) : (
                            filteredContacts.map((contact) => {
                                const cId = (contact._id || contact.id).toString();
                                const isSelected = selectedUserIds.includes(cId);

                                return (
                                    <div
                                        key={cId}
                                        onClick={() => toggleContact(cId)}
                                        className={`flex items-center justify-between p-2.5 rounded-lg cursor-pointer transition-colors ${
                                            isSelected
                                                ? isDark ? 'bg-[#2a3942]' : 'bg-[#e7fce3]'
                                                : isDark ? 'hover:bg-[#202c33]' : 'hover:bg-[#f5f6f6]'
                                        }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <img
                                                src={contact.profilePicture || 'https://via.placeholder.com/40'}
                                                alt={contact.username}
                                                className="w-9 h-9 rounded-full object-cover"
                                            />
                                            <div>
                                                <p className="text-sm font-medium text-inherit">{contact.username || contact.name}</p>
                                                <p className="text-xs text-[#8696a0]">{contact.about || 'Available'}</p>
                                            </div>
                                        </div>

                                        <input
                                            type="checkbox"
                                            checked={isSelected}
                                            onChange={() => {}}
                                            className="checkbox checkbox-sm checkbox-primary"
                                        />
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default StatusPrivacy;
