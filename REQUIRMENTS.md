# Strashun Library Digital Interface - Requirements Specification

## 1. PROJECT OVERVIEW

### 1.1 Purpose
A client-side web application to explore the historical lending records of the Strashun Library of Vilna (1902-1940), revealing the reading patterns and intellectual life of the pre-Holocaust Jewish community.

### 1.2 Data Assets
- **5,000 borrowing transactions** across 4 time periods (1902, 1903-1904, 1934, 1940)
- **1,000+ unique books** with enriched metadata from National Library of Israel
- **500+ unique borrowers** with complete borrowing histories
- **Pre-aggregated summary tables** with calculated statistics

### 1.3 Deployment
Single-page application hosted on GitHub Pages, no backend required.

---

## 2. USER STORIES & FUNCTIONAL REQUIREMENTS

### 2.1 Search & Browse

#### User Stories
- **As a researcher**, I want to search for any person or book by name, so I can quickly find specific records
- **As a genealogist**, I want to browse complete lists of borrowers and books, so I can discover connections
- **As a scholar**, I want search to work with Hebrew, Yiddish, and transliterated text, so I can use any script

#### Requirements
- **FR-001**: Text search across borrower names and book titles
- **FR-002**: Alphabetical browsing of all borrowers (~500 entries)
- **FR-003**: Alphabetical browsing of all books (~1,000 entries)
- **FR-004**: Search results highlighting
- **FR-005**: Hebrew/Yiddish text display with proper RTL support

#### Data Connection
```yaml
Search Sources:
  Borrowers: borrowers_table.csv ["Name of the borrower"]
  Books: books_table.csv ["nli book name"]
```

---

### 2.2 Individual Profiles

#### User Stories
- **As a historian**, I want to see complete borrowing history for any person, so I can understand individual reading patterns
- **As a librarian**, I want to see the complete borrowing history for any book, so I can understand its circulation
- **As a researcher**, I want to link between connected records, so I can explore relationships

#### Requirements
- **FR-006**: Borrower profile displaying:
  - Name and gender indicator
  - Total books borrowed count
  - Unique books borrowed count
  - Complete list of borrowed books
- **FR-007**: Book profile displaying:
  - Title (original and NLI standardized)
  - Author, publisher, publication year
  - Total times borrowed
  - Complete list of borrowers
  - Link to NLI catalog (when available)
- **FR-008**: Clickable links between profiles (borrower ↔ book)

#### Data Connection
```yaml
Borrower Profile:
  Source: borrowers_table.csv
  Fields: 
    - name_index (ID)
    - "Name of the borrower"
    - "number of borrowed books"
    - "Unique number of borrowed books"  
    - "borrowed books" (pre-aggregated list)
    - "<F>" (gender flag)

Book Profile:
  Source: books_table.csv + unique_books_list.csv
  Fields:
    - id (book ID)
    - "nli book name"
    - "number of borrowers"
    - "borrowers" (pre-aggregated list)
    - NLI metadata (author, publisher, year, link)
```

---

### 2.3 Filtering

#### User Stories
- **As a historian**, I want to filter by time period, so I can focus on specific historical moments
- **As a gender studies researcher**, I want to filter by gender, so I can analyze women's reading patterns
- **As a linguist**, I want to filter by language, so I can study language preferences

#### Requirements
- **FR-009**: Filter borrowers by:
  - Gender (Female flagged records)
  - Activity level (number of books borrowed)
- **FR-010**: Filter books by:
  - Time period (1902, 1903-1904, 1934, 1940)
  - Popularity (number of times borrowed)
  - Collection (Likutei Shoshanim or general)
- **FR-011**: Clear indication of active filters
- **FR-012**: Result counts update with filters

#### Data Connection
```yaml
Filter Sources:
  Gender: borrowers_table.csv ["<F>" field]
  Period: Derived from "borrowed books" ledger references
  Collection: unique_books_list.csv ["Likutei Shoshanim_id"]
  Popularity: Pre-calculated "number of borrowers" field
```

---

### 2.4 Statistical Visualizations

#### User Stories
- **As a researcher**, I want to see the most popular books, so I can understand community interests
- **As a sociologist**, I want to identify the most active readers, so I can study reading behaviors
- **As a historian**, I want to see borrowing patterns across time periods, so I can track cultural changes

