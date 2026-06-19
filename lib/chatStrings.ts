// Static i18n for the buyer-facing chat chrome — composer placeholders,
// the keyboard hint, aria-labels, and error-bubble copy. Like cardStrings,
// these are fixed UI strings that never pass through Gemini.
//
// Keyed off the buyer's DISPLAY language, which the frontend learns from the
// backend's per-turn `reply_language` (the pills pass reports the language of
// each agent reply). That means chrome localizes from the first exchange —
// during the interview — unlike the lazily-pinned chat_sessions.language.
// Falls back to English for an unknown code and on turn zero (no reply yet).
// Keep the language set aligned with backend/app/languages.py.

export interface ChatStrings {
  composerReply: string;
  composerHandoff: string;
  composerDefault: string;
  composerHint: string;
  sendAria: string;
  historyAria: string;
  newChatAria: string;
  errDelete: string;
  errBootstrap: string;
  errNoReply: string;
  errTimeout: string;
  errConnection: string;
  errInvalidField: string;
  errTransfer: string;
}

const en: ChatStrings = {
  composerReply: "Reply…",
  composerHandoff: "Message your account manager…",
  composerDefault: "Message Nexcierge…",
  composerHint: "Press Enter to send · Shift + Enter for a new line",
  sendAria: "Send message",
  historyAria: "Open chat history",
  newChatAria: "New conversation",
  errDelete: "Couldn't delete that conversation. Please try again.",
  errBootstrap: "Couldn't start a chat session. Refresh to try again.",
  errNoReply: "The AI didn't return a reply. Please try again.",
  errTimeout: "The AI took too long to respond. Please try again.",
  errConnection:
    "Connection error. Please try again, or check that the backend is running.",
  errInvalidField:
    "One of your details looks invalid. Please correct it in chat and try Request human review again.",
  errTransfer:
    "Couldn't transfer to our account manager just now — please try again.",
};

const es: ChatStrings = {
  composerReply: "Responder…",
  composerHandoff: "Escribe a tu gestor de cuenta…",
  composerDefault: "Escribe a Nexcierge…",
  composerHint: "Pulsa Enter para enviar · Mayús + Enter para una nueva línea",
  sendAria: "Enviar mensaje",
  historyAria: "Abrir historial de chat",
  newChatAria: "Nueva conversación",
  errDelete: "No se pudo eliminar esa conversación. Inténtalo de nuevo.",
  errBootstrap:
    "No se pudo iniciar una sesión de chat. Actualiza para reintentar.",
  errNoReply: "La IA no devolvió una respuesta. Inténtalo de nuevo.",
  errTimeout: "La IA tardó demasiado en responder. Inténtalo de nuevo.",
  errConnection:
    "Error de conexión. Inténtalo de nuevo o comprueba que el backend esté en ejecución.",
  errInvalidField:
    "Uno de tus datos parece no ser válido. Corrígelo en el chat y vuelve a intentar Solicitar revisión humana.",
  errTransfer:
    "No se pudo transferir a tu gestor de cuenta ahora mismo. Inténtalo de nuevo.",
};

const zh: ChatStrings = {
  composerReply: "回复…",
  composerHandoff: "给您的客户经理发消息…",
  composerDefault: "给 Nexcierge 发消息…",
  composerHint: "按 Enter 发送 · Shift + Enter 换行",
  sendAria: "发送消息",
  historyAria: "打开聊天记录",
  newChatAria: "新建对话",
  errDelete: "无法删除该对话，请重试。",
  errBootstrap: "无法启动聊天会话，请刷新重试。",
  errNoReply: "AI 未返回回复，请重试。",
  errTimeout: "AI 响应时间过长，请重试。",
  errConnection: "连接错误。请重试，或检查后端是否正在运行。",
  errInvalidField: "您的某项信息似乎无效。请在聊天中更正后，再次点击“请求人工审核”。",
  errTransfer: "暂时无法转接给您的客户经理，请重试。",
};

const de: ChatStrings = {
  composerReply: "Antworten…",
  composerHandoff: "Schreiben Sie Ihrem Account Manager…",
  composerDefault: "Schreiben Sie Nexcierge…",
  composerHint: "Enter zum Senden · Umschalt + Enter für eine neue Zeile",
  sendAria: "Nachricht senden",
  historyAria: "Chatverlauf öffnen",
  newChatAria: "Neue Unterhaltung",
  errDelete:
    "Diese Unterhaltung konnte nicht gelöscht werden. Bitte versuchen Sie es erneut.",
  errBootstrap:
    "Chat-Sitzung konnte nicht gestartet werden. Zum Wiederholen aktualisieren.",
  errNoReply:
    "Die KI hat keine Antwort zurückgegeben. Bitte versuchen Sie es erneut.",
  errTimeout:
    "Die KI hat zu lange für eine Antwort gebraucht. Bitte versuchen Sie es erneut.",
  errConnection:
    "Verbindungsfehler. Bitte versuchen Sie es erneut oder prüfen Sie, ob das Backend läuft.",
  errInvalidField:
    "Eine Ihrer Angaben scheint ungültig zu sein. Bitte korrigieren Sie sie im Chat und fordern Sie die menschliche Prüfung erneut an.",
  errTransfer:
    "Die Übergabe an Ihren Account Manager ist gerade nicht möglich — bitte versuchen Sie es erneut.",
};

