import { Link } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import api from "../services/api";
import "./dashboard.css";

function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem("user") || "{}");
  } catch {
    return {};
  }
}

function getGreeting() {
  const hour = new Date().getHours();

  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function getDayStreak(activities) {
  const activeDays = new Set(
    activities
      .filter((item) => item?.createdAt && !Number.isNaN(new Date(item.createdAt).getTime()))
      .map((item) => new Date(item.createdAt).toDateString())
  );

  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const current = activeDays.has(today.toDateString())
    ? today
    : yesterday;

  if (!activeDays.has(current.toDateString())) return 0;

  let streak = 0;
  const date = new Date(current);

  while (activeDays.has(date.toDateString())) {
    streak += 1;
    date.setDate(date.getDate() - 1);
  }

  return streak;
}

function getItemTitle(item, type) {
  return (
    item?.title ||
    item?.prompt ||
    (type === "journal" ? "Untitled journal entry" : "Untitled story")
  );
}

function getItemPreview(item) {
  const text = item?.content || item?.body || item?.text || item?.excerpt || "";
  return String(text).replace(/\s+/g, " ").trim();
}

function formatDate(value) {
  if (!value) return "Date unavailable";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date unavailable";

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: date.getFullYear() === new Date().getFullYear() ? undefined : "numeric",
  });
}

function getResponseItems(response) {
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.data?.journals)) return response.data.journals;
  if (Array.isArray(response?.data?.stories)) return response.data.stories;
  if (Array.isArray(response?.data?.blogs)) return response.data.blogs;
  if (Array.isArray(response?.data?.data)) return response.data.data;
  return [];
}

