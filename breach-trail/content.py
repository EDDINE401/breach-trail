# -*- coding: utf-8 -*-
"""Challenge content for the Breach Trail (English + Arabic).

Edit this file to add phishing scenarios or change word pools.
Brand names in the phishing examples are used only to teach people to spot fakes. The fake links are plain text and never clickable.
"""

# ---- Level 1 (Caesar) ----
CAESAR_PREFIXES = ["THE PASSWORD IS", "ACCESS KEY IS", "AGENT CODE IS", "VAULT WORD IS"]
CAESAR_WORDS = ["FIREWALL", "PAYLOAD", "ROUTER", "SOCKET", "BEACON", "TOKEN",
                "SHIELD", "CIPHER", "PACKET", "KERNEL", "BOTNET", "HONEYPOT"]

# ---- Bonus 1 (Vigenere) ----
VIG_KEYS = ["ITC", "RED", "KEY", "SEC", "LOCK"]
VIG_WORDS = ["NETWORK", "PAYLOAD", "SOCKET", "SERVER", "BEACON", "TROJAN", "EXPLOIT", "SESSION"]

# ---- Bonus 2 (decoder chain) ----
DECODER_WORDS = ["ROOTKIT", "BACKDOOR", "PHISHING", "SANDBOX", "MALWARE", "SPOOFING"]

# ---- Level 3 (flag hunt) ----
FLAG_WORDS = ["inspect", "devtools", "headers", "console", "hidden", "source"]

