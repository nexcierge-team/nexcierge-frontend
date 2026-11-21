// All copy for the public marketing pages: the homepage, /how-it-works,
// /services and /why-nexcierge. Server and client sections import from
// here so wording lives in one place. House rule: no em dashes in
// user-facing strings.
//
// Product claims on these pages (Nexcierge as Merchant of Record, QIMA
// as a named inspection partner, financing, documents and payment links
// in the buyer account) were confirmed with the business before
// publishing. Do not add testimonials, order counts, supplier counts,
// certifications, guarantees or response-time promises without checking
// with them first.

export const NAV_LINKS = [
  { href: "/how-it-works", label: "How it works" },
  { href: "/services", label: "Services" },
  { href: "/why-nexcierge", label: "Why Nexcierge" },
] as const;

// One label per destination, used everywhere a CTA appears.
export const CTA = {
  start: "Start a request",
  howItWorks: "How it works",
  signIn: "Sign in",
  account: "Your account",
} as const;

// ── Homepage ─────────────────────────────────────────────────

export const HERO = {
  title: "Buy machinery from anywhere, under one contract.",
  lead: "Tell us what equipment you need. We’ll find the right manufacturer, help verify the supplier, and handle your purchase under one contract.",
} as const;

// Homepage section 2: the usual chain struck through in red pencil, then
// the three things that go wrong in it, each with what we do instead.
export const RISKS = {
  title: "A simpler way to buy equipment overseas.",
  lead: "Buying from another country usually means a chain of agents and traders between you and the factory. We replace the chain with one seller.",
  chain: {
    usual: "The usual chain",
    ours: "With Nexcierge",
    buyer: "You",
    middle: ["Agent", "Trader"],
    factory: "Factory",
    nex: "Nexcierge",
    nexSub: "Your seller",
    caption:
      "Agents and traders between you and the factory, replaced by one seller.",
  },
  items: [
    {
      risk: "Hook pricing",
      riskText:
        "A low quote wins your order. The real price shows up after the deposit is paid.",
      fix: "The seller quotes the price",
      fixText:
        "Your quote comes from Nexcierge, the company that will invoice you, and the agreed price is written into your contract.",
      scribble:
        "M12,34 C8,10 186,2 192,26 C198,54 26,60 8,40 C0,28 26,12 72,8",
    },
    {
      risk: "A broken chain",
      riskText:
        "Someone in the chain drops out halfway through the deal, and accountability leaves with them.",
      fix: "One company responsible for your order",
      fixText:
        "Your contract, invoice, and payment are all with Nexcierge, so there is no chain to fall apart.",
      scribble:
        "M10,30 C10,6 190,6 190,30 C190,56 14,56 8,32 C6,22 30,10 64,8",
    },
    {
      risk: "Lost in translation",
      riskText:
        "Technical specifications pass through several languages and arrive meaning something else.",
      fix: "Clear specifications, in your language",
      fixText:
        "Describe what you need in your own language. We turn it into a clear sourcing brief, and your account manager checks the technical details with suppliers.",
      scribble:
        "M14,36 C6,12 184,0 192,24 C200,52 30,62 10,42 C2,30 22,14 60,10",
    },
  ],
} as const;

export const STEPS = {
  title: "From your requirements to the right machine.",
  lead: "Tell us what you’re looking for. We’ll help with the details, find suitable manufacturers, and guide you through the purchase.",
  cta: "Explore how it works",
  items: [
    {
      title: "Tell us what you need",
      text: "Describe the equipment you’re looking for in your own language. Our sourcing assistant helps gather the details.",
    },
    {
      title: "We find and verify suppliers",
      text: "Our team works with manufacturers, reviews specifications, and helps arrange inspections when needed.",
    },
    {
      title: "Purchase with confidence",
      text: "Receive a quote from Nexcierge and complete your purchase through one company. We can also help coordinate shipping and installation.",
    },
  ],
} as const;

export const MOR = {
  title: "One contract. One company accountable.",
  lead: [
    "Unlike supplier directories that simply connect you with manufacturers, Nexcierge is your seller. We purchase the equipment from the supplier and sell it directly to you.",
    "Your contract, invoice, and payment are with Nexcierge.",
  ],
  cta: "Why this matters",
  diagramLabel:
    "How an order is structured: you buy from Nexcierge, and Nexcierge buys from the manufacturer.",
  nodes: {
    you: { title: "You", sub: "The buyer" },
    nex: { title: "Nexcierge", sub: "Your seller and point of contact" },
    factory: { title: "Manufacturer", sub: "Builds your equipment" },
  },
  flows: ["Contract, invoice, payment", "Purchase order"],
} as const;

