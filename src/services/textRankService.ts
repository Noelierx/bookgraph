type Graph = Map<string, Set<string>>;

const stopWordsEn = new Set(['a', 'about', 'above', 'after', 'again', 'all', 'also', 'am', 'an', 'and',
    'another','any', 'are', 'as', 'at', 'be', 'because', 'been', 'before', 'being', 'below', 'between',
    'both', 'but', 'by', 'came', 'can', 'come', 'could', 'did', 'do', 'does', 'during', 'each',
    'few', 'for', 'from', 'further', 'get', 'got', 'had', 'has', 'have', 'he', 'her', 'here',
    'him', 'himself', 'his', 'how', 'i', 'if', 'in', 'into', 'is', 'it', 'its', 'like', 'make', 'many',
    'me', 'might', 'more', 'most', 'much', 'must', 'my', 'never', 'no', 'not', 'now', 'of', 'on',
    'once', 'only', 'or', 'other', 'our', 'out', 'over', 'own', 'said', 'same', 'should', 'since',
    'some', 'still', 'such', 'take', 'than', 'that', 'the', 'their', 'them', 'then', 'there',
    'these', 'they', 'this', 'those', 'through', 'to', 'too', 'under', 'up', 'very', 'was',
    'way', 'we', 'well', 'were', 'what', 'when', 'where', 'which', 'while', 'who', 'why',
    'will', 'with', 'would', 'you', 'your', 'yours', 'hers', 'theirs', 'ours', 'mine', 'herself',
    'themselves', 'yourself', 'yourselves', 'ourselves', 'myself', 'itself', 'she',
    'whom', 'whose', 'whichever', 'whatever', 'whenever', 'wherever', 'however', 'whether',
    'shall', 'may', 'ought', 'dare', 'need', 'used'
]);

const stopWordsFr = new Set(['le', 'de', 'et', 'à', 'un', 'il', 'être', 'en', 'avoir', 'que', 'pour',
    'dans', 'ce', 'son', 'une', 'sur', 'avec', 'ne', 'se', 'pas', 'tout', 'plus', 'par', 'grand', 'comme',
    'autre', 'mais', 'ou', 'où', 'si', 'leur', 'y', 'dire', 'elle', 'depuis', 'car', 'deux', 'comment',
    'très', 'sans', 'nous', 'vous', 'lors', 'cette', 'celui', 'celle', 'ces', 'ceux', 'donc',
    'bien', 'aussi', 'peut', 'fait', 'faire', 'voir', 'aller', 'venir', 'temps', 'même', 'encore',
    'été', 'déjà', 'là', 'après', 'dès', 'jusqu', 'plutôt', 'voilà', 'lui', 'eux', 'elles', 'je', 'tu',
    'moi', 'toi', 'soi', 'mes', 'tes', 'ses', 'nos', 'vos', 'leurs', 'mien', 'tien', 'sien', 'nôtre', 'vôtre',
    'qui', 'quoi', 'dont', 'lequel', 'laquelle', 'lesquels', 'lesquelles', 'duquel', 'desquels',
    'auquel', 'auxquels', 'auxquelles', 'quel', 'quelle', 'quels', 'quelles', 'combien', 'pourquoi',
    'quand', 'est', 'sont', 'était', 'étaient', 'sera', 'seront', 'serait', 'seraient',
    'avait', 'avaient', 'aura', 'auront', 'aurait', 'auraient', 'soit', 'soient', 'fût', 'fussent',
    'des', 'moins', 'sous', 'contre', 'vers', 'chez', 'entre', 'pendant', 'avant', 'toujours',
    'jamais', 'souvent', 'parfois', 'puis', 'ensuite', 'alors', 'maintenant', 'hier', 'demain'
]);