const fr: ChatStrings = {
  composerReply: "Répondre…",
  composerHandoff: "Écrivez à votre gestionnaire de compte…",
  composerDefault: "Écrivez à Nexcierge…",
  composerHint: "Entrée pour envoyer · Maj + Entrée pour un saut de ligne",
  sendAria: "Envoyer le message",
  historyAria: "Ouvrir l'historique des discussions",
  newChatAria: "Nouvelle conversation",
  errDelete: "Impossible de supprimer cette conversation. Veuillez réessayer.",
  errBootstrap:
    "Impossible de démarrer une session de discussion. Actualisez pour réessayer.",
  errNoReply: "L'IA n'a renvoyé aucune réponse. Veuillez réessayer.",
  errTimeout: "L'IA a mis trop de temps à répondre. Veuillez réessayer.",
  errConnection:
    "Erreur de connexion. Veuillez réessayer ou vérifier que le backend est en cours d'exécution.",
  errInvalidField:
    "L'une de vos informations semble invalide. Corrigez-la dans la discussion et redemandez une revue humaine.",
  errTransfer:
    "Impossible de transférer à votre gestionnaire de compte pour le moment — veuillez réessayer.",
};

const ja: ChatStrings = {
  composerReply: "返信…",
  composerHandoff: "アカウントマネージャーにメッセージ…",
  composerDefault: "Nexcierge にメッセージ…",
  composerHint: "Enter で送信 · Shift + Enter で改行",
  sendAria: "メッセージを送信",
  historyAria: "チャット履歴を開く",
  newChatAria: "新しい会話",
  errDelete: "その会話を削除できませんでした。もう一度お試しください。",
  errBootstrap:
    "チャットセッションを開始できませんでした。更新して再試行してください。",
  errNoReply: "AI が応答を返しませんでした。もう一度お試しください。",
  errTimeout: "AI の応答に時間がかかりすぎました。もう一度お試しください。",
  errConnection:
    "接続エラーです。もう一度お試しいただくか、バックエンドが稼働しているか確認してください。",
  errInvalidField:
    "入力内容の一つが無効なようです。チャットで修正して、もう一度「人によるレビューを依頼」をお試しください。",
  errTransfer:
    "現在アカウントマネージャーへ転送できません。もう一度お試しください。",
};

const ko: ChatStrings = {
  composerReply: "답장…",
  composerHandoff: "계정 매니저에게 메시지…",
  composerDefault: "Nexcierge에 메시지…",
  composerHint: "Enter로 전송 · Shift + Enter로 줄바꿈",
  sendAria: "메시지 보내기",
  historyAria: "채팅 기록 열기",
  newChatAria: "새 대화",
  errDelete: "대화를 삭제할 수 없습니다. 다시 시도해 주세요.",
  errBootstrap:
    "채팅 세션을 시작할 수 없습니다. 새로고침 후 다시 시도해 주세요.",
  errNoReply: "AI가 응답을 반환하지 않았습니다. 다시 시도해 주세요.",
  errTimeout: "AI 응답이 너무 오래 걸립니다. 다시 시도해 주세요.",
  errConnection:
    "연결 오류입니다. 다시 시도하거나 백엔드가 실행 중인지 확인해 주세요.",
  errInvalidField:
    "입력하신 정보 중 하나가 올바르지 않은 것 같습니다. 채팅에서 수정한 뒤 '사람 검토 요청'을 다시 시도해 주세요.",
  errTransfer: "지금은 계정 매니저에게 전달할 수 없습니다. 다시 시도해 주세요.",
};

