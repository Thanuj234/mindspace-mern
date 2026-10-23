import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Bookmark, BookOpen, RefreshCw } from "lucide-react";
import api from "../services/api";
import BlogCard from "../components/BlogCard";
import "../components/explore-stories.css";

export default function SavedStories() {
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = async () => {
    setLoading(true); setError("");
    try {
      const { data } = await api.get("/users/bookmarks");
      setStories(Array.isArray(data.bookmarks) ? data.bookmarks : []);
    } catch (err) {
      setError(err.response?.data?.message || "Could not load saved stories.");
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  if (!localStorage.getItem("token")) return <main className="page ms-saved-page"><h1>Saved stories</h1><p>Please log in to see your bookmarks.</p><Link to="/login" className="ms-story-action">Log in</Link></main>;

  return <main className="page ms-saved-page">
    <header className="ms-saved-heading"><div><p className="eyebrow">YOUR PRIVATE COLLECTION</p><h1><Bookmark size={28} /> Saved stories</h1><p>Stories you've bookmarked, kept together for later.</p></div><Link to="/blogs" className="ms-story-action">Explore stories</Link></header>
    {loading ? <div className="ms-stories-state"><BookOpen size={28}/><p>Loading saved stories…</p></div> : error ? <div className="ms-stories-state" role="alert"><p>{error}</p><button className="ms-story-action" onClick={load}><RefreshCw size={16}/> Try again</button></div> : stories.length ? <div className="ms-story-grid">{stories.map((story) => <BlogCard key={story._id} story={story}/>)}</div> : <div className="ms-stories-state"><Bookmark size={28}/><h2>No saved stories yet</h2><p>Use the Bookmark button on a story to keep it here.</p><Link to="/blogs" className="ms-story-action">Find stories</Link></div>}
  </main>;
}
