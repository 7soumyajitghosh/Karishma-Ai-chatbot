package com.karishma.ai.data.repository

import java.util.regex.Pattern

/**
 * Banglish Voice Normalization Engine (Android Native)
 *
 * Automatically detects Banglish (Bengali written with Latin/English characters),
 * converts Banglish words to authentic Bengali script for native TTS pronunciation,
 * while strictly preserving genuine English vocabulary, technical terms, and brand names
 * in English pronunciation.
 */
object BanglishVoiceNormalizer {

    private val ENGLISH_PRESERVED_WORDS = setOf(
        // Tech, AI & Systems
        "ai", "api", "app", "application", "audio", "backup", "battery", "bluetooth", "bot",
        "browser", "bug", "camera", "channel", "charger", "chat", "chatbot", "chrome", "claude",
        "client", "cloud", "code", "coder", "coding", "computer", "connection", "cookie", "cpu",
        "data", "database", "debug", "developer", "device", "discord", "disk", "display", "download",
        "drive", "email", "engine", "error", "facebook", "feature", "file", "firebase", "folder",
        "framework", "frontend", "gallery", "gemini", "git", "github", "google", "gpu", "hardware",
        "headphone", "history", "image", "inbox", "input", "instagram", "install", "internet",
        "ipad", "iphone", "javascript", "keyboard", "key", "keys", "laptop", "link", "linkedin",
        "linux", "log", "login", "logout", "mac", "macbook", "mail", "memory", "menu", "message",
        "meta", "mic", "microphone", "microsoft", "mobile", "model", "monitor", "mouse", "network",
        "node", "nodejs", "notification", "offline", "online", "openai", "openrouter", "operating",
        "os", "otp", "output", "page", "password", "pdf", "phone", "photo", "picture", "pixel",
        "play", "player", "podcast", "post", "profile", "program", "prompt", "python", "ram",
        "react", "refresh", "request", "reset", "response", "router", "save", "screen", "search",
        "security", "server", "service", "session", "settings", "share", "site", "smartphone",
        "software", "speaker", "status", "storage", "streaming", "sync", "system", "tab", "tablet",
        "tag", "task", "terminal", "token", "tools", "twitter", "ui", "update", "upload", "url",
        "usb", "user", "username", "version", "video", "voice", "vpn", "web", "website", "whatsapp",
        "wifi", "windows", "wireless", "youtube", "zip",

        // Education, Campus & Career
        "academy", "admission", "agenda", "answer", "arts", "assignment", "batch", "board",
        "book", "campus", "career", "certificate", "class", "classroom", "clinic", "college",
        "commerce", "company", "conference", "course", "curriculum", "deadline", "degree",
        "department", "design", "diploma", "director", "doctor", "education", "engineer",
        "engineering", "essay", "exam", "examination", "faculty", "fellowship", "field", "grade",
        "graduate", "head", "homework", "hospital", "institute", "institution", "intern",
        "internship", "interview", "job", "lab", "laboratory", "lecture", "lesson", "library",
        "manager", "management", "marks", "master", "masters", "meeting", "mentor", "notice",
        "nurse", "office", "patient", "presentation", "principal", "profession", "professional",
        "professor", "project", "quiz", "rank", "report", "research", "resume", "salary",
        "scholarship", "school", "science", "semester", "session", "shift", "sir", "staff",
        "student", "study", "subject", "syllabus", "task", "teacher", "team", "test", "thesis",
        "training", "tutor", "tuition", "uniform", "university", "viva", "workshop",

        // Daily Life, Emotion, Activity
        "active", "address", "advance", "adventure", "airport", "alarm", "album", "alone",
        "amazing", "anger", "angry", "anniversary", "apartment", "appointment", "area", "attitude",
        "auto", "bad", "bag", "balance", "bank", "bar", "beach", "beautiful", "beauty", "bed",
        "bedroom", "best", "bike", "bill", "birthday", "biscuit", "blanket", "block", "blood",
        "board", "boat", "body", "bonus", "border", "boring", "boss", "bottle", "box", "boy",
        "branch", "bread", "break", "breakfast", "bridge", "budget", "building", "bus", "business",
        "busy", "butter", "cab", "cafe", "cake", "call", "calm", "camera", "cancel", "candle",
        "capsule", "car", "card", "care", "cash", "casual", "center", "centre", "champion",
        "chance", "change", "charge", "check", "chocolate", "choice", "cinema", "city", "clean",
        "clear", "clever", "clinic", "close", "clothes", "club", "coach", "coat", "coffee",
        "cold", "color", "colour", "comic", "common", "company", "complex", "confirm", "confused",
        "congratulations", "contact", "control", "cook", "cool", "copy", "corner", "cost",
        "couch", "couple", "court", "cover", "crazy", "credit", "cricket", "crisis", "cross",
        "cup", "cure", "curious", "custom", "cute", "daily", "damage", "dance", "danger",
        "dark", "date", "day", "dead", "deal", "dear", "decision", "deep", "delay", "delicious",
        "delivery", "dentist", "deposit", "depressed", "dessert", "detail", "details", "diet",
        "difference", "different", "difficult", "dinner", "direct", "discount", "distance",
        "disturb", "divorce", "doc", "dollar", "done", "door", "double", "doubt", "draft",
        "drama", "drawer", "dream", "dress", "drink", "driver", "dry", "due", "duty", "early",
        "easy", "emergency", "emotion", "empty", "energy", "enjoy", "entry", "event", "exact",
        "exercise", "experience", "expert", "extra", "extreme", "face", "fact", "factory",
        "fair", "fake", "family", "famous", "fan", "farm", "fashion", "fast", "fat", "fault",
        "favorite", "favourite", "fear", "feel", "feeling", "fever", "fight", "final", "fine",
        "finger", "finish", "fit", "fitness", "fix", "flight", "floor", "fly", "focus", "food",
        "football", "foreign", "forever", "formal", "form", "frame", "free", "fresh", "fridge",
        "friend", "friendly", "friendship", "full", "fun", "funny", "future", "game", "gap",
        "garden", "gas", "gate", "general", "genius", "gift", "girl", "glass", "glasses",
        "goal", "gold", "good", "grand", "gray", "great", "green", "group", "guest", "guide",
        "guitar", "gym", "habit", "hall", "handle", "handsome", "hangout", "happy", "hard",
        "health", "healthy", "heart", "heavy", "hello", "help", "hero", "hi", "high", "hill",
        "hobby", "hold", "holiday", "home", "honest", "honor", "hope", "horn", "horrible",
        "host", "hot", "hotel", "house", "huge", "human", "hunger", "hungry", "hurry", "hurt",
        "husband", "ice", "idea", "ideal", "ignore", "ill", "impact", "important", "impossible",
        "income", "info", "information", "injury", "innocent", "inside", "instant", "insurance",
        "intelligent", "interest", "invite", "iron", "island", "issue", "jacket", "jail",
        "jam", "jeans", "jewel", "join", "joke", "journey", "juice", "jump", "jungle", "junior",
        "jury", "just", "justice", "keen", "keep", "kick", "kid", "killer", "kind", "king",
        "kiss", "kitchen", "kite", "knee", "knife", "knock", "knowledge", "label", "lake",
        "lamp", "land", "lane", "large", "last", "late", "laugh", "law", "layer", "lazy",
        "leader", "league", "leak", "lean", "leave", "left", "legal", "lemon", "lesson",
        "letter", "level", "liberty", "license", "lie", "life", "lift", "light", "limit",
        "line", "lip", "liquid", "list", "listen", "little", "live", "liver", "load", "loan",
        "local", "lock", "lonely", "long", "look", "loop", "loose", "lord", "loss", "lost",
        "loud", "love", "lover", "low", "loyal", "luck", "lucky", "lunch", "luxury", "mad",
        "magic", "major", "mall", "man", "manage", "manner", "manual", "map", "market",
        "marriage", "mask", "mass", "match", "mate", "matter", "maximum", "meal", "meaning",
        "media", "medical", "medicine", "medium", "member", "mess", "metal", "meter", "method",
        "middle", "milk", "million", "mind", "mine", "minimum", "minute", "mirror", "miss",
        "missing", "mistake", "mix", "mode", "modern", "moment", "money", "month", "mood",
        "moon", "morning", "mother", "motion", "motor", "mountain", "mouth", "move", "movie",
        "moving", "much", "mud", "muscle", "museum", "music", "musician", "nail", "name",
        "narrow", "nation", "native", "natural", "nature", "near", "neat", "neck", "need",
        "negative", "neighbor", "nerve", "nest", "net", "neutral", "new", "news", "next",
        "nice", "night", "noble", "noise", "normal", "north", "nose", "note", "nothing",
        "novel", "now", "number", "nut", "object", "obvious", "ocean", "offer", "oil", "okay",
        "old", "one", "open", "opinion", "option", "orange", "order", "ordinary", "organ",
        "original", "other", "outside", "oven", "over", "pack", "package", "pain", "paint",
        "pair", "palace", "pale", "pan", "panic", "pants", "paper", "park", "parking", "part",
        "party", "pass", "passion", "passport", "past", "path", "patience", "pause", "pay",
        "payment", "peace", "peak", "pen", "pencil", "people", "pepper", "perfect", "period",
        "person", "pet", "petrol", "phase", "photo", "phrase", "physical", "piano", "pick",
        "picnic", "piece", "pile", "pilot", "pin", "pipe", "place", "plain", "plan", "plane",
        "planet", "plant", "plastic", "plate", "platform", "player", "pleasant", "please",
        "pleasure", "plenty", "plot", "plug", "pocket", "point", "police", "policy", "polish",
        "polite", "politics", "pool", "poor", "popular", "pork", "port", "pose", "position",
        "positive", "post", "pot", "potato", "power", "practice", "praise", "prayer", "premium",
        "pretty", "price", "pride", "priest", "prime", "prince", "princess", "print", "prison",
        "private", "prize", "problem", "process", "produce", "product", "progress", "promise",
        "proof", "property", "propose", "protect", "proud", "prove", "public", "pull", "pump",
        "punch", "punish", "pure", "purple", "purpose", "push", "quality", "quantity", "quarrel",
        "queen", "quick", "quiet", "race", "radio", "rail", "rain", "raise", "range", "rapid",
        "rare", "rate", "raw", "ray", "reach", "react", "read", "ready", "real", "reality",
        "realize", "reason", "receipt", "receive", "recent", "recipe", "record", "recover",
        "red", "reduce", "reform", "refuse", "regard", "regular", "reject", "relate", "relax",
        "release", "relief", "religion", "remain", "remark", "remedy", "remind", "remove",
        "rent", "repair", "repeat", "replace", "reply", "request", "rescue", "reserve", "respect",
        "response", "rest", "restaurant", "result", "retire", "return", "reveal", "review",
        "reward", "rice", "rich", "ride", "ring", "ripe", "rise", "risk", "river", "road",
        "robot", "rock", "role", "roll", "roof", "room", "root", "rope", "rose", "rough",
        "round", "route", "routine", "row", "royal", "rubber", "rude", "rug", "ruin", "rule",
        "ruler", "rumor", "run", "rush", "sad", "safe", "safety", "sail", "salary", "sale",
        "salt", "same", "sample", "sand", "sandwich", "sauce", "save", "scale", "scene",
        "scent", "schedule", "scheme", "school", "scope", "score", "scratch", "scream", "screen",
        "screw", "sea", "seal", "season", "seat", "second", "secret", "section", "secure",
        "seed", "seek", "seem", "seize", "select", "self", "sell", "send", "senior", "sense",
        "sentence", "separate", "serious", "servant", "serve", "service", "set", "settle",
        "shade", "shadow", "shake", "shame", "shape", "share", "sharp", "shave", "sheep",
        "sheet", "shelf", "shell", "shelter", "shift", "shine", "ship", "shirt", "shock",
        "shoe", "shoot", "shop", "shopping", "shore", "short", "shot", "shoulder", "shout",
        "show", "shower", "shut", "sick", "side", "sight", "sign", "signal", "silent", "silk",
        "silly", "silver", "simple", "since", "sincere", "sing", "single", "sink", "sister",
        "sit", "site", "situation", "size", "skill", "skin", "skirt", "sky", "sleep", "slide",
        "slight", "slip", "slope", "slow", "small", "smart", "smell", "smile", "smoke", "smooth",
        "snake", "snap", "snow", "soap", "social", "society", "sock", "soft", "soil", "soldier",
        "solid", "solution", "solve", "some", "son", "song", "soon", "sore", "sorrow", "sorry",
        "sort", "soul", "sound", "soup", "sour", "source", "south", "space", "spare", "spark",
        "speak", "special", "specific", "speech", "speed", "spell", "spend", "spice", "spill",
        "spin", "spirit", "spite", "split", "spoil", "spoon", "sport", "spot", "spray", "spread",
        "spring", "square", "stage", "stain", "stair", "stamp", "stand", "star", "stare",
        "start", "state", "station", "stay", "steady", "steal", "steam", "steel", "steep",
        "stem", "step", "stick", "stiff", "still", "sting", "stock", "stomach", "stone",
        "stop", "store", "storm", "story", "stove", "straight", "strange", "stranger", "strap",
        "straw", "stream", "street", "strength", "stress", "stretch", "strict", "strike",
        "string", "strip", "stroke", "strong", "structure", "struggle", "student", "studio",
        "stuff", "stupid", "style", "subject", "subway", "succeed", "success", "such", "sudden",
        "suffer", "sugar", "suggest", "suit", "suitcase", "sum", "summer", "sun", "super",
        "supper", "supply", "support", "suppose", "sure", "surface", "surgeon", "surprise",
        "surround", "suspect", "swallow", "swear", "sweat", "sweater", "sweep", "sweet", "swim",
        "swing", "switch", "sword", "symbol", "sympathy", "system", "table", "tail", "talent",
        "talk", "tall", "tank", "tap", "tape", "target", "taste", "tax", "taxi", "tea", "teach",
        "team", "tear", "tease", "tell", "temperature", "temple", "temporary", "tend", "tender",
        "tense", "tension", "tent", "term", "terrible", "test", "text", "thank", "thanks",
        "theater", "theatre", "theme", "theory", "thick", "thief", "thin", "thing", "think",
        "thirst", "thorough", "though", "thread", "threat", "throat", "throne", "thumb", "thunder",
        "ticket", "tide", "tidy", "tie", "tight", "till", "time", "tin", "tiny", "tip", "tire",
        "tired", "tissue", "title", "toast", "today", "toe", "together", "toilet", "token",
        "toll", "tomato", "tomorrow", "tone", "tongue", "tonight", "tool", "tooth", "top",
        "topic", "torch", "total", "touch", "tough", "tour", "tourist", "towel", "tower", "town",
        "toy", "trace", "track", "trade", "traffic", "train", "transfer", "transport", "trap",
        "trash", "travel", "tray", "treat", "treatment", "tree", "trend", "trial", "triangle",
        "trick", "trip", "triumph", "troop", "trouble", "truck", "true", "trunk", "trust",
        "truth", "try", "tube", "tune", "tunnel", "turn", "twin", "twist", "type", "typical",
        "ugly", "umbrella", "uncle", "under", "understand", "union", "unit", "unite", "universe",
        "unknown", "unless", "until", "upper", "upset", "urban", "urge", "urgent", "use",
        "used", "useful", "useless", "usual", "vacation", "valley", "valuable", "value", "van",
        "variety", "various", "vehicle", "version", "very", "vessel", "victim", "victory",
        "video", "view", "village", "violin", "virtue", "virus", "visa", "visit", "visitor",
        "visual", "vital", "vitamin", "voice", "volume", "vote", "vowel", "voyage", "wage",
        "wait", "waiter", "wake", "walk", "wall", "wallet", "wander", "want", "war", "warm",
        "warn", "wash", "waste", "watch", "water", "wave", "wax", "way", "weak", "wealth",
        "weapon", "wear", "weather", "wedding", "week", "weekend", "weight", "welcome", "well",
        "west", "wet", "whale", "wheat", "wheel", "while", "whip", "whisper", "whistle", "white",
        "whole", "wicked", "wide", "widow", "width", "wife", "wild", "will", "willing", "win",
        "wind", "window", "wine", "wing", "winner", "winter", "wipe", "wire", "wisdom", "wise",
        "wish", "witness", "woman", "wonder", "wonderful", "wood", "wool", "word", "work",
        "world", "worm", "worry", "worse", "worst", "worth", "wound", "wrap", "wreck", "wrist",
        "write", "wrong", "yard", "year", "yellow", "yes", "yesterday", "yield", "young", "youth",
        "zeal", "zebra", "zero", "zone", "zoo"
    )

