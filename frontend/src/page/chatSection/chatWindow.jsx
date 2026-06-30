import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
     FaPaperPlane,
     FaPaperclip,
     FaTrash,
     FaArrowLeft,
     FaTimes,
     FaCheck,
     FaCheckDouble,
     FaFileVideo,
     FaLock,
     FaComment,
     FaSmile,
     FaImage,
     FaFile
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


     //Scroll to bottom on message changes
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

               //clear states
               setMessage("");
               setAttachment(null);
               setShowFileMenu(false);

          }
          catch (error) {
               console.log("error sending message", error);

          }
     }

     const renderDateSeparator = (date) => {
          if (!isValidate(date)) {
               return null;
          }

          let dateString;
          if (isToday(date)) {
               dateString = "Today"
          }
          else if (isYesterday(date)) {
               dateString = "Yesterday";
          }
          else {
               dateString = format(date, "EEEE,MMMM,d");
          }

          return (
               <div className="flex items-center justify-center my-4">
                    <span
                         className={`px-4 py-2 rounded-full text-sm ${theme === "dark" ? "bg-gray-700  text-gray-300" : "bg-gray-100 text-gray-600"}`}
                    >
                         {dateString}
                    </span>

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
          }
          else {
               console.error("Invalid date for message :", msg);
          }
          return acc;
     }, {}) : {};

     const handleReaction = (messageId, emoji) => {
          console.log(messageId, emoji)
          addReaction(messageId, emoji);
     }

     if (!selectedContact) {
          return (
               <div className={`flex items-center justify-center mx-auto h-screen text-center transition-all duration-500 ${theme === 'dark'
                    ? 'bg-slate-990 text-slate-200'
                    : 'bg-gradient-to-tr from-emerald-150 via-sky-300 to-rose-900 text-slate-800'
                    }`}>
                    <div className={`max-w-md px-6 py-12 rounded-3xl border border-dashed backdrop-blur-md shadow-2xl transition-colors duration-300 ${theme === 'dark'
                         ? 'border-green-700/50 bg-slate-900/40'
                         : 'border-green-200 bg-white/40'
                         }`}>
                         <FaComment className="text-6xl text-teal-400 mx-auto mb-6 animate-pulse" />
                         <h2 className="text-2xl font-bold tracking-tight mb-3 bg-gradient-to-r from-teal-400 to-emerald-400 bg-clip-text text-transparent">
                              Your Premium Space
                         </h2>
                         <p className={`text-bold mb-6 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-900'}`}>
                              Select a contact from the panel to start a secure, real-time conversation.
                         </p>
                         <div className={`flex items-center justify-center gap-2 px-4 py-2 rounded-full border text-xs mx-auto w-fit ${theme === 'dark' ? 'bg-slate-900/60 border-slate-800 text-slate-400' : 'bg-white border-sky-100/50 text-slate-500'
                              }`}>
                              <FaLock className="text-emerald-400" />
                              <span>End-to-End Encrypted</span>
                         </div>
                    </div>
               </div>
          )
     }


     return (
          <div className={`w-full h-full flex flex-col relative transition-colors ${isDark ? 'bg-slate-950 text-slate-100' : 'bg-white text-slate-800'
               }`}>
               {/* Header */}
               <div className={`p-4 border-b flex items-center justify-between shadow-sm z-10 ${isDark ? 'bg-green-500/90 border-slate-800 backdrop-blur-md' : 'bg-sky-50/80 border-sky-100 backdrop-blur-md'
                    }`}>
                    <div className="flex items-center gap-3 min-w-0">
                         {isMobile && (
                              <button
                                   onClick={() => setSelectedContact(null)}
                                   className={`p-2 rounded-full hover:bg-slate-800/10 transition-colors ${isDark ? 'text-slate-300' : 'text-slate-600'}`}
                              >
                                   <FaArrowLeft />
                              </button>
                         )}

                         <div className="relative flex-shrink-0">
                              <img
                                   src={selectedContact.profilePicture}
                                   alt={selectedContact.username}
                                   className="w-10 h-10 rounded-full object-cover ring-2 ring-teal-400/50"
                              />
                              {isOnline && (
                                   <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-400 border-2 border-slate-900 rounded-full shadow-sm animate-pulse" />
                              )}
                         </div>

                         <div className="min-w-0">
                              <h3 className="font-bold truncate text-sm md:text-base  text-red-500">{selectedContact.username}</h3>
                              <div className="text-xs truncate flex items-center gap-1">
                                   {isTyping ? (
                                        <span className="text-emerald-400 font-semibold tracking-wide animate-pulse">typing...</span>
                                   ) : isOnline ? (
                                        <span className="text-emerald-400/80 font-medium">online</span>
                                   ) : lastSeen ? (
                                        <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>
                                             last seen {formatTimestamp(lastSeen)}
                                        </span>
                                   ) : (
                                        <span className={isDark ? 'text-slate-500' : 'text-slate-400'}>offline</span>
                                   )}
                              </div>
                         </div>
                    </div>
               </div>

               <div className={`flex-1 p-4 overflow-y-auto ${theme === 'dark' ? "bg-[#191a1a]" : "bg-[rgb(241,236,229)]"}`}>
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
                    <div ref={messageEndref} />
                    {filePreview && (
                         <div className='relative p-2'>
                              <img
                                   src={filePreview}
                                   alt="file-preview"
                                   className='w-80 object-cover rounded-xl shadow-lg'
                              />
                              <button
                                   onClick={() => {
                                        setAttachment(null);
                                        setFilePreview(null);
                                   }}

                                   className='absolute top-2 right-2 bg-white/20 backdrop-blur-md text-white hover:bg-white rounded-full p-1'
                              >
                                   <FaTimes className='h-4 w-4' />
                              </button>

                         </div>

                    )}

               </div>

               {/* Input Footer */}
               <div className={`p-4 border-t relative z-25 ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-sky-200'}`}>
                    {showEmoji && (
                         <div ref={emojiPickerRef} className="absolute bottom-20 left-4 z-50">
                              <Picker
                                   onEmojiClick={(emojiData) => {
                                        setMessage((prev) => (prev || '') + emojiData.emoji);
                                        setShowEmoji(false);
                                   }}
                                   theme={isDark ? "dark" : "light"}
                              />
                         </div>
                    )}
                    <div className="flex items-center gap-3">
                         {/* Attachment Button & Menu */}
                         <div className="relative">
                              <button
                                   onClick={() => setShowFileMenu(!showFileMenu)}
                                   className={`p-2 rounded-full transition-colors ${isDark ? 'text-slate-400 hover:bg-slate-800' : 'text-slate-500 hover:bg-slate-100'}`}
                              >
                                   <FaPaperclip className="h-5 w-5" />
                              </button>

                              {showFileMenu && (
                                   <div className={`absolute bottom-full left-0 mb-2 p-1 rounded-lg shadow-lg min-w-[140px] z-50 ${isDark ? "bg-slate-800 border border-slate-700" : "bg-white border border-slate-200"}`}>
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
                                             onClick={() => fileInputRef.current?.click()}
                                             className={`flex items-center px-4 py-2 w-full text-sm rounded transition-colors ${isDark ? "hover:bg-slate-700 text-slate-200" : "hover:bg-slate-100 text-slate-700"}`}
                                        >
                                             <FaImage className="mr-2" /> Image/video
                                        </button>
                                        <button
                                             onClick={() => fileInputRef.current?.click()}
                                             className={`flex items-center px-4 py-2 w-full text-sm rounded transition-colors ${isDark ? "hover:bg-slate-700 text-slate-200" : "hover:bg-slate-100 text-slate-700"}`}
                                        >
                                             <FaFile className="mr-2" /> Document
                                        </button>
                                   </div>
                              )}
                         </div>

                         {/* Emoji Button */}
                         <button
                              onClick={() => setShowEmoji(!showEmoji)}
                              className={`p-2 rounded-full transition-colors ${isDark ? 'text-slate-400 hover:bg-slate-800' : 'text-slate-500 hover:bg-slate-100'}`}
                         >
                              <FaSmile className="h-5 w-5" />
                         </button>

                         {/* Text Input */}
                         <input
                              type="text"
                              value={message}
                              onChange={(e) => setMessage(e.target.value)}
                              onKeyDown={(e) => {
                                   if (e.key === 'Enter') {
                                        handleSendMessage();
                                   }
                              }}
                              placeholder="Type a message..."
                              className={`flex-1 px-4 py-2.5 rounded-full border focus:outline-none transition-all ${isDark ? 'bg-slate-950 border-slate-800 focus:border-teal-500 text-slate-100' : 'bg-slate-50 border-slate-200 focus:border-teal-500 text-slate-800'}`}
                         />

                         {/* Send Button */}
                         <button
                              onClick={handleSendMessage}
                              disabled={!message.trim() && !attachment}
                              className={`p-3 rounded-full transition-all ${(!message.trim() && !attachment) ? 'bg-slate-300 text-slate-500 cursor-not-allowed' : 'bg-teal-500 text-white hover:bg-teal-600 shadow-md'}`}
                         >
                              <FaPaperPlane className="h-4 w-4" />
                         </button>
                    </div>
               </div>
          </div>
     );
};

export default ChatWindow;
