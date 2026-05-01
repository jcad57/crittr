export type PrivacySection = {
  title: string;
  paragraphs: string[];
};

/**
 * Mock privacy policy for UI iteration. Replace with counsel-approved text before launch.
 */
export const privacyPolicySections: PrivacySection[] = [
  {
    title: "Overview",
    paragraphs: [
      "Crittr (“we”, “us”) provides a mobile app to help you manage information about your pets and your use of the service. This policy describes how we handle personal information in the current version of the app. We will update it as the product and legal requirements evolve.",
    ],
  },
  {
    title: "Information we process",
    paragraphs: [
      "To run Crittr, we process information you choose to enter or upload — for example account details (such as email), pet profiles, health and activity records you log, and content you submit through features like feedback or support.",
      "We also process limited technical data needed to operate the app, such as device or session identifiers, push notification tokens when you enable them, and standard service logs for security and reliability.",
    ],
  },
  {
    title: "How we use your information",
    paragraphs: [
      "We use your information to provide and maintain the app: authenticating your account, storing and displaying your pet data, sending in-app and push notifications you opt into, enabling co-care sharing you set up, and improving stability and security.",
      "We take your privacy very seriously. We do not use your personal information for third-party marketing, and we do not sell your personal information.",
    ],
  },
  {
    title: "Sharing",
    paragraphs: [
      "Pet data you save is available to you. If you invite co-carers, the data you share with them is visible to those users according to the permissions you grant.",
      "We use service providers (for example hosting, email delivery, and payment processing) that process data on our behalf under agreements that limit how they use it. We may disclose information if required by law or to protect rights and safety.",
    ],
  },
  {
    title: "Retention",
    paragraphs: [
      "We keep your information for as long as your account is active and as needed to provide the service, comply with legal obligations, resolve disputes, and enforce our terms. You may delete certain content in the app where supported; account deletion details will be described in a future update to this policy.",
    ],
  },
  {
    title: "Security",
    paragraphs: [
      "We use industry-standard measures appropriate to the nature of the service to protect data in transit and at rest. No method of transmission or storage is completely secure; use the app with that understanding.",
    ],
  },
  {
    title: "Children",
    paragraphs: [
      "Crittr is not directed at children under 13 (or the minimum age required in your region). Do not use the service for a child unless you are their parent or guardian and are comfortable with this policy.",
    ],
  },
  {
    title: "Contact",
    paragraphs: [
      "Questions about privacy can be sent to support@crittrapp.com.",
    ],
  },
];
