import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft, BookOpen, Save, Send, Eye, ImagePlus, Video, Upload,
  Bold, Italic, Underline, Strikethrough, List, ListOrdered, Link2,
  Heading2, Quote, Undo2, Redo2, AlignLeft, AlignCenter, AlignRight, X
} from "lucide-react";
import { EditorContent, useEditor } from "@tiptap/react";
import { Extension } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import UnderlineExtension from "@tiptap/extension-underline";
import LinkExtension from "@tiptap/extension-link";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import { FontFamily } from "@tiptap/extension-font-family";
import api from "../services/api";
import "./blog-editor-page.css";

const categories = ["Personal growth", "Creativity", "Life lessons", "Wellbeing", "General"];
const fonts = ["Georgia", "Arial", "Verdana", "Times New Roman", "Trebuchet MS"];
const sizes = ["12px", "14px", "16px", "18px", "24px", "32px"];
const safeArray = (value) => Array.isArray(value) ? value : [];
const FontSize = Extension.create({
  name: "fontSize",
  addGlobalAttributes() {
    return [{
      types: ["textStyle"],
      attributes: {
        fontSize: {
          default: null,
          parseHTML: (element) => element.style.fontSize || null,
          renderHTML: (attributes) => attributes.fontSize ? { style: `font-size: ${attributes.fontSize}` } : {}
        }
      }
    }];
  }
});

