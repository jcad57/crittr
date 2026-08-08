export type HelpCenterFaq = {
  id: string;
  question: string;
  answer: string;
  category: "About" | "How To" | "Account" | "Support";
};

/** Edit this list to update Help center copy — no code changes required elsewhere. */
export const helpCenterFaqs: HelpCenterFaq[] = [
  {
    id: "what-is-crittr",
    category: "About",
    question: "What is Crittr?",
    answer:
      "Crittr helps you track your pets’ day-to-day care in one place — health records, activities, reminders, and (with Crittr Pro) AI answers grounded in the profiles you save.",
  },
  {
    id: "co-care",
    category: "How To",
    question: "How does co-care work?",
    answer:
      "You can invite someone by email to help care for a pet you own. They see the pet you shared according to the permissions you set, and activity from co-carers can show up in your notifications.",
  },
  {
    id: "crittr-pro",
    question: "What is Crittr Pro?",
    category: "About",
    answer:
      "Crittr Pro unlocks premium features such as CrittrAI chat that uses your pet's profile to give you personalized answers. You can invite other Crittr users to co-care your pets and see their activity in your notifications. You can manage membership from the upgrade flow in the app.",
  },
  {
    id: "data-visible",
    question: "Who can see my pet data?",
    category: "About",
    answer:
      "Your pet data is visible to you and to co-carers you explicitly invite for that pet. It is not sold or used for third-party marketing — see the Privacy policy for details.",
  },
  {
    id: "how-does-meal-tracking-work",
    question: "How does meal tracking work?",
    category: "How To",
    answer:
      "When you add a food to your pet's profile, it will increase the total meals/treats for your pet's daily activity. So you only want to add the foods you typically feed your pet every day. You can always add extra treats in the activity log.",
  },
  {
    id: "notifications",
    question: "How do I change notifications?",
    category: "How To",
    answer:
      "Open Settings from your profile, then Push notifications. There you can adjust reminders and system permission, and open your device settings if needed.",
  },
  {
    id: "how-to-remove-a-pet",
    question: "How do I remove a pet?",
    category: "How To",
    answer:
      'From your pet\'s profile, tap "Visibility" at the bottom of the page. You will have two options: "Memorialize" or "Delete". If you select "Memorialize", the pet will be hidden from your dashboard and you will no longer be able to view it but your pet data will still be available. If you select "Delete", the pet will be removed from your account and you will no longer be able to view it.',
  },

  {
    id: "feedback",
    question: "How do I report a bug or request a feature?",
    category: "Support",
    answer:
      "From your profile, tap Share feedback. Describe what happened or what you’d like to see — your message goes to our support inbox.",
  },
  {
    id: "more-pets",
    question: "How come Crittr doesn't support other types of pets?",
    category: "Support",
    answer:
      "More pet types will be supported later down the road! Because different types of pets require different types of care, we want to ensure we can create a personalized experience for any pet type.",
  },
  {
    id: "reset-password",
    question: "How do I reset my password?",
    category: "Support",
    answer:
      "From your profile, tap Edit account. Scroll to the bottom and tap Reset password. You'll receive an email with a code to reset your password.",
  },
];
