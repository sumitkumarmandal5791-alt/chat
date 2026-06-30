import React, { useState } from 'react';
import { motion } from 'framer-motion';
import useLayoutStore from '../../store/layoutStore';
import useThemeStore from '../../store/themeStore';
import useuserStore from '../../store/useruserStore';
import { FaPlus, FaSearch } from 'react-icons/fa';
import formatTimestamp from "../../utils/formatTime";
import { useChatStore } from '../../store/chatStore';

const ChatList = ({ contacts }) => {
  const selectedContact = useLayoutStore(state => state.selectedContact);
  const setSelectedContact = useLayoutStore(state => state.setSelectedContact);
  const { theme } = useThemeStore();
  const { user } = useuserStore();
  const conversations = useChatStore(state => state.conversations?.data || []);
  const onlineUsers = useChatStore(state => state.onlineUsers || new Map());

  const [searchTerm, setSearchTerm] = useState('');

  const filterContact = contacts?.map(contact => {
    const storeConversation = conversations.find(c =>
      c.participants?.some(p => (p._id || p) === (contact._id || contact.id))
    );
    const isOnline = onlineUsers.get(contact._id || contact.id)?.isOnline || false;
    return {
      ...contact,
      isOnline,
      conversation: storeConversation || contact.conversation
    };
  }).filter(contact =>
    contact?.username?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const isDark = theme === 'dark';

  return (
    <div className={`w-full h-full flex flex-col transition-all duration-300 border-r ${
      isDark 
        ? "bg-slate-950 text-slate-100 border-slate-800/80" 
        : "bg-white text-slate-800 border-slate-100"
    }`}>
      
      {/* Header Section */}
      <div className={`px-5 py-4 flex justify-between items-center border-b ${
        isDark ? "bg-slate-900/40 border-slate-800/80" : "bg-slate-50/50 border-slate-100"
      }`}>
        <div>
          <h2 className={`text-xl font-bold tracking-tight ${
            isDark ? "text-slate-100" : "text-slate-800"
          }`}>
            Chats
          </h2>
          <p className={`text-xs mt-0.5 ${isDark ? "text-slate-500" : "text-slate-400"}`}>
            {filterContact?.length || 0} active conversations
          </p>
        </div>
        <button className={`p-2.5 rounded-xl transition-all duration-200 shadow-sm ${
          isDark 
            ? "bg-teal-500/10 text-teal-400 hover:bg-teal-500/20" 
            : "bg-teal-50 text-teal-600 hover:bg-teal-100/70"
        }`}>
          <FaPlus size={14} />
        </button>
      </div>

      {/* Search Bar Wrapper */}
      <div className="px-4 py-3">
        <div className={`flex items-center gap-3 px-4 py-2.5 rounded-2xl border transition-all duration-200 ${
          isDark
            ? 'bg-slate-900/60 border-slate-800/80 focus-within:border-teal-500/50 focus-within:ring-2 focus-within:ring-teal-500/10'
            : 'bg-slate-50/80 border-slate-200/60 focus-within:border-teal-400/50 focus-within:ring-2 focus-within:ring-teal-400/10'
        }`}>
          <FaSearch className={`text-sm ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
          <input
            type="text"
            placeholder="Search chats..."
            className={`bg-transparent w-full text-sm focus:outline-none placeholder-slate-400 ${
              isDark ? 'text-slate-200 placeholder-slate-600' : 'text-slate-700'
            }`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Contacts List Wrapper */}
      <div className="flex-1 overflow-y-auto px-2 space-y-1">
        {filterContact?.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className={`text-sm ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>No chats found</p>
          </div>
        ) : (
          filterContact?.map((contact, index) => {
            const isSelected = selectedContact?._id === contact?._id;
            const hasUnread = contact.conversation && 
              contact.conversation.unreadCount > 0 && 
              (contact?.conversation?.lastMessage?.receiverId?._id || contact?.conversation?.lastMessage?.receiverId) === (user?._id || user?.id) && 
              !isSelected;

            return (
              <motion.div
                key={contact?._id || contact?.id || index}
                whileTap={{ scale: 0.98 }}
                onClick={() => setSelectedContact(contact)}
                className={`p-3 rounded-2xl flex items-center cursor-pointer transition-all duration-250 ${
                  isSelected
                    ? isDark 
                      ? "bg-slate-800/80 shadow-md shadow-black/10" 
                      : "bg-teal-50/80 shadow-sm"
                    : isDark 
                      ? "hover:bg-slate-900/50" 
                      : "hover:bg-slate-50/70"
                }`}
              >
                {/* Profile Picture & Status Badge */}
                <div className="relative flex-shrink-0">
                  <img
                    src={contact?.profilePicture}
                    alt={contact?.username}
                    className={`w-12 h-12 rounded-full object-cover transition-transform duration-300 ${
                      isSelected ? "scale-105" : ""
                    } border-2 ${
                      isSelected 
                        ? isDark ? "border-teal-500/50" : "border-teal-400/50"
                        : isDark ? "border-slate-800" : "border-slate-100"
                    }`}
                  />
                  {contact.isOnline && (
                    <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 bg-emerald-400 ${
                      isDark ? "border-slate-950" : "border-white"
                    }`} />
                  )}
                </div>

                {/* Details */}
                <div className="ml-3 flex-1 min-w-0">
                  <div className="flex justify-between items-baseline mb-0.5">
                    <h3 className={`font-semibold truncate text-[14px] leading-tight ${
                      isSelected 
                        ? isDark ? "text-slate-100" : "text-teal-950"
                        : isDark ? "text-slate-200" : "text-slate-800"
                    }`}>
                      {contact?.username}
                    </h3>
                    {contact?.conversation && (
                      <span className={`text-[11px] flex-shrink-0 font-medium ${
                        isSelected 
                          ? isDark ? "text-teal-400/80" : "text-teal-600/80"
                          : isDark ? "text-slate-500" : "text-slate-400"
                      }`}>
                        {formatTimestamp(contact?.conversation?.lastMessage?.createdAt)}
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between gap-2">
                    <p className={`text-xs truncate flex-1 leading-normal ${
                      isSelected
                        ? isDark ? "text-slate-400" : "text-teal-700/85"
                        : isDark ? "text-slate-500" : "text-slate-450"
                    } ${hasUnread ? "font-semibold" : ""}`}>
                      {contact?.conversation?.lastMessage?.message || "No messages yet"}
                    </p>

                    {hasUnread && (
                      <span className="flex items-center justify-center bg-teal-500 text-white rounded-full text-[10px] font-bold w-5 h-5 min-w-[20px] shadow-sm shadow-teal-500/20">
                        {contact?.conversation?.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default ChatList;