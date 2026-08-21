/**
 * Banglish to Bengali Voice Normalization Engine
 * 
 * Automatically detects Banglish (Bengali written in English/Latin letters),
 * converts Banglish tokens into authentic Bengali script for native TTS pronunciation,
 * while strictly preserving genuine English vocabulary, technical terms, and brand names
 * in English pronunciation.
 */

// Comprehensive dictionary of genuine English vocabulary, technical terms, and brand names
const ENGLISH_PRESERVED_WORDS = new Set([
  // Technology, AI & Platforms
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

  // Education, Campus & Professional
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

  // Daily Life, Emotion, Slang & Activity
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
]);

// Direct high-accuracy Banglish token mapping dictionary
const BANGLISH_DIRECT_MAP: Record<string, string> = {
  // Pronouns & Possessives
  "ami": "আমি",
  "amra": "আমরা",
  "amader": "আমাদের",
  "amake": "আমাকে",
  "amar": "আমার",
  "amay": "আমায়",
  "amaye": "আমায়",
  "tumi": "তুমি",
  "tomra": "তোমরা",
  "tomader": "তোমাদের",
  "tomake": "তোমাকে",
  "tomar": "তোমার",
  "tomay": "তোমায়",
  "tomaye": "তোমায়",
  "tui": "তুই",
  "tora": "তোরা",
  "toder": "তোদের",
  "toke": "তোকে",
  "tor": "তোর",
  "apni": "আপনি",
  "apnara": "আপনারা",
  "apnader": "আপনাদের",
  "apnake": "আপনাকে",
  "apnar": "আপনার",
  "se": "সে",
  "she": "সে",
  "tini": "তিনি",
  "tara": "তারা",
  "tader": "তাদের",
  "take": "তাকে",
  "tar": "তার",
  "taar": "তার",
  "tanke": "তাঁকে",
  "tahar": "তাহার",

  // Demonstratives & Wh-words
  "ei": "এই",
  "eta": "এটা",
  "eti": "এটি",
  "egulo": "এগুলো",
  "egula": "এগুলো",
  "ekhane": "এখানে",
  "ekhan": "এখন",
  "ekhon": "এখন",
  "ekhoni": "এখনই",
  "ebhabe": "এভাবে",
  "evabe": "এভাবে",
  "emon": "এমন",
  "oi": "ওই",
  "ota": "ওটা",
  "oti": "ওটি",
  "ogulo": "ওগুলো",
  "ogula": "ওগুলো",
  "okhane": "ওখানে",
  "obhabe": "ওভাবে",
  "ovabe": "ওভাবে",
  "omon": "ওমন",
  "ke": "কে",
  "kara": "কারা",
  "kader": "কাদের",
  "kake": "কাকে",
  "kar": "কার",
  "ki": "কী",
  "kisu": "কিছু",
  "kichu": "কিছু",
  "kichui": "কিছুই",
  "kisui": "কিছুই",
  "kothay": "কোথায়",
  "kothaye": "কোথায়",
  "kotha": "কথা",
  "kothao": "কোথাও",
  "kokhon": "কখন",
  "kobe": "কবে",
  "keno": "কেন",
  "kivabe": "কীভাবে",
  "kibhabe": "কীভাবে",
  "kemon": "কেমন",
  "kototuku": "কতটুকু",
  "koto": "কত",
  "kotota": "কতটা",
  "konti": "কোনটি",
  "konta": "কোনটা",
  "kon": "কোন",
  "konte": "কোনটা",
  "konbhabe": "কোনভাবে",

  // Auxiliaries, Negatives & Copulas
  "ache": "আছে",
  "asen": "আছেন",
  "achen": "আছেন",
  "acho": "আছো",
  "achi": "আছি",
  "achis": "আছিস",
  "chilo": "ছিল",
  "chilen": "ছিলেন",
  "chile": "ছিলে",
  "chilam": "ছিলাম",
  "chilis": "ছিলিস",
  "nai": "নাই",
  "nei": "নেই",
  "na": "না",
  "ni": "নি",
  "noy": "নয়",
  "noi": "নই",
  "naw": "নও",
  "non": "নন",
  "naa": "না",
  "hobe": "হবে",
  "hoben": "হবেন",
  "hobeo": "হবেও",
  "hobi": "হবি",
  "hobo": "হবো",
  "hoto": "হতো",
  "hotam": "হতাম",
  "hote": "হতে",
  "hoy": "হয়",
  "hoye": "হয়ে",
  "hoyeche": "হয়েছে",
  "hoyecho": "হয়েছো",
  "hoyechi": "হয়েছি",
  "hoche": "হচ্ছে",
  "hochilo": "হচ্ছিল",

  // Verbs: Kora (To do)
  "korbo": "করবো",
  "korbe": "করবে",
  "korben": "করবেন",
  "korbi": "করবি",
  "kori": "করি",
  "koro": "করো",
  "koren": "করেন",
  "koris": "করিস",
  "korchi": "করছি",
  "korcho": "করছো",
  "korchen": "করছেন",
  "korchis": "করছিস",
  "korechi": "করেছি",
  "korecho": "করেছো",
  "koreche": "করেছে",
  "korechen": "করেছেন",
  "kore": "করে",
  "korte": "করতে",
  "kora": "করা",
  "korle": "করলে",
  "korlei": "করলেই",
  "korlam": "করলাম",

  // Verbs: Jawa (To go)
  "jabo": "যাবো",
  "jabe": "যাবে",
  "jaben": "যাবেন",
  "jabi": "যাবি",
  "jai": "যাই",
  "jao": "যাও",
  "jan": "যান",
  "jas": "যাস",
  "jachi": "যাচ্ছি",
  "jacho": "যাচ্ছো",
  "jachen": "যাচ্ছেন",
  "jachis": "যাচ্ছিস",
  "gechi": "গেছি",
  "gecho": "গেছো",
  "geche": "গেছে",
  "gechen": "গেছেন",
  "gelam": "গেলাম",
  "gele": "গেলে",
  "geli": "গেলি",
  "gelo": "গেল",
  "giye": "গিয়ে",
  "jete": "যেতে",
  "jaowa": "যাওয়া",

  // Verbs: Asha (To come)
  "ashbo": "আসবো",
  "ashbe": "আসবে",
  "ashben": "আসবেন",
  "ashbi": "আসবি",
  "ashi": "আসি",
  "asho": "আসো",
  "ashen": "আসেন",
  "ashis": "আসিস",
  "ashchi": "আসছি",
  "ashcho": "আসছো",
  "ashchen": "আসছেন",
  "eshechi": "এসেছি",
  "eshecho": "এসেছো",
  "esheche": "এসেছে",
  "eshechen": "এসেছেন",
  "eshe": "এসে",
  "ashte": "আসতে",
  "ashar": "আসার",
  "asha": "আসা",
  "ashlam": "আসলাম",

  // Verbs: Bola, Dekha, Shona, Khawa, Neya, Dewa, Para, Pawa, Bhaba, Jana, Bujha, Laga
  "bolbo": "বলবো",
  "bolbe": "বলবে",
  "bolben": "বলবেন",
  "boli": "বলি",
  "bolo": "বলো",
  "bolen": "বলেন",
  "bolchi": "বলছি",
  "bolcho": "বলছো",
  "bolchen": "বলছেন",
  "bolechi": "বলেছি",
  "bolecho": "বলেছো",
  "boleche": "বলেছে",
  "bolechen": "বলেছেন",
  "bole": "বলে",
  "bolte": "বলতে",
  "bola": "বলা",
  "bolle": "বললে",
  "bollam": "বললাম",

  "dekhbo": "দেখবো",
  "dekhbe": "দেখবে",
  "dekhi": "দেখি",
  "dekho": "দেখো",
  "dekhen": "দেখেন",
  "dekhchi": "দেখছি",
  "dekhechi": "দেখেছি",
  "dekhe": "দেখে",
  "dekhte": "দেখতে",
  "dekha": "দেখা",
  "dekhlam": "দেখলাম",

  "shunbo": "শুনবো",
  "shunbe": "শুনবে",
  "shuni": "শুনি",
  "shuno": "শুনো",
  "shunen": "শুনেন",
  "shunchi": "শুনছি",
  "shunechi": "শুনেছি",
  "shune": "শুনে",
  "shunte": "শুনতে",
  "shona": "শোনা",

  "khabo": "খাবো",
  "khabe": "খাবে",
  "khai": "খাই",
  "khao": "খাও",
  "khan": "খান",
  "khacchi": "খাচ্ছি",
  "kheyechi": "খেয়েছি",
  "kheye": "খেয়ে",
  "khete": "খেতে",
  "khawa": "খাওয়া",

  "nebo": "নেবো",
  "nebe": "নেবে",
  "neben": "নেবেন",
  "nao": "নাও",
  "nan": "নেন",
  "nichhi": "নিচ্ছি",
  "niyechi": "নিয়েছি",
  "niye": "নিয়ে",
  "nite": "নিতে",
  "neya": "নেওয়া",
  "nilam": "নিলাম",

  "debo": "দেবো",
  "debe": "দেবে",
  "deben": "দেবেন",
  "dao": "দাও",
  "den": "দেন",
  "dicchi": "দিচ্ছি",
  "diyechi": "দিয়েছি",
  "diye": "দিয়ে",
  "dite": "দিতে",
  "dewa": "দেওয়া",
  "dilam": "দিলাম",
  "dile": "দিলে",
  "dilo": "দিল",

  "parbo": "পারবো",
  "parbe": "পারবে",
  "parben": "পারবেন",
  "pari": "পারি",
  "paro": "পারো",
  "paren": "পারেন",
  "parchi": "পারছি",
  "perechi": "পেরেছি",
  "pere": "পেরে",
  "parte": "পারতে",
  "parle": "পারলে",

  "pabo": "পাবো",
  "pabe": "পাবে",
  "paben": "পাবেন",
  "pai": "পাই",
  "pao": "পাও",
  "pan": "পান",
  "pachi": "পাচ্ছি",
  "peyechi": "পেয়েছি",
  "peye": "পেয়ে",
  "pete": "পেতে",
  "pawa": "পাওয়া",
  "pelam": "পেলাম",

  "bhabchi": "ভাবছি",
  "bhabcho": "ভাবছো",
  "bhabo": "ভাবো",
  "bhabchen": "ভাবছেন",
  "bhebechi": "ভেবেছি",
  "bhebe": "ভেবে",
  "bhabte": "ভাবতে",
  "bhaba": "ভাবা",

  "janbo": "জানবো",
  "jani": "জানি",
  "jano": "জানো",
  "janen": "জানেন",
  "jantam": "জানতাম",
  "jene": "জেনে",
  "jante": "জানতে",
  "jana": "জানা",

  "bujhbo": "বুঝবো",
  "bujhi": "বুঝি",
  "bujho": "বুঝছো",
  "bujhen": "বুঝেন",
  "bujhte": "বুঝতে",
  "bujhechi": "বুঝেছি",
  "bujhe": "বুঝে",

  "lagbe": "লাগবে",
  "lagche": "লাগছে",
  "laglo": "লাগলো",
  "lage": "লাগে",
  "lagle": "লাগলে",

  // Time & Adverbs
  "ajke": "আজকে",
  "aaj": "আজ",
  "aj": "আজ",
  "kal": "কাল",
  "kalke": "কালকে",
  "agami": "আগামী",
  "gotokal": "গতকাল",
  "taratari": "তাড়াতাড়ি",
  "aste": "আস্তে",
  "khub": "খুব",
  "onek": "অনেক",
  "onekta": "অনেকটা",
  "ektu": "একটু",
  "kom": "কম",
  "beshi": "বেশি",
  "besh": "বেশ",
  "bhalo": "ভালো",
  "valo": "ভালো",
  "bhaloii": "ভালোই",
  "kharap": "খারাপ",
  "shundor": "সুন্দর",
  "shundar": "সুন্দর",
  "sohoj": "সহজ",
  "kothin": "কঠিন",
  "tai": "তাই",
  "tahole": "তাহলে",
  "tobu": "তবু",
  "kintu": "কিন্তু",
  "ar": "আর",
  "ebong": "এবং",
  "ba": "বা",
  "othoba": "অথবা",
  "nahole": "নাহলে",
  "noyto": "নয়তো",
  "sob": "সব",
  "shob": "সব",
  "sobai": "সবাই",
  "shobai": "সবাই",
  "sobkichu": "সবকিছু",
  "shobkichu": "সবকিছু",
  "onno": "অন্য",
  "nijer": "নিজের",
  "nije": "নিজে",
  "tokhon": "তখন",
  "jokhon": "যখন",
  "protidin": "প্রতিদিন",
  "shobshomoy": "সবসময়",
  "sobshomoy": "সবসময়",
  "majhe": "মাঝে",
  "majhemajhe": "মাঝেমাঝে",
  "bondhu": "বন্ধু",
  "bhai": "ভাই",
  "dada": "দাদা",
  "didi": "দিদি",
  "apu": "আপু",
  "bon": "বোন",
  "baba": "বাবা",
  "ma": "মা",
  "thik": "ঠিক",
  "shotti": "সত্যি",
  "sotti": "সত্যি",
  "mitthe": "মিথ্যা",
  "dorkar": "দরকার",
  "pochondo": "পছন্দ",
  "mon": "মন",
  "valobasha": "ভালোবাসা",
  "bhalobasha": "ভালোবাসা",
  "shukh": "সুখ",
  "dukho": "দুঃখ",
  "kosto": "কষ্ট",
  "anondo": "আনন্দ",
  "somoy": "সময়",
  "shomoy": "সময়",
  "din": "দিন",
  "raat": "রাত",
  "shokal": "সকাল",
  "dupur": "দুপুর",
  "bikal": "বিকাল",
  "sondha": "সন্ধ্যা",
  "bochor": "বছর",
  "mash": "মাস",
  "bari": "বাড়ি",
  "basa": "বাসা",
  "ghor": "ঘর",
  "desh": "দেশ",
  "shuru": "শুরু",
  "shesh": "শেষ",
  "kaj": "কাজ",
  "porashona": "পড়াশোনা",
  "arre": "আরে",
  "are": "আরে",
  "accha": "আচ্ছা",
  "acha": "আচ্ছা",
  "halka": "হালকা",
  "cholo": "চলো",
  "shono": "শোনো",
  "to": "তো",
  "tarpor": "তারপর",
  "tarporo": "তারপরেও",
  "ekta": "একটা",
  "duto": "দুটো",
  "tinta": "তিনটা",
  "charte": "চারটে",
  "pachta": "পাঁচটা",
  "ta": "টা",
  "ti": "টি",
  "gulo": "গুলো",
  "gula": "গুলো",
  "te": "তে",
  "e": "এ",
  "er": "এর",
  "o": "ও"
};

