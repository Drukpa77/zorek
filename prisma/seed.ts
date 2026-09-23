import { hash } from "@node-rs/argon2";
import { PrismaClient, type Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const json = (value: unknown) => value as Prisma.InputJsonValue;

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, " ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function text(value: string) {
  return { type: "text", text: value };
}

function paragraph(value: string) {
  return { type: "paragraph", content: [text(value)] };
}

function heading(value: string, id: string) {
  return { type: "heading", attrs: { level: 2, id }, content: [text(value)] };
}

function bullet(items: string[]) {
  return {
    type: "bulletList",
    content: items.map((item) => ({ type: "listItem", content: [paragraph(item)] })),
  };
}

function cell(value: string, header = false) {
  return {
    type: header ? "tableHeader" : "tableCell",
    content: [paragraph(value)],
  };
}

function row(values: string[], header = false) {
  return { type: "tableRow", content: values.map((value) => cell(value, header)) };
}

const leadArticle = {
  type: "doc",
  content: [
    paragraph(
      "[Article introduction. This page demonstrates the editorial template: headings, paragraphs, quotes, lists, callouts, code and figures, all rendered from the CMS rich-content editor.]",
    ),
    heading("The real question isn't build vs buy", "s1"),
    paragraph(
      "[Body copy. Frame the decision around the workflow that creates value, the systems it touches and who maintains it over time.]",
    ),
    {
      type: "blockquote",
      content: [
        paragraph(
          "If your process is the product, renting someone else's version of it is a strategic choice — make it deliberately.",
        ),
      ],
    },
    heading("Signals that point toward custom", "s2"),
    bullet([
      "Several tools stitched together to approximate one workflow",
      "Staff maintaining spreadsheets to bridge gaps between systems",
      "Licensing costs scaling faster than value",
      "Differentiating processes forced into generic templates",
    ]),
    {
      type: "callout",
      attrs: { label: "Callout" },
      content: [paragraph("[Key takeaway rendered by the Callout block.]")],
    },
    heading("The costs people miss", "s3"),
    paragraph(
      "[Body copy covering integration, data migration, training, and long-term maintenance for both options.]",
    ),
    {
      type: "table",
      content: [
        row(["Factor", "SaaS", "Custom"], true),
        row(["Time to first value", "Fast", "Slower"]),
        row(["Fit to process", "Generic", "Exact"]),
        row(["Ownership", "Vendor", "You"]),
      ],
    },
    heading("A simple test", "s4"),
    {
      type: "codeBlock",
      content: [text("if (workflow.isDifferentiator && tools.workarounds > 2) {\n  consider('custom');\n}")],
    },
    paragraph("[Conclusion and next step.]"),
  ],
};

const services = [
  {
    name: "Custom Software",
    copy: "Purpose-built software that simplifies operations, automates processes and solves complex organisational problems.",
    full: true,
  },
  {
    name: "Web Development",
    copy: "Websites, portals and digital experiences designed around users, organisations and measurable objectives.",
  },
  {
    name: "Web Applications",
    copy: "Secure and scalable browser-based applications designed around real workflows.",
  },
  {
    name: "Mobile App Development",
    copy: "Cross-platform mobile products designed for intuitive experiences and long-term growth.",
  },
  {
    name: "Experience Design",
    copy: "Research, UX strategy, interfaces, prototypes and design systems that turn complexity into intuitive digital experiences.",
  },
  {
    name: "Systems & Integrations",
    copy: "Connecting applications, APIs, platforms and data so technology works together rather than in isolation.",
  },
  {
    name: "Quality Engineering",
    copy: "Structured QA, testing and validation that improves reliability, accessibility and release confidence.",
  },
  {
    name: "Digital Growth",
    copy: "SEO, analytics, optimisation and continuous improvement designed to make digital platforms perform better over time.",
  },
] as const;

