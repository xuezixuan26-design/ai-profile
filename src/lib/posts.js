import { fallbackBoardPosts } from '../data/fallback';
import { isSupabaseConfigured, supabase } from './supabase';

const TABLE = 'posts';
const BUCKET = 'post-images';

const normalizePost = (row) => ({
  ...row,
  board: row.board || 'thinking',
  excerpt: row.excerpt || '',
  content: typeof row.content === 'string' ? row.content : '',
  cover_url: row.cover_url || '',
});

export async function getPublishedPosts() {
  if (!isSupabaseConfigured) {
    return fallbackBoardPosts;
  }

  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []).map(normalizePost);
}

export async function getPostBySlug(slug) {
  if (!isSupabaseConfigured) {
    return fallbackBoardPosts.find((post) => post.slug === slug) || null;
  }

  const { data, error } = await supabase.from(TABLE).select('*').eq('slug', slug).maybeSingle();
  if (error) throw error;
  return data ? normalizePost(data) : null;
}

export async function getAdminPosts() {
  if (!isSupabaseConfigured) {
    return fallbackBoardPosts;
  }

  const { data, error } = await supabase.from(TABLE).select('*').order('updated_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(normalizePost);
}

export async function savePost(post) {
  if (!isSupabaseConfigured) {
    return {
      ...post,
      board: post.board || 'thinking',
      id: post.id || `local-${Date.now()}`,
    };
  }

  const payload = {
    board: post.board || 'thinking',
    slug: post.slug,
    title: post.title,
    excerpt: post.excerpt || '',
    content: post.content || '',
    cover_url: post.cover_url || '',
    status: post.status,
    published_at: post.status === 'published' ? post.published_at || new Date().toISOString() : null,
  };

  const query = post.id
    ? supabase.from(TABLE).update(payload).eq('id', post.id).select().single()
    : supabase.from(TABLE).insert(payload).select().single();

  const { data, error } = await query;
  if (error) throw error;
  return normalizePost(data);
}

export async function uploadCover(file) {
  if (!isSupabaseConfigured || !file) {
    return '';
  }

  const ext = file.name.split('.').pop();
  const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
  });

  if (error) throw error;
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export async function signInWithPassword(email, password) {
  if (!isSupabaseConfigured) {
    return { user: { email } };
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signOut() {
  if (!isSupabaseConfigured) return;
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getSession() {
  if (!isSupabaseConfigured) {
    return null;
  }

  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}