const stopWordsEs = new Set(['el', 'la', 'de', 'que', 'y', 'a', 'en', 'un', 'ser', 'se', 'no', 'te', 'lo', 'le',
    'da', 'su', 'por', 'son', 'con', 'para', 'una', 'él', 'sobre', 'todo', 'las', 'más', 'si', 'al', 'del',
    'los', 'mi', 'pero', 'sus', 'me', 'hasta', 'donde', 'quien', 'desde', 'nos', 'durante', 'sin', 'muy',
    'entre', 'cuando', 'ya', 'también', 'solo', 'antes', 'como', 'tanto', 'vez', 'mucho', 'ahora',
    'así', 'después', 'estaban', 'había', 'través', 'además', 'sólo', 'allí', 'días', 'yo', 'tú',
    'ella', 'nosotros', 'nosotras', 'vosotros', 'vosotras', 'ellos', 'ellas', 'usted', 'ustedes',
    'mí', 'ti', 'sí', 'conmigo', 'contigo', 'consigo', 'mío', 'tuyo', 'suyo', 'nuestro', 'vuestro',
    'quién', 'cual', 'cuál', 'cuales', 'cuáles', 'cuyo', 'cuya', 'cuyos', 'cuyas', 'qué',
    'cuándo', 'dónde', 'cómo', 'porqué', 'cuánto', 'cuánta', 'cuántos', 'cuántas',
    'es', 'está', 'están', 'era', 'eran', 'fue', 'fueron', 'será', 'serán', 'sería', 'serían',
    'sea', 'sean', 'fuera', 'fueran', 'fuese', 'fuesen', 'siendo', 'sido',
    'he', 'has', 'ha', 'hemos', 'habéis', 'han', 'habías', 'habíamos', 'habíais', 'habían',
    'hube', 'hubiste', 'hubo', 'hubimos', 'hubisteis', 'hubieron', 'habré', 'habrás', 'habrá',
    'habremos', 'habréis', 'habrán', 'habría', 'habrías', 'habríamos', 'habríais', 'habrían',
    'haya', 'hayas', 'hayamos', 'hayáis', 'hayan', 'hubiera', 'hubieras', 'hubiéramos', 'hubierais', 'hubieran',
    'hubiese', 'hubieses', 'hubiésemos', 'hubieseis', 'hubiesen', 'habiendo', 'habido',
    'menos', 'bajo', 'contra', 'hacia', 'según', 'mientras', 'siempre', 'nunca', 'ayer', 'mañana'
]);

const stopWordsDe = new Set(['der', 'die', 'und', 'in', 'den', 'von', 'zu', 'das', 'mit', 'sich', 'des', 'auf',
    'für', 'ist', 'im', 'dem', 'nicht', 'ein', 'eine', 'als', 'auch', 'es', 'an', 'werden', 'aus', 'er', 'hat',
    'dass', 'sie', 'nach', 'wird', 'bei', 'einer', 'um', 'am', 'sind', 'noch', 'wie', 'einem', 'über', 'einen',
    'so', 'zum', 'war', 'haben', 'nur', 'oder', 'aber', 'vor', 'zur', 'bis', 'mehr', 'durch', 'man', 'sein',
    'wurde', 'sei', 'ihren', 'während', 'können', 'müssen', 'währen', 'größer', 'natürlich', 'tatsächlich',
    'ich', 'du', 'ihn', 'ihr', 'uns', 'euch', 'ihnen', 'mich', 'dich', 'mir', 'dir', 'ihm', 'wir',
    'mein', 'dein', 'unser', 'euer', 'meiner', 'deiner', 'seiner', 'unserer', 'eurer', 'ihrer',
    'wer', 'was', 'wem', 'wen', 'wessen', 'welche', 'welcher', 'welches', 'welchem', 'welchen',
    'wo', 'wann', 'warum', 'wieso', 'weshalb', 'wohin', 'woher', 'womit', 'wovon', 'worüber',
    'bin', 'bist', 'seid', 'warst', 'waren', 'wart', 'gewesen', 'werde', 'wirst',
    'werdet', 'würde', 'würdest', 'würden', 'würdet', 'seist', 'seien', 'seiet', 'wäre',
    'wärest', 'wären', 'wäret', 'seiend', 'habe', 'hast', 'habt', 'hatte', 'hattest',
    'hatten', 'hattet', 'gehabt', 'hätte', 'hättest', 'hätten', 'hättet', 'habend',
    'weniger', 'unter', 'gegen', 'ohne', 'zwischen', 'immer', 'nie', 'gestern', 'morgen'
]);

