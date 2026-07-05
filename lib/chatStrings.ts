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
  // Guest signup gate: shown in place of the composer once an anonymous
  // buyer has used up their free-preview messages (see useChat).
  gateButton: string;
  gateHint: string;
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
  gateButton: "Sign in to keep chatting",
  gateHint: "You've reached the free message limit for guests.",
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
  gateButton: "Inicia sesión para seguir chateando",
  gateHint: "Has alcanzado el límite de mensajes gratuitos para invitados.",
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
  gateButton: "登录以继续聊天",
  gateHint: "您已达到访客的免费消息上限。",
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
  gateButton: "Anmelden, um weiter zu chatten",
  gateHint: "Sie haben das kostenlose Nachrichtenlimit für Gäste erreicht.",
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
  gateButton: "Connectez-vous pour continuer à discuter",
  gateHint: "Vous avez atteint la limite de messages gratuits pour les invités.",
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
  gateButton: "サインインしてチャットを続ける",
  gateHint: "ゲスト向けの無料メッセージの上限に達しました。",
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
  gateButton: "로그인하고 계속 채팅하기",
  gateHint: "게스트용 무료 메시지 한도에 도달했습니다.",
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
  gateButton: "سجّل الدخول لمواصلة الدردشة",
  gateHint: "لقد وصلت إلى الحد الأقصى للرسائل المجانية للضيوف.",
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
  gateButton: "Войдите, чтобы продолжить общение",
  gateHint: "Вы достигли лимита бесплатных сообщений для гостей.",
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
  gateButton: "Entre para continuar conversando",
  gateHint: "Você atingiu o limite de mensagens gratuitas para convidados.",
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
  gateButton: "चैट जारी रखने के लिए साइन इन करें",
  gateHint: "आप अतिथियों के लिए निःशुल्क संदेश सीमा तक पहुँच गए हैं।",
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

const gu: ChatStrings = {
  composerReply: "જવાબ આપો…",
  composerHandoff: "તમારા એકાઉન્ટ મેનેજરને સંદેશ મોકલો…",
  composerDefault: "Nexcierge ને સંદેશ મોકલો…",
  composerHint: "મોકલવા માટે Enter · નવી લાઇન માટે Shift + Enter",
  sendAria: "સંદેશ મોકલો",
  historyAria: "ચેટ ઇતિહાસ ખોલો",
  newChatAria: "નવી વાતચીત",
  gateButton: "ચેટ ચાલુ રાખવા સાઇન ઇન કરો",
  gateHint: "તમે મહેમાનો માટેની મફત સંદેશ મર્યાદા સુધી પહોંચી ગયા છો.",
  errDelete: "તે વાતચીત કાઢી શકાઈ નહીં. કૃપા કરીને ફરી પ્રયાસ કરો.",
  errBootstrap: "ચેટ સત્ર શરૂ થઈ શક્યું નહીં. ફરી પ્રયાસ કરવા રિફ્રેશ કરો.",
  errNoReply: "AI એ કોઈ જવાબ આપ્યો નહીં. કૃપા કરીને ફરી પ્રયાસ કરો.",
  errTimeout:
    "AI ને જવાબ આપવામાં ઘણો સમય લાગ્યો. કૃપા કરીને ફરી પ્રયાસ કરો.",
  errConnection:
    "કનેક્શન ભૂલ. કૃપા કરીને ફરી પ્રયાસ કરો, અથવા બેકએન્ડ ચાલી રહ્યું છે કે નહીં તે તપાસો.",
  errInvalidField:
    "તમારી કોઈ વિગત અમાન્ય લાગે છે. કૃપા કરીને ચેટમાં તેને સુધારો અને ફરીથી 'માનવ સમીક્ષાની વિનંતી કરો' અજમાવો.",
  errTransfer:
    "હમણાં તમારા એકાઉન્ટ મેનેજરને ટ્રાન્સફર થઈ શક્યું નહીં — કૃપા કરીને ફરી પ્રયાસ કરો.",
};

