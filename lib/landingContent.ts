// All copy for the marketing landing page (app/(marketing)/page.tsx).
// Server and client sections import from here so wording lives in one
// place. House rule: no em dashes in user-facing strings.
//
// Product claims on this page (Merchant of Record, QIMA as a named
// inspection partner, financing, documents and payment links in the buyer
// account) were confirmed with the business before publishing. Check with
// them again before adding new ones.

export const NAV_LINKS = [
  { href: "/#process", label: "How it works" },
  { href: "/#agent", label: "Try the agent" },
  { href: "/#account", label: "Your account" },
  { href: "/#mor", label: "Merchant of Record" },
  { href: "/#scope", label: "Services" },
] as const;

export const HERO = {
  title: "Buy machinery from anywhere, under one contract.",
  lead: "Tell our AI agent what you need, in your language, whether it is a 21-tonne excavator, a small filling machine or lab equipment. A local account manager sources it, the factory is audited, and Nexcierge sells it to you as Merchant of Record.",
  caption:
    "Each drawing is an example sourcing file. Every term is held in the buyer's language and the supplier's.",
  ledger: [
    { term: "Brief", value: "AI agent, in your language" },
    { term: "Sourcing", value: "Local account manager" },
    { term: "Factory audit", value: "Partners like QIMA" },
    { term: "Contract", value: "Nexcierge as Merchant of Record" },
  ],
} as const;

export const RISKS = {
  title: "Three ways a cross-border equipment deal goes wrong",
  lead: "Buying equipment from another country usually means a chain of intermediaries, a price that moves, and a spec sheet nobody fully read. We took a red pencil to the usual process.",
  chainCaption:
    "The usual chain puts intermediaries between you and the factory. Nexcierge replaces them with one seller.",
  items: [
    {
      risk: "Hook pricing",
      riskText:
        "A low quote wins your order. The real price shows up after the deposit is paid.",
      fix: "The seller quotes the price",
      fixText:
        "Nexcierge quotes as the company that will invoice you. The price we quote is the price we contract.",
      scribble:
        "M12,34 C8,10 186,2 192,26 C198,54 26,60 8,40 C0,28 26,12 72,8",
    },
    {
      risk: "Disintermediation",
      riskText:
        "Someone in the chain gets cut out halfway through the deal, and accountability leaves with them.",
      fix: "One counterparty, start to finish",
      fixText:
        "Your contract, invoice and payment all sit with Nexcierge. There is no chain to fall apart, and one company answers for the order.",
      scribble:
        "M10,30 C10,6 190,6 190,30 C190,56 14,56 8,32 C6,22 30,10 64,8",
    },
    {
      risk: "Lost in translation",
      riskText:
        "Technical specifications pass through several languages and arrive meaning something else.",
      fix: "Specs translated term by term",
      fixText:
        "A multilingual AI agent takes the brief in your language and translates each technical requirement. A local account manager works from the compiled file.",
      scribble:
        "M14,36 C6,12 184,0 192,24 C200,52 30,62 10,42 C2,30 22,14 60,10",
    },
  ],
} as const;

export type StepWho = "ai" | "human" | "partner";
export type StepIcon =
  | "brief"
  | "translate"
  | "person"
  | "audit"
  | "contract"
  | "ship";

export const PROCESS: {
  title: string;
  lead: string;
  scaleFrom: string;
  scaleTo: string;
  steps: {
    title: string;
    text: string;
    who: StepWho;
    whoLabel: string;
    icon: StepIcon;
  }[];
} = {
  title: "From first message to machine on site",
  lead: "Six stages. Software handles the interview and the paperwork, and people handle the factory.",
  scaleFrom: "First message",
  scaleTo: "Machine on site",
  steps: [
    {
      title: "Brief the agent",
      text: "Our AI agent interviews you the way a sourcing engineer would: machine type, capacity, application, destination. You answer in your own language.",
      who: "ai",
      whoLabel: "AI agent",
      icon: "brief",
    },
    {
      title: "Specs translated and compiled",
      text: "The agent translates your requirements into exact technical terms, cross-references them, and compiles one sourcing file.",
      who: "ai",
      whoLabel: "AI agent",
      icon: "translate",
    },
    {
      title: "A person sources the machine",
      text: "A local account manager takes the file, sources the machine and comes back to you with an offer.",
      who: "human",
      whoLabel: "Account manager",
      icon: "person",
    },
    {
      title: "The factory is audited",
      text: "Factory audits run through inspection partners such as QIMA, so you know who is building your machine.",
      who: "partner",
      whoLabel: "Inspection partner",
      icon: "audit",
    },
    {
      title: "One contract, one payment",
      text: "Nexcierge is the Merchant of Record. You contract with us, and the documents and payment links arrive in your account.",
      who: "human",
      whoLabel: "Nexcierge",
      icon: "contract",
    },
    {
      title: "Shipped, financed, installed",
      text: "Add logistics, financing and on-site installation to the same order, so the machine arrives ready to work.",
      who: "human",
      whoLabel: "Nexcierge",
      icon: "ship",
    },
  ],
};