const ar: ChatStrings = {
  composerReply: "رد…",
  composerHandoff: "راسل مدير حسابك…",
  composerDefault: "راسل Nexcierge…",
  composerHint: "اضغط Enter للإرسال · Shift + Enter لسطر جديد",
  sendAria: "إرسال الرسالة",
  historyAria: "فتح سجل المحادثات",
  newChatAria: "محادثة جديدة",
  errDelete: "تعذّر حذف هذه المحادثة. يرجى المحاولة مرة أخرى.",
  errBootstrap: "تعذّر بدء جلسة المحادثة. حدّث الصفحة وأعد المحاولة.",
  errNoReply: "لم يُرجع الذكاء الاصطناعي أي رد. يرجى المحاولة مرة أخرى.",
  errTimeout:
    "استغرق الذكاء الاصطناعي وقتًا طويلاً للرد. يرجى المحاولة مرة أخرى.",
  errConnection:
    "خطأ في الاتصال. يرجى المحاولة مرة أخرى أو التأكد من أن الخادم يعمل.",
  errInvalidField:
    "تبدو إحدى بياناتك غير صالحة. يرجى تصحيحها في المحادثة ثم إعادة طلب المراجعة البشرية.",
  errTransfer:
    "تعذّر التحويل إلى مدير حسابك في الوقت الحالي — يرجى المحاولة مرة أخرى.",
};

const ru: ChatStrings = {
  composerReply: "Ответить…",
  composerHandoff: "Напишите вашему менеджеру…",
  composerDefault: "Напишите Nexcierge…",
  composerHint: "Enter — отправить · Shift + Enter — новая строка",
  sendAria: "Отправить сообщение",
  historyAria: "Открыть историю чатов",
  newChatAria: "Новый разговор",
  errDelete: "Не удалось удалить этот разговор. Попробуйте ещё раз.",
  errBootstrap:
    "Не удалось начать сеанс чата. Обновите страницу и повторите.",
  errNoReply: "ИИ не вернул ответ. Попробуйте ещё раз.",
  errTimeout: "ИИ слишком долго отвечал. Попробуйте ещё раз.",
  errConnection:
    "Ошибка соединения. Попробуйте ещё раз или проверьте, запущен ли бэкенд.",
  errInvalidField:
    "Одно из ваших данных выглядит недействительным. Исправьте его в чате и снова запросите проверку человеком.",
  errTransfer:
    "Сейчас не удалось передать вашему менеджеру — попробуйте ещё раз.",
};

const pt: ChatStrings = {
  composerReply: "Responder…",
  composerHandoff: "Envie uma mensagem ao seu gerente de conta…",
  composerDefault: "Envie uma mensagem ao Nexcierge…",
  composerHint: "Pressione Enter para enviar · Shift + Enter para nova linha",
  sendAria: "Enviar mensagem",
  historyAria: "Abrir histórico de conversas",
  newChatAria: "Nova conversa",
  errDelete: "Não foi possível excluir essa conversa. Tente novamente.",
  errBootstrap:
    "Não foi possível iniciar uma sessão de chat. Atualize para tentar de novo.",
  errNoReply: "A IA não retornou uma resposta. Tente novamente.",
  errTimeout: "A IA demorou muito para responder. Tente novamente.",
  errConnection:
    "Erro de conexão. Tente novamente ou verifique se o backend está em execução.",
  errInvalidField:
    "Um dos seus dados parece inválido. Corrija-o no chat e tente Solicitar revisão humana novamente.",
  errTransfer:
    "Não foi possível transferir para o seu gerente de conta agora — tente novamente.",
};

const hi: ChatStrings = {
  composerReply: "उत्तर दें…",
  composerHandoff: "अपने अकाउंट मैनेजर को संदेश भेजें…",
  composerDefault: "Nexcierge को संदेश भेजें…",
  composerHint: "भेजने के लिए Enter · नई लाइन के लिए Shift + Enter",
  sendAria: "संदेश भेजें",
  historyAria: "चैट इतिहास खोलें",
  newChatAria: "नई बातचीत",
  errDelete: "वह बातचीत हटाई नहीं जा सकी। कृपया फिर से प्रयास करें।",
  errBootstrap:
    "चैट सत्र शुरू नहीं हो सका। पुनः प्रयास के लिए रिफ़्रेश करें।",
  errNoReply: "AI ने कोई उत्तर नहीं दिया। कृपया फिर से प्रयास करें।",
  errTimeout: "AI को उत्तर देने में बहुत समय लगा। कृपया फिर से प्रयास करें।",
  errConnection:
    "कनेक्शन त्रुटि। कृपया फिर से प्रयास करें, या जाँचें कि बैकएंड चल रहा है।",
  errInvalidField:
    "आपका कोई विवरण अमान्य लगता है। कृपया चैट में उसे ठीक करें और फिर से 'मानव समीक्षा का अनुरोध करें' आज़माएँ।",
  errTransfer:
    "अभी आपके अकाउंट मैनेजर को स्थानांतरित नहीं किया जा सका — कृपया फिर से प्रयास करें।",
};

const CHAT_STRINGS: Record<string, ChatStrings> = {
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

// Return the chat chrome copy for a language, falling back to English for any
// unknown / unsupported code (and for the pre-first-reply 'en' default).
export function chatStrings(language: string | undefined): ChatStrings {
  return (language && CHAT_STRINGS[language]) || en;
}
