import { useEffect, useMemo, useRef, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import api from "../services/api";
import "./WorkspaceLayout.css";
import AskYourMemoryWidget from "./AIChat";

const menuItems = [
  { label: "Dashboard", icon: "▦", to: "/dashboard" },
  { label: "My Journals", icon: "▤", to: "/journal" },
  { label: "Explore Stories", icon: "◎", to: "/blogs" },
  { label: "Collaborations", icon: "♧", to: "/collaborations" },
  { label: "My Stories", icon: "▧", to: "/my-stories" },
  { label: "Profile", icon: "♙", to: "/profile" },
];

function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem("user") || "{}");
  } catch {
    return {};
  }
}

function unwrapList(response, keys) {
  if (Array.isArray(response?.data)) return response.data;

  for (const key of keys) {
    if (Array.isArray(response?.data?.[key])) return response.data[key];
  }

  if (Array.isArray(response?.data?.data)) return response.data.data;
  return [];
}

function normalize(value) {
  return String(value || "").toLocaleLowerCase().trim();
}

function getPreview(item) {
  const content = item?.content || item?.body || item?.text || item?.excerpt || "";
  return String(content).replace(/\s+/g, " ").trim();
}

export default function WorkspaceLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const searchRef = useRef(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [query, setQuery] = useState("");
  const [journals, setJournals] = useState([]);
  const [stories, setStories] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchLoaded, setSearchLoaded] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const user = getStoredUser();

  const displayName =
    user.name ||
    user.username ||
    user.email?.split("@")[0] ||
    "My profile";

  const initials = displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "U";

  useEffect(() => {
    function handlePointerDown(event) {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setSearchOpen(false);
      }
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setSearchOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  useEffect(() => {
    setSearchOpen(false);
  }, [location.pathname]);

  async function loadSearchData() {
    if (searchLoaded || searchLoading) return;

    setSearchLoading(true);
    setSearchError("");

    const [journalResult, storyResult] = await Promise.allSettled([
      api.get("/journals"),
      api.get("/blogs/mine"),
    ]);

    if (journalResult.status === "fulfilled") {
      setJournals(unwrapList(journalResult.value, ["journals"]));
    }

    if (storyResult.status === "fulfilled") {
      setStories(unwrapList(storyResult.value, ["stories", "blogs"]));
    }

    if (
      journalResult.status === "rejected" &&
      storyResult.status === "rejected"
    ) {
      setSearchError("Search is temporarily unavailable. Please try again.");
    } else if (journalResult.status === "rejected" || storyResult.status === "rejected") {
      setSearchError("Some results couldn't be loaded.");
    }

    setSearchLoaded(true);
    setSearchLoading(false);
  }

  const searchResults = useMemo(() => {
    const needle = normalize(query);
    if (!needle) return [];

    const journalResults = journals
      .filter((item) => {
        const tags = Array.isArray(item.tags) ? item.tags.join(" ") : item.tags;
        const haystack = normalize(`${item.title || ""} ${item.content || ""} ${tags || ""}`);
        return haystack.includes(needle);
      })
      .map((item) => ({
        id: item._id || `${item.title}-${item.createdAt}`,
        title: item.title || "Untitled journal entry",
        preview: getPreview(item) || "Private journal entry",
        kind: "Journal",
        icon: "✎",
        to: "/journal",
        createdAt: item.updatedAt || item.createdAt,
      }));

    const storyResults = stories
      .filter((item) => {
        const tags = Array.isArray(item.tags) ? item.tags.join(" ") : item.tags;
        const haystack = normalize(`${item.title || ""} ${item.content || ""} ${item.excerpt || ""} ${tags || ""}`);
        return haystack.includes(needle);
      })
      .map((item) => ({
        id: item._id || `${item.title}-${item.createdAt}`,
        title: item.title || "Untitled story",
        preview: getPreview(item) || "Your story",
        kind: "Story",
        icon: "✧",
        // Route to the author's story list so drafts and published items remain accessible.
        to: "/my-stories",
        createdAt: item.updatedAt || item.createdAt,
      }));

    return [...journalResults, ...storyResults]
      .sort((a, b) => {
        const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bTime - aTime;
      })
      .slice(0, 8);
  }, [journals, stories, query]);

  function handleSearchChange(event) {
    setQuery(event.target.value);
    setSearchOpen(true);
    if (!searchLoaded && !searchLoading) loadSearchData();
  }

  function handleSearchFocus() {
    setSearchOpen(true);
    if (!searchLoaded && !searchLoading) loadSearchData();
  }

  function handleLogout() {
    if (loggingOut) return;

    setLoggingOut(true);
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/", { replace: true });
  }

  function handleSearchSubmit(event) {
    event.preventDefault();
    if (!query.trim()) return;
    setSearchOpen(true);

    if (searchResults.length > 0) {
      navigate(searchResults[0].to);
      setSearchOpen(false);
    } else {
      loadSearchData();
    }
  }

  return (
    <main className="workspace-shell">
      <aside className="workspace-sidebar">
        <Link className="workspace-brand" to="/" aria-label="MindSpace home">
          <span className="workspace-brand-mark" aria-hidden="true">●</span>
          MindSpace
        </Link>

        <Link className="workspace-new-entry" to="/journal/new">
          + New journal entry
        </Link>

        <nav className="workspace-menu" aria-label="Workspace navigation">
          {menuItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/dashboard" || item.to === "/journal"}
              className={({ isActive }) =>
                `workspace-menu-link${isActive ? " active" : ""}`
              }
            >
              <span aria-hidden="true">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <p className="workspace-sidebar-note">
          Your journals are private. Nothing is published without your review.
        </p>
      </aside>

      <section className="workspace-main">
        <header className="workspace-toolbar">
          <div className="workspace-search-wrap" ref={searchRef}>
            <form className="workspace-search-form" onSubmit={handleSearchSubmit} role="search">
              <span className="workspace-search-icon" aria-hidden="true">⌕</span>
              <input
                className="workspace-search-input"
                type="search"
                value={query}
                onChange={handleSearchChange}
                onFocus={handleSearchFocus}
                placeholder="Search your journals and stories"
                aria-label="Search your journals and stories"
                aria-expanded={searchOpen}
                aria-controls="workspace-search-results"
                autoComplete="off"
              />
              {query && (
                <button
                  type="button"
                  className="workspace-search-clear"
                  aria-label="Clear search"
                  onClick={() => {
                    setQuery("");
                    setSearchOpen(true);
                  }}
                >
                  ×
                </button>
              )}
            </form>

            {searchOpen && query.trim() && (
              <div className="workspace-search-dropdown" id="workspace-search-results">
                {searchLoading ? (
                  <p className="workspace-search-status">Searching your space…</p>
                ) : searchError && !searchLoaded ? (
                  <div className="workspace-search-status">
                    <p>{searchError}</p>
                    <button type="button" onClick={() => { setSearchLoaded(false); loadSearchData(); }}>
                      Try again
                    </button>
                  </div>
                ) : searchResults.length > 0 ? (
                  <>
                    <p className="workspace-search-heading">MATCHING YOUR SPACE</p>
                    {searchResults.map((result) => (
                      <button
                        type="button"
                        className="workspace-search-result"
                        key={`${result.kind}-${result.id}`}
                        onClick={() => {
                          navigate(result.to);
                          setSearchOpen(false);
                        }}
                      >
                        <span className={`workspace-search-result-icon ${result.kind.toLowerCase()}`} aria-hidden="true">
                          {result.icon}
                        </span>
                        <span className="workspace-search-result-copy">
                          <strong>{result.title}</strong>
                          <small>{result.preview}</small>
                        </span>
                        <span className="workspace-search-result-kind">{result.kind}</span>
                      </button>
                    ))}
                    {searchResults.length === 8 && (
                      <p className="workspace-search-footer">Showing the first 8 matches</p>
                    )}
                  </>
                ) : (
                  <div className="workspace-search-status">
                    <strong>No matches found</strong>
                    <p>Try another title, phrase, or tag.</p>
                    {searchError && <small>{searchError}</small>}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="workspace-toolbar-actions">
            <Link className="workspace-dark-button" to="/journal/new">
              + New entry
            </Link>

            <Link className="workspace-light-button" to="/write">
              ✎ Write
            </Link>

            <Link
              className="workspace-avatar"
              to="/profile"
              aria-label={`Open profile for ${displayName}`}
              title={displayName}
            >
              <span className="workspace-avatar-initials">{initials}</span>
              <span className="workspace-avatar-name">{displayName}</span>
            </Link>

            <button
              type="button"
              className="workspace-toolbar-logout"
              onClick={handleLogout}
              disabled={loggingOut}
            >
              {loggingOut ? "Logging out…" : "Log out"}
            </button>
          </div>
        </header>

        <div className="workspace-content">
          <Outlet />
        </div>
      </section>
      <AskYourMemoryWidget />
    </main>
  );
}
