require("dotenv").config();
const express = require("express");
const { main } = require("./src/cinfigure")
const app = express();
const bodyParser = require("body-parser")
const cookieParser = require('cookie-parser')
const cors = require("cors")
const authRoutes = require("./routes/authRoutes")



app.use(express.json());
app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: true }))


app.use(`/api/auth`, authRoutes)

//nst allowedOrigin = (process.env.NODE_ENV === "production" ? process.env.CORS_ORIGIN_PROD : process.env.CORS_ORIGIN_DEV)


app.use(cors({
    origin: "*",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"]
}))












const InitalizeConnection = async () => {
    try {
        await Promise.all([main()])
        console.log("CONNECTED TO DATABASE")
        app.listen(process.env.PORT, () => {
            console.log("Server is Listening at Port Number:" + process.env.PORT)
        })

    }
    catch (error) {
        console.log("DATABASE CONNECTION FAILED" + error.message);

    }
}

InitalizeConnection();
