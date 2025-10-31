import { Book, BookConnection, RelationshipType } from "@/types/book";
import { trExtractKeywords } from "./textRankService";

export async function analyzeBookConnections(books: Book[]): Promise<BookConnection[]> {
  const connections: BookConnection[] = [];

  const extracts = books.map(b => {
    const text = b.description || "";
    const keywords = trExtractKeywords(text, 30, 4);
    const themes = extractThemes(text);
    const plots = extractPlotElements(text);
    return { id: b.id, keywords, themes, plots };
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

const e1 = extracts.find(x => x.id === book1.id) || { keywords: [], themes: [], plots: [] };
const e2 = extracts.find(x => x.id === book2.id) || { keywords: [], themes: [], plots: [] };
const commonKeywords = e1.keywords.filter(k => e2.keywords.includes(k));
const commonThemes = e1.themes.filter(t => e2.themes.includes(t));
const commonPlots = e1.plots.filter(p => e2.plots.includes(p));

console.log(`[analyze.compare] ${book1.id}("${book1.title}") <> ${book2.id}("${book2.title}")`);
console.log(`[analyze.compare] commonSubjects=${JSON.stringify(commonSubjects || [])} commonKeywords=${JSON.stringify(commonKeywords)} commonThemes=${JSON.stringify(commonThemes)} commonPlots=${JSON.stringify(commonPlots)}`);

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
      }
      if (strength > 0.1 && reasons.length > 0) {
        const connectionType: RelationshipType = types.length === 1 ? types[0] : "mixed";
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