// ── Agent console ──────────────────────────────────────────────
// Static chrome for the landing entry point. Nothing here is a scripted
// reply: the first thing the visitor sends goes to the real agent on /chat.

export type ConsoleLang = "en" | "es" | "fr" | "zh" | "ar";

export const CONSOLE_LANGS: { code: ConsoleLang; label: string }[] = [
  { code: "en", label: "EN" },
  { code: "es", label: "ES" },
  { code: "fr", label: "FR" },
  { code: "zh", label: "中文" },
  { code: "ar", label: "عربي" },
];

export const AGENT = {
  title: "Brief the agent in your own language",
  lead: "Tell the agent which machine you need, in any language. It interviews you like a sourcing engineer and compiles the answers into one sourcing file for your account manager.",
  agentName: "Intake agent",
  fileTitle: "Sourcing file",
  fileStatus: "The agent fills these in as you answer.",
  fileNote:
    "Your conversation is saved, so you can pick it up where you left it.",
  hint: "Your first message opens the live agent.",
} as const;

export const CONSOLE_COPY: Record<
  ConsoleLang,
  { greeting: string; placeholder: string; chips: string[] }
> = {
  en: {
    greeting:
      "Hello. I'm the Nexcierge intake agent. Tell me which machine you need and I'll build your sourcing file.",
    placeholder: "Describe the machine you need…",
    chips: [
      "I need a 21-tonne excavator",
      "A 4-head liquid filling machine",
      "A benchtop lab centrifuge",
    ],
  },
  es: {
    greeting:
      "Hola. Soy el agente de Nexcierge. Dígame qué máquina necesita y prepararé su expediente de compra.",
    placeholder: "Describa la máquina que necesita…",
    chips: [
      "Necesito una excavadora de 21 toneladas",
      "Una llenadora de líquidos de 4 cabezales",
      "Una centrífuga de laboratorio de sobremesa",
    ],
  },
  fr: {
    greeting:
      "Bonjour. Je suis l'agent Nexcierge. Dites-moi de quelle machine vous avez besoin et je prépare votre dossier d'achat.",
    placeholder: "Décrivez la machine dont vous avez besoin…",
    chips: [
      "J'ai besoin d'une pelle de 21 tonnes",
      "Une remplisseuse de liquides à 4 têtes",
      "Une centrifugeuse de laboratoire de paillasse",
    ],
  },
  zh: {
    greeting:
      "您好，我是 Nexcierge 采购助手。请告诉我您需要哪种设备，我来为您整理采购档案。",
    placeholder: "请描述您需要的设备…",
    chips: ["我需要一台 21 吨挖掘机", "一台四头液体灌装机", "一台台式实验室离心机"],
  },
  ar: {
    greeting:
      "مرحباً. أنا وكيل Nexcierge. أخبرني ما المعدّة التي تحتاجها وسأجهّز ملف التوريد الخاص بك.",
    placeholder: "صف المعدّة التي تحتاجها…",
    chips: [
      "أحتاج حفارة بوزن 21 طناً",
      "آلة تعبئة سوائل بأربعة رؤوس",
      "جهاز طرد مركزي مخبري مكتبي",
    ],
  },
};

// ── Account ───────────────────────────────────────────────────

export type HistoryKind = "chat" | "doc" | "pay";