function detectLanguage(text: string): 'en' | 'fr' | 'es' | 'de' | 'unknown' {
  if (!text || text.length < 50) return 'unknown';
  
  const words = text.toLowerCase().match(/\b[\p{L}\p{N}_]+\b/gu) || [];
  const sampleSize = Math.min(100, words.length);
  const sample = words.slice(0, sampleSize);
  
  const scores = {
    en: sample.filter(w => stopWordsEn.has(w)).length,
    fr: sample.filter(w => stopWordsFr.has(w)).length,
    es: sample.filter(w => stopWordsEs.has(w)).length,
    de: sample.filter(w => stopWordsDe.has(w)).length
  };
  
  const maxScore = Math.max(...Object.values(scores));
  if (maxScore < 3) return 'unknown';
  
  return (Object.keys(scores).find(lang => scores[lang as keyof typeof scores] === maxScore) as 'en' | 'fr' | 'es' | 'de') || 'unknown';
}

function getStopWords(language: string): Set<string> {
  switch (language) {
    case 'fr': return stopWordsFr;
    case 'es': return stopWordsEs;
    case 'de': return stopWordsDe;
    case 'en':
    default: return stopWordsEn;
  }
}

function tokenize(text: string, language?: string): string[] {
    const detectedLang = language || detectLanguage(text);
    const stopWords = getStopWords(detectedLang);
    
    return text
        .toLowerCase()
        .replace(/[^\p{L}\p{N}\s]/gu, "")
        .split(/\s+/)
        .filter(w => w.length > 5 && !stopWords.has(w));
}

function buildGraph(words: string[], windowSize: number = 2): Graph {
    const graph: Graph = new Map();

    for (let i = 0; i < words.length; i++) {
        const window = words.slice(i + 1, i + windowSize + 1);
        if (!graph.has(words[i])) {
            graph.set(words[i], new Set());
        }

        for (const neighbor of window) {
            if (neighbor === words[i]) {
                continue;
            }

            graph.get(words[i])!.add(neighbor);

            if (!graph.has(neighbor)) {
                graph.set(neighbor, new Set());
            }
            graph.get(neighbor)!.add(words[i]);
        }
    }

    return graph;
}

function textRank(graph: Graph, damping = 0.85, maxIter = 100, tol = 1e-6): Map<string, number> {
    const nodes = Array.from(graph.keys());
    const length = nodes.length;
    const scores = new Map(nodes.map(n => [n, 1 / length]));

    for (let iter = 0; iter < maxIter; iter++) {
        const newScores = new Map<string, number>();
        let diff = 0;

        for (const node of nodes) {
            let sum = 0;
            for (const neighbor of graph.get(node)!) {
                const neighborDegree = graph.get(neighbor)!.size;
                if (neighborDegree > 0) {
                    sum += (scores.get(neighbor)! / neighborDegree);
                }
            }
            const newScore = (1 - damping) / length + damping * sum;
            newScores.set(node, newScore);
            diff += Math.abs(newScore - scores.get(node)!);
        }

        for (const [node, score] of newScores) {
            scores.set(node, score);
        }

        if (diff < tol) break;
    }

    return scores;
}

export function trExtractKeywords(text: string, topN = 5, windowSize = 2, language?: string): string[] {
    const words = tokenize(text, language);
    if (words.length === 0) return [];
    
    const graph = buildGraph(words, windowSize);
    const scores = textRank(graph);

    return Array.from(scores.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, topN)
        .map(([word]) => word);
}

export { detectLanguage };