    private val BANGLISH_DIRECT_MAP = mapOf(
        "ami" to "আমি",
        "amra" to "আমরা",
        "amader" to "আমাদের",
        "amake" to "আমাকে",
        "amar" to "আমার",
        "amay" to "আমায়",
        "amaye" to "আমায়",
        "tumi" to "তুমি",
        "tomra" to "তোমরা",
        "tomader" to "তোমাদের",
        "tomake" to "তোমাকে",
        "tomar" to "তোমার",
        "tomay" to "তোমায়",
        "tomaye" to "তোমায়",
        "tui" to "তুই",
        "tora" to "তোরা",
        "toder" to "তোদের",
        "toke" to "তোকে",
        "tor" to "তোর",
        "apni" to "আপনি",
        "apnara" to "আপনারা",
        "apnader" to "আপনাদের",
        "apnake" to "আপনাকে",
        "apnar" to "আপনার",
        "se" to "সে",
        "she" to "সে",
        "tini" to "তিনি",
        "tara" to "তারা",
        "tader" to "তাদের",
        "take" to "তাকে",
        "tar" to "তার",
        "taar" to "তার",
        "tanke" to "তাঁকে",
        "ei" to "এই",
        "eta" to "এটা",
        "eti" to "এটি",
        "egulo" to "এগুলো",
        "egula" to "এগুলো",
        "ekhane" to "এখানে",
        "ekhan" to "এখন",
        "ekhon" to "এখন",
        "ekhoni" to "এখনই",
        "ebhabe" to "এভাবে",
        "evabe" to "এভাবে",
        "emon" to "এমন",
        "oi" to "ওই",
        "ota" to "ওটা",
        "oti" to "ওটি",
        "ogulo" to "ওগুলো",
        "ogula" to "ওগুলো",
        "okhane" to "ওখানে",
        "obhabe" to "ওভাবে",
        "ovabe" to "ওভাবে",
        "omon" to "ওমন",
        "ke" to "কে",
        "kara" to "কারা",
        "kader" to "কাদের",
        "kake" to "কাকে",
        "kar" to "কার",
        "ki" to "কী",
        "kisu" to "কিছু",
        "kichu" to "কিছু",
        "kichui" to "কিছুই",
        "kisui" to "কিছুই",
        "kothay" to "কোথায়",
        "kothaye" to "কোথায়",
        "kotha" to "কথা",
        "kothao" to "কোথাও",
        "kokhon" to "কখন",
        "kobe" to "কবে",
        "keno" to "কেন",
        "kivabe" to "কীভাবে",
        "kibhabe" to "কীভাবে",
        "kemon" to "কেমন",
        "kototuku" to "কতটুকু",
        "koto" to "কত",
        "kotota" to "কতটা",
        "konti" to "কোনটি",
        "konta" to "কোনটা",
        "kon" to "কোন",
        "ache" to "আছে",
        "asen" to "আছেন",
        "achen" to "আছেন",
        "acho" to "আছো",
        "achi" to "আছি",
        "achis" to "আছিস",
        "chilo" to "ছিল",
        "chilen" to "ছিলেন",
        "chile" to "ছিলে",
        "chilam" to "ছিলাম",
        "chilis" to "ছিলিস",
        "nai" to "নাই",
        "nei" to "নেই",
        "na" to "না",
        "ni" to "নি",
        "noy" to "নয়",
        "noi" to "নই",
        "hobe" to "হবে",
        "hoben" to "হবেন",
        "hobo" to "হবো",
        "hoto" to "হতো",
        "hote" to "হতে",
        "hoy" to "হয়",
        "hoye" to "হয়ে",
        "hoyeche" to "হয়েছে",
        "hoyecho" to "হয়েছো",
        "hoyechi" to "হয়েছি",
        "hoche" to "হচ্ছে",
        "korbo" to "করবো",
        "korbe" to "করবে",
        "korben" to "করবেন",
        "korbi" to "করবি",
        "kori" to "করি",
        "koro" to "করো",
        "koren" to "করেন",
        "koris" to "করিস",
        "korchi" to "করছি",
        "korcho" to "করছো",
        "korchen" to "করছেন",
        "korechi" to "করেছি",
        "korecho" to "করেছো",
        "koreche" to "করেছে",
        "korechen" to "করেছেন",
        "kore" to "করে",
        "korte" to "করতে",
        "kora" to "করা",
        "korle" to "করলে",
        "korlei" to "করলেই",
        "jabo" to "যাবো",
        "jabe" to "যাবে",
        "jaben" to "যাবেন",
        "jabi" to "যাবি",
        "jai" to "যাই",
        "jao" to "যাও",
        "jan" to "যান",
        "jachi" to "যাচ্ছি",
        "jacho" to "যাচ্ছো",
        "jachen" to "যাচ্ছেন",
        "gechi" to "গেছি",
        "gecho" to "গেছো",
        "geche" to "গেছে",
        "gechen" to "গেছেন",
        "gelam" to "গেলাম",
        "gele" to "গেলে",
        "gelo" to "গেল",
        "giye" to "গিয়ে",
        "jete" to "যেতে",
        "jaowa" to "যাওয়া",
        "ashbo" to "আসবো",
        "ashbe" to "আসবে",
        "ashben" to "আসবেন",
        "ashbi" to "আসবি",
        "ashi" to "আসি",
        "asho" to "আসো",
        "ashen" to "আসেন",
        "ashchi" to "আসছি",
        "ashcho" to "আসছো",
        "ashchen" to "আসছেন",
        "eshechi" to "এসেছি",
        "eshecho" to "এসেছো",
        "esheche" to "এসেছে",
        "eshechen" to "এসেছেন",
        "eshe" to "এসে",
        "ashte" to "আসতে",
        "ashar" to "আসার",
        "asha" to "আসা",
        "bolbo" to "বলবো",
        "bolbe" to "বলবে",
        "bolben" to "বলবেন",
        "boli" to "বলি",
        "bolo" to "বলো",
        "bolen" to "বলেন",
        "bolchi" to "বলছি",
        "bolcho" to "বলছো",
        "bolchen" to "বলছেন",
        "bolechi" to "বলেছি",
        "bolecho" to "বলেছো",
        "boleche" to "বলেছে",
        "bolechen" to "বলেছেন",
        "bole" to "বলে",
        "bolte" to "বলতে",
        "bola" to "বলা",
        "bolle" to "বললে",
        "dekhbo" to "দেখবো",
        "dekhbe" to "দেখবে",
        "dekhi" to "দেখি",
        "dekho" to "দেখো",
        "dekhen" to "দেখেন",
        "dekhchi" to "দেখছি",
        "dekhechi" to "দেখেছি",
        "dekhe" to "দেখে",
        "dekhte" to "দেখতে",
        "dekha" to "দেখা",
        "shunbo" to "শুনবো",
        "shunbe" to "শুনবে",
        "shuni" to "শুনি",
        "shuno" to "শুনো",
        "shunen" to "শুনেন",
        "shunchi" to "শুনছি",
        "shunechi" to "শুনেছি",
        "shune" to "শুনে",
        "shunte" to "শুনতে",
        "shona" to "শোনা",
        "khabo" to "খাবো",
        "khabe" to "খাবে",
        "khai" to "খাই",
        "khao" to "খাও",
        "khan" to "খান",
        "khacchi" to "খাচ্ছি",
        "kheyechi" to "খেয়েছি",
        "kheye" to "খেয়ে",
        "khete" to "খেতে",
        "khawa" to "খাওয়া",
        "nebo" to "নেবো",
        "nebe" to "নেবে",
        "neben" to "নেবেন",
        "nao" to "নাও",
        "nan" to "নেন",
        "nichhi" to "নিচ্ছি",
        "niyechi" to "নিয়েছি",
        "niye" to "নিয়ে",
        "nite" to "নিতে",
        "neya" to "নেওয়া",
        "debo" to "দেবো",
        "debe" to "দেবে",
        "deben" to "দেবেন",
        "dao" to "দাও",
        "den" to "দেন",
        "dicchi" to "দিচ্ছি",
        "diyechi" to "দিয়েছি",
        "diye" to "দিয়ে",
        "dite" to "দিতে",
        "dewa" to "দেওয়া",
        "dilam" to "দিলাম",
        "dile" to "দিলে",
        "dilo" to "দিল",
        "parbo" to "পারবো",
        "parbe" to "পারবে",
        "parben" to "পারবেন",
        "pari" to "পারি",
        "paro" to "পারো",
        "paren" to "পারেন",
        "parchi" to "পারছি",
        "perechi" to "পেরেছি",
        "pere" to "পেরে",
        "parte" to "পারতে",
        "parle" to "পারলে",
        "pabo" to "পাবো",
        "pabe" to "পাবে",
        "paben" to "পাবেন",
        "pai" to "পাই",
        "pao" to "পাও",
        "pan" to "পান",
        "pachi" to "পাচ্ছি",
        "peyechi" to "পেয়েছি",
        "peye" to "পেয়ে",
        "pete" to "পেতে",
        "pawa" to "পাওয়া",
        "bhabchi" to "ভাবছি",
        "bhabcho" to "ভাবছো",
        "bhabo" to "ভাবো",
        "bhabchen" to "ভাবছেন",
        "bhebechi" to "ভেবেছি",
        "bhebe" to "ভেবে",
        "bhabte" to "ভাবতে",
        "bhaba" to "ভাবা",
        "janbo" to "জানবো",
        "jani" to "জানি",
        "jano" to "জানো",
        "janen" to "জানেন",
        "jantam" to "জানতাম",
        "jene" to "জেনে",
        "jante" to "জানতে",
        "jana" to "জানা",
        "bujhbo" to "বুঝবো",
        "bujhi" to "বুঝি",
        "bujho" to "বুঝছো",
        "bujhen" to "বুঝেন",
        "bujhte" to "বুঝতে",
        "bujhechi" to "বুঝেছি",
        "bujhe" to "বুঝে",
        "lagbe" to "লাগবে",
        "lagche" to "লাগছে",
        "laglo" to "লাগলো",
        "lage" to "লাগে",
        "lagle" to "লাগলে",
        "ajke" to "আজকে",
        "aaj" to "আজ",
        "aj" to "আজ",
        "kal" to "কাল",
        "kalke" to "কালকে",
        "agami" to "আগামী",
        "gotokal" to "গতকাল",
        "taratari" to "তাড়াতাড়ি",
        "aste" to "আস্তে",
        "khub" to "খুব",
        "onek" to "অনেক",
        "onekta" to "অনেকটা",
        "ektu" to "একটু",
        "kom" to "কম",
        "beshi" to "বেশি",
        "besh" to "বেশ",
        "bhalo" to "ভালো",
        "valo" to "ভালো",
        "bhaloii" to "ভালোই",
        "kharap" to "খারাপ",
        "shundor" to "সুন্দর",
        "shundar" to "সুন্দর",
        "sohoj" to "সহজ",
        "kothin" to "কঠিন",
        "tai" to "তাই",
        "tahole" to "তাহলে",
        "tobu" to "তবু",
        "kintu" to "কিন্তু",
        "ar" to "আর",
        "ebong" to "এবং",
        "ba" to "বা",
        "othoba" to "অথবা",
        "nahole" to "নাহলে",
        "noyto" to "নয়তো",
        "sob" to "সব",
        "shob" to "সব",
        "sobai" to "সবাই",
        "shobai" to "সবাই",
        "sobkichu" to "সবকিছু",
        "shobkichu" to "সবকিছু",
        "onno" to "অন্য",
        "nijer" to "নিজের",
        "nije" to "নিজে",
        "tokhon" to "তখন",
        "jokhon" to "যখন",
        "protidin" to "প্রতিদিন",
        "shobshomoy" to "সবসময়",
        "sobshomoy" to "সবসময়",
        "majhe" to "মাঝে",
        "majhemajhe" to "মাঝেমাঝে",
        "bondhu" to "বন্ধু",
        "bhai" to "ভাই",
        "dada" to "দাদা",
        "didi" to "দিদি",
        "apu" to "আপু",
        "bon" to "বোন",
        "baba" to "বাবা",
        "ma" to "মা",
        "thik" to "ঠিক",
        "shotti" to "সত্যি",
        "sotti" to "সত্যি",
        "mitthe" to "মিথ্যা",
        "dorkar" to "দরকার",
        "pochondo" to "পছন্দ",
        "mon" to "মন",
        "valobasha" to "ভালোবাসা",
        "bhalobasha" to "ভালোবাসা",
        "shukh" to "সুখ",
        "dukho" to "দুঃখ",
        "kosto" to "কষ্ট",
        "anondo" to "আনন্দ",
        "somoy" to "সময়",
        "shomoy" to "সময়",
        "din" to "দিন",
        "raat" to "রাত",
        "shokal" to "সকাল",
        "dupur" to "দুপুর",
        "bikal" to "বিকাল",
        "sondha" to "সন্ধ্যা",
        "bochor" to "বছর",
        "mash" to "মাস",
        "bari" to "বাড়ি",
        "basa" to "বাসা",
        "ghor" to "ঘর",
        "desh" to "দেশ",
        "shuru" to "শুরু",
        "shesh" to "শেষ",
        "kaj" to "কাজ",
        "porashona" to "পড়াশোনা",
        "arre" to "আরে",
        "are" to "আরে",
        "accha" to "আচ্ছা",
        "acha" to "আচ্ছা",
        "halka" to "হালকা",
        "cholo" to "চলো",
        "shono" to "শোনো",
        "to" to "তো",
        "tarpor" to "তারপর",
        "tarporo" to "তারপরেও",
        "ekta" to "একটা",
        "duto" to "দুটো",
        "tinta" to "তিনটা",
        "charte" to "চারটে",
        "pachta" to "পাঁচটা",
        "ta" to "টা",
        "ti" to "টি",
        "gulo" to "গুলো",
        "gula" to "গুলো",
        "te" to "তে",
        "e" to "এ",
        "er" to "এর",
        "o" to "ও"
    )