export const ACCOUNT: {
  title: string;
  lead: string;
  facts: { title: string; text: string }[];
  cta: string;
  panelTitle: string;
  orderLabel: string;
  orderName: string;
  filters: { key: "all" | HistoryKind; label: string; noun: [string, string] }[];
  history: { kind: HistoryKind; tag: string; label: string; status: string }[];
} = {
  title: "Log in once. The whole order lives there.",
  lead: "Your account keeps the full history of every order, and you transact in it directly. Documents and payment links arrive in the same place, so nothing is scattered across email threads.",
  facts: [
    {
      title: "History",
      text: "Every brief and conversation is saved. Pick an order up where you left it.",
    },
    {
      title: "Documents",
      text: "All the documents for your order are delivered to your account.",
    },
    {
      title: "Payment links",
      text: "Pay from the link we send to your account. Nexcierge is the only place your payment goes.",
    },
  ],
  cta: "Log in to your account",
  panelTitle: "Order history",
  orderLabel: "Order",
  orderName: "4-head liquid filling machine, 100 to 1,000 ml",
  filters: [
    { key: "all", label: "All", noun: ["item", "items"] },
    { key: "chat", label: "Chats", noun: ["chat", "chats"] },
    { key: "doc", label: "Documents", noun: ["document", "documents"] },
    { key: "pay", label: "Payments", noun: ["payment", "payments"] },
  ],
  history: [
    { kind: "chat", tag: "Chat", label: "Brief with the intake agent", status: "Saved" },
    { kind: "doc", tag: "Document", label: "Sourcing file", status: "Compiled" },
    { kind: "chat", tag: "Chat", label: "Messages with your account manager", status: "Saved" },
    { kind: "doc", tag: "Document", label: "Offer", status: "Received" },
    { kind: "doc", tag: "Document", label: "Factory audit report", status: "Received" },
    { kind: "doc", tag: "Document", label: "Contract and invoice", status: "Received" },
    { kind: "pay", tag: "Payment", label: "Payment link", status: "Paid" },
    { kind: "doc", tag: "Document", label: "Shipping documents", status: "Received" },
  ],
};

// ── Merchant of Record ────────────────────────────────────────

export type MorKey = "you" | "nex" | "factory" | "audit" | "pay" | "services";

export const MOR: {
  title: string;
  lead: string;
  nodes: { key: MorKey; title: string; sub: string }[];
  flows: [string, string];
  chips: { key: MorKey; label: string }[];
  detail: Record<MorKey, string>;
  ones: string[];
} = {
  title: "We are the seller on your contract",
  lead: "Most platforms introduce you to a supplier and step back. Nexcierge operates as Merchant of Record: we buy the machine and sell it to you. One accountable company stands between your money and the factory.",
  nodes: [
    { key: "you", title: "You", sub: "Buyer" },
    { key: "nex", title: "Nexcierge", sub: "Merchant of Record" },
    { key: "factory", title: "Factory", sub: "Audited supplier" },
  ],
  flows: ["Contract, invoice, payment", "Purchase order, payment"],
  chips: [
    { key: "audit", label: "Factory audits" },
    { key: "pay", label: "Secured payment" },
    { key: "services", label: "Logistics, financing, installation" },
  ],
  detail: {
    you: "You sign one contract and pay one invoice, both with Nexcierge. You never wire a deposit to a factory you have not met.",
    nex: "Nexcierge buys the machine from the factory and sells it to you as Merchant of Record. Price, payment and delivery are our responsibility under one contract.",
    factory:
      "The factory builds and supplies the machine under a purchase order from Nexcierge. It is audited on site by an inspection partner.",
    audit:
      "Independent inspection partners such as QIMA audit the factory on the ground, so the supplier behind your machine has been checked in person.",
    pay: "Your payment goes to one place: Nexcierge. You pay from the payment link sent to your account, through a secured payment flow.",
    services:
      "Freight, financing and on-site installation can be added to the same order and stay under the same contract.",
  },
  ones: [
    "contract to sign",
    "invoice to pay",
    "place your payment goes",
    "company accountable",
  ],
};

// ── Delivery scope ────────────────────────────────────────────

export const SCOPE = {
  title: "Choose how far we carry it",
  lead: "Logistics, financing and installation are optional. Add them to the same order and they stay under the same contract.",
  stops: [
    "Factory gate",
    "Export port",
    "Freight",
    "Your port",
    "Your site",
    "Installed",
  ],
  options: [
    {
      upto: 1,
      title: "Machine only",
      term: "Typical term: FOB",
      text: "We source, audit and contract the machine and hand it over at the export port. You arrange the freight from there.",
    },
    {
      upto: 3,
      title: "Shipped to your port",
      term: "Typical term: CIF",
      text: "We also book the freight and insure the cargo as far as your destination port or airport.",
    },
    {
      upto: 4,
      title: "Delivered to site",
      term: "Typical term: DAP",
      text: "We carry the machine through to your site, inland transport included.",
    },
    {
      upto: 5,
      title: "Installed and running",
      term: "Delivered, then installed",
      text: "Our post-sale team installs the machine on site and hands it over ready to work.",
    },
  ],
  financing: "Add financing",
  financingText:
    "Financing is arranged alongside the order, under the same contract as the machine.",
} as const;

