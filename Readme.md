# Real-Time Chat Application

A full-stack, real-time chat application built with the MERN stack (MongoDB, Express, React, Node.js) and Socket.io. This application allows users to communicate in real-time, share media, and provides a modern, responsive user interface.

## 🚀 Features

*   **Real-Time Messaging:** Instant message delivery and receipt using WebSockets (Socket.io).
*   **User Authentication:** Secure signup and login with JWT and bcrypt password hashing.
*   **Media Sharing:** Upload and share images within chats, powered by Cloudinary.
*   **Modern UI/UX:** Responsive and beautiful interface built with Tailwind CSS, DaisyUI, and Framer Motion for animations.
*   **State Management:** Efficient global state handling using Zustand.
*   **Form Handling & Validation:** Robust forms with React Hook Form and Yup validation on the frontend, and Validator on the backend.
*   **Notifications:** Real-time toast notifications for user interactions.
*   **Emoji Support:** Integrated emoji picker for expressive messaging.

## 🛠️ Tech Stack

### Frontend
*   **Framework:** React 19 with Vite
*   **Styling:** Tailwind CSS, DaisyUI
*   **State Management:** Zustand
*   **Routing:** React Router DOM
*   **Real-time:** Socket.io-client
*   **Form Validation:** React Hook Form, Yup
*   **Icons & Animations:** React Icons, Framer Motion
*   **Other utilities:** date-fns, emoji-picker-react, react-hot-toast

### Backend
*   **Runtime:** Node.js
*   **Framework:** Express.js
*   **Database:** MongoDB with Mongoose
*   **Real-time:** Socket.io
*   **Authentication:** JSON Web Tokens (JWT), bcrypt
*   **File Uploads:** Multer, Cloudinary
*   **Utilities:** nodemailer, twilio, cookie-parser, cors, dotenv

## 🏁 Getting Started

### Prerequisites

Ensure you have the following installed on your local machine:
*   [Node.js](https://nodejs.org/) (v16 or higher recommended)
*   [MongoDB](https://www.mongodb.com/) (Local instance or MongoDB Atlas)

### Installation

1.  **Clone the repository** (if applicable) or download the source code.
    ```bash
    git clone <repository-url>
    cd chat
    ```

2.  **Install Backend Dependencies:**
    ```bash
    cd backend
    npm install
    ```

3.  **Install Frontend Dependencies:**
    ```bash
    cd ../frontend
    npm install
    ```

### Environment Variables

You need to set up environment variables for both the backend and frontend to run correctly.

#### Backend (`backend/.env`)
Create a `.env` file in the `backend` directory and add the following:
```env
PORT=5000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
# Add your Twilio/Nodemailer credentials if you are using them for OTP/Email
```

#### Frontend (`frontend/.env`)
Create a `.env` file in the `frontend` directory and add the following (adjust the URL if your backend runs on a different port):
```env
VITE_BACKEND_URL=http://localhost:5000
```

### Running the Application

You can run both the frontend and backend concurrently or in separate terminals.

**1. Start the Backend Server (Development Mode):**
```bash
cd backend
npm run dev
```
*The backend server will start on `http://localhost:5000` (or the port specified in your .env).*

**2. Start the Frontend Development Server:**
```bash
cd frontend
npm run dev
```
*The frontend application will be accessible at `http://localhost:5173`.*

## 📜 Scripts

### Backend (`/backend`)
*   `npm start`: Runs the server using Node.
*   `npm run dev`: Runs the server using Nodemon for auto-reloading during development.

### Frontend (`/frontend`)
*   `npm run dev`: Starts the Vite development server.
*   `npm run build`: Builds the app for production.
*   `npm run preview`: Locally preview the production build.
*   `npm run lint`: Runs ESLint to check for code quality issues.