export default function BlogEditor() {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();
  const aiDraft = location.state?.aiDraft;
  const isEditing = Boolean(id);
  const coverInput = useRef(null);
  const mediaInput = useRef(null);

  const [title, setTitle] = useState(aiDraft?.title || "");
  const [summary, setSummary] = useState("");
  const [category, setCategory] = useState("Personal growth");
  const [tags, setTags] = useState("");
  const [status, setStatus] = useState("draft");
  const [coverImage, setCoverImage] = useState(null);
  const [media, setMedia] = useState([]);
  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const editor = useEditor({
  extensions: [
    StarterKit.configure({
      link: false,
      underline: false,
    }),
    UnderlineExtension,
    LinkExtension.configure({
      openOnClick: false,
      autolink: true,
      linkOnPaste: true,
    }),
    TextAlign.configure({ types: ["heading", "paragraph"] }),
    TextStyle,
    FontFamily,
    FontSize,
    Placeholder.configure({
      placeholder:
        "Tell the story properly — what happened, what it cost, what you would do differently.",
    }),
  ],
  content: aiDraft?.content || "",
  onUpdate: ({ editor: current }) => setContentVersion(current.getHTML()),
  editorProps: {
    attributes: {
      class: "tiptap-writing-area blog-story-content",
      "aria-label": "Story content",
    },
  },
});
  const [, setContentVersion] = useState(0);

  useEffect(() => {
    if (aiDraft && editor && !id) {
      setTitle(aiDraft.title || "");
      editor.commands.setContent(aiDraft.content || "", false);
    }
  }, [aiDraft, editor, id]);

  useEffect(() => {
    if (!id || !editor) return;
    let cancelled = false;
    (async () => {
      try {
        const response = await api.get("/blogs/mine");
        const stories = Array.isArray(response.data) ? response.data : [];
        const story = stories.find((item) => String(item._id) === id);
        if (!story) throw new Error("Story not found or you don't have access to it.");
        if (cancelled) return;
        setTitle(story.title || "");
        setSummary(story.summary || "");
        setCategory(story.category || "General");
        setTags(safeArray(story.tags).join(", "));
        setStatus(story.status || "draft");
        setCoverImage(story.coverImage || null);
        setMedia(safeArray(story.media));
        editor.commands.setContent(story.content || "", false);
      } catch (err) {
        if (!cancelled) setError(err.response?.data?.message || err.message || "Couldn't load your story.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id, editor]);

  function setFontSize(size) {
    if (!editor) return;
    editor.chain().focus().setMark("textStyle", { fontSize: size }).run();
  }

  function addLink() {
    const current = editor?.getAttributes("link").href || "";
    const url = window.prompt("Enter a URL (include https://)", current);
    if (url === null) return;
    if (!url.trim()) editor?.chain().focus().unsetLink().run();
    else {
      const normalized = /^https?:\/\//i.test(url.trim()) ? url.trim() : `https://${url.trim()}`;
      editor?.chain().focus().extendMarkRange("link").setLink({ href: normalized }).run();
    }
  }

  async function uploadFile(file, kind) {
    if (!file) return;
    const isCover = kind === "cover";
    const isVideo = file.type.startsWith("video/");
    if (isCover && !file.type.startsWith("image/")) {
      setError("Cover image must be an image file."); return;
    }
    if (kind === "media" && !file.type.startsWith("image/") && !isVideo) {
      setError("Please select an image or video file."); return;
    }
    const maxBytes = isVideo ? 50 * 1024 * 1024 : 8 * 1024 * 1024;
    if (file.size > maxBytes) {
      setError(isVideo ? "Videos must be 50 MB or smaller." : "Images must be 8 MB or smaller."); return;
    }
    setError(""); setSuccess(""); setUploading(true);
    try {
      const body = new FormData();
      body.append("file", file);
      body.append("kind", isCover ? "cover" : "media");
      const response = await api.post("/blogs/media/upload", body);
      const uploaded = response.data?.file;
      if (!uploaded?.url) throw new Error("Upload completed without a media URL.");
      if (isCover) setCoverImage(uploaded);
      else {
        setMedia((current) => [...current, uploaded]);
        if (isVideo) {
          editor?.chain().focus().insertContent(`<p><a href="${uploaded.url}" target="_blank" rel="noopener noreferrer">${file.name}</a></p>`).run();
        } else {
          editor?.chain().focus().insertContent(`<p><img src="${uploaded.url}" alt="${file.name.replace(/[<>&"]/g, "")}" /></p>`).run();
        }
      }
      setSuccess(isCover ? "Cover image uploaded." : `${isVideo ? "Video" : "Photo"} uploaded.`);
    } catch (err) {
      setError(err.response?.data?.message || "Media upload failed. Check that the server is running and Cloudinary is configured.");
    } finally {
      setUploading(false);
      if (coverInput.current) coverInput.current.value = "";
      if (mediaInput.current) mediaInput.current.value = "";
    }
  }

  async function saveStory(nextStatus) {
    setError(""); setSuccess("");
    const storyContent = editor?.getHTML() || "";
    const storyText = editor?.getText().trim() || "";
    if (!title.trim() || !storyText) {
      setError("Please add both a title and some story text before saving.");
      return;
    }
    try {
      setSaving(true);
      const storyData = {
        title: title.trim(),
        summary: summary.trim(),
        content: storyContent,
        category,
        tags: tags.split(",").map((tag) => tag.trim()).filter(Boolean),
        status: nextStatus,
        coverImage,
        media
      };
      if (isEditing) await api.put(`/blogs/${id}`, storyData);
      else await api.post("/blogs", storyData);
      if (nextStatus === "published") {
        setStatus("published");
        setSuccess("Your story is published!");
        navigate("/my-stories");
      } else {
        setStatus("draft");
        setSuccess("Your draft has been saved.");
        if (!isEditing) navigate("/my-stories");
      }
    } catch (err) {
      setError(err.response?.data?.message || "We couldn't save your story. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <main className="page blog-editor-page"><p>Loading your story...</p></main>;

  return (
    <main className="page blog-editor-page screenshot-blog-editor">
      <div className="blog-editor-topline">
        <Link to="/my-stories" className="editor-back-link"><ArrowLeft size={17} /> Back to My Stories</Link>
        <div className="blog-top-actions">
          <button type="button" className="blog-button blog-light" disabled={saving} onClick={() => saveStory("draft")}><Save size={16} /> Save as Draft</button>
          <button type="button" className="blog-button blog-light" onClick={() => setPreview(true)}><Eye size={16} /> Preview</button>
          <button type="button" className="blog-button blog-dark" disabled={saving} onClick={() => saveStory("published")}><Send size={16} /> {saving ? "Publishing..." : status === "published" ? "Save & Publish" : "Publish Story"}</button>
        </div>
      </div>

      <header className="blog-page-heading">
        <span className="blog-status-eyebrow">{status === "published" ? "PUBLISHED STORY" : "YOUR THOUGHTS, YOUR SPACE"}</span>
        <h1>{isEditing ? "Edit Your Story" : aiDraft ? "Your AI-Assisted Draft" : "Create a New Story"}</h1>
        <p>Share your thoughts, inspire others, and be part of the MindSpace community.</p>
      </header>

      <div className="blog-editor-workspace">
        <nav className="blog-editor-steps" aria-label="Story sections">
          <a className="blog-step is-current" href="#story-details"><span>✎</span><div><strong>Story Details</strong><small>Title, summary, category</small></div></a>
          <a className="blog-step" href="#story-content"><span>▤</span><div><strong>Content</strong><small>Write and style your story</small></div></a>
          <a className="blog-step" href="#story-media"><span>▧</span><div><strong>Media</strong><small>Add photos or videos</small></div></a>
          <a className="blog-step" href="#story-tags"><span>#</span><div><strong>Tags</strong><small>Help others discover</small></div></a>
          <a className="blog-step" href="#story-publish"><span>♧</span><div><strong>Publish</strong><small>Set visibility and options</small></div></a>
          <div className="blog-gentle-reminder"><span>♡</span><strong>A gentle reminder</strong><p>Your story can be a light for someone else. Write from your heart — even small moments can make a big difference.</p></div>
        </nav>

        <section className="blog-writing-column">
          <div className="blog-paper-card" id="story-details">
            <div className="blog-section-heading"><h2>Story Details</h2><p>Let’s start with the basics.</p></div>
            <label className="blog-input-label" htmlFor="blog-title">Title <b>*</b></label>
            <input id="blog-title" className="blog-title-input" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} placeholder="Give your story a meaningful title..." />
            <div className="blog-character-count">{title.length}/120</div>

            <label className="blog-input-label" htmlFor="blog-summary">Summary</label>
            <textarea id="blog-summary" className="blog-summary-input" value={summary} onChange={(e) => setSummary(e.target.value)} maxLength={300} rows={3} placeholder="Write a short summary to give readers a glimpse of your story..." />
            <div className="blog-character-count">{summary.length}/300</div>

            <div className="blog-detail-selects">
              <div><label className="blog-input-label" htmlFor="blog-category">▱ &nbsp; Category</label><select id="blog-category" value={category} onChange={(e) => setCategory(e.target.value)} className="blog-setting-select">{categories.map((item) => <option key={item} value={item}>{item}</option>)}</select></div>
              <div><label className="blog-input-label" htmlFor="blog-status">♧ &nbsp; Status</label><select id="blog-status" value={status} onChange={(e) => setStatus(e.target.value)} className="blog-setting-select"><option value="draft">Save as draft</option><option value="published">Publish now</option></select></div>
            </div>

            <section className="blog-story-section" id="story-content">
              <h2>Your Story</h2>
              <p>Share your thoughts, experiences, or insights. You can format your text, add images, and more.</p>
              <div className="blog-rich-toolbar" role="toolbar" aria-label="Text formatting">
                <select aria-label="Font family" defaultValue="Georgia" onChange={(e) => editor?.chain().focus().setFontFamily(e.target.value).run()}>{fonts.map((font) => <option key={font} value={font}>{font}</option>)}</select>
                <select aria-label="Font size" defaultValue="16px" onChange={(e) => setFontSize(e.target.value)}>{sizes.map((size) => <option key={size} value={size}>{size}</option>)}</select>
                <button type="button" title="Bold" onClick={() => editor?.chain().focus().toggleBold().run()} className={editor?.isActive("bold") ? "is-active" : ""}><Bold size={16} /></button>
                <button type="button" title="Italic" onClick={() => editor?.chain().focus().toggleItalic().run()}><Italic size={16} /></button>
                <button type="button" title="Underline" onClick={() => editor?.chain().focus().toggleUnderline().run()}><Underline size={16} /></button>
                <button type="button" title="Strikethrough" onClick={() => editor?.chain().focus().toggleStrike().run()}><Strikethrough size={16} /></button>
                <button type="button" title="Heading" onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}><Heading2 size={16} /></button>
                <button type="button" title="Bulleted list" onClick={() => editor?.chain().focus().toggleBulletList().run()}><List size={16} /></button>
                <button type="button" title="Numbered list" onClick={() => editor?.chain().focus().toggleOrderedList().run()}><ListOrdered size={16} /></button>
                <button type="button" title="Quote" onClick={() => editor?.chain().focus().toggleBlockquote().run()}><Quote size={16} /></button>
                <button type="button" title="Add link" onClick={addLink}><Link2 size={16} /></button>
                <button type="button" title="Align left" onClick={() => editor?.chain().focus().setTextAlign("left").run()}><AlignLeft size={16} /></button>
                <button type="button" title="Align center" onClick={() => editor?.chain().focus().setTextAlign("center").run()}><AlignCenter size={16} /></button>
                <button type="button" title="Align right" onClick={() => editor?.chain().focus().setTextAlign("right").run()}><AlignRight size={16} /></button>
                <button type="button" title="Undo" onClick={() => editor?.chain().focus().undo().run()}><Undo2 size={16} /></button>
                <button type="button" title="Redo" onClick={() => editor?.chain().focus().redo().run()}><Redo2 size={16} /></button>
              </div>
              <EditorContent editor={editor} />
              <div className="blog-inline-media-actions">
                <button type="button" onClick={() => mediaInput.current?.click()} disabled={uploading}><ImagePlus size={16} /> Insert image or video</button>
                <small>Images and videos uploaded here are included in your story.</small>
                <input ref={mediaInput} hidden type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime" onChange={(e) => uploadFile(e.target.files?.[0], "media")} />
              </div>
              <div className="blog-word-count">{(editor?.getText() || "").trim().split(/\\s+/).filter(Boolean).length} words</div>
            </section>

            <section className="blog-tags-section" id="story-tags">
              <h2>Tags</h2><p>Add tags to help others find your story.</p>
              <label className="blog-tag-input-wrap" htmlFor="blog-tags"><span>#</span><input id="blog-tags" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="Type a tag or separate tags with commas..." /><small>{tags ? tags.split(",").filter((tag) => tag.trim()).length : 0}/10 tags</small></label>
              <div className="blog-suggested-tags"><span>Suggested:</span>{["Self Care","Mental Health","Personal Growth","Mindfulness","Relationships","Creativity","Lifestyle","Healing","Inspiration","Community"].map((tag) => <button key={tag} type="button" onClick={() => setTags((current) => current.trim() ? `${current}, ${tag}` : tag)}>{tag}</button>)}</div>
            </section>
          </div>
          {error && <p className="blog-feedback blog-feedback-error" role="alert">{error}</p>}
          {success && <p className="blog-feedback blog-feedback-success" role="status">{success}</p>}
        </section>

        <aside className="blog-settings-column">
          <div className="blog-settings-card blog-cover-card" id="story-media">
            <h2>▧ &nbsp; Cover Image</h2><p>Add a beautiful cover image to make your story stand out.</p>
            <button type="button" className="blog-cover-dropzone" onClick={() => coverInput.current?.click()} disabled={uploading}>
              {coverImage?.url ? <img className="blog-cover-preview" src={coverImage.url} alt="Blog cover preview" /> : <><span className="blog-upload-cloud">⇧</span><strong>{uploading ? "Uploading..." : "Upload a cover image"}</strong><small>JPG, PNG or WebP (max 5MB)</small><span className="blog-cover-choose">▧ &nbsp; Choose from gallery</span></>}
            </button>
            <input ref={coverInput} hidden type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => uploadFile(e.target.files?.[0], "cover")} />
            <div className="blog-side-divider"></div>
            <div className="blog-media-heading"><h2>▣ &nbsp; Add Media <small>(Optional)</small></h2><p>Include more photos or videos in your story.</p></div>
            <button type="button" className="blog-add-media-button" onClick={() => mediaInput.current?.click()} disabled={uploading}><Upload size={16} /> Add Photos or Videos</button>
            {media.length > 0 && <div className="blog-media-list">{media.map((item, index) => <div key={item.publicId || item.url || index}><span>{item.resourceType === "video" ? <Video size={15} /> : <ImagePlus size={15} />}</span><a href={item.url} target="_blank" rel="noreferrer">{item.originalName || `Media ${index + 1}`}</a><button type="button" aria-label="Remove media" onClick={() => setMedia((current) => current.filter((_, i) => i !== index))}><X size={14} /></button></div>)}</div>}
          </div>
          <div className="blog-publishing-note" id="story-publish"><strong>💡 Publishing Tips</strong><ul><li>Choose a clear and engaging title</li><li>Add a meaningful cover image</li><li>Use relevant tags for better discovery</li><li>Be authentic and write from your heart</li></ul></div>
          <div className="blog-inspiration-card"><strong>🌿 Need Inspiration?</strong><p>Explore stories from our community to see how others share their journeys.</p><Link to="/blogs">Browse Explore Stories →</Link></div>
        </aside>
      </div>

      {preview && (
        <div className="blog-preview-backdrop" role="dialog" aria-modal="true" aria-label="Story preview">
          <div className="blog-preview-modal">
            <div className="blog-preview-header"><span>PREVIEW · {status === "published" ? "PUBLISHED" : "DRAFT"}</span><button type="button" onClick={() => setPreview(false)} aria-label="Close preview"><X size={20} /></button></div>
            {coverImage?.url && <img className="blog-preview-cover" src={coverImage.url} alt="" />}
            <p className="blog-preview-category">{category}</p>
            <h1>{title || "Your story title"}</h1>
            {summary && <p className="blog-preview-summary">{summary}</p>}
            <div className="blog-preview-body" dangerouslySetInnerHTML={{ __html: editor?.getHTML() || "" }} />
            {media.map((item, index) => item.resourceType === "video" ? <video key={item.publicId || index} controls src={item.url} /> : null)}
            <button type="button" className="blog-button blog-dark" onClick={() => setPreview(false)}>Back to editing</button>
          </div>
        </div>
      )}
    </main>
  );
}
