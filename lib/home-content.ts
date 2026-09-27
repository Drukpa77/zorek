// Homepage copy, mirrored from designs/Home B.dc.html. Kept in one module so it
// can move to Page(key="home") in the CMS without touching the components.

export type SpecimenMode =
  | "fragment"
  | "sphere"
  | "platforms"
  | "nodes"
  | "layers"
  | "phone"
  | "design"
  | "quality"
  | "cube"
  | "integrations"
  | "growth"
  | "strategy"
  | "process";

export const specimenModeNames: Record<SpecimenMode, string> = {
  fragment: "Fragment",
  sphere: "Ecosystem",
  platforms: "Platform layers",
  nodes: "Node system",
  layers: "App layers",
  phone: "Mobile device",
  design: "Wireframe",
  quality: "Validation grid",
  cube: "Lattice",
  integrations: "Linked systems",
  growth: "Growth series",
  strategy: "Trajectory",
  process: "Chaos → structure",
};

export const positioningCopy =
  "Great digital products come from strategy, experience design, software engineering, testing and ongoing improvement — working together as one system built for real-world use.";

export const capabilities: { title: string; scope: string; mode: SpecimenMode }[] = [
  {
    title: "Digital Platforms",
    scope: "Websites, portals and digital experiences designed around users, organisations and measurable objectives.",
    mode: "platforms",
  },
  {
    title: "Custom Software",
    scope: "Purpose-built software that simplifies operations, automates processes and solves complex organisational problems.",
    mode: "nodes",
  },
  {
    title: "Web Applications",
    scope: "Secure and scalable browser-based applications designed around real workflows.",
    mode: "layers",
  },
  {
    title: "Mobile Applications",
    scope: "Cross-platform mobile products designed for intuitive experiences and long-term growth.",
    mode: "phone",
  },
  {
    title: "Experience Design",
    scope: "Research, UX strategy, interfaces, prototypes and design systems that turn complexity into intuitive digital experiences.",
    mode: "design",
  },
  {
    title: "Systems & Integrations",
    scope: "Connecting applications, APIs, platforms and data so technology works together rather than in isolation.",
    mode: "integrations",
  },
  {
    title: "Quality Engineering",
    scope: "Structured QA, testing and validation that improves reliability, accessibility and release confidence.",
    mode: "quality",
  },
  {
    title: "Digital Growth",
    scope: "SEO, analytics, optimisation and continuous improvement designed to make digital platforms perform better over time.",
    mode: "growth",
  },
];

export const outcomes: { problem: string; outcome: string; work: string }[] = [
  {
    problem: "Modernise outdated systems",
    outcome: "Replace legacy applications with secure, maintainable and scalable technology.",
    work: "Legacy assessment / Re-platforming / Data migration",
  },
  {
    problem: "Automate manual processes",
    outcome: "Reduce repetitive administrative work through software, workflows and integrations.",
    work: "Workflow mapping / Automation / Integrations",
  },
  {
    problem: "Improve customer experiences",
    outcome: "Create simpler digital journeys that make it easier for users to interact with an organisation.",
    work: "UX research / Journey design / Portals",
  },
  {
    problem: "Build new digital products",
    outcome: "Turn ideas into scalable web, mobile and software products.",
    work: "Discovery / MVP / Product engineering",
  },
  {
    problem: "Connect disconnected systems",
    outcome: "Create integrations that allow platforms, applications and information to work together.",
    work: "APIs / Middleware / Data sync",
  },
  {
    problem: "Improve digital performance",
    outcome: "Strengthen performance, accessibility, search visibility, usability and conversion.",
    work: "Core Web Vitals / Accessibility / SEO / CRO",
  },
];

export const industries: { title: string; copy: string }[] = [
  { title: "Government", copy: "Secure, accessible and maintainable digital services." },
  { title: "Not-for-Profit", copy: "Platforms designed around communities, members, donors and services." },
  {
    title: "Professional Services",
    copy: "Digital platforms, portals and internal systems designed around complex business workflows.",
  },
  { title: "Education", copy: "Learning experiences, administrative platforms and digital services." },
  { title: "Hospitality", copy: "Booking systems, digital experiences and commerce platforms." },
  { title: "Startups & Product Teams", copy: "Product strategy, prototypes, MVPs and scalable software." },
];

export const founderExpertise = [
  "Software Engineering",
  "Web Development",
  "Application Development",
  "Quality Engineering",
  "UX / UI",
  "Digital Strategy",
  "SEO",
  "Technical Delivery",
];

export const securityPractice = [
  "Secure development",
  "Access control",
  "Secrets management",
  "Backups",
  "Cloud infrastructure",
  "Patch management",
  "Data handling",
  "Testing",
  "Monitoring",
  "Incident response",
];

export const accessibilityAcross = ["Research", "UX", "Design", "Development", "Content", "Testing"];

export const pad = (n: number) => String(n).padStart(2, "0");
