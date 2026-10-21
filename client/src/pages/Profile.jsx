
import { useEffect, useMemo, useState } from "react";
import api from "../services/api";

const TABS = [
  { id: "about", label: "About you", icon: "♡" },
  { id: "timeline", label: "Life timeline", icon: "◷" },
  { id: "insights", label: "Private insights", icon: "✧" },
];

const EMPTY_PROFILE = {
  name: "",
  bio: "",
  location: "",
  profilePhoto: "",
  interests: [],
  isProfilePublic: false,
  privateGoals: [],
  yearlyReflection: "",
};

function dateValue(value) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}

function getArray(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.journals)) return data.journals;
  if (Array.isArray(data?.entries)) return data.entries;
  if (Array.isArray(data?.blogs)) return data.blogs;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

function StatCard({ label, value, note }) {
  return (
    <article className="profile-stat-card">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{note}</small>
    </article>
  );
}

export default function Profile() {
  const [tab, setTab] = useState("about");
  const [profile, setProfile] = useState(EMPTY_PROFILE);
  const [interestsText, setInterestsText] = useState("");
  const [goalsText, setGoalsText] = useState("");
  const [journals, setJournals] = useState([]);
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [publicPreview, setPublicPreview] = useState(false);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [category, setCategory] = useState("all");
  const [goalInput, setGoalInput] = useState("");
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState("");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  useEffect(() => {
    let active = true;

    async function loadProfile() {
      setLoading(true);
      setError("");

      try {
        const response = await api.get("/auth/profile");
        const user = response.data?.user || response.data || {};
        if (!active) return;

        const nextProfile = {
          ...EMPTY_PROFILE,
          name: user.name || "",
          bio: user.bio || "",
          location: user.location || "",
          profilePhoto: user.profilePhoto || "",
          interests: Array.isArray(user.interests) ? user.interests : [],
          isProfilePublic: Boolean(user.isProfilePublic),
          privateGoals: Array.isArray(user.privateGoals)
            ? user.privateGoals
            : [],
          yearlyReflection: user.yearlyReflection || "",
        };

        setProfile(nextProfile);
        setInterestsText(nextProfile.interests.join(", "));
        setGoalsText(nextProfile.privateGoals.join("\n"));
      } catch (err) {
        if (active) {
          setError(
            err.response?.data?.message ||
              "We couldn't load your profile. Please sign in again and retry."
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    
    async function loadTimeline() {
      try {
        const response = await api.get("/journals");
        if (active) setJournals(getArray(response.data));
      } catch {
        // The journal route may use a different endpoint in this project.
        if (active) setJournals([]);
      }

      try {
        const response = await api.get("/blogs/mine");
        if (active) setBlogs(getArray(response.data));
      } catch {
        if (active) setBlogs([]);
      }
    }

    loadProfile();
    loadTimeline();

    return () => {
      active = false;
    };
  }, []);

  function updateField(field, value) {
    setProfile((current) => ({ ...current, [field]: value }));
  }

  
async function saveProfile(event) {
  event?.preventDefault();
  setSaving(true);
  setError("");
  setNotice("");

  const interests = [
    ...new Set(
      interestsText
        .split(",")
        .map((interest) => interest.trim())
        .filter(Boolean)
    ),
  ];

  const privateGoals = goalsText
    .split("\n")
    .map((goal) => goal.trim())
    .filter(Boolean);

  const payload = {
    ...profile,
    interests,
    privateGoals,
    isProfilePublic: Boolean(profile.isProfilePublic),
  };

  try {
    const response = await api.put("/auth/profile", payload);
    const saved = response.data?.user || {};

    const nextProfile = {
      ...payload,
      ...saved,
      isProfilePublic:
        typeof saved.isProfilePublic === "boolean"
          ? saved.isProfilePublic
          : payload.isProfilePublic,
      interests: Array.isArray(saved.interests)
        ? saved.interests
        : interests,
      privateGoals: Array.isArray(saved.privateGoals)
        ? saved.privateGoals
        : privateGoals,
    };

    setProfile(nextProfile);
    setInterestsText(nextProfile.interests.join(", "));
    setGoalsText(nextProfile.privateGoals.join("\n"));

    const storedUser = JSON.parse(
      localStorage.getItem("user") || "{}"
    );

    localStorage.setItem(
      "user",
      JSON.stringify({
        ...storedUser,
        name: nextProfile.name,
        email: nextProfile.email || storedUser.email,
      })
    );

    setNotice(
      nextProfile.isProfilePublic
        ? "Your profile is now marked as public. ✨"
        : "Your profile is saved as private."
    );
  } catch (err) {
    setError(
      err.response?.data?.message ||
        "We couldn't save your changes. Please try again."
    );
  } finally {
    setSaving(false);
  }
}


  const timeline = useMemo(() => {
    const journalItems = journals.map((item) => ({
      ...item,
      timelineType: "journal",
      timelineLabel: "Journal entry",
      timelineDate: item.createdAt || item.updatedAt,
    }));

    const blogItems = blogs
      .filter((item) => item.status === "published")
      .map((item) => ({
        ...item,
        timelineType: "blog",
        timelineLabel: "Published story",
        timelineDate: item.createdAt || item.updatedAt,
      }));

    return [...journalItems, ...blogItems]
      .filter((item) => {
        const date = dateValue(item.timelineDate);
        if (fromDate && (!date || date < fromDate)) return false;
        if (toDate && (!date || date > toDate)) return false;

        if (category === "journal" && item.timelineType !== "journal") {
          return false;
        }
        if (category === "blog" && item.timelineType !== "blog") {
          return false;
        }

        return true;
      })
      .sort(
        (a, b) =>
          new Date(b.timelineDate || 0) - new Date(a.timelineDate || 0)
      );
  }, [journals, blogs, fromDate, toDate, category]);

  const publishedBlogs = blogs.filter(
    (blog) => blog.status === "published"
  );

  const currentYear = new Date().getFullYear();
  const yearItems = [
    ...journals.map((item) => ({
      ...item,
      statsDate: item.createdAt || item.updatedAt,
    })),
    ...publishedBlogs.map((item) => ({
      ...item,
      statsDate: item.createdAt || item.updatedAt,
    })),
  ].filter((item) => {
    const date = new Date(item.statsDate);
    return !Number.isNaN(date.getTime()) && date.getFullYear() === currentYear;
  });

  const monthCounts = Array.from({ length: 12 }, (_, month) => ({
    label: new Date(currentYear, month, 1).toLocaleDateString("en", {
      month: "short",
    }),
    count: yearItems.filter(
      (item) => new Date(item.statsDate).getMonth() === month
    ).length,
  }));

  const maxMonthCount = Math.max(1, ...monthCounts.map((month) => month.count));

  const recurringThemes = useMemo(() => {
    const counts = {};

    journals.forEach((journal) => {
      const values = [
        ...(Array.isArray(journal.tags) ? journal.tags : []),
        ...(Array.isArray(journal.interests) ? journal.interests : []),
      ];

      values.forEach((value) => {
        if (typeof value !== "string" || !value.trim()) return;
        const key = value.trim();
        counts[key] = (counts[key] || 0) + 1;
      });
    });

    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);
  }, [journals]);

  const visibleProfile = {
    name: profile.name || "Your name",
    bio: profile.bio,
    location: profile.location,
    profilePhoto: profile.profilePhoto,
    interests: profile.interests,
  };

  if (loading) {
    return (
      <section className="profile-page">
        <p className="profile-eyebrow">YOUR SPACE, YOUR STORY</p>
        <h1 className="profile-heading">Your profile</h1>
        <p className="profile-muted">Gathering your space together…</p>
      </section>
    );
  }
  
async function handlePhotoUpload() {
  if (!selectedPhoto) {
    setError("Please choose a photo first.");
    return;
  }

  if (!selectedPhoto.type.startsWith("image/")) {
    setError("Please select an image file.");
    return;
  }

  if (selectedPhoto.size > 8 * 1024 * 1024) {
    setError("Your photo must be 8 MB or smaller.");
    return;
  }

  setUploadingPhoto(true);
  setError("");
  setNotice("");

  try {
    const formData = new FormData();
    formData.append("file", selectedPhoto);
    formData.append("kind", "profile");

    const uploadResponse = await api.post(
      "/blogs/media/upload",
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );

    const photoUrl = uploadResponse.data?.file?.url;

    if (!photoUrl) {
      throw new Error("Cloudinary did not return a photo URL.");
    }

    const profileResponse = await api.put("/auth/profile", {
      profilePhoto: photoUrl,
    });

    const savedUser = profileResponse.data?.user;

    setProfile((current) => ({
      ...current,
      profilePhoto: savedUser?.profilePhoto || photoUrl,
    }));

    setSelectedPhoto(null);
    setPhotoPreview("");
    setNotice("Your profile photo has been uploaded and saved! ✨");
  } catch (err) {
    setError(
      err.response?.data?.message ||
        err.message ||
        "Unable to upload your photo. Please try again."
    );
  } finally {
    setUploadingPhoto(false);
  }
}

  return (
    <section className="profile-page">
      <div className="profile-page-header">
        <div>
          <p className="profile-eyebrow">YOUR SPACE, YOUR STORY</p>
          <h1 className="profile-heading">Your profile</h1>
          <p className="profile-subheading">
            A little space to reflect on who you are and how you're growing.
          </p>
        </div>

        <button
          type="button"
          className="profile-preview-button"
          onClick={() => setPublicPreview((current) => !current)}
        >
          {publicPreview ? "← Back to editing" : "View public profile ↗"}
        </button>
      </div>

      {error && <p className="profile-message profile-message-error">{error}</p>}
      {notice && <p className="profile-message profile-message-success">{notice}</p>}

      {publicPreview ? (
        <section className="profile-public-card">
          <div className="profile-public-cover" />
          <div className="profile-public-content">
            {visibleProfile.profilePhoto ? (
              <img
                className="profile-avatar profile-avatar-large"
                src={visibleProfile.profilePhoto}
                alt=""
              />
            ) : (
              <div className="profile-avatar profile-avatar-large">
                {(visibleProfile.name[0] || "M").toUpperCase()}
              </div>
            )}
            <p className="profile-eyebrow">A LITTLE ABOUT ME</p>
            <h2>{visibleProfile.name}</h2>
            {visibleProfile.location && (
              <p className="profile-muted">⌖ {visibleProfile.location}</p>
            )}
            <p className="profile-public-bio">
              {visibleProfile.bio || "This space is still being written."}
            </p>

            <h3>Things I love</h3>
            <div className="profile-chip-list">
              {visibleProfile.interests.length ? (
                visibleProfile.interests.map((interest) => (
                  <span className="profile-chip" key={interest}>
                    {interest}
                  </span>
                ))
              ) : (
                <span className="profile-muted">Interests coming soon</span>
              )}
            </div>

            {!profile.isProfilePublic && (
              <p className="profile-private-note">
                This is a preview only. Your profile is currently private.
              </p>
            )}
          </div>
        </section>
      ) : (
        <>
          <div className="profile-tabs" role="tablist" aria-label="Profile sections">
            {TABS.map((item) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={tab === item.id}
                className={`profile-tab ${tab === item.id ? "active" : ""}`}
                onClick={() => setTab(item.id)}
              >
                <span aria-hidden="true">{item.icon}</span>
                {item.label}
              </button>
            ))}
          </div>

          {tab === "about" && (
            <form className="profile-panel" onSubmit={saveProfile}>
              <div className="profile-panel-heading">
                <div>
                  <p className="profile-eyebrow">THE PERSON BEHIND THE PAGES</p>
                  <h2>About you</h2>
                  <p>Make this space feel a little more like you.</p>
                </div>
                <span className="profile-soft-icon">♡</span>
              </div>

              <div className="profile-avatar-row">
                {profile.profilePhoto ? (
                  <img
                    className="profile-avatar"
                    src={profile.profilePhoto}
                    alt="Profile preview"
                  />
                ) : (
                  <div className="profile-avatar">
                    {(profile.name[0] || "M").toUpperCase()}
                  </div>
                )}
                <div className="profile-avatar-fields">
  <strong>Your profile photo</strong>
  <p>Choose a photo from your device. JPG, PNG, or WebP images up to 8 MB.</p>

  <label className="profile-field-label" htmlFor="profilePhotoFile">
    Choose photo
  </label>

  <input
    id="profilePhotoFile"
    type="file"
    accept="image/jpeg,image/png,image/webp,image/gif"
    onChange={(event) => {
      const file = event.target.files?.[0];
      if (!file) return;

      setSelectedPhoto(file);
      setPhotoPreview(URL.createObjectURL(file));
      setError("");
      setNotice("");
    }}
  />

  {photoPreview && (
    <div className="profile-photo-preview">
      <img src={photoPreview} alt="Selected profile preview" />
      <button
        type="button"
        className="profile-secondary-button"
        onClick={() => {
          URL.revokeObjectURL(photoPreview);
          setPhotoPreview("");
          setSelectedPhoto(null);
        }}
      >
        Cancel selection
      </button>
    </div>
  )}

  <button
    type="button"
    className="profile-primary-button"
    onClick={handlePhotoUpload}
    disabled={!selectedPhoto || uploadingPhoto}
  >
    {uploadingPhoto ? "Uploading photo…" : "Upload and save photo"}
  </button>
</div>
              </div>

              <div className="profile-form-grid">
                <label className="profile-field">
                  <span>Display name</span>
                  <input
                    value={profile.name}
                    onChange={(event) => updateField("name", event.target.value)}
                    maxLength={80}
                    required
                    placeholder="What should we call you?"
                  />
                </label>

                <label className="profile-field">
                  <span>Location</span>
                  <input
                    value={profile.location}
                    onChange={(event) =>
                      updateField("location", event.target.value)
                    }
                    maxLength={120}
                    placeholder="City, country (optional)"
                  />
                </label>

                <label className="profile-field profile-field-full">
                  <span>A little about you</span>
                  <textarea
                    value={profile.bio}
                    onChange={(event) => updateField("bio", event.target.value)}
                    maxLength={500}
                    rows={4}
                    placeholder="What matters to you? What are you exploring lately?"
                  />
                  <small>{profile.bio.length}/500 characters</small>
                </label>

                <label className="profile-field profile-field-full">
                  <span>Your interests</span>
                  <input
                    value={interestsText}
                    onChange={(event) => setInterestsText(event.target.value)}
                    placeholder="Reading, art, nature, music…"
                  />
                  <small>Separate interests with commas.</small>
                </label>
              </div>

              <div className="profile-visibility-row">
                <div>
                  <strong>Profile visibility</strong>
                  <p>
                    {profile.isProfilePublic
                      ? "Your profile details can be shown publicly."
                      : "Only you can see your profile details."}
                  </p>
                </div>
                <label className="profile-switch">
                  <input
                    type="checkbox"
                    checked={profile.isProfilePublic}
                    onChange={(event) =>
                      updateField("isProfilePublic", event.target.checked)
                    }
                    aria-label="Make my profile public"
                  />
                  <span />
                </label>
              </div>

              <div className="profile-form-actions">
                <button className="profile-primary-button" type="submit" disabled={saving}>
                  {saving ? "Saving…" : "Save profile"}
                </button>
                <button
                  className="profile-secondary-button"
                  type="button"
                  onClick={() => setPublicPreview(true)}
                >
                  Preview profile
                </button>
              </div>
            </form>
          )}

          {tab === "timeline" && (
            <div className="profile-panel">
              <div className="profile-panel-heading">
                <div>
                  <p className="profile-eyebrow">LITTLE MOMENTS ADD UP</p>
                  <h2>Your life timeline</h2>
                  <p>Revisit the thoughts and stories you've captured.</p>
                </div>
                <span className="profile-soft-icon">◷</span>
              </div>

              <div className="profile-filters">
                <label className="profile-field">
                  <span>From</span>
                  <input
                    type="date"
                    value={fromDate}
                    onChange={(event) => setFromDate(event.target.value)}
                  />
                </label>
                <label className="profile-field">
                  <span>To</span>
                  <input
                    type="date"
                    value={toDate}
                    onChange={(event) => setToDate(event.target.value)}
                  />
                </label>
                <label className="profile-field">
                  <span>Category</span>
                  <select
                    value={category}
                    onChange={(event) => setCategory(event.target.value)}
                  >
                    <option value="all">Everything</option>
                    <option value="journal">Journal entries</option>
                    <option value="blog">Published stories</option>
                  </select>
                </label>
                <button
                  type="button"
                  className="profile-clear-button"
                  onClick={() => {
                    setFromDate("");
                    setToDate("");
                    setCategory("all");
                  }}
                >
                  Clear filters
                </button>
              </div>

              {timeline.length ? (
                <div className="profile-timeline">
                  {timeline.map((item) => (
                    <article
                      className="profile-timeline-item"
                      key={`${item.timelineType}-${item._id}`}
                    >
                      <div className="profile-timeline-marker" />
                      <div className="profile-timeline-card">
                        <div className="profile-timeline-meta">
                          <span className="profile-chip">
                            {item.timelineLabel}
                          </span>
                          <time>
                            {item.timelineDate
                              ? new Date(item.timelineDate).toLocaleDateString(
                                  undefined,
                                  {
                                    year: "numeric",
                                    month: "short",
                                    day: "numeric",
                                  }
                                )
                              : "Date unavailable"}
                          </time>
                        </div>
                        <h3>{item.title || "Untitled entry"}</h3>
                        <p>
                          {item.summary ||
                            (item.content || "").replace(/<[^>]*>/g, "").slice(0, 180) ||
                            "A moment from your MindSpace."}
                        </p>
                        {item.mood && (
                          <span className="profile-muted">Mood: {item.mood}</span>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="profile-empty-state">
                  <span>✧</span>
                  <h3>Your story is still unfolding</h3>
                  <p>
                    No entries match these filters. Try clearing them or add a
                    journal entry or published story.
                  </p>
                </div>
              )}
            </div>
          )}

          {tab === "insights" && (
            <div className="profile-insights">
              <div className="profile-panel-heading">
                <div>
                  <p className="profile-eyebrow">A GENTLE LOOK BACK</p>
                  <h2>Your private insights</h2>
                  <p>
                    A personal reflection on your writing, visible only to you.
                  </p>
                </div>
                <span className="profile-soft-icon">✧</span>
              </div>

              <div className="profile-stats-grid">
                <StatCard
                  label="Journal entries"
                  value={journals.length}
                  note="Moments you've captured"
                />
                <StatCard
                  label="Published stories"
                  value={publishedBlogs.length}
                  note="Stories shared with readers"
                />
                <StatCard
                  label="This year's writing"
                  value={yearItems.length}
                  note={`${currentYear} so far`}
                />
                <StatCard
                  label="Themes explored"
                  value={recurringThemes.length}
                  note="Based on journal tags"
                />
              </div>

              <section className="profile-panel profile-activity-panel">
                <div className="profile-section-title">
                  <div>
                    <h3>Monthly activity</h3>
                    <p>Your entries and published stories this year.</p>
                  </div>
                  <span>{currentYear}</span>
                </div>
                <div className="profile-month-chart">
                  {monthCounts.map((month) => (
                    <div className="profile-month-column" key={month.label}>
                      <span className="profile-month-count">{month.count || ""}</span>
                      <div className="profile-month-track">
                        <div
                          className="profile-month-bar"
                          style={{
                            height: `${Math.max(
                              month.count ? 8 : 0,
                              (month.count / maxMonthCount) * 100
                            )}%`,
                          }}
                        />
                      </div>
                      <span className="profile-month-label">{month.label}</span>
                    </div>
                  ))}
                </div>
              </section>

              <section className="profile-panel">
                <div className="profile-section-title">
                  <div>
                    <h3>Recurring themes</h3>
                    <p>Topics that appear in your journal tags.</p>
                  </div>
                </div>
                <div className="profile-chip-list">
                  {recurringThemes.length ? (
                    recurringThemes.map(([theme, count]) => (
                      <span className="profile-chip" key={theme}>
                        {theme} · {count}
                      </span>
                    ))
                  ) : (
                    <p className="profile-muted">
                      Add tags to your journal entries to discover recurring themes.
                    </p>
                  )}
                </div>
              </section>

              <form className="profile-panel" onSubmit={saveProfile}>
                <div className="profile-section-title">
                  <div>
                    <h3>Private goals</h3>
                    <p>Small intentions for your next chapter. Only you can see these.</p>
                  </div>
                  <span className="profile-soft-icon">♡</span>
                </div>
                <label className="profile-field">
                  <span>Your goals (one per line)</span>
                  <textarea
                    rows={4}
                    value={goalsText}
                    onChange={(event) => setGoalsText(event.target.value)}
                    placeholder={"Write a little each day\nMake more time for creativity"}
                  />
                </label>

                <label className="profile-field profile-reflection-field">
                  <span>Yearly reflection</span>
                  <textarea
                    rows={5}
                    maxLength={3000}
                    value={profile.yearlyReflection}
                    onChange={(event) =>
                      updateField("yearlyReflection", event.target.value)
                    }
                    placeholder="What did this year teach you? What are you proud of?"
                  />
                  <small>
                    {profile.yearlyReflection.length}/3000 characters
                  </small>
                </label>

                <div className="profile-form-actions">
                  <button className="profile-primary-button" type="submit" disabled={saving}>
                    {saving ? "Saving…" : "Save private insights"}
                  </button>
                </div>
              </form>

              <p className="profile-privacy-footnote">
                🔒 Your goals, reflection, and writing insights are private and
                are not included in your public profile preview.
              </p>
            </div>
          )}
        </>
      )}
    </section>
  );
}
