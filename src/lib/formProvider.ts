/**
 * Provider-swappable inquiry delivery. The InquiryForm calls submitInquiry();
 * changing the backend means changing only this file, not the component.
 */
import { site } from "@/config/site";

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
  consent?: string;
  sourcePage?: string;
  /** Honeypot — must stay empty. */
  botField?: string;
}

export interface SubmitResult {
  ok: boolean;
  demo?: boolean;
  error?: string;
}

export async function submitInquiry(
  payload: InquiryPayload,
): Promise<SubmitResult> {
  // Honeypot: silently succeed for bots.
  if (payload.botField) return { ok: true };

  try {
    const res = await fetch(site.form.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}) as Record<string, unknown>);
    if (res.ok && data.ok !== false) return { ok: true };

    if (import.meta.env.DEV && res.status === 404) {
      await new Promise((r) => setTimeout(r, 300));
      return { ok: true, demo: true };
    }

    const error =
      typeof data.error === "string"
        ? data.error
        : "Submission failed. Please try again.";
    return { ok: false, error };
  } catch {
    if (import.meta.env.DEV) {
      await new Promise((r) => setTimeout(r, 300));
      return { ok: true, demo: true };
    }
    return {
      ok: false,
      error: "Network error. Please try again or email us directly.",
    };
  }
}