# ---- Level 2 (phishing scenarios) ----
# fake=True means phishing. 'why' is shown after the player passes.
SCENARIOS = [
    {
        "id": "s1", "fake": True, "channel": "sms",
        "sender_name": "BADR Bank", "addr": "BADR", "reply_to": "", "subject": "",
        "link_target": "http://badr-secure-login.co/verify",
        "body": {
            "en": "BADR ALERT: Unusual login detected. Your account will be BLOCKED in 2 hours. Verify now: badr-secure-login.co/verify",
            "ar": "تنبيه BADR: تم رصد تسجيل دخول غير معتاد. سيتم تجميد حسابك خلال ساعتين. تحقّق الآن: badr-secure-login.co/verify",
        },
        "why": {
            "en": ["Fear and a 2-hour deadline.", "The link is not the bank's own domain.", "It asks you to click and \"verify\"."],
            "ar": ["خوف ومهلة ساعتين.", "الرابط ليس نطاق البنك الحقيقي.", "يطلب منك النقر و«التحقق»."],
        },
    },
    {
        "id": "s2", "fake": True, "channel": "dm",
        "sender_name": "ChatSphere Support", "addr": "@chatsphere_support_help", "reply_to": "", "subject": "",
        "link_target": "http://chatsphere-gifts.net/login",
        "body": {
            "en": "Congrats! You won 3 months of Premium for FREE. Log in to claim before midnight: chatsphere-gifts.net",
            "ar": "مبروك! ربحت 3 أشهر Premium مجاناً. سجّل الدخول لتستلمها قبل منتصف الليل: chatsphere-gifts.net",
        },
        "why": {
            "en": ["Too good to be true: a prize you never entered for.", "Look-alike link, not the real site.", "A fake deadline rushes you."],
            "ar": ["أجمل من أن يكون حقيقياً: جائزة لم تشارك فيها.", "رابط مشابه وليس الموقع الحقيقي.", "مهلة مزيّفة لتستعجلك."],
        },
    },
    {
        "id": "s3", "fake": False, "channel": "email",
        "sender_name": "Progres", "addr": "noreply@progres.mesrs.dz", "reply_to": "", "subject": "Timetable updated",
        "link_target": "",
        "body": {
            "en": "Your timetable for next week has changed. Log in to Progres yourself to see the new schedule.",
            "ar": "تغيّر جدول حصصك للأسبوع القادم. سجّل الدخول إلى Progres بنفسك لرؤية الجدول الجديد.",
        },
        "why": {
            "en": ["No pressure and no threat.", "It asks for nothing: you open Progres yourself.", "The sender matches the official Progres domain."],
            "ar": ["لا ضغط ولا تهديد.", "لا يطلب شيئاً: أنت تفتح Progres بنفسك.", "المُرسِل يطابق نطاق Progres الرسمي."],
        },
    },
    {
        "id": "s4", "fake": True, "channel": "sms",
        "sender_name": "DeliverGo", "addr": "DeliverGo", "reply_to": "", "subject": "",
        "link_target": "http://delivergo-parcel.info/pay",
        "body": {
            "en": "Your parcel could not be delivered. Pay a 150 DZD fee to reschedule: delivergo-parcel.info",
            "ar": "تعذّر تسليم طردك. ادفع 150 دج لإعادة الجدولة: delivergo-parcel.info",
        },
        "why": {
            "en": ["You never ordered a parcel.", "A small fee tricks you into typing card details.", "Strange link ending in .info."],
            "ar": ["لم تطلب أي طرد.", "رسوم صغيرة تخدعك لتدخل بيانات بطاقتك.", "رابط غريب ينتهي بـ .info."],
        },
    },
    {
        "id": "s5", "fake": False, "channel": "app",
        "sender_name": "ChatSphere", "addr": "in-app notification", "reply_to": "", "subject": "",
        "link_target": "",
        "body": {
            "en": "New login on your account from a new device in Blida. Was this you? If not, open the app and go to Settings, then Security.",
            "ar": "تسجيل دخول جديد إلى حسابك من جهاز جديد في البليدة. هل كان أنت؟ إن لم يكن، افتح التطبيق وانتقل إلى الإعدادات ثم الأمان.",
        },
        "why": {
            "en": ["No link to click.", "It sends you to the app you already trust.", "It warns you, it does not demand."],
            "ar": ["لا يوجد رابط للنقر.", "يرسلك إلى تطبيق تثق به أصلاً.", "ينبّهك ولا يطالبك بشيء."],
        },
    },
    {
        "id": "s6", "fake": True, "channel": "email",
        "sender_name": "TechCorp Recruiting", "addr": "hr.techcorp.jobs@mailbox.com", "reply_to": "", "subject": "Internship offer, reply today",
        "link_target": "",
        "body": {
            "en": "You are selected! To confirm, send a copy of your ID and pay a 2,000 DZD file fee today.",
            "ar": "تم اختيارك! لتأكيد التربص أرسل نسخة من بطاقة هويتك وادفع 2000 دج رسوم ملف اليوم.",
        },
        "why": {
            "en": ["Real jobs never charge a fee.", "It wants a copy of your ID: identity theft.", "Free email address and \"reply today\" pressure."],
            "ar": ["الوظائف الحقيقية لا تطلب رسوماً.", "يريد نسخة من هويتك: سرقة هوية.", "بريد مجاني وضغط «ردّ اليوم»."],
        },
    },
    {
        "id": "s7", "fake": False, "channel": "email",
        "sender_name": "University Library", "addr": "library@campuslib.edu", "reply_to": "", "subject": "Book due Thursday",
        "link_target": "",
        "body": {
            "en": "Reminder: your borrowed book is due on Thursday. You can renew it in the library app.",
            "ar": "تذكير: موعد إرجاع الكتاب المستعار يوم الخميس. يمكنك تجديده من تطبيق المكتبة.",
        },
        "why": {
            "en": ["A calm reminder, no threat.", "No link: you use the app yourself.", "The sender matches the library's domain."],
            "ar": ["تذكير هادئ دون تهديد.", "لا يوجد رابط: تستعمل التطبيق بنفسك.", "المُرسِل يطابق نطاق المكتبة."],
        },
    },
    {
        "id": "s8", "fake": True, "channel": "email",
        "sender_name": "Progres Support", "addr": "support@progres-update.com", "reply_to": "", "subject": "Account locked: action required",
        "link_target": "http://progres-update.com/login",
        "body": {
            "en": "Your Progres student account will be suspended. Re-enter your password at progres-update.com within 24 hours or your enrolment may be affected.",
            "ar": "سيتم تعليق حسابك الطلابي في Progres. أعد إدخال كلمة السر في progres-update.com خلال 24 ساعة وإلا قد يتأثر تسجيلك.",
        },
        "why": {
            "en": ["It asks for your password.", "Look-alike domain, not the official Progres site.", "A threat with a deadline."],
            "ar": ["يطلب كلمة سرّك.", "نطاق مشابه وليس موقع Progres الرسمي.", "تهديد مع مهلة زمنية."],
        },
    },
    {
        "id": "s9", "fake": False, "channel": "dm",
        "sender_name": "Amine (ITC member)", "addr": "known contact in your ITC group", "reply_to": "", "subject": "",
        "link_target": "",
        "body": {
            "en": "Heads up: tonight's workshop moved to Thursday 18:00, same room. See you there!",
            "ar": "تنبيه: ورشة الليلة انتقلت إلى الخميس 18:00 في نفس القاعة. نراكم هناك!",
        },
        "why": {
            "en": ["It comes from a known person in your real group.", "Nothing to click and nothing to pay.", "Normal, calm information."],
            "ar": ["يأتي من شخص تعرفه في مجموعتك الحقيقية.", "لا شيء للنقر عليه ولا شيء للدفع.", "معلومة عادية وهادئة."],
        },
    },
    {
        "id": "s10", "fake": True, "channel": "email",
        "sender_name": "BADR Bank Support", "addr": "support@badr-help.com", "reply_to": "billing@badr-refunds.net", "subject": "Your BADR transfer receipt",
        "link_target": "http://badr-help.com/dispute",
        "body": {
            "en": "You sent 4,900 DZD to Karim. If this was not you, log in here to cancel now: badr-help.com/dispute",
            "ar": "لقد أرسلت 4900 دج إلى كريم. إن لم تكن أنت، سجّل الدخول هنا للإلغاء فوراً: badr-help.com/dispute",
        },
        "why": {
            "en": ["Panic about money you did not send.", "The Reply-To is a different domain from the sender.", "Look-alike domain, not the bank's own site."],
            "ar": ["ذعر بسبب مبلغ لم ترسله.", "عنوان الرد يختلف عن نطاق المُرسِل.", "نطاق مشابه وليس موقع البنك الرسمي."],
        },
    },
    {
        "id": "s11", "fake": False, "channel": "sms",
        "sender_name": "Ooredoo", "addr": "Ooredoo", "reply_to": "", "subject": "",
        "link_target": "",
        "body": {
            "en": "Your 20 GB data pack was renewed and is valid for 30 days. Check your usage in the MyOoredoo app.",
            "ar": "تم تجديد باقة الإنترنت 20 غيغا وهي صالحة 30 يوماً. تحقق من استهلاكك في تطبيق MyOoredoo.",
        },
        "why": {
            "en": ["It informs you and asks for nothing.", "No link: you use the app yourself.", "Calm tone, no deadline."],
            "ar": ["يخبرك فقط ولا يطلب شيئاً.", "لا يوجد رابط: تستعمل التطبيق بنفسك.", "نبرة هادئة بلا مهلة."],
        },
    },
    {
        "id": "s12", "fake": True, "channel": "dm",
        "sender_name": "Sofiane (your friend)", "addr": "same name, brand-new account", "reply_to": "", "subject": "",
        "link_target": "http://vid-watch.me/clip",
        "body": {
            "en": "bro is this you in this video?? vid-watch.me/clip",
            "ar": "يا صاحبي هذا أنت في الفيديو؟؟ vid-watch.me/clip",
        },
        "why": {
            "en": ["Curiosity bait and a strange link.", "Your friend's account may be hijacked: ask them another way.", "Not how this friend normally writes."],
            "ar": ["طُعم فضول ورابط غريب.", "قد يكون حساب صديقك مخترقاً: اسأله بطريقة أخرى.", "ليس أسلوب صديقك المعتاد."],
        },
    },
    {
        "id": "s13", "fake": True, "channel": "sms",
        "sender_name": "MyOoredoo Bonus", "addr": "+213 5 55 01 02 03", "reply_to": "", "subject": "",
        "link_target": "http://myooredoo-bonus.net/claim",
        "body": {
            "en": "You won 50 GB of free internet! Log in to your MyOoredoo account within 1 hour to claim: myooredoo-bonus.net",
            "ar": "ربحت 50 غيغا إنترنت مجاناً! سجّل الدخول إلى حساب MyOoredoo خلال ساعة لتستلمها: myooredoo-bonus.net",
        },
        "why": {
            "en": ["A prize you never entered for.", "Look-alike domain, not the real MyOoredoo.", "A 1-hour deadline pushes you to log in without thinking."],
            "ar": ["جائزة لم تشارك فيها.", "نطاق مشابه وليس MyOoredoo الحقيقي.", "مهلة ساعة تدفعك لتسجيل الدخول دون تفكير."],
        },
    },
]


