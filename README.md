# MindSpace 🧠

**A Personal Journaling, Blogging, and AI-Powered Reflection Platform**

MindSpace is a full-stack web application built using the MERN stack. It provides a space for users to write private journal entries, create and publish stories, manage media, and use AI-powered tools to improve their writing and discover relevant personal reflections.

The project combines a React frontend, a Node.js and Express backend, MongoDB for application data, and external services for media storage and local AI processing.

## ✨ Features

### 🔐 Authentication
- User registration and login.
- JWT-based authentication.
- Protected API routes for authenticated users.

### 📔 Personal Journaling
- Create and manage journal entries.
- Store journal titles, content, moods, and tags.
- Mark entries as favorites.
- Attach images and other media to entries.

### ✍️ Blogging and Stories
- Create and edit blog posts and personal stories.
- Save posts as drafts.
- Publish stories for others to explore.
- Organize content using categories and tags.
- Upload cover images and other media.
- View individual stories on dedicated reading pages.

### 🤖 AI Writing Assistant
- Improve grammar, clarity, readability, and writing flow.
- Generate blog drafts from journal entries.
- Use the local Ollama AI service for text generation.

### 💭 Ask Your Memory
- Ask questions about your journals and stories.
- Receive AI-generated responses based on relevant content.
- Find related journal entries and stories.
- Open linked source entries from the response.

### 🤝 Collaboration
- Collaboration request management through the backend.
- View incoming and sent requests.
- Accept or decline incoming requests and cancel pending requests.

### 🎨 User Interface
- Landing page and application dashboard.
- Journal and story browsing interfaces.
- Story editor and reading experience.
- Floating Ask Your Memory chat interface.

## 🛠️ Technology Stack

| Area | Technologies |
|---|---|
| Frontend | React, JavaScript, Vite |
| Routing | React Router |
| Styling | CSS |
| Rich text editing | Tiptap |
| HTTP requests | Axios |
| Backend | Node.js, Express.js |
| Database | MongoDB, Mongoose |
| Authentication | JSON Web Tokens (JWT), bcryptjs |
| Media storage | Cloudinary, Supabase Storage |
| AI integration | Ollama, Qwen 2.5 3B |
| Development tools | Git, npm, Nodemon |

## 📁 Project Structure

```text
mindspace-mern/
├── client/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   ├── App.jsx
│   │   ├── App.css
│   │   └── main.jsx
│   ├── package.json
│   └── vite.config.js
│
├── server/
│   ├── config/
│   │   ├── cloudinary.js
│   │   ├── db.js
│   │   └── supabase.js
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── package.json
│   └── server.js
│
├── .gitignore
└── README.md
```

The frontend contains the React application, while the backend contains the API routes, controllers, database models, authentication middleware, and service configurations.

## ⚙️ Prerequisites

Install the following before running MindSpace:

- **Node.js and npm** — use a version compatible with the dependencies in the project.
- **Git** — to clone and manage the repository.
- **MongoDB** — a local instance or a MongoDB Atlas database.
- **Cloudinary account** — for image and media handling.
- **Supabase project** — for configured storage functionality.
- **Ollama** — required for the local AI writing features.

Each team member should configure their own environment variables and have access to the required database and storage services.

## 🚀 Installation and Setup

### 1. Clone the repository

```bash
git clone YOUR_GITHUB_REPOSITORY_URL
cd mindspace-mern
```

Replace `YOUR_GITHUB_REPOSITORY_URL` with the repository URL.

### 2. Install backend dependencies

```bash
cd server
npm install
```

### 3. Configure backend environment variables

Create a file named `.env` inside the `server` directory.

Add the following variables and replace the example values with your own credentials:

```env
PORT=5000

MONGO_URI=your_mongodb_connection_string

JWT_SECRET=your_long_random_secret

CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret

SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

**Important:** Never commit your `.env` file or share your JWT secret, Cloudinary API secret, or Supabase service-role key. The Supabase service-role key must remain on the backend and must not be exposed in frontend code.

### 4. Start the backend

From the `server` directory, run:

```bash
npm run dev
```

The backend should start on:

```text
http://localhost:5000
```

The root API endpoint can be checked at:

```text
http://localhost:5000/
```

Expected response:

```json
{
  "message": "MindSpace API is running"
}
```

The backend connects to MongoDB during startup, so ensure your database configuration is valid.

### 5. Install frontend dependencies

Open a second terminal from the project root:

```bash
cd client
npm install
```

### 6. Start the frontend

```bash
npm run dev
```

Vite will display the local development URL in the terminal, usually:

```text
http://localhost:5173
```

Open that address in your browser.

Keep both the frontend and backend terminals running while using the application.

## 🤖 Setting Up the Local AI Service

MindSpace uses Ollama to run its local AI model.

1. Install Ollama from [https://ollama.com](https://ollama.com).
2. Ensure the Ollama service is running.
3. Open a terminal and download the model:

```bash
ollama pull qwen2.5:3b
```

4. Start MindSpace's backend and frontend.

The backend communicates with Ollama at:

```text
http://127.0.0.1:11434
```

If an AI request fails, check that Ollama is running and that the required model is installed.

If the semantic embedding implementation using `nomic-embed-text` is enabled in the version being run, also execute:

```bash
ollama pull nomic-embed-text
```

AI response speed depends on the computer's available resources and the models being used.

## 🔌 Main Backend API Routes

The backend organizes functionality into REST API routes.

| Base route | Purpose |
|---|---|
| `/api/auth` | User authentication |
| `/api/journals` | Journal management |
| `/api/blogs` | Blog and story management |
| `/api/ai` | AI writing and memory-related functionality |
| `/api/collaborations` | Collaboration request management |

Protected endpoints require valid authentication. Individual endpoints and request formats are defined in the corresponding files inside `server/routes/`.

## 🧪 Running Checks

### Frontend production build

From the `client` directory:

```bash
npm run build
```

### Frontend linting

```bash
npm run lint
```

### Backend

From the `server` directory:

```bash
npm run dev
```

Check the terminal for database connection errors, missing environment variables, and AI service failures. Manually test authentication, journals, story publishing, media uploads, and AI functionality after setup.

## 👥 Team Setup and Collaboration

When another team member clones the repository, they should:

1. Install Node.js, Git, MongoDB access, and Ollama if they need the AI features.
2. Run `npm install` separately inside `server` and `client`.
3. Create their own `server/.env` file.
4. Configure database, Cloudinary, and Supabase access.
5. Download the required Ollama models.
6. Start the backend and frontend in separate terminals.
7. Test the features on their own system.

**Do not commit `node_modules` or personal environment files.** Each developer should install dependencies locally and maintain their own secrets.

## 🔒 Security and Privacy

- Authentication is handled using JWTs.
- Protected routes use authentication middleware.
- Private journal data should only be accessible to its owner.
- API secrets must remain on the backend.
- Configure database permissions and storage access carefully.
- Do not upload private credentials or real personal journal data to a public repository.

## 🎯 Project Objective

The objective of MindSpace is to demonstrate the development of a full-stack MERN application that combines personal journaling, content publishing, authentication, media management, and local AI integration.

The project provides practical experience with frontend and backend development, REST APIs, database modelling, authentication, third-party services, and collaborative software development.

## 👨‍💻 Development

MindSpace was developed as a MERN stack training project to practise building and integrating a complete web application.

Contributions, testing, and improvements are welcome through the team's Git workflow.

---

**MindSpace — Write your thoughts. Share your stories. Understand your journey.** 💙
