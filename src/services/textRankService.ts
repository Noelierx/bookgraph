type Graph = Map<string, Set<string>>;

const stopWords = new Set(['a', 'about', 'above', 'after', 'again', 'all', 'also', 'am', 'an', 'and',
    'another','any', 'are', 'as', 'at', 'be', 'because', 'been', 'before', 'being', 'below', 'between',
    'both', 'but', 'by', 'came', 'can', 'come', 'could', 'did', 'do', 'does', 'during', 'each',
    'few', 'for', 'from', 'further', 'get', 'got', 'had', 'has', 'have', 'he', 'her', 'here',
    'him', 'himself', 'his', 'how', 'i', 'if', 'in', 'into', 'is', 'it', 'like', 'make', 'many',
    'me', 'might', 'more', 'most', 'much', 'must', 'my', 'never', 'no', 'not', 'now', 'of', 'on',
    'once', 'only', 'or', 'other', 'our', 'out', 'over', 'own', 'said', 'same', 'should', 'since',
    'some', 'still', 'such', 'take', 'than', 'that', 'the', 'their', 'them', 'then', 'there',
    'these', 'they', 'this', 'those', 'through', 'to', 'too', 'under', 'up', 'very', 'was',
    'way', 'we', 'well', 'were', 'what', 'when', 'where', 'which', 'while', 'who', 'why',
    'will', 'with', 'would', 'you', 'your'
]);

function tokenize(text: String): string[] {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, "")
        .split(/\s+/)
        .filter(w => w.length > 2 && !stopWords.has(w));
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

export function trExtractKeywords(text: string, topN = 5, windowSize = 2): string[] {
    const words = tokenize(text);
    const graph = buildGraph(words, windowSize);
    const scores = textRank(graph);

    return Array.from(scores.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, topN)
        .map(([word]) => word);
}