# ---- Game 5: Password Smash ----
# rung: 0 = under 1 minute, 1 = days, 2 = years, 3 = centuries or more.
# Rough estimates against a fast offline attack on a weakly stored password.
PASSWORDS = [
    {"id": "w1", "pw": "123456", "rung": 0, "why": {"en": "Top of every leaked-password list.", "ar": "في رأس كل قوائم كلمات السر المسرّبة."}},
    {"id": "w2", "pw": "qwerty", "rung": 0, "why": {"en": "A keyboard walk. Attackers try these first.", "ar": "مسار على لوحة المفاتيح. المهاجمون يجرّبونه أولاً."}},
    {"id": "w3", "pw": "P@ssw0rd", "rung": 0, "why": {"en": "Cracking tools know every common letter swap.", "ar": "أدوات الكسر تعرف كل استبدالات الحروف الشائعة."}},
    {"id": "w4", "pw": "itc2026", "rung": 0, "why": {"en": "Short and predictable: club name plus the year.", "ar": "قصيرة ومتوقعة: اسم النادي مع السنة."}},
    {"id": "w5", "pw": "Sara!1998", "rung": 0, "why": {"en": "A name plus a birth year is easy to guess.", "ar": "اسم مع سنة ميلاد يسهل تخمينه."}},
    {"id": "w6", "pw": "iloveyou", "rung": 0, "why": {"en": "One of the most common passwords in the world.", "ar": "من أكثر كلمات السر شيوعاً في العالم."}},
    {"id": "w7", "pw": "8j#Qv2!z", "rung": 1, "why": {"en": "Random, but only 8 characters long: days of work.", "ar": "عشوائية لكن طولها 8 أحرف فقط: أيام من العمل."}},
    {"id": "w8", "pw": "k9$Lm2xQ", "rung": 1, "why": {"en": "Random, but only 8 characters long: days of work.", "ar": "عشوائية لكن طولها 8 أحرف فقط: أيام من العمل."}},
    {"id": "w9", "pw": "Rt7#qN2$w", "rung": 2, "why": {"en": "Random and 9 long: years, but length would do better.", "ar": "عشوائية وطولها 9: سنوات، لكن الطول الأكبر أفضل."}},
    {"id": "w10", "pw": "Tz8&nW4Hq", "rung": 2, "why": {"en": "Random and 9 long: years, but length would do better.", "ar": "عشوائية وطولها 9: سنوات، لكن الطول الأكبر أفضل."}},
    {"id": "w11", "pw": "pancake-orbit-violin-rocket-tunnel-lemon", "rung": 3, "why": {"en": "Six random words: centuries, and easy to remember.", "ar": "ست كلمات عشوائية: قرون، وسهلة الحفظ."}},
    {"id": "w12", "pw": "Xk4!mP9vTq2L", "rung": 3, "why": {"en": "12 random characters: centuries. Use a manager to remember it.", "ar": "12 حرفاً عشوائياً: قرون. استعمل مدير كلمات السر لحفظها."}},
    {"id": "w13", "pw": "river-tent-lamp-cloud-seven-wolf", "rung": 3, "why": {"en": "Six random words: centuries, and easy to remember.", "ar": "ست كلمات عشوائية: قرون، وسهلة الحفظ."}},
]

