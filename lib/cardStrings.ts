// Static i18n for the buyer-facing ProfileSummaryCard chrome.
//
// These are fixed UI labels — section titles, field labels, enum value
// labels, and footer copy — that never pass through Gemini or /translate
// (only message *content* does). We pre-translate them once into every
// supported language so the card renders in the buyer's language with zero
// runtime cost and no flash-of-English. Keep the language set aligned with
// `backend/app/languages.py` (SUPPORTED_LANGUAGES).
//
// NOT translated here, by design: the technical-spec *keys* shown in the
// "Specs & compliance" section (e.g. "Clamping Force") come from
// Gemini-stored `data_point` names and stay English on every view (buyer
// and AM) — there's an unbounded, per-machine-type set of these, so
// translating them would mean an uncached Gemini call per unique key. The
// card is therefore a deliberate mix: localized chrome + English spec keys
// + buyer-language values (the backend writes technical-spec values and
// additional_notes in the buyer's own conversation language — see backend
// docs/PROMPTS.md → "Output language").

import type { NewOrUsedPreference, PurchaseTimeline } from "@/types/chat";

export interface CardStrings {
  eyebrow: string;
  title: string;
  sectionBuyer: string;
  sectionMachine: string;
  sectionDelivery: string;
  sectionSpecs: string;
  sectionNotes: string;
  labelName: string;
  labelCompany: string;
  labelEmail: string;
  labelPhone: string;
  labelRole: string;
  labelType: string;
  labelApplication: string;
  labelQuantity: string;
  labelNewUsed: string;
  labelCountry: string;
  labelCityPort: string;
  labelTimeline: string;
  labelBudget: string;
  labelCompliance: string;
  timeline: Record<PurchaseTimeline, string>;
  condition: Record<NewOrUsedPreference, string>;
  emptySpecs: string;
  footerNote: string;
  cta: string;
  sending: string;
  transferred: string;
  editHint: string;
}

// ISO 639-1 codes that render right-to-left. Used to set `dir` on the card.
export const RTL_LANGUAGES = new Set(["ar"]);

const en: CardStrings = {
  eyebrow: "Sourcing brief",
  title: "Ready for our account manager",
  sectionBuyer: "Buyer",
  sectionMachine: "Machine",
  sectionDelivery: "Delivery",
  sectionSpecs: "Specs & compliance",
  sectionNotes: "Additional notes",
  labelName: "Name",
  labelCompany: "Company",
  labelEmail: "Email",
  labelPhone: "Phone",
  labelRole: "Role",
  labelType: "Type",
  labelApplication: "Application",
  labelQuantity: "Quantity",
  labelNewUsed: "New / used",
  labelCountry: "Country",
  labelCityPort: "City / port",
  labelTimeline: "Timeline",
  labelBudget: "Budget",
  labelCompliance: "Compliance",
  timeline: {
    urgent_less_than_30_days: "Urgent — under 30 days",
    "1_to_3_months": "1–3 months",
    "3_to_6_months": "3–6 months",
    just_researching: "Just researching",
  },
  condition: {
    new: "New",
    used: "Used",
    refurbished: "Refurbished",
    no_preference: "No preference",
  },
  emptySpecs: "No technical specs captured yet",
  footerNote: "Our account manager will get back to you within 24 hours.",
  cta: "Request human review",
  sending: "Sending…",
  transferred: "Transferred",
  editHint: "Need to change something? Just tell the agent.",
};

