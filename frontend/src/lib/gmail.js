const GMAIL_BASE = 'https://gmail.googleapis.com/gmail/v1/users/me';

/* ── decode base64url ── */
function decodeBase64Url(str) {
  if (!str) return '';
  try {
    const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
    return decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + c.charCodeAt(0).toString(16).padStart(2, '0'))
        .join('')
    );
  } catch {
    return '';
  }
}

/* ── extract header value ── */
function header(headers, name) {
  return headers?.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value ?? '';
}

/* ── parse email body (plain text preferred) ── */
function extractBody(payload) {
  if (!payload) return '';

  // single-part plain text
  if (payload.mimeType === 'text/plain' && payload.body?.data) {
    return decodeBase64Url(payload.body.data);
  }

  // multipart — look for text/plain first
  if (payload.parts) {
    const plain = payload.parts.find((p) => p.mimeType === 'text/plain');
    if (plain?.body?.data) return decodeBase64Url(plain.body.data);
    // fallback: html stripped
    const html = payload.parts.find((p) => p.mimeType === 'text/html');
    if (html?.body?.data) {
      const raw = decodeBase64Url(html.body.data);
      return raw.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    }
  }

  return '';
}

/* ── list messages (IDs only) ── */
export async function listMessages(accessToken, query = '', maxResults = 20) {
  const params = new URLSearchParams({ maxResults: String(maxResults) });
  if (query) params.set('q', query);

  const res = await fetch(`${GMAIL_BASE}/messages?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message ?? `Gmail API error ${res.status}`);
  }
  const data = await res.json();
  return data.messages ?? [];
}

/* ── fetch single message detail ── */
export async function getMessage(accessToken, id) {
  const res = await fetch(`${GMAIL_BASE}/messages/${id}?format=full`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Gmail message fetch error ${res.status}`);
  const msg = await res.json();
  const hdrs = msg.payload?.headers ?? [];
  return {
    id: msg.id,
    threadId: msg.threadId,
    subject: header(hdrs, 'Subject') || '(no subject)',
    from: header(hdrs, 'From'),
    date: header(hdrs, 'Date'),
    snippet: msg.snippet ?? '',
    body: extractBody(msg.payload),
    labelIds: msg.labelIds ?? [],
  };
}

/* ── batch fetch messages with details ── */
export async function fetchInbox(accessToken, query = '', maxResults = 20) {
  const list = await listMessages(accessToken, query, maxResults);
  const details = await Promise.all(list.map((m) => getMessage(accessToken, m.id)));
  return details;
}
