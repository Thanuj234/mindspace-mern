import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Users, Send, ArrowUpRight, Check, X, Clock3, RefreshCw } from "lucide-react";
import api from "../services/api";
import "./collaborations.css";

function statusLabel(status) {
  return ({ pending: "Pending", accepted: "Accepted", declined: "Declined", cancelled: "Cancelled" })[status] || status;
}

export default function Collaborations() {
  const [tab, setTab] = useState("incoming");
  const [incoming, setIncoming] = useState([]);
  const [sent, setSent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadRequests = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const [a, b] = await Promise.all([api.get("/collaborations/incoming"), api.get("/collaborations/sent")]);
      setIncoming(Array.isArray(a.data) ? a.data : []);
      setSent(Array.isArray(b.data) ? b.data : []);
    } catch (err) {
      setError(err.response?.data?.message || "Could not load collaboration requests.");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadRequests(); }, [loadRequests]);

  async function respond(id, action) {
    setBusyId(id); setError(""); setNotice("");
    try {
      await api.patch(`/collaborations/${id}/respond`, { action });
      setNotice(action === "accept" ? "Collaboration request accepted." : "Request declined.");
      await loadRequests();
    } catch (err) { setError(err.response?.data?.message || "Could not update this request."); }
    finally { setBusyId(""); }
  }

  async function cancel(id) {
    setBusyId(id); setError(""); setNotice("");
    try {
      await api.patch(`/collaborations/${id}/cancel`);
      setNotice("Your request was cancelled.");
      await loadRequests();
    } catch (err) { setError(err.response?.data?.message || "Could not cancel this request."); }
    finally { setBusyId(""); }
  }

  const rows = tab === "incoming" ? incoming : sent;
  const incomingPending = incoming.filter((r) => r.status === "pending").length;
  const sentPending = sent.filter((r) => r.status === "pending").length;

  return <main className="page collaborations-page">
    <header className="collaborations-heading">
      <span className="collaborations-eyebrow">COMMUNITY</span>
      <h1>Collaborations</h1>
      <p>Build something together — a joint guide, a shared itinerary, a co-written article.</p>
    </header>

    <div className="collaboration-tabs" role="tablist" aria-label="Collaboration requests">
      <button type="button" role="tab" aria-selected={tab === "incoming"} className={tab === "incoming" ? "active" : ""} onClick={() => setTab("incoming")}><Users size={16}/> Requests to me ({incomingPending})</button>
      <button type="button" role="tab" aria-selected={tab === "sent"} className={tab === "sent" ? "active" : ""} onClick={() => setTab("sent")}><Send size={16}/> Requests I sent ({sentPending})</button>
    </div>

    {error && <p className="collaboration-alert error" role="alert">{error}</p>}
    {notice && <p className="collaboration-alert success" role="status">{notice}</p>}

    <section className="collaboration-panel">
      {loading ? <div className="collaboration-empty"><RefreshCw size={25}/><h2>Loading requests...</h2></div> :
        rows.length === 0 ? <div className="collaboration-empty">
          <div className="collaboration-empty-icon"><Users size={23}/></div>
          <h2>{tab === "incoming" ? "No requests yet" : "No requests sent yet"}</h2>
          <p>{tab === "incoming" ? "When someone is inspired by a story you published, their request will arrive here." : "When you request to collaborate on a published story, it will appear here."}</p>
          <Link className="collaboration-explore-button" to="/blogs">Explore stories</Link>
        </div> : <div className="collaboration-list">
          {rows.map((item) => {
            const person = tab === "incoming" ? item.fromUser : item.toUser;
            return <article className="collaboration-request-card" key={item._id}>
              <div className="collaboration-person-avatar">{(person?.name || "?").slice(0, 1).toUpperCase()}</div>
              <div className="collaboration-request-main">
                <h2>{person?.name || "MindSpace member"}</h2>
                <p className="collaboration-request-story">Story: <strong>{item.blogId?.title || "Story unavailable"}</strong></p>
                {item.message && <p className="collaboration-request-message">“{item.message}”</p>}
                <span className={`collaboration-status status-${item.status}`}><Clock3 size={13}/> {statusLabel(item.status)}</span>
              </div>
              <div className="collaboration-request-actions">
                {tab === "incoming" && item.status === "pending" && <>
                  <button type="button" className="collaboration-accept" disabled={busyId === item._id} onClick={() => respond(item._id, "accept")}><Check size={15}/> Accept</button>
                  <button type="button" className="collaboration-decline" disabled={busyId === item._id} onClick={() => respond(item._id, "decline")}><X size={15}/> Decline</button>
                </>}
                {tab === "sent" && item.status === "pending" && <button type="button" className="collaboration-decline" disabled={busyId === item._id} onClick={() => cancel(item._id)}>Cancel request</button>}
                {item.blogId?._id && <Link className="collaboration-story-link" to={`/blogs/${item.blogId._id}`}>View story <ArrowUpRight size={14}/></Link>}
              </div>
            </article>;
          })}
        </div>}
    </section>
  </main>;
}