const es: CardStrings = {
  eyebrow: "Resumen de compra",
  title: "Listo para nuestro gestor de cuenta",
  sectionBuyer: "Comprador",
  sectionMachine: "Máquina",
  sectionDelivery: "Entrega",
  sectionSpecs: "Especificaciones y cumplimiento",
  sectionNotes: "Notas adicionales",
  labelName: "Nombre",
  labelCompany: "Empresa",
  labelEmail: "Correo",
  labelPhone: "Teléfono",
  labelRole: "Cargo",
  labelType: "Tipo",
  labelApplication: "Aplicación",
  labelQuantity: "Cantidad",
  labelNewUsed: "Nueva / usada",
  labelCountry: "País",
  labelCityPort: "Ciudad / puerto",
  labelTimeline: "Plazo",
  labelBudget: "Presupuesto",
  labelCompliance: "Cumplimiento",
  timeline: {
    urgent_less_than_30_days: "Urgente — menos de 30 días",
    "1_to_3_months": "1–3 meses",
    "3_to_6_months": "3–6 meses",
    just_researching: "Solo investigando",
  },
  condition: {
    new: "Nueva",
    used: "Usada",
    refurbished: "Reacondicionada",
    no_preference: "Sin preferencia",
  },
  emptySpecs: "Aún no se capturaron especificaciones técnicas",
  footerNote: "Nuestro gestor de cuenta le responderá en un plazo de 24 horas.",
  cta: "Solicitar revisión humana",
  sending: "Enviando…",
  transferred: "Transferido",
  editHint: "¿Necesita cambiar algo? Solo dígaselo al agente.",
};

const zh: CardStrings = {
  eyebrow: "采购简报",
  title: "已准备好交给我们的客户经理",
  sectionBuyer: "买家",
  sectionMachine: "机器",
  sectionDelivery: "交付",
  sectionSpecs: "规格与合规",
  sectionNotes: "补充说明",
  labelName: "姓名",
  labelCompany: "公司",
  labelEmail: "邮箱",
  labelPhone: "电话",
  labelRole: "职位",
  labelType: "类型",
  labelApplication: "用途",
  labelQuantity: "数量",
  labelNewUsed: "全新 / 二手",
  labelCountry: "国家",
  labelCityPort: "城市 / 港口",
  labelTimeline: "时间安排",
  labelBudget: "预算",
  labelCompliance: "合规要求",
  timeline: {
    urgent_less_than_30_days: "紧急 — 30 天内",
    "1_to_3_months": "1–3 个月",
    "3_to_6_months": "3–6 个月",
    just_researching: "仅在了解",
  },
  condition: {
    new: "全新",
    used: "二手",
    refurbished: "翻新",
    no_preference: "无偏好",
  },
  emptySpecs: "尚未收集技术规格",
  footerNote: "我们的客户经理将在 24 小时内与您联系。",
  cta: "请求人工审核",
  sending: "发送中…",
  transferred: "已转交",
  editHint: "需要修改？直接告诉智能助手即可。",
};

const de: CardStrings = {
  eyebrow: "Beschaffungsbrief",
  title: "Bereit für unseren Account Manager",
  sectionBuyer: "Käufer",
  sectionMachine: "Maschine",
  sectionDelivery: "Lieferung",
  sectionSpecs: "Spezifikationen & Compliance",
  sectionNotes: "Zusätzliche Hinweise",
  labelName: "Name",
  labelCompany: "Unternehmen",
  labelEmail: "E-Mail",
  labelPhone: "Telefon",
  labelRole: "Funktion",
  labelType: "Typ",
  labelApplication: "Anwendung",
  labelQuantity: "Menge",
  labelNewUsed: "Neu / gebraucht",
  labelCountry: "Land",
  labelCityPort: "Stadt / Hafen",
  labelTimeline: "Zeitrahmen",
  labelBudget: "Budget",
  labelCompliance: "Compliance",
  timeline: {
    urgent_less_than_30_days: "Dringend — unter 30 Tagen",
    "1_to_3_months": "1–3 Monate",
    "3_to_6_months": "3–6 Monate",
    just_researching: "Nur Recherche",
  },
  condition: {
    new: "Neu",
    used: "Gebraucht",
    refurbished: "Generalüberholt",
    no_preference: "Keine Präferenz",
  },
  emptySpecs: "Noch keine technischen Spezifikationen erfasst",
  footerNote: "Unser Account Manager meldet sich innerhalb von 24 Stunden bei Ihnen.",
  cta: "Menschliche Prüfung anfordern",
  sending: "Wird gesendet…",
  transferred: "Übergeben",
  editHint: "Möchten Sie etwas ändern? Sagen Sie es einfach dem Agenten.",
};