#### Requirements
- **FR-013**: Top 20 most borrowed books (bar chart)
- **FR-014**: Top 20 most active readers (bar chart)
- **FR-015**: Distribution of borrowing by time period (pie chart)
- **FR-016**: Gender distribution of borrowers (pie chart)
- **FR-017**: Interactive charts with click-through to profiles

#### Data Connection
```yaml
Statistics Sources:
  Popular Books: books_table.csv ["number of borrowers"]
  Active Readers: borrowers_table.csv ["number of borrowed books"]
  Gender: borrowers_table.csv ["<F>" flag count]
  Periods: Ledger file counts from transaction records
```

---

### 2.5 Transaction History

#### User Stories
- **As a researcher**, I want to see the actual borrowing transactions, so I can understand temporal patterns
- **As a historian**, I want to view transactions by date, so I can correlate with historical events

#### Requirements
- **FR-018**: View all transactions for a specific borrower
- **FR-019**: View all transactions for a specific book
- **FR-020**: Display transaction details:
  - Date borrowed
  - Date returned (if available)
  - Ledger source (indicating time period)
- **FR-021**: Sort transactions by date

#### Data Connection
```yaml
Transaction Sources:
  Files: record-Vol_1_1902.csv, record-vol_1_1.csv, 
         record-SL_Ledger_1934.csv, record-SL_Ledger_1940.csv
  Fields:
    - name_index → links to borrower
    - book_id → links to book
    - date (standardized date)
    - return date
    - Folder (ledger identifier)
```

---

### 2.6 Network Visualization

#### User Stories
- **As a digital humanist**, I want to see borrower-book relationships as a network, so I can discover hidden patterns
- **As a researcher**, I want to identify reading communities, so I can understand intellectual networks

#### Requirements
- **FR-022**: Interactive network graph with:
  - Borrowers as nodes (sized by books borrowed)
  - Books as nodes (sized by times borrowed)
  - Borrowing transactions as edges
- **FR-023**: Network filters:
  - Show only specific time period
  - Show only books borrowed by multiple people
  - Highlight gender
- **FR-024**: Click nodes to view profiles
- **FR-025**: Zoom and pan navigation

#### Data Connection
```yaml
Network Construction:
  Nodes:
    - Borrowers: borrowers_table.csv [all records]
    - Books: books_table.csv [all records]
  Edges:
    - Source: transaction records or pre-aggregated lists
    - Weight: number of times borrowed
```

---

### 2.7 Data Export

#### User Stories
- **As an academic**, I want to export filtered data, so I can analyze it in other tools
- **As a researcher**, I want to save specific views, so I can reference them later

#### Requirements
- **FR-026**: Export current view as CSV
- **FR-027**: Export individual profiles as JSON
- **FR-028**: Shareable URLs for all views (filters preserved)
- **FR-029**: Print-friendly profile pages

#### Data Connection
```yaml
Export Content:
  - Current filtered list (borrowers or books)
  - Individual profile data
  - Transaction records for specific entity
```

---

## 3. NON-FUNCTIONAL REQUIREMENTS

### 3.1 Performance
- **NFR-001**: Initial load time under 5 seconds
- **NFR-002**: Search results appear within 1 second
- **NFR-003**: Smooth interaction with up to 1,500 network nodes

### 3.2 Usability
- **NFR-004**: Mobile-responsive design
- **NFR-005**: Intuitive navigation without documentation
- **NFR-006**: Bilingual interface (English/Hebrew)

### 3.3 Accessibility
- **NFR-007**: Keyboard navigation support
- **NFR-008**: Screen reader compatible
- **NFR-009**: High contrast mode option

---

## 4. DATA SCHEMA

### 4.1 Core Entities

```yaml
Borrower:
  id: name_index
  name: "Name of the borrower"
  gender: "<F>" flag
  total_books: "number of borrowed books"
  unique_books: "Unique number of borrowed books"
  book_list: "borrowed books" (pre-aggregated)

Book:
  id: book_id
  title: "nli book name"
  author: from unique_books_list
  publisher: from unique_books_list
  year: from unique_books_list
  times_borrowed: "number of borrowers"
  borrower_list: "borrowers" (pre-aggregated)
  nli_link: "link_to_nli_page"

Transaction:
  borrower_id: name_index
  book_id: id/book_id
  date_borrowed: "date"
  date_returned: "return date"
  ledger: "Folder"
  language: "language - record"
```