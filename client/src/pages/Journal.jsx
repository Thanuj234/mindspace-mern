import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { BookOpen, CalendarDays, Clock3, List, Plus, Search, PenLine, Heart, Image as ImageIcon, ChevronLeft, ChevronRight } from "lucide-react";
import api from "../services/api";
import "./journal-upgrade.css";

const getDate = (j) => {
  const d = new Date(j.updatedAt || j.createdAt || 0);
  return Number.isNaN(d.getTime()) ? new Date(0) : d;
};
const plain = (value = "") => String(value).replace(/<[^>]*>/g, " ").replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/\s+/g, " ").trim();

export default function Journal() {
  const navigate = useNavigate();
  const location = useLocation();
  const [journals, setJournals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [sort, setSort] = useState("newest");
  const [view, setView] = useState("list");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [month, setMonth] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });

  async function load() {
    setLoading(true); setError("");
    try { const response = await api.get("/journals"); setJournals(Array.isArray(response.data) ? response.data : []); }
    catch (err) { setError(err.response?.data?.message || "Couldn't load your journals. Please try again."); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  const categories = useMemo(() => [...new Set(journals.flatMap((j) => Array.isArray(j.tags) ? j.tags : []).filter(Boolean))].sort(), [journals]);
  const filtered = useMemo(() => journals.filter((j) => {
    const tags = Array.isArray(j.tags) ? j.tags : [];
    const q = search.trim().toLowerCase();
    return (!q || String(j.title || "").toLowerCase().includes(q) || plain(j.content).toLowerCase().includes(q) || tags.some((t) => String(t).toLowerCase().includes(q))) &&
      (category === "all" || tags.includes(category)) && (!favoritesOnly || Boolean(j.isFavorite));
  }).sort((a, b) => (sort === "oldest" ? 1 : -1) * (getDate(a) - getDate(b))), [journals, search, category, sort, favoritesOnly]);

  const firstDay = new Date(month.getFullYear(), month.getMonth(), 1).getDay();
  const dayCount = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells = [...Array(firstDay).fill(null), ...Array.from({ length: dayCount }, (_, i) => i + 1)];
  const monthTitle = month.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  const open = (j) => navigate(`/journal/${j._id}/edit`);

  function card(j, compact = false) {
    const d = getDate(j); const content = plain(j.content);
    return <article className={`journal-library-card ${compact ? "journal-library-card-compact" : ""}`} key={j._id}>
      {j.images?.length > 0 && <div className="journal-card-image-strip"><ImageIcon size={14} /> {j.images.length} {j.images.length === 1 ? "photo" : "photos"} attached</div>}
      <div className="journal-card-top"><span className={`journal-card-mood mood-${String(j.mood || "neutral").toLowerCase()}`}>{j.mood || "neutral"}</span><div className="journal-card-top-right">{j.isFavorite && <Heart size={15} fill="currentColor" aria-label="Favourite" />}<time>{d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</time></div></div>
      <button className="journal-card-title-button" type="button" onClick={() => open(j)}><h2>{j.title || "Untitled entry"}</h2></button>
      {!compact && <p>{content.slice(0, 180) || "No text preview available."}{content.length > 180 ? "…" : ""}</p>}
      {!!j.tags?.length && <div className="journal-card-tags">{j.tags.map((tag) => <span key={tag}>{tag}</span>)}</div>}
      <button type="button" className="journal-card-open" onClick={() => open(j)}><PenLine size={14} /> Open entry</button>
    </article>;
  }

  const grouped = Object.values(filtered.reduce((acc, j) => { const d = getDate(j); const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`; if (!acc[key]) acc[key] = { date: d, items: [] }; acc[key].items.push(j); return acc; }, {})).sort((a, b) => b.date - a.date);

  return <section className="journal-content journal-library-page">
    <div className="journal-heading library-heading"><div><p className="section-label">PRIVATE BY DEFAULT</p><h1>My Journals</h1><p className="muted">Everything here is visible only to you. Search it, filter it, or revisit a day at a time.</p></div><Link className="dark-button" to="/journal/new"><Plus size={17} /> New entry</Link></div>
    {location.state?.notice && <p className="form-success journal-page-notice" role="status">{location.state.notice}</p>}
    <div className="journal-library-controls">
      <label className="library-search"><Search size={18} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search titles, words, or tags…" aria-label="Search journal entries" /></label>
      <div className="library-view-switch" aria-label="Journal view"><button type="button" className={view === "list" ? "active" : ""} onClick={() => setView("list")}><List size={15} /> List</button><button type="button" className={view === "calendar" ? "active" : ""} onClick={() => setView("calendar")}><CalendarDays size={15} /> Calendar</button><button type="button" className={view === "timeline" ? "active" : ""} onClick={() => setView("timeline")}><Clock3 size={15} /> Timeline</button></div>
      <div className="library-filters"><select value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Filter by tag"><option value="all">All categories</option>{categories.map((tag) => <option key={tag} value={tag}>{tag}</option>)}</select><select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort entries"><option value="newest">Newest first</option><option value="oldest">Oldest first</option></select><button type="button" className={`journal-favorites-filter ${favoritesOnly ? "active" : ""}`} onClick={() => setFavoritesOnly((v) => !v)} aria-pressed={favoritesOnly}><Heart size={15} fill={favoritesOnly ? "currentColor" : "none"} /> Favorites</button><span className="library-count">{filtered.length} of {journals.length} entries</span></div>
    </div>
    {error && <div className="journal-error-panel" role="alert"><p>{error}</p><button type="button" className="light-button" onClick={load}>Try again</button></div>}
    {loading ? <div className="journal-empty-card"><p className="muted">Loading your journal entries…</p></div> : !filtered.length ? <div className="journal-empty-card"><div className="journal-empty-icon"><BookOpen size={24} /></div><h2>{journals.length ? "No entries found" : "Your journal is empty for now"}</h2><p>{journals.length ? "Try another search or filter, or create a fresh entry." : "Write about today — where you went, what you learned, how it felt. It stays private."}</p><Link className="dark-button" to="/journal/new"><Plus size={17} /> Write an entry</Link></div>
      : view === "calendar" ? <div className="journal-calendar"><div className="journal-calendar-heading"><button type="button" className="journal-calendar-nav" aria-label="Previous month" onClick={() => setMonth((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))}><ChevronLeft size={18} /></button><h2>{monthTitle}</h2><button type="button" className="journal-calendar-nav" aria-label="Next month" onClick={() => setMonth((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))}><ChevronRight size={18} /></button></div><div className="journal-calendar-grid">{["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => <span className="journal-calendar-weekday" key={day}>{day}</span>)}{cells.map((day, i) => { const items = day ? filtered.filter((j) => { const d = getDate(j); return d.getFullYear() === month.getFullYear() && d.getMonth() === month.getMonth() && d.getDate() === day; }) : []; return <div className={`journal-calendar-cell ${day ? "" : "empty"} ${items.length ? "has-entries" : ""}`} key={`${monthTitle}-${i}`}>{day && <><span className="journal-calendar-day">{day}</span>{items.slice(0, 2).map((j) => <button className="journal-calendar-entry" type="button" key={j._id} onClick={() => open(j)} title={j.title}>{j.title || "Untitled"}</button>)}{items.length > 2 && <small>+{items.length - 2} more</small>}</>}</div>; })}</div><p className="journal-calendar-help">Select an entry title to open it.</p></div>
      : view === "timeline" ? <div className="journal-timeline">{grouped.map((g) => <section className="journal-timeline-day" key={g.date.toISOString()}><div className="journal-timeline-date"><span>{g.date.toLocaleDateString(undefined, { day: "2-digit" })}</span><div><strong>{g.date.toLocaleDateString(undefined, { month: "long", year: "numeric" })}</strong><small>{g.date.toLocaleDateString(undefined, { weekday: "long" })}</small></div></div><div className="journal-timeline-entries">{g.items.map((j) => card(j, true))}</div></section>)}</div>
      : <div className="journal-library-list">{filtered.map((j) => card(j))}</div>}
  </section>;
}
