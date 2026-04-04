import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Bold,
  FolderOpen,
  Github,
  Heading2,
  ImagePlus,
  Indent,
  List,
  ListOrdered,
  Loader2,
  Mail,
  Menu,
  Monitor,
  Outdent,
  PenSquare,
  Quote,
  TrendingUp,
  User,
  X,
} from 'lucide-react';
import {
  getAdminPosts,
  getPostBySlug,
  getPublishedPosts,
  getSession,
  savePost,
  signInWithPassword,
  signOut,
  uploadCover,
} from './lib/posts';
import { isSupabaseConfigured } from './lib/supabase';

const profile = {
  name: 'jacinda.xue',
  title: 'AI Explorer',
  bio: 'A personal system for projects, learning, insight, and growth.',
  email: 'xuezixuan26@gmail.com',
  github: 'https://github.com',
};

const boardMeta = {
  projects: {
    id: 'projects',
    nav: 'Project',
    title: 'Project',
    subtitle: 'Things I built, tested, and made real.',
    label: 'I do',
    icon: FolderOpen,
    bg: 'bg-orange-50',
  },
  learning: {
    id: 'learning',
    nav: 'Learning',
    title: 'Learning',
    subtitle: 'Things I am reading, breaking down, and keeping.',
    label: 'I learn',
    icon: BookOpen,
    bg: 'bg-sky-50',
  },
  thinking: {
    id: 'thinking',
    nav: 'Insight',
    title: 'Insight',
    subtitle: 'Posts, notes, and sharper points of view.',
    label: 'I think',
    icon: PenSquare,
    bg: 'bg-amber-50',
  },
  growth: {
    id: 'growth',
    nav: 'Journal',
    title: 'Journal',
    subtitle: 'Reflections, milestones, and the shape of my growth.',
    label: 'I grow',
    icon: TrendingUp,
    bg: 'bg-emerald-50',
  },
};

const tabs = [
  { id: 'home', label: 'Home', icon: Monitor },
  { id: 'projects', label: boardMeta.projects.nav, icon: boardMeta.projects.icon },
  { id: 'learning', label: boardMeta.learning.nav, icon: boardMeta.learning.icon },
  { id: 'thinking', label: boardMeta.thinking.nav, icon: boardMeta.thinking.icon },
  { id: 'growth', label: boardMeta.growth.nav, icon: boardMeta.growth.icon },
  { id: 'about', label: 'About', icon: User },
];

const initialForm = {
  id: '',
  board: 'thinking',
  title: '',
  slug: '',
  excerpt: '',
  content: '',
  cover_url: '',
  status: 'published',
};

const slugify = (value) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\u4e00-\u9fa5\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');