const industries = [
  ["Government", "Secure, accessible and maintainable digital services.", ["Legacy platforms that are costly to change", "Strict accessibility and security obligations", "Services spread across disconnected systems"], ["Web Applications", "Quality Engineering", "Systems & Integrations"]],
  ["Not-for-Profit", "Platforms designed around communities, members, donors and services.", ["Limited budgets and small internal teams", "Member and donor data in separate tools", "Content that is hard to keep current"], ["Digital Platforms", "Experience Design", "Digital Growth"]],
  ["Professional Services", "Digital platforms, portals and internal systems designed around complex business workflows.", ["Manual processes and re-keyed data", "Client portals that feel like afterthoughts", "Reporting that depends on spreadsheets"], ["Custom Software", "Web Applications", "Systems & Integrations"]],
  ["Education", "Learning experiences, administrative platforms and digital services.", ["Administrative workflows across many systems", "Diverse users with diverse access needs", "Peak-load reliability"], ["Web Applications", "Experience Design", "Quality Engineering"]],
  ["Hospitality", "Booking systems, digital experiences and commerce platforms.", ["Booking friction and abandoned checkouts", "Third-party platform fees and lock-in", "Operational data in silos"], ["Web Applications", "Mobile App Development", "Digital Growth"]],
  ["Startups & Product Teams", "Product strategy, prototypes, MVPs and scalable software.", ["Validating before over-building", "Architecture that survives growth", "Shipping with a small team"], ["Custom Software", "Mobile App Development", "Experience Design"]],
] as const;

const cases = [
  { name: "Custom Business Platform", slug: "custom-business-platform", industry: "Professional Services", status: "PUBLISHED", featured: true, projectType: "Software", description: "Operations platform replacing spreadsheets and manual approvals with one governed workflow.", services: ["UX / UI", "Software Engineering", "Web Application"], technologies: ["Next.js", "Node", "PostgreSQL"], publishedAt: new Date("2026-08-12T00:00:00.000Z"), focalX: 0.62, focalY: 0.4 },
  { name: "Mobile Application", slug: "mobile-application", industry: "Hospitality", status: "PUBLISHED", featured: false, projectType: "Mobile", description: "Cross-platform app for bookings, notifications and account management.", services: ["UX / UI", "Mobile"], technologies: ["React Native", "Expo"], publishedAt: new Date("2026-07-03T00:00:00.000Z"), focalX: 0.5, focalY: 0.5 },
  { name: "Corporate Digital Platform", slug: "corporate-digital-platform", industry: "Government", status: "DRAFT", featured: false, projectType: "Web", description: "Content-managed website with structured SEO and accessibility built in.", services: ["Web Design", "SEO"], technologies: ["Next.js"], publishedAt: null, focalX: 0.5, focalY: 0.5 },
  { name: "Booking Experience", slug: "booking-experience", industry: "Hospitality", status: "SCHEDULED", featured: false, projectType: "Web", description: "Real-time availability, payments and confirmations in a single flow.", services: ["Web Application"], technologies: ["Next.js", "REST APIs"], publishedAt: null, publishAt: new Date("2026-10-01T00:00:00.000Z"), focalX: 0.5, focalY: 0.5 },
  { name: "Internal Operations System", slug: "internal-operations-system", industry: "Education", status: "ARCHIVED", featured: false, projectType: "Software", description: "Role-based dashboards connecting scheduling, finance and reporting.", services: ["Software Engineering", "QA"], technologies: ["TypeScript", "PostgreSQL", "AWS"], publishedAt: new Date("2026-02-14T00:00:00.000Z"), focalX: 0.5, focalY: 0.5 },
] as const;

const narrative = [
  ["The client", "[Who the client is, what they do and who they serve.]", "[Context: organisation size, audience, the role the digital platform plays in their operations.]"],
  ["The challenge", "[The core problem, stated plainly.]", "[What was failing, who it affected and what it was costing — operationally or for users.]"],
  ["The objective", "[What success needed to look like.]", "[Measurable goals and constraints agreed during discovery.]"],
  ["The strategy", "[The approach, and why it was chosen over alternatives.]", "[Discovery findings, prioritisation and delivery plan.]"],
  ["The solution", "[What was designed and built.]", "[Key capabilities, workflows and integrations delivered.]"],
] as const;

