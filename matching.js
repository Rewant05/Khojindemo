const STOPWORDS = new Set([
  "the", "a", "an", "and", "or", "of", "to", "in", "on", "for", "with",
  "is", "was", "at", "from", "my", "i", "me", "it", "this", "that",
  "near", "around", "inside", "outside", "lost", "found", "please"
]);

const SYNONYMS = {
  phone: "mobile",
  smartphone: "mobile",
  cellphone: "mobile",
  iphone: "mobile",

  bag: "backpack",
  schoolbag: "backpack",
  rucksack: "backpack",

  earbuds: "earphones",
  headphone: "earphones",
  headphones: "earphones",
  earbud: "earphones",

  case: "cover",
  pouch: "cover",

  id: "identity",
  card: "identity",
  identitycard: "identity",
  license: "identity",
  licence: "identity",

  bottle: "waterbottle",
  flask: "waterbottle",

  laptop: "computer",
  notebook: "computer",

  charger: "adapter",
  cable: "adapter",
  powerbank: "adapter",

  specs: "glasses",
  spectacles: "glasses",

  keys: "key",
  keychain: "key"
};

const CATEGORY_RULES = {
  Electronics: [
    "laptop", "computer", "phone", "mobile", "smartphone", "iphone",
    "tablet", "charger", "adapter", "cable", "earbuds", "earphones",
    "headphones", "usb", "powerbank", "mouse", "keyboard"
  ],

  Documents: [
    "id", "identity", "card", "license", "licence", "passport",
    "document", "certificate", "hall", "ticket", "aadhar", "aadhaar",
    "pan", "marksheet"
  ],

  Accessories: [
    "watch", "wallet", "bag", "backpack", "bottle", "waterbottle",
    "keys", "key", "keychain", "purse", "cover", "case",
    "umbrella", "glasses", "specs", "spectacles"
  ],

  Clothing: [
    "jacket", "hoodie", "shirt", "shoe", "shoes", "cap",
    "sweater", "coat", "tshirt", "t", "jeans"
  ],

  Stationery: [
    "notebook", "book", "pen", "pencil", "calculator",
    "register", "diary", "file"
  ],

  Other: [],
};

const COLORS = [
  "black", "white", "blue", "red", "green", "yellow", "pink",
  "brown", "grey", "gray", "silver", "golden", "gold", "orange", "purple"
];

const BRANDS = [
  "apple", "iphone", "samsung", "oneplus", "redmi", "vivo", "oppo",
  "hp", "dell", "lenovo", "asus", "acer", "boat", "jbl",
  "nike", "adidas", "puma", "milton", "cello", "casio"
];

