require("dotenv").config();
const mongoose = require("mongoose");
const User = require("./models/User");
const Message = require("./models/Message");
const Conversation = require("./models/conversation");

const seedUsers = [
    {
        id: 1,
        phoneNumber: 9876543210,
        phoneSuffix: 91,
        name: "Alice Smith",
        username: "alice",
        email: "alice@example.com",
        profilePicture: "https://api.dicebear.com/6.x/avataaars/svg?seed=Alice",
        about: "Hey there! I am using Alyx Chat.",
        status: "online",
        isVerified: true,
        agreed: true
    },
    {
        id: 2,
        phoneNumber: 9876543211,
        phoneSuffix: 91,
        name: "Bob Jones",
        username: "bob",
        email: "bob@example.com",
        profilePicture: "https://api.dicebear.com/6.x/avataaars/svg?seed=Bob",
        about: "Coding all day.",
        status: "online",
        isVerified: true,
        agreed: true
    },
    {
        id: 3,
        phoneNumber: 9876543212,
        phoneSuffix: 91,
        name: "Charlie Brown",
        username: "charlie",
        email: "charlie@example.com",
        profilePicture: "https://api.dicebear.com/6.x/avataaars/svg?seed=Charlie",
        about: "Always active!",
        status: "offline",
        isVerified: true,
        agreed: true
    },
    {
        id: 4,
        phoneNumber: 9876543213,
        phoneSuffix: 91,
        name: "David Miller",
        username: "david",
        email: "david@example.com",
        profilePicture: "https://api.dicebear.com/6.x/avataaars/svg?seed=David",
        about: "Busy.",
        status: "offline",
        isVerified: true,
        agreed: true
    },
    {
        id: 5,
        phoneNumber: 9876543214,
        phoneSuffix: 91,
        name: "Emma Wilson",
        username: "emma",
        email: "emma@example.com",
        profilePicture: "https://api.dicebear.com/6.x/avataaars/svg?seed=Emma",
        about: "Hello world!",
        status: "online",
        isVerified: true,
        agreed: true
    }
];

async function seedDatabase() {
    try {
        const mongoUri = process.env.DB_CONNECT_STRING;
        if (!mongoUri) {
            throw new Error("DB_CONNECT_STRING environment variable is not defined in .env file.");
        }

        console.log("Connecting to database...");
        await mongoose.connect(mongoUri);
        console.log("Database connected successfully!");

        console.log("Clearing existing collections (Users, Messages, Conversations)...");
        await User.deleteMany({});
        await Message.deleteMany({});
        await Conversation.deleteMany({});
        console.log("Existing collections cleared.");

        console.log("Seeding users...");
        const users = await User.insertMany(seedUsers);
        console.log(`Seeded ${users.length} users successfully!`);

        console.log("Seeding conversations and messages...");
        const conversationsData = [
            {
                participants: [users[0]._id, users[1]._id], // Alice and Bob
                messagesText: [
                    { sender: users[0]._id, receiver: users[1]._id, text: "Hey Bob! Have you checked out the new layout updates?" },
                    { sender: users[1]._id, receiver: users[0]._id, text: "Hey Alice! Yes, the side-by-side view on desktop looks amazing now." },
                    { sender: users[0]._id, receiver: users[1]._id, text: "Indeed! And on mobile, it correctly shifts the sidebar to the bottom tab bar." },
                    { sender: users[1]._id, receiver: users[0]._id, text: "Awesome! Let me know when you want to run the next tests." }
                ]
            },
            {
                participants: [users[0]._id, users[2]._id], // Alice and Charlie
                messagesText: [
                    { sender: users[0]._id, receiver: users[2]._id, text: "Hi Charlie, did you get my email OTP?" },
                    { sender: users[2]._id, receiver: users[0]._id, text: "Yes Alice, verified successfully!" }
                ]
            },
            {
                participants: [users[1]._id, users[4]._id], // Bob and Emma
                messagesText: [
                    { sender: users[1]._id, receiver: users[4]._id, text: "Hey Emma, are you online?" },
                    { sender: users[4]._id, receiver: users[1]._id, text: "Hey Bob! Yes, just setting up my profile picture." }
                ]
            }
        ];

        for (const data of conversationsData) {
            // Create conversation channel
            const conv = new Conversation({
                participants: data.participants,
                messages: [],
                unreadCount: 0
            });
            await conv.save();

            // Create conversation messages
            const createdMessages = [];
            for (const msg of data.messagesText) {
                const messageObj = new Message({
                    senderId: msg.sender,
                    receiverId: msg.receiver,
                    message: msg.text,
                    conversationId: conv._id,
                    contentType: "text",
                    messageStatus: "read"
                });
                const savedMsg = await messageObj.save();
                createdMessages.push(savedMsg._id);
            }

            // Sync message links inside the conversation
            conv.messages = createdMessages;
            conv.lastMessage = createdMessages[createdMessages.length - 1];
            await conv.save();
        }

        console.log("Conversations and messages seeded successfully!");
        console.log("Seeding complete. Exiting...");
        process.exit(0);
    } catch (error) {
        console.error("Error during seeding database:", error);
        process.exit(1);
    }
}

seedDatabase();
