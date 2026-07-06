// Server-side Supabase client.
// Uses the SECRET key, so it has full access and bypasses Row Level Security.
// This file is ONLY ever imported by /api functions — it never reaches the browser.
const { createClient } = require('@supabase/supabase-js');

const url = process.env.SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY;

if (!url || !secret) {
  console.warn('[supabase] Missing SUPABASE_URL or SUPABASE_SECRET_KEY env vars.');
}

const supabase = createClient(url, secret, {
  auth: { persistSession: false, autoRefreshToken: false }
});

// Bucket names (created by the setup SQL)
const BUCKETS = { images: 'uploads', media: 'media' };

module.exports = { supabase, BUCKETS };
