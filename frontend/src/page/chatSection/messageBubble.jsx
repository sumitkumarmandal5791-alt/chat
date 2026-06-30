import React, { useRef, useState } from 'react';
import { FaCheck, FaCheckDouble, FaPlus, FaSmile } from 'react-icons/fa';
import { format } from 'date-fns';
import { HiDotsVertical } from "react-icons/hi";
import useOutside from "../../hooks/useOutside";
import Picker from 'emoji-picker-react';
import { RxCross2 } from 'react-icons/rx';

const MessageBubble = ({ message, theme, onReact, currentUser, deleteMessage }) => {
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [showReactions, setShowReactions] = useState(false);
    const messageRef = useRef(null);
    const [showOptions, setShowOptions] = useState(false);
    const optionRef = useRef(null);

    const emojiPickerRef = useRef(null);
    const reactionsMenuRef = useRef(null);

    // Check if the current user sent this message
    const senderId = message?.senderId?._id || message?.senderId || message?.sender?._id || message?.sender;
    const currentUserId = currentUser?._id || currentUser?.id;
    const isUserMessage = senderId === currentUserId;

    const bubbleClass = isUserMessage ? 'chat-end' : `chat-start`;

    // Content container styles based on sender vs receiver
    const bubbleContentClass = isUserMessage
        ? `chat-bubble md:max-w-[50%] min-w-[130px] p-3 rounded-2xl rounded-tr-none shadow-sm ${theme === 'dark' ? "bg-[#144d38] text-white" : "bg-emerald-100 text-slate-800"}`
        : `chat-bubble md:max-w-[50%] min-w-[130px] p-3 rounded-2xl rounded-tl-none shadow-sm ${theme === 'dark' ? "bg-slate-800 text-slate-100" : "bg-white border border-slate-100 text-slate-800"}`;

    const quickReactions = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

    const handleReact = (emoji) => {
        onReact(message._id, emoji);
        setShowEmojiPicker(false);
        setShowReactions(false);
    };

    useOutside(emojiPickerRef, () => setShowEmojiPicker(false))
    useOutside(reactionsMenuRef, () => setShowReactions(false))
    useOutside(optionRef, () => setShowOptions(false))

    if (message === 0) return;

    return (
        <div className={`chat ${bubbleClass}`}>
            <div className={`${bubbleContentClass} relative group`} ref={messageRef}>
                <div className="flex justify-center gap-2">
                    {message.contentType === 'text' && <p className="mr-2">{message.content || message.message}</p>}
                    {message.contentType === 'imamge' && (
                        <div>
                            <img
                                src={message.imageOrVideoUrl}
                                alt="image-video"
                                className="rounded-lg max-w-xs"
                            />
                            <p className="mt-1">{message.content || message.message}</p>
                        </div>
                    )}
                </div>

                <div className="self-end flex items-center justify-end gap-1 text-xs opacity-60 mt-2 ml-2">
                    <span>{format(new Date(message.createdAt), "HH:mm")}</span>
                    {isUserMessage && (
                        <>
                            {(message.messageStatus === "sent" || message.messageStatus === "send") && <FaCheck size={12} />}
                            {message.messageStatus === "delivered" && (
                                <FaCheckDouble size={12} className="text-gray-500" />
                            )}
                            {message.messageStatus === "read" && (
                                <FaCheckDouble size={12} className="text-blue-500" />
                            )}
                        </>
                    )}
                </div>

                <div className='absolute top-1 right-1 opacity-0 group-hover : opacity-100  transition opacity z-20'>
                    <button onClick={() => setShowOptions((prev) => !prev)}
                        className={`p-1 rounded-full ${theme === 'dark' ? "text-white" : "text-gray-800"}`}
                    >
                        <HiDotsVertical size={18} />
                    </button>
                </div>

                <div className={`absolute ${isUserMessage ? "-left-10" : "-right-10"}  topo-1/2 transform -translate -y-1/2 opacity-0 group-hover:opacity-100 transition opacity flex flex-col gap-2 `}>
                    <button
                        onClick={() => setShowReactions(!showReactions)}
                        className={`p-2 rounded-full ${theme === 'dark' ? "bg-[#202c33] hover :bg-[#202c33]/80 "
                            : "bg-white hover:bg-gray-100"
                            }  shadow-lg`}

                    >
                        <FaSmile className={`${theme === 'dark' ? "text-gray-300" : "text-gray-800"}`} />
                    </button>
                </div>

                {showReactions && (
                    <div
                        ref={reactionsMenuRef}
                        className={`absolute -top-8 ${isUserMessage ? "left-0 " : "left-36"
                            }  transform -tanslate-y-1/2  flex items-center bg-[#202c33] rounded-full px-2 py-1.5 gap-1 shadow-lg z-50`}
                    >
                        {quickReactions.map((emoji, indxe) => (
                            <button
                                key={indxe}
                                onClick={() => handleReact(emoji)}
                                className={`hover:scale-125 transition-transform p-1`}
                            >
                                {emoji}
                            </button>
                        ))}
                        <div className='w-[1px] h-5 bg-gray-600 mx-1' />
                        <button className='hover :bg[#ffffff1al]  rounded-full p-1'
                            onClick={() => setShowEmojiPicker(true)}
                        >
                            <FaPlus className='h-4 w-4 text-gray-300' />
                        </button>
                    </div>
                )}

                {showEmojiPicker && (
                    <div ref={emojiPickerRef} className="absolute bottom-20 left-2 z-50">
                        <div className='relative'>
                            <Picker
                                onEmojiClick={(emojiData) => handleReact(emojiData.emoji)}

                            />

                        </div>
                        <button
                            onClick={() => setShowEmojiPicker(false)}
                            className='absolute  bottom-2 text-gray-400 hover:text-gray-600 z-10'>
                            <RxCross2 />
                        </button>
                    </div>
                )}


                {message.reaction && message.reaction.length > 0 && (
                    <div className={`absolute -bottom-5 ${isUserMessage ? "right-2" : "left-2"}  ${theme === 'dark' ? "bg-[#2a3942 " : "bg-gray-200"}  rounded-full px-2  shadow-md`}>

                        <div className='flex gap-1'>
                            {message.reaction.map((reaction, index) => (
                                <div key={index} className='mr-1'>
                                    {reaction.emoji}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MessageBubble;