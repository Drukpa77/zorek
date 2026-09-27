export const legalUpdated = "27 September 2026";

export type LegalKey = "privacy" | "terms" | "accessibility";

export type LegalSection = { heading: string; body: string };

export type LegalDocument = {
  key: LegalKey;
  title: string;
  href: string;
  sections: LegalSection[];
};

export const legalDocuments: LegalDocument[] = [
  {
    key: "privacy",
    title: "Privacy",
    href: "/privacy",
    sections: [
      {
        heading: "Who we are",
        body: "ZOKEK operates this website from Australia. This policy explains what the public site collects when you send a project enquiry. To ask about your information, use the start-a-project form and include the email address you used before.",
      },
      {
        heading: "What we collect",
        body: "The enquiry form asks for your name, organisation, email, phone, the kind of work you are considering, whether you already have a system, a short description of the challenge, a budget range, and a timeline. You can leave the optional fields blank. Staff sign-in uses a separate session cookie that is not set for public visitors. This site does not run advertising or analytics cookies.",
      },
      {
        heading: "How we use it",
        body: "We use the enquiry to reply to you and to decide whether we can take on the work. We do not sell the information, and we do not use it to build a marketing list. If email delivery is configured, a copy of the enquiry is also sent to the ZOKEK inbox that handles new work.",
      },
      {
        heading: "Storage and security",
        body: "Enquiries are stored in the website database. Access is limited to people who operate the site, through the admin area. We keep an enquiry while it is open and for as long as we need it to complete or record the conversation, then we archive or delete it. Notes written in the admin area stay internal and are not published on the website.",
      },
      {
        heading: "Your rights",
        body: "You can ask for a copy of the enquiry we hold, ask us to correct it, or ask us to delete it, by sending another message through the contact form from the same email address. If you are not satisfied with the response, you can complain to the Office of the Australian Information Commissioner.",
      },
    ],
  },
  {
    key: "terms",
    title: "Terms",
    href: "/terms",
    sections: [
      {
        heading: "Use of this website",
        body: "You may read this website and send an enquiry. Do not attempt to break, overload, or gain access to the admin area or the database. An enquiry is a request for a conversation. It is not a quote, a contract, or a promise that ZOKEK will take the work.",
      },
      {
        heading: "Intellectual property",
        body: "The design, text, and code of this website belong to ZOKEK unless a page says otherwise. You may share a link to a page. You may not copy the site, its design, or its text for another business without written permission.",
      },
      {
        heading: "Liability",
        body: "The site is general information about how ZOKEK works. It is not professional advice for your situation. To the extent the law allows, ZOKEK is not liable for loss that comes from using the site, relying on its content, or following a link to another site. Nothing here limits rights you have under the Australian Consumer Law that cannot be excluded.",
      },
      {
        heading: "Third-party links",
        body: "Some links leave this website. Those sites have their own terms and privacy practices, and ZOKEK does not control them.",
      },
      {
        heading: "Governing law",
        body: "These terms are governed by the laws of Australia. If a court finds one part unenforceable, the rest still applies.",
      },
    ],
  },
  {
    key: "accessibility",
    title: "Accessibility",
    href: "/accessibility",
    sections: [
      {
        heading: "Our commitment",
        body: "ZOKEK wants this website to be usable by as many people as possible, including people who use a keyboard, a screen reader, or browser zoom, and people who prefer less motion.",
      },
      {
        heading: "Standard",
        body: "We aim at the Web Content Accessibility Guidelines (WCAG) 2.2 level AA. This site has not had a formal conformance audit, so we do not claim that it meets that standard yet.",
      },
      {
        heading: "What we have done",
        body: "Pages use headings, labels, and buttons that a keyboard can reach. Focus is visible. Text can resize with the browser. When the system asks for reduced motion, the loader, custom cursor, and decorative motion are turned off, and the content stays on the page.",
      },
      {
        heading: "Known limitations",
        body: "The sculpture on the homepage is decorative. It is hidden from assistive technology, and on small screens or when reduced motion or data-saving is on, it is not loaded. Some interior pages are still being built, so their content is shorter than the homepage. We will remove this note as those pages are completed.",
      },
      {
        heading: "Feedback",
        body: "If something blocks you from using the site, send a message through the start-a-project form and describe the page and what happened. We aim to reply within five business days.",
      },
    ],
  },
];

export function legalDocument(key: LegalKey) {
  const document = legalDocuments.find((item) => item.key === key);
  if (!document) throw new Error(`Unknown legal document: ${key}`);
  return document;
}