# ---- Game 6: Binary Name (5-bit letters, A = 1) ----
BIN_WORDS = ["NET", "BUG", "KEY", "HASH", "BYTE", "CODE", "PORT", "SALT", "NODE", "FLAG", "HACK", "LOCK"]

# ---- Game 7: Hidden Wall ----
HEX_MESSAGES = ["ASK ME ABOUT ITC", "JOIN THE TEAM", "STAY ENCRYPTED", "TRUST NO ONE", "THINK BEFORE YOU CLICK"]

# ---- Game 9: Terminal Escape ----
TERM_WORDS = ["GLASSHOUSE", "MIDNIGHT", "BLACKBOX", "SILVERFOX", "IRONCLAD", "NIGHTOWL"]

# ---- Game 10: Spin the Social Engineer ----
# opts[0] is always the right answer here; the server shuffles them per player.
SOCIAL = [
    {"id": "e1", "title": {"en": "Fake IT support", "ar": "دعم تقني مزيّف"},
     "text": {"en": "A caller says: \"Hi, IT support here. Your account is infected. Read me your password so I can clean it.\"",
              "ar": "متصل يقول: «مرحباً، من الدعم التقني. حسابك مصاب. اقرأ لي كلمة السر لأنظّفه.»"},
     "opts": [{"en": "Hang up and call IT on the number you already know.", "ar": "أغلق الخط واتصل بالدعم على رقم تعرفه مسبقاً."},
              {"en": "Read it out. They are the experts.", "ar": "أقرؤها. هم الخبراء."},
              {"en": "Give only half of the password.", "ar": "أعطيه نصف كلمة السر فقط."}],
     "why": {"en": "Real IT never needs your password. Check through a number you trust.", "ar": "الدعم الحقيقي لا يحتاج كلمة سرّك أبداً. تحقّق عبر رقم تثق به."}},
    {"id": "e2", "title": {"en": "Account closing email", "ar": "بريد إغلاق الحساب"},
     "text": {"en": "An email says your account closes in 1 hour unless you click the link below.",
              "ar": "بريد يقول إن حسابك سيُغلق خلال ساعة إلا إذا نقرت على الرابط أدناه."},
     "opts": [{"en": "Open the website yourself by typing its address.", "ar": "افتح الموقع بنفسك بكتابة عنوانه."},
              {"en": "Click fast before it closes.", "ar": "انقر بسرعة قبل أن يُغلق."},
              {"en": "Forward it to friends to warn them, link included.", "ar": "أعد توجيهه للأصدقاء للتحذير مع الرابط."}],
     "why": {"en": "A deadline is a pressure trick. Go to the site yourself.", "ar": "المهلة حيلة ضغط. اذهب إلى الموقع بنفسك."}},
    {"id": "e3", "title": {"en": "The bank calls", "ar": "البنك يتصل"},
     "text": {"en": "A \"bank agent\" calls and asks you to read the code you just received by SMS.",
              "ar": "«موظف بنك» يتصل ويطلب منك قراءة الرمز الذي وصلك للتو برسالة نصية."},
     "opts": [{"en": "Never share the code. Hang up and call the bank yourself.", "ar": "لا تشارك الرمز أبداً. أغلق واتصل بالبنك بنفسك."},
              {"en": "Read it. They sent it, so it is fine.", "ar": "أقرؤه. هم من أرسله فلا بأس."},
              {"en": "Ask them to call back in an hour.", "ar": "اطلب منهم معاودة الاتصال بعد ساعة."}],
     "why": {"en": "That code opens your account. Anyone asking for it is the attacker.", "ar": "هذا الرمز يفتح حسابك. من يطلبه هو المهاجم."}},
    {"id": "e4", "title": {"en": "Parcel text", "ar": "رسالة الطرد"},
     "text": {"en": "A text says a parcel is held until you pay 150 DZD on a short link.",
              "ar": "رسالة تقول إن طردك محجوز حتى تدفع 150 دج عبر رابط قصير."},
     "opts": [{"en": "Delete it and check the courier's official app.", "ar": "احذفها وتحقق من تطبيق شركة التوصيل الرسمي."},
              {"en": "Pay quickly, it is only 150 DZD.", "ar": "ادفع بسرعة، إنه 150 دج فقط."},
              {"en": "Reply STOP.", "ar": "ردّ بكلمة STOP."}],
     "why": {"en": "Small fees steal card details. Replying also confirms your number is active.", "ar": "الرسوم الصغيرة تسرق بيانات البطاقة. والردّ يؤكد أن رقمك فعّال."}},
    {"id": "e5", "title": {"en": "The helpful stranger", "ar": "الغريب المتعاون"},
     "text": {"en": "Someone carrying boxes asks you to hold the door to a staff-only lab.",
              "ar": "شخص يحمل صناديق يطلب منك إبقاء الباب مفتوحاً لمخبر خاص بالموظفين."},
     "opts": [{"en": "Politely ask them to badge in or call a staff member.", "ar": "اطلب منه بلطف استعمال بطاقته أو استدعاء أحد الموظفين."},
              {"en": "Hold the door. Being kind is the point.", "ar": "أمسك الباب. اللطف هو المهم."},
              {"en": "Hold the door and take a photo of them.", "ar": "أمسك الباب والتقط له صورة."}],
     "why": {"en": "Tailgating works because people are polite. Be polite and still check.", "ar": "التسلل خلف الآخرين ينجح لأن الناس مهذّبون. كن مهذباً وتحقق."}},
    {"id": "e6", "title": {"en": "The lost USB stick", "ar": "فلاشة مفقودة"},
     "text": {"en": "You find a USB stick labelled EXAM RESULTS in the car park.",
              "ar": "وجدت فلاشة مكتوب عليها EXAM RESULTS في موقف السيارات."},
     "opts": [{"en": "Hand it to security or IT without plugging it in.", "ar": "سلّمها للأمن أو الدعم التقني دون توصيلها."},
              {"en": "Plug it in to find the owner.", "ar": "وصّلها لمعرفة صاحبها."},
              {"en": "Plug it into a friend's computer instead.", "ar": "وصّلها بحاسوب صديق بدلاً من ذلك."}],
     "why": {"en": "Baiting uses curiosity. An unknown USB can run code the moment it is plugged in.", "ar": "الإغراء يستغل الفضول. فلاشة مجهولة قد تشغّل برمجية خبيثة فور توصيلها."}},
    {"id": "e7", "title": {"en": "The QR sticker", "ar": "ملصق QR"},
     "text": {"en": "A sticker with a QR code on a parking meter says \"Pay here\".",
              "ar": "ملصق عليه رمز QR على عدّاد المواقف مكتوب عليه «ادفع هنا»."},
     "opts": [{"en": "Pay with the machine or the official app, and report the sticker.", "ar": "ادفع عبر الجهاز أو التطبيق الرسمي وأبلغ عن الملصق."},
              {"en": "Scan it and pay.", "ar": "امسحه وادفع."},
              {"en": "Scan it but do not type any card details.", "ar": "امسحه لكن لا تكتب بيانات البطاقة."}],
     "why": {"en": "Scammers stick fake QR codes over real ones. Even a scan can open a bad page.", "ar": "المحتالون يلصقون رموز QR مزيفة فوق الحقيقية. حتى المسح قد يفتح صفحة سيئة."}},
    {"id": "e8", "title": {"en": "Over your shoulder", "ar": "من فوق كتفك"},
     "text": {"en": "A stranger stands very close while you type your PIN at the ATM.",
              "ar": "غريب يقف قريباً جداً بينما تكتب رمزك السري في الصراف الآلي."},
     "opts": [{"en": "Cover the keypad with your hand and step away if needed.", "ar": "غطِّ لوحة الأرقام بيدك وابتعد عند الحاجة."},
              {"en": "Ignore them and type normally.", "ar": "تجاهله واكتب كالمعتاد."},
              {"en": "Type faster.", "ar": "اكتب أسرع."}],
     "why": {"en": "Shoulder surfing is free and easy. Hide the keypad and trust your instincts.", "ar": "التجسس من فوق الكتف مجاني وسهل. أخفِ لوحة الأرقام وثق بحدسك."}},
    {"id": "e9", "title": {"en": "Two cafe networks", "ar": "شبكتان في المقهى"},
     "text": {"en": "The cafe shows two networks: \"Cafe_WiFi\" and \"Cafe_WiFi_FREE_FAST\" with no password.",
              "ar": "المقهى يعرض شبكتين: \"Cafe_WiFi\" و \"Cafe_WiFi_FREE_FAST\" دون كلمة سر."},
     "opts": [{"en": "Ask the staff for the exact network name.", "ar": "اسأل الموظفين عن اسم الشبكة بالضبط."},
              {"en": "Join the free fast one.", "ar": "اتصل بالمجانية السريعة."},
              {"en": "Either one, they are the same.", "ar": "أيّ واحدة، فهما نفس الشيء."}],
     "why": {"en": "Attackers copy network names to spy on traffic. Confirm the real one.", "ar": "المهاجمون ينسخون أسماء الشبكات للتجسس على البيانات. تأكد من الشبكة الحقيقية."}},
    {"id": "e10", "title": {"en": "Friend locked out", "ar": "صديق مقفل الحساب"},
     "text": {"en": "A friend messages: \"Quick, send me the code you just got by SMS, I'm locked out!\"",
              "ar": "صديق يراسلك: «بسرعة، أرسل لي الرمز الذي وصلك الآن، حسابي مقفل!»"},
     "opts": [{"en": "Do not send it. Call your friend to check.", "ar": "لا ترسله. اتصل بصديقك للتأكد."},
              {"en": "Send it, helping a friend is good.", "ar": "أرسله، مساعدة الصديق أمر جيد."},
              {"en": "Send half of it.", "ar": "أرسل نصفه."}],
     "why": {"en": "The attacker is logging in as YOU and asking a friend for your code. Verify by voice.", "ar": "المهاجم يحاول الدخول إلى حسابك ويطلب رمزك من صديق. تحقق بالصوت."}},
    {"id": "e11", "title": {"en": "The sticky note", "ar": "الورقة اللاصقة"},
     "text": {"en": "A classmate has their password written on a sticky note on the monitor.",
              "ar": "زميل كتب كلمة سره على ورقة لاصقة ملصقة بالشاشة."},
     "opts": [{"en": "Tell them kindly to remove it and try a password manager.", "ar": "انصحه بلطف بإزالتها وتجربة مدير كلمات السر."},
              {"en": "Say nothing.", "ar": "لا تقل شيئاً."},
              {"en": "Take a photo of it.", "ar": "التقط صورة لها."}],
     "why": {"en": "Anyone passing can read it. A manager remembers strong passwords for you.", "ar": "أي عابر يستطيع قراءتها. مدير كلمات السر يحفظ كلمات قوية عنك."}},
    {"id": "e12", "title": {"en": "Free laptop giveaway", "ar": "سحب حاسوب مجاني"},
     "text": {"en": "A page says: follow us and type your account login to win a free laptop.",
              "ar": "صفحة تقول: تابعنا واكتب بيانات دخول حسابك لتربح حاسوباً مجاناً."},
     "opts": [{"en": "Never type your login for a giveaway. Report the page.", "ar": "لا تكتب بيانات دخولك من أجل سحب. أبلغ عن الصفحة."},
              {"en": "Type it, a laptop is worth it.", "ar": "اكتبها، فالحاسوب يستحق."},
              {"en": "Share it with friends first.", "ar": "شاركها مع الأصدقاء أولاً."}],
     "why": {"en": "Real giveaways never need your password. This one wants your account.", "ar": "السحوبات الحقيقية لا تحتاج كلمة سرّك. هذه تريد حسابك."}},
]
