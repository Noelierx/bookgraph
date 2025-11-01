import { Book, BookConnection, RelationshipType } from "@/types/book";
import { trExtractKeywords, detectLanguage } from "./textRankService";
import { enrichBook } from "./enrichmentService";

interface BookAnalysis {
  id: string;
  language: string;
  keywords: string[];
  themes: string[];
  plots: string[];
}

export async function analyzeBookConnectionsWithEnrichment(
  books: Book[], 
  onProgress?: (current: number, total: number, message: string) => void
): Promise<{ connections: BookConnection[], enrichedBooks: Book[] }> {
  const enrichedBooks: Book[] = [];
  
  for (let i = 0; i < books.length; i++) {
    const book = books[i];
    onProgress?.(i + 1, books.length, `Enriching "${book.title}"...`);
    
    try {
      if (!book.description || !book.subjects?.length || !book.coverUrl) {
        const enrichedBook = await enrichBook(book);
        enrichedBooks.push(enrichedBook);
      } else {
        enrichedBooks.push(book);
      }
    } catch (error) {
      console.error(`Error enriching book "${book.title}":`, error);
      enrichedBooks.push(book);
    }
    
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  onProgress?.(books.length, books.length, "Analyzing connections...");
  
  const connections = await analyzeBookConnections(enrichedBooks);
  
  return { connections, enrichedBooks };
}

export async function analyzeBookConnections(books: Book[]): Promise<BookConnection[]> {
  const connections: BookConnection[] = [];

  const bookMap = new Map<string, Book>();
  books.forEach(book => bookMap.set(book.id, book));

  const extracts: BookAnalysis[] = books.map(b => {
    const text = b.description || "";
    const language = detectLanguage(text);
    const keywords = trExtractKeywords(text, 30, 4, language);
    const themes = extractThemes(text, language);
    const plots = extractPlotElements(text, language);
    return { id: b.id, language, keywords, themes, plots };
  });

  const englishBooks = extracts.filter(e => e.language === 'en');
  const otherLanguageBooks = extracts.filter(e => e.language !== 'en' && e.language !== 'unknown');

  for (let i = 0; i < englishBooks.length; i++) {
    for (let j = i + 1; j < englishBooks.length; j++) {
      const bookAnalysis1 = englishBooks[i];
      const bookAnalysis2 = englishBooks[j];
      const book1 = bookMap.get(bookAnalysis1.id)!;
      const book2 = bookMap.get(bookAnalysis2.id)!;
      
      const connection = analyzeBookPair(book1, book2, bookAnalysis1, bookAnalysis2, 1.0);
      if (connection) connections.push(connection);
    }
  }

  for (const engBook of englishBooks) {
    for (const otherBook of otherLanguageBooks) {
      const book1 = bookMap.get(engBook.id)!;
      const book2 = bookMap.get(otherBook.id)!;
      
      const connection = analyzeBookPair(book1, book2, engBook, otherBook, 0.8);
      if (connection) connections.push(connection);
    }
  }

  const languageGroups = new Map<string, BookAnalysis[]>();
  otherLanguageBooks.forEach(book => {
    if (!languageGroups.has(book.language)) {
      languageGroups.set(book.language, []);
    }
    languageGroups.get(book.language)!.push(book);
  });

  for (const [language, languageBooks] of languageGroups) {
    if (language === 'unknown') continue;
    
    for (let i = 0; i < languageBooks.length; i++) {
      for (let j = i + 1; j < languageBooks.length; j++) {
        const bookAnalysis1 = languageBooks[i];
        const bookAnalysis2 = languageBooks[j];
        const book1 = bookMap.get(bookAnalysis1.id)!;
        const book2 = bookMap.get(bookAnalysis2.id)!;
        
        const connection = analyzeBookPair(book1, book2, bookAnalysis1, bookAnalysis2, 0.9);
        if (connection) connections.push(connection);
      }
    }
  }
  
  return connections;
}

const GENERIC_SUBJECTS = new Set([
]);

function getSpecificSubjects(subjects: string[]): string[] {
  const specificSubjects: string[] = [];
  
  for (const subject of subjects) {
    const normalized = subject.toLowerCase().trim();
    
    if (isGenericSubject(subject)) {
      continue;
    }
    
    if (normalized.includes('fiction') && normalized !== 'fiction') {
      specificSubjects.push(subject);
    } else if (normalized.includes('literature') && normalized !== 'literature') {
      specificSubjects.push(subject);
    } else if (normalized.length > 3 && !normalized.match(/^\d+$/)) {
      specificSubjects.push(subject);
    }
  }
  
  return specificSubjects;
}

function isGenericSubject(subject: string): boolean {
  const normalized = subject.toLowerCase().trim();
  return GENERIC_SUBJECTS.has(normalized) || 
         normalized.length < 3 ||
         /^\d+$/.test(normalized);
}

function analyzeBookPair(
  book1: Book, 
  book2: Book, 
  analysis1: BookAnalysis, 
  analysis2: BookAnalysis, 
  languageMultiplier: number
): BookConnection | null {
  let strength = 0;
  const reasons: string[] = [];
  const types: RelationshipType[] = [];
  
  let commonSubjects: string[] = [];
  if (book1.subjects && book2.subjects && book1.subjects.length > 0 && book2.subjects.length > 0) {
    const specificSubjects1 = getSpecificSubjects(book1.subjects);
    const specificSubjects2 = getSpecificSubjects(book2.subjects);
    
    commonSubjects = specificSubjects1.filter(s => 
      specificSubjects2.some(s2 => s.toLowerCase() === s2.toLowerCase())
    );
    
    if (commonSubjects.length > 0) {
      strength += Math.min(commonSubjects.length * 0.2, 0.5);
      const subjectList = commonSubjects.length > 4 
        ? `${commonSubjects.slice(0, 4).join(", ")} (and ${commonSubjects.length - 4} more)`
        : commonSubjects.join(", ");
      reasons.push(`Common subjects (${commonSubjects.length}): ${subjectList}`);
      types.push("common-subjects");
    }
  }

  if (book1.description && book2.description) {
    const commonKeywords = analysis1.keywords.filter(k => analysis2.keywords.includes(k));
    const commonThemes = analysis1.themes.filter(t => analysis2.themes.includes(t));
    const commonPlots = analysis1.plots.filter(p => analysis2.plots.includes(p));

    if (commonKeywords.length > 0) {
      const keywordStrength = Math.min(commonKeywords.length * 0.12, 0.5);
      strength += keywordStrength;
      
      if (commonKeywords.length >= 2) {
        const keywordList = commonKeywords.length > 4 
          ? `${commonKeywords.slice(0, 4).join(", ")} (and ${commonKeywords.length - 4} more)`
          : commonKeywords.join(", ");
        reasons.push(`Similar concepts (${commonKeywords.length}): ${keywordList}`);
        types.push("similar-concepts");
      }
    }
    
    if (commonThemes.length > 0) {
      strength += Math.min(commonThemes.length * 0.25, 0.6);
      const themeList = commonThemes.length > 3 
        ? `${commonThemes.slice(0, 3).join(", ")} (and ${commonThemes.length - 3} more)`
        : commonThemes.join(", ");
      reasons.push(`Common themes (${commonThemes.length}): ${themeList}`);
      types.push("similar-themes");
    }
    
    if (commonPlots.length > 0) {
      strength += Math.min(commonPlots.length * 0.2, 0.5);
      const plotList = commonPlots.length > 3 
        ? `${commonPlots.slice(0, 3).join(", ")} (and ${commonPlots.length - 3} more)`
        : commonPlots.join(", ");
      reasons.push(`Similar plot elements (${commonPlots.length}): ${plotList}`);
      types.push("similar-plots");
    }
  }

  strength *= languageMultiplier;
  
  if (analysis1.language !== analysis2.language && analysis1.language !== 'unknown' && analysis2.language !== 'unknown') {
    const langNames = { en: 'English', fr: 'French', es: 'Spanish', de: 'German' };
    const lang1Name = langNames[analysis1.language as keyof typeof langNames] || analysis1.language;
    const lang2Name = langNames[analysis2.language as keyof typeof langNames] || analysis2.language;
    reasons.push(`Cross-language connection (${lang1Name}-${lang2Name})`);
  }
  
  if (strength > 0.1 && reasons.length > 0) {
    let connectionType: RelationshipType;
    
    if (types.length === 1) {
      connectionType = types[0];
    } else if (types.length >= 2) {
      const typeStrengths = new Map<RelationshipType, number>();
      
      if (types.includes("common-subjects") && commonSubjects.length > 0) {
        typeStrengths.set("common-subjects", Math.min(commonSubjects.length * 0.2, 0.5));
      }
      if (types.includes("similar-themes") && book1.description && book2.description) {
        const commonThemes = analysis1.themes.filter(t => analysis2.themes.includes(t));
        typeStrengths.set("similar-themes", Math.min(commonThemes.length * 0.25, 0.6));
      }
      if (types.includes("similar-concepts") && book1.description && book2.description) {
        const commonKeywords = analysis1.keywords.filter(k => analysis2.keywords.includes(k));
        typeStrengths.set("similar-concepts", Math.min(commonKeywords.length * 0.12, 0.5));
      }
      if (types.includes("similar-plots") && book1.description && book2.description) {
        const commonPlots = analysis1.plots.filter(p => analysis2.plots.includes(p));
        typeStrengths.set("similar-plots", Math.min(commonPlots.length * 0.2, 0.5));
      }
      
      let maxStrength = 0;
      let dominantType: RelationshipType = types[0];
      
      for (const [type, str] of typeStrengths) {
        if (str > maxStrength) {
          maxStrength = str;
          dominantType = type;
        }
      }
      
      connectionType = dominantType;
    } else {
      connectionType = "similar-concepts";
    }
    
    return {
      source: book1.id,
      target: book2.id,
      strength: Math.min(strength, 1),
      reason: reasons.join(" • "),
      type: connectionType,
    };
  }
  
  return null;
}

function extractThemes(text: string, language: string = 'en'): string[] {
  const themePatterns = {
    en: [
      /(?<!\S)(love|romance|relationship|family|friendship|loyalty|betrayal)(?=\s|$)/giu,
      /(?<!\S)(war|battle|conflict|fight|struggle|violence|peace)(?=\s|$)/giu,
      /(?<!\S)(mystery|detective|crime|murder|investigation|thriller)(?=\s|$)/giu,
      /(?<!\S)(magic|fantasy|wizard|dragon|quest|adventure|journey)(?=\s|$)/giu,
      /(?<!\S)(science|technology|space|future|robot|alien|time)(?=\s|$)/giu,
      /(?<!\S)(horror|fear|terror|ghost|monster|supernatural|dark)(?=\s|$)/giu,
      /(?<!\S)(power|politics|king|queen|empire|throne|rule)(?=\s|$)/giu,
      /(?<!\S)(death|life|survival|hope|loss|grief|rebirth)(?=\s|$)/giu,
      /(?<!\S)(identity|self|memory|past|secret|truth|lie)(?=\s|$)/giu,
      /(?<!\S)(society|culture|class|revolution|rebellion|freedom)(?=\s|$)/giu,
      /(?<!\S)(nature|world|earth|environment|animal|wild)(?=\s|$)/giu,
      /(?<!\S)(religion|god|faith|belief|spiritual|divine)(?=\s|$)/giu,
    ],
    fr: [
      /(?<!\S)(amour|romance|relation|famille|amitié|loyauté|trahison)(?=\s|$)/giu,
      /(?<!\S)(guerre|bataille|conflit|combat|lutte|violence|paix)(?=\s|$)/giu,
      /(?<!\S)(mystère|détective|crime|meurtre|enquête|thriller)(?=\s|$)/giu,
      /(?<!\S)(magie|fantaisie|sorcier|dragon|quête|aventure|voyage)(?=\s|$)/giu,
      /(?<!\S)(science|technologie|espace|futur|robot|alien|temps)(?=\s|$)/giu,
      /(?<!\S)(horreur|peur|terreur|fantôme|monstre|surnaturel|sombre)(?=\s|$)/giu,
      /(?<!\S)(pouvoir|politique|roi|reine|empire|trône|règne)(?=\s|$)/giu,
      /(?<!\S)(mort|vie|survie|espoir|perte|deuil|renaissance)(?=\s|$)/giu,
      /(?<!\S)(identité|soi|mémoire|passé|secret|vérité|mensonge)(?=\s|$)/giu,
      /(?<!\S)(société|culture|classe|révolution|rébellion|liberté)(?=\s|$)/giu,
      /(?<!\S)(nature|monde|terre|environnement|animal|sauvage)(?=\s|$)/giu,
      /(?<!\S)(religion|dieu|foi|croyance|spirituel|divin)(?=\s|$)/giu,
    ],
    es: [
      /(?<!\S)(amor|romance|relación|familia|amistad|lealtad|traición)(?=\s|$)/giu,
      /(?<!\S)(guerra|batalla|conflicto|lucha|violencia|paz)(?=\s|$)/giu,
      /(?<!\S)(misterio|detective|crimen|asesinato|investigación|thriller)(?=\s|$)/giu,
      /(?<!\S)(magia|fantasía|mago|dragón|búsqueda|aventura|viaje)(?=\s|$)/giu,
      /(?<!\S)(ciencia|tecnología|espacio|futuro|robot|alien|tiempo)(?=\s|$)/giu,
      /(?<!\S)(horror|miedo|terror|fantasma|monstruo|sobrenatural|oscuro)(?=\s|$)/giu,
      /(?<!\S)(poder|política|rey|reina|imperio|trono|gobierno)(?=\s|$)/giu,
      /(?<!\S)(muerte|vida|supervivencia|esperanza|pérdida|duelo|renacimiento)(?=\s|$)/giu,
      /(?<!\S)(identidad|yo|memoria|pasado|secreto|verdad|mentira)(?=\s|$)/giu,
      /(?<!\S)(sociedad|cultura|clase|revolución|rebelión|libertad)(?=\s|$)/giu,
      /(?<!\S)(naturaleza|mundo|tierra|ambiente|animal|salvaje)(?=\s|$)/giu,
      /(?<!\S)(religión|dios|fe|creencia|espiritual|divino)(?=\s|$)/giu,
    ],
    de: [
      /(?<!\S)(liebe|romantik|beziehung|familie|freundschaft|loyalität|verrat)(?=\s|$)/giu,
      /(?<!\S)(krieg|schlacht|konflikt|kampf|gewalt|frieden)(?=\s|$)/giu,
      /(?<!\S)(mysterium|detektiv|verbrechen|mord|ermittlung|thriller)(?=\s|$)/giu,
      /(?<!\S)(magie|fantasie|zauberer|drache|quest|abenteuer|reise)(?=\s|$)/giu,
      /(?<!\S)(wissenschaft|technologie|raum|zukunft|roboter|alien|zeit)(?=\s|$)/giu,
      /(?<!\S)(horror|angst|terror|geist|monster|übernatürlich|dunkel)(?=\s|$)/giu,
      /(?<!\S)(macht|politik|könig|königin|reich|thron|herrschaft)(?=\s|$)/giu,
      /(?<!\S)(tod|leben|überleben|hoffnung|verlust|trauer|wiedergeburt)(?=\s|$)/giu,
      /(?<!\S)(identität|selbst|erinnerung|vergangenheit|geheimnis|wahrheit|lüge)(?=\s|$)/giu,
      /(?<!\S)(gesellschaft|kultur|klasse|revolution|rebellion|freiheit)(?=\s|$)/giu,
      /(?<!\S)(natur|welt|erde|umwelt|tier|wild)(?=\s|$)/giu,
      /(?<!\S)(religion|gott|glaube|spirituell|göttlich)(?=\s|$)/giu,
    ]
  };
  
  const patterns = themePatterns[language as keyof typeof themePatterns] || themePatterns.en;
  const themes = new Set<string>();
  const lowerText = text.toLowerCase();
  
  patterns.forEach(pattern => {
    const matches = lowerText.match(pattern);
    if (matches) {
      matches.forEach(match => themes.add(match.toLowerCase()));
    }
  });
  
  return Array.from(themes);
}

function extractPlotElements(text: string, language: string = 'en'): string[] {
  const plotPatterns = {
    en: [
      /(?<!\S)(journey|quest|mission|adventure|voyage|expedition)(?=\s|$)/giu,
      /(?<!\S)(discovery|revelation|secret|mystery|truth)(?=\s|$)/giu,
      /(?<!\S)(conflict|struggle|fight|battle|war|confrontation)(?=\s|$)/giu,
      /(?<!\S)(escape|rescue|save|protect|defend)(?=\s|$)/giu,
      /(?<!\S)(revenge|betrayal|deception|conspiracy|plot)(?=\s|$)/giu,
      /(?<!\S)(transformation|change|growth|development|evolution)(?=\s|$)/giu,
      /(?<!\S)(sacrifice|loss|redemption|forgiveness)(?=\s|$)/giu,
      /(?<!\S)(romance|love|relationship|marriage|affair)(?=\s|$)/giu,
      /(?<!\S)(investigation|detective|crime|murder|mystery)(?=\s|$)/giu,
      /(?<!\S)(survival|danger|threat|peril|risk)(?=\s|$)/giu,
      /(?<!\S)(power|throne|kingdom|empire|rule|reign)(?=\s|$)/giu,
      /(?<!\S)(rebellion|revolution|uprising|resistance)(?=\s|$)/giu,
    ],
    fr: [
      /(?<!\S)(voyage|quête|mission|aventure|expédition)(?=\s|$)/giu,
      /(?<!\S)(découverte|révélation|secret|mystère|vérité)(?=\s|$)/giu,
      /(?<!\S)(conflit|lutte|combat|bataille|guerre|confrontation)(?=\s|$)/giu,
      /(?<!\S)(évasion|sauvetage|sauver|protéger|défendre)(?=\s|$)/giu,
      /(?<!\S)(vengeance|trahison|tromperie|conspiration|complot)(?=\s|$)/giu,
      /(?<!\S)(transformation|changement|croissance|développement|évolution)(?=\s|$)/giu,
      /(?<!\S)(sacrifice|perte|rédemption|pardon)(?=\s|$)/giu,
      /(?<!\S)(romance|amour|relation|mariage|liaison)(?=\s|$)/giu,
      /(?<!\S)(enquête|détective|crime|meurtre|mystère)(?=\s|$)/giu,
      /(?<!\S)(survie|danger|menace|péril|risque)(?=\s|$)/giu,
      /(?<!\S)(pouvoir|trône|royaume|empire|règne)(?=\s|$)/giu,
      /(?<!\S)(rébellion|révolution|soulèvement|résistance)(?=\s|$)/giu,
    ],
    es: [
      /(?<!\S)(viaje|búsqueda|misión|aventura|expedición)(?=\s|$)/giu,
      /(?<!\S)(descubrimiento|revelación|secreto|misterio|verdad)(?=\s|$)/giu,
      /(?<!\S)(conflicto|lucha|pelea|batalla|guerra|confrontación)(?=\s|$)/giu,
      /(?<!\S)(escape|rescate|salvar|proteger|defender)(?=\s|$)/giu,
      /(?<!\S)(venganza|traición|engaño|conspiración|complot)(?=\s|$)/giu,
      /(?<!\S)(transformación|cambio|crecimiento|desarrollo|evolución)(?=\s|$)/giu,
      /(?<!\S)(sacrificio|pérdida|redención|perdón)(?=\s|$)/giu,
      /(?<!\S)(romance|amor|relación|matrimonio|aventura)(?=\s|$)/giu,
      /(?<!\S)(investigación|detective|crimen|asesinato|misterio)(?=\s|$)/giu,
      /(?<!\S)(supervivencia|peligro|amenaza|riesgo)(?=\s|$)/giu,
      /(?<!\S)(poder|trono|reino|imperio|reinado)(?=\s|$)/giu,
      /(?<!\S)(rebelión|revolución|levantamiento|resistencia)(?=\s|$)/giu,
    ],
    de: [
      /(?<!\S)(reise|quest|mission|abenteuer|expedition)(?=\s|$)/giu,
      /(?<!\S)(entdeckung|offenbarung|geheimnis|mysterium|wahrheit)(?=\s|$)/giu,
      /(?<!\S)(konflikt|kampf|schlacht|krieg|konfrontation)(?=\s|$)/giu,
      /(?<!\S)(flucht|rettung|retten|schützen|verteidigen)(?=\s|$)/giu,
      /(?<!\S)(rache|verrat|täuschung|verschwörung|komplott)(?=\s|$)/giu,
      /(?<!\S)(transformation|veränderung|wachstum|entwicklung|evolution)(?=\s|$)/giu,
      /(?<!\S)(opfer|verlust|erlösung|vergebung)(?=\s|$)/giu,
      /(?<!\S)(romantik|liebe|beziehung|ehe|affäre)(?=\s|$)/giu,
      /(?<!\S)(ermittlung|detektiv|verbrechen|mord|mysterium)(?=\s|$)/giu,
      /(?<!\S)(überleben|gefahr|bedrohung|risiko)(?=\s|$)/giu,
      /(?<!\S)(macht|thron|königreich|reich|herrschaft)(?=\s|$)/giu,
      /(?<!\S)(rebellion|revolution|aufstand|widerstand)(?=\s|$)/giu,
    ]
  };
  
  const patterns = plotPatterns[language as keyof typeof plotPatterns] || plotPatterns.en;
  const plotElements = new Set<string>();
  const lowerText = text.toLowerCase();
  
  patterns.forEach(pattern => {
    const matches = lowerText.match(pattern);
    if (matches) {
      matches.forEach(match => plotElements.add(match.toLowerCase()));
    }
  });
  
  return Array.from(plotElements);
}
