import { useCallback, useEffect, useState } from "react";
import { Search, BookOpen, Sprout, Heart, Palette, Compass, RefreshCw, Users, Compass as DiscoverIcon } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import BlogCard from "../components/BlogCard";
import api from "../services/api";
import "../components/explore-stories.css";

const categories = ["All stories", "Personal growth", "Creativity", "Life lessons", "Wellbeing"];

const categoryIcons = {
  "Personal growth": Sprout,
  Creativity: Palette,
  "Life lessons": Compass,
  Wellbeing: Heart,
};

export default function Explore() {
  const location = useLocation();
  const isSavedView = location.pathname === "/saved";
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All stories");
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retryKey, setRetryKey] = useState(0);
  const [feedMode, setFeedMode] = useState("all");
  const [followingIds, setFollowingIds] = useState([]);
  const [currentUserId, setCurrentUserId] = useState("");
  const isAuthenticated = Boolean(localStorage.getItem("token"));

  useEffect(() => {
    if (!isAuthenticated) {
      setFollowingIds([]);
      setCurrentUserId("");
      return;
    }
    let cancelled = false;
    Promise.all([api.get("/users/following"), api.get("/auth/profile")])
      .then(([followingResponse, profileResponse]) => {
        if (cancelled) return;
        setFollowingIds(Array.isArray(followingResponse.data?.following) ? followingResponse.data.following.map(String) : []);
        setCurrentUserId(String(profileResponse.data?.user?.id || profileResponse.data?.user?._id || ""));
      })
      .catch(() => {
        // Feed browsing remains available even if the follow list can't load.
      });
    return () => { cancelled = true; };
  }, [isAuthenticated]);

  const handleFollowChange = (authorId, following) => {
    setFollowingIds((current) => following
      ? [...new Set([...current, String(authorId)])]
      : current.filter((id) => id !== String(authorId)));
  };

  const loadStories = useCallback(async (signal) => {
    setLoading(true);
    setError("");
    try {
      const params = {};
      if (search.trim()) params.search = search.trim();
      if (activeCategory !== "All stories") params.category = activeCategory;

      if (isSavedView) {
        if (!isAuthenticated) {
          setStories([]);
          setError("Please log in to view your saved stories.");
          return;
        }
        const response = await api.get("/users/bookmarks", { signal });
        const saved = Array.isArray(response.data?.bookmarks) ? response.data.bookmarks : [];
        const query = search.trim().toLowerCase();
        const filtered = saved.filter((story) => {
          const categoryMatches = activeCategory === "All stories" || story.category === activeCategory;
          const searchable = `${story.title || ""} ${story.summary || ""} ${story.content || ""} ${(story.tags || []).join(" ")}`.toLowerCase();
          return categoryMatches && (!query || searchable.includes(query));
        });
        setStories(filtered);
        return;
      }
      if (feedMode === "following" && !isAuthenticated) {
        setStories([]);
        setLoading(false);
        return;
      }
      const endpoint = feedMode === "following" ? "/blogs/following-feed" : "/blogs/feed";
      const response = await api.get(endpoint, { params, signal });
      setStories(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      if (err.name === "CanceledError" || err.code === "ERR_CANCELED") return;
      setError(err.response?.data?.message || "We couldn't load stories right now. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [search, activeCategory, retryKey, feedMode, isAuthenticated, isSavedView]);

  useEffect(() => {
    const controller = new AbortController();
    loadStories(controller.signal);
    return () => controller.abort();
  }, [loadStories]);

  return (
    <main className="page explore-page ms-explore-page">
        <div className="ms-page-top-actions">
          <span className="eyebrow">{isSavedView ? "YOUR PRIVATE COLLECTION" : "MINDSPACE COMMUNITY"}</span>
          {isAuthenticated && (
            <nav className="ms-page-top-links" aria-label="Story navigation">
              <Link className={!isSavedView ? "active" : ""} to="/blogs">Explore Stories</Link>
              <Link className={isSavedView ? "active" : ""} to="/saved">Saved Stories</Link>
              <Link className="ms-back-dashboard" to="/dashboard">Go to Dashboard</Link>
            </nav>
          )}
        </div>

      <section className="ms-explore-hero">
        <div className="ms-explore-hero-copy">
          <p className="eyebrow">{isSavedView ? "YOUR PRIVATE COLLECTION" : "MINDSPACE COMMUNITY"}</p>
          <h1>{isSavedView ? "Saved stories, kept close." : "Stories that make us feel less alone."}</h1>
          <p className="ms-explore-intro">
            {isSavedView
              ? "Your bookmarked stories, gathered in one place so you can return whenever you need them."
              : "Explore experiences, small discoveries, and lessons worth sharing. Sometimes another person's words help us understand our own."}
          </p>
        </div>
        <div className="ms-explore-hero-art" aria-hidden="true">
          <div className="ms-explore-orbit ms-orbit-one" />
          <div className="ms-explore-orbit ms-orbit-two" />
          {isSavedView ? <BookOpen size={54} strokeWidth={1.2} /> : <BookOpen size={54} strokeWidth={1.2} />}
          <Sprout className="ms-explore-sprout" size={28} strokeWidth={1.4} />
        </div>
      </section>

      <section className="ms-explore-controls" aria-label="Find stories">
        {!isSavedView && (
          <div className="ms-story-feed-tabs" role="tablist" aria-label="Story feed">
            <button type="button" role="tab" aria-selected={feedMode === "following"} className={feedMode === "following" ? "ms-feed-tab active" : "ms-feed-tab"} onClick={() => setFeedMode("following")}>
              <Users size={16} /> Following
            </button>
            <button type="button" role="tab" aria-selected={feedMode === "all"} className={feedMode === "all" ? "ms-feed-tab active" : "ms-feed-tab"} onClick={() => setFeedMode("all")}>
              <DiscoverIcon size={16} /> All stories
            </button>
          </div>
        )}
        <label className="ms-explore-search">
          <Search size={19} aria-hidden="true" />
          <span className="sr-only">Search stories</span>
          <input
            type="search"
            placeholder="Search stories and topics..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>

        <div className="ms-story-categories" aria-label="Filter by category">
          {categories.map((category) => {
            const CategoryIcon = categoryIcons[category];
            return (
              <button
                key={category}
                type="button"
                className={activeCategory === category ? "ms-category-chip active" : "ms-category-chip"}
                aria-pressed={activeCategory === category}
                onClick={() => setActiveCategory(category)}
              >
                {CategoryIcon && <CategoryIcon size={15} aria-hidden="true" />}
                {category}
              </button>
            );
          })}
        </div>
      </section>

      <section className="ms-stories-section" aria-live="polite">
        <div className="ms-stories-section-heading">
          <div>
            <p className="eyebrow">A LITTLE INSPIRATION</p>
            <h2>{isSavedView ? "Your saved stories" : feedMode === "following" ? "Stories from people you follow" : "Explore stories"}</h2>
            <p>{isSavedView ? "Stories you've bookmarked for later." : feedMode === "following" ? "The latest published stories from your community." : "Thoughtful words, shared by people finding their way."}</p>
          </div>
          <span className="ms-story-count">
            {loading ? "Loading…" : `${stories.length} ${stories.length === 1 ? "story" : "stories"}`}
          </span>
        </div>

        {loading ? (
          <div className="ms-stories-state">
            <BookOpen size={30} aria-hidden="true" />
            <p>Finding stories for you…</p>
          </div>
        ) : !isSavedView && feedMode === "following" && !isAuthenticated ? (
          <div className="ms-stories-state">
            <Users size={30} aria-hidden="true" />
            <h3>Log in to see your Following feed</h3>
            <p>Sign in to follow authors and find their latest stories here.</p>
            <a className="ms-story-action" href="/login">Log in</a>
          </div>
        ) : error ? (
          <div className="ms-stories-state" role="alert">
            <BookOpen size={30} aria-hidden="true" />
            <h3>Stories aren't available yet</h3>
            <p>{error}</p>
            <button type="button" className="ms-story-action" onClick={() => setRetryKey((key) => key + 1)}>
              <RefreshCw size={16} /> Try again
            </button>
          </div>
        ) : stories.length ? (
          <div className="ms-story-grid">
            {stories.map((story) => <BlogCard key={story._id} story={story} source={isSavedView ? "saved" : "explore"} followingIds={followingIds} currentUserId={currentUserId} onFollowChange={handleFollowChange} />)}
          </div>
        ) : (
          <div className="ms-stories-state">
            <BookOpen size={30} aria-hidden="true" />
            <h3>{isSavedView ? "No saved stories yet" : feedMode === "following" ? "Your feed is waiting" : "No stories found"}</h3>
            <p>{isSavedView ? "Bookmark a story while reading it and it will appear here." : feedMode === "following" ? "Follow authors from All Stories to see their published stories here." : "There are no published stories matching your search yet. Try another topic or check back later."}</p>
            <button
              type="button"
              className="ms-story-action"
              onClick={() => { setSearch(""); setActiveCategory("All stories"); }}
            >
              Clear filters
            </button>
          </div>
        )}
      </section>

      {!isSavedView && <p className="ms-explore-note">Stories shared by the MindSpace community.</p>}
    </main>
  );
}
