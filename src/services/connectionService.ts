import { Book, BookConnection } from "@/types/book";

export async function analyzeBookConnections(books: Book[]): Promise<BookConnection[]> {
  const connections: BookConnection[] = [];
  
  // Simple local analysis based on shared subjects and themes
  for (let i = 0; i < books.length; i++) {
    for (let j = i + 1; j < books.length; j++) {
      const book1 = books[i];
      const book2 = books[j];
      
      // Check for shared subjects
      const sharedSubjects = book1.subjects?.filter(s => 
        book2.subjects?.some(s2 => s2.toLowerCase() === s.toLowerCase())
      ) || [];
      
      // Check for same author
      const sameAuthor = book1.author.toLowerCase() === book2.author.toLowerCase();
      
      // Calculate connection strength
      let strength = 0;
      let reasons: string[] = [];
      
      if (sameAuthor) {
        strength += 0.8;
        reasons.push("Same author");
      }
      
      if (sharedSubjects.length > 0) {
        strength += Math.min(sharedSubjects.length * 0.2, 0.6);
        reasons.push(`Shared topics: ${sharedSubjects.slice(0, 2).join(", ")}`);
      }
      
      // Check for keywords in descriptions
      if (book1.description && book2.description) {
        const keywords1 = extractKeywords(book1.description);
        const keywords2 = extractKeywords(book2.description);
        const commonKeywords = keywords1.filter(k => keywords2.includes(k));
        
        if (commonKeywords.length > 2) {
          strength += Math.min(commonKeywords.length * 0.1, 0.4);
          reasons.push("Similar themes");
        }
      }
      
      if (strength > 0.3) {
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
  // Simple keyword extraction
  const commonWords = new Set(["the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for", "of", "with", "by", "from", "as", "is", "was", "are", "were", "been", "be", "have", "has", "had", "do", "does", "did", "will", "would", "could", "should", "may", "might", "must", "can", "this", "that", "these", "those", "it", "he", "she", "they", "we", "you", "i"]);
  
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter(word => word.length > 4 && !commonWords.has(word))
    .slice(0, 20);
}
