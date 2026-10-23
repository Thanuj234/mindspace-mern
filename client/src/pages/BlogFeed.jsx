
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  BookOpen,
  PlusCircle,
  Eye,
  Pencil,
  Trash2,
  Heart,
  MessageCircle,
  Bookmark,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import api from "../services/api";

export default function BlogFeed() {
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [openComments, setOpenComments] = useState({});

  useEffect(() => {
    let cancelled = false;

    async function loadMyStories() {
      setLoading(true);
      setError("");

      try {
        const response = await api.get("/blogs/mine");

        if (!cancelled) {
          setStories(Array.isArray(response.data) ? response.data : []);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err.response?.data?.message ||
              "Unable to load your stories. Please log in and try again."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadMyStories();

    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  async function deleteStory(id) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this story? This cannot be undone."
    );

    if (!confirmed) return;

    try {
      setDeletingId(id);
      setError("");

      await api.delete(`/blogs/${id}`);
      setRefreshKey((value) => value + 1);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Couldn't delete the story. Please try again."
      );
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <main className="page my-stories-page">
      <section className="my-stories-heading">
        <div>
          <p className="eyebrow">YOUR PERSONAL SPACE</p>
          <h1>My stories</h1>
          <p>Every story starts somewhere. Keep track of yours.</p>
        </div>

        <Link to="/write" className="my-stories-write-button">
          <PlusCircle size={17} />
          Write a story
        </Link>
      </section>

      {loading ? (
        <div className="my-stories-message">Loading your stories...</div>
      ) : error ? (
        <div className="empty-stories" role="alert">
          <p>{error}</p>
          <button
            type="button"
            className="secondary"
            onClick={() => setRefreshKey((value) => value + 1)}
          >
            Try again
          </button>
        </div>
      ) : stories.length === 0 ? (
        <div className="empty-stories">
          <BookOpen size={30} />
          <h3>Your story collection starts here</h3>
          <p>Your drafts and published stories will appear here.</p>
          <Link to="/write" className="my-stories-write-button">
            Write your first story
          </Link>
        </div>
      ) : (
        <section className="my-stories-list">
          {stories.map((story) => (
            <article className="my-story-card" key={story._id}>
              <div className="my-story-card-main">
                <div className="my-story-topline">
                  <span
                    className={`my-story-status ${
                      story.status === "published" ? "published" : "draft"
                    }`}
                  >
                    {story.status === "published" ? "Published" : "Draft"}
                  </span>

                  <span className="my-story-date">
                    {new Date(
                      story.updatedAt || story.createdAt
                    ).toLocaleDateString()}
                  </span>
                </div>

                <h2>{story.title}</h2>

                <p className="my-story-category">
                  {story.category || "General"}
                </p>

                <p className="my-story-excerpt">
                  {(story.content || "").replace(/<[^>]*>/g, " ").slice(0, 180)}
                  {(story.content || "").replace(/<[^>]*>/g, " ").length > 180 ? "…" : ""}
                </p>

                {story.status === "published" && (
                  <div className="my-story-social-stats" aria-label="Story engagement">
                    <span><Heart size={15} /> {Number(story.likesCount ?? story.likes?.length ?? 0)} likes</span>
                    <button type="button" onClick={() => setOpenComments((current) => ({ ...current, [story._id]: !current[story._id] }))} aria-expanded={Boolean(openComments[story._id])}>
                      <MessageCircle size={15} /> {Number(story.commentsCount ?? story.comments?.length ?? 0)} comments {openComments[story._id] ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                    <span><Bookmark size={15} /> {Number(story.savesCount || 0)} saves</span>
                  </div>
                )}

                {story.status === "published" && openComments[story._id] && (
                  <section className="my-story-comments" aria-label={`Comments on ${story.title}`}>
                    {(story.comments || []).length ? story.comments.map((comment) => {
                      const commenter = comment.authorId && typeof comment.authorId === "object" ? comment.authorId : null;
                      const commenterId = commenter?._id || comment.authorId;
                      return (
                        <article className="my-story-comment" key={comment._id}>
                          <div className="my-story-comment-meta">
                            {commenterId ? <Link to={`/members/${commenterId}`}>{commenter?.name || "MindSpace member"}</Link> : <span>MindSpace member</span>}
                            <time>{comment.createdAt ? new Date(comment.createdAt).toLocaleString() : "Just now"}</time>
                          </div>
                          <p>{comment.text}</p>
                        </article>
                      );
                    }) : <p className="my-story-no-comments">No comments on this story yet.</p>}
                  </section>
                )}
              </div>

              <div className="my-story-actions">
                <Link to={`/write/${story._id}`}>
                  <Pencil size={16} />
                  Edit
                </Link>

                {story.status === "published" && (
                  <Link to={`/blogs/${story._id}`}>
                    <Eye size={16} />
                    Read story
                  </Link>
                )}

                <button
                  type="button"
                  onClick={() => deleteStory(story._id)}
                  disabled={deletingId === story._id}
                  className="my-story-delete-button"
                >
                  <Trash2 size={16} />
                  {deletingId === story._id ? "Deleting..." : "Delete"}
                </button>
              </div>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}
