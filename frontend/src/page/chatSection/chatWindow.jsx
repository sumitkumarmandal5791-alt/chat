import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
     FaPaperPlane,
     FaPaperclip,
     FaArrowLeft,
     FaTimes,
     FaLock,
     FaComment,
     FaSmile,
     FaImage,
     FaFile,
     FaVideo,
} from 'react-icons/fa';
import { useChatStore } from '../../store/chatStore';
import useuserStore from '../../store/useruserStore';
import useThemeStore from '../../store/themeStore';
import formatTimestamp from '../../utils/formatTime';
import { isToday, isYesterday, format } from "date-fns";
import MessageBubble from './messageBubble';
import Picker from 'emoji-picker-react';

const isValidate = (date) => {
     return date instanceof Date && !isNaN(date);
}

/* ── Animated Typing Indicator ──────────────────────────── */
const TypingIndicator = ({ isDark }) => (
     <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          className="flex items-center gap-2 px-4 py-2"
     >
          <div className={`flex items-center gap-1.5 px-4 py-2.5 rounded-2xl rounded-tl-none shadow-sm ${isDark ? 'bg-slate-800/90' : 'bg-white'}`}>
               {[0, 1, 2].map((i) => (
                    <motion.span
                         key={i}
                         className={`block w-2.5 h-2.5 rounded-full ${isDark ? 'bg-teal-400' : 'bg-teal-500'}`}
                         animate={{ y: [0, -5, 0] }}
                         transition={{
                              duration: 0.6,
                              repeat: Infinity,
                              delay: i * 0.15,
                              ease: "easeInOut",
                         }}
                    />
               ))}
          </div>
     </motion.div>
);

