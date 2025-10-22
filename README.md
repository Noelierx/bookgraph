# 📚 BookGraph

**BookGraph** helps you explore the hidden connections between your books.  
Search, collect, analyze, and visualize how your favorite reads relate to one another.

<img width="1443" height="854" alt="Capture d’écran 2025-10-22 à 17 52 50" src="https://github.com/user-attachments/assets/b328bd1a-ae42-40b9-aa2b-4da0d161c275" />

---

## ✨ Features

- 🔎 **Search books** by *title*, *author*, or *ISBN* using the **OpenLibrary API**.  
- 🧠 **Automatic enrichment**: fetches descriptions, subjects, and ISBNs (preferring ISBN-13).  
- ✅ **Validation**: ISBN required for manual additions.  
- 🕸️ **Interactive graph** powered by *ForceGraph2D* — fully responsive with drag / zoom / pan.  
- 🎨 **Color-coded relationships** — visualize different connection types at a glance:
  - 🟣 **Similar Themes** — books sharing thematic elements
  - 🔵 **Similar Plots** — books with comparable plot structures
  - 🔴 **Similar Concepts** — books discussing related concepts
  - 🟢 **Common Subjects** — books with overlapping subject categories
  - 🟠 **Contrasting Ideas** — books exploring opposing concepts (light/dark, good/evil, etc.)
  - 🟣 **Mixed** — multiple relationship types combined
- 📖 **Book details** with ISBN, subjects, and description — includes *Edit* / *Delete*.  
- 💾 **Import / Export** your collection as JSON.  
- 💡 **Help modal** with tips for improving connections.  
- 🧹 **Clear button** to reset search results.  
- ✍️ **Manual book entry** with field validation.

---

## 🧰 Local Development (Dev Container)
 
To run locally:

<pre>
# 1. Install dependencies
npm install

# 2. Start the development server
npm run dev
</pre>

---

## 🚀 Quick Start

1. **Search** → choose a mode (*Title*, *Author*, *ISBN*), enter a query, then click **Search**.  
2. **Clear** → click *Clear* to reset results.  
3. **Add from results** → click *Add*. Duplicates are ignored.  
4. **Add manually** → open *Add Book Manually* and fill in **ISBN**, **Title**, and **Author**.  
5. **Import / Export** → manage your collection via JSON in the header.  
6. **Analyze connections** → click *Analyze* to rebuild semantic links.  
7. **Need help?** → open *Help* for suggestions (add descriptions, subjects, rerun *Analyze*).

---

## 🧩 Notable Implementations

- **Descriptions**: gracefully extracted from strings or `{ value }` objects, with fallbacks to *work* or *edition* data.  
- **ISBN handling**: cleans multiple identifier fields (`isbn`, `isbn_10`, `isbn_13`, `identifiers`); prefers ISBN-13 and converts from ISBN-10 if needed.  
- **Data enrichment**: merges complementary data from editions/works to fill missing metadata.  
- **Graph resizing**: dynamically fits its container using `ResizeObserver`.
- **Relationship detection**: analyzes book descriptions and subjects to identify thematic similarities, plot parallels, and contrasting concepts.
- **Visual legend**: color-coded legend in the graph displays relationship types for easy interpretation.

---

## 🗂️ Key Components

| Component | Purpose |
|------------|----------|
| `BookGraph.tsx` | Responsive ForceGraph2D visualization with color-coded relationships |
| `HelpModal.tsx` | Reusable modal with improvement tips |
| `EditBookDialog.tsx` | Add/edit dialog with ISBN validation |
| `BookDetails.tsx` | Displays ISBN, subjects, and description |
| `openLibraryService.ts` | Data enrichment, ISBN normalization, description retrieval |
| `connectionService.ts` | Analyzes books to detect relationships and classify connection types |
| `Index.tsx` | Main page – import/export, state management, layout |

---

## 💡 Notes

- Data is saved in **localStorage** under the key `book-graph-data`.  
- Enrichment triggers multiple **OpenLibrary** requests — may take a few seconds for large sets.  
- If a book doesn’t connect to others, try adding or refining its **description** or **subjects**, then click *Analyze* again.

---

📖 **Happy exploring — may your bookshelf become a connected universe of ideas!** ✨
