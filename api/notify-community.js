function json(res, status, body) {
  res.status(status).json(body);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return json(res, 405, { error: 'Method not allowed' });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const resendApiKey = process.env.RESEND_API_KEY;
  const resendFromEmail = process.env.RESEND_FROM_EMAIL;
  const notificationEmail = process.env.ADMIN_NOTIFICATION_EMAIL;
  const accessToken = req.headers.authorization?.replace(/^Bearer\s+/i, '');
  const postId = typeof req.body?.postId === 'string' ? req.body.postId : '';

  if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey || !resendApiKey || !resendFromEmail || !notificationEmail) {
    return json(res, 503, { error: 'Community notification is not configured.' });
  }
  if (!accessToken || !postId) return json(res, 400, { error: 'Missing authorization or post ID.' });

  const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: { apikey: supabaseAnonKey, Authorization: `Bearer ${accessToken}` }
  });
  if (!userResponse.ok) return json(res, 401, { error: 'Invalid session.' });
  const user = await userResponse.json();

  const postResponse = await fetch(
    `${supabaseUrl}/rest/v1/community_posts?id=eq.${encodeURIComponent(postId)}&author_id=eq.${encodeURIComponent(user.id)}&select=question,species_name,author_display_name,created_at&limit=1`,
    {
      headers: {
        apikey: supabaseServiceRoleKey,
        Authorization: `Bearer ${supabaseServiceRoleKey}`
      }
    }
  );
  if (!postResponse.ok) return json(res, 502, { error: 'Could not verify community post.' });
  const posts = await postResponse.json();
  if (!posts.length) return json(res, 404, { error: 'Post not found.' });

  const post = posts[0];
  const resendResponse = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: resendFromEmail,
      to: [notificationEmail],
      subject: 'Yeni ExoticPetsHub topluluk paylaşımı',
      text: [
        `Yeni paylaşım: ${post.author_display_name}`,
        post.species_name ? `Tür: ${post.species_name}` : '',
        `Soru: ${post.question}`,
        `İncelemek için: https://exoticpetshub.com.tr/community`
      ].filter(Boolean).join('\n')
    })
  });
  if (!resendResponse.ok) return json(res, 502, { error: 'Notification email could not be sent.' });
  return json(res, 200, { ok: true });
}
