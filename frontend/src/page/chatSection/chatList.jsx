import React, { useState } from 'react';
import { motion } from 'framer-motion'; // Added missing import
import useLayoutStore from '../../store/layoutStore';
import useThemeStore from '../../store/themeStore';
import useuserStore from '../../store/useruserStore';
import { FaPlus, FaSearch } from 'react-icons/fa';
import formatTimestamp from "../../utils/formatTime";

const ChatList = ({ contacts }) => {
  const selectedContact = useLayoutStore(state => state.selectedContact);
  const setSelectedContact = useLayoutStore(state => state.setSelectedContact);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const { theme, setTheme } = useThemeStore();
  const { user } = useuserStore();

  const [searchTerm, setSearchTerm] = useState('');

  const filterContact = contacts?.filter(contact =>
    contact?.username?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  console.log(filterContact)
  return (
    <div className={`w-full h-full border-r flex flex-col ${theme === 'dark' ? "bg-slate-900 text-slate-100 border-slate-800" : "bg-sky-50 text-slate-800 border-sky-100"}`}>

      {/* Header Section (Light Blue / Dark Slate) */}
      <div className={`p-4 flex justify-between items-center ${theme === 'dark' ? "bg-slate-800 text-white" : "bg-sky-100/70 text-slate-900"}`}>
        <h2 className='text-xl font-bold tracking-wide text-teal-600 dark:text-teal-400'>
          Chats
        </h2>
        {/* Soft Light Green Button */}
        <button className="p-3 bg-emerald-400 hover:bg-emerald-500 text-white rounded-full transition-all shadow-sm shadow-emerald-200 dark:shadow-none flex items-center justify-center">
          <FaPlus size={14} />
        </button>
      </div>

      {/* Search Component Wrapper */}
      <div className="p-3">
        <div className={`flex items-center gap-3 px-4 py-2.5 rounded-2xl border transition-all ${theme === 'dark'
          ? 'bg-slate-800 border-slate-700 focus-within:border-orange-400/50'
          : 'bg-white border-orange-100 focus-within:border-orange-300 focus-within:ring-2 focus-within:ring-orange-100'
          }`}>
          <FaSearch className={theme === 'dark' ? 'text-orange-400/80' : 'text-orange-400'} />
          <input
            type="text"
            placeholder="Search chats..."
            className={`bg-transparent w-full focus:outline-none caret-rose-400 ${theme === 'dark' ? 'text-slate-200 placeholder-slate-500' : 'text-slate-700 placeholder-slate-400'}`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Contacts List Wrapper */}
      <div className='overflow-y-auto h-[calc(100vh-120px)]'>
        {
          filterContact?.map((contact) => (
            <div key={contact?.id || contact?._id}>
              <motion.div
                onClick={() => setSelectedContact(contact)}
                className={`p-3 flex items-center cursor-pointer transition-colors ${theme === "dark"
                  ? (selectedContact?._id === contact?._id ? "bg-slate-800" : "hover:bg-slate-800/50")
                  : (selectedContact?._id === contact?._id ? "bg-sky-200/60" : "hover:bg-sky-100/50")
                  }`}
              >
                {/* Visual rendering of contact details */}
                {/* <span className="font-medium">{contact?.username}</span> */}

                <img
                  src={contact?.profilePicture}
                  alt={contact?.username}
                  className="w-12 h-12 rounded-full   border-red-600 border-2  object-cover "
                />
                <div className='ml-3 flex-1 min-w-0'>
                  <div className='flex justify-between items-baseline'>
                    <h2 className={`font-semibold truncate ${selectedContact?._id === contact?._id ? "text-white" : ""}`}>
                      {contact?.username}
                    </h2>
                    {contact?.conversation && (
                      <span className={`text-xs flex-shrink-0 ${theme === 'dark' ? "text-gray-500" : "text-gray-400"}`}>
                        {formatTimestamp(contact?.conversation?.lastMessage?.createdAt)}
                      </span>
                    )}
                  </div>
                  <div className={`flex items-center justify-between gap-2 ${selectedContact?._id === contact?._id ? "text-gray-300" : "text-gray-600"}`}>
                    <p className={`text-xs truncate flex-1 ${theme === 'dark' ? "text-gray-500" : "text-gray-400"}`}>
                      {contact?.conversation?.lastMessage?.message}
                    </p>

                    {contact.conversation && contact.conversation.unreadCount > 0 && contact?.conversation?.lastMessage?.receiverId === user._id && selectedContact?._id !== contact?._id && (
                      <span className="flex items-center justify-center bg-teal-500 text-white rounded-full text-[10px] font-bold w-5 h-5 min-w-[20px] flex-shrink-0">
                        {contact?.conversation?.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </motion.div>
            </div>
          ))
        }
      </div>

    </div>
  );
}; // Added missing closing function bracket

export default ChatList;











// import React from 'react'
// import useLayoutStore from '../../store/layoutStore'
// import useThemeStore from '../../store/themeStore'
// import useuserStore from '../../store/useruserStore'
// import { useState } from 'react';
// import { FaPlus, FaSearch } from 'react-icons/fa';




// const ChatList = ({ contacts }) => {

//   const selectedContact = useLayoutStore(state => state.selectedContact);
//   const setSelectedContact = useLayoutStore(state => state.setSelectedContact)
//   const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
//   const { theme, setTheme } = useThemeStore();
//   const { user } = useuserStore();
//   const filterContact = contacts?.filter(contact =>
//     contact?.username?.toLowerCase().includes(searchTerm.toLowerCase())
//   )


//   return (
//     <div className={`w-full border-r h-screen ${theme === 'dark' ? "bg-gray-800 text-white" : "bg-gray-100 text-black"}`}>
//       <div className={`p-4  justify-between ${theme === 'dark' ? "bg-gray-700 text-white" : "bg-gray-200 text-black"}`}>

//         <h2 className='text-xl font-semibold'>
//           Chats
//         </h2>

//         <button className={`p-2 bg-green-500  text-white-rounded-full hover:bg-green-500  transition-colors`}>
//           <FaPlus></FaPlus>
//         </button>

//       </div>
//       <div className="p-2"></div>
//       <div>
//         <FaSearch className='relative  top-1/2 transition-translate-y-1/2 ' />

//         <input
//           type="text"
//           placeholder="Search chats..."
//           className={`bg-transparent  focus:outline-none  border-red-600 ${theme === 'dark' ? 'text-white' : 'text-black'}`}
//         />
//       </div>
//     </div>
//   )
// }
// export default ChatList