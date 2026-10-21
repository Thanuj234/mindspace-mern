import { Link } from "react-router-dom";
import { Clock3, Sprout, Heart, Palette, Compass, BookOpen, Image as ImageIcon } from "lucide-react";
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

export default function BlogCard({ story }) {
  const category = story.category || "General";
  const StoryIcon = categoryIcons[category] || BookOpen;
  const theme = categoryStyles[category] || "ms-story-art-default";
  const coverUrl = story.coverImage?.url;

  return (
    <Link
      to={`/blogs/${story._id}`}
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
  );
}
