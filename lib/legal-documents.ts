export type LegalSection = {
  heading: string;
  body: string[];
};

export type LegalDocument = {
  eyebrow: string;
  title: string;
  subtitle: string;
  updatedLabel: string;
  sections: LegalSection[];
};

const updatedLabel = 'Last updated April 8, 2026';

export const legalDocuments: Record<'terms' | 'privacy' | 'disclaimer' | 'cookies', LegalDocument> = {
  terms: {
    eyebrow: 'Legal',
    title: 'Terms of Service',
    subtitle: 'Core use rules for the private operations app, including account responsibilities and platform limits.',
    updatedLabel,
    sections: [
      {
        heading: 'Private use',
        body: [
          'This app is provided as a private operations tool for authorized staff and approved residents of the supported rental portfolio. Access may be limited, suspended, or removed at any time by the property operator.',
          'Users may only access records that belong to their approved role. Attempting to view or modify another user’s data, bypass role controls, or misuse uploaded files is prohibited.',
        ],
      },
      {
        heading: 'Operational records',
        body: [
          'The app is intended to help track rent, maintenance, utilities, taxes, and related property operations. Users are responsible for reviewing important records before acting on them, especially when payments, legal notices, or lease changes are involved.',
          'The operator may correct or update records, balances, documents, and notices if imported data, tenant information, or administrative entries were incomplete or inaccurate.',
        ],
      },
      {
        heading: 'Accounts and access',
        body: [
          'Users are responsible for maintaining the security of their devices, passwords, and recovery methods. Sharing credentials or leaving a session exposed on a public or shared device is not permitted.',
          'The operator may require password resets, remove device access, or revoke accounts when misuse, role changes, or security concerns are detected.',
        ],
      },
      {
        heading: 'Availability and changes',
        body: [
          'The app is provided on an as-available basis. Service interruptions, internet outages, device issues, maintenance windows, or third-party platform problems may temporarily affect availability.',
          'Features may be updated, limited, or removed as the product evolves. The operator may also change workflows for payments, documents, notifications, or reporting as new versions are released.',
        ],
      },
    ],
  },
  privacy: {
    eyebrow: 'Legal',
    title: 'Privacy Policy',
    subtitle: 'How account, property, payment, and support information is used inside the platform.',
    updatedLabel,
    sections: [
      {
        heading: 'Data collected',
        body: [
          'The platform may store account information such as name, email address, phone number, role, linked tenant or admin identity, and authentication metadata.',
          'Operational information may include properties, units, leases, rent charges, payments, maintenance requests, documents, utility and tax allocations, and support messages.',
        ],
      },
      {
        heading: 'How data is used',
        body: [
          'Data is used to operate the rental management workflow, including account access, rent collection tracking, due reminders, maintenance handling, document delivery, and administrative reporting.',
          'The operator may also use stored information to investigate errors, improve reliability, support audits, or respond to tenant and property-management requests.',
        ],
      },
      {
        heading: 'Access controls',
        body: [
          'Role-based access is used so residents only see their own records while admins can manage the portfolio. Documents and operational records are intended to remain visible only to the users who are authorized to see them.',
          'The platform relies on Supabase-backed authentication, database policies, and storage rules to keep records segmented between users.',
        ],
      },
      {
        heading: 'Retention and deletion',
        body: [
          'Operational records may be retained as long as needed for tenancy history, accounting, maintenance logs, legal obligations, or business continuity. Removing app access does not automatically delete historical records that must be preserved for operations.',
          'If you have a privacy or data-access request, contact the property operator directly so the appropriate administrative or legal review can be completed.',
        ],
      },
    ],
  },
  disclaimer: {
    eyebrow: 'Legal',
    title: 'Disclaimer',
    subtitle: 'Important limits on how app information should be interpreted and when users should confirm details elsewhere.',
    updatedLabel,
    sections: [
      {
        heading: 'Operational reference only',
        body: [
          'The app is an operations and communication tool. It is not legal, tax, accounting, insurance, or emergency-response advice. Users should not rely on it alone when a formal legal or financial determination is required.',
          'Balances, deadlines, maintenance statuses, and uploaded files are presented for convenience and may depend on timely administrative updates or imported source records.',
        ],
      },
      {
        heading: 'No guarantee of completeness',
        body: [
          'Although the operator aims to keep records current, information may be delayed, incomplete, or later corrected. Users should confirm critical lease, payment, or notice details directly with the property operator when needed.',
          'Uploaded statements, invoices, and policy files may be provided for reference and may not replace the original official document if one exists elsewhere.',
        ],
      },
      {
        heading: 'External systems',
        body: [
          'The platform may depend on internet access, email delivery, mobile devices, storage services, and third-party infrastructure. Delays or failures in those systems can affect reminders, file access, or account recovery flows.',
          'The operator is not responsible for failures caused by unsupported devices, interrupted connectivity, expired sessions, or third-party service outages outside its control.',
        ],
      },
    ],
  },
  cookies: {
    eyebrow: 'Legal',
    title: 'Cookie Policy',
    subtitle: 'How session storage and browser-level persistence will be handled for web use later.',
    updatedLabel,
    sections: [
      {
        heading: 'Current scope',
        body: [
          'This public demo supports authenticated app sessions and a static web deployment. Browser cookie usage is limited to the standard platform and authentication flows required for the demo.',
          'Today, authenticated sessions and basic browser storage may be used where required for sign-in continuity, security, or interface preferences when the app is opened on the web.',
        ],
      },
      {
        heading: 'Expected web usage',
        body: [
          'When a public or broader web deployment is introduced, the operator may use cookies or similar browser storage for authentication, session recovery, security, analytics, and remembered interface preferences.',
          'That later deployment may include updated consent language, retention periods, and category-based explanations if analytics or marketing-related cookies are ever introduced.',
        ],
      },
      {
        heading: 'Updates',
        body: [
          'This policy is included now so the platform has a baseline legal surface for future web rollout. It should be reviewed again before any public website launch or domain-based access is enabled.',
        ],
      },
    ],
  },
};