export const CLOSING = {
  title: "Tell us what you’re looking for.",
  lead: "Whether you know the exact model or are still figuring out the specifications, we’re here to help.",
  secondary: "Learn how Nexcierge works",
} as const;

// ── How it works ─────────────────────────────────────────────

export const HOW = {
  title: "From your first request to the right equipment.",
  lead: "Tell us what you need. We’ll help turn your requirements into a clear sourcing brief, find suitable manufacturers, and guide you through the purchase.",
  processTitle: "Six stages, one team.",
  processLead:
    "Software helps with the questions and the paperwork. People handle the manufacturers, the checks, and the decisions.",
  stages: [
    {
      title: "Tell us what you need",
      text: "Describe the machine you’re looking for in your own language. Our sourcing assistant will ask a few questions to understand your requirements.",
      who: "Sourcing assistant",
    },
    {
      title: "We prepare your sourcing brief",
      text: "Your answers are organized into a clear document covering the machine, specifications, quantity, destination, and timeline.",
      who: "Sourcing assistant",
    },
    {
      title: "Our team finds suppliers",
      text: "A local sourcing manager reviews your requirements, contacts manufacturers, and works with you to identify suitable options.",
      who: "Account manager",
    },
    {
      title: "Verify the manufacturer",
      text: "We help coordinate factory inspections and equipment checks where needed, so you can make a more informed decision.",
      who: "Inspection partner",
    },
    {
      title: "Review your quote",
      text: "Receive a quote from Nexcierge with the equipment details, pricing, and agreed terms in one place.",
      who: "Nexcierge",
    },
    {
      title: "Complete your purchase",
      text: "Purchase directly from Nexcierge. Depending on your order, we can also help coordinate shipping, delivery, and installation.",
      who: "Nexcierge",
    },
  ],
} as const;

// ── Sourcing assistant console (How it works page) ──────────
// Static chrome for the entry point. Nothing here is a scripted reply:
// the first thing the visitor sends goes to the real assistant on /chat.

export type ConsoleLang = "en" | "es" | "fr" | "zh" | "ar";

export const CONSOLE_LANGS: { code: ConsoleLang; label: string; name: string }[] = [
  { code: "en", label: "EN", name: "English" },
  { code: "es", label: "ES", name: "Español" },
  { code: "fr", label: "FR", name: "Français" },
  { code: "zh", label: "中文", name: "中文" },
  { code: "ar", label: "عربي", name: "العربية" },
];

export const AGENT = {
  title: "Start with a simple conversation.",
  lead: "Tell us what equipment you’re looking for. Our sourcing assistant helps gather the details and prepare a brief for our team.",
  agentName: "Sourcing assistant",
  note: "Your conversation is saved, so you can pick it up where you left off.",
  hint: "Sending a message opens your request.",
} as const;

export const CONSOLE_COPY: Record<
  ConsoleLang,
  { greeting: string; placeholder: string; chips: string[] }
