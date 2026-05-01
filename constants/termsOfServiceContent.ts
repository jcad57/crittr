export type TermsSection = {
  title: string;
  paragraphs: string[];
};

/**
 * Draft terms for product/legal iteration. Replace with counsel-approved text before launch.
 */
export const termsOfServiceSections: TermsSection[] = [
  {
    title: "Agreement",
    paragraphs: [
      "These Terms of Service (“Terms”) govern your access to and use of Crittr’s mobile application and related services (collectively, the “Service”). By creating an account or otherwise using the Service, you agree to these Terms and to our Privacy Policy (together, the “Agreement”). If you do not agree, do not use Crittr.",
      "We may update the Service and these Terms from time to time. We will provide reasonable notice of material changes where required by law (for example, in-app notice or email). Continued use after changes become effective constitutes acceptance of the revised Terms.",
    ],
  },
  {
    title: "Eligibility & accounts",
    paragraphs: [
      "You must be at least the age of majority where you live or 13 years old (whichever is higher), or have the consent of a parent or guardian who accepts these Terms on your behalf. You represent that the registration information you provide is accurate and that you will keep it current.",
      "You are responsible for safeguarding your credentials and for activity under your account. Notify us promptly at support@crittrapp.com if you suspect unauthorized access.",
    ],
  },
  {
    title: "What Crittr provides",
    paragraphs: [
      "Crittr is a companion tool for organizing pet-related information you choose to enter—such as pet profiles, feeding and activity logs, medications and reminders, vaccinations, vet visits, medical records you attach, exercise preferences, microchip and insurance details, and memorialization options when a pet passes.",
      "The Service includes optional collaboration (“co-care”): pet owners may invite others by email so invited users can view or contribute to shared pet information according to permissions the owner sets. You are solely responsible for whom you invite and what you share.",
      "Push notifications and in-app reminders help you track schedules you configure; they depend on device permissions and OS behavior.",
      "Crittr Pro is an optional paid subscription that unlocks additional capabilities as described in-app (including third-party checkout flows where applicable). Non‑subscribers may see promotional placements such as banners or full-screen ads as configured in the app.",
    ],
  },
  {
    title: "Crittr AI",
    paragraphs: [
      "Certain features may expose generative or assisted responses (“Crittr AI”). Outputs are informational only, may be inaccurate or incomplete, and are not tailored veterinary, medical, legal, or emergency guidance.",
      "Never disregard professional veterinary advice or delay seeking care because of something you read in Crittr AI. For emergencies, contact a veterinarian or emergency clinic immediately.",
    ],
  },
  {
    title: "Not veterinary advice",
    paragraphs: [
      "Crittr does not practice veterinary medicine and does not establish a veterinarian–client relationship. The Service does not diagnose, treat, or prescribe for animals. Always consult a licensed veterinarian for health decisions.",
    ],
  },
  {
    title: "Subscriptions, billing & ads",
    paragraphs: [
      "Paid plans are billed through the applicable app store or payment processor shown at checkout (for example Apple App Store, Google Play, or Stripe where offered). Fees, renewal periods, taxes, and cancellation rights follow the processor’s rules and any additional terms presented at purchase.",
      "Unless stated otherwise at checkout, subscriptions renew automatically until cancelled in your platform account settings.",
      "Where ads are shown (including app-open and interstitial formats), third-party advertising networks may collect identifiers subject to their policies and your device settings. Ad-supported experiences may not appear for Crittr Pro subscribers as implemented in the current version of the app.",
    ],
  },
  {
    title: "Your content & license",
    paragraphs: [
      "You retain ownership of content you submit (such as pet notes, uploaded images, and feedback). To operate the Service, you grant Crittr a worldwide, non-exclusive license to host, store, reproduce, display, and process your content solely to provide, secure, improve, and comply with law—including sharing with co-carers you authorize.",
      "You confirm you have the rights to submit your content and that it does not violate law or third-party rights.",
    ],
  },
  {
    title: "Acceptable use",
    paragraphs: [
      "You agree not to misuse the Service—for example: attempting unauthorized access; interfering with infrastructure; scraping or harvesting data at scale without permission; uploading malware; harassing others; impersonating people or entities; or using Crittr for unlawful, fraudulent, or harmful purposes.",
      "We may suspend or terminate accounts that violate these Terms or pose risk to users or the Service.",
    ],
  },
  {
    title: "Third-party services",
    paragraphs: [
      "Crittr relies on vendors such as hosting and authentication providers, payment processors, analytics where enabled, and advertising networks. Their processing may be governed by separate terms and privacy notices.",
      "Social sign-in (where offered) is subject to the provider’s policies as well as these Terms.",
    ],
  },
  {
    title: "Disclaimer of warranties",
    paragraphs: [
      'THE SERVICE IS PROVIDED “AS IS” AND “AS AVAILABLE.” TO THE MAXIMUM EXTENT PERMITTED BY LAW, CRITTR DISCLAIMS ALL IMPLIED WARRANTIES INCLUDING MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT. WE DO NOT WARRANT UNINTERRUPTED OR ERROR-FREE OPERATION.',
    ],
  },
  {
    title: "Limitation of liability",
    paragraphs: [
      "TO THE MAXIMUM EXTENT PERMITTED BY LAW, CRITTR AND ITS AFFILIATES, OFFICERS, EMPLOYEES, AND SUPPLIERS WILL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, EXEMPLARY, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS, DATA, GOODWILL, OR BUSINESS OPPORTUNITY, ARISING OUT OF OR RELATED TO YOUR USE OF THE SERVICE—EVEN IF ADVISED OF THE POSSIBILITY.",
      "OUR TOTAL LIABILITY FOR CLAIMS ARISING OUT OF OR RELATED TO THE SERVICE IN ANY TWELVE-MONTH PERIOD WILL NOT EXCEED THE GREATER OF (A) THE AMOUNTS YOU PAID CRITTR FOR THE SERVICE IN THAT PERIOD OR (B) ONE HUNDRED U.S. DOLLARS (US$100). SOME JURISDICTIONS DO NOT ALLOW CERTAIN LIMITATIONS; IN THOSE CASES LIABILITY IS LIMITED TO THE FULLEST EXTENT PERMITTED.",
    ],
  },
  {
    title: "Indemnity",
    paragraphs: [
      "You will defend and indemnify Crittr and its affiliates against claims, damages, losses, and expenses (including reasonable attorneys’ fees) arising from your content, your misuse of the Service, your violation of these Terms, or your violation of third-party rights.",
    ],
  },
  {
    title: "Termination",
    paragraphs: [
      "You may stop using Crittr at any time. Features to delete your account and associated data may be offered in-app; deletion may take time to propagate across backups.",
      "We may suspend or terminate access if you breach these Terms, if we must comply with law, or if we discontinue the Service with reasonable notice where practicable.",
    ],
  },
  {
    title: "General",
    paragraphs: [
      "These Terms are governed by the laws of the State of Delaware, USA, excluding conflict-of-law rules, unless mandatory consumer protections in your jurisdiction require otherwise.",
      "If any provision is held invalid, the remaining provisions remain in effect. Failure to enforce a provision is not a waiver.",
      "Questions about these Terms: support@crittrapp.com.",
    ],
  },
];
