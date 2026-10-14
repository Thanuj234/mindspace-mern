
import { Link, Routes, Route } from "react-router-dom";

function Home() {
  return (
    <main className="hero">
      <p className="eyebrow">YOUR THOUGHTS. YOUR PASSIONS.</p>
      <h1>Your mind deserves its own space.</h1>
      <p>
        Keep private journals, share your passions,
        and use AI to help express your ideas.
      </p>
      <div className="actions">
        <Link className="primary" to="/register">
          Get started
        </Link>
        <Link className="secondary" to="/blogs">
          Explore blogs
        </Link>
      </div>
    </main>
  );
}

function Dashboard() {
  return (
    <main className="page">
      <h1>Welcome to MindSpace</h1>
      <p>Your personal space for thoughts and creativity.</p>
      <div className="cards">
        <Link to="/journal">My private journal</Link>
        <Link to="/blogs">Explore blogs</Link>
        <Link to="/write">Write a blog</Link>
      </div>
    </main>
  );
}

function Placeholder({ title }) {
  return (
    <main className="page">
      <h1>{title}</h1>
      <p>This page is under development.</p>
      <Link to="/">Back to home</Link>
    </main>
  );
}

export default function App() {
  return (
    <>
      <nav className="navbar">
        <Link className="brand" to="/">MindSpace ✦</Link>
        <div className="nav-links">
          <Link to="/blogs">Explore</Link>
          <Link to="/login">Login</Link>
          <Link to="/register">Sign up</Link>
        </div>
      </nav>

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route
          path="/login"
          element={<Placeholder title="Login" />}
        />
        <Route
          path="/register"
          element={<Placeholder title="Create your account" />}
        />
        <Route
          path="/journal"
          element={<Placeholder title="My private journal" />}
        />
        <Route
          path="/blogs"
          element={<Placeholder title="Explore blogs" />}
        />
        <Route
          path="/write"
          element={<Placeholder title="Write a blog" />}
        />
        <Route
          path="/profile"
          element={<Placeholder title="My profile" />}
        />
        <Route
          path="/ai"
          element={<Placeholder title="MindSpace AI" />}
        />
      </Routes>
    </>
  );
}