const fr: CardStrings = {
  eyebrow: "Brief d'approvisionnement",
  title: "Prêt pour notre gestionnaire de compte",
  sectionBuyer: "Acheteur",
  sectionMachine: "Machine",
  sectionDelivery: "Livraison",
  sectionSpecs: "Spécifications et conformité",
  sectionNotes: "Notes complémentaires",
  labelName: "Nom",
  labelCompany: "Entreprise",
  labelEmail: "E-mail",
  labelPhone: "Téléphone",
  labelRole: "Fonction",
  labelType: "Type",
  labelApplication: "Application",
  labelQuantity: "Quantité",
  labelNewUsed: "Neuve / occasion",
  labelCountry: "Pays",
  labelCityPort: "Ville / port",
  labelTimeline: "Délai",
  labelBudget: "Budget",
  labelCompliance: "Conformité",
  timeline: {
    urgent_less_than_30_days: "Urgent — moins de 30 jours",
    "1_to_3_months": "1–3 mois",
    "3_to_6_months": "3–6 mois",
    just_researching: "Simple renseignement",
  },
  condition: {
    new: "Neuve",
    used: "Occasion",
    refurbished: "Reconditionnée",
    no_preference: "Sans préférence",
  },
  emptySpecs: "Aucune spécification technique enregistrée pour l'instant",
  footerNote: "Notre gestionnaire de compte vous répondra sous 24 heures.",
  cta: "Demander une revue humaine",
  sending: "Envoi…",
  transferred: "Transféré",
  editHint: "Besoin de modifier quelque chose ? Dites-le simplement à l'agent.",
};

const ja: CardStrings = {
  eyebrow: "調達ブリーフ",
  title: "担当アカウントマネージャーへの引き継ぎ準備完了",
  sectionBuyer: "購入者",
  sectionMachine: "機械",
  sectionDelivery: "配送",
  sectionSpecs: "仕様とコンプライアンス",
  sectionNotes: "追加メモ",
  labelName: "氏名",
  labelCompany: "会社",
  labelEmail: "メール",
  labelPhone: "電話",
  labelRole: "役職",
  labelType: "種類",
  labelApplication: "用途",
  labelQuantity: "数量",
  labelNewUsed: "新品 / 中古",
  labelCountry: "国",
  labelCityPort: "都市 / 港",
  labelTimeline: "希望時期",
  labelBudget: "予算",
  labelCompliance: "コンプライアンス",
  timeline: {
    urgent_less_than_30_days: "緊急 — 30日以内",
    "1_to_3_months": "1〜3か月",
    "3_to_6_months": "3〜6か月",
    just_researching: "情報収集のみ",
  },
  condition: {
    new: "新品",
    used: "中古",
    refurbished: "再生品",
    no_preference: "希望なし",
  },
  emptySpecs: "技術仕様はまだ取得されていません",
  footerNote: "担当アカウントマネージャーが24時間以内にご連絡します。",
  cta: "人によるレビューを依頼",
  sending: "送信中…",
  transferred: "引き継ぎ済み",
  editHint: "変更が必要ですか？エージェントにお知らせください。",
};