const getRouteFromHash = () => {
  const hash = window.location.hash.replace(/^#/, '');
  if (!hash) return { view: 'home' };
  if (hash === 'admin') return { view: 'admin' };
  if (hash.startsWith('post/')) return { view: 'post', slug: decodeURIComponent(hash.slice(5)) };
  return { view: hash };
};

const formatDate = (value) => new Date(value).toLocaleDateString('zh-CN');

const renderInlineFormatting = (text) => {
  const segments = text.split(/(\*\*.*?\*\*)/g);

  return segments.map((segment, index) => {
    if (segment.startsWith('**') && segment.endsWith('**') && segment.length >= 4) {
      return <strong key={index}>{segment.slice(2, -2)}</strong>;
    }

    return <React.Fragment key={index}>{segment}</React.Fragment>;
  });
};

const hasHtmlMarkup = (content) => /<\/?[a-z][\s\S]*>/i.test(content || '');

const renderRichContent = (content) =>
  (content || '').split('\n').map((line, index) => {
    const indentMatch = line.match(/^\s+/);
    const indent = indentMatch ? indentMatch[0].length : 0;
    const trimmed = line.trim();

    if (!trimmed) {
      return (
        <p key={`${line}-${index}`} className="min-h-[1.75rem]">
          <span>&nbsp;</span>
        </p>
      );
    }

    if (trimmed.startsWith('## ')) {
      return (
        <h2 key={`${line}-${index}`} className="text-2xl font-black" style={{ paddingLeft: `${Math.min(indent, 12) * 0.65}rem` }}>
          {renderInlineFormatting(trimmed.slice(3))}
        </h2>
      );
    }

    if (trimmed.startsWith('> ')) {
      return (
        <blockquote
          key={`${line}-${index}`}
          className="border-l-4 border-stone-300 pl-4 text-stone-600"
          style={{ marginLeft: `${Math.min(indent, 12) * 0.4}rem` }}
        >
          {renderInlineFormatting(trimmed.slice(2))}
        </blockquote>
      );
    }

    if (trimmed.startsWith('- ')) {
      return (
        <div key={`${line}-${index}`} className="flex gap-3" style={{ paddingLeft: `${Math.min(indent, 12) * 0.65}rem` }}>
          <span className="pt-[0.15rem]">•</span>
          <p className="min-h-[1.75rem]">{renderInlineFormatting(trimmed.slice(2))}</p>
        </div>
      );
    }

    const orderedMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
    if (orderedMatch) {
      return (
        <div key={`${line}-${index}`} className="flex gap-3" style={{ paddingLeft: `${Math.min(indent, 12) * 0.65}rem` }}>
          <span>{orderedMatch[1]}.</span>
          <p className="min-h-[1.75rem]">{renderInlineFormatting(orderedMatch[2])}</p>
        </div>
      );
    }

    return (
      <p
        key={`${line}-${index}`}
        className="min-h-[1.75rem]"
        style={{ paddingLeft: `${Math.min(indent, 12) * 0.65}rem` }}
      >
        {renderInlineFormatting(trimmed)}
      </p>
    );
  });

const NavItem = ({ id, label, icon: Icon, activeTab, onClick }) => (
  <button
    onClick={() => onClick(id)}
    className={`flex items-center gap-2 border-b-[2.5px] px-3 py-3 text-[15px] transition-all ${
      activeTab === id ? 'border-black text-black' : 'border-transparent text-stone-500 hover:text-black'
    }`}
  >
    <Icon size={17} strokeWidth={2} />
    <span className="font-semibold tracking-tight">{label}</span>
  </button>
);

function BoardSection({ boardId, posts, onOpenPost }) {
  const board = boardMeta[boardId];
  const featured = posts[0];
  const restPosts = posts.slice(1);

  return (
    <div className="space-y-8">
      <section className="max-w-3xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-stone-400">{board.label}</p>
            <h2 className="mt-3 text-4xl font-black tracking-tight">{board.title}</h2>
          </div>
          <button
            onClick={() => {
              window.location.hash = 'admin';
              window.scrollTo(0, 0);
            }}
            className="inline-flex items-center rounded-full border border-stone-200 bg-white px-5 py-2.5 text-sm font-semibold text-stone-700 transition-all hover:border-black hover:text-black"
          >
            Post
          </button>
        </div>
        <p className="mt-4 text-lg leading-8 text-stone-600">{board.subtitle}</p>
      </section>

      {posts.length === 0 ? (
        <div className="rounded-[2rem] border border-dashed border-stone-300 bg-white p-10 text-stone-500">
          No published posts here yet. Use the Post button to create the first one for this board.
        </div>
      ) : null}

      {posts.length > 0 && boardId === 'projects' ? (
        <div className="grid gap-8 md:grid-cols-2">
          {posts.map((post, index) => (
            <button
              key={post.id}
              onClick={() => onOpenPost(post.slug)}
              className={`overflow-hidden rounded-[2rem] border p-6 text-left transition-all hover:-translate-y-1 hover:border-black ${
                index === 0 ? 'border-black bg-black text-white md:col-span-2' : 'border-stone-200 bg-white'
              }`}
            >
              <div className={`mb-5 flex h-56 items-center justify-center rounded-[1.5rem] ${index === 0 ? 'bg-white/10' : board.bg}`}>
                {post.cover_url ? (
                  <img src={post.cover_url} alt={post.title} className="h-full w-full rounded-[1.5rem] object-cover" />
                ) : (
                  <board.icon size={36} className={index === 0 ? 'text-white/70' : 'text-stone-400'} />
                )}
              </div>
              <p className={`text-xs uppercase tracking-[0.2em] ${index === 0 ? 'text-white/60' : 'text-stone-400'}`}>
                {formatDate(post.published_at || post.created_at)}
              </p>
              <h3 className="mt-3 text-2xl font-bold">{post.title}</h3>
              <p className={`mt-4 leading-8 ${index === 0 ? 'text-white/80' : 'text-stone-600'}`}>{post.excerpt}</p>
            </button>
          ))}
        </div>
      ) : null}

      {posts.length > 0 && boardId === 'learning' ? (
        <div className="space-y-4">
          {posts.map((post, index) => (
            <button
              key={post.id}
              onClick={() => onOpenPost(post.slug)}
              className="grid gap-5 rounded-[2rem] border border-stone-200 bg-white p-6 text-left transition-all hover:border-black md:grid-cols-[120px_1fr_auto]"
            >
              <div className={`flex h-24 items-center justify-center rounded-[1.5rem] ${index % 2 === 0 ? 'bg-sky-50' : 'bg-stone-100'}`}>
                <BookOpen size={28} className="text-stone-400" />
              </div>
              <div>
                <p className="text-sm text-stone-400">{formatDate(post.published_at || post.created_at)}</p>
                <h3 className="mt-2 text-2xl font-bold">{post.title}</h3>
                <p className="mt-3 text-base leading-8 text-stone-600">{post.excerpt}</p>
              </div>
              <div className="flex items-center text-sm font-semibold text-stone-700">
                Read
                <ArrowRight size={14} className="ml-2" />
              </div>
            </button>
          ))}
        </div>
      ) : null}

      {posts.length > 0 && boardId === 'thinking' ? (
        <div className="grid gap-6">
          {featured ? (
            <button
              onClick={() => onOpenPost(featured.slug)}
              className="grid gap-6 rounded-[2rem] border border-stone-200 bg-white p-6 text-left transition-all hover:border-black lg:grid-cols-[1.1fr_0.9fr]"
            >
              <div className="space-y-5 py-2">
                <p className="text-sm uppercase tracking-[0.2em] text-stone-400">Featured Insight</p>
                <h3 className="text-4xl font-black leading-tight">{featured.title}</h3>
                <p className="text-lg leading-8 text-stone-600">{featured.excerpt}</p>
                <span className="inline-flex items-center text-sm font-semibold">
                  Open post
                  <ArrowRight size={14} className="ml-2" />
                </span>
              </div>
              <div className="overflow-hidden rounded-[1.5rem] bg-amber-50">
                {featured.cover_url ? (
                  <img src={featured.cover_url} alt={featured.title} className="h-full min-h-[280px] w-full object-cover" />
                ) : (
                  <div className="flex h-full min-h-[280px] items-center justify-center">
                    <PenSquare size={36} className="text-stone-400" />
                  </div>
                )}
              </div>
            </button>
          ) : null}

          {restPosts.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              {restPosts.map((post) => (
                <button
                  key={post.id}
                  onClick={() => onOpenPost(post.slug)}
                  className="rounded-[1.75rem] border border-stone-200 bg-white p-6 text-left transition-all hover:border-black"
                >
                  <p className="text-sm text-stone-400">{formatDate(post.published_at || post.created_at)}</p>
                  <h3 className="mt-3 text-xl font-bold">{post.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-stone-600">{post.excerpt}</p>
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {posts.length > 0 && boardId === 'growth' ? (
        <div className="relative ml-3 border-l-2 border-stone-200 pl-8">
          {posts.map((post, index) => (
            <button
              key={post.id}
              onClick={() => onOpenPost(post.slug)}
              className="relative mb-8 block w-full rounded-[1.75rem] border border-stone-200 bg-white p-6 text-left transition-all hover:border-black"
            >
              <div className="absolute -left-[43px] top-8 h-4 w-4 rounded-full border-4 border-[#fbf8f1] bg-black" />
              <p className="text-sm text-stone-400">{formatDate(post.published_at || post.created_at)}</p>
              <h3 className="mt-2 text-2xl font-bold">{post.title}</h3>
              <p className="mt-4 text-base leading-8 text-stone-600">{post.excerpt}</p>
              {index === posts.length - 1 ? <div className="mt-4 text-sm font-semibold text-stone-700">Still becoming</div> : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function AdminPage({ session, posts, onRequireRefresh }) {
  const [form, setForm] = useState(initialForm);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [fontSize, setFontSize] = useState(16);
  const coverPasteRef = useRef(null);
  const textareaRef = useRef(null);

  const submitLogin = async (event) => {
    event.preventDefault();
    setAuthLoading(true);
    setError('');
    try {
      await signInWithPassword(email, password);
      await onRequireRefresh();
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setAuthLoading(false);
    }
  };

  const uploadCoverFile = async (file, successMessage = '') => {
    if (!file) return;
    setSaving(true);
    setError('');
    if (successMessage) setSuccess('');
    try {
      const url = await uploadCover(file);
      if (url) {
        setForm((prev) => ({ ...prev, cover_url: url }));
        if (successMessage) setSuccess(successMessage);
      }
    } catch (err) {
      setError(err.message || 'Image upload failed');
    } finally {
      setSaving(false);
    }
  };

  const handleFile = async (event) => {
    const file = event.target.files?.[0];
    await uploadCoverFile(file);
  };

  const handleCoverPaste = async (event) => {
    const file = Array.from(event.clipboardData?.items || [])
      .find((item) => item.type.startsWith('image/'))
      ?.getAsFile();

    if (!file) return;
    event.preventDefault();
    await uploadCoverFile(file, 'Cover image pasted');
  };

  const focusEditor = () => {
    textareaRef.current?.focus();
  };

  const updateContentSelection = (nextContent, start, end = start) => {
    setForm((prev) => ({ ...prev, content: nextContent }));

    requestAnimationFrame(() => {
      if (!textareaRef.current) return;
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(start, end);
    });
  };

  const transformSelectedLines = (transformLine) => {
    if (!textareaRef.current) return;

    const { selectionStart, selectionEnd, value } = textareaRef.current;
    const blockStart = value.lastIndexOf('\n', Math.max(selectionStart - 1, 0)) + 1;
    const rawBlockEnd = value.indexOf('\n', selectionEnd);
    const blockEnd = rawBlockEnd === -1 ? value.length : rawBlockEnd;
    const selectedBlock = value.slice(blockStart, blockEnd);
    const nextBlock = selectedBlock
      .split('\n')
      .map((line, index) => transformLine(line, index))
      .join('\n');
    const nextValue = `${value.slice(0, blockStart)}${nextBlock}${value.slice(blockEnd)}`;
    updateContentSelection(nextValue, blockStart, blockStart + nextBlock.length);
  };

  const toggleWrapSelection = (prefix, suffix = prefix, placeholder = '') => {
    if (!textareaRef.current) return;

    const { selectionStart, selectionEnd, value } = textareaRef.current;
    const selected = value.slice(selectionStart, selectionEnd) || placeholder;
    const nextValue = `${value.slice(0, selectionStart)}${prefix}${selected}${suffix}${value.slice(selectionEnd)}`;
    const start = selectionStart + prefix.length;
    updateContentSelection(nextValue, start, start + selected.length);
  };

  const applyFontSize = (size) => {
    setFontSize(size);
    focusEditor();
  };

  const applyBold = () => toggleWrapSelection('**', '**', 'bold text');
  const applyIndent = () => transformSelectedLines((line) => `    ${line}`);
  const applyOutdent = () => transformSelectedLines((line) => line.replace(/^( {1,4}|\t)/, ''));
  const applyHeading = () => transformSelectedLines((line) => (line.startsWith('## ') ? line.replace(/^##\s*/, '') : `## ${line}`));
  const applyQuote = () => transformSelectedLines((line) => (line.startsWith('> ') ? line.replace(/^>\s*/, '') : `> ${line}`));
  const applyBulletList = () => transformSelectedLines((line) => (line.startsWith('- ') ? line.replace(/^-\s*/, '') : `- ${line}`));
  const applyNumberedList = () => transformSelectedLines((line, index) => {
    const stripped = line.replace(/^\d+\.\s+/, '');
    return `${index + 1}. ${stripped}`;
  });

  const submitPost = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const boardToOpen = form.board || 'thinking';
      await savePost({
        ...form,
        slug: form.slug || slugify(form.title),
      });
      setSuccess('Post saved');
      setForm(initialForm);
      await onRequireRefresh();
      window.location.hash = boardToOpen;
      window.scrollTo(0, 0);
    } catch (err) {
      setError(err.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  if (!session) {
    return (
      <div className="mx-auto max-w-lg space-y-6">
        <div>
          <p className="text-sm uppercase tracking-[0.24em] text-stone-400">Admin</p>
          <h2 className="mt-3 text-4xl font-black tracking-tight">Admin Editor</h2>
          <p className="mt-4 text-lg leading-8 text-stone-600">
            One editor for all four boards. Pick a board, publish once, and the post lands in the right section automatically.
          </p>
        </div>
        <form onSubmit={submitLogin} className="space-y-4 rounded-[2rem] border border-stone-200 bg-white p-8">
          <input
            className="w-full rounded-2xl border border-stone-200 px-4 py-3 outline-none"
            placeholder="Admin email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            type="password"
            className="w-full rounded-2xl border border-stone-200 px-4 py-3 outline-none"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {error ? <p className="text-sm text-red-500">{error}</p> : null}
          <button className="inline-flex items-center rounded-full bg-black px-5 py-3 text-sm text-white" disabled={authLoading}>
            {authLoading ? <Loader2 size={14} className="mr-2 animate-spin" /> : null}
            Sign in
          </button>
          {!isSupabaseConfigured ? (
            <p className="text-sm text-stone-500">Supabase env vars are still missing. Add them to `.env.local` before signing in.</p>
          ) : null}
        </form>
      </div>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr]">
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-stone-400">Admin</p>
            <h2 className="mt-3 text-4xl font-black tracking-tight">Admin Editor</h2>
          </div>
          <button
            onClick={async () => {
              await signOut();
              await onRequireRefresh();
            }}
            className="rounded-full border border-stone-200 px-4 py-2 text-sm"
          >
            Sign out
          </button>
        </div>

        <div className="space-y-3">
          {posts.map((post) => (
            <button
              key={post.id}
              onClick={() =>
                setForm({
                  id: post.id,
                  board: post.board || 'thinking',
                  title: post.title || '',
                  slug: post.slug || '',
                  excerpt: post.excerpt || '',
                  content: post.content || '',
                  cover_url: post.cover_url || '',
                  status: post.status || 'draft',
                })
              }
              className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-4 text-left"
            >
              <p className="text-xs uppercase tracking-[0.18em] text-stone-400">
                {post.status} · {boardMeta[post.board || 'thinking']?.nav || 'Insight'}
              </p>
              <p className="mt-2 font-semibold">{post.title}</p>
              <p className="mt-1 text-sm text-stone-500">{post.slug}</p>
            </button>
          ))}
        </div>
      </section>

      <form onSubmit={submitPost} className="space-y-4 rounded-[2rem] border border-stone-200 bg-white p-8">
        <div className="grid gap-4 md:grid-cols-[180px_1fr_1fr]">
          <select
            className="rounded-2xl border border-stone-200 px-4 py-3 outline-none"
            value={form.board}
            onChange={(e) => setForm((prev) => ({ ...prev, board: e.target.value }))}
          >
            {Object.values(boardMeta).map((board) => (
              <option key={board.id} value={board.id}>
                {board.nav}
              </option>
            ))}
          </select>
          <input
            className="rounded-2xl border border-stone-200 px-4 py-3 outline-none"
            placeholder="Title"
            value={form.title}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                title: e.target.value,
                slug: prev.id ? prev.slug : slugify(e.target.value),
              }))
            }
          />
          <input
            className="rounded-2xl border border-stone-200 px-4 py-3 outline-none"
            placeholder="slug"
            value={form.slug}
            onChange={(e) => setForm((prev) => ({ ...prev, slug: slugify(e.target.value) }))}
          />
        </div>

        <input
          className="w-full rounded-2xl border border-stone-200 px-4 py-3 outline-none"
          placeholder="Excerpt"
          value={form.excerpt}
          onChange={(e) => setForm((prev) => ({ ...prev, excerpt: e.target.value }))}
        />

        <div className="space-y-3">
          <div className="overflow-hidden rounded-[1.75rem] border border-stone-200 bg-white">
            <div className="sticky top-[88px] z-10 flex flex-wrap items-center gap-2 border-b border-stone-200 bg-white px-4 py-3">
              <div className="mr-2 inline-flex items-center rounded-full border border-stone-200 px-3 py-2 text-sm text-stone-700">
                <span className="mr-2 font-medium">Size</span>
                <select value={fontSize} onChange={(e) => applyFontSize(Number(e.target.value))} className="bg-transparent outline-none">
                  <option value={14}>14</option>
                  <option value={16}>16</option>
                  <option value={18}>18</option>
                  <option value={20}>20</option>
                  <option value={24}>24</option>
                  <option value={28}>28</option>
                </select>
              </div>
              <button
                type="button"
                onClick={applyHeading}
                className="inline-flex items-center rounded-full border border-stone-200 px-3 py-2 text-sm font-medium text-stone-700"
              >
                <Heading2 size={14} className="mr-2" />
                H2
              </button>
              <button
                type="button"
                onClick={applyBold}
                className="inline-flex items-center rounded-full border border-stone-200 px-3 py-2 text-sm font-medium text-stone-700"
              >
                <Bold size={14} className="mr-2" />
                Bold
              </button>
              <button
                type="button"
                onClick={applyBulletList}
                className="inline-flex items-center rounded-full border border-stone-200 px-3 py-2 text-sm font-medium text-stone-700"
              >
                <List size={14} className="mr-2" />
                List
              </button>
              <button
                type="button"
                onClick={applyNumberedList}
                className="inline-flex items-center rounded-full border border-stone-200 px-3 py-2 text-sm font-medium text-stone-700"
              >
                <ListOrdered size={14} className="mr-2" />
                Numbered
              </button>
              <button
                type="button"
                onClick={applyQuote}
                className="inline-flex items-center rounded-full border border-stone-200 px-3 py-2 text-sm font-medium text-stone-700"
              >
                <Quote size={14} className="mr-2" />
                Quote
              </button>
              <button
                type="button"
                onClick={applyIndent}
                className="inline-flex items-center rounded-full border border-stone-200 px-3 py-2 text-sm font-medium text-stone-700"
              >
                <Indent size={14} className="mr-2" />
                Indent
              </button>
              <button
                type="button"
                onClick={applyOutdent}
                className="inline-flex items-center rounded-full border border-stone-200 px-3 py-2 text-sm font-medium text-stone-700"
              >
                <Outdent size={14} className="mr-2" />
                Outdent
              </button>
            </div>
            <div className="relative z-0 bg-white p-1" onClick={focusEditor}>
              <textarea
                ref={textareaRef}
                rows={14}
                spellCheck
                autoCapitalize="sentences"
                autoCorrect="on"
                className="block min-h-[320px] w-full resize-y cursor-text rounded-[1.2rem] bg-white px-4 py-4 text-stone-900 caret-black outline-none"
                style={{ fontSize: `${fontSize}px`, lineHeight: 1.9 }}
                placeholder="Write the post here. Project, Learning, Insight, and Journal all share this editor."
                value={form.content}
                onClick={focusEditor}
                onFocus={focusEditor}
                onChange={(e) => setForm((prev) => ({ ...prev, content: e.target.value }))}
              />
            </div>
          </div>
          <p className="text-sm text-stone-500">The toolbar stays fixed while you write. Select text to change size, bold, lists, quotes, and indent.</p>
        </div>

        <div className="space-y-4">
          <div
            ref={coverPasteRef}
            tabIndex={0}
            onPaste={handleCoverPaste}
            onClick={() => coverPasteRef.current?.focus()}
            className="flex min-h-[180px] cursor-text flex-col items-center justify-center rounded-[1.75rem] border-2 border-dashed border-stone-300 bg-stone-50 px-6 py-8 text-center outline-none transition-all focus:border-black focus:bg-white"
          >
            {form.cover_url ? (
              <img src={form.cover_url} alt="Cover preview" className="h-40 w-full rounded-[1.25rem] object-cover" />
            ) : (
              <>
                <ImagePlus size={24} className="text-stone-400" />
                <p className="mt-4 text-base font-semibold text-stone-700">Paste cover image here</p>
                <p className="mt-2 text-sm text-stone-500">Click this box, then press `Ctrl+V`</p>
              </>
            )}
          </div>
          <div className="grid gap-4 md:grid-cols-[1fr_auto_auto] md:items-center">
            <input
              className="rounded-2xl border border-stone-200 bg-white px-4 py-3 outline-none"
              placeholder="Cover image URL"
              value={form.cover_url}
              onChange={(e) => setForm((prev) => ({ ...prev, cover_url: e.target.value }))}
            />
            <label className="inline-flex cursor-pointer items-center justify-center rounded-full border border-stone-200 bg-white px-4 py-3 text-sm">
              <ImagePlus size={14} className="mr-2" />
              Upload cover
              <input type="file" accept="image/*" className="hidden" onChange={handleFile} />
            </label>
            <button
              type="button"
              onClick={() => coverPasteRef.current?.focus()}
              className="rounded-full border border-stone-200 bg-white px-4 py-3 text-sm"
            >
              Paste
            </button>
          </div>
          <select
            className="rounded-full border border-stone-200 px-4 py-3 text-sm outline-none"
            value={form.status}
            onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value }))}
          >
            <option value="draft">draft</option>
            <option value="published">published</option>
          </select>
        </div>

        {error ? <p className="text-sm text-red-500">{error}</p> : null}
        {success ? <p className="text-sm text-emerald-600">{success}</p> : null}
        <button className="inline-flex items-center rounded-full bg-black px-5 py-3 text-sm text-white" disabled={saving}>
          {saving ? <Loader2 size={14} className="mr-2 animate-spin" /> : null}
          Save post
        </button>
      </form>
    </div>
  );
}

const App = () => {
  const [route, setRoute] = useState(getRouteFromHash());
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [publishedPosts, setPublishedPosts] = useState([]);
  const [adminPosts, setAdminPosts] = useState([]);
  const [selectedPost, setSelectedPost] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refreshData = async (currentRoute = route) => {
    setLoading(true);
    setError('');

    try {
      const [posts, adminSession] = await Promise.all([getPublishedPosts(), getSession()]);
      setPublishedPosts(posts);
      setSession(adminSession);

      if (currentRoute.view === 'post' && currentRoute.slug) {
        const post = await getPostBySlug(currentRoute.slug);
        setSelectedPost(post);
      } else {
        setSelectedPost(null);
      }

      if (currentRoute.view === 'admin' && adminSession) {
        setAdminPosts(await getAdminPosts());
      } else {
        setAdminPosts([]);
      }
    } catch (err) {
      setError(err.message || 'Loading failed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const onHashChange = () => setRoute(getRouteFromHash());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  useEffect(() => {
    refreshData(route);
  }, [route.view, route.slug]);

  const postsByBoard = useMemo(
    () =>
      publishedPosts.reduce(
        (accumulator, post) => {
          const board = post.board || 'thinking';
          if (!accumulator[board]) accumulator[board] = [];
          accumulator[board].push(post);
          return accumulator;
        },
        { projects: [], learning: [], thinking: [], growth: [] }
      ),
    [publishedPosts]
  );

  const featuredPosts = Object.values(postsByBoard)
    .flat()
    .sort((a, b) => new Date(b.published_at || b.created_at) - new Date(a.published_at || a.created_at))
    .slice(0, 4);

  const switchTab = (id) => {
    window.location.hash = id === 'home' ? '' : id;
    setIsMenuOpen(false);
    window.scrollTo(0, 0);
  };

  const openPost = (slug) => {
    window.location.hash = `post/${encodeURIComponent(slug)}`;
    setIsMenuOpen(false);
    window.scrollTo(0, 0);
  };

  const openAdmin = () => {
    window.location.hash = 'admin';
    setIsMenuOpen(false);
    window.scrollTo(0, 0);
  };

  const currentTab = route.view === 'post' ? selectedPost?.board || 'thinking' : route.view || 'home';

  return (
    <div className="min-h-screen bg-[#fbf8f1] text-[#1a1a1a] selection:bg-amber-100">
      <nav className="sticky top-0 z-50 border-b border-stone-200 bg-[#fbf8f1]/95 px-6 py-3 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <button className="flex items-center text-xl font-bold tracking-tight" onClick={() => switchTab('home')}>
            <span className="mr-2 rounded-md bg-black px-2 py-1 text-white">AI</span>
            {profile.name}
          </button>

          <div className="hidden md:flex md:items-center md:gap-6">
            {tabs.map((tab) => (
              <NavItem key={tab.id} {...tab} activeTab={currentTab} onClick={switchTab} />
            ))}
            <button
              onClick={openAdmin}
              className={`rounded-full border px-4 py-2 text-sm transition-all ${
                route.view === 'admin'
                  ? 'border-black bg-black text-white'
                  : 'border-stone-300 text-stone-600 hover:border-black hover:text-black'
              }`}
            >
              Login
            </button>
          </div>

          <button className="md:hidden" onClick={() => setIsMenuOpen((value) => !value)}>
            {isMenuOpen ? <X /> : <Menu />}
          </button>
        </div>

        {isMenuOpen ? (
          <div className="absolute left-0 top-full flex w-full flex-col space-y-2 border-b border-stone-200 bg-[#fbf8f1] p-4 md:hidden">
            {tabs.map((tab) => (
              <NavItem key={tab.id} {...tab} activeTab={currentTab} onClick={switchTab} />
            ))}
            <button
              onClick={openAdmin}
              className={`mt-2 rounded-xl border px-4 py-3 text-left text-sm transition-all ${
                route.view === 'admin' ? 'border-black bg-black text-white' : 'border-stone-300 text-stone-600'
              }`}
            >
              Login
            </button>
          </div>
        ) : null}
      </nav>

      <main className="mx-auto max-w-6xl px-6 py-12">
        {loading ? (
          <div className="flex items-center text-stone-500">
            <Loader2 size={16} className="mr-2 animate-spin" />
            Loading content
          </div>
        ) : null}

        {error && !loading ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
        ) : null}

        {!loading && currentTab === 'home' ? (
          <div className="py-8 md:py-12">
            <section className="max-w-5xl">
              <div className="mb-5 inline-flex items-center rounded-full border border-stone-300 bg-white px-4 py-2 text-sm text-stone-600">
                AI portfolio
              </div>
              <h1 className="max-w-5xl text-5xl font-black leading-[0.95] tracking-tight md:text-7xl">
                Put four kinds of content
                <br />
                into one
                <br />
                posting system.
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-stone-600">I do, I learn, I think, I grow.</p>

              <div className="mt-12 grid max-w-5xl gap-4 md:grid-cols-4">
                {Object.values(boardMeta).map((board) => (
                  <button
                    key={board.id}
                    onClick={() => switchTab(board.id)}
                    className={`rounded-[2rem] border border-stone-200 p-6 text-left transition-all hover:-translate-y-1 hover:border-black ${board.bg}`}
                  >
                    <board.icon className="mb-10 text-stone-600" size={22} />
                    <div className="text-3xl font-black tracking-tight">{board.label}</div>
                    <div className="mt-2 text-sm text-stone-500">{board.title}</div>
                  </button>
                ))}
              </div>

              {featuredPosts.length > 0 ? (
                <div className="mt-12 grid gap-4 md:grid-cols-2">
                  {featuredPosts.map((post) => {
                    const board = boardMeta[post.board || 'thinking'];
                    return (
                      <button
                        key={post.id}
                        onClick={() => openPost(post.slug)}
                        className="rounded-[2rem] border border-stone-200 bg-white p-6 text-left transition-all hover:border-black"
                      >
                        <p className="text-xs uppercase tracking-[0.2em] text-stone-400">{board.nav}</p>
                        <h3 className="mt-3 text-2xl font-bold">{post.title}</h3>
                        <p className="mt-3 text-sm leading-7 text-stone-600">{post.excerpt}</p>
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </section>
          </div>
        ) : null}

        {!loading && boardMeta[route.view] ? (
          <BoardSection boardId={route.view} posts={postsByBoard[route.view] || []} onOpenPost={openPost} />
        ) : null}

        {!loading && route.view === 'post' && selectedPost ? (
          <div className="space-y-10">
            <button
              onClick={() => switchTab(selectedPost.board || 'thinking')}
              className="inline-flex items-center rounded-full border border-stone-200 bg-white px-4 py-2 text-sm text-stone-600"
            >
              <ArrowLeft size={14} className="mr-2" />
              Back to {boardMeta[selectedPost.board || 'thinking']?.nav || 'Insight'}
            </button>

            <article className="overflow-hidden rounded-[2.2rem] border border-stone-200 bg-white">
              {selectedPost.cover_url ? (
                <img src={selectedPost.cover_url} alt={selectedPost.title} className="h-80 w-full object-cover" />
              ) : null}
              <div className="space-y-7 p-8 md:p-10">
                <p className="text-sm text-stone-400">
                  {boardMeta[selectedPost.board || 'thinking']?.nav} · {formatDate(selectedPost.published_at || selectedPost.created_at)}
                </p>
                <h1 className="text-4xl font-black leading-tight md:text-5xl">{selectedPost.title}</h1>
                {selectedPost.excerpt ? <p className="text-lg leading-9 text-stone-700">{selectedPost.excerpt}</p> : null}
                <div className="rounded-[1.7rem] bg-stone-50 p-6 text-base leading-8 text-stone-600">
                  {hasHtmlMarkup(selectedPost.content) ? (
                    <div
                      className="space-y-3 [&_blockquote]:my-3 [&_blockquote]:border-l-4 [&_blockquote]:border-stone-300 [&_blockquote]:pl-4 [&_p]:min-h-[1.75rem]"
                      dangerouslySetInnerHTML={{ __html: selectedPost.content }}
                    />
                  ) : (
                    <div className="space-y-3">{renderRichContent(selectedPost.content)}</div>
                  )}
                </div>
              </div>
            </article>
          </div>
        ) : null}

        {!loading && route.view === 'post' && !selectedPost ? (
          <div className="mx-auto max-w-3xl space-y-6 rounded-[2rem] border border-stone-200 bg-white p-8">
            <p className="text-sm uppercase tracking-[0.24em] text-stone-400">Post</p>
            <h2 className="text-3xl font-black tracking-tight">This post is not available</h2>
            <p className="text-base leading-8 text-stone-600">
              The link may be outdated, or this post has not been published yet. You can go back to the Insight board and continue from there.
            </p>
            <button
              onClick={() => switchTab('thinking')}
              className="inline-flex items-center rounded-full border border-stone-200 bg-[#fbf8f1] px-5 py-3 text-sm font-semibold text-stone-700"
            >
              <ArrowLeft size={14} className="mr-2" />
              Back to Insight
            </button>
          </div>
        ) : null}

        {!loading && route.view === 'admin' ? (
          <AdminPage session={session} posts={adminPosts} onRequireRefresh={() => refreshData({ view: 'admin' })} />
        ) : null}

        {!loading && route.view === 'about' ? (
          <div className="mx-auto max-w-3xl space-y-10">
            <section className="text-center">
              <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-stone-200">
                <User size={44} className="text-stone-400" />
              </div>
              <h2 className="text-4xl font-black tracking-tight">{profile.title}</h2>
              <p className="mt-4 text-lg italic text-stone-500">A system for making, keeping, and becoming.</p>
            </section>
            <section className="rounded-[2rem] border border-stone-200 bg-white p-8">
              <h3 className="text-2xl font-bold">What this is</h3>
              <p className="mt-4 text-base leading-8 text-stone-600">{profile.bio}</p>
            </section>
            <div className="flex justify-center space-x-8 text-sm">
              <a href={profile.github} className="flex items-center hover:text-blue-600">
                <Github size={18} className="mr-2" />
                Github
              </a>
              <a href={`mailto:${profile.email}`} className="flex items-center hover:text-blue-600">
                <Mail size={18} className="mr-2" />
                Email
              </a>
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
};

export default App;
