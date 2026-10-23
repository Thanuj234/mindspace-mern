import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Clock3,
  Users,
  Send,
  X,
  BookOpen,
  HeartHandshake,
  MapPin,
  Sparkles,
  Heart,
  Bookmark,
  Trash2,
} from "lucide-react";
import api from "../services/api";
import "../components/explore-stories.css";

function readTime(content = "") {
  const plainText = content.replace(/<[^>]*>/g, " ").trim();
  const words = plainText.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}

function getAuthor(story) {
  const authorData = story?.authorId;

  if (!authorData || typeof authorData !== "object") {
    return {
      id: "",
      name: "MindSpace Community",
      photo: "",
      bio: "",
      location: "",
      interests: [],
    };
  }

  return {
    id: authorData._id || authorData.id || "",
    name: authorData.name || "MindSpace Community",
    photo: authorData.profilePhoto || "",
    bio: authorData.bio || "",
    location: authorData.location || "",
    interests: Array.isArray(authorData.interests)
      ? authorData.interests
      : [],
  };
}

export default function BlogDetails() {
  const { id } = useParams();
  const location = useLocation();
  const sourcePage = location.state?.from || new URLSearchParams(location.search).get("from");
  const returnTo = sourcePage === "saved" ? "/saved" : "/blogs";
  const returnLabel = sourcePage === "saved" ? "Back to Saved Stories" : "Back to Explore Stories";

  const [story, setStory] = useState(null);
  const [relatedStories, setRelatedStories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [requestError, setRequestError] = useState("");
  const [requestSuccess, setRequestSuccess] = useState("");
  const [socialStatus, setSocialStatus] = useState({ liked: false, bookmarked: false, likesCount: 0, commentsCount: 0 });
  const [socialBusy, setSocialBusy] = useState(false);
  const [socialError, setSocialError] = useState("");
  const [commentText, setCommentText] = useState("");
  const [commentBusy, setCommentBusy] = useState(false);
  const [currentUserId, setCurrentUserId] = useState("");
  const isAuthenticated = Boolean(localStorage.getItem("token"));

  useEffect(() => {
    const controller = new AbortController();

    async function loadStory() {
      setLoading(true);
      setError("");
      setStory(null);

      try {
        const response = await api.get(`/blogs/feed/${id}`, {
          signal: controller.signal,
        });

        const result = response.data?.story || response.data;
        setStory(result);
        setSocialStatus((current) => ({ ...current, likesCount: Number(result.likesCount || 0), commentsCount: Array.isArray(result.comments) ? result.comments.length : 0 }));
      } catch (err) {
        if (
          err.name === "CanceledError" ||
          err.code === "ERR_CANCELED"
        ) {
          return;
        }

        setError(
          err.response?.status === 404
            ? "This story could not be found or is no longer published."
            : err.response?.data?.message ||
                "We couldn't load this story. Please try again."
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadStory();

    return () => controller.abort();
  }, [id]);

  useEffect(() => {
    let active = true;
    if (!isAuthenticated) { setCurrentUserId(""); return () => { active = false; }; }
    api.get("/auth/profile").then(({ data }) => {
      const user = data?.user || data;
      if (active) setCurrentUserId(String(user?.id || user?._id || ""));
    }).catch(() => { if (active) setCurrentUserId(""); });
    return () => { active = false; };
  }, [isAuthenticated]);

  useEffect(() => {
    let active = true;
    if (!id || !isAuthenticated) {
      setSocialStatus({ liked: false, bookmarked: false, likesCount: 0, commentsCount: 0 });
      return () => { active = false; };
    }
    api.get(`/blogs/${id}/social`).then(({ data }) => {
      if (active) setSocialStatus({ liked: Boolean(data.liked), bookmarked: Boolean(data.bookmarked), likesCount: Number(data.likesCount || 0), commentsCount: Number(data.commentsCount || 0) });
    }).catch(() => { /* Public story reading remains available if interaction status fails. */ });
    return () => { active = false; };
  }, [id, isAuthenticated]);

  useEffect(() => {
    let active = true;
    async function loadRelatedStories() {
      try {
        const response = await api.get("/blogs/feed");
        const stories = Array.isArray(response.data)
          ? response.data
          : response.data?.blogs || [];
        if (active) {
          setRelatedStories(
            stories
              .filter((item) => item._id !== id)
              .filter((item) => !story?.category || item.category === story.category || (item.tags || []).some((tag) => (story.tags || []).includes(tag)))
              .slice(0, 3)
          );
        }
      } catch {
        if (active) setRelatedStories([]);
      }
    }
    if (story) loadRelatedStories();
    return () => { active = false; };
  }, [id, story?._id, story?.category]);

  const author = getAuthor(story);
  const initials = author.name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("") || "M";

  async function toggleLike() {
    if (!isAuthenticated) { setSocialError("Please log in to like stories."); return; }
    if (socialBusy) return;
    setSocialBusy(true); setSocialError("");
    try {
      const { data } = await api.post(`/blogs/${id}/like`);
      setSocialStatus((current) => ({ ...current, liked: Boolean(data.liked), likesCount: Number(data.likesCount || 0) }));
    } catch (err) {
      setSocialError(err.response?.data?.message || "Couldn't update your like. Please try again.");
    } finally { setSocialBusy(false); }
  }

  async function toggleBookmark() {
    if (!isAuthenticated) { setSocialError("Please log in to save stories."); return; }
    if (socialBusy) return;
    setSocialBusy(true); setSocialError("");
    try {
      if (socialStatus.bookmarked) await api.delete(`/users/bookmarks/${id}`);
      else await api.post(`/users/bookmarks/${id}`);
      setSocialStatus((current) => ({ ...current, bookmarked: !current.bookmarked }));
    } catch (err) {
      setSocialError(err.response?.data?.message || "Couldn't update your saved stories.");
    } finally { setSocialBusy(false); }
  }

  async function submitComment(event) {
    event.preventDefault();
    if (!isAuthenticated) { setSocialError("Please log in to comment."); return; }
    const text = commentText.trim();
    if (!text) return;
    setCommentBusy(true); setSocialError("");
    try {
      const { data } = await api.post(`/blogs/${id}/comments`, { text });
      setStory((current) => ({ ...current, comments: [...(current.comments || []), data.comment] }));
      setSocialStatus((current) => ({ ...current, commentsCount: Number(data.commentsCount || current.commentsCount + 1) }));
      setCommentText("");
    } catch (err) {
      setSocialError(err.response?.data?.message || "Couldn't post your comment. Please try again.");
    } finally { setCommentBusy(false); }
  }

  async function deleteComment(commentId) {
    setSocialError("");
    try {
      const { data } = await api.delete(`/blogs/${id}/comments/${commentId}`);
      setStory((current) => ({ ...current, comments: (current.comments || []).filter((comment) => String(comment._id) !== String(commentId)) }));
      setSocialStatus((current) => ({ ...current, commentsCount: Number(data.commentsCount || 0) }));
    } catch (err) {
      setSocialError(err.response?.data?.message || "Couldn't delete this comment.");
    }
  }

  async function sendCollaborationRequest(event) {
    event.preventDefault();
    setRequestError("");
    setRequestSuccess("");

    if (!message.trim()) {
      setRequestError(
        "Add a short message so the author knows what you'd like to explore together."
      );
      return;
    }

    try {
      setSending(true);

      await api.post("/collaborations", {
        blogId: story._id,
        message: message.trim(),
      });

      setRequestSuccess(
        "Your collaboration request has been sent! Thanks for reaching out."
      );
      setShowRequestForm(false);
      setMessage("");
    } catch (err) {
      setRequestError(
        err.response?.status === 401
          ? "Please log in to request a collaboration."
          : err.response?.data?.message ||
              "We couldn't send your request. Please try again."
      );
    } finally {
      setSending(false);
    }
  }

  return (
    <main className="page blog-details-page ms-story-detail-page">
      <Link to={returnTo} className="ms-story-back-link">
        <ArrowLeft size={17} />
        {returnLabel}
      </Link>

      {loading ? (
        <div className="ms-story-detail-state">
          <BookOpen size={28} />
          <p>Opening your story…</p>
        </div>
      ) : error ? (
        <section className="ms-story-detail-state" role="alert">
          <BookOpen size={30} />
          <h2>Story unavailable</h2>
          <p>{error}</p>
          <Link to={returnTo} className="ms-story-action">
            {returnLabel}
          </Link>
        </section>
      ) : story ? (
        <article className="ms-story-reading-card">
          {story.coverImage?.url && (
            <img
              className="ms-story-reading-cover"
              src={story.coverImage.url}
              alt={`Cover for ${story.title}`}
            />
          )}

          <div className="ms-story-reading-body">
            <span className="ms-story-reading-category">
              {story.category || "General"}
            </span>

            <h1>{story.title}</h1>

            {story.summary && (
              <p className="ms-story-reading-summary">{story.summary}</p>
            )}

            <div className="ms-story-reading-meta">
              <span>
                <Clock3 size={15} />
                {readTime(story.content || "")} min read
              </span>

              {story.createdAt && (
                <time dateTime={story.createdAt}>
                  {new Date(story.createdAt).toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </time>
              )}
            </div>

            {/* Author profile */}
            <section className="ms-story-author-card" aria-label="Story author">
              <div className="ms-story-author-avatar">
                {author.photo ? (
                  <img
                    src={author.photo}
                    alt={`${author.name}'s profile`}
                    onError={(event) => {
                      event.currentTarget.style.display = "none";
                    }}
                  />
                ) : (
                  <span>{initials}</span>
                )}
              </div>

              <div className="ms-story-author-info">
                <span className="ms-story-author-eyebrow">
                  STORY SHARED BY
                </span>
                <h2>{author.name}</h2>

                {author.location && (
                  <p className="ms-story-author-location">
                    <MapPin size={14} />
                    {author.location}
                  </p>
                )}

                {author.bio && (
                  <p className="ms-story-author-bio">{author.bio}</p>
                )}

                {author.interests.length > 0 && (
                  <div className="ms-story-author-interests">
                    {author.interests.slice(0, 5).map((interest) => (
                      <span key={interest}>{interest}</span>
                    ))}
                  </div>
                )}
              </div>
            </section>

            {story.tags?.length > 0 && (
              <div className="ms-story-reading-tags">
                {story.tags.map((tag) => (
                  <span key={tag}>{tag}</span>
                ))}
              </div>
            )}

            <div
              className="ms-story-reading-content"
              dangerouslySetInnerHTML={{ __html: story.content || "" }}
            />

            <section className="ms-social-panel" aria-label="Story interactions">
              <div className="ms-social-actions">
                <button type="button" className={socialStatus.liked ? "ms-social-button active liked" : "ms-social-button"} onClick={toggleLike} disabled={socialBusy} aria-pressed={socialStatus.liked}>
                  <Heart size={18} fill={socialStatus.liked ? "currentColor" : "none"} />
                  {socialStatus.liked ? "Liked" : "Like"} · {socialStatus.likesCount}
                </button>
                <button type="button" className={socialStatus.bookmarked ? "ms-social-button active" : "ms-social-button"} onClick={toggleBookmark} disabled={socialBusy} aria-pressed={socialStatus.bookmarked}>
                  <Bookmark size={18} fill={socialStatus.bookmarked ? "currentColor" : "none"} />
                  {socialStatus.bookmarked ? "Saved" : "Bookmark"}
                </button>
                <a className="ms-social-button" href="#story-comments">💬 Comments · {(story.comments || []).length}</a>
                <Link className="ms-social-button" to="/saved">View saved stories</Link>
              </div>
              {socialError && <p className="ms-social-error" role="alert">{socialError}</p>}

              <section className="ms-comments-section" id="story-comments" aria-label="Story comments">
                <h2>Comments <span>{(story.comments || []).length}</span></h2>
                {isAuthenticated ? (
                  <form className="ms-comment-form" onSubmit={submitComment}>
                    <label className="sr-only" htmlFor="story-comment-input">Write a comment</label>
                    <textarea id="story-comment-input" value={commentText} onChange={(event) => setCommentText(event.target.value)} maxLength={1000} rows={3} placeholder="Share a thoughtful response…" />
                    <div className="ms-comment-form-footer"><span>{commentText.length}/1000</span><button type="submit" className="ms-story-action" disabled={commentBusy || !commentText.trim()}>{commentBusy ? "Posting…" : "Post comment"}</button></div>
                  </form>
                ) : <p className="ms-comments-login">Please <Link to="/login">log in</Link> to like, comment, or save stories.</p>}
                {(story.comments || []).length ? (
                  <div className="ms-comment-list">
                    {[...(story.comments || [])].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)).map((comment) => {
                      const commentAuthorId = String(comment.authorId?._id || comment.authorId || "");
                      const canDelete = currentUserId && currentUserId === commentAuthorId;
                      return <article className="ms-comment-item" key={comment._id}>
                        <div className="ms-comment-heading">{commentAuthorId ? <Link className="ms-comment-profile-link" to={`/members/${commentAuthorId}`}>{comment.authorId?.name || "MindSpace member"}</Link> : <strong>{comment.authorId?.name || "MindSpace member"}</strong>}<time dateTime={comment.createdAt}>{comment.createdAt ? new Date(comment.createdAt).toLocaleString() : "Just now"}</time>
                          {canDelete && <button type="button" aria-label="Delete your comment" onClick={() => deleteComment(comment._id)}><Trash2 size={15} /></button>}
                        </div>
                        <p>{comment.text}</p>
                      </article>;
                    })}
                  </div>
                ) : <p className="ms-comments-empty">No comments yet. Be the first to share a thought.</p>}
              </section>
            </section>

            {/* Collaboration feedback */}
            {requestError && (
              <div className="ms-story-alert error" role="alert">
                {requestError}
              </div>
            )}

            {requestSuccess && (
              <div className="ms-story-alert success" role="status">
                {requestSuccess}
              </div>
            )}

            {/* Collaboration invitation */}
            <section
              className="ms-collaboration-panel ms-collaboration-panel-enhanced"
              aria-label="Collaborate on this story"
            >
              <div className="ms-collaboration-icon">
                <HeartHandshake size={24} />
              </div>

              <div className="ms-collaboration-copy">
                <span className="ms-collaboration-eyebrow">
                  GOOD THINGS CAN BEGIN WITH A MESSAGE
                </span>

                <h2>Want to know more about this story?</h2>

                <p>
                  Have a question for {author.name}, want to learn more about
                  their experience, or have an idea inspired by their story?
                  We'd love to help you take that next step.
                </p>

                <p className="ms-collaboration-invitation">
                  <Sparkles size={16} />
                  <span>
                    Kindly collaborate with the author. Introduce yourself,
                    share what caught your interest, and tell them what
                    you'd like to explore or create together.
                  </span>
                </p>

                {!showRequestForm ? (
                  <button
                    type="button"
                    className="ms-story-action"
                    onClick={() => {
                      setRequestError("");
                      setRequestSuccess("");
                      setShowRequestForm(true);
                    }}
                  >
                    <Users size={16} />
                    Connect &amp; collaborate
                  </button>
                ) : (
                  <form
                    onSubmit={sendCollaborationRequest}
                    className="ms-collaboration-form"
                  >
                    <label htmlFor="collaboration-message">
                      Your message to {author.name}
                    </label>

                    <textarea
                      id="collaboration-message"
                      value={message}
                      onChange={(event) => setMessage(event.target.value)}
                      maxLength={500}
                      minLength={1}
                      rows={5}
                      required
                      placeholder="Hi! I enjoyed your story because… I'd love to ask you about… / Maybe we could work together on…"
                    />

                    <p className="ms-character-count">
                      {message.length}/500 characters
                    </p>

                    <div className="ms-collaboration-actions">
                      <button
                        type="submit"
                        className="ms-story-action"
                        disabled={sending || !message.trim()}
                      >
                        <Send size={16} />
                        {sending ? "Sending…" : "Send collaboration request"}
                      </button>

                      <button
                        type="button"
                        className="ms-story-action secondary"
                        disabled={sending}
                        onClick={() => {
                          setShowRequestForm(false);
                          setRequestError("");
                          setMessage("");
                        }}
                      >
                        <X size={16} />
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </section>

            {relatedStories.length > 0 && (
              <section className="ms-related-stories" aria-label="Related stories">
                <div className="ms-related-heading">
                  <span className="ms-story-author-eyebrow">KEEP EXPLORING</span>
                  <h2>More stories for you</h2>
                </div>
                <div className="ms-related-grid">
                  {relatedStories.map((item) => (
                    <Link className="ms-related-card" to={`/blogs/${item._id}?from=${sourcePage === "saved" ? "saved" : "explore"}`} state={{ from: sourcePage === "saved" ? "saved" : "explore" }} key={item._id}>
                      {item.coverImage?.url ? (
                        <img src={item.coverImage.url} alt="" loading="lazy" />
                      ) : (
                        <div className="ms-related-art" aria-hidden="true">✦</div>
                      )}
                      <div className="ms-related-card-copy">
                        <span>{item.category || "MindSpace story"}</span>
                        <h3>{item.title}</h3>
                        {item.summary && <p>{item.summary}</p>}
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            <p className="ms-story-reading-footer">
              Every story is a chance to connect. Thank you for making space
              for curiosity, creativity, and collaboration on MindSpace.
            </p>
          </div>
        </article>
      ) : null}
    </main>
  );
}