const ta: ChatStrings = {
  composerReply: "பதிலளிக்கவும்…",
  composerHandoff: "உங்கள் கணக்கு மேலாளருக்கு செய்தி அனுப்பவும்…",
  composerDefault: "Nexcierge-க்கு செய்தி அனுப்பவும்…",
  composerHint: "அனுப்ப Enter · புதிய வரிக்கு Shift + Enter",
  sendAria: "செய்தி அனுப்பவும்",
  historyAria: "அரட்டை வரலாற்றைத் திறக்கவும்",
  newChatAria: "புதிய உரையாடல்",
  gateButton: "அரட்டையைத் தொடர உள்நுழையவும்",
  gateHint: "விருந்தினர்களுக்கான இலவச செய்தி வரம்பை அடைந்துவிட்டீர்கள்.",
  errDelete: "அந்த உரையாடலை நீக்க முடியவில்லை. மீண்டும் முயற்சிக்கவும்.",
  errBootstrap:
    "அரட்டை அமர்வைத் தொடங்க முடியவில்லை. மீண்டும் முயற்சிக்க ரிஃப்ரெஷ் செய்யவும்.",
  errNoReply: "AI பதில் அளிக்கவில்லை. மீண்டும் முயற்சிக்கவும்.",
  errTimeout: "AI பதிலளிக்க அதிக நேரம் எடுத்தது. மீண்டும் முயற்சிக்கவும்.",
  errConnection:
    "இணைப்புப் பிழை. மீண்டும் முயற்சிக்கவும், அல்லது backend இயங்குகிறதா எனச் சரிபார்க்கவும்.",
  errInvalidField:
    "உங்கள் விவரங்களில் ஒன்று தவறாகத் தெரிகிறது. அரட்டையில் அதைத் திருத்திவிட்டு, 'மனித மதிப்பாய்வு கோரவும்' என்பதை மீண்டும் முயற்சிக்கவும்.",
  errTransfer:
    "இப்போது உங்கள் கணக்கு மேலாளரிடம் மாற்ற முடியவில்லை — மீண்டும் முயற்சிக்கவும்.",
};

const bn: ChatStrings = {
  composerReply: "উত্তর দিন…",
  composerHandoff: "আপনার অ্যাকাউন্ট ম্যানেজারকে বার্তা পাঠান…",
  composerDefault: "Nexcierge-কে বার্তা পাঠান…",
  composerHint: "পাঠাতে Enter · নতুন লাইনের জন্য Shift + Enter",
  sendAria: "বার্তা পাঠান",
  historyAria: "চ্যাট ইতিহাস খুলুন",
  newChatAria: "নতুন কথোপকথন",
  gateButton: "চ্যাট চালিয়ে যেতে সাইন ইন করুন",
  gateHint: "আপনি অতিথিদের জন্য বিনামূল্যের বার্তার সীমায় পৌঁছেছেন।",
  errDelete: "সেই কথোপকথনটি মুছে ফেলা যায়নি। অনুগ্রহ করে আবার চেষ্টা করুন।",
  errBootstrap: "চ্যাট সেশন শুরু করা যায়নি। আবার চেষ্টা করতে রিফ্রেশ করুন।",
  errNoReply: "AI কোনো উত্তর দেয়নি। অনুগ্রহ করে আবার চেষ্টা করুন।",
  errTimeout: "AI উত্তর দিতে অনেক সময় নিয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।",
  errConnection:
    "সংযোগ ত্রুটি। অনুগ্রহ করে আবার চেষ্টা করুন, বা ব্যাকএন্ড চলছে কি না দেখুন।",
  errInvalidField:
    "আপনার একটি তথ্য অবৈধ মনে হচ্ছে। অনুগ্রহ করে চ্যাটে সেটি ঠিক করুন এবং আবার 'মানব পর্যালোচনার অনুরোধ করুন' চেষ্টা করুন।",
  errTransfer:
    "এই মুহূর্তে আপনার অ্যাকাউন্ট ম্যানেজারের কাছে স্থানান্তর করা যায়নি — অনুগ্রহ করে আবার চেষ্টা করুন।",
};