export default function Dashboard() {
  const [journals, setJournals] = useState([]);
  const [stories, setStories] = useState([]);
  const [statsLoading, setStatsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const user = getStoredUser();
  const displayName =
    user.name || user.email?.split("@")[0] || "there";


  useEffect(() => {
    let cancelled = false;

    async function loadDashboardData() {
      setStatsLoading(true);
      setLoadError("");

      const [journalResult, storyResult] = await Promise.allSettled([
        api.get("/journals"),
        api.get("/blogs/mine"),
      ]);

      if (cancelled) return;

      if (journalResult.status === "fulfilled") {
        setJournals(getResponseItems(journalResult.value));
      } else {
        setJournals([]);
        console.error("Unable to load dashboard journals:", journalResult.reason);
      }

      if (storyResult.status === "fulfilled") {
        setStories(getResponseItems(storyResult.value));
      } else {
        setStories([]);
        console.error("Unable to load dashboard stories:", storyResult.reason);
      }

      if (
        journalResult.status === "rejected" &&
        storyResult.status === "rejected"
      ) {
        setLoadError("We couldn't load your activity right now. Please refresh to try again.");
      }

      setStatsLoading(false);
    }

    loadDashboardData();

    return () => {
      cancelled = true;
    };
  }, []);

  const now = new Date();

  const isThisMonth = (item) => {
    if (!item?.createdAt) return false;
    const date = new Date(item.createdAt);

    return (
      !Number.isNaN(date.getTime()) &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear()
    );
  };

  const activities = useMemo(() => {
    const journalItems = journals.map((item) => ({
      ...item,
      _activityType: "journal",
    }));
    const storyItems = stories.map((item) => ({
      ...item,
      _activityType: "story",
    }));

    return [...journalItems, ...storyItems]
      .filter((item) => item.createdAt && !Number.isNaN(new Date(item.createdAt).getTime()))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [journals, stories]);

  const entriesThisMonth = [...journals, ...stories].filter(isThisMonth).length;

  const publishedStories = stories.filter(
    (story) => story.status === "published" || story.published === true
  ).length;

  const dayStreak = getDayStreak(activities);
  const recentActivities = activities.slice(0, 4);

  const stats = [
    {
      title: "JOURNAL ENTRIES",
      value: journals.length,
      description: "Private thoughts saved",
      to: "/journal",
      icon: "✎",
      tone: "lavender",
    },
    {
      title: "CREATED THIS MONTH",
      value: entriesThisMonth,
      description: "Entries and stories",
      to: "/journal",
      icon: "✦",
      tone: "mint",
    },
    {
      title: "PUBLISHED STORIES",
      value: publishedStories,
      description: "Stories shared with others",
      to: "/my-stories",
      icon: "↗",
      tone: "peach",
    },
    {
      title: "WRITING STREAK",
      value: `${dayStreak} ${dayStreak === 1 ? "day" : "days"}`,
      description: "Consecutive active days",
      to: "/journal",
      icon: "☼",
      tone: "rose",
    },
  ];

  return (
    <div className="dashboard-page">
      <section className="dashboard-welcome">
        <div className="dashboard-welcome-copy">
          <span className="dashboard-eyebrow">
            {now.toLocaleDateString("en-US", {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </span>

          <h1>
            {getGreeting()}, <span>{displayName}</span>
          </h1>

          <p>
            Take a breath, gather your thoughts, and make a little space for
            yourself today.
          </p>

          <div className="dashboard-welcome-actions">
            <Link className="dashboard-button dashboard-button-dark" to="/journal">
              <span aria-hidden="true">＋</span> New journal entry
            </Link>
            <Link className="dashboard-button dashboard-button-light" to="/write">
              <span aria-hidden="true">✧</span> Create a story
            </Link>
          </div>
        </div>

        <div className="dashboard-welcome-art" aria-hidden="true">
          <div className="dashboard-art-orbit dashboard-art-orbit-one" />
          <div className="dashboard-art-orbit dashboard-art-orbit-two" />
          <div className="dashboard-art-note">
            <span className="dashboard-art-sparkle">✳</span>
            <span className="dashboard-art-note-label">A gentle reminder</span>
            <strong>You can grow at your own pace.</strong>
            <span className="dashboard-art-note-line" />
            <span className="dashboard-art-note-footer">Your thoughts. Your space.</span>
          </div>
        </div>
      </section>

      <section className="dashboard-stats-section" aria-label="Your writing statistics">
        <div className="dashboard-section-heading">
          <div>
            <span className="dashboard-eyebrow">YOUR JOURNEY</span>
            <h2>A little progress adds up</h2>
          </div>
          <p>Your writing, at a glance</p>
        </div>

        <div className="dashboard-stats-grid">
          {stats.map((stat) => (
            <Link
              to={stat.to}
              className="dashboard-stat-card"
              key={stat.title}
            >
              <div className="dashboard-stat-topline">
                <span className={`dashboard-stat-icon ${stat.tone}`} aria-hidden="true">
                  {stat.icon}
                </span>
                <span className="dashboard-stat-arrow" aria-hidden="true">↗</span>
              </div>
              <span className="dashboard-stat-label">{stat.title}</span>
              <strong className="dashboard-stat-value">
                {statsLoading ? <span className="dashboard-stat-loading">…</span> : stat.value}
              </strong>
              <span className="dashboard-stat-description">{stat.description}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="dashboard-lower-grid">
        <article className="dashboard-card dashboard-recent-card">
          <div className="dashboard-card-heading">
            <div>
              <span className="dashboard-eyebrow">PICK UP WHERE YOU LEFT OFF</span>
              <h2>Recent activity</h2>
            </div>
            <Link className="dashboard-text-link" to="/journal">Open journal <span aria-hidden="true">↗</span></Link>
          </div>

          {loadError && (
            <div className="dashboard-inline-message" role="status">
              {loadError}
            </div>
          )}

          {statsLoading ? (
            <div className="dashboard-activity-empty">
              <span className="dashboard-empty-symbol" aria-hidden="true">◌</span>
              <p>Gathering your latest activity…</p>
            </div>
          ) : recentActivities.length > 0 ? (
            <div className="dashboard-activity-list">
              {recentActivities.map((item, index) => {
                const isStory = item._activityType === "story";
                const destination = isStory
                  ? item._id
                    ? `/blogs/${item._id}`
                    : "/my-stories"
                  : "/journal";

                return (
                  <Link
                    className="dashboard-activity-item"
                    to={destination}
                    key={`${item._activityType}-${item._id || item.createdAt}-${index}`}
                  >
                    <span className={`dashboard-activity-icon ${isStory ? "story" : "journal"}`} aria-hidden="true">
                      {isStory ? "✧" : "✎"}
                    </span>
                    <span className="dashboard-activity-copy">
                      <strong>{getItemTitle(item, item._activityType)}</strong>
                      <span>{getItemPreview(item) || (isStory ? "A story in progress" : "A moment captured in your journal")}</span>
                    </span>
                    <span className="dashboard-activity-meta">
                      <span className={`dashboard-activity-type ${isStory ? "story" : "journal"}`}>
                        {isStory ? "Story" : "Journal"}
                      </span>
                      <time>{formatDate(item.createdAt)}</time>
                    </span>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="dashboard-activity-empty">
              <span className="dashboard-empty-symbol" aria-hidden="true">✎</span>
              <h3>Your story starts here</h3>
              <p>
                Your latest entries and stories will appear here as you create
                them. No rush — start whenever you feel ready.
              </p>
              <Link className="dashboard-button dashboard-button-dark" to="/journal">
                Write a journal entry
              </Link>
            </div>
          )}
        </article>

        <aside className="dashboard-card dashboard-quick-card">
          <span className="dashboard-eyebrow">MAKE SPACE FOR YOU</span>
          <h2>What feels right today?</h2>
          <p className="dashboard-quick-intro">
            There is no one right way to begin. Choose what you need.
          </p>

          <div className="dashboard-quick-links">
            <Link to="/journal" className="dashboard-quick-link">
              <span className="dashboard-quick-icon lavender" aria-hidden="true">✎</span>
              <span>
                <strong>Private journal</strong>
                <small>Reflect without pressure</small>
              </span>
              <span className="dashboard-quick-arrow" aria-hidden="true">↗</span>
            </Link>

            <Link to="/write" className="dashboard-quick-link">
              <span className="dashboard-quick-icon mint" aria-hidden="true">✧</span>
              <span>
                <strong>Create a story</strong>
                <small>Share an idea with others</small>
              </span>
              <span className="dashboard-quick-arrow" aria-hidden="true">↗</span>
            </Link>

            <Link to="/collaborations" className="dashboard-quick-link">
              <span className="dashboard-quick-icon rose" aria-hidden="true">♡</span>
              <span>
                <strong>Collaborations</strong>
                <small>Create something together</small>
              </span>
              <span className="dashboard-quick-arrow" aria-hidden="true">↗</span>
            </Link>
          </div>

          <div className="dashboard-privacy-note">
            <span aria-hidden="true">♡</span>
            <p>Your private journal is yours alone. Share only what feels right.</p>
          </div>
        </aside>
      </section>
    </div>
  );
}