const ko: CardStrings = {
  eyebrow: "소싱 브리프",
  title: "담당 계정 매니저에게 전달 준비 완료",
  sectionBuyer: "구매자",
  sectionMachine: "기계",
  sectionDelivery: "배송",
  sectionSpecs: "사양 및 규정 준수",
  sectionNotes: "추가 메모",
  labelName: "이름",
  labelCompany: "회사",
  labelEmail: "이메일",
  labelPhone: "전화",
  labelRole: "직책",
  labelType: "유형",
  labelApplication: "용도",
  labelQuantity: "수량",
  labelNewUsed: "신품 / 중고",
  labelCountry: "국가",
  labelCityPort: "도시 / 항구",
  labelTimeline: "일정",
  labelBudget: "예산",
  labelCompliance: "규정 준수",
  timeline: {
    urgent_less_than_30_days: "긴급 — 30일 이내",
    "1_to_3_months": "1~3개월",
    "3_to_6_months": "3~6개월",
    just_researching: "정보 수집 중",
  },
  condition: {
    new: "신품",
    used: "중고",
    refurbished: "재생품",
    no_preference: "선호 없음",
  },
  emptySpecs: "아직 기술 사양이 수집되지 않았습니다",
  footerNote: "담당 계정 매니저가 24시간 이내에 연락드립니다.",
  cta: "사람 검토 요청",
  sending: "전송 중…",
  transferred: "전달됨",
  editHint: "변경이 필요하신가요? 에이전트에게 알려주세요.",
};

const ar: CardStrings = {
  eyebrow: "موجز التوريد",
  title: "جاهز لمدير الحساب لدينا",
  sectionBuyer: "المشتري",
  sectionMachine: "الآلة",
  sectionDelivery: "التسليم",
  sectionSpecs: "المواصفات والامتثال",
  sectionNotes: "ملاحظات إضافية",
  labelName: "الاسم",
  labelCompany: "الشركة",
  labelEmail: "البريد الإلكتروني",
  labelPhone: "الهاتف",
  labelRole: "المنصب",
  labelType: "النوع",
  labelApplication: "الاستخدام",
  labelQuantity: "الكمية",
  labelNewUsed: "جديدة / مستعملة",
  labelCountry: "الدولة",
  labelCityPort: "المدينة / الميناء",
  labelTimeline: "الإطار الزمني",
  labelBudget: "الميزانية",
  labelCompliance: "الامتثال",
  timeline: {
    urgent_less_than_30_days: "عاجل — أقل من 30 يومًا",
    "1_to_3_months": "1–3 أشهر",
    "3_to_6_months": "3–6 أشهر",
    just_researching: "مجرد استطلاع",
  },
  condition: {
    new: "جديدة",
    used: "مستعملة",
    refurbished: "مُجددة",
    no_preference: "لا تفضيل",
  },
  emptySpecs: "لم يتم تسجيل أي مواصفات فنية بعد",
  footerNote: "سيتواصل معك مدير الحساب لدينا خلال 24 ساعة.",
  cta: "طلب مراجعة بشرية",
  sending: "جارٍ الإرسال…",
  transferred: "تم التحويل",
  editHint: "هل تريد تغيير شيء؟ فقط أخبر الوكيل.",
};

const ru: CardStrings = {
  eyebrow: "Бриф по закупке",
  title: "Готово для нашего менеджера",
  sectionBuyer: "Покупатель",
  sectionMachine: "Оборудование",
  sectionDelivery: "Доставка",
  sectionSpecs: "Характеристики и соответствие",
  sectionNotes: "Дополнительные примечания",
  labelName: "Имя",
  labelCompany: "Компания",
  labelEmail: "Эл. почта",
  labelPhone: "Телефон",
  labelRole: "Должность",
  labelType: "Тип",
  labelApplication: "Применение",
  labelQuantity: "Количество",
  labelNewUsed: "Новое / б/у",
  labelCountry: "Страна",
  labelCityPort: "Город / порт",
  labelTimeline: "Сроки",
  labelBudget: "Бюджет",
  labelCompliance: "Соответствие",
  timeline: {
    urgent_less_than_30_days: "Срочно — менее 30 дней",
    "1_to_3_months": "1–3 месяца",
    "3_to_6_months": "3–6 месяцев",
    just_researching: "Просто изучаю",
  },
  condition: {
    new: "Новое",
    used: "Б/у",
    refurbished: "Восстановленное",
    no_preference: "Без предпочтений",
  },
  emptySpecs: "Технические характеристики пока не собраны",
  footerNote: "Наш менеджер свяжется с вами в течение 24 часов.",
  cta: "Запросить проверку человеком",
  sending: "Отправка…",
  transferred: "Передано",
  editHint: "Нужно что-то изменить? Просто скажите агенту.",
};

