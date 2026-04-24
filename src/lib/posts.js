import { fallbackBoardPosts } from '../data/fallback';

const POST_STORAGE_KEY = 'ai-profile-local-posts';
const SESSION_STORAGE_KEY = 'ai-profile-local-session';
const IMAGE_MAX_SIDE = 1600;
const IMAGE_QUALITY = 0.86;

const isBrowser = () => typeof window !== 'undefined';

const sortByNewest = (posts) =>
  [...posts].sort(
    (a, b) =>
      new Date(b.published_at || b.updated_at || b.created_at || 0) -
      new Date(a.published_at || a.updated_at || a.created_at || 0)
  );

const normalizePost = (row) => ({
  ...row,
  id: row.id || `local-${Date.now()}`,
  board: row.board || 'thinking',
  slug: row.slug || '',
  title: row.title || 'Untitled post',
  excerpt: row.excerpt || '',
  content: typeof row.content === 'string' ? row.content : '',
  cover_url: row.cover_url || '',
  cover_aspect_ratio: row.cover_aspect_ratio || '16 / 9',
  status: row.status || 'published',
  published_at: row.published_at || null,
  created_at: row.created_at || new Date().toISOString(),
  updated_at: row.updated_at || row.created_at || new Date().toISOString(),
});

const readJson = (key, fallbackValue) => {
  if (!isBrowser()) return fallbackValue;

  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallbackValue;
  } catch {
    return fallbackValue;
  }
};

const writeJson = (key, value) => {
  if (!isBrowser()) return;
  window.localStorage.setItem(key, JSON.stringify(value));
};

const readLocalPosts = () => {
  const posts = readJson(POST_STORAGE_KEY, []);
  return Array.isArray(posts) ? posts.map(normalizePost) : [];
};

const writeLocalPosts = (posts) => {
  writeJson(POST_STORAGE_KEY, sortByNewest(posts.map(normalizePost)));
};

const upsertByIdentity = (posts, nextPost) => {
  const normalized = normalizePost(nextPost);
  const index = posts.findIndex(
    (post) => post.id === normalized.id || (post.slug && normalized.slug && post.slug === normalized.slug)
  );

  if (index === -1) return [...posts, normalized];

  const nextPosts = [...posts];
  nextPosts[index] = {
    ...nextPosts[index],
    ...normalized,
  };
  return nextPosts;
};

const getAllPosts = () => {
  const seededPosts = fallbackBoardPosts.map(normalizePost);
  const localPosts = readLocalPosts();
  const merged = localPosts.reduce(upsertByIdentity, seededPosts);
  return sortByNewest(merged);
};

const readFileAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error || new Error('Could not read image file'));
    reader.readAsDataURL(file);
  });

const loadImage = (src) =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Could not load image file'));
    image.src = src;
  });

const compressImageDataUrl = async (dataUrl) => {
  if (typeof document === 'undefined' || typeof Image === 'undefined') {
    return dataUrl;
  }

  const image = await loadImage(dataUrl);
  const scale = Math.min(1, IMAGE_MAX_SIDE / Math.max(image.width, image.height));
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext('2d');
  context.drawImage(image, 0, 0, width, height);

  return canvas.toDataURL('image/jpeg', IMAGE_QUALITY);
};

export async function getPublishedPosts() {
  return getAllPosts().filter((post) => post.status === 'published');
}

export async function getPostBySlug(slug) {
  return getAllPosts().find((post) => post.slug === slug) || null;
}

export async function getAdminPosts() {
  return getAllPosts();
}

export async function savePost(post) {
  const slug = post.slug?.trim();
  const title = post.title?.trim();

  if (!title) {
    throw new Error('Title is required');
  }

  if (!slug) {
    throw new Error('Slug is required');
  }

  const now = new Date().toISOString();
  const allPosts = getAllPosts();
  const existingPost = allPosts.find((item) => item.id === post.id || item.slug === slug);
  const status = post.status || existingPost?.status || 'published';
  const nextPost = normalizePost({
    ...existingPost,
    ...post,
    id: post.id || existingPost?.id || `local-${Date.now()}`,
    slug,
    title,
    status,
    created_at: existingPost?.created_at || post.created_at || now,
    updated_at: now,
    published_at: status === 'published' ? post.published_at || existingPost?.published_at || now : null,
  });

  const localPosts = readLocalPosts();
  writeLocalPosts(upsertByIdentity(localPosts, nextPost));

  return nextPost;
}

export async function uploadCover(file) {
  if (!file) return '';

  if (!file.type?.startsWith('image/')) {
    throw new Error('Please choose an image file');
  }

  const dataUrl = await readFileAsDataUrl(file);

  try {
    return await compressImageDataUrl(dataUrl);
  } catch {
    return dataUrl;
  }
}

export async function uploadContentImage(file) {
  return uploadCover(file);
}

export async function signInWithPassword(email, password) {
  const configuredEmail = import.meta.env.VITE_ADMIN_EMAIL || '';
  const configuredPassword = import.meta.env.VITE_ADMIN_PASSWORD || '';
  const trimmedEmail = email.trim();

  if (!trimmedEmail) {
    throw new Error('Email is required');
  }

  if (configuredEmail && trimmedEmail !== configuredEmail) {
    throw new Error('Invalid admin email');
  }

  if (configuredPassword && password !== configuredPassword) {
    throw new Error('Invalid password');
  }

  const session = {
    user: { email: trimmedEmail },
    provider: 'local',
    created_at: new Date().toISOString(),
  };

  writeJson(SESSION_STORAGE_KEY, session);
  return { user: session.user, session };
}

export async function signOut() {
  if (!isBrowser()) return;
  window.localStorage.removeItem(SESSION_STORAGE_KEY);
}

export async function getSession() {
  return readJson(SESSION_STORAGE_KEY, null);
}