const tr: ChatStrings = {
  composerReply: "Yanıtla…",
  composerHandoff: "Müşteri temsilcinize mesaj yazın…",
  composerDefault: "Nexcierge'e mesaj yazın…",
  composerHint: "Göndermek için Enter · Yeni satır için Shift + Enter",
  sendAria: "Mesaj gönder",
  historyAria: "Sohbet geçmişini aç",
  newChatAria: "Yeni sohbet",
  gateButton: "Sohbete devam etmek için oturum açın",
  gateHint: "Misafirler için ücretsiz mesaj sınırına ulaştınız.",
  errDelete: "Bu sohbet silinemedi. Lütfen tekrar deneyin.",
  errBootstrap: "Sohbet oturumu başlatılamadı. Yenileyip tekrar deneyin.",
  errNoReply: "Yapay zekâ yanıt döndürmedi. Lütfen tekrar deneyin.",
  errTimeout: "Yapay zekâ yanıt vermekte çok gecikti. Lütfen tekrar deneyin.",
  errConnection:
    "Bağlantı hatası. Lütfen tekrar deneyin veya backend'in çalıştığını kontrol edin.",
  errInvalidField:
    "Bilgilerinizden biri geçersiz görünüyor. Lütfen sohbette düzeltin ve 'İnsan incelemesi iste'yi tekrar deneyin.",
  errTransfer:
    "Şu anda müşteri temsilcinize aktarılamadı — lütfen tekrar deneyin.",
};

const id: ChatStrings = {
  composerReply: "Balas…",
  composerHandoff: "Kirim pesan ke manajer akun Anda…",
  composerDefault: "Kirim pesan ke Nexcierge…",
  composerHint: "Tekan Enter untuk mengirim · Shift + Enter untuk baris baru",
  sendAria: "Kirim pesan",
  historyAria: "Buka riwayat obrolan",
  newChatAria: "Percakapan baru",
  gateButton: "Masuk untuk terus mengobrol",
  gateHint: "Anda telah mencapai batas pesan gratis untuk tamu.",
  errDelete: "Tidak dapat menghapus percakapan itu. Silakan coba lagi.",
  errBootstrap:
    "Tidak dapat memulai sesi obrolan. Muat ulang untuk mencoba lagi.",
  errNoReply: "AI tidak memberikan balasan. Silakan coba lagi.",
  errTimeout: "AI terlalu lama merespons. Silakan coba lagi.",
  errConnection:
    "Kesalahan koneksi. Silakan coba lagi, atau periksa apakah backend sedang berjalan.",
  errInvalidField:
    "Salah satu data Anda tampak tidak valid. Perbaiki di obrolan lalu coba lagi Minta tinjauan manusia.",
  errTransfer:
    "Tidak dapat mengalihkan ke manajer akun Anda saat ini — silakan coba lagi.",
};

const vi: ChatStrings = {
  composerReply: "Trả lời…",
  composerHandoff: "Nhắn tin cho quản lý tài khoản của bạn…",
  composerDefault: "Nhắn tin cho Nexcierge…",
  composerHint: "Nhấn Enter để gửi · Shift + Enter để xuống dòng",
  sendAria: "Gửi tin nhắn",
  historyAria: "Mở lịch sử trò chuyện",
  newChatAria: "Cuộc trò chuyện mới",
  gateButton: "Đăng nhập để tiếp tục trò chuyện",
  gateHint: "Bạn đã đạt đến giới hạn tin nhắn miễn phí dành cho khách.",
  errDelete: "Không thể xóa cuộc trò chuyện đó. Vui lòng thử lại.",
  errBootstrap:
    "Không thể bắt đầu phiên trò chuyện. Tải lại trang để thử lại.",
  errNoReply: "AI không trả về phản hồi. Vui lòng thử lại.",
  errTimeout: "AI phản hồi quá lâu. Vui lòng thử lại.",
  errConnection:
    "Lỗi kết nối. Vui lòng thử lại hoặc kiểm tra backend có đang chạy không.",
  errInvalidField:
    "Một thông tin của bạn có vẻ không hợp lệ. Vui lòng sửa trong cuộc trò chuyện rồi thử lại Yêu cầu nhân viên xem xét.",
  errTransfer:
    "Hiện không thể chuyển cho quản lý tài khoản của bạn — vui lòng thử lại.",
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
  gu,
  ta,
  bn,
  tr,
  id,
  vi,
};

// Return the chat chrome copy for a language, falling back to English for any
// unknown / unsupported code (and for the pre-first-reply 'en' default).
export function chatStrings(language: string | undefined): ChatStrings {
  return (language && CHAT_STRINGS[language]) || en;
}
