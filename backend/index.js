require("dotenv").config();
const express = require("express");
const { main } = require("./src/cinfigure")
const app = express();
const bodyParser = require("body-parser")
const cookieParser = require('cookie-parser')
const cors = require("cors")
const authRoutes = require("./routes/authRoutes")
const http = require("http");
const initializeSocket = require("./services/socketService")
const chatRoutes = require("./routes/chatRoutes")
const statusRoutes = require("./routes/statusRoutes")


app.use(cors({
    origin: [process.env.FRONTTEND_URL || "http://localhost:5173"],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"]
}))


const path = require("path");

app.use(express.json());
app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: true }))
app.use("/uploads", express.static(path.join(__dirname, "uploads")));


const server = http.createServer(app);
const io = initializeSocket(server);

// Attach Socket.IO instance and user map to every request
app.use((req, res, next) => {
    req.io = io;
    req.socketUserMap = io.socketUserMap;
    next();
});

app.use(`/api/auth`, authRoutes)
app.use(`/api/chat`, chatRoutes)
app.use(`/api/status`, statusRoutes)

//nst allowedOrigin = (process.env.NODE_ENV === "production" ? process.env.CORS_ORIGIN_PROD : process.env.CORS_ORIGIN_DEV)


const InitalizeConnection = async () => {
    try {
        await Promise.all([main()])
        console.log("CONNECTED TO DATABASE")
        server.listen(process.env.PORT, () => {
            console.log("Server is Listening at Port Number:" + process.env.PORT)
        })

    }
    catch (error) {
        console.log("DATABASE CONNECTION FAILED" + error.message);

    }
}

InitalizeConnection();