    fun isBanglishText(text: String): Boolean {
        if (text.isBlank()) return false
        val words = text.lowercase().split(Regex("[^a-z]+")).filter { it.isNotBlank() }
        if (words.isEmpty()) return false

        var banglishCount = 0
        for (w in words) {
            if (BANGLISH_DIRECT_MAP.containsKey(w)) {
                banglishCount++
            }
        }
        return banglishCount >= 1
    }

    private fun phoneticBanglishToBengali(word: String): String {
        var s = word.lowercase()

        val suffixMap = listOf(
            Regex("chen$") to "ছেন",
            Regex("cho$") to "ছো",
            Regex("chi$") to "ছি",
            Regex("chis$") to "ছিস",
            Regex("che$") to "ছে",
            Regex("eche$") to "য়েছে",
            Regex("echi$") to "য়েছি",
            Regex("echo$") to "য়েছো",
            Regex("echen$") to "য়েছেন",
            Regex("lam$") to "লাম",
            Regex("len$") to "লেন",
            Regex("tam$") to "তাম",
            Regex("ten$") to "তেন",
            Regex("gulo$") to "গুলো",
            Regex("gula$") to "গুলো",
            Regex("bhabe$") to "ভাবে",
            Regex("vabe$") to "ভাবে"
        )

        for ((regex, rep) in suffixMap) {
            if (regex.containsMatchIn(s)) {
                val root = s.replace(regex, "")
                if (root.isNotEmpty()) {
                    return phoneticBanglishToBengali(root) + rep
                }
            }
        }

        val rules = listOf(
            Regex("^kkh") to "ক্ষ",
            Regex("^kh") to "খ",
            Regex("^gh") to "ঘ",
            Regex("^ng") to "ঙ",
            Regex("^ch") to "চ",
            Regex("^chh") to "ছ",
            Regex("^jh") to "ঝ",
            Regex("^th") to "থ",
            Regex("^dh") to "ধ",
            Regex("^ph") to "ফ",
            Regex("^bh") to "ভ",
            Regex("^sh") to "শ",
            Regex("^rh") to "ঢ়",
            Regex("^r") to "র",
            Regex("^k") to "ক",
            Regex("^g") to "গ",
            Regex("^j") to "জ",
            Regex("^t") to "ত",
            Regex("^d") to "দ",
            Regex("^n") to "ন",
            Regex("^p") to "প",
            Regex("^f") to "ফ",
            Regex("^b") to "ব",
            Regex("^m") to "ম",
            Regex("^y") to "য়",
            Regex("^l") to "ল",
            Regex("^s") to "স",
            Regex("^h") to "হ",
            Regex("^v") to "ভ",
            Regex("^w") to "ও",
            Regex("^z") to "জ"
        )

        val vowelMap = mapOf(
            "a" to "া", "aa" to "া", "i" to "ি", "ee" to "ী",
            "u" to "ু", "oo" to "ূ", "e" to "ে", "ai" to "ৈ", "o" to "ো", "ou" to "ৌ"
        )

        val initialVowelMap = mapOf(
            "a" to "আ", "aa" to "আ", "i" to "ই", "ee" to "ঈ",
            "u" to "উ", "oo" to "ঊ", "e" to "এ", "ai" to "ঐ", "o" to "ও", "ou" to "ঔ"
        )

        val result = StringBuilder()
        var i = 0
        while (i < s.length) {
            val sub2 = if (i + 2 <= s.length) s.substring(i, i + 2) else ""
            val sub1 = s.substring(i, i + 1)

            if (i == 0 && (initialVowelMap.containsKey(sub2) || initialVowelMap.containsKey(sub1))) {
                if (initialVowelMap.containsKey(sub2)) {
                    result.append(initialVowelMap[sub2])
                    i += 2
                    continue
                } else {
                    result.append(initialVowelMap[sub1])
                    i += 1
                    continue
                }
            }

            var matched = false
            val remaining = s.substring(i)
            for ((pat, rep) in rules) {
                val match = pat.find(remaining)
                if (match != null) {
                    result.append(rep)
                    i += match.value.length
                    matched = true
                    break
                }
            }
            if (matched) continue

            if (vowelMap.containsKey(sub2)) {
                result.append(vowelMap[sub2])
                i += 2
            } else if (vowelMap.containsKey(sub1)) {
                result.append(vowelMap[sub1])
                i += 1
            } else {
                result.append(sub1)
                i += 1
            }
        }
        return result.toString()
    }