> = {
  en: {
    greeting:
      "Hello. I’m the Nexcierge sourcing assistant. Tell me what equipment you need, and I’ll help prepare your sourcing brief.",
    placeholder: "Describe the equipment you need…",
    chips: [
      "I need a 21-tonne excavator",
      "A 4-head liquid filling machine",
      "A benchtop lab centrifuge",
    ],
  },
  es: {
    greeting:
      "Hola. Soy el asistente de compras de Nexcierge. Dígame qué equipo necesita y le ayudaré a preparar su solicitud.",
    placeholder: "Describa el equipo que necesita…",
    chips: [
      "Necesito una excavadora de 21 toneladas",
      "Una llenadora de líquidos de 4 cabezales",
      "Una centrífuga de laboratorio de sobremesa",
    ],
  },
  fr: {
    greeting:
      "Bonjour. Je suis l’assistant d’achat de Nexcierge. Dites-moi de quel équipement vous avez besoin et je vous aide à préparer votre demande.",
    placeholder: "Décrivez l’équipement dont vous avez besoin…",
    chips: [
      "J’ai besoin d’une pelle de 21 tonnes",
      "Une remplisseuse de liquides à 4 têtes",
      "Une centrifugeuse de laboratoire de paillasse",
    ],
  },
  zh: {
    greeting:
      "您好，我是 Nexcierge 采购助手。请告诉我您需要哪种设备，我来帮您整理采购需求。",
    placeholder: "请描述您需要的设备…",
    chips: ["我需要一台 21 吨挖掘机", "一台四头液体灌装机", "一台台式实验室离心机"],
  },
  ar: {
    greeting:
      "مرحباً. أنا مساعد التوريد في Nexcierge. أخبرني ما المعدّات التي تحتاجها وسأساعدك في إعداد طلبك.",
    placeholder: "صف المعدّات التي تحتاجها…",
    chips: [
      "أحتاج حفارة بوزن 21 طناً",
      "آلة تعبئة سوائل بأربعة رؤوس",
      "جهاز طرد مركزي مخبري مكتبي",
    ],
  },
};

// ── Services ─────────────────────────────────────────────────

export const SERVICES = {
  title: "The support you need, from sourcing to delivery.",
  lead: "Every equipment purchase is different. Choose the services you need, and we’ll help coordinate the process.",
  items: [
    {
      id: "sourcing",
      title: "Equipment sourcing",
      text: "We work with manufacturers to find equipment that matches your specifications, budget, and timeline.",
    },
    {
      id: "verification",
      title: "Supplier verification",
      text: "We help coordinate independent inspections and checks so you can better understand the manufacturer and equipment before purchasing.",
    },
    {
      id: "shipping",
      title: "International shipping",
      text: "We can help arrange freight and coordinate delivery to your destination.",
    },
    {
      id: "financing",
      title: "Financing",
      text: "Ask us about financing options that may be available for your order.",
    },
    {
      id: "installation",
      title: "Installation support",
      text: "Where available, we can help coordinate installation and commissioning with qualified local partners.",
    },
  ],
} as const;

// Delivery selector. Incoterms are named as the *typical* term for each
// option and only claim what that term covers; anything beyond it (import
// clearance, unloading, installation) is stated as separate.
export const SCOPE = {
  title: "Choose how your equipment gets to you.",
  lead: "From collection at the export port to delivery at your site, we’ll help you understand the available options.",
  stops: [
    "Factory",
    "Export port",
    "Sea freight",
    "Your port",
    "Your site",
    "Installed",
  ],
  options: [
    {
      upto: 1,
      title: "Machine only",
      term: "Typical term: FOB",
      text: "We deliver the machine on board the vessel at the export port, cleared for export. You arrange freight, insurance, and everything after that.",
    },
    {
      upto: 3,
      title: "Shipped to your port",
      term: "Typical term: CIF",
      text: "We also arrange sea freight and basic cargo insurance to your destination port. Unloading, import clearance, and duties stay with you. Under CIF, risk passes to you once the machine is loaded at origin.",
    },
    {
      upto: 4,
      title: "Delivered to site",
      term: "Typical term: DAP",
      text: "We arrange transport through to your site, ready for unloading. Import clearance and duties stay with you unless your contract says otherwise.",
    },
    {
      upto: 5,
      title: "Installed and running",
      term: "Delivery plus installation, agreed separately",
      text: "Where available, we coordinate installation and commissioning on site with qualified local partners, on top of the delivery term in your contract.",
    },
  ],
  note: "Your quote and contract set out exactly which delivery term applies to your order.",
  financing: "I’m interested in financing",
  financingText:
    "Mention it in your request. Your account manager will explain the financing options that may be available for your order.",
} as const;

// ── Why Nexcierge ────────────────────────────────────────────

