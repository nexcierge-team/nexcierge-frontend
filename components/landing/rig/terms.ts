// Example machines for the hero drawing (the hero shows one machine,
// the CNC machining centre, with two of its callouts; see HeroRig).
// Order matches the models in engine.ts. Each machine has four
// spec callouts; every spec term is held in the five languages the
// callouts cycle through. Kept free of three.js imports so the shell can
// render the callouts on the server.

export type TermLang = "en" | "zh" | "es" | "fr" | "ar";

export const TERM_LANGS: { code: TermLang; tag: string }[] = [
  { code: "en", tag: "EN" },
  { code: "zh", tag: "中文" },
  { code: "es", tag: "ES" },
  { code: "fr", tag: "FR" },
  { code: "ar", tag: "AR" },
];

export const TERMS = {
  power: { en: "Rated power", zh: "额定功率", es: "Potencia nominal", fr: "Puissance nominale", ar: "القدرة الاسمية" },
  boom: { en: "Boom length", zh: "动臂长度", es: "Longitud de la pluma", fr: "Longueur de flèche", ar: "طول ذراع الرفع" },
  weight: { en: "Operating weight", zh: "整机工作质量", es: "Peso operativo", fr: "Poids en ordre de marche", ar: "الوزن التشغيلي" },
  bucket: { en: "Bucket capacity", zh: "铲斗容量", es: "Capacidad del cucharón", fr: "Capacité du godet", ar: "سعة الجاروف" },
  fillrange: { en: "Filling range", zh: "灌装范围", es: "Rango de llenado", fr: "Plage de remplissage", ar: "نطاق التعبئة" },
  heads: { en: "Filling heads", zh: "灌装头数", es: "Cabezales de llenado", fr: "Têtes de remplissage", ar: "عدد رؤوس التعبئة" },
  output: { en: "Output", zh: "生产能力", es: "Producción", fr: "Cadence", ar: "الطاقة الإنتاجية" },
  accuracy: { en: "Filling accuracy", zh: "灌装精度", es: "Precisión de llenado", fr: "Précision de remplissage", ar: "دقة التعبئة" },
  cap: { en: "Rotor capacity", zh: "转子容量", es: "Capacidad del rotor", fr: "Capacité du rotor", ar: "سعة الدوّار" },
  rcf: { en: "Max. RCF", zh: "最大相对离心力", es: "FCR máxima", fr: "FCR max.", ar: "أقصى قوة طرد مركزي" },
  speed: { en: "Max. speed", zh: "最高转速", es: "Velocidad máxima", fr: "Vitesse max.", ar: "السرعة القصوى" },
  supply: { en: "Power supply", zh: "电源", es: "Alimentación", fr: "Alimentation", ar: "مصدر الطاقة" },
  magazine: { en: "Tool magazine", zh: "刀库容量", es: "Almacén de herramientas", fr: "Magasin d'outils", ar: "مخزن الأدوات" },
  spindle: { en: "Spindle speed", zh: "主轴转速", es: "Velocidad del husillo", fr: "Vitesse de broche", ar: "سرعة عمود الدوران" },
  tablesize: { en: "Table size", zh: "工作台尺寸", es: "Tamaño de la mesa", fr: "Dimensions de la table", ar: "أبعاد طاولة العمل" },
  posacc: { en: "Positioning accuracy", zh: "定位精度", es: "Precisión de posicionamiento", fr: "Précision de positionnement", ar: "دقة تحديد الموضع" },
} satisfies Record<string, Record<TermLang, string>>;

export type TermKey = keyof typeof TERMS;

export interface Machine {
  name: string;
  // Four [term, value] pairs, in callout order: top-left, top-right,
  // bottom-left, bottom-right. The engine's model anchors use the same
  // order.
  specs: [TermKey, string][];
}

export const MACHINES: Machine[] = [
  {
    name: "Excavator",
    specs: [
      ["power", "118 kW"],
      ["boom", "5,700 mm"],
      ["weight", "21,500 kg"],
      ["bucket", "1.0 m³"],
    ],
  },
  {
    name: "Filling machine",
    specs: [
      ["fillrange", "100 to 1,000 ml"],
      ["heads", "4"],
      ["output", "1,800 pcs/h"],
      ["accuracy", "±1 %"],
    ],
  },
  {
    name: "Lab centrifuge",
    specs: [
      ["cap", "24 × 2 ml"],
      ["rcf", "21,380 × g"],
      ["speed", "15,000 rpm"],
      ["supply", "220 to 240 V"],
    ],
  },
  {
    // Typical figures for a 1,000 mm class vertical machining centre.
    name: "CNC machining centre",
    specs: [
      ["magazine", "24 tools"],
      ["spindle", "12,000 rpm"],
      ["tablesize", "1,200 × 600 mm"],
      ["posacc", "±0.005 mm"],
    ],
  },
];
