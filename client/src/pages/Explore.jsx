import { useCallback, useEffect, useState } from "react";
import { Search, BookOpen, Sprout, Heart, Palette, Compass, RefreshCw } from "lucide-react";
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
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All stories");
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retryKey, setRetryKey] = useState(0);

  const loadStories = useCallback(async (signal) => {
    setLoading(true);
    setError("");
    try {
      const params = {};
      if (search.trim()) params.search = search.trim();
      if (activeCategory !== "All stories") params.category = activeCategory;

      const response = await api.get("/blogs/feed", { params, signal });
      setStories(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      if (err.name === "CanceledError" || err.code === "ERR_CANCELED") return;
      setError(err.response?.data?.message || "We couldn't load stories right now. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [search, activeCategory, retryKey]);

  useEffect(() => {
    const controller = new AbortController();
    loadStories(controller.signal);
    return () => controller.abort();
  }, [loadStories]);

  return (
    <main className="page explore-page ms-explore-page">
      <section className="ms-explore-hero">
        <div className="ms-explore-hero-copy">
          <p className="eyebrow">MINDSPACE COMMUNITY</p>
          <h1>Stories that make us feel less alone.</h1>
          <p className="ms-explore-intro">
            Explore experiences, small discoveries, and lessons worth sharing.
            Sometimes another person's words help us understand our own.
          </p>
        </div>
        <div className="ms-explore-hero-art" aria-hidden="true">
          <div className="ms-explore-orbit ms-orbit-one" />
          <div className="ms-explore-orbit ms-orbit-two" />
          <BookOpen size={54} strokeWidth={1.2} />
          <Sprout className="ms-explore-sprout" size={28} strokeWidth={1.4} />
        </div>
      </section>

      <section className="ms-explore-controls" aria-label="Find stories">
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
            <h2>Explore stories</h2>
            <p>Thoughtful words, shared by people finding their way.</p>
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
            {stories.map((story) => <BlogCard key={story._id} story={story} />)}
          </div>
        ) : (
          <div className="ms-stories-state">
            <BookOpen size={30} aria-hidden="true" />
            <h3>No stories found</h3>
            <p>There are no published stories matching your search yet. Try another topic or check back later.</p>
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

      <p className="ms-explore-note">Stories shared by the MindSpace community.</p>
    </main>
  );
}
