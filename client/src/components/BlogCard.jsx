import { Link } from "react-router-dom";
import { useState } from "react";
import { Clock3, Sprout, Heart, Palette, Compass, BookOpen, UserPlus, UserCheck } from "lucide-react";
import api from "../services/api";
import "./explore-stories.css";

const categoryStyles = {
  "Personal growth": "ms-story-art-growth",
  Creativity: "ms-story-art-creative",
  "Life lessons": "ms-story-art-lessons",
  Wellbeing: "ms-story-art-wellbeing",
};

const categoryIcons = {
  "Personal growth": Sprout,
  Creativity: Palette,
  "Life lessons": Compass,
  Wellbeing: Heart,
};

function getAuthorName(author) {
  if (author && typeof author === "object") {
    return author.name || "MindSpace Community";
  }
  return "MindSpace Community";
}

function getReadTime(content = "") {
  const plainText = content.replace(/<[^>]*>/g, " ").trim();
  const words = plainText.split(/\s+/).filter(Boolean).length;
  return `${Math.max(1, Math.ceil(words / 200))} min read`;
}

function getExcerpt(story) {
  const text = (story.summary || story.content || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return text.length > 150 ? `${text.slice(0, 150).trim()}…` : text;
}

export default function BlogCard({ story, source = "explore", followingIds = [], currentUserId = "", onFollowChange }) {
  const [followLoading, setFollowLoading] = useState(false);
  const [followError, setFollowError] = useState("");
  const category = story.category || "General";
  const StoryIcon = categoryIcons[category] || BookOpen;
  const theme = categoryStyles[category] || "ms-story-art-default";
  const coverUrl = story.coverImage?.url;
  const authorId = story.authorId && typeof story.authorId === "object" ? String(story.authorId._id || "") : "";
  const isFollowing = authorId && followingIds.includes(authorId);
  const canFollow = Boolean(localStorage.getItem("token") && authorId && authorId !== currentUserId);

  async function toggleFollow(event) {
    event.preventDefault();
    event.stopPropagation();
    if (!canFollow || followLoading) return;
    setFollowLoading(true);
    setFollowError("");
    try {
      if (isFollowing) await api.delete(`/users/${authorId}/follow`);
      else await api.post(`/users/${authorId}/follow`);
      onFollowChange?.(authorId, !isFollowing);
    } catch (error) {
      setFollowError(error.response?.data?.message || "Couldn't update follow status.");
    } finally {
      setFollowLoading(false);
    }
  }

  return (
    <div className="ms-story-card-shell">
      <Link
        to={`/blogs/${story._id}?from=${source}`} state={{ from: source }}
        className="ms-story-card-link"
        aria-label={`Read story: ${story.title || "Untitled story"}`}
      >
      <article className="ms-story-card">
        <div className={`ms-story-cover ${coverUrl ? "has-image" : theme}`}>
          {coverUrl ? (
            <img
              src={coverUrl}
              alt=""
              loading="lazy"
              onError={(event) => {
                event.currentTarget.style.display = "none";
                event.currentTarget.parentElement.classList.remove("has-image");
                event.currentTarget.parentElement.classList.add("ms-story-art-default");
              }}
            />
          ) : (
            <StoryIcon size={34} strokeWidth={1.45} aria-hidden="true" />
          )}
          <span className="ms-story-cover-category">{category}</span>
        </div>

        <div className="ms-story-card-content">
          <h3>{story.title || "A story from the community"}</h3>
          <p className="ms-story-excerpt">{getExcerpt(story) || "A little moment worth sharing."}</p>

          {Array.isArray(story.tags) && story.tags.length > 0 && (
            <div className="ms-story-tags">
              {story.tags.slice(0, 3).map((tag) => (
                <span key={tag}>{tag}</span>
              ))}
            </div>
          )}

          <div className="ms-story-card-footer">
            <span className="ms-story-author">{getAuthorName(story.authorId)}</span>
            <span className="ms-story-read-time">
              <Clock3 size={14} aria-hidden="true" />
              {getReadTime(story.content || "")}
            </span>
          </div>
        </div>
      </article>
      </Link>
      {canFollow && (
        <div className="ms-story-follow-row">
          <button type="button" className={isFollowing ? "ms-follow-button following" : "ms-follow-button"} onClick={toggleFollow} disabled={followLoading}>
            {isFollowing ? <UserCheck size={15} /> : <UserPlus size={15} />}
            {followLoading ? "Updating…" : isFollowing ? "Following" : "Follow author"}
          </button>
          {followError && <span className="ms-follow-error" role="status">{followError}</span>}
        </div>
      )}
    </div>
  );
}