export const CLOSING = {
  title: "Tell the agent what you need",
  lead: "Start the brief now, in your own language. An account manager picks it up from there.",
  cta: "Start a brief",
  partner: "Supplier or service partner?",
  partnerLink: "Contact us",
} as const;

export const FOOTER = {
  blurb:
    "AI-powered procurement for industrial machinery and equipment, sold under one contract.",
  email: "nexcierge.ai@gmail.com",
  legal:
    "QIMA is named as an inspection partner and is a trademark of its owner.",
} as const;

// ── FAQ ───────────────────────────────────────────────────────

export const FAQ_SECTIONS: {
  title: string;
  items: { question: string; answer: string }[];
}[] = [
  {
    title: "General Procurement & Sourcing",
    items: [
      {
        question: "How does Nexcierge source machinery?",
        answer:
          "Nexcierge operates as a direct industrial supplier. We utilize an advanced AI-driven configuration engine to capture your technical requirements and then leverage our internal engineering and operational teams to supply, vet, and deliver the equipment directly to your facility.",
      },
      {
        question: "Do I get to speak to the factory directly?",
        answer:
          "To ensure absolute quality control, data privacy, and price security, Nexcierge acts as your exclusive Merchant of Record. We handle all direct communication and negotiation with the manufacturers. This ensures your proprietary IP is protected and you have a single point of accountability for your entire order.",
      },
      {
        question: "Can you source custom or modified machinery?",
        answer:
          "Yes. Our AI-driven configuration process is designed specifically for custom technical requirements. Whether you need specialized mold geometries, PLC integration changes (e.g., Siemens or Allen-Bradley), or specific production capacities, we manage these modifications as part of our direct supply service.",
      },
    ],
  },
  {
    title: "Security, Trust & Data Privacy",
    items: [
      {
        question: "How do you protect my company's proprietary IP?",
        answer:
          "Nexcierge employs \"Strict UID Isolation\" in our backend systems. Your technical specifications and corporate identity are siloed. Manufacturers receive only the necessary engineering blueprints required to fulfill your order, ensuring your competitive advantage and proprietary tweaks remain confidential.",
      },
      {
        question: "Is my payment secure?",
        answer:
          "We eliminate the risks of international wire fraud by acting as your principal partner. You transact directly with Nexcierge through institutional-grade financial gateways (Stripe/Airwallex). Your funds are managed securely, and we assume full liability for the fulfillment of your order.",
      },
      {
        question:
          "What if the machine I receive doesn't meet the specifications?",
        answer:
          "Because Nexcierge is your direct supplier and owner of the invoice, we are legally and contractually responsible for ensuring your machinery meets the approved engineering blueprints. If the machine does not perform to your approved technical specifications, we handle the resolution directly.",
      },
    ],
  },
  {
    title: "Logistics & Installation",
    items: [
      {
        question: "Does Nexcierge handle shipping and export compliance?",
        answer:
          "Yes. As your end-to-end principal, we manage all cross-border logistics, including HS code classification, crating, export documentation, and international freight, delivering your equipment seamlessly to your destination.",
      },
      {
        question: "How is the machine installed at my facility?",
        answer:
          "Installation anxiety is a major challenge in global trade. Nexcierge manages this by coordinating our \"Fly-In\" technical teams. Depending on your location and machine complexity, we organize for qualified technicians to arrive on-site to handle final calibration, setup, and operator training.",
      },
      {
        question: "Do you provide translated technical manuals and interfaces?",
        answer:
          "Absolutely. Providing equipment with manuals or PLC interfaces in a language you cannot read is a non-starter. Our local engineering teams ensure all technical documentation and machine control interfaces are translated and standardized for your team.",
      },
    ],
  },
  {
    title: "Working with Nexcierge",
    items: [
      {
        question: "Why is there a Sourcing Deposit?",
        answer:
          "The Sourcing Deposit is a fully refundable authorization hold. It serves two purposes: it filters for serious enterprise buyers, and it activates our \"Human-in-the-Loop\" coordination team to begin physically vetting the shortlisted facilities and negotiating your final quote.",
      },
      {
        question: "Are you a trading company or a directory?",
        answer:
          "Neither. Nexcierge is a tech-enabled industrial supplier. Unlike directories that simply match you with a factory, we own the fulfillment process, the technical liability, and the shipping logistics. You are buying from a partner who guarantees the result.",
      },
    ],
  },
];