    fun normalizeWord(token: String): String {
        val prefixMatcher = Pattern.compile("^[^a-zA-Z0-9\u0980-\u09FF]+").matcher(token)
        val prefix = if (prefixMatcher.find()) prefixMatcher.group() else ""

        val suffixMatcher = Pattern.compile("[^a-zA-Z0-9\u0980-\u09FF]+$").matcher(token)
        val suffix = if (suffixMatcher.find()) suffixMatcher.group() else ""

        val cleanWord = token.substring(prefix.length, token.length - suffix.length)
        if (cleanWord.isBlank()) return token

        // If already Bengali script or numeric
        if (cleanWord.any { it in '\u0980'..'\u09FF' } || cleanWord.all { it.isDigit() }) {
            return token
        }

        val lower = cleanWord.lowercase()

        // Check if attached enclitic to an English word (e.g. model-ta -> model টা)
        val encliticMatcher = Pattern.compile("^([a-z]{3,})(ta|ti|gulo|gula|te|er|e|o)$").matcher(lower)
        if (encliticMatcher.find()) {
            val root = encliticMatcher.group(1) ?: ""
            val enclitic = encliticMatcher.group(2) ?: ""
            if (ENGLISH_PRESERVED_WORDS.contains(root)) {
                val bnEnclitic = BANGLISH_DIRECT_MAP[enclitic] ?: enclitic
                return "$prefix${cleanWord.take(root.length)} $bnEnclitic$suffix"
            }
        }

        if (ENGLISH_PRESERVED_WORDS.contains(lower)) {
            return token
        }

        if (BANGLISH_DIRECT_MAP.containsKey(lower)) {
            return "$prefix${BANGLISH_DIRECT_MAP[lower]}$suffix"
        }

        if (cleanWord.matches(Regex("^[A-Z]{2,6}$"))) {
            return token
        }

        val converted = phoneticBanglishToBengali(lower)
        return "$prefix$converted$suffix"
    }

    fun normalizeBanglishForTTS(rawText: String): String {
        if (rawText.isBlank()) return ""

        val parts = rawText.split(Regex("(?<=\\s)|(?=\\s)"))
        val sb = StringBuilder()
        for (part in parts) {
            if (part.isBlank()) {
                sb.append(part)
            } else {
                sb.append(normalizeWord(part))
            }
        }
        return sb.toString()
    }
}