/**
 * Phonetic transliteration engine for general Banglish words not directly mapped
 */
function phoneticBanglishToBengali(word: string): string {
  let s = word.toLowerCase();

  // Handle common word-ending verb forms and suffixes first
  const suffixReplacements: [RegExp, string][] = [
    [/chen$/i, "ছেন"],
    [/cho$/i, "ছো"],
    [/chi$/i, "ছি"],
    [/chis$/i, "ছিস"],
    [/che$/i, "ছে"],
    [/eche$/i, "য়েছে"],
    [/echi$/i, "য়েছি"],
    [/echo$/i, "য়েছো"],
    [/echen$/i, "য়েছেন"],
    [/lam$/i, "লাম"],
    [/len$/i, "লেন"],
    [/tam$/i, "তাম"],
    [/ten$/i, "তেন"],
    [/ish$/i, "ইস"],
    [/gulo$/i, "গুলো"],
    [/gula$/i, "গুলো"],
    [/bhabe$/i, "ভাবে"],
    [/vabe$/i, "ভাবে"],
    [/moto$/i, "মতো"],
    [/shomoy$/i, "সময়"],
    [/somoy$/i, "সময়"],
    [/khana$/i, "খানা"],
    [/khani$/i, "খানি"],
  ];

  for (const [pattern, rep] of suffixReplacements) {
    if (pattern.test(s)) {
      const root = s.replace(pattern, "");
      if (root.length > 0) {
        return phoneticBanglishToBengali(root) + rep;
      }
    }
  }

  // Complex multi-character consonants & clusters
  const rules: [RegExp, string][] = [
    [/kkh/g, "ক্ষ"],
    [/kkh/g, "ক্ষ"],
    [/kh/g, "খ"],
    [/gh/g, "ঘ"],
    [/ng/g, "ঙ"],
    [/ch/g, "চ"],
    [/chh/g, "ছ"],
    [/jh/g, "ঝ"],
    [/th/g, "থ"],
    [/dh/g, "ধ"],
    [/ph/g, "ফ"],
    [/bh/g, "ভ"],
    [/sh/g, "শ"],
    [/rh/g, "ঢ়"],
    [/r/g, "র"],
    [/k/g, "ক"],
    [/g/g, "গ"],
    [/j/g, "জ"],
    [/t/g, "ত"],
    [/d/g, "দ"],
    [/n/g, "ন"],
    [/p/g, "প"],
    [/f/g, "ফ"],
    [/b/g, "ব"],
    [/m/g, "ম"],
    [/y/g, "য়"],
    [/l/g, "ল"],
    [/s/g, "স"],
    [/h/g, "হ"],
    [/v/g, "ভ"],
    [/w/g, "ও"],
    [/z/g, "জ"],
  ];

  // If word is completely short or simple vowels
  const vowelMap: Record<string, string> = {
    "a": "া",
    "aa": "া",
    "i": "ি",
    "ee": "ী",
    "u": "ু",
    "oo": "ূ",
    "e": "ে",
    "ai": "ৈ",
    "o": "ো",
    "ou": "ৌ"
  };

  const initialVowelMap: Record<string, string> = {
    "a": "আ",
    "aa": "আ",
    "i": "ই",
    "ee": "ঈ",
    "u": "উ",
    "oo": "ঊ",
    "e": "এ",
    "ai": "ঐ",
    "o": "ও",
    "ou": "ঔ"
  };

  // If the word starts with vowel
  let result = "";
  let i = 0;
  while (i < s.length) {
    let matched = false;

    // Check 3-char, 2-char, 1-char patterns
    const sub3 = s.substring(i, i + 3);
    const sub2 = s.substring(i, i + 2);
    const sub1 = s.substring(i, i + 1);

    if (i === 0 && (initialVowelMap[sub2] || initialVowelMap[sub1])) {
      if (initialVowelMap[sub2]) {
        result += initialVowelMap[sub2];
        i += 2;
        continue;
      } else {
        result += initialVowelMap[sub1];
        i += 1;
        continue;
      }
    }

    for (const [pat, rep] of rules) {
      if (s.substring(i).search(pat) === 0) {
        const matchLen = s.substring(i).match(pat)![0].length;
        result += rep;
        i += matchLen;
        matched = true;
        break;
      }
    }

    if (matched) continue;

    if (vowelMap[sub2]) {
      result += vowelMap[sub2];
      i += 2;
    } else if (vowelMap[sub1]) {
      result += vowelMap[sub1];
      i += 1;
    } else {
      result += sub1;
      i += 1;
    }
  }

  return result;
}

