# Alyx Chat System - Backend

The robust server-side backend of the Alyx Chat System, providing REST APIs and WebSocket endpoints for real-time messaging, authentication, and status uploads.

## 🚀 Features

*   **OTP Authentication**: Passwordless login using 6-digit verification codes sent via Twilio (SMS) or Nodemailer (Email).
*   **JWT Authorization**: Secure JSON Web Tokens signed and stored securely for session management.
*   **Real-time WebSockets**: Dual event messaging for instant chat updates and delivery states via Socket.io.
*   **Media Management**: Direct media upload parsing using Multer and remote cloud hosting with Cloudinary.
*   **Relational Schema Mapping**: MongoDB collection design using Mongoose for Users, Messages, Conversations, and Status updates.

## 🛠️ Tech Stack

*   **Runtime**: Node.js
*   **Framework**: [Express v5](https://expressjs.com/)
*   **Database**: [MongoDB](https://www.mongodb.com/) via [Mongoose](https://mongoosejs.com/)
*   **Real-time Communication**: [Socket.io](https://socket.io/)
*   **Media Upload Handling**: [Multer](https://github.com/expressjs/multer) & [Cloudinary](https://cloudinary.com/)
*   **Verification Channels**: [Twilio SDK](https://www.twilio.com/) & [Nodemailer](https://nodemailer.com/)
*   **Development Utility**: Nodemon

## 📂 Project Structure

```
backend/
├── controllers/          # Business logic handlers
│   ├── authController.js # Handles OTP trigger, validation, and profile updates
│   ├── chatController.js # Handles conversation initialization and history
│   └── statusController.js# Handles status uploads and view retrieval
├── middleware/           # Express middleware
│   └── authmiddleware.js # JWT payload parsing and guard rails
├── models/               # Mongoose MongoDB schemas
│   ├── User.js           # User profiles, phone numbers, and emails
│   ├── Message.js        # Chat message records (sender, receiver, media, text)
│   ├── conversation.js   # Groupings of active user chat channels
│   └── Status.js         # User uploaded status updates with expiry dates
├── routes/               # API endpoint path registries
│   ├── authRoutes.js
│   ├── chatRoutes.js
│   └── statusRoutes.js
├── services/             # Background socket connections
│   └── socketService.js  # Socket.io events and client mappings
├── src/
│   └── cloudaniry.js     # Cloudinary media configurations
├── utils/                # Helper libraries
│   └── jsonWebToken.js   # JWT token creators and cookie setups
├── uploads/              # Temporary file system store for multer
├── index.js              # Entrypoint (initializes Express, Mongoose, and Socket.io)
├── package.json
└── .env
```

## ⚙️ Configuration & Installation

1.  **Install dependencies**:
    ```bash
    npm install
    ```

2.  **Configure environment variables**:
    Create a `.env` file in the root of the `backend` directory:
    ```env
    PORT=5000
    MONGO_URI=mongodb://localhost:27017/alyx_chat
    JWT_SECRET=your_jwt_secret_key_here

    # Email SMTP configuration
    SMTP_HOST=smtp.gmail.com
    SMTP_PORT=587
    SMTP_USER=your_email@gmail.com
    SMTP_PASS=your_email_app_password

    # Twilio SMS API configuration
    TWILIO_ACCOUNT_SID=your_twilio_sid
    TWILIO_AUTH_TOKEN=your_twilio_token
    TWILIO_PHONE_NUMBER=your_twilio_phone_number

    # Cloudinary storage API configuration
    CLOUDINARY_CLOUD_NAME=your_cloud_name
    CLOUDINARY_API_KEY=your_api_key
    CLOUDINARY_API_SECRET=your_api_secret
    ```

3.  **Run Server**:
    *   **Development Mode (Hot Reloading)**:
        ```bash
        npm run dev
        ```
    *   **Production Mode**:
        ```bash
        npm start
        ```
