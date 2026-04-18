export type HelpCenterFaq = {
  id: string;
  question: string;
  answer: string;
};

/** Edit this list to update Help center copy — no code changes required elsewhere. */
export const helpCenterFaqs: HelpCenterFaq[] = [
  {
    id: "what-is-crittr",
    question: "What is Crittr?",
    answer:
      "Crittr helps you track your pets’ day-to-day care in one place — health records, activities, reminders, and (with Crittr Pro) AI answers grounded in the profiles you save.",
  },
  {
    id: "co-care",
    question: "How does co-care work?",
    answer:
      "You can invite someone by email to help care for a pet you own. They see the pet you shared according to the permissions you set, and activity from co-carers can show up in your notifications.",
  },
  {
    id: "data-visible",
    question: "Who can see my pet data?",
    answer:
      "Your pet data is visible to you and to co-carers you explicitly invite for that pet. It is not sold or used for third-party marketing — see the Privacy policy for details.",
  },
  {
    id: "crittr-pro",
    question: "What is Crittr Pro?",
    answer:
      "Crittr Pro unlocks premium features such as CrittrAI chat that uses your pet's profile to give you personalized answers. You can invite other Crittr users to co-care your pets and see their activity in your notifications. You can manage membership from the upgrade flow in the app.",
  },
  {
    id: "notifications",
    question: "How do I change notifications?",
    answer:
      "Open Settings from your profile, then Push notifications. There you can adjust reminders and system permission, and open your device settings if needed.",
  },
  {
    id: "feedback",
    question: "How do I report a bug or request a feature?",
    answer:
      "From your profile, tap Share feedback. Describe what happened or what you’d like to see — your message goes to our support inbox.",
  },
];