/**
 * Checks if a sentence or text contains Banglish patterns
 */
export function isBanglishText(text: string): boolean {
  if (!text || text.trim().length === 0) return false;
  
  // If text is already mostly in Bengali script, it's native Bengali
  const bengaliCount = (text.match(/[\u0980-\u09FF]/g) || []).length;
  const englishWords = text.toLowerCase().match(/[a-z]+/g) || [];
  
  if (englishWords.length === 0) return false;

  let banglishHitCount = 0;
  for (const word of englishWords) {
    if (BANGLISH_DIRECT_MAP[word]) {
      banglishHitCount++;
    }
  }

  // If at least 1-2 distinct Banglish marker words appear (like 'ami', 'amar', 'korbo', 'jabo', 'ajke', 'kothay', 'ache')
  return banglishHitCount >= 1;
}

/**
 * Normalizes a single token/word:
 * Preserves genuine English words in Latin script,
 * converts Banglish tokens into Bengali script.
 */
export function normalizeWordForVoice(token: string): string {
  // Preserve punctuation around token
  const prefixMatch = token.match(/^[^a-zA-Z0-9\u0980-\u09FF]+/);
  const suffixMatch = token.match(/[^a-zA-Z0-9\u0980-\u09FF]+$/);

  const prefix = prefixMatch ? prefixMatch[0] : "";
  const suffix = suffixMatch ? suffixMatch[0] : "";

  const cleanWord = token.slice(prefix.length, token.length - suffix.length);
  if (!cleanWord) return token;

  // If word is already Bengali script, keep as is
  if (/[\u0980-\u09FF]/.test(cleanWord)) {
    return token;
  }

  // If word is a number, keep as is
  if (/^\d+$/.test(cleanWord)) {
    return token;
  }

  const lower = cleanWord.toLowerCase();

  // Check if it has a common Banglish enclitic attached to an English word (e.g. "model-ta", "modelta", "api-ta", "apita", "assignment-er")
  const attachedEncliticMatch = lower.match(/^([a-z]{3,})(ta|ti|gulo|gula|te|er|e|o)$/);
  if (attachedEncliticMatch) {
    const root = attachedEncliticMatch[1];
    const enclitic = attachedEncliticMatch[2];
    if (ENGLISH_PRESERVED_WORDS.has(root)) {
      const bnEnclitic = BANGLISH_DIRECT_MAP[enclitic] || enclitic;
      return `${prefix}${cleanWord.slice(0, root.length)} ${bnEnclitic}${suffix}`;
    }
  }

  // 1. If it's in the preserved English vocabulary dictionary, preserve in English
  if (ENGLISH_PRESERVED_WORDS.has(lower)) {
    return token;
  }

  // 2. If it's in the direct Banglish dictionary, convert to Bengali
  if (BANGLISH_DIRECT_MAP[lower]) {
    return `${prefix}${BANGLISH_DIRECT_MAP[lower]}${suffix}`;
  }

  // 3. Check for capital acronyms (e.g. "API", "OTP", "URL", "HTML", "AI", "TTS", "E2EE", "MFA")
  if (/^[A-Z]{2,6}$/.test(cleanWord)) {
    return token;
  }

  // 4. If not a recognized English word, convert phonetically
  const converted = phoneticBanglishToBengali(lower);
  return `${prefix}${converted}${suffix}`;
}

/**
 * Main entrance function: Normalizes full conversational text before sending to TTS.
 */
export function normalizeBanglishForTTS(rawText: string): string {
  if (!rawText || rawText.trim().length === 0) return "";

  // Check if text is Banglish or contains Banglish segments
  if (!isBanglishText(rawText) && !/[\u0980-\u09FF]/.test(rawText)) {
    // Plain English message without Banglish - return cleaned text
    return rawText;
  }

  // Split into tokens preserving whitespaces
  const tokens = rawText.split(/(\s+)/);
  const normalizedTokens = tokens.map((part) => {
    if (/^\s+$/.test(part)) return part;
    return normalizeWordForVoice(part);
  });

  return normalizedTokens.join("");
}
