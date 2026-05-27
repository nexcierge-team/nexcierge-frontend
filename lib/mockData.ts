import type { SourcingRequest } from "@/types/dashboard";
import type { ChatSession } from "@/types/chat";

export const SUGGESTED_PROMPTS = [
  "Injection molding machine for plastic parts",
  "PET bottle blowing machine",
  "Rubber molding press",
  "Pulp moulding machinery for paper tableware",
];

export const QUICK_CATEGORIES = [
  "Packaging machinery",
  "CNC machines",
  "Plastic machinery",
  "Food processing",
  "Custom machinery",
];

export const TRUST_BADGES = [
  "Human-verified sourcing",
  "Domestic Market Access",
  "End to End Security",
  "Managed procurement support",
];

export const HOW_IT_WORKS = [
  {
    step: "01",
    title: "AI-Powered Intake",
    description:
      "Tell us what you need in your own words — no forms or logins required. Our multilingual AI instantly captures your exact technical specifications, from voltages to custom mold geometries.",
  },
  {
    step: "02",
    title: "Secure Engineering Blueprint",
    description:
      "The system instantly translates your requirements into a standardized engineering blueprint. Your corporate identity and custom modifications are locked in our secure database, guaranteeing absolute protection for your proprietary IP.",
  },
  {
    step: "03",
    title: "In-House Technical Validation",
    description:
      "Our engineering team takes over. We manually review your AI-generated blueprint to validate all technical feasibility, verify PLC interface requirements, and finalize your direct pricing.",
  },
  {
    step: "04",
    title: "The Direct Supplier Guarantee",
    description:
      "You receive a single, comprehensive technical quote directly from Nexcierge. Because we are your direct supplier, there is no middleman and no shifting blame. We own 100% of the liability and guarantee the machinery will perform exactly to your approved specifications.",
  },
  {
    step: "05",
    title: "Fulfillment & Installation",
    description:
      "Transact securely with zero international wire fraud risk. We manage the entire production cycle, cross-border freight, export compliance, and coordinate our 'Fly-In' technicians to execute your final on-site installation.",
  },
];

export const COMPARISON_ROWS = [
  {
    label: "Supplier discovery",
    traditional: "Trade shows, broker networks",
    nexcierge: "AI + Domestic Market Access",
  },
  {
    label: "Language barriers",
    traditional: "Manual translation, missed nuance",
    nexcierge: "Multilingual sourcing built in",
  },
  {
    label: "Trust verification",
    traditional: "Word of mouth, references",
    nexcierge: "Factory audits + registry checks",
  },
  {
    label: "Speed to shortlist",
    traditional: "Weeks to months",
    nexcierge: "Days to a qualified quotation",
  },
  {
    label: "Data Privacy & IP",
    traditional:
      "Custom machinery requirements are blasted across the open internet, exposing your corporate strategy and proprietary engineering tweaks to competitors.",
    nexcierge:
      "Strict UID Isolation. Your corporate identity remains completely hidden. AI translates your needs into a siloed blueprint, protecting your proprietary IP.",
  },
];

export const MACHINERY_CATEGORIES = [
  {
    title: "Packaging Machinery",
    description:
      "PET bottle blowers, form-fill-seal, carton sealing, labelling, wrapping.",
    examples: "PET · VFFS · Cartoners · Labelers",
  },
  {
    title: "CNC / Metalworking",
    description:
      "Lathes, mills, press brakes, fiber laser cutters, machining centers.",
    examples: "Lathes · Mills · Brakes · Lasers",
  },
  {
    title: "Plastic Machinery",
    description:
      "Injection molding, extrusion, blow molding, granulators, mold tooling.",
    examples: "Injection · Extrusion · Blow",
  },
  {
    title: "Food Processing",
    description:
      "Mixers, grinders, ovens, retorts, dryers, hygienic conveyors.",
    examples: "Mixers · Ovens · Conveyors",
  },
  {
    title: "Textile Machinery",
    description:
      "Embroidery, weaving, dyeing, printing, cutting, garment production.",
    examples: "Embroidery · Dyeing · Cutting",
  },
  {
    title: "Industrial Automation",
    description:
      "PLCs, robotic arms, vision systems, conveyors, assembly cells.",
    examples: "PLCs · Robotics · Vision",
  },
];

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
          "To ensure absolute quality control, data privacy, and price security, Nexcierge acts as your exclusive Vendor of Record. We handle all direct communication and negotiation with the manufacturers. This ensures your proprietary IP is protected and you have a single point of accountability for your entire order.",
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

// Kept for any legacy imports — flat fallback derived from FAQ_SECTIONS.
export const FAQS = FAQ_SECTIONS.flatMap((s) => s.items);

export const MOCK_CHAT_SESSIONS: ChatSession[] = [
  {
    id: "s1",
    title: "PET bottle blowing — 1500 bph",
    updatedAt: "Today",
    preview: "Automatic with 2-cavity rotary, semi-automatic with...",
  },
  {
    id: "s2",
    title: "CNC lathe — stainless, 400mm",
    updatedAt: "Yesterday",
    preview: "GSK 980TDi vs Siemens 808D control comparison...",
  },
  {
    id: "s3",
    title: "Injection molding — 200T",
    updatedAt: "2 days ago",
    preview: "Shot weight 320g, screw diameter 42mm...",
  },
  {
    id: "s4",
    title: "12-head embroidery machine",
    updatedAt: "Last week",
    preview: "9 needles per head, 1000 spm, garment production...",
  },
];

export const MOCK_REQUESTS: SourcingRequest[] = [
  {
    id: "REQ-0042",
    title: "PET Bottle Blowing Machine",
    category: "Packaging Machinery",
    status: "Supplier Matching",
    updatedAt: "12 min ago",
    matchedSuppliers: 4,
    quoteCount: 0,
  },
  {
    id: "REQ-0041",
    title: "Injection Molding Line — 200T",
    category: "Plastic Machinery",
    status: "Quote Ready",
    updatedAt: "2 hours ago",
    matchedSuppliers: 3,
    quoteCount: 3,
  },
  {
    id: "REQ-0040",
    title: "CNC Lathe — Stainless, 400mm swing",
    category: "CNC / Metalworking",
    status: "Awaiting Specifications",
    updatedAt: "Yesterday",
    matchedSuppliers: 0,
    quoteCount: 0,
  },
  {
    id: "REQ-0039",
    title: "Industrial Embroidery — 12 head",
    category: "Textile Machinery",
    status: "Negotiating",
    updatedAt: "2 days ago",
    matchedSuppliers: 2,
    quoteCount: 2,
  },
];
