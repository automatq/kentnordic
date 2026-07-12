/**
 * Steps for the guided quote wizard — the same fields and validation as
 * InquiryForm, one question at a time. Keep messages/labels in sync with
 * InquiryForm.tsx's LABELS/validate() so both modes read identically.
 */

export interface PackageOption {
  code: string;
  name: string;
}

export type WizardFieldType = 'text' | 'email' | 'tel' | 'textarea' | 'select' | 'consent';

export interface WizardStep {
  id: string;
  type: WizardFieldType;
  title: string;
  helper?: string;
  placeholder?: string;
  required: boolean;
  options?: string[];
  autoComplete?: string;
  inputMode?: 'numeric' | 'tel' | 'email' | 'text';
}

export interface WizardData {
  agency: string;
  contact: string;
  email: string;
  phone: string;
  country: string;
  packageCode: string;
  travelDates: string;
  pax: string;
  groupType: string;
  message: string;
  consent: boolean;
  botField: string;
}

export const LABELS: Record<string, string> = {
  agency: 'Agency / company',
  contact: 'Contact name',
  email: 'Work email',
  phone: 'Phone',
  country: 'Country / market',
  packageCode: 'Package of interest',
  travelDates: 'Preferred travel dates',
  pax: 'Group size (pax)',
  groupType: 'Type of travel',
  message: 'Message',
};

export function emptyWizardData(): WizardData {
  return {
    agency: '',
    contact: '',
    email: '',
    phone: '',
    country: '',
    packageCode: '',
    travelDates: '',
    pax: '',
    groupType: '',
    message: '',
    consent: false,
    botField: '',
  };
}

const GENERAL_INQUIRY = 'General inquiry';
const NOT_SURE_YET = 'Not sure yet';

/** Builds the step list — the package step needs the live tour list. */
export function buildSteps(packages: PackageOption[]): WizardStep[] {
  return [
    {
      id: 'agency',
      type: 'text',
      title: 'What agency or company are you with?',
      required: true,
      autoComplete: 'organization',
    },
    {
      id: 'contact',
      type: 'text',
      title: "Who am I speaking with?",
      helper: 'Your name.',
      required: true,
      autoComplete: 'name',
    },
    {
      id: 'email',
      type: 'email',
      title: "What's your work email?",
      required: true,
      placeholder: 'you@agency.com',
      autoComplete: 'email',
    },
    {
      id: 'phone',
      type: 'tel',
      title: 'And a phone number?',
      helper: 'Optional.',
      required: false,
      placeholder: '+44 7000 000000',
      autoComplete: 'tel',
    },
    {
      id: 'country',
      type: 'text',
      title: 'Which country or market are you based in?',
      helper: 'Optional.',
      required: false,
      autoComplete: 'country-name',
    },
    {
      id: 'packageCode',
      type: 'select',
      title: 'Which tour package are you interested in?',
      required: false,
      options: [GENERAL_INQUIRY, ...packages.map((p) => `${p.name} (${p.code})`)],
    },
    {
      id: 'travelDates',
      type: 'text',
      title: 'Any preferred travel dates?',
      helper: 'Optional.',
      required: false,
      placeholder: 'e.g. March 2026',
    },
    {
      id: 'pax',
      type: 'text',
      title: 'How many travelers?',
      helper: 'Optional — group size (pax).',
      required: false,
      placeholder: 'e.g. 25',
      inputMode: 'numeric',
    },
    {
      id: 'groupType',
      type: 'select',
      title: 'What type of travel is this?',
      required: false,
      options: [NOT_SURE_YET, 'Group tour', 'FIT (independent)', 'MICE / incentive'],
    },
    {
      id: 'message',
      type: 'textarea',
      title: 'Tell us about your group.',
      helper: 'Preferred dates, group size, and any special requests.',
      placeholder: 'e.g. 25 pax, MICE incentive group, looking at early June...',
      required: true,
    },
    {
      id: 'consent',
      type: 'consent',
      title: 'One last thing.',
      required: true,
    },
  ];
}

/** Reverse-maps a picked package label back to its tour code for submission. */
export function packageCodeFromLabel(label: string, packages: PackageOption[]): string {
  if (!label || label === GENERAL_INQUIRY) return '';
  const match = packages.find((p) => label === `${p.name} (${p.code})`);
  return match?.code ?? '';
}

export function labelFromPackageCode(code: string, packages: PackageOption[]): string {
  if (!code) return GENERAL_INQUIRY;
  const match = packages.find((p) => p.code === code);
  return match ? `${match.name} (${match.code})` : GENERAL_INQUIRY;
}

export function validateStep(step: WizardStep, data: WizardData): string | null {
  if (!step.required) return null;
  if (step.type === 'consent') {
    return data.consent ? null : 'Please accept so we can reply to your inquiry.';
  }
  if (step.type === 'email') {
    if (!data.email.trim()) return `${LABELS.email} is required.`;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) return 'Enter a valid email address.';
    return null;
  }
  const value = data[step.id as keyof WizardData];
  if (typeof value === 'string' && !value.trim()) return `${LABELS[step.id]} is required.`;
  return null;
}