async function main() {
  const email = (process.env.SEED_ADMIN_EMAIL ?? "admin@example.com").toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD ?? "demopassword";
  const passwordHash = await hash(password);

  await prisma.$transaction(async (tx) => {
    await tx.enquiryNote.deleteMany();
    await tx.enquiry.deleteMany();
    await tx.activityLog.deleteMany();
    await tx.contentVersion.deleteMany();
    await tx.caseStudyBlock.deleteMany();
    await tx.caseStudy.deleteMany();
    await tx.service.deleteMany();
    await tx.industry.deleteMany();
    await tx.insight.deleteMany();
    await tx.tag.deleteMany();
    await tx.category.deleteMany();
    await tx.pageSection.deleteMany();
    await tx.page.deleteMany();
    await tx.navigationItem.deleteMany();
    await tx.redirect.deleteMany();
    await tx.media.deleteMany();
    await tx.seo.deleteMany();
    await tx.passwordResetToken.deleteMany();
    await tx.session.deleteMany();
    await tx.siteSettings.deleteMany();
    await tx.user.deleteMany();

    const user = await tx.user.create({
      data: {
        email,
        name: "[Founder name]",
        passwordHash,
        role: "SUPER_ADMIN",
      },
    });

    const categoryNames = ["Strategy", "Delivery", "Engineering", "AI", "Accessibility", "Quality"];
    const categories = Object.fromEntries(
      await Promise.all(
        categoryNames.map(async (name) => {
          const category = await tx.category.create({ data: { name, slug: slugify(name) } });
          return [name, category.id] as const;
        }),
      ),
    );

    const tagNames = ["Custom software", "SaaS", "Discovery", "Legacy", "Accessibility", "AI", "Quality", "Strategy"];
    await Promise.all(tagNames.map((name) => tx.tag.create({ data: { name, slug: slugify(name) } })));

    const industryIds = Object.fromEntries(
      await Promise.all(
        industries.map(async (industry, index) => {
          const created = await tx.industry.create({
            data: {
              name: industry[0],
              slug: slugify(industry[0]),
              heroContent: json({ summary: industry[1] }),
              challenges: [...industry[2]],
              solutions: json({ services: [...industry[3]] }),
              relevantServiceIds: [],
              status: "PUBLISHED",
              displayOrder: index,
            },
          });
          return [industry[0], created.id] as const;
        }),
      ),
    );

    const caseIds: Record<string, string> = {};
    for (const [index, study] of cases.entries()) {
      const created = await tx.caseStudy.create({
        data: {
          slug: study.slug,
          name: study.name,
          clientName: "[Client name]",
          shortDescription: study.description,
          year: 2026,
          industryId: industryIds[study.industry],
          projectType: study.projectType,
          status: study.status,
          featured: study.featured,
          displayOrder: index,
          services: [...study.services],
          technologies: [...study.technologies],
          publishAt: "publishAt" in study ? study.publishAt : null,
          publishedAt: study.publishedAt,
          blocks:
            study.slug === "custom-business-platform"
              ? {
                  create: [
                    ...narrative.map((item, order) => ({
                      type: "richText",
                      order,
                      data: json({ label: item[0], lead: item[1], body: { type: "doc", content: [paragraph(item[2])] } }),
                    })),
                    {
                      type: "architecture",
                      order: 5,
                      data: json({
                        layers: [
                          { layer: "Interface", tech: "Next.js", parts: ["App shell", "Dashboards", "Forms & workflows"] },
                          { layer: "Services", tech: "Node", parts: ["REST API", "Auth / sessions", "Background jobs"] },
                          { layer: "Data", tech: "PostgreSQL", parts: ["Relational schema", "Migrations", "Audit log"] },
                          { layer: "Delivery", tech: "AWS", parts: ["CI/CD", "Monitoring", "Backups"] },
                        ],
                      }),
                    },
                    {
                      type: "deviceMockup",
                      order: 6,
                      data: json({
                        screens: [
                          { label: "Onboarding", mediaId: null },
                          { label: "Dashboard", mediaId: null },
                          { label: "Detail view", mediaId: null },
                        ],
                      }),
                    },
                    {
                      type: "richText",
                      order: 7,
                      data: json({
                        label: "Quality assurance",
                        lead: "Functional · Regression · Cross-browser · Responsive · Accessibility · Performance",
                        body: {
                          type: "doc",
                          content: [
                            bullet([
                              "Functional — Core workflows end-to-end",
                              "Regression — Automated suite on every release",
                              "Cross-browser — Evergreen browsers + Safari iOS",
                              "Responsive — Mobile, tablet, desktop breakpoints",
                              "Accessibility — Keyboard, screen reader, contrast",
                              "Performance — Core Web Vitals budgets",
                            ]),
                          ],
                        },
                      }),
                    },
                    {
                      type: "statistic",
                      order: 8,
                      data: json({
                        verified: false,
                        items: [
                          { value: "[00%]", label: "Placeholder · performance metric" },
                          { value: "[0 → 0]", label: "Placeholder · systems consolidated" },
                          { value: "[00%]", label: "Placeholder · qualified enquiries" },
                        ],
                      }),
                    },
                    {
                      type: "quote",
                      order: 9,
                      hidden: true,
                      data: json({
                        quote: "[Client testimonial — verified quote only. Leave this block hidden until one exists.]",
                        name: "[Name]",
                        role: "[Role], [Client name]",
                      }),
                    },
                    {
                      type: "technologyList",
                      order: 10,
                      data: json({
                        items: [
                          { name: "Next.js", role: "Frontend" },
                          { name: "Node", role: "API" },
                          { name: "PostgreSQL", role: "Data" },
                          { name: "AWS", role: "Deployment" },
                          { name: "GitHub Actions", role: "CI/CD" },
                        ],
                      }),
                    },
                  ],
                }
              : {
                  create: [
                    {
                      type: "richText",
                      order: 0,
                      data: json({
                        label: "Summary",
                        lead: study.description,
                        body: { type: "doc", content: [paragraph("[Project summary, challenge and outcome are added once real case study content is supplied.]")] },
                      }),
                    },
                  ],
                },
        },
      });
      caseIds[study.slug] = created.id;
    }

    const serviceIds: Record<string, string> = {};
    for (const [index, service] of services.entries()) {
      const slug = slugify(service.name);
      const detailed = "full" in service;
      const created = await tx.service.create({
        data: {
          slug,
          name: service.name,
          shortDescription: service.copy,
          heroHeading: detailed ? "Software built around your business." : service.name,
          heroCopy: detailed
            ? "When off-the-shelf platforms cannot support the way your organisation operates, we design and engineer software around the workflows, users and systems that matter."
            : service.copy,
          problem: json(
            detailed
              ? ["Critical processes run on spreadsheets, email and manual re-entry.", "Off-the-shelf tools force workarounds your team maintains by hand.", "Data lives in systems that do not talk to each other.", "Legacy software is fragile, slow to change and hard to support.", "Licensing costs grow while the fit gets worse."]
              : [],
          ),
          audience: json(
            detailed
              ? [
                  { title: "Operations teams", copy: "Organisations whose core workflows have outgrown generic tools." },
                  { title: "Growing businesses", copy: "Teams scaling past spreadsheets and disconnected SaaS." },
                  { title: "Public & not-for-profit", copy: "Services that must be secure, accessible and maintainable for years." },
                ]
              : [],
          ),
          approach: json(
            detailed
              ? [
                  { title: "Map the workflow", copy: "Interviews, observation and system audits to understand how work actually moves." },
                  { title: "Define the system", copy: "Requirements, data model, integrations and architecture — agreed before build." },
                  { title: "Build in increments", copy: "Working software every iteration, reviewed with the people who will use it." },
                  { title: "Validate and launch", copy: "Structured testing, staged rollout, monitoring and training." },
                ]
              : [],
          ),
          deliverables: detailed
            ? ["Discovery findings & requirements", "System architecture & data model", "UX flows, prototypes & UI", "Production application", "Integrations & APIs", "Test strategy & automated suites", "Documentation & handover"]
            : [],
          benefits: json(
            detailed
              ? [
                  { title: "Less manual work", copy: "Automate repetitive steps and remove duplicate data entry." },
                  { title: "One source of truth", copy: "Consolidated data, fewer reconciliation errors." },
                  { title: "Software that fits", copy: "Built around your process rather than forcing workarounds." },
                  { title: "Room to grow", copy: "Maintainable architecture designed to be extended." },
                ]
              : [],
          ),
          process: json(
            detailed
              ? ["Discover", "Define", "Design", "Build", "Validate", "Launch", "Improve"].map((title) => ({ title }))
              : [],
          ),
          capabilities: detailed
            ? ["Business analysis", "Software architecture", "Backend engineering", "Frontend engineering", "Database design", "Quality engineering"]
            : [],
          technologies: detailed ? ["TypeScript", "Next.js / React", "Node.js", "PostgreSQL + Prisma", "AWS / Vercel"] : [],
          faqs: json(
            detailed
              ? [
                  { question: "When is custom software the right choice over SaaS?", answer: "When your process is a genuine differentiator, when you are stitching several tools together to approximate one workflow, or when licensing and workarounds cost more than owning the system. We will tell you if an existing product would serve you better." },
                  { question: "How do you estimate cost and timeline?", answer: "After a short discovery phase we define scope, architecture and priorities, then estimate in delivery increments so you can see progress and adjust before committing further." },
                  { question: "Who owns the code?", answer: "[Confirm your contractual position.] Typically the client owns the delivered source code and infrastructure accounts." },
                  { question: "Can you work with our existing systems?", answer: "Yes. Most custom software needs to integrate with finance, identity, CRM or data platforms. Integrations are designed and tested as part of the core scope." },
                  { question: "What happens after launch?", answer: "We offer ongoing maintenance, monitoring and continued development, or a documented handover to your internal team." },
                ]
              : [],
          ),
          ctaLabel: detailed ? "Discuss your project ↗" : "Start a project ↗",
          status: "PUBLISHED",
          displayOrder: index,
          relatedCaseStudies: detailed
            ? { connect: [{ id: caseIds["custom-business-platform"] }, { id: caseIds["internal-operations-system"] }] }
            : undefined,
        },
      });
      serviceIds[slug] = created.id;
    }

    for (const industry of industries) {
      const ids = industry[3]
        .map((name) => serviceIds[slugify(name)])
        .filter((id): id is string => Boolean(id));
      await tx.industry.update({
        where: { slug: slugify(industry[0]) },
        data: { relevantServiceIds: ids },
      });
    }

    const articles = [
      { title: "When should a business build custom software instead of buying SaaS?", slug: "custom-software-vs-saas", category: "Strategy", excerpt: "A practical framework for deciding when to build, buy or extend — and the costs most comparisons leave out.", status: "PUBLISHED", featured: true, publishedAt: new Date("2026-09-10T00:00:00.000Z"), tags: ["custom-software", "saas", "strategy"], body: leadArticle },
      { title: "Why digital projects fail before development even begins", slug: "why-projects-fail-early", category: "Delivery", excerpt: "Most risk is decided in discovery, not in code.", status: "DRAFT", featured: false, publishedAt: null, tags: ["discovery"], body: { type: "doc", content: [paragraph("Most risk is decided in discovery, not in code.")] } },
      { title: "The hidden cost of maintaining legacy software", slug: "hidden-cost-legacy", category: "Engineering", excerpt: "What the maintenance line item doesn’t show.", status: "SCHEDULED", featured: false, publishedAt: null, publishAt: new Date("2026-09-30T00:00:00.000Z"), tags: ["legacy"], body: { type: "doc", content: [paragraph("What the maintenance line item doesn’t show.")] } },
      { title: "What businesses should consider before adding AI to their products", slug: "before-adding-ai", category: "AI", excerpt: "Data, evaluation and failure modes first.", status: "PUBLISHED", featured: false, publishedAt: new Date("2026-09-01T00:00:00.000Z"), tags: ["ai"], body: { type: "doc", content: [paragraph("Data, evaluation and failure modes first.")] } },
      { title: "How accessibility improves digital products", slug: "accessibility-improves-products", category: "Accessibility", excerpt: "Better for everyone, measurably.", status: "PUBLISHED", featured: false, publishedAt: new Date("2026-08-28T00:00:00.000Z"), tags: ["accessibility"], body: { type: "doc", content: [paragraph("Better for everyone, measurably.")] } },
      { title: "Why software quality starts before testing", slug: "quality-starts-before-testing", category: "Quality", excerpt: "Testability is a design decision.", status: "PUBLISHED", featured: false, publishedAt: new Date("2026-08-20T00:00:00.000Z"), tags: ["quality"], body: { type: "doc", content: [paragraph("Testability is a design decision.")] } },
    ] as const;

    for (const article of articles) {
      await tx.insight.create({
        data: {
          slug: article.slug,
          title: article.title,
          excerpt: article.excerpt,
          authorId: user.id,
          categoryId: categories[article.category],
          body: json(article.body),
          status: article.status,
          featured: article.featured,
          publishedAt: article.publishedAt,
          publishAt: "publishAt" in article ? article.publishAt : null,
          tags: { connect: article.tags.map((slug) => ({ slug })) },
        },
      });
    }

    const home = await tx.page.create({
      data: {
        key: "home",
        status: "PUBLISHED",
        sections: {
          create: [
            { key: "hero", order: 0, data: json({ plate: "Plate 01 / Introduction", eyebrow: "Digital Product & Software Engineering", words: ["Design.", "Engineer.", "Evolve."], heading: "Technology built around your business.", copy: "We design and engineer digital platforms, software and experiences that help organisations operate better, serve customers better and grow.", primaryCta: { label: "Start a project ↗", href: "/contact" }, secondaryCta: { label: "Explore our work", href: "/work" } }) },
            { key: "positioning", order: 1, data: json({ plate: "Plate 02 / Positioning", heading: "We turn complex ideas into simple digital systems.", copy: "Great digital products come from strategy, experience design, software engineering, testing and ongoing improvement — working together as one system built for real-world use." }) },
            { key: "whatWeBuild", order: 2, data: json({ plate: "Plate 03 / What we build", heading: "What we build" }) },
            { key: "outcomes", order: 3, data: json({ plate: "Plate 04 / Outcomes", heading: "Technology should solve something." }) },
            { key: "featured", order: 4, data: json({ plate: "Plate 05 / Project 01", caseStudySlug: "custom-business-platform", heading: "Reimagining how people interact with", placeholder: "____" }) },
            { key: "selectedWork", order: 5, data: json({ plate: "Plate 07 / Selected work", heading: "Selected work" }) },
            { key: "finalCta", order: 6, data: json({ plate: "Plate 15", heading: "Have something worth building?", words: ["Have", "something", "worth", "building?"] }) },
          ],
        },
      },
    });

    await tx.page.create({
      data: {
        key: "about",
        status: "PUBLISHED",
        sections: {
          create: [
            { key: "hero", order: 0, data: json({ lines: ["Small by design.", "Serious about", "the work."], lead: "ZOKEK is an independent digital engineering company built around quality, clarity and thoughtful technology.", copy: "We combine product thinking, experience design and software engineering to create digital systems designed for real organisations and real users." }) },
            { key: "model", order: 1, data: json({ items: [{ title: "Direct", copy: "You work with the engineer designing and building your system — no account layers, no hand-offs." }, { title: "Senior", copy: "Architecture, code and testing decisions made by someone accountable for the result." }, { title: "Scalable", copy: "Specialist collaborators are brought in when a project needs them, and the team grows as the work does." }] }) },
            { key: "expertise", order: 2, data: json({ items: ["Software Engineering", "Web Development", "Application Development", "Quality Engineering", "UX / UI", "Digital Strategy", "SEO", "Technical Delivery"] }) },
            { key: "principles", order: 3, data: json({ items: [{ title: "Strategy", copy: "Understand the problem before proposing the solution." }, { title: "Design", copy: "Shape the experience around the people using it." }, { title: "Engineering", copy: "Build systems that stay maintainable long after launch." }, { title: "Quality", copy: "Validate the result — not just the code." }] }) },
            { key: "security", order: 4, data: json({ items: ["Secure development", "Access control", "Secrets management", "Backups", "Cloud infrastructure", "Patch management", "Data handling", "Testing", "Monitoring", "Incident response"] }) },
            { key: "accessibility", order: 5, data: json({ items: [{ title: "Research", copy: "Include people with diverse needs" }, { title: "UX", copy: "Clear structure, predictable flows" }, { title: "Design", copy: "Contrast, type and focus states" }, { title: "Development", copy: "Semantic, keyboard-operable markup" }, { title: "Content", copy: "Plain language and alt text" }, { title: "Testing", copy: "Assistive technology and audits" }] }) },
          ],
        },
      },
    });

    const legal = [
      ["privacy", "Privacy", [["Who we are", "[Legal entity name, ABN and contact details.]"], ["What we collect", "[Enquiry form fields, analytics data and cookies.]"], ["How we use it", "[Responding to enquiries, improving the website.]"], ["Storage & security", "[Where data is stored, retention periods and safeguards.]"], ["Your rights", "[Access, correction and complaints under applicable privacy law.]"]]],
      ["terms", "Terms", [["Use of this website", "[Acceptable use.]"], ["Intellectual property", "[Ownership of site content.]"], ["Liability", "[Limitations.]"], ["Third-party links", "[External sites.]"], ["Governing law", "[Jurisdiction.]"]]],
      ["accessibility", "Accessibility", [["Our commitment", "[Statement of intent to make this website usable by as many people as possible.]"], ["Standard", "[Name the standard only once conformance has been tested and verified.]"], ["What we have done", "[Semantic markup, keyboard navigation, visible focus, reduced-motion support, contrast.]"], ["Known limitations", "[Any areas still being improved.]"], ["Feedback", "[How to report an accessibility issue and expected response time.]"]]],
    ] as const;

    for (const [key, title, sections] of legal) {
      await tx.page.create({
        data: {
          key,
          status: "PUBLISHED",
          sections: {
            create: [{ key: "document", order: 0, data: json({ title, notice: "Template only", sections: sections.map(([heading, body]) => ({ heading, body })) }) }],
          },
        },
      });
    }

    const nav = [
      ["Work", "/work", true],
      ["Services", "/services/custom-software", false],
      ["Capabilities", "/#capabilities", false],
      ["About", "/about", false],
      ["Insights", "/insights", false],
    ] as const;

    for (const [index, item] of nav.entries()) {
      await tx.navigationItem.create({
        data: { menu: "main", label: item[0], href: item[1], systemRoute: item[2], order: index },
      });
    }

    await tx.navigationItem.create({
      data: { menu: "cta", label: "Start a project", href: "/contact", systemRoute: true, order: 0 },
    });

    await tx.redirect.createMany({
      data: [
        { fromPath: "/old-service", toPath: "/services/custom-software", type: "PERMANENT_301" },
        { fromPath: "/blog", toPath: "/insights", type: "PERMANENT_301" },
      ],
    });

    await tx.siteSettings.create({
      data: {
        id: 1,
        data: json({
          company: "ZOKEK",
          email: "hello@[domain].com",
          phone: "",
          location: "Australia",
          abn: "[Business number]",
          linkedin: "",
          instagram: "",
          github: "",
          footer: "Independent digital engineering company.",
          seoTitle: "ZOKEK — Digital Product & Software Engineering",
          seoDesc: "",
          ga: "",
          gtm: "",
        }),
      },
    });

    const enquiries = [
      { name: "Sample Enquirer A", company: "Sample Organisation", email: "a@example.com", phone: null, projectTypes: ["Custom Software", "System Integration"], existingSystem: "Yes", existingUrl: null, description: "Sample submission: our approvals run through email and spreadsheets and we need one system connected to finance.", budget: "$40k – $100k", timeline: "3 – 6 months", status: "NEW" as const, createdAt: new Date("2026-09-23T00:00:00.000Z"), note: null },
      { name: "Sample Enquirer B", company: "Sample Not-for-Profit", email: "b@example.com", phone: "+61 000 000 000", projectTypes: ["Website", "SEO / Growth"], existingSystem: "Yes", existingUrl: null, description: "Sample submission: rebuild of member-facing website with accessibility improvements.", budget: "$15k – $40k", timeline: "1 – 3 months", status: "CONTACTED" as const, createdAt: new Date("2026-09-21T00:00:00.000Z"), note: "Intro call booked Thu" },
      { name: "Sample Enquirer C", company: "Sample Startup", email: "c@example.com", phone: null, projectTypes: ["Mobile Application"], existingSystem: "No", existingUrl: null, description: "Sample submission: MVP for a booking app.", budget: "Not sure yet", timeline: "Flexible", status: "QUALIFIED" as const, createdAt: new Date("2026-09-17T00:00:00.000Z"), note: null },
      { name: "Sample Enquirer D", company: "Sample Council", email: "d@example.com", phone: null, projectTypes: ["Web Application"], existingSystem: "Yes", existingUrl: null, description: "Sample submission: internal portal.", budget: "$100k +", timeline: "6 months +", status: "PROPOSAL" as const, createdAt: new Date("2026-09-09T00:00:00.000Z"), note: null },
    ];

    for (const enquiry of enquiries) {
      const created = await tx.enquiry.create({
        data: {
          name: enquiry.name,
          company: enquiry.company,
          email: enquiry.email,
          phone: enquiry.phone,
          projectTypes: enquiry.projectTypes,
          existingSystem: enquiry.existingSystem,
          description: enquiry.description,
          budget: enquiry.budget,
          timeline: enquiry.timeline,
          status: enquiry.status,
          createdAt: enquiry.createdAt,
        },
      });
      if (enquiry.note) {
        await tx.enquiryNote.create({
          data: { enquiryId: created.id, authorId: user.id, body: enquiry.note },
        });
      }
    }

    await tx.activityLog.create({
      data: {
        userId: user.id,
        action: "seed",
        entityType: "Site",
        entityId: home.id,
        summary: "Seeded placeholder content from the design prototypes.",
      },
    });
  }, { timeout: 30_000 });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
