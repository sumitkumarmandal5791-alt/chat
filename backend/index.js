require("dotenv").config();
const express = require("express");
const { main } = require("./src/cinfigure");
const app = express();
const bodyParser = require("body-parser");
const cookieParser = require('cookie-parser');
const cors = require("cors");
const authRoutes = require("./routes/authRoutes");
const http = require("http");
const initializeSocket = require("./services/socketService");
const chatRoutes = require("./routes/chatRoutes");
const statusRoutes = require("./routes/statusRoutes");
const groupRoutes = require("./routes/groupRoutes");
const { initStatusCleanupJob } = require("./services/statusCleanupService");
const { authMiddleWare } = require("./middleware/authmiddleware");
const statusController = require("./controllers/statusController");
const { verifyEmailConnection } = require("./services/emailService");
const path = require("path");

const allowedOrigins = [
    process.env.FRONTEND_URL || "http://localhost:5173",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5174"
];

app.use(cors({
    origin: (origin, callback) => {
        // allow requests with no origin (like mobile apps or curl requests)
        if (!origin || allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        return callback(null, true); // permissive fallback for local dev
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json());
app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: true }));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

const server = http.createServer(app);
const io = initializeSocket(server);

// Attach Socket.IO instance and user map to every request
app.use((req, res, next) => {
    req.io = io;
    req.socketUserMap = io.socketUserMap;
    next();
});

app.use(`/api/auth`, authRoutes);
app.use(`/api/chat`, chatRoutes);
app.use(`/api/status`, statusRoutes);
app.use(`/api/groups`, groupRoutes);
// Standardized user status privacy route
app.patch(`/api/users/me/status-privacy`, authMiddleWare, statusController.updateStatusPrivacy);

const PORT = process.env.PORT || 1200;

server.listen(PORT, "0.0.0.0", () => {
    console.log("Server is Listening at Port Number:" + PORT);
});

const InitalizeConnection = async () => {
    try {
        await Promise.all([main()]);
        console.log("CONNECTED TO DATABASE");
        // Verify SMTP connection on startup
        await verifyEmailConnection();
        // Start status cleanup background cron job
        initStatusCleanupJob();
    }
    catch (error) {
        console.log("DATABASE CONNECTION FAILED: " + error.message);
    }
};

InitalizeConnection();
