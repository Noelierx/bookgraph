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
      
      const keywords1 = extractKeywords(book1.description);
      const keywords2 = extractKeywords(book2.description);
      const commonKeywords = keywords1.filter(k => keywords2.includes(k));
      
      // Calculate connection strength based on shared themes
      if (commonKeywords.length > 2) {
        const strength = Math.min(commonKeywords.length * 0.15, 1);
        const topKeywords = commonKeywords.slice(0, 3);
        
        connections.push({
          source: book1.id,
          target: book2.id,
          strength,
          reason: `Common themes: ${topKeywords.join(", ")}`,
        });
      }
    }
  }
  
  return connections;
}

function extractKeywords(text: string): string[] {
  // Simple keyword extraction
  const commonWords = new Set(["the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for", "of", "with", "by", "from", "as", "is", "was", "are", "were", "been", "be", "have", "has", "had", "do", "does", "did", "will", "would", "could", "should", "may", "might", "must", "can", "this", "that", "these", "those", "it", "he", "she", "they", "we", "you", "i"]);
  
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter(word => word.length > 4 && !commonWords.has(word))
    .slice(0, 20);
}
