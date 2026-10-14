import Journal from "./pages/Journal";
import { Link, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";

function Home() {
  return (
    <main className="hero">
      <section className="hero-copy">
        <p className="eyebrow">
          <span aria-hidden="true">✧</span>
          A calm home for your thoughts
        </p>

        <h1>
          A little space for everything that makes you, you.
        </h1>

        <p className="hero-description">
          Keep a private journal that stays private. Turn the
          entries that matter into stories you choose to share.
          And discover real experiences from people who have
          already been where you are going.
        </p>

        <div className="actions">
          <Link className="primary" to="/register">
            Start your private space <span aria-hidden="true">→</span>
          </Link>

          <Link className="secondary" to="/blogs">
            Explore community stories
          </Link>
        </div>
      </section>

      <section className="hero-visual" aria-label="MindSpace features">
        <article className="preview-card preview-journal">
          <small>♧ Private journal · only you</small>
          <h3>A page of your own</h3>
          <p>
            Save the little moments, the lessons, and the thoughts
            you want to remember.
          </p>
          <div className="preview-tags">
            <span>Reflective</span>
            <span>Personal</span>
          </div>
        </article>

        <article className="preview-card preview-story">
          <small>◉ Published story · community</small>
          <h3>Experiences worth sharing</h3>
          <p>
            Share what you have learned and help someone on a
            similar journey.
          </p>
          <div className="preview-tags">
            <span>Stories</span>
            <span>Community</span>
          </div>
        </article>

        <article className="preview-card preview-ai">
          <small>✧ MindSpace AI companion</small>
          <p>
            Find patterns in your thoughts and turn your ideas
            into words, when you choose.
          </p>
        </article>
      </section>
    </main>
  );
}

function Dashboard() {
  return (
    <main className="page">
      <p className="eyebrow">YOUR PERSONAL SPACE</p>
      <h1>Welcome to MindSpace</h1>
      <p>Make room for your thoughts, stories, and ideas.</p>

      <div className="cards">
        <Link to="/journal">
          <h3>My private journal ↗</h3>
          <p>Write freely in a space that belongs to you.</p>
        </Link>

        <Link to="/blogs">
          <h3>Explore stories ↗</h3>
          <p>Discover experiences and lessons from others.</p>
        </Link>

        <Link to="/write">
          <h3>Write a blog ↗</h3>
          <p>Turn your experiences into stories worth sharing.</p>
        </Link>
      </div>
    </main>
  );
}

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

export default function App() {
  return (
    <>
      <nav className="navbar">
        <Link className="brand" to="/" aria-label="MindSpace home">
          <span className="brand-mark" aria-hidden="true">●</span>
          MindSpace
        </Link>

        <div className="nav-links">
          <a href="/#features">Features</a>
          <Link to="/blogs">Stories</Link>
          <a href="/#about">About</a>
          <a href="/#privacy">Privacy</a>
        </div>

        <Link className="nav-cta" to="/dashboard">
          Go to dashboard
        </Link>
      </nav>

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/journal" element={<Journal />} />
        <Route
          path="/blogs"
          element={<Placeholder title="Explore community stories" />}
        />
        <Route
          path="/write"
          element={<Placeholder title="Write a story" />}
        />
        <Route
          path="/profile"
          element={<Placeholder title="My profile" />}
        />
        <Route
          path="/ai"
          element={<Placeholder title="MindSpace AI companion" />}
        />
      </Routes>
    </>
  );
}
