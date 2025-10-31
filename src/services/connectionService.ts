import { Book, BookConnection, RelationshipType } from "@/types/book";
import { trExtractKeywords, detectLanguage } from "./textRankService";

interface BookAnalysis {
  id: string;
  language: string;
  keywords: string[];
  themes: string[];
  plots: string[];
}

export async function analyzeBookConnections(books: Book[]): Promise<BookConnection[]> {
  const connections: BookConnection[] = [];

  const extracts: BookAnalysis[] = books.map(b => {
    const text = b.description || "";
    const language = detectLanguage(text);
    const keywords = trExtractKeywords(text, 30, 4, language);
    const themes = extractThemes(text, language);
    const plots = extractPlotElements(text, language);
    return { id: b.id, language, keywords, themes, plots };
  });

  const englishBooks = extracts.filter(e => e.language === 'en');
  const otherLanguageBooks = extracts.filter(e => e.language !== 'en');

  for (let i = 0; i < englishBooks.length; i++) {
    for (let j = i + 1; j < englishBooks.length; j++) {
      const bookAnalysis1 = englishBooks[i];
      const bookAnalysis2 = englishBooks[j];
      const book1 = books.find(b => b.id === bookAnalysis1.id)!;
      const book2 = books.find(b => b.id === bookAnalysis2.id)!;
      
      const connection = analyzeBookPair(book1, book2, bookAnalysis1, bookAnalysis2, 1.0);
      if (connection) connections.push(connection);
    }
  }

  for (const engBook of englishBooks) {
    for (const otherBook of otherLanguageBooks) {
      const book1 = books.find(b => b.id === engBook.id)!;
      const book2 = books.find(b => b.id === otherBook.id)!;
      
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
        const book1 = books.find(b => b.id === bookAnalysis1.id)!;
        const book2 = books.find(b => b.id === bookAnalysis2.id)!;
        
        const connection = analyzeBookPair(book1, book2, bookAnalysis1, bookAnalysis2, 0.9);
        if (connection) connections.push(connection);
      }
    }
  }
  
  return connections;
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
    commonSubjects = book1.subjects.filter(s => 
      book2.subjects?.some(s2 => s.toLowerCase() === s2.toLowerCase())
    );
    if (commonSubjects.length > 0) {
      strength += Math.min(commonSubjects.length * 0.3, 0.7);
      reasons.push(`Common subjects: ${commonSubjects.slice(0, 3).join(", ")}`);
      types.push("common-subjects");
    }
  }

  if (book1.description && book2.description) {
    const commonKeywords = analysis1.keywords.filter(k => analysis2.keywords.includes(k));
    const commonThemes = analysis1.themes.filter(t => analysis2.themes.includes(t));
    const commonPlots = analysis1.plots.filter(p => analysis2.plots.includes(p));

    if (commonKeywords.length > 0) {
      let keywordStrength = Math.min(commonKeywords.length * 0.12, 0.5);
      
      if (analysis1.language !== analysis2.language && analysis1.language !== 'unknown' && analysis2.language !== 'unknown') {
        keywordStrength *= 1.2;
      }
      
      strength += keywordStrength;
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

  strength *= languageMultiplier;
  
  if (analysis1.language !== analysis2.language && analysis1.language !== 'unknown' && analysis2.language !== 'unknown') {
    const langNames = { en: 'English', fr: 'French', es: 'Spanish', de: 'German' };
    const lang1Name = langNames[analysis1.language as keyof typeof langNames] || analysis1.language;
    const lang2Name = langNames[analysis2.language as keyof typeof langNames] || analysis2.language;
    reasons.push(`Cross-language connection (${lang1Name}-${lang2Name})`);
  }
  
  if (strength > 0.1 && reasons.length > 0) {
    const connectionType: RelationshipType = types.length === 1 ? types[0] : "mixed";
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
    ],
    fr: [
      /\b(amour|romance|relation|famille|amitié|loyauté|trahison)\b/gi,
      /\b(guerre|bataille|conflit|combat|lutte|violence|paix)\b/gi,
      /\b(mystère|détective|crime|meurtre|enquête|thriller)\b/gi,
      /\b(magie|fantaisie|sorcier|dragon|quête|aventure|voyage)\b/gi,
      /\b(science|technologie|espace|futur|robot|alien|temps)\b/gi,
      /\b(horreur|peur|terreur|fantôme|monstre|surnaturel|sombre)\b/gi,
      /\b(pouvoir|politique|roi|reine|empire|trône|règne)\b/gi,
      /\b(mort|vie|survie|espoir|perte|deuil|renaissance)\b/gi,
      /\b(identité|soi|mémoire|passé|secret|vérité|mensonge)\b/gi,
      /\b(société|culture|classe|révolution|rébellion|liberté)\b/gi,
      /\b(nature|monde|terre|environnement|animal|sauvage)\b/gi,
      /\b(religion|dieu|foi|croyance|spirituel|divin)\b/gi,
    ],
    es: [
      /\b(amor|romance|relación|familia|amistad|lealtad|traición)\b/gi,
      /\b(guerra|batalla|conflicto|lucha|violencia|paz)\b/gi,
      /\b(misterio|detective|crimen|asesinato|investigación|thriller)\b/gi,
      /\b(magia|fantasía|mago|dragón|búsqueda|aventura|viaje)\b/gi,
      /\b(ciencia|tecnología|espacio|futuro|robot|alien|tiempo)\b/gi,
      /\b(horror|miedo|terror|fantasma|monstruo|sobrenatural|oscuro)\b/gi,
      /\b(poder|política|rey|reina|imperio|trono|gobierno)\b/gi,
      /\b(muerte|vida|supervivencia|esperanza|pérdida|duelo|renacimiento)\b/gi,
      /\b(identidad|yo|memoria|pasado|secreto|verdad|mentira)\b/gi,
      /\b(sociedad|cultura|clase|revolución|rebelión|libertad)\b/gi,
      /\b(naturaleza|mundo|tierra|ambiente|animal|salvaje)\b/gi,
      /\b(religión|dios|fe|creencia|espiritual|divino)\b/gi,
    ],
    de: [
      /\b(liebe|romantik|beziehung|familie|freundschaft|loyalität|verrat)\b/gi,
      /\b(krieg|schlacht|konflikt|kampf|gewalt|frieden)\b/gi,
      /\b(mysterium|detektiv|verbrechen|mord|ermittlung|thriller)\b/gi,
      /\b(magie|fantasie|zauberer|drache|quest|abenteuer|reise)\b/gi,
      /\b(wissenschaft|technologie|raum|zukunft|roboter|alien|zeit)\b/gi,
      /\b(horror|angst|terror|geist|monster|übernatürlich|dunkel)\b/gi,
      /\b(macht|politik|könig|königin|reich|thron|herrschaft)\b/gi,
      /\b(tod|leben|überleben|hoffnung|verlust|trauer|wiedergeburt)\b/gi,
      /\b(identität|selbst|erinnerung|vergangenheit|geheimnis|wahrheit|lüge)\b/gi,
      /\b(gesellschaft|kultur|klasse|revolution|rebellion|freiheit)\b/gi,
      /\b(natur|welt|erde|umwelt|tier|wild)\b/gi,
      /\b(religion|gott|glaube|spirituell|göttlich)\b/gi,
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
    ],
    fr: [
      /\b(voyage|quête|mission|aventure|expédition)\b/gi,
      /\b(découverte|révélation|secret|mystère|vérité)\b/gi,
      /\b(conflit|lutte|combat|bataille|guerre|confrontation)\b/gi,
      /\b(évasion|sauvetage|sauver|protéger|défendre)\b/gi,
      /\b(vengeance|trahison|tromperie|conspiration|complot)\b/gi,
      /\b(transformation|changement|croissance|développement|évolution)\b/gi,
      /\b(sacrifice|perte|rédemption|pardon)\b/gi,
      /\b(romance|amour|relation|mariage|liaison)\b/gi,
      /\b(enquête|détective|crime|meurtre|mystère)\b/gi,
      /\b(survie|danger|menace|péril|risque)\b/gi,
      /\b(pouvoir|trône|royaume|empire|règne)\b/gi,
      /\b(rébellion|révolution|soulèvement|résistance)\b/gi,
    ],
    es: [
      /\b(viaje|búsqueda|misión|aventura|expedición)\b/gi,
      /\b(descubrimiento|revelación|secreto|misterio|verdad)\b/gi,
      /\b(conflicto|lucha|pelea|batalla|guerra|confrontación)\b/gi,
      /\b(escape|rescate|salvar|proteger|defender)\b/gi,
      /\b(venganza|traición|engaño|conspiración|complot)\b/gi,
      /\b(transformación|cambio|crecimiento|desarrollo|evolución)\b/gi,
      /\b(sacrificio|pérdida|redención|perdón)\b/gi,
      /\b(romance|amor|relación|matrimonio|aventura)\b/gi,
      /\b(investigación|detective|crimen|asesinato|misterio)\b/gi,
      /\b(supervivencia|peligro|amenaza|riesgo)\b/gi,
      /\b(poder|trono|reino|imperio|reinado)\b/gi,
      /\b(rebelión|revolución|levantamiento|resistencia)\b/gi,
    ],
    de: [
      /\b(reise|quest|mission|abenteuer|expedition)\b/gi,
      /\b(entdeckung|offenbarung|geheimnis|mysterium|wahrheit)\b/gi,
      /\b(konflikt|kampf|schlacht|krieg|konfrontation)\b/gi,
      /\b(flucht|rettung|retten|schützen|verteidigen)\b/gi,
      /\b(rache|verrat|täuschung|verschwörung|komplott)\b/gi,
      /\b(transformation|veränderung|wachstum|entwicklung|evolution)\b/gi,
      /\b(opfer|verlust|erlösung|vergebung)\b/gi,
      /\b(romantik|liebe|beziehung|ehe|affäre)\b/gi,
      /\b(ermittlung|detektiv|verbrechen|mord|mysterium)\b/gi,
      /\b(überleben|gefahr|bedrohung|risiko)\b/gi,
      /\b(macht|thron|königreich|reich|herrschaft)\b/gi,
      /\b(rebellion|revolution|aufstand|widerstand)\b/gi,
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
