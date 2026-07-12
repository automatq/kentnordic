import { useState } from "react";
import { Link } from "react-router-dom";
import { submitInquiry } from "@/lib/formProvider";
import { site } from "@/config/site";

type Status = "idle" | "submitting" | "done" | "error";

/**
 * Low-commitment capture for agents not ready to send a full brief: one
 * email field requesting the trade rate sheet. Reuses the inquiry provider —
 * the API requires the full field set, so the non-email fields are synthetic
 * and the admin inbox distinguishes these by message + #rate-sheet source.
 */
export default function RateSheetForm() {
  const [status, setStatus] = useState<Status>("idle");
  const [email, setEmail] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setStatus("error");
      return;
    }
    const fd = new FormData(e.currentTarget);
    setStatus("submitting");
    const res = await submitInquiry({
      agency: "Rate sheet request",
      contact: email.split("@")[0],
      email,
      message: "Please send the trade rate sheet.",
      consent: "yes",
      sourcePage: `${window.location.pathname}#rate-sheet`,
      botField: (fd.get("company_website") as string) ?? "",
    });
    setStatus(res.ok ? "done" : "error");
  }

  if (status === "done") {
    return (
      <p className="rate-sheet-done" role="status">
        Thanks — our sales team will send the rate sheet to your inbox.
      </p>
    );
  }

  return (
    <form className="rate-sheet" onSubmit={onSubmit} noValidate>
      <label htmlFor="rate-sheet-email" className="rate-sheet-label">
        Get our trade rate sheet
      </label>
      <div className="rate-sheet-row">
        <input
          id="rate-sheet-email"
          type="email"
          autoComplete="email"
          placeholder="you@agency.com"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (status === "error") setStatus("idle");
          }}
          aria-invalid={status === "error"}
          aria-describedby={status === "error" ? "rate-sheet-err" : undefined}
        />
        <button type="submit" disabled={status === "submitting"}>
          {status === "submitting" ? "Sending…" : "Send it"}
        </button>
      </div>
      <input type="text" name="company_website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="rate-sheet-hp" />
      {status === "error" && (
        <p id="rate-sheet-err" className="rate-sheet-err" role="alert">
          Enter a valid work email.
        </p>
      )}
      <p className="rate-sheet-note">
        By requesting the rate sheet you agree to be contacted by our sales
        team and accept our{" "}
        <Link to={site.legal.privacyHref} viewTransition>
          Privacy Policy
        </Link>{" "}
        and{" "}
        <Link to={site.legal.tradeTermsHref} viewTransition>
          Trade Terms
        </Link>
        .
      </p>
    </form>
  );
}