export const WHY = {
  title: "A better way to buy equipment across borders.",
  lead: "International equipment purchases can involve multiple suppliers, intermediaries, and service providers. We bring the process together, with one company responsible for your purchase.",
  seller: {
    title: "We’re your seller, not just an introduction.",
    text: [
      "Many sourcing platforms connect buyers with manufacturers and leave them to manage the transaction. Nexcierge operates differently.",
      "We purchase equipment from the supplier and sell it directly to you under an agreed contract.",
    ],
    plain:
      "In trade terms, Nexcierge is the Merchant of Record: the company you buy from. Your contract, invoice, and payment are with us.",
  },
  points: [
    {
      title: "Know who you’re buying from.",
      text: "We help identify suitable manufacturers, review equipment specifications, and coordinate independent inspections where needed.",
      note: "Factory inspections are carried out by independent inspection partners such as QIMA.",
    },
    {
      title: "Clear terms, from the beginning.",
      text: "Your quote and contract set out the equipment, price, payment terms, and agreed delivery responsibilities.",
    },
    {
      title: "Real people behind every order.",
      text: "Our sourcing team works with manufacturers and helps coordinate the details that matter to your purchase.",
    },
  ],
  account: {
    title: "Everything in one place.",
    text: "Keep your conversations, documents, quotes, and payment information together in your Nexcierge account.",
    cta: "Sign in",
    signedInCta: "View your orders",
  },
  faqTitle: "Common questions",
  faq: [
    {
      question: "How do I know the quoted price is final?",
      answer:
        "Your formal quote and contract set out the agreed price, scope, and payment terms. Any changes should be documented and agreed before proceeding.",
    },
    {
      question: "Who is responsible for my order?",
      answer:
        "Nexcierge is your contractual seller. Your purchase agreement identifies the responsibilities and terms that apply to your order.",
    },
    {
      question: "How do you avoid specification mistakes?",
      answer:
        "We organize your requirements into a sourcing brief and review technical details with suppliers before finalizing the order.",
    },
    {
      question: "Can I describe my requirements in my own language?",
      answer:
        "Yes. Our sourcing assistant replies in the language you write in, and your requirements are organized into a brief for our team.",
    },
    {
      question: "Do I deal with the manufacturer directly?",
      answer:
        "Your account manager handles communication with manufacturers on your behalf and keeps you updated in your account. Because you buy from Nexcierge, there is one company to talk to about your order.",
    },
    {
      question: "Can you source custom or modified equipment?",
      answer:
        "Tell us about the changes you need when you start your request. Your account manager will check what suitable manufacturers can offer before you receive a quote.",
    },
  ],
} as const;

// ── Account preview (Why Nexcierge page) ─────────────────────

export type HistoryKind = "chat" | "doc" | "pay";

export const ACCOUNT: {
  panelTitle: string;
  orderLabel: string;
  orderName: string;
  filters: { key: "all" | HistoryKind; label: string; noun: [string, string] }[];
  history: { kind: HistoryKind; label: string; status: string }[];
} = {
  panelTitle: "Order activity",
  orderLabel: "Example order",
  orderName: "4-head liquid filling machine, 100 to 1,000\u00a0ml",
  filters: [
    { key: "all", label: "All activity", noun: ["item", "items"] },
    { key: "chat", label: "Messages", noun: ["conversation", "conversations"] },
    { key: "doc", label: "Documents", noun: ["document", "documents"] },
    { key: "pay", label: "Payments", noun: ["payment", "payments"] },
  ],
  history: [
    { kind: "chat", label: "Sourcing request", status: "Saved" },
    { kind: "doc", label: "Sourcing brief", status: "Ready" },
    { kind: "chat", label: "Messages with your account manager", status: "Saved" },
    { kind: "doc", label: "Supplier quote", status: "Received" },
    { kind: "doc", label: "Inspection report", status: "Received" },
    { kind: "doc", label: "Contract and invoice", status: "Received" },
    { kind: "pay", label: "Payment", status: "Paid" },
    { kind: "doc", label: "Shipping documents", status: "Received" },
  ],
};

// ── Footer ───────────────────────────────────────────────────

export const FOOTER = {
  blurb: "Industrial equipment sourcing, made simpler.",
  email: "nexcierge.ai@gmail.com",
  legal: "QIMA is named as an inspection partner and is a trademark of its owner.",
  columns: [
    {
      title: "Company",
      links: [
        { href: "/how-it-works", label: "How it works" },
        { href: "/why-nexcierge", label: "Why Nexcierge" },
        { href: "/contact", label: "Contact" },
      ],
    },
    {
      title: "Services",
      links: [
        { href: "/services#sourcing", label: "Equipment sourcing" },
        { href: "/services#verification", label: "Supplier verification" },
        { href: "/services#delivery", label: "Shipping and delivery" },
      ],
    },
  ],
} as const;
