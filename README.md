# 📚 BookGraph

**BookGraph** helps you explore the hidden connections between your books.

- Data is saved in **localStorage** under the key `book-graph-data`.  
- Enrichment uses **OpenLibrary** and **Google Books** APIs — may take a few seconds for large collections due to rate limiting and API delays.  
- **Goodreads imports** automatically enrich all books with metadata from multiple sources, which can take several minutes for large libraries.  
- Google Books categories are automatically merged into book subjects for better categorization.  
- If a book doesn't connect to others, try adding or refining its **description** or **subjects**, then click *Analyze* again.  
- The enrichment service intelligently combines data from multiple sources, preferring more complete information while avoiding duplicates.der the key `book-graph-data`.  
- Enrichment uses **OpenLibrary** and **Google Books** APIs — may take a few seconds for large collections due to rate limiting and API delays.  
- Google Books categories are automatically merged into book subjects for better categorization.  
- If a book doesn't connect to others, try adding or refining its **description** or **subjects**, then click *Analyze* again.  
- The enrichment service intelligently combines data from multiple sources, preferring more complete information while avoiding duplicates. your books.  
Search, collect, analyze, and visualize how your favorite reads relate to one another.

<img width="1443" height="854" alt="Capture d’écran 2025-10-22 à 17 52 50" src="https://github.com/user-attachments/assets/b328bd1a-ae42-40b9-aa2b-4da0d161c275" />

---

## ✨ Features

- 🔎 **Search books** by *title*, *author*, or *ISBN* using **OpenLibrary** and **Google Books APIs**.  
- 🧠 **Intelligent enrichment**: automatically fetches descriptions, subjects, categories, and ISBNs from multiple sources (preferring ISBN-13).  
- ✅ **Validation**: ISBN required for manual additions.  
- 🕸️ **Interactive graph** powered by *ForceGraph2D* — fully responsive with drag / zoom / pan.  
- 📖 **Book details** with ISBN, subjects, and description — includes *Edit* / *Delete*.  
- 💾 **Import / Export** your collection as JSON.  
- � **Goodreads Import** from CSV exports with automatic enrichment.  
- �💡 **Help modal** with tips for improving connections.  
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
5. **Import Goodreads** → click *Import from Goodreads* and select your CSV export file for bulk import.  
6. **Import / Export** → manage your collection via JSON in the header.  
7. **Analyze connections** → click *Analyze* to rebuild semantic links.  
8. **Need help?** → open *Help* for suggestions (add descriptions, subjects, rerun *Analyze*).

---

## 📚 Goodreads Import

BookGraph supports importing your Goodreads library via CSV export:

### How to Export from Goodreads:
1. Go to **Goodreads.com** → **My Books**
2. Click **Import and export** at the bottom of the left sidebar
3. Click **Export Library** and download your CSV file

### Import Process:
1. Click **Import from Goodreads** in BookGraph
2. Select your downloaded CSV file
3. BookGraph will automatically:
   - Parse your library data (Title, Author, ISBN)
   - Enrich each book with additional metadata from OpenLibrary and Google Books
   - Merge subjects and categories for better connections
   - Remove duplicates and handle various ISBN formats

**Note:** Large libraries may take several minutes to import due to API enrichment and rate limiting.

---

## 🧩 Notable Implementations

- **Descriptions**: gracefully extracted from strings or `{ value }` objects, with fallbacks to *work* or *edition* data.  
- **ISBN handling**: cleans multiple identifier fields (`isbn`, `isbn_10`, `isbn_13`, `identifiers`); prefers ISBN-13 and converts from ISBN-10 if needed.  
- **Multi-source enrichment**: combines data from OpenLibrary and Google Books APIs, with intelligent deduplication and merging of subjects/categories.  
- **Graph resizing**: dynamically fits its container using `ResizeObserver`.

---

## 🗂️ Key Components

| Component | Purpose |
|------------|----------|
| `BookGraph.tsx` | Responsive ForceGraph2D visualization |
| `HelpModal.tsx` | Reusable modal with improvement tips |
| `EditBookDialog.tsx` | Add/edit dialog with ISBN validation |
| `BookDetails.tsx` | Displays ISBN, subjects, and description |
| `enrichmentService.ts` | Centralized multi-source data enrichment and merging |
| `openLibraryService.ts` | OpenLibrary API integration and data normalization |
| `googleBooksService.ts` | Google Books API integration and category mapping |
| `goodreadsImportService.ts` | Goodreads CSV import with intelligent parsing and enrichment |
| `Index.tsx` | Main page – import/export, state management, layout |

---

## 🔧 Enrichment Architecture

BookGraph uses a sophisticated multi-source enrichment pipeline:

- **Primary Sources**: OpenLibrary API and Google Books API
- **Intelligent Merging**: Combines data from multiple sources, preferring more complete information
- **Category Integration**: Google Books categories are automatically mapped to book subjects
- **Deduplication**: Prevents duplicate subjects and handles various ISBN formats
- **Fallback Logic**: If exact matches aren't found, uses best available results to maximize data coverage
- **Rate Limiting**: Built-in delays between API calls to respect service limits

The enrichment service (`enrichmentService.ts`) centralizes all this logic, making it easy to maintain and extend.

---

📖 **Happy exploring — may your bookshelf become a connected universe of ideas!** ✨
