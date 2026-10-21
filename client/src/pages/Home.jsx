import { Link } from "react-router-dom";
import { BookOpen, Sprout, UsersRound, BrainCircuit, ArrowRight, Feather, LockKeyhole, Sparkles } from "lucide-react";
import "./landing-home.css";

const features = [
  { Icon: BookOpen, tone: "lavender", title: "Personal Journals", text: "A private space to express your thoughts, feelings, and everyday moments." },
  { Icon: Feather, tone: "mint", title: "Share Your Stories", text: "Turn your experiences into meaningful stories, shared on your terms." },
  { Icon: UsersRound, tone: "lavender", title: "Connect & Collaborate", text: "Find like-minded people and create something thoughtful together." },
  { Icon: BrainCircuit, tone: "mint", title: "AI Support", text: "Improve your writing and rediscover your own words with Ask Your Memory." },
];

const categories = ["Personal Growth", "Creativity & Books", "Education & Careers", "Travel & Discovery", "Movies & Entertainment", "Technology & Gaming"];

export default function Home() {
  const isAuthenticated = Boolean(localStorage.getItem("token"));
  const startPath = isAuthenticated ? "/dashboard" : "/register";

  return (
    <main className="ms-landing">
      <section className="ms-landing-hero">
        <div className="ms-hero-copy">
          <p className="ms-eyebrow"><Sprout size={16} /> A calm home for your thoughts</p>
          <h1>A kinder space for your <em>thoughts, stories</em> and growth.</h1>
          <p className="ms-hero-description">Journal your journey. Share your stories. Connect with kindred minds.</p>
          <div className="ms-hero-actions">
            <Link className="ms-button ms-button-primary" to={startPath}>{isAuthenticated ? "Go to your space" : "Get started"}<ArrowRight size={17} /></Link>
            <Link className="ms-button ms-button-quiet" to="/blogs">Explore stories <ArrowRight size={16} /></Link>
          </div>
          <p className="ms-hero-footnote"><LockKeyhole size={14} /> Your thoughts. Your passions. Your space.</p>
        </div>

        <div className="ms-hero-art" aria-label="A preview of the MindSpace journaling experience">
          <div className="ms-art-halo" />
          <div className="ms-botanical ms-botanical-one">✳</div>
          <div className="ms-botanical ms-botanical-two">✿</div>
          <div className="ms-device">
            <div className="ms-device-top"><span>MindSpace</span><span className="ms-device-avatar">✦</span></div>
            <div className="ms-device-body">
              <p className="ms-device-overline">A MOMENT FOR YOU</p>
              <h3>Good morning <span>🌿</span></h3>
              <p className="ms-device-muted">A new day, a new page.</p>
              <div className="ms-device-prompt"><span className="ms-prompt-icon"><Feather size={18} /></span><div><strong>Write in your journal</strong><small>Capture your thoughts, just as they are.</small></div><ArrowRight size={16} /></div>
              <div className="ms-device-mini-grid"><div><BookOpen size={17}/><strong>Continue writing</strong><small>Your private space</small></div><div><Sparkles size={17}/><strong>My stories</strong><small>Ideas to share</small></div></div>
            </div>
          </div>
          <div className="ms-phone"><div className="ms-phone-notch"/><Sprout size={24}/><p>Small thoughts<br/>create big<br/>changes.</p><div className="ms-phone-landscape"/></div>
          <div className="ms-art-caption">A little room to grow.</div>
        </div>
      </section>

      <section className="ms-feature-strip" id="features" aria-label="MindSpace features">
        {features.map(({ Icon, tone, title, text }) => <article className="ms-feature" key={title}><span className={`ms-feature-icon ${tone}`}><Icon size={25} strokeWidth={1.5}/></span><h2>{title}</h2><p>{text}</p></article>)}
      </section>

      <section className="ms-story-section">
        <div className="ms-journal-art" aria-hidden="true"><div className="ms-photo-card"><div className="ms-photo-scene"/><p>A note to myself:</p><span>I am proud of how<br/>far I've come. ♡</span></div><div className="ms-leaf-shape leaf-a">❧</div><div className="ms-leaf-shape leaf-b">❧</div></div>
        <div className="ms-section-copy"><p className="ms-eyebrow">JOURNAL · REFLECT · GROW</p><h2>Capture the moments that matter.</h2><p>Your journal is a safe, private space to express your thoughts, explore your feelings, and make sense of your journey — at your own pace.</p><Link className="ms-button ms-button-mint" to={isAuthenticated ? "/journal/new" : "/register"}>Start journaling <ArrowRight size={16}/></Link></div>
      </section>

      <section className="ms-community-section" id="stories"><div className="ms-section-copy"><p className="ms-eyebrow">SHARE · INSPIRE · CONNECT</p><h2>Turn your experiences into stories.</h2><p>Publish your stories, share your perspective, and connect with people who truly understand. MindSpace is a community built on empathy, creativity, and real experiences.</p><Link className="ms-button ms-button-lilac" to="/blogs">Explore stories <ArrowRight size={16}/></Link></div><div className="ms-story-stack" aria-hidden="true"><article className="ms-mini-story ms-mini-story-back"><div className="ms-mini-art art-mountain"/><span>Lessons from change</span><small>Personal growth · 4 min read</small></article><article className="ms-mini-story ms-mini-story-front"><div className="ms-mini-art art-book"><BookOpen size={42}/></div><span>Finding calm in the messy middle</span><small>Reflection · 5 min read</small></article></div></section>

      <section className="ms-category-section"><div className="ms-section-heading"><p className="ms-eyebrow">FOLLOW YOUR CURIOSITY</p><h2>There is a story in everything.</h2><p>Explore the topics that make you curious.</p></div><div className="ms-category-grid">{categories.map((category, index) => <Link to="/blogs" className={`ms-category ms-category-${index % 3}`} key={category}><span>{category}</span><ArrowRight size={16}/></Link>)}</div></section>

      <section className="ms-final-cta" id="about"><div className="ms-cta-flower">✿</div><p className="ms-eyebrow">YOUR SPACE IS WAITING</p><h2>A more mindful you<br/>starts here.</h2><p>Join MindSpace and create a space for your thoughts, stories, and the life you're building.</p><Link className="ms-button ms-button-primary" to={startPath}>{isAuthenticated ? "Return to your space" : "Get started"}<ArrowRight size={17}/></Link><span className="ms-cta-note">A little more room to be yourself. ♡</span></section>

      <footer className="ms-landing-footer"><Link className="ms-footer-brand" to="/"><Sprout size={23}/> MindSpace</Link><p>Your thoughts. Your passions. Your space.</p><div><Link to="/blogs">Explore stories</Link><a href="#features">Features</a><a href="#about">About</a>{!isAuthenticated && <Link to="/login">Log in</Link>}</div><small>© {new Date().getFullYear()} MindSpace · Made for reflection and growth.</small></footer>
    </main>
  );
}
