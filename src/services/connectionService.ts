import { Book, BookConnection, RelationshipType } from "@/types/book";

export async function analyzeBookConnections(books: Book[]): Promise<BookConnection[]> {
  const connections: BookConnection[] = [];

  const extracts = books.map(b => {
    const text = b.description || "";
    const keywords = extractKeywords(text);
    const themes = extractThemes(text);
    const plots = extractPlotElements(text);
    const contrastingWords = extractContrastingWords(text);
    return { id: b.id, keywords, themes, plots, contrastingWords };
  });

  for (let i = 0; i < books.length; i++) {
    for (let j = i + 1; j < books.length; j++) {
      const book1 = books[i];
      const book2 = books[j];
      
      let strength = 0;
      const reasons: string[] = [];
      const types: RelationshipType[] = [];
      
let commonSubjects: string[] = [];
if (book1.subjects && book2.subjects && book1.subjects.length > 0 && book2.subjects.length > 0) {
  commonSubjects = book1.subjects.filter(s => 
    book2.subjects?.some(s2 => s.toLowerCase() === s2.toLowerCase())
  );
  if (commonSubjects.length > 0) {
    strength += Math.min(commonSubjects.length * 0.3, 0.7);
    reasons.push(`Common subjects: ${commonSubjects.slice(0, 3).join(", ")}`);
    types.push("common-subjects");
  }
}

const e1 = extracts.find(x => x.id === book1.id) || { keywords: [], themes: [], plots: [], contrastingWords: [] };
const e2 = extracts.find(x => x.id === book2.id) || { keywords: [], themes: [], plots: [], contrastingWords: [] };
const commonKeywords = e1.keywords.filter(k => e2.keywords.includes(k));
const commonThemes = e1.themes.filter(t => e2.themes.includes(t));
const commonPlots = e1.plots.filter(p => e2.plots.includes(p));
const contrastingPairs = findContrastingPairs(e1.contrastingWords, e2.contrastingWords);

console.log(`[analyze.compare] ${book1.id}("${book1.title}") <> ${book2.id}("${book2.title}")`);
console.log(`[analyze.compare] commonSubjects=${JSON.stringify(commonSubjects || [])} commonKeywords=${JSON.stringify(commonKeywords)} commonThemes=${JSON.stringify(commonThemes)} commonPlots=${JSON.stringify(commonPlots)} contrastingPairs=${JSON.stringify(contrastingPairs)}`);

if (book1.description && book2.description) {
        if (commonKeywords.length > 0) {
          strength += Math.min(commonKeywords.length * 0.12, 0.5);
          if (commonKeywords.length >= 2) {
            reasons.push(`Similar concepts: ${commonKeywords.slice(0, 3).join(", ")}`);
            types.push("similar-concepts");
          }
        }
        if (commonThemes.length > 0) {
          strength += Math.min(commonThemes.length * 0.25, 0.6);
          reasons.push(`Common themes: ${commonThemes.slice(0, 2).join(", ")}`);
          types.push("similar-themes");
        }
        if (commonPlots.length > 0) {
          strength += Math.min(commonPlots.length * 0.2, 0.5);
          reasons.push(`Similar plot elements: ${commonPlots.slice(0, 2).join(", ")}`);
          types.push("similar-plots");
        }
        if (contrastingPairs.length > 0) {
          strength += Math.min(contrastingPairs.length * 0.15, 0.4);
          reasons.push(`Contrasting ideas: ${contrastingPairs.slice(0, 2).map(p => `${p[0]}↔${p[1]}`).join(", ")}`);
          types.push("contrasting-ideas");
        }
      }
      if (strength > 0.1 && reasons.length > 0) {
        const connectionType = determineConnectionType(types);
        connections.push({
          source: book1.id,
          target: book2.id,
          strength: Math.min(strength, 1),
          reason: reasons.join(" • "),
          type: connectionType,
        });
      }
    }
  }
  
  return connections;
}

function determineConnectionType(types: RelationshipType[]): RelationshipType {
  if (types.length === 0) return "mixed";
  if (types.length === 1) return types[0];
  
  // If multiple types, prioritize certain types or mark as mixed
  if (types.includes("contrasting-ideas")) return "contrasting-ideas";
  if (types.includes("similar-themes")) return "similar-themes";
  if (types.includes("similar-plots")) return "similar-plots";
  if (types.includes("similar-concepts")) return "similar-concepts";
  if (types.includes("common-subjects")) return "common-subjects";
  
  return "mixed";
}

function extractKeywords(text: string): string[] {
  const commonWords = new Set([
    "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for", "of", "with", 
    "by", "from", "as", "is", "was", "are", "were", "been", "be", "have", "has", "had",
    "do", "does", "did", "will", "would", "could", "should", "may", "might", "must", "can",
    "this", "that", "these", "those", "it", "he", "she", "they", "we", "you", "i", "his",
    "her", "their", "our", "your", "into", "through", "during", "before", "after", "above",
    "below", "between", "under", "again", "further", "then", "once", "here", "there", "when",
    "where", "why", "how", "all", "both", "each", "few", "more", "most", "other", "some",
    "such", "only", "own", "same", "than", "too", "very", "about", "which", "who", "what",
  ]);
  
  const words = text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter(word => word.length > 3 && !commonWords.has(word));
  
  const frequency = new Map<string, number>();
  words.forEach(word => {
    frequency.set(word, (frequency.get(word) || 0) + 1);
  });
  
  return Array.from(frequency.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 30)
    .map(([word]) => word);
}

