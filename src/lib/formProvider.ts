/**
 * Provider-swappable inquiry delivery. The InquiryForm calls submitInquiry();
 * swapping the backend (Web3Forms → Formspree → a serverless endpoint) means
 * changing only this file, not the component.
 *
 * Default adapter: Web3Forms (free; emails a destination inbox). Set
 * PUBLIC_WEB3FORMS_KEY in .env to enable real delivery. Without a key the form
 * runs in "demo" mode (validates + shows success, no network call) so the site
 * is fully clickable before the client provides an account.
 */
import { site } from '@/config/site';

export interface InquiryPayload {
  agency: string;
  contact: string;
  email: string;
  phone?: string;
  country?: string;
  packageCode?: string;
  travelDates?: string;
  pax?: string;
  groupType?: string;
  message: string;
  sourcePage?: string;
  /** Honeypot — must stay empty. */
  botField?: string;
}

export interface SubmitResult {
  ok: boolean;
  demo?: boolean;
  error?: string;
}

export async function submitInquiry(payload: InquiryPayload): Promise<SubmitResult> {
  // Honeypot: silently succeed for bots.
  if (payload.botField) return { ok: true };

  const key = site.form.accessKey;

  // Demo mode — no provider key configured yet.
  if (!key) {
    await new Promise((r) => setTimeout(r, 600));
    return { ok: true, demo: true };
  }

  try {
    const res = await fetch(site.form.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        access_key: key,
        subject: `Iceland inquiry — ${payload.agency}${payload.packageCode ? ` (${payload.packageCode})` : ''}`,
        from_name: payload.contact,
        // Human-readable fields
        Agency: payload.agency,
        Contact: payload.contact,
        Email: payload.email,
        Phone: payload.phone || '—',
        Country: payload.country || '—',
        Package: payload.packageCode || 'General inquiry',
        'Travel dates': payload.travelDates || '—',
        Pax: payload.pax || '—',
        'Group type': payload.groupType || '—',
        Message: payload.message,
        'Source page': payload.sourcePage || '—',
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.success !== false) return { ok: true };
    return { ok: false, error: data.message || 'Submission failed. Please try again.' };
  } catch {
    return { ok: false, error: 'Network error. Please try again or email us directly.' };
  }
}
