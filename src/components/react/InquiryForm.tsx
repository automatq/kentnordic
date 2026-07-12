import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { submitInquiry, type InquiryPayload } from "@/lib/formProvider";
import { site } from "@/config/site";

interface PackageOption {
  code: string;
  name: string;
}
interface Props {
  packages: PackageOption[];
  endpoint: string;
}

type Status = "idle" | "submitting" | "success" | "error";

const REQUIRED: (keyof InquiryPayload)[] = [
  "agency",
  "contact",
  "email",
  "message",
];
const LABELS: Record<string, string> = {
  agency: "Agency / company",
  contact: "Contact name",
  email: "Work email",
  message: "Message",
};

const inputCls =
  "w-full rounded-md border border-charcoal/15 bg-white px-3.5 py-2.5 text-charcoal outline-none transition focus:border-accent focus:shadow-[0_0_0_3px_var(--color-accent-100)] aria-[invalid=true]:border-error";
const labelCls = "mb-1.5 block text-sm font-medium text-charcoal";

export default function InquiryForm({ packages, endpoint }: Props) {
  const [status, setStatus] = useState<Status>("idle");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState("");
  const [pkg, setPkg] = useState("");
  const formRef = useRef<HTMLFormElement>(null);
  const summaryRef = useRef<HTMLDivElement>(null);
  const successRef = useRef<HTMLDivElement>(null);

  // The submit button unmounts on success — move focus (and the viewport)
  // to the confirmation so keyboard/SR users and mobile don't lose context.
  useEffect(() => {
    if (status === "success") {
      successRef.current?.focus();
      successRef.current?.scrollIntoView({ block: "center" });
    }
  }, [status]);

  // Pre-fill package from ?package=CODE
  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get("package");
    if (code && packages.some((p) => p.code === code)) setPkg(code);
  }, [packages]);

  function validate(data: Record<string, string>) {
    const next: Record<string, string> = {};
    for (const f of REQUIRED)
      if (!data[f]?.trim()) next[f] = `${LABELS[f]} is required.`;
    if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email))
      next.email = "Enter a valid email address.";
    if (!data.consent)
      next.consent = "Please accept so we can reply to your inquiry.";
    return next;
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setServerError("");
    const fd = new FormData(e.currentTarget);
    const data = Object.fromEntries(fd.entries()) as Record<string, string>;

    const found = validate(data);
    setErrors(found);
    if (Object.keys(found).length) {
      requestAnimationFrame(() => summaryRef.current?.focus());
      return;
    }

    setStatus("submitting");
    const payload: InquiryPayload = {
      agency: data.agency,
      contact: data.contact,
      email: data.email,
      phone: data.phone,
      country: data.country,
      packageCode: data.packageCode,
      travelDates: data.travelDates,
      pax: data.pax,
      groupType: data.groupType,
      message: data.message,
      consent: data.consent,
      sourcePage: typeof window !== "undefined" ? window.location.pathname : "",
      botField: data.company_website, // honeypot
    };
    const res = await submitInquiry(payload);
    if (res.ok) {
      setStatus("success");
      formRef.current?.reset();
      // reset() misses the controlled select — clear it so "Send another
      // inquiry" starts from a genuinely blank form.
      setPkg("");
      setErrors({});
    } else {
      setStatus("error");
      setServerError(res.error || "Something went wrong.");
    }
  }

  if (status === "success") {
    return (
      <div
        ref={successRef}
        tabIndex={-1}
        className="rounded-xl border border-accent/25 bg-accent-50 p-8 text-center outline-none"
        role="status"
      >
        <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-accent text-white">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M20 6 9 17l-5-5" />
          </svg>
        </div>
        <h3 className="font-display text-2xl text-ink">
          Thank you — inquiry received
        </h3>
        <p className="mx-auto mt-2 max-w-md text-charcoal-soft">
          Our team will get back to you with a tailored quote, usually within
          one business day.
        </p>
        <p className="mx-auto mt-4 max-w-md text-sm text-charcoal-soft">
          While you wait:{" "}
          <Link to="/tours" viewTransition className="font-medium text-accent-700 underline underline-offset-2">
            browse the six tour packages
          </Link>{" "}
          or{" "}
          <Link to="/services" viewTransition className="font-medium text-accent-700 underline underline-offset-2">
            see our ground services
          </Link>
          .
        </p>
        <button
          type="button"
          className="mt-6 rounded-pill border border-charcoal/20 px-5 py-2.5 text-sm font-medium transition hover:bg-charcoal hover:text-white"
          onClick={() => setStatus("idle")}
        >
          Send another inquiry
        </button>
      </div>
    );
  }

  const errorList = Object.entries(errors);

  return (
    <form
      ref={formRef}
      onSubmit={onSubmit}
      action={endpoint}
      method="POST"
      noValidate
      className="flex flex-col gap-5"
    >
      <input
        type="text"
        name="company_website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="absolute -left-[9999px] h-0 w-0 opacity-0"
      />

      {errorList.length > 0 && (
        <div
          ref={summaryRef}
          tabIndex={-1}
          role="alert"
          className="rounded-md border border-error/30 bg-error/5 p-4 text-sm text-error outline-none"
        >
          <p className="font-semibold">Please fix the following:</p>
          <ul className="mt-1 list-disc pl-5">
            {errorList.map(([f, msg]) => (
              <li key={f}>{msg}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          name="agency"
          label="Agency / company"
          required
          error={errors.agency}
          autoComplete="organization"
        />
        <Field
          name="contact"
          label="Contact name"
          required
          error={errors.contact}
          autoComplete="name"
        />
        <Field
          name="email"
          label="Work email"
          type="email"
          required
          error={errors.email}
          autoComplete="email"
        />
        <Field name="phone" label="Phone" type="tel" autoComplete="tel" />
        <Field name="country" label="Country / market" autoComplete="country-name" />
        <div>
          <label htmlFor="packageCode" className={labelCls}>
            Package of interest
          </label>
          <select
            id="packageCode"
            name="packageCode"
            className={inputCls}
            value={pkg}
            onChange={(e) => setPkg(e.target.value)}
          >
            <option value="">General inquiry</option>
            {packages.map((p) => (
              <option key={p.code} value={p.code}>
                {p.name} ({p.code})
              </option>
            ))}
          </select>
        </div>
        <Field
          name="travelDates"
          label="Preferred travel dates"
          placeholder="e.g. March 2026"
        />
        <Field name="pax" label="Group size (pax)" placeholder="e.g. 25" inputMode="numeric" />
      </div>

      <div>
        <label htmlFor="groupType" className={labelCls}>
          Type of travel
        </label>
        <select
          id="groupType"
          name="groupType"
          className={inputCls}
          defaultValue=""
        >
          <option value="">Not sure yet</option>
          <option>Group tour</option>
          <option>FIT (independent)</option>
          <option>MICE / incentive</option>
        </select>
      </div>

      <div>
        <label htmlFor="message" className={labelCls}>
          Message <span className="text-error">*</span>
        </label>
        <textarea
          id="message"
          name="message"
          rows={5}
          required
          aria-invalid={!!errors.message}
          aria-describedby={errors.message ? "err-message" : undefined}
          className={inputCls}
          placeholder="Tell us about your group, preferred dates and any special requests."
        />
        {errors.message && (
          <p id="err-message" className="mt-1 text-sm text-error">
            {errors.message}
          </p>
        )}
      </div>

      <label className="flex items-start gap-3 text-sm text-charcoal-soft">
        <input
          type="checkbox"
          name="consent"
          value="yes"
          aria-invalid={!!errors.consent}
          aria-describedby={errors.consent ? "err-consent" : undefined}
          className="mt-1 size-4 accent-[var(--color-accent)]"
        />
        <span>
          I agree to Idcibidci contacting me about this inquiry and to the{" "}
          <Link
            to={site.legal.privacyHref}
            viewTransition
            className="font-medium text-accent-700 underline underline-offset-2"
          >
            Privacy Policy
          </Link>{" "}
          and{" "}
          <Link
            to={site.legal.tradeTermsHref}
            viewTransition
            className="font-medium text-accent-700 underline underline-offset-2"
          >
            Trade Terms
          </Link>
          .
          {errors.consent && (
            <span id="err-consent" className="mt-1 block text-error">
              {errors.consent}
            </span>
          )}
        </span>
      </label>

      {serverError && (
        <p role="alert" className="text-sm text-error">
          {serverError}
        </p>
      )}

      <button
        type="submit"
        disabled={status === "submitting"}
        className="inline-flex items-center justify-center gap-2 self-start rounded-pill bg-accent px-7 py-3 font-medium text-white shadow-soft transition hover:bg-accent-600 disabled:pointer-events-none disabled:opacity-60"
      >
        {status === "submitting" ? "Sending…" : "Send inquiry"}
      </button>
      <p className="-mt-2 text-sm text-charcoal-soft">
        We reply within 1 business day · Net rates for the trade · No
        obligation
      </p>
    </form>
  );
}

function Field({
  name,
  label,
  type = "text",
  required = false,
  error,
  placeholder,
  autoComplete,
  inputMode,
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  error?: string;
  placeholder?: string;
  autoComplete?: string;
  inputMode?: "numeric" | "tel" | "email" | "text";
}) {
  return (
    <div>
      <label htmlFor={name} className={labelCls}>
        {label} {required && <span className="text-error">*</span>}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        autoComplete={autoComplete}
        inputMode={inputMode}
        aria-invalid={!!error}
        aria-describedby={error ? `err-${name}` : undefined}
        className={inputCls}
      />
      {error && (
        <p id={`err-${name}`} className="mt-1 text-sm text-error">
          {error}
        </p>
      )}
    </div>
  );
}