function extractThemes(text: string): string[] {
  const themePatterns = [
    /\b(love|romance|relationship|family|friendship|loyalty|betrayal)\b/gi,
    /\b(war|battle|conflict|fight|struggle|violence|peace)\b/gi,
    /\b(mystery|detective|crime|murder|investigation|thriller)\b/gi,
    /\b(magic|fantasy|wizard|dragon|quest|adventure|journey)\b/gi,
    /\b(science|technology|space|future|robot|alien|time)\b/gi,
    /\b(horror|fear|terror|ghost|monster|supernatural|dark)\b/gi,
    /\b(power|politics|king|queen|empire|throne|rule)\b/gi,
    /\b(death|life|survival|hope|loss|grief|rebirth)\b/gi,
    /\b(identity|self|memory|past|secret|truth|lie)\b/gi,
    /\b(society|culture|class|revolution|rebellion|freedom)\b/gi,
    /\b(nature|world|earth|environment|animal|wild)\b/gi,
    /\b(religion|god|faith|belief|spiritual|divine)\b/gi,
  ];
  
  const themes = new Set<string>();
  const lowerText = text.toLowerCase();
  
  themePatterns.forEach(pattern => {
    const matches = lowerText.match(pattern);
    if (matches) {
      matches.forEach(match => themes.add(match.toLowerCase()));
    }
  });
  
  return Array.from(themes);
}

function extractPlotElements(text: string): string[] {
  const plotPatterns = [
    /\b(journey|quest|mission|adventure|voyage|expedition)\b/gi,
    /\b(discovery|revelation|secret|mystery|truth)\b/gi,
    /\b(conflict|struggle|fight|battle|war|confrontation)\b/gi,
    /\b(escape|rescue|save|protect|defend)\b/gi,
    /\b(revenge|betrayal|deception|conspiracy|plot)\b/gi,
    /\b(transformation|change|growth|development|evolution)\b/gi,
    /\b(sacrifice|loss|redemption|forgiveness)\b/gi,
    /\b(romance|love|relationship|marriage|affair)\b/gi,
    /\b(investigation|detective|crime|murder|mystery)\b/gi,
    /\b(survival|danger|threat|peril|risk)\b/gi,
    /\b(power|throne|kingdom|empire|rule|reign)\b/gi,
    /\b(rebellion|revolution|uprising|resistance)\b/gi,
  ];
  
  const plotElements = new Set<string>();
  const lowerText = text.toLowerCase();
  
  plotPatterns.forEach(pattern => {
    const matches = lowerText.match(pattern);
    if (matches) {
      matches.forEach(match => plotElements.add(match.toLowerCase()));
    }
  });
  
  return Array.from(plotElements);
}

function extractContrastingWords(text: string): string[] {
  const contrastingPatterns = [
    /\b(light|dark|darkness|bright|shadow)\b/gi,
    /\b(good|evil|bad|virtue|vice)\b/gi,
    /\b(hope|despair|hopeless|hopeful)\b/gi,
    /\b(order|chaos|chaotic|organized)\b/gi,
    /\b(freedom|slavery|oppression|liberty)\b/gi,
    /\b(life|death|living|dying)\b/gi,
    /\b(truth|lie|lies|deception|honest)\b/gi,
    /\b(love|hate|hatred|affection)\b/gi,
    /\b(peace|war|warfare|conflict)\b/gi,
    /\b(rich|poor|wealth|poverty)\b/gi,
    /\b(strong|weak|strength|weakness)\b/gi,
    /\b(progress|regression|advancement|decline)\b/gi,
  ];
  
  const words = new Set<string>();
  const lowerText = text.toLowerCase();
  
  contrastingPatterns.forEach(pattern => {
    const matches = lowerText.match(pattern);
    if (matches) {
      matches.forEach(match => words.add(match.toLowerCase()));
    }
  });
  
  return Array.from(words);
}

function findContrastingPairs(words1: string[], words2: string[]): [string, string][] {
  const contrastPairs: { [key: string]: string[] } = {
    'light': ['dark', 'darkness', 'shadow'],
    'dark': ['light', 'bright'],
    'good': ['evil', 'bad'],
    'evil': ['good', 'virtue'],
    'hope': ['despair', 'hopeless'],
    'despair': ['hope', 'hopeful'],
    'order': ['chaos', 'chaotic'],
    'chaos': ['order', 'organized'],
    'freedom': ['slavery', 'oppression'],
    'slavery': ['freedom', 'liberty'],
    'life': ['death', 'dying'],
    'death': ['life', 'living'],
    'truth': ['lie', 'lies', 'deception'],
    'lie': ['truth', 'honest'],
    'love': ['hate', 'hatred'],
    'hate': ['love', 'affection'],
    'peace': ['war', 'warfare', 'conflict'],
    'war': ['peace'],
    'rich': ['poor', 'poverty'],
    'poor': ['rich', 'wealth'],
    'strong': ['weak', 'weakness'],
    'weak': ['strong', 'strength'],
    'progress': ['regression', 'decline'],
    'regression': ['progress', 'advancement'],
  };
  
  const pairs: [string, string][] = [];
  
  for (const word1 of words1) {
    if (contrastPairs[word1]) {
      for (const word2 of words2) {
        if (contrastPairs[word1].includes(word2)) {
          pairs.push([word1, word2]);
        }
      }
    }
  }
  
  return pairs;
}
