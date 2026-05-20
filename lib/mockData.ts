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
  "Domestic Chinese market access",
  "Factory audit available",
  "Managed procurement support",
];

export const HOW_IT_WORKS = [
  {
    step: "01",
    title: "Describe your machinery needs",
    description:
      "Tell us what you need in your own words — no jargon required. Our AI understands industrial machinery.",
  },
  {
    step: "02",
    title: "AI refines requirements",
    description:
      "The sourcing agent qualifies specs, capacity, voltage, materials, and customizations.",
  },
  {
    step: "03",
    title: "Human sourcing review",
    description:
      "Our local team in China verifies suppliers, checks credentials, and qualifies pricing.",
  },
  {
    step: "04",
    title: "Receive supplier shortlist",
    description:
      "Curated, vetted matches from manufacturers with audited factories and proven track records.",
  },
  {
    step: "05",
    title: "Execute securely",
    description:
      "Managed procurement, quality assurance, shipping, and installation support from a single partner.",
  },
];

export const COMPARISON_ROWS = [
  {
    label: "Supplier discovery",
    traditional: "Trade shows, broker networks",
    nexcierge: "AI + domestic Chinese market access",
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
    nexcierge: "Days to a qualified shortlist",
  },
  {
    label: "Pricing visibility",
    traditional: "Hidden, broker-marked-up",
    nexcierge: "Domestic Chinese prices, transparent",
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

export const FAQS = [
  {
    question: "How do you verify suppliers?",
    answer:
      "Our local Chinese coordination team conducts on-the-ground verification — business registry checks via Qichacha and Tianyancha, factory visits, and export performance review. High-value matches receive a full audit before any quote is shared.",
  },
  {
    question: "Can you source custom machinery?",
    answer:
      "Yes. Describe customizations — voltage, control system, dimensions, materials — and our team coordinates directly with manufacturers for tailored builds. Most factories on our roster accept OEM and custom orders.",
  },
  {
    question: "Do you handle shipping?",
    answer:
      "We offer managed shipping including export documentation, freight forwarding, and customs clearance. You can opt into the full managed package or coordinate logistics independently after receiving the quote.",
  },
  {
    question: "Is pricing from domestic Chinese suppliers?",
    answer:
      "Yes. We work directly with manufacturers in the Chinese domestic market, bypassing the international markup typically applied to overseas buyers at trade shows and B2B marketplaces.",
  },
  {
    question: "What happens after AI qualification?",
    answer:
      "Once your requirements are clear, our local Chinese team takes over — verifying suppliers, requesting quotes, coordinating samples and audits, and managing the procurement to delivery.",
  },
];

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
