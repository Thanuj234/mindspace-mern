import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Save, Sparkles, Trash2, ImagePlus, Paperclip, Download, FileText, Heart } from "lucide-react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import api from "../services/api";
import "./journal-upgrade.css";

const EMPTY = { title: "", content: "", mood: "neutral", tags: "", isFavorite: false };
const MOODS = [
  ["neutral", "😐 Neutral"], ["happy", "😊 Happy"], ["grateful", "🙏 Grateful"],
  ["sad", "😔 Sad"], ["anxious", "😟 Anxious"], ["excited", "✨ Excited"], ["calm", "🌿 Calm"],
];

export default function JournalEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [entryId, setEntryId] = useState(id || "");
  const [form, setForm] = useState(EMPTY);
  const [images, setImages] = useState([]);
  const [attachments, setAttachments] = useState([]);
  const [loading, setLoading] = useState(Boolean(id));
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [busyFile, setBusyFile] = useState("");
  const [generating, setGenerating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const editor = useEditor({
    extensions: [StarterKit, Placeholder.configure({ placeholder: "What happened today? What did you learn, notice, or feel?" })],
    content: "",
    onUpdate: ({ editor: current }) => setForm((f) => ({ ...f, content: current.getHTML() })),
    editorProps: { attributes: { class: "tiptap-writing-area", "aria-label": "Journal text" } },
  });

  useEffect(() => {
    if (!editor) return;
    if (editor.getHTML() !== (form.content || "")) editor.commands.setContent(form.content || "", false);
  }, [editor, form.content]);

  useEffect(() => {
    let cancelled = false;
    if (!id) {
      setEntryId(""); setForm(EMPTY); setImages([]); setAttachments([]); setLoading(false);
      if (editor) editor.commands.clearContent();
      return () => { cancelled = true; };
    }
    async function loadEntry() {
      setLoading(true); setError("");
      try {
        const response = await api.get("/journals");
        const entry = (Array.isArray(response.data) ? response.data : []).find((j) => String(j._id) === id);
        if (!entry) throw new Error("Journal entry not found.");
        if (cancelled) return;
        const next = { title: entry.title || "", content: entry.content || "", mood: entry.mood || "neutral", tags: Array.isArray(entry.tags) ? entry.tags.join(", ") : "", isFavorite: Boolean(entry.isFavorite) };
        setEntryId(entry._id); setForm(next); setImages(entry.images || []); setAttachments(entry.attachments || []);
        editor?.commands.setContent(next.content, false);
      } catch (err) {
        if (!cancelled) setError(err.response?.data?.message || err.message || "Couldn't load your journal entry.");
      } finally { if (!cancelled) setLoading(false); }
    }
    loadEntry();
    return () => { cancelled = true; };
  }, [id, editor]);

  function updateField(event) {
    const { name, value } = event.target;
    setForm((f) => ({ ...f, [name]: value })); setError(""); setNotice("");
  }

  function payload() {
    const content = editor?.getHTML() || form.content;
    const plainText = editor?.getText() || content.replace(/<[^>]*>/g, " ");
    const title = form.title.trim();
    if (!title || !plainText.trim()) throw new Error("Please enter both a title and your journal entry.");
    if (title.length > 150) throw new Error("Your title must be 150 characters or fewer.");
    if (content.length > 20000) throw new Error("Your formatted entry is too long. Please shorten it before saving.");
    return { title, content, mood: form.mood, tags: [...new Set(form.tags.split(",").map((t) => t.trim()).filter(Boolean))], isFavorite: Boolean(form.isFavorite) };
  }

  const saveEntry = useCallback(async ({ showNotice = true } = {}) => {
    setError(""); if (showNotice) setNotice("");
    const body = payload();
    setSaving(true);
    try {
      const currentId = entryId || id;
      let response; let savedId = currentId;
      if (currentId) response = await api.put(`/journals/${currentId}`, body);
      else {
        response = await api.post("/journals", body);
        savedId = response.data?._id || response.data?.data?._id;
        if (!savedId) throw new Error("The server did not return the saved journal ID.");
        setEntryId(savedId);
        navigate(`/journal/${savedId}/edit`, { replace: true });
      }
      if (response?.data?.images) setImages(response.data.images);
      if (response?.data?.attachments) setAttachments(response.data.attachments);
      if (showNotice) setNotice("Entry saved. Your writing is safe.");
      return { id: savedId, payload: body };
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Couldn't save your entry.");
      throw err;
    } finally { setSaving(false); }
  }, [entryId, id, form, editor, navigate]);

  async function handleSave(event) {
    event.preventDefault();
    try { await saveEntry(); } catch { /* saveEntry displays the error */ }
  }

  async function toggleFavorite() {
    const next = !form.isFavorite;
    setForm((f) => ({ ...f, isFavorite: next })); setError(""); setNotice("");
    if (!(entryId || id)) { setNotice("Favourite selected. Save the entry to keep this setting."); return; }
    try {
      const body = payload();
      await api.put(`/journals/${entryId || id}`, { ...body, isFavorite: next });
      setNotice(next ? "Added to favourites." : "Removed from favourites.");
    } catch (err) {
      setForm((f) => ({ ...f, isFavorite: !next }));
      setError(err.response?.data?.message || "Couldn't update favourite status.");
    }
  }

  async function uploadFile(file, kind) {
    const journalId = entryId || id; const isImage = kind === "image";
    if (!journalId) { setError("Save your entry first, then you can upload files."); return; }
    const maxMb = isImage ? 5 : 10;
    if (file.size > maxMb * 1024 * 1024) { setError(`File must be ${maxMb} MB or smaller.`); return; }
    const accepted = isImage ? ["image/jpeg", "image/png", "image/webp"] : ["application/pdf", "text/plain", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
    if (!accepted.includes(file.type)) { setError(isImage ? "Choose a JPEG, PNG, or WebP image." : "Choose a PDF, TXT, DOC, or DOCX document."); return; }
    if (isImage && images.length >= 10) { setError("A journal can contain up to 10 images."); return; }
    if (!isImage && attachments.length >= 10) { setError("A journal can contain up to 10 documents."); return; }
    const data = new FormData(); data.append(isImage ? "image" : "file", file);
    setUploading(true); setError(""); setNotice("");
    try {
      const response = await api.post(`/journals/${journalId}/${isImage ? "images" : "attachments"}`, data);
      if (isImage && response.data?.image) setImages((items) => [...items, response.data.image]);
      if (!isImage && response.data?.attachment) setAttachments((items) => [...items, response.data.attachment]);
      setNotice(isImage ? "Image uploaded successfully." : "Document attached successfully.");
    } catch (err) { setError(err.response?.data?.message || "Upload failed. Please try again."); }
    finally { setUploading(false); }
  }

  async function openFile(item, kind) {
    const journalId = entryId || id;
    if (!item._id) { setError("File ID is missing. Reload the entry and try again."); return; }
    setBusyFile(item._id); setError("");
    try {
      const url = kind === "image" ? `/journals/${journalId}/images/${item._id}/url` : `/journals/${journalId}/attachments/${item._id}/url`;
      const response = await api.get(url);
      const signedUrl = kind === "image" ? response.data.imageUrl : response.data.downloadUrl;
      if (!signedUrl) throw new Error("The server did not return a file URL.");
      window.open(signedUrl, "_blank", "noopener,noreferrer");
    } catch (err) { setError(err.response?.data?.message || err.message || "Couldn't open this file."); }
    finally { setBusyFile(""); }
  }

  async function createStoryDraft() {
    if (!(entryId || id)) { setError("Save your journal entry before creating a blog draft."); return; }
    setGenerating(true); setError(""); setNotice("");
    try {
      // The AI request only runs after the save endpoint succeeds.
      const saved = await saveEntry({ showNotice: false });
      const response = await api.post("/ai/draft-blog", { title: saved.payload.title, text: editor?.getText().trim() || "" });
      navigate("/write", { state: { aiDraft: { title: response.data?.draftTitle || saved.payload.title, content: response.data?.draftContent || "" }, sourceJournalId: saved.id } });
    } catch (err) { setError(err.response?.data?.message || err.message || "Couldn't generate a blog draft. Please try again."); }
    finally { setGenerating(false); }
  }

  async function deleteEntry() {
    const journalId = entryId || id;
    if (!journalId || !window.confirm("Delete this journal entry permanently?")) return;
    setDeleting(true); setError("");
    try { await api.delete(`/journals/${journalId}`); navigate("/journal", { state: { notice: "Journal entry deleted." } }); }
    catch (err) { setError(err.response?.data?.message || "Couldn't delete your entry."); }
    finally { setDeleting(false); }
  }

  if (loading) return <section className="journal-content journal-editor-page"><p className="muted">Loading your entry…</p></section>;

  return <section className="journal-content journal-editor-page">
    <Link to="/journal" className="editor-back-link"><ArrowLeft size={17} /> Back to My Journals</Link>
    <div className="journal-heading journal-editor-heading"><div><p className="section-label">YOUR PRIVATE SPACE</p><h1>{id ? "Edit your entry" : "A fresh page"}</h1><p className="muted">Write freely. This entry stays private in your account.</p></div><button type="button" className={`journal-favorite-toggle ${form.isFavorite ? "is-favorite" : ""}`} onClick={toggleFavorite} aria-pressed={Boolean(form.isFavorite)}><Heart size={17} fill={form.isFavorite ? "currentColor" : "none"} /> {form.isFavorite ? "Favorited" : "Add to favorites"}</button></div>
    <form className="journal-form journal-editor-form" onSubmit={handleSave}>
      <label htmlFor="journal-title">Title</label><input id="journal-title" name="title" value={form.title} onChange={updateField} maxLength={150} placeholder="Give this entry a name" required />
      <label>Your thoughts</label>
      <div className="rich-toolbar" role="toolbar" aria-label="Text formatting"><button type="button" onClick={() => editor?.chain().focus().toggleBold().run()} className={editor?.isActive("bold") ? "is-active" : ""}><b>B</b></button><button type="button" onClick={() => editor?.chain().focus().toggleItalic().run()} className={editor?.isActive("italic") ? "is-active" : ""}><i>I</i></button><button type="button" onClick={() => editor?.chain().focus().toggleStrike().run()} className={editor?.isActive("strike") ? "is-active" : ""}><s>S</s></button><button type="button" onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}>H2</button><button type="button" onClick={() => editor?.chain().focus().toggleBulletList().run()}>• List</button><button type="button" onClick={() => editor?.chain().focus().toggleOrderedList().run()}>1. List</button><button type="button" onClick={() => editor?.chain().focus().undo().run()}>Undo</button><button type="button" onClick={() => editor?.chain().focus().redo().run()}>Redo</button></div>
      <EditorContent editor={editor} /><div className="editor-character-count">{(editor?.getText() || "").length}/20000 characters</div>
      <section className="journal-upload-section"><div className="journal-upload-heading"><div><h3>Images & attachments</h3><p className="muted">Save the entry first, then add files.</p></div><span className="journal-upload-count">{images.length} photos · {attachments.length} files</span></div>
        <div className="journal-upload-actions"><label className={`light-button ${!(entryId || id) || uploading ? "upload-disabled" : ""}`}><ImagePlus size={16} /> Add image<input hidden type="file" accept="image/jpeg,image/png,image/webp" disabled={!(entryId || id) || uploading} onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadFile(f, "image"); e.target.value = ""; }} /></label><label className={`light-button ${!(entryId || id) || uploading ? "upload-disabled" : ""}`}><Paperclip size={16} /> Attach document<input hidden type="file" accept=".pdf,.txt,.doc,.docx" disabled={!(entryId || id) || uploading} onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadFile(f, "document"); e.target.value = ""; }} /></label>{uploading && <span role="status">Uploading…</span>}</div>
        {!!images.length && <div className="journal-upload-list"><h4><ImagePlus size={16} /> Images ({images.length})</h4>{images.map((img) => <div className="journal-upload-item" key={img._id || img.publicId}><span>{img.originalName || img.format || "Journal image"}</span><button type="button" className="light-button" disabled={busyFile === img._id} onClick={() => openFile(img, "image")}>{busyFile === img._id ? "Opening…" : "View image"}</button></div>)}</div>}
        {!!attachments.length && <div className="journal-upload-list"><h4><FileText size={16} /> Documents ({attachments.length})</h4>{attachments.map((file) => <div className="journal-upload-item" key={file._id || file.storagePath}><span><Paperclip size={15} /> {file.name} <small>{((file.size || 0) / 1048576).toFixed(2)} MB</small></span><button type="button" className="light-button" disabled={busyFile === file._id} onClick={() => openFile(file, "attachment")}><Download size={15} /> {busyFile === file._id ? "Opening…" : "Open"}</button></div>)}</div>}
      </section>
      <div className="editor-meta"><div><label htmlFor="journal-mood">Mood</label><select id="journal-mood" name="mood" value={form.mood} onChange={updateField}>{MOODS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div><div><label htmlFor="journal-tags">Tags</label><input id="journal-tags" name="tags" value={form.tags} onChange={updateField} placeholder="travel, learning, gratitude" /><small>Separate tags with commas.</small></div></div>
      {error && <p className="form-error" role="alert">{error}</p>}{notice && <p className="form-success" role="status">{notice}</p>}
      <div className="editor-footer"><span className="muted"><Sparkles size={15} /> Your entry is private by default.</span><div className="journal-editor-actions">{(entryId || id) && <button type="button" className="light-button journal-delete-button" onClick={deleteEntry} disabled={deleting || saving || uploading}><Trash2 size={16} /> {deleting ? "Deleting…" : "Delete entry"}</button>}{(entryId || id) && <button type="button" className="light-button journal-story-button" onClick={createStoryDraft} disabled={generating || saving || uploading || deleting}><Sparkles size={16} /> {generating ? "Building draft…" : "Turn into a story"}</button>}<button type="submit" className="dark-button" disabled={saving || uploading || generating || deleting}><Save size={16} /> {saving ? "Saving…" : (entryId || id) ? "Save changes" : "Save entry"}</button></div></div>
    </form>
  </section>;
}
