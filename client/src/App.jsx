import { Link, Routes, Route, Navigate, useLocation } from "react-router-dom";

import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import Journal from "./pages/Journal";
import JournalEditor from "./pages/JournalEditor";
import BlogEditor from "./pages/BlogEditor";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Explore from "./pages/Explore";
import BlogDetails from "./pages/BlogDetails";
import BlogFeed from "./pages/BlogFeed";
import WorkspaceLayout from "./components/WorkspaceLayout";
import Collaborations from "./pages/Collaborations";
import Profile from "./pages/Profile";
import PublicProfile from "./pages/PublicProfile";

function Placeholder({ title }) {
  return (
    <main className="page">
      <p className="eyebrow">YOUR MINDSPACE</p>
      <h1>{title}</h1>
      <p>This page is being built. Your space is taking shape.</p>
      <Link className="secondary" to="/">
        ← Back to home
      </Link>
    </main>
  );
}

function Navbar() {
  const location = useLocation();
  const isAuthenticated = Boolean(localStorage.getItem("token"));
  const isExplorePage = location.pathname === "/blogs";

  return (
    <nav className="navbar">
      <Link className="brand" to="/" aria-label="MindSpace home">
        <span className="brand-mark" aria-hidden="true">●</span>
        MindSpace
      </Link>

      {!(!isAuthenticated && isExplorePage) && (
        <div className="nav-links">
          <a href="/#features">Features</a>
          <a href="/#about">About</a>
          <a href="/#privacy">Privacy</a>
        </div>
      )}

      {!isAuthenticated ? (
        <div className="nav-auth-links">
          <Link to="/login">Log in</Link>
          <Link className="nav-cta" to="/register">Sign up</Link>
        </div>
      ) : (
        <div className="nav-auth-links">
          <Link className="nav-cta" to="/dashboard">Go to dashboard</Link>
        </div>
      )}
    </nav>
  );
}

export default function App() {
  const location = useLocation();
  const isLoggedIn = Boolean(localStorage.getItem("token"));

  const isPublicPage =
    location.pathname === "/" ||
    location.pathname === "/blogs" ||
    location.pathname === "/saved" ||
    location.pathname.startsWith("/blogs/") ||
    location.pathname.startsWith("/members/");

  const isAuthPage =
    location.pathname === "/login" ||
    location.pathname === "/register";

  const isStoryReadingPage = /^\/blogs\/[^/]+$/.test(location.pathname);
  const showNavbar = isPublicPage && (
    location.pathname === "/" ||
    location.pathname.startsWith("/members/") ||
    (location.pathname === "/blogs" && !isLoggedIn)
  ) && !isStoryReadingPage;

  return (
    <>
      {showNavbar && <Navbar />}

      {isAuthPage ? (
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
        </Routes>
      ) : isPublicPage ? (
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/blogs" element={<Explore />} />
          <Route path="/blogs/:id" element={<BlogDetails />} />
          <Route path="/saved" element={<Explore />} />
          <Route path="/members/:id" element={<PublicProfile />} />
        </Routes>
      ) : isLoggedIn ? (
        <Routes>
          {/* Keep the story editor outside WorkspaceLayout so it has no sidebar or toolbar. */}
          <Route path="/write" element={<BlogEditor />} />
          <Route path="/write/:id" element={<BlogEditor />} />

          <Route element={<WorkspaceLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/journal" element={<Journal />} />
            <Route path="/journal/new" element={<JournalEditor />} />
            <Route path="/journal/:id/edit" element={<JournalEditor />} />
            <Route path="/my-stories" element={<BlogFeed />} />
            <Route path="/collaborations" element={<Collaborations />} />
            <Route path="/ai" element={<Navigate to="/dashboard" replace />} />
            <Route path="/profile" element={<Profile />} />
            <Route
              path="/notifications"
              element={<Placeholder title="Notifications" />}
            />
            <Route
              path="/settings"
              element={<Placeholder title="Settings" />}
            />
          </Route>

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      ) : (
        <Routes>
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      )}
    </>
  );
}