const pt: CardStrings = {
  eyebrow: "Resumo de compra",
  title: "Pronto para o nosso gerente de conta",
  sectionBuyer: "Comprador",
  sectionMachine: "Máquina",
  sectionDelivery: "Entrega",
  sectionSpecs: "Especificações e conformidade",
  sectionNotes: "Notas adicionais",
  labelName: "Nome",
  labelCompany: "Empresa",
  labelEmail: "E-mail",
  labelPhone: "Telefone",
  labelRole: "Cargo",
  labelType: "Tipo",
  labelApplication: "Aplicação",
  labelQuantity: "Quantidade",
  labelNewUsed: "Nova / usada",
  labelCountry: "País",
  labelCityPort: "Cidade / porto",
  labelTimeline: "Prazo",
  labelBudget: "Orçamento",
  labelCompliance: "Conformidade",
  timeline: {
    urgent_less_than_30_days: "Urgente — menos de 30 dias",
    "1_to_3_months": "1–3 meses",
    "3_to_6_months": "3–6 meses",
    just_researching: "Apenas pesquisando",
  },
  condition: {
    new: "Nova",
    used: "Usada",
    refurbished: "Recondicionada",
    no_preference: "Sem preferência",
  },
  emptySpecs: "Nenhuma especificação técnica capturada ainda",
  footerNote: "Nosso gerente de conta entrará em contato dentro de 24 horas.",
  cta: "Solicitar revisão humana",
  sending: "Enviando…",
  transferred: "Transferido",
  editHint: "Precisa mudar algo? É só dizer ao agente.",
};

const hi: CardStrings = {
  eyebrow: "सोर्सिंग ब्रीफ़",
  title: "हमारे अकाउंट मैनेजर के लिए तैयार",
  sectionBuyer: "ख़रीदार",
  sectionMachine: "मशीन",
  sectionDelivery: "डिलीवरी",
  sectionSpecs: "विनिर्देश और अनुपालन",
  sectionNotes: "अतिरिक्त नोट्स",
  labelName: "नाम",
  labelCompany: "कंपनी",
  labelEmail: "ईमेल",
  labelPhone: "फ़ोन",
  labelRole: "भूमिका",
  labelType: "प्रकार",
  labelApplication: "उपयोग",
  labelQuantity: "मात्रा",
  labelNewUsed: "नई / पुरानी",
  labelCountry: "देश",
  labelCityPort: "शहर / बंदरगाह",
  labelTimeline: "समय-सीमा",
  labelBudget: "बजट",
  labelCompliance: "अनुपालन",
  timeline: {
    urgent_less_than_30_days: "अत्यावश्यक — 30 दिन से कम",
    "1_to_3_months": "1–3 महीने",
    "3_to_6_months": "3–6 महीने",
    just_researching: "बस जानकारी ले रहे हैं",
  },
  condition: {
    new: "नई",
    used: "पुरानी",
    refurbished: "रीफर्बिश्ड",
    no_preference: "कोई प्राथमिकता नहीं",
  },
  emptySpecs: "अभी तक कोई तकनीकी विनिर्देश दर्ज नहीं हुआ",
  footerNote: "हमारे अकाउंट मैनेजर 24 घंटे के भीतर आपसे संपर्क करेंगे।",
  cta: "मानव समीक्षा का अनुरोध करें",
  sending: "भेजा जा रहा है…",
  transferred: "स्थानांतरित",
  editHint: "कुछ बदलना है? बस एजेंट को बताएं।",
};

const CARD_STRINGS: Record<string, CardStrings> = {
  en,
  es,
  zh,
  de,
  fr,
  ja,
  ko,
  ar,
  ru,
  pt,
  hi,
};

// Return the card copy for a language, falling back to English for any
// unknown / unsupported code (same default the rest of the stack uses).
export function cardStrings(language: string | undefined): CardStrings {
  return (language && CARD_STRINGS[language]) || en;
}
