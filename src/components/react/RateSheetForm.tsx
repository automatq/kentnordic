import { useState } from "react";
import { Link } from "react-router-dom";
import { submitInquiry } from "@/lib/formProvider";
import { site } from "@/config/site";

type Status = "idle" | "submitting" | "done" | "error";

type CaptureKind = "rate-sheet" | "fare-list-updates";

const captureContent = {
  "rate-sheet": {
    label: "Get our trade rate sheet",
    requestedItem: "the rate sheet",
    message: "Please send the trade rate sheet.",
    success: "Thanks — our sales team will send the rate sheet to your inbox.",
    agency: "Rate sheet request",
  },
  "fare-list-updates": {
    label: "Subscribe for Fare List and Iceland Latest Update",
    requestedItem: "the Fare List and Iceland updates",
    message: "Please send the Fare List and Iceland latest updates.",
    success: "Thanks — our sales team will add you to the Fare List and Iceland updates list.",
    agency: "Fare List and updates request",
  },
} as const;

interface RateSheetFormProps {
  kind?: CaptureKind;
}

/**
 * Low-commitment capture for agents not ready to send a full brief: one
 * email field requesting the trade rate sheet. Reuses the inquiry provider —
 * the API requires the full field set, so the non-email fields are synthetic
 * and the admin inbox distinguishes these by message + #rate-sheet source.
 */
export default function RateSheetForm({ kind = "rate-sheet" }: RateSheetFormProps) {
  const [status, setStatus] = useState<Status>("idle");
  const [email, setEmail] = useState("");
  const content = captureContent[kind];
  const inputId = `${kind}-email`;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setStatus("error");
      return;
    }
    const fd = new FormData(e.currentTarget);
    setStatus("submitting");
    const res = await submitInquiry({
      agency: content.agency,
      contact: email.split("@")[0],
      email,
      message: content.message,
      consent: "yes",
      sourcePage: `${window.location.pathname}#${kind}`,
      botField: (fd.get("company_website") as string) ?? "",
    });
    setStatus(res.ok ? "done" : "error");
  }

  if (status === "done") {
    return (
      <p className="rate-sheet-done" role="status">
        {content.success}
      </p>
    );
  }

  return (
    <form className="rate-sheet" onSubmit={onSubmit} noValidate>
      <label htmlFor={inputId} className="rate-sheet-label">
        {content.label}
      </label>
      <div className="rate-sheet-row">
        <input
          id={inputId}
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
        By requesting {content.requestedItem} you agree to be contacted by our sales
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