function normalize(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeToken(token) {
  return SYNONYMS[token] || token;
}

function tokenize(text) {
  return normalize(text)
    .split(" ")
    .filter((token) => token && !STOPWORDS.has(token))
    .map(normalizeToken);
}

function tokenMap(tokens) {
  const map = new Map();

  for (const token of tokens) {
    map.set(token, (map.get(token) || 0) + 1);
  }

  return map;
}

function cosineSimilarity(textA, textB) {
  const tokensA = tokenize(textA);
  const tokensB = tokenize(textB);

  if (!tokensA.length || !tokensB.length) return 0;

  const mapA = tokenMap(tokensA);
  const mapB = tokenMap(tokensB);

  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (const value of mapA.values()) {
    normA += value * value;
  }

  for (const [token, value] of mapB.entries()) {
    normB += value * value;

    if (mapA.has(token)) {
      dot += value * mapA.get(token);
    }
  }

  if (!normA || !normB) return 0;

  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

function tokenOverlapScore(textA, textB) {
  const setA = new Set(tokenize(textA));
  const setB = new Set(tokenize(textB));

  if (!setA.size || !setB.size) return 0;

  let common = 0;

  for (const token of setA) {
    if (setB.has(token)) common++;
  }

  return common / Math.max(setA.size, setB.size);
}

function locationScore(locationA, locationB) {
  const a = normalize(locationA);
  const b = normalize(locationB);

  if (!a || !b) return 0;

  if (a === b) return 1;

  if (a.includes(b) || b.includes(a)) return 0.8;

  return tokenOverlapScore(a, b);
}

function dateProximityScore(primaryDate, secondaryDate) {
  if (!primaryDate || !secondaryDate) return 0.3;

  const d1 = new Date(primaryDate);
  const d2 = new Date(secondaryDate);

  if (Number.isNaN(d1.getTime()) || Number.isNaN(d2.getTime())) return 0.3;

  const diffMs = Math.abs(d2.getTime() - d1.getTime());
  const diffDays = diffMs / (24 * 60 * 60 * 1000);

  if (diffDays <= 1) return 1;
  if (diffDays <= 3) return 0.85;
  if (diffDays <= 7) return 0.65;
  if (diffDays <= 15) return 0.4;

  return 0.15;
}

function suggestCategory({ item_name, description }) {
  const tokens = tokenize(`${item_name || ""} ${description || ""}`);
  const tokenSet = new Set(tokens);

  let bestCategory = "Other";
  let bestScore = 0;

  for (const [category, keywords] of Object.entries(CATEGORY_RULES)) {
    if (category === "Other") continue;

    let score = 0;

    for (const keyword of keywords) {
      const normalizedKeyword = normalizeToken(normalize(keyword));
      if (tokenSet.has(normalizedKeyword)) {
        score++;
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestCategory = category;
    }
  }

  return bestCategory;
}

function keywordBoost(textA, textB, keywords) {
  const tokensA = new Set(tokenize(textA));
  const tokensB = new Set(tokenize(textB));

  let common = 0;

  for (const word of keywords) {
    const normalizedWord = normalizeToken(word);

    if (tokensA.has(normalizedWord) && tokensB.has(normalizedWord)) {
      common++;
    }
  }

  return Math.min(1, common / 2);
}

function confidenceLabel(score) {
  if (score >= 0.82) return "High";
  if (score >= 0.68) return "Medium";
  if (score >= 0.55) return "Low";
  return "Unlikely";
}

function explainMatch(components) {
  const lines = [];

  lines.push(`Item similarity ${Math.round(components.itemName * 100)}%`);
  lines.push(`Description similarity ${Math.round(components.description * 100)}%`);
  lines.push(`Location relevance ${Math.round(components.location * 100)}%`);
  lines.push(`Date proximity ${Math.round(components.date * 100)}%`);

  if (components.category === 1) {
    lines.push("Category aligned");
  } else {
    lines.push("Category not aligned");
  }

  if (components.color > 0) {
    lines.push(`Color matched ${Math.round(components.color * 100)}%`);
  }

  if (components.brand > 0) {
    lines.push(`Brand matched ${Math.round(components.brand * 100)}%`);
  }

  return lines.join(" | ");
}

function hybridMatchScore(lostItem, foundItem) {
  const lostFullText = `${lostItem.item_name || ""} ${lostItem.description || ""}`;
  const foundFullText = `${foundItem.item_name || ""} ${foundItem.description || ""}`;

  const itemName = Math.max(
    cosineSimilarity(lostItem.item_name, foundItem.item_name),
    tokenOverlapScore(lostItem.item_name, foundItem.item_name)
  );

  const description = Math.max(
    cosineSimilarity(lostFullText, foundFullText),
    tokenOverlapScore(lostFullText, foundFullText)
  );

  const location = locationScore(lostItem.location, foundItem.location);
  const date = dateProximityScore(lostItem.date_lost, foundItem.date_found);

  const lostCategory = lostItem.category || suggestCategory(lostItem);
  const foundCategory = foundItem.category || suggestCategory(foundItem);
  const category = lostCategory === foundCategory ? 1 : 0;

  const color = keywordBoost(lostFullText, foundFullText, COLORS);
  const brand = keywordBoost(lostFullText, foundFullText, BRANDS);

  let score =
    0.30 * itemName +
    0.27 * description +
    0.18 * location +
    0.10 * date +
    0.05 * category +
    0.05 * color +
    0.05 * brand;

  // Safety penalty:
  // If category is different and item name is very weak, reduce false matches.
  if (category === 0 && itemName < 0.25) {
    score *= 0.75;
  }

  score = Math.min(1, score);

  const components = {
    itemName,
    description,
    location,
    date,
    category,
    color,
    brand,
  };

  return {
    score,
    confidence: confidenceLabel(score),
    explanation: explainMatch(components),
    components,
    autoMatch: score >= 0.75,
    category: lostCategory,
  };
}

function buildReportFeedback({ item_name, description, location, date }) {
  const suggestions = [];
  let score = 0;

  const cleanName = normalize(item_name);
  const cleanDescription = normalize(description);
  const cleanLocation = normalize(location);

  if (cleanName.length >= 3) score += 20;
  else suggestions.push("Use a clearer item name, for example: black HP laptop.");

  const descriptionTokens = tokenize(cleanDescription);

  if (descriptionTokens.length >= 10) score += 30;
  else suggestions.push("Add more details: color, brand, size, stickers, scratches, serial marks.");

  const hasColor = COLORS.some((color) => cleanDescription.includes(color));
  const hasBrand = BRANDS.some((brand) => cleanDescription.includes(brand));

  if (hasColor || hasBrand) score += 20;
  else suggestions.push("Mention color or brand for better matching.");

  if (cleanLocation.length >= 4) score += 20;
  else suggestions.push("Use a specific location, like building + floor + room/canteen/library.");

  if (date && !Number.isNaN(new Date(date).getTime())) score += 10;
  else suggestions.push("Provide an accurate date or time window.");

  return {
    strengthScore: Math.min(100, score),
    rating: score >= 80 ? "Strong" : score >= 60 ? "Good" : score >= 40 ? "Average" : "Weak",
    suggestions,
  };
}

const FAQ = [
  {
    q: "How do I claim a matched item?",
    a: "Open your matches and contact support with proof details such as ID, item-specific marks, and report timestamp.",
  },
  {
    q: "What if my item is not matched yet?",
    a: "Keep your report detailed and check periodically. New found reports are re-checked automatically.",
  },
  {
    q: "Can institutions verify ownership?",
    a: "Yes. Institutions can verify ownership using claim questions and unique item identifiers before handover.",
  },
  {
    q: "How is matching decided?",
    a: "KHOJ uses a hybrid score from item name similarity, description similarity, location relevance, date proximity, category, color, and brand signals.",
  },
];

function answerFaq(message) {
  const scored = FAQ.map((entry) => ({
    ...entry,
    score: cosineSimilarity(message, entry.q),
  })).sort((a, b) => b.score - a.score);

  const top = scored[0];

  if (!top || top.score < 0.2) {
    return {
      answer:
        "I can help with lost/found reporting, matching confidence, and claim guidance. Try asking about claim process, match scoring, or what details to include.",
      matchedQuestion: null,
      confidence: "Low",
    };
  }

  return {
    answer: top.a,
    matchedQuestion: top.q,
    confidence: top.score > 0.55 ? "High" : "Medium",
  };
}

module.exports = {
  hybridMatchScore,
  buildReportFeedback,
  suggestCategory,
  answerFaq,
};