const ChatWindow = ({ selectedContact, setSelectedContact, isMobile }) => {
     const [message, setMessage] = useState("");
     const [showEmoji, setShowEmoji] = useState(false);
     const [showFileMenu, setShowFileMenu] = useState(false);
     const [filePreview, setFilePreview] = useState(null);
     const [attachment, setAttachment] = useState(null);
     const { theme } = useThemeStore();
     const isDark = theme === 'dark';
     const { user: currentUser } = useuserStore();

     const typingTimeoutRef = useRef(null);
     const messageEndref = useRef(null);
     const fileInputRef = useRef(null);
     const emojiPickerRef = useRef(null);
     const fileMenuRef = useRef(null);

     const {
          messages,
          conversations,
          currentConversation,
          fetchMessages,
          sendMessage,
          deleteMessage,
          addReaction,
          startTyping,
          endTyping,
          isUserTyping,
          isUserOnline,
          getUserLastSeen,
          markMessageAsRead,
          cleanUp
     } = useChatStore();

     const isOnline = selectedContact ? isUserOnline(selectedContact._id) : false;
     const lastSeen = selectedContact ? getUserLastSeen(selectedContact._id) : null;
     const isTyping = selectedContact ? isUserTyping(selectedContact._id) : false;

     useEffect(() => {
          if (selectedContact?._id) {
               const conversation = conversations?.data?.find((c) =>
                    c?.participants?.some((p) => p === selectedContact._id || p?._id === selectedContact._id)
               );
               if (conversation?._id) {
                    if (currentConversation?._id !== conversation._id) {
                         fetchMessages(conversation);
                    }
               } else {
                    useChatStore.setState({ messages: [], currentConversation: null });
               }
          } else {
               useChatStore.setState({ messages: [], currentConversation: null });
          }
     }, [selectedContact, conversations, currentConversation, fetchMessages]);

     // Scroll to bottom on message changes and typing status changes
     useEffect(() => {
          messageEndref.current?.scrollIntoView({ behavior: 'smooth' });
     }, [messages, isTyping]);

     // Mark messages as read when viewing the conversation
     useEffect(() => {
          if (messages.length > 0 && currentConversation?._id && selectedContact?._id) {
               markMessageAsRead();
          }
     }, [messages, currentConversation, selectedContact, markMessageAsRead]);

     useEffect(() => {
          if (message && selectedContact?._id) {
               startTyping(selectedContact?._id);

               if (typingTimeoutRef.current) {
                    clearTimeout(typingTimeoutRef.current)
               }

               typingTimeoutRef.current = setTimeout(() => {
                    endTyping(selectedContact?._id);
               }, 2000)

               return () => {
                    if (typingTimeoutRef.current) {
                         clearTimeout(typingTimeoutRef.current);
                         endTyping(selectedContact?._id);
                    }
               }
          }
     }, [message, selectedContact, startTyping, endTyping])

     // Close drop-downs on clicking outside
     useEffect(() => {
          const handleClickOutside = (e) => {
               if (fileMenuRef.current && !fileMenuRef.current.contains(e.target)) {
                    setShowFileMenu(false);
               }
               if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target)) {
                    setShowEmoji(false);
               }
          };
          document.addEventListener('mousedown', handleClickOutside);
          return () => document.removeEventListener('mousedown', handleClickOutside);
     }, []);

     const handleFileChange = (e) => {
          const file = e.target.files?.[0];
          if (file) {
               setAttachment(file);
               setShowFileMenu(false);
               if (file.type.startsWith("image")) {
                    setFilePreview(URL.createObjectURL(file));
               }
          }
     }

     const handleSendMessage = async () => {
          if (!selectedContact) return;
          setFilePreview(null);

          try {
               const formData = new FormData();
               formData.append("senderId", currentUser?._id);
               formData.append("receiverId", selectedContact?._id);
               formData.append("message", message);
               formData.append("contentType", attachment ? "file" : "text");

               const status = isOnline ? "delivered" : "sent";
               formData.append("messageStatus", status);

               if (message.trim()) {
                    formData.append("content", message.trim());
               }
               if (attachment) {
                    formData.append("media", attachment);
               }

               if (!message.trim() && !attachment) return;

               await sendMessage(formData);

               setMessage("");
               setAttachment(null);
               setShowFileMenu(false);
          }
          catch (error) {
               console.error("error sending message", error);
          }
     }

     const renderDateSeparator = (date) => {
          if (!isValidate(date)) return null;

          let dateString;
          if (isToday(date)) {
               dateString = "Today"
          } else if (isYesterday(date)) {
               dateString = "Yesterday";
          } else {
               dateString = format(date, "EEEE, MMMM d");
          }

          return (
               <div className="flex items-center justify-center my-6 px-8 select-none">
                    <div className={`flex-1 h-[1px] ${isDark ? 'bg-slate-800/60' : 'bg-slate-200/60'}`} />
                    <span className={`px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide mx-3 shadow-sm
                         ${isDark
                              ? 'bg-slate-900 text-slate-400 border border-slate-800/80'
                              : 'bg-white text-slate-500 border border-slate-100'
                         }`}
                    >
                         {dateString}
                    </span>
                    <div className={`flex-1 h-[1px] ${isDark ? 'bg-slate-800/60' : 'bg-slate-200/60'}`} />
               </div>
          )
     }

     const groupedMessages = Array.isArray(messages) ? messages.reduce((acc, msg) => {
          const date = new Date(msg.createdAt);
          if (isValidate(date)) {
               const dateString = format(date, "yyyy-MM-dd");
               if (!acc[dateString]) {
                    acc[dateString] = [];
               }
               acc[dateString].push(msg);
          } else {
               console.error("Invalid date for message:", msg);
          }
          return acc;
     }, {}) : {};

     const handleReaction = (messageId, emoji) => {
          addReaction(messageId, emoji);
     }

     /* ── Empty State ────────────────────────────────── */
     if (!selectedContact) {
          return (
               <div className={`flex items-center justify-center h-full w-full transition-all duration-300 relative overflow-hidden
                    ${isDark
                         ? 'bg-slate-950'
                         : 'bg-gradient-to-br from-slate-50 via-teal-50/20 to-emerald-50/20'
                    }`}
               >
                    {/* Decorative backdrop shapes */}
                    <div className={`absolute top-1/4 left-1/4 w-80 h-80 rounded-full blur-3xl opacity-10 pointer-events-none ${isDark ? 'bg-teal-500' : 'bg-teal-300'}`} />
                    <div className={`absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full blur-3xl opacity-10 pointer-events-none ${isDark ? 'bg-emerald-500' : 'bg-emerald-300'}`} />

                    <motion.div
                         initial={{ opacity: 0, scale: 0.95 }}
                         animate={{ opacity: 1, scale: 1 }}
                         transition={{ duration: 0.4 }}
                         className={`max-w-md px-8 py-14 rounded-3xl text-center relative z-10 mx-4
                              ${isDark
                                   ? 'bg-slate-900/60 border border-slate-800/80 shadow-2xl backdrop-blur-xl'
                                   : 'bg-white/70 border border-white/80 shadow-xl backdrop-blur-xl'
                              }`}
                    >
                         <div className={`w-20 h-20 mx-auto mb-6 rounded-2xl flex items-center justify-center
                              ${isDark ? 'bg-teal-500/10 text-teal-400' : 'bg-teal-50 text-teal-500'}`}
                         >
                              <FaComment size={32} />
                         </div>
                         <h2 className={`text-2xl font-bold tracking-tight mb-2.5 ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>
                              Your Premium Chat Space
                         </h2>
                         <p className={`text-sm mb-8 leading-relaxed max-w-xs mx-auto ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                              Select a contact to view your history and start real-time messaging.
                         </p>
                         <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold
                              ${isDark
                                   ? 'bg-slate-800/80 text-slate-400 border border-slate-700/50'
                                   : 'bg-slate-50 text-slate-500 border border-slate-200'
                              }`}
                         >
                              <FaLock className="text-emerald-500" size={10} />
                              <span>End-to-End Encrypted</span>
                         </div>
                    </motion.div>
               </div>
          )
     }

     /* ── Active Chat Window ─────────────────────────── */
     return (
          <div className={`w-full h-full flex flex-col relative transition-all duration-300
               ${isDark ? 'bg-slate-950 text-slate-100' : 'bg-white text-slate-800'}`}
          >
               {/* Header */}
               <div className={`px-5 py-3 md:px-6 border-b flex items-center justify-between z-10 backdrop-blur-md
                    ${isDark
                         ? 'bg-slate-900/90 border-slate-800/80'
                         : 'bg-white/90 border-slate-100'
                    }`}
               >
                    <div className="flex items-center gap-3.5 min-w-0">
                         {isMobile && (
                              <button
                                   onClick={() => setSelectedContact(null)}
                                   className={`p-2 rounded-xl transition-all
                                        ${isDark ? 'text-slate-400 hover:bg-slate-800 hover:text-slate-200' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'}`}
                              >
                                   <FaArrowLeft size={16} />
                              </button>
                         )}

                         <div className="relative flex-shrink-0">
                              <img
                                   src={selectedContact.profilePicture}
                                   alt={selectedContact.username}
                                   className={`w-11 h-11 rounded-full object-cover ring-2 transition-all
                                        ${isOnline
                                             ? 'ring-emerald-400/80'
                                             : isDark ? 'ring-slate-700' : 'ring-slate-200'
                                        }`}
                              />
                              {isOnline && (
                                   <span className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 shadow-sm bg-emerald-400
                                        ${isDark ? 'border-slate-900' : 'border-white'}`}
                                   />
                              )}
                         </div>

                         <div className="min-w-0">
                              <h3 className={`font-bold truncate text-[15px] leading-tight
                                   ${isDark ? 'text-slate-100' : 'text-slate-800'}`}
                              >
                                   {selectedContact.username}
                              </h3>
                              <div className="text-[11px] truncate mt-0.5 font-medium">
                                   <AnimatePresence mode="wait">
                                        {isTyping ? (
                                             <motion.span
                                                  key="typing"
                                                  initial={{ opacity: 0 }}
                                                  animate={{ opacity: 1 }}
                                                  exit={{ opacity: 0 }}
                                                  className="text-emerald-500"
                                             >
                                                  typing...
                                             </motion.span>
                                        ) : isOnline ? (
                                             <motion.span
                                                  key="online"
                                                  initial={{ opacity: 0 }}
                                                  animate={{ opacity: 1 }}
                                                  exit={{ opacity: 0 }}
                                                  className="text-emerald-500"
                                             >
                                                  online
                                             </motion.span>
                                        ) : lastSeen ? (
                                             <motion.span
                                                  key="lastseen"
                                                  initial={{ opacity: 0 }}
                                                  animate={{ opacity: 1 }}
                                                  exit={{ opacity: 0 }}
                                                  className={isDark ? 'text-slate-500' : 'text-slate-400'}
                                             >
                                                  last seen {formatTimestamp(lastSeen)}
                                             </motion.span>
                                        ) : (
                                             <motion.span
                                                  key="offline"
                                                  initial={{ opacity: 0 }}
                                                  animate={{ opacity: 1 }}
                                                  exit={{ opacity: 0 }}
                                                  className={isDark ? 'text-slate-500' : 'text-slate-400'}
                                             >
                                                  offline
                                             </motion.span>
                                        )}
                                   </AnimatePresence>
                              </div>
                         </div>
                    </div>
               </div>

               {/* Messages Area */}
               <div
                    className={`flex-1 overflow-y-auto px-4 md:px-6 py-4 scroll-smooth
                         ${isDark ? 'bg-[#0b0e11]' : 'bg-[#f4f2ee]'}`}
                    style={{
                         backgroundImage: isDark
                              ? 'radial-gradient(circle at 10% 10%, rgba(20, 184, 166, 0.025) 0%, transparent 40%), radial-gradient(circle at 90% 90%, rgba(16, 185, 129, 0.02) 0%, transparent 40%)'
                              : 'radial-gradient(circle at 10% 10%, rgba(20, 184, 166, 0.04) 0%, transparent 45%), radial-gradient(circle at 90% 90%, rgba(16, 185, 129, 0.035) 0%, transparent 45%)',
                    }}
               >
                    {Object.entries(groupedMessages).map(([date, msgs]) => (
                         <React.Fragment key={date}>
                              {renderDateSeparator(new Date(date))}
                              {msgs.map((msg, idx) => (
                                   <MessageBubble
                                        key={msg._id || msg.tempId || msg.createdAt || `msg-${idx}`}
                                        message={msg}
                                        theme={theme}
                                        currentUser={currentUser}
                                        onReact={handleReaction}
                                        deleteMessage={deleteMessage}
                                   />
                              ))}
                         </React.Fragment>
                    ))}

                    <AnimatePresence>
                         {isTyping && <TypingIndicator isDark={isDark} />}
                    </AnimatePresence>

                    <div ref={messageEndref} />

                    {/* File Preview */}
                    <AnimatePresence>
                         {filePreview && (
                              <motion.div
                                   initial={{ opacity: 0, y: 15, scale: 0.96 }}
                                   animate={{ opacity: 1, y: 0, scale: 1 }}
                                   exit={{ opacity: 0, y: 15, scale: 0.96 }}
                                   className="relative p-2 mt-4 max-w-[280px]"
                              >
                                   <div className={`rounded-2xl overflow-hidden shadow-lg border ${
                                        isDark ? 'border-slate-800' : 'border-slate-200'
                                   }`}>
                                        <img
                                             src={filePreview}
                                             alt="file-preview"
                                             className="w-full object-cover"
                                        />
                                   </div>
                                   <button
                                        onClick={() => {
                                             setAttachment(null);
                                             setFilePreview(null);
                                        }}
                                        className="absolute -top-1 -right-1 bg-black/60 hover:bg-black text-white rounded-full p-1.5 transition-colors shadow-md backdrop-blur-sm"
                                   >
                                        <FaTimes size={10} />
                                   </button>
                              </motion.div>
                         )}
                    </AnimatePresence>
               </div>

               {/* Input Footer */}
               <div className={`px-4 py-3 border-t relative z-25
                    ${isDark
                         ? 'bg-slate-900/95 border-slate-800/80 backdrop-blur-md'
                         : 'bg-white/95 border-slate-100 backdrop-blur-md'
                    }`}
               >
                    {/* Emoji Picker */}
                    <AnimatePresence>
                         {showEmoji && (
                              <motion.div
                                   ref={emojiPickerRef}
                                   initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                   animate={{ opacity: 1, y: 0, scale: 1 }}
                                   exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                   className="absolute bottom-full left-4 mb-3 z-50 shadow-xl"
                              >
                                   <Picker
                                        onEmojiClick={(emojiData) => {
                                             setMessage((prev) => (prev || '') + emojiData.emoji);
                                             setShowEmoji(false);
                                        }}
                                        theme={isDark ? "dark" : "light"}
                                   />
                              </motion.div>
                         )}
                    </AnimatePresence>

                    {/* Attachment description bar */}
                    <AnimatePresence>
                         {attachment && !filePreview && (
                              <motion.div
                                   initial={{ opacity: 0, height: 0 }}
                                   animate={{ opacity: 1, height: 'auto' }}
                                   exit={{ opacity: 0, height: 0 }}
                                   className={`mb-2.5 px-3.5 py-2.5 rounded-2xl flex items-center gap-2.5 text-xs font-semibold
                                        ${isDark ? 'bg-slate-800/80 text-slate-300' : 'bg-slate-50 text-slate-600'}`}
                              >
                                   {attachment.type?.startsWith('video') ? (
                                        <FaVideo className="text-teal-500" />
                                   ) : (
                                        <FaFile className="text-teal-500" />
                                   )}
                                   <span className="truncate flex-1">{attachment.name}</span>
                                   <button
                                        onClick={() => setAttachment(null)}
                                        className="text-slate-400 hover:text-red-500 transition-colors"
                                   >
                                        <FaTimes size={12} />
                                   </button>
                              </motion.div>
                         )}
                    </AnimatePresence>

                    <div className="flex items-center gap-3">
                         {/* Attachment Actions */}
                         <div className="relative" ref={fileMenuRef}>
                              <button
                                   onClick={() => setShowFileMenu(!showFileMenu)}
                                   className={`p-2.5 rounded-xl transition-all duration-200
                                        ${showFileMenu
                                             ? isDark ? 'bg-teal-500/15 text-teal-400' : 'bg-teal-50 text-teal-600'
                                             : isDark ? 'text-slate-400 hover:bg-slate-800 hover:text-slate-200' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'
                                        }`}
                              >
                                   <FaPaperclip size={16} />
                              </button>

                              <AnimatePresence>
                                   {showFileMenu && (
                                        <motion.div
                                             initial={{ opacity: 0, y: 8, scale: 0.95 }}
                                             animate={{ opacity: 1, y: 0, scale: 1 }}
                                             exit={{ opacity: 0, y: 8, scale: 0.95 }}
                                             transition={{ duration: 0.12 }}
                                             className={`absolute bottom-full left-0 mb-2 py-1.5 rounded-2xl shadow-xl min-w-[170px] z-50 border
                                                  ${isDark
                                                       ? 'bg-slate-800 border-slate-700/80 shadow-black/40'
                                                       : 'bg-white border-slate-200 shadow-slate-200/50'
                                                  }`}
                                        >
                                             <input
                                                  type="file"
                                                  ref={fileInputRef}
                                                  onChange={(e) => {
                                                       handleFileChange(e);
                                                       setShowFileMenu(false);
                                                  }}
                                                  className="hidden"
                                                  accept="image/*,video/*"
                                             />
                                             <button
                                                  onClick={() => { fileInputRef.current?.click(); }}
                                                  className={`flex items-center gap-3 px-4 py-2.5 w-full text-sm font-medium rounded-xl transition-colors
                                                       ${isDark ? 'hover:bg-slate-700/70 text-slate-200' : 'hover:bg-slate-50 text-slate-700'}`}
                                             >
                                                  <FaImage className="text-violet-400" /> Image
                                             </button>
                                             <button
                                                  onClick={() => { fileInputRef.current?.click(); }}
                                                  className={`flex items-center gap-3 px-4 py-2.5 w-full text-sm font-medium rounded-xl transition-colors
                                                       ${isDark ? 'hover:bg-slate-700/70 text-slate-200' : 'hover:bg-slate-50 text-slate-700'}`}
                                             >
                                                  <FaVideo className="text-rose-400" /> Video
                                             </button>
                                             <button
                                                  onClick={() => { fileInputRef.current?.click(); }}
                                                  className={`flex items-center gap-3 px-4 py-2.5 w-full text-sm font-medium rounded-xl transition-colors
                                                       ${isDark ? 'hover:bg-slate-700/70 text-slate-200' : 'hover:bg-slate-50 text-slate-700'}`}
                                             >
                                                  <FaFile className="text-amber-400" /> Document
                                             </button>
                                        </motion.div>
                                   )}
                              </AnimatePresence>
                         </div>

                         {/* Emoji action */}
                         <button
                              onClick={() => setShowEmoji(!showEmoji)}
                              className={`p-2.5 rounded-xl transition-all duration-200
                                   ${showEmoji
                                        ? isDark ? 'bg-teal-500/15 text-teal-400' : 'bg-teal-50 text-teal-600'
                                        : isDark ? 'text-slate-400 hover:bg-slate-800 hover:text-slate-200' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'
                                   }`}
                         >
                              <FaSmile size={16} />
                         </button>

                         {/* Input Box */}
                         <input
                              type="text"
                              value={message}
                              onChange={(e) => setMessage(e.target.value)}
                              onKeyDown={(e) => {
                                   if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleSendMessage();
                                   }
                              }}
                              placeholder="Type a message..."
                              className={`flex-1 px-5 py-3 rounded-2xl border text-sm focus:outline-none transition-all duration-250
                                   ${isDark
                                        ? 'bg-slate-800/70 border-slate-700/60 focus:border-teal-500/50 focus:bg-slate-800 text-slate-100 placeholder:text-slate-500'
                                        : 'bg-slate-50 border-slate-200/80 focus:border-teal-400/50 focus:bg-white text-slate-800 placeholder:text-slate-400'
                                   }`}
                         />

                         {/* Send Action */}
                         <motion.button
                              whileTap={{ scale: 0.95 }}
                              onClick={handleSendMessage}
                              disabled={!message.trim() && !attachment}
                              className={`p-3 rounded-2xl transition-all duration-250
                                   ${(!message.trim() && !attachment)
                                        ? isDark
                                             ? 'bg-slate-800 text-slate-600 cursor-not-allowed'
                                             : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                        : 'bg-gradient-to-r from-teal-500 to-emerald-500 text-white shadow-md shadow-teal-500/20 hover:brightness-105'
                                   }`}
                         >
                              <FaPaperPlane size={14} />
                         </motion.button>
                    </div>
               </div>
          </div>
     );
};

export default ChatWindow;
