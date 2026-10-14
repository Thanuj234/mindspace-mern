
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";

const emptyForm = {
  title: "",
  content: "",
  mood: "neutral",
  tags: "",
};

const moods = [
  { value: "neutral", label: "😐 Neutral" },
  { value: "happy", label: "😊 Happy" },
  { value: "grateful", label: "🙏 Grateful" },
  { value: "sad", label: "😔 Sad" },
  { value: "anxious", label: "😟 Anxious" },
  { value: "excited", label: "✨ Excited" },
  { value: "calm", label: "🌿 Calm" },
];

function getErrorMessage(error) {
  if (error.response?.status === 401) {
    return "Your session may have expired. Please log in again.";
  }

  return (
    error.response?.data?.message ||
    "Something went wrong. Please try again."
  );
}

export default function Journal() {
  const [journals, setJournals] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");

  const selectedJournal =
    journals.find((journal) => journal._id === selectedId) || null;

  const loadJournals = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await api.get("/journals");
      const data = Array.isArray(response.data) ? response.data : [];

      setJournals(data);
      setSelectedId((currentId) => {
        if (currentId && data.some((item) => item._id === currentId)) {
          return currentId;
        }

        return data[0]?._id || null;
      });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadJournals();
  }, [loadJournals]);

  useEffect(() => {
    if (!selectedJournal) {
      setForm(emptyForm);
      return;
    }

    setForm({
      title: selectedJournal.title || "",
      content: selectedJournal.content || "",
      mood: selectedJournal.mood || "neutral",
      tags: Array.isArray(selectedJournal.tags)
        ? selectedJournal.tags.join(", ")
        : "",
    });

    setNotice("");
  }, [selectedId, selectedJournal?._id]);

  function startNewEntry() {
    setSelectedId(null);
    setForm(emptyForm);
    setError("");
    setNotice("");
  }

  function updateField(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setNotice("");
  }

  async function handleSave(event) {
    event.preventDefault();
    setError("");
    setNotice("");

    const title = form.title.trim();
    const content = form.content.trim();

    if (!title || !content) {
      setError("Please enter both a title and your journal entry.");
      return;
    }

    const payload = {
      title,
      content,
      mood: form.mood,
      tags: [
        ...new Set(
          form.tags
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean)
        ),
      ],
    };

    setSaving(true);

    try {
      if (selectedId) {
        const response = await api.put(
          `/journals/${selectedId}`,
          payload
        );

        const updated = response.data;

        setJournals((current) =>
          current.map((item) =>
            item._id === selectedId ? updated : item
          )
        );
        setNotice("Your journal entry has been updated.");
      } else {
        const response = await api.post("/journals", payload);
        const created = response.data;

        setJournals((current) => [created, ...current]);
        setSelectedId(created._id);
        setNotice("Your journal entry has been saved.");
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!selectedId || !selectedJournal) return;

    const confirmed = window.confirm(
      `Delete "${selectedJournal.title}" permanently?`
    );

    if (!confirmed) return;

    setError("");
    setNotice("");

    try {
      await api.delete(`/journals/${selectedId}`);

      const remaining = journals.filter(
        (item) => item._id !== selectedId
      );

      setJournals(remaining);
      setSelectedId(remaining[0]?._id || null);
      setNotice("Journal entry deleted.");
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  const filteredJournals = journals.filter((journal) => {
    const query = search.toLowerCase();

    return (
      journal.title?.toLowerCase().includes(query) ||
      journal.content?.toLowerCase().includes(query) ||
      journal.tags?.some((tag) => tag.toLowerCase().includes(query))
    );
  });

  return (
    <div className="workspace">
      <aside className="sidebar">
        <Link className="brand sidebar-brand" to="/">
          <span className="brand-mark" aria-hidden="true">●</span>
          MindSpace
        </Link>

        <button
          type="button"
          className="dark-button new-entry-button"
          onClick={startNewEntry}
        >
          + New journal entry
        </button>

        <nav className="sidebar-nav" aria-label="Workspace navigation">
          <Link to="/dashboard">▦ &nbsp; Dashboard</Link>
          <Link className="active" to="/journal">▤ &nbsp; My Journals</Link>
          <Link to="/blogs">◎ &nbsp; Explore Blogs</Link>
          <Link to="/write">✎ &nbsp; Write a Blog</Link>
          <Link to="/ai">✧ &nbsp; AI Companion</Link>
          <Link to="/profile">♙ &nbsp; Profile</Link>
        </nav>

        <p className="sidebar-note">
          Your journals are private. Nothing is published without your choice.
        </p>
      </aside>

      <main className="workspace-main">
        <header className="workspace-topbar">
          <input
            className="journal-search"
            type="search"
            placeholder="Search your journals"
            aria-label="Search journals"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />

          <div className="workspace-top-actions">
            <button
              type="button"
              className="dark-button"
              onClick={startNewEntry}
            >
              + New entry
            </button>
            <Link className="light-button" to="/write">
              ✎ Write a blog
            </Link>
          </div>
        </header>

        <section className="journal-content">
          <div className="journal-heading">
            <div>
              <p className="section-label">YOUR PRIVATE SPACE</p>
              <h1>My Journals</h1>
              <p className="muted">
                A quiet place to collect your thoughts, one page at a time.
              </p>
            </div>
            <span className="entry-count">
              {journals.length} {journals.length === 1 ? "entry" : "entries"}
            </span>
          </div>

          {error && <p className="form-error" role="alert">{error}</p>}
          {notice && <p className="form-success" role="status">{notice}</p>}

          {loading ? (
            <p className="muted">Loading your journal entries...</p>
          ) : (
            <div className="journal-layout">
              <aside className="journal-list">
                <h2>Your entries</h2>

                {filteredJournals.length === 0 ? (
                  <p className="muted">
                    {search
                      ? "No entries match your search."
                      : "Your first page is waiting. Start writing whenever you're ready."}
                  </p>
                ) : (
                  filteredJournals.map((journal) => (
                    <button
                      type="button"
                      key={journal._id}
                      className={`journal-list-item ${
                        selectedId === journal._id ? "selected" : ""
                      }`}
                      onClick={() => {
                        setSelectedId(journal._id);
                        setError("");
                        setNotice("");
                      }}
                    >
                      <strong>{journal.title}</strong>
                      <span>
                        {journal.updatedAt
                          ? new Date(journal.updatedAt).toLocaleDateString()
                          : "Recently created"}
                      </span>
                      <small>
                        {(journal.content || "").slice(0, 85)}
                        {journal.content?.length > 85 ? "…" : ""}
                      </small>
                    </button>
                  ))
                )}
              </aside>

              <section className="journal-editor">
                <div className="editor-heading">
                  <div>
                    <p className="section-label">
                      {selectedId ? "YOUR JOURNAL ENTRY" : "NEW PRIVATE ENTRY"}
                    </p>
                    <h2>
                      {selectedId ? "Your thoughts, preserved." : "A fresh page"}
                    </h2>
                    <p className="muted">
                      Only you can read this entry through your account.
                    </p>
                  </div>

                  {selectedId && (
                    <button
                      type="button"
                      className="light-button delete-button"
                      onClick={handleDelete}
                    >
                      Delete
                    </button>
                  )}
                </div>

                <form className="journal-form" onSubmit={handleSave}>
                  <label htmlFor="journal-title">Title</label>
                  <input
                    id="journal-title"
                    name="title"
                    value={form.title}
                    onChange={updateField}
                    maxLength={150}
                    placeholder="Give this entry a name"
                    required
                  />

                  <label htmlFor="journal-content">Your entry</label>
                  <textarea
                    id="journal-content"
                    name="content"
                    value={form.content}
                    onChange={updateField}
                    maxLength={20000}
                    rows={12}
                    placeholder="What happened, what you noticed, what you would tell a friend..."
                    required
                  />

                  <div className="editor-meta">
                    <div>
                      <label htmlFor="journal-mood">Mood</label>
                      <select
                        id="journal-mood"
                        name="mood"
                        value={form.mood}
                        onChange={updateField}
                      >
                        {moods.map((mood) => (
                          <option key={mood.value} value={mood.value}>
                            {mood.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label htmlFor="journal-tags">Tags</label>
                      <input
                        id="journal-tags"
                        name="tags"
                        value={form.tags}
                        onChange={updateField}
                        placeholder="travel, learning, gratitude"
                      />
                      <small>Separate tags with commas.</small>
                    </div>
                  </div>

                  <div className="editor-footer">
                    <span className="muted">
                      {form.content.length}/20000 characters
                    </span>

                    <button
                      type="submit"
                      className="dark-button"
                      disabled={saving}
                    >
                      {saving
                        ? "Saving..."
                        : selectedId
                          ? "Save changes"
                          : "Save entry"}
                    </button>
                  </div>
                </form>
              </section>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
