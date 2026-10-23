import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { BookOpen, Users, Heart, MessageCircle, Bookmark, LockKeyhole } from "lucide-react";
import api from "../services/api";
import "../components/explore-stories.css";

export default function PublicProfile() {
  const { id } = useParams();
  const [profile, setProfile] = useState(null);
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isPrivate, setIsPrivate] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true); setError(""); setIsPrivate(false);
    api.get(`/users/${id}/profile`)
      .then(({ data }) => {
        if (!active) return;
        setProfile(data.profile || null);
        setStories(Array.isArray(data.stories) ? data.stories : []);
      })
      .catch((err) => {
        if (!active) return;
        if (err.response?.status === 403 || err.response?.data?.private) setIsPrivate(true);
        else setError(err.response?.data?.message || "Could not load this profile.");
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id]);

  if (loading) return <main className="page ms-public-profile-page"><p>Loading profile…</p></main>;
  if (isPrivate) return <main className="page ms-public-profile-page"><section className="ms-profile-private-card"><LockKeyhole size={34} /><h1>This account is private</h1><p>This member has chosen to keep their profile details private.</p><Link className="ms-story-action" to="/blogs">Explore Stories</Link></section></main>;
  if (error || !profile) return <main className="page ms-public-profile-page"><h1>Profile unavailable</h1><p>{error || "This profile could not be found."}</p><Link to="/blogs">Back to Explore Stories</Link></main>;

  return <main className="page ms-public-profile-page">
    <Link className="ms-story-back-link" to="/blogs">← Explore Stories</Link>
    <section className="ms-public-profile-card">
      <div className="ms-public-profile-cover" />
      <div className="ms-public-profile-content">
        {profile.profilePhoto ? <img className="ms-public-profile-avatar" src={profile.profilePhoto} alt={`${profile.name}'s profile`} /> : <div className="ms-public-profile-avatar ms-public-profile-initial">{(profile.name || "M").charAt(0).toUpperCase()}</div>}
        <h1>{profile.name}</h1>
        {profile.location && <p className="ms-public-profile-location">{profile.location}</p>}
        <p className="ms-public-profile-bio">{profile.bio || "This member has not added a bio yet."}</p>
        <div className="ms-public-profile-stats"><span><Users size={16} /> <strong>{profile.followersCount || 0}</strong> Followers</span><span><Users size={16} /> <strong>{profile.followingCount || 0}</strong> Following</span></div>
        {profile.interests?.length > 0 && <div className="ms-public-profile-interests">{profile.interests.map((interest) => <span key={interest}>{interest}</span>)}</div>}
      </div>
    </section>
    <section className="ms-public-profile-stories"><div className="ms-related-heading"><span className="ms-story-author-eyebrow">SHARED WITH THE COMMUNITY</span><h2>Published stories</h2></div>
      {stories.length ? <div className="ms-public-profile-story-grid">{stories.map((story) => <article className="ms-public-profile-story" key={story._id}>{story.coverImage?.url && <img src={story.coverImage.url} alt="" loading="lazy" />}<div><span>{story.category || "Story"}</span><h3><Link to={`/blogs/${story._id}`}>{story.title}</Link></h3>{story.summary && <p>{story.summary}</p>}<div className="ms-public-profile-story-stats"><span><Heart size={14} /> {story.likesCount || 0}</span><span><MessageCircle size={14} /> {story.commentsCount || 0}</span><span><Bookmark size={14} /> {story.savesCount || 0}</span></div></div></article>)}</div> : <p>This member hasn't published any stories yet.</p>}
    </section>
  </main>;
}
