import { Book, BookConnection } from "@/types/book";

export async function analyzeBookConnections(books: Book[]): Promise<BookConnection[]> {
  const connections: BookConnection[] = [];
  
  // Analyze connections based only on book descriptions
  for (let i = 0; i < books.length; i++) {
    for (let j = i + 1; j < books.length; j++) {
      const book1 = books[i];
      const book2 = books[j];
      
      // Only analyze if both books have descriptions
      if (!book1.description || !book2.description) {
        continue;
      }
      
      // Extract keywords and themes from descriptions
      const keywords1 = extractKeywords(book1.description);
      const keywords2 = extractKeywords(book2.description);
      const themes1 = extractThemes(book1.description);
      const themes2 = extractThemes(book2.description);
      
      // Find common elements
      const commonKeywords = keywords1.filter(k => keywords2.includes(k));
      const commonThemes = themes1.filter(t => themes2.includes(t));
      
      // Calculate connection strength
      let strength = 0;
      const reasons: string[] = [];
      
      // Keywords give moderate weight
      if (commonKeywords.length > 0) {
        strength += Math.min(commonKeywords.length * 0.12, 0.5);
        if (commonKeywords.length >= 2) {
          reasons.push(`Similar concepts: ${commonKeywords.slice(0, 3).join(", ")}`);
        }
      }
      
      // Themes give higher weight
      if (commonThemes.length > 0) {
        strength += Math.min(commonThemes.length * 0.25, 0.6);
        reasons.push(`Common themes: ${commonThemes.slice(0, 2).join(", ")}`);
      }
      
      // Add connection if there's any meaningful overlap
      if (strength > 0.1 && reasons.length > 0) {
        connections.push({
          source: book1.id,
          target: book2.id,
          strength: Math.min(strength, 1),
          reason: reasons.join(" • "),
        });
      }
    }
  }
  
  return connections;
}

function extractKeywords(text: string): string[] {
  // Enhanced keyword extraction with better filtering
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
  
  // Count word frequency
  const frequency = new Map<string, number>();
  words.forEach(word => {
    frequency.set(word, (frequency.get(word) || 0) + 1);
  });
  
  // Return most frequent meaningful words
  return Array.from(frequency.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 30)
    .map(([word]) => word);
}

function extractThemes(text: string): string[] {
  // Extract thematic elements from text
  const themePatterns = [
    // Common narrative themes
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
