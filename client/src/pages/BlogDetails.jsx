import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
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

  const [story, setStory] = useState(null);
  const [relatedStories, setRelatedStories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [requestError, setRequestError] = useState("");
  const [requestSuccess, setRequestSuccess] = useState("");

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
      <Link to="/blogs" className="ms-story-back-link">
        <ArrowLeft size={17} />
        Back to Explore Stories
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
          <Link to="/blogs" className="ms-story-action">
            Return to Explore
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
                    <Link className="ms-related-card" to={`/blogs/${item._id}`} key={item._id}>
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
