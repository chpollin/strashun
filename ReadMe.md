# Strashun Library Digital Archive

A comprehensive digital humanities platform preserving and visualizing the lending records of the historic Strashun Library in Vilna (1902-1940).

**Live Demo**: https://chpollin.github.io/strashun/web-prototype  
**Repository**: https://github.com/chpollin/strashun

## Overview

This project presents an interactive exploration of 5,310 borrowing transactions from the Strashun Library, one of Eastern Europe's most significant Jewish libraries before the Holocaust. The archive encompasses 1,587 individual borrowers and 2,897 unique books, revealing the reading patterns and intellectual life of pre-war Jewish Vilna through innovative visualization techniques specifically designed for sparse historical data.

## Key Features

- **Advanced Search & Browse**: Full-text search across borrowers and books with multilingual support (Hebrew, Yiddish, Latin scripts)
- **Interactive Visualizations**: Statistical charts, network graphs, and timeline analysis
- **Ego-Network Analysis**: Novel approach for visualizing sparse data (99.7% sparsity)
- **Data Export**: Download filtered datasets in CSV or JSON formats
- **Deep Linking**: Share specific views and searches via URL
- **Responsive Design**: Optimized for desktop, tablet, and mobile devices

## The Dataset

### Overview Statistics
- **5,310** borrowing transactions
- **1,587** individual borrowers (38.4% identified as female)
- **2,897** books (1,261 cataloged + 1,636 "ghost records")
- **4** time periods: 1902, 1903-1904, 1934, 1940
- **28-year gap** (1905-1933) reflecting WWI and political upheavals

### Key Findings
- Hebrew periodicals dominated the most-borrowed items
- 86% of all borrowing occurred in November-December
- 93% decline in library usage from 1902-1904 to 1940
- 61.5% of readers borrowed only a single book
- Power-law distribution: 2% of readers account for 30% of transactions

### Data Processing Pipeline

The project employs a robust ETL pipeline (`prepare_data.py`) that transforms raw CSV ledgers into structured JSON:

**Processing Steps:**
1. **Consolidation**: Merges 4 ledger files from different time periods
2. **Standardization**: 
   - Dates → ISO 8601 format (handles Hebrew/Russian/Yiddish calendars)
   - Gender markers → W/M/Unknown (from various notations)
   - Book IDs → Unified numeric identifiers
3. **Enhancement**: Links transactions bidirectionally with books and borrowers
4. **Validation**: Generates quality metrics and identifies ghost records
5. **Pre-computation**: Network layouts for 5 time periods

**Data Quality Metrics:**
- 93.71% transaction completeness
- 1,636 ghost records preserved (56.5% of books)
- Date standardization success: 94%
- Gender identification: 4.35% female, 95.65% male (likely recording bias)

## Quick Start

### Online Access
Visit the live application at: https://chpollin.github.io/strashun/web-prototype

### Local Installation

```bash
# Clone repository
git clone https://github.com/chpollin/strashun.git
cd strashun

# Option 1: Use pre-built data
python -m http.server 8000
# Navigate to: http://localhost:8000/web-prototype/

# Option 2: Rebuild data from source
python prepare_data.py  # Requires pandas, numpy
python -m http.server 8000

# Alternative: Using Node.js
npx http-server web-prototype -p 8000
```

## Technical Architecture

### Technology Stack
- **Frontend**: Vanilla JavaScript (no framework dependencies)
- **Visualizations**: Chart.js 4.4.0, Vis.js Network 9.1.2
- **Styling**: Tailwind CSS 3.x (CDN)
- **Data Format**: JSON (pre-processed from CSV)
- **Deployment**: GitHub Pages (static hosting)

### Project Structure
```
strashun/
├── web-prototype/          # Frontend application
│   ├── index.html         
│   ├── style.css          
│   └── js/
│       ├── app-core.js     # Data management (12KB)
│       ├── app-views.js    # View controllers (28KB)
│       ├── app-init.js     # Initialization (8KB)
│       └── vis/            # Visualization modules
│           ├── charts.js   # Statistical charts (18KB)
│           ├── timeline.js # Temporal analysis (22KB)
│           └── ego-network.js # Network viz (25KB)
├── app/
│   ├── library_data.json   # Processed dataset (2.8MB)
│   ├── data_quality_report.json
│   └── data_summary.txt
├── data/                    # Source CSV files
│   └── Transcription - Pilot - *.csv (4 files)
├── prepare_data.py          # ETL pipeline script
├── PAPER.md                # Academic documentation
└── REQUIREMENTS.md         # Technical specifications
```

### Data Schema

**Core Entities:**
```javascript
// Transaction
{
  transaction_id: string,
  borrower_name: string,
  book_id: number,
  date: "YYYY-MM-DD",
  year: number,
  gender: "W" | "M" | "Unknown"
}

// Borrower (enhanced)
{
  borrower_name: string,
  transactions: Transaction[],
  unique_books: number[],
  years_active: number[],
  reading_velocity: float,  // books/year
  most_active_month: 1-12,
  total_transactions: number,
  unique_book_count: number
}

// Book (enhanced)
{
  book_id: number,
  title: string,
  is_ghost: boolean,
  transactions: Transaction[],
  unique_borrowers: string[],
  transaction_count: number,
  unique_borrower_count: number
}
```

**Pre-computed Network Data:**
- 5 time periods: all, 1902, 1903-1904, 1934, 1940
- Node types: `book-{id}`, `borrower-{name}`
- Edge weights: transaction frequency

## Features in Detail

### Search & Browse
- Full-text search with debouncing (300ms)
- Advanced filtering: period, gender, language, activity level
- Pagination: 20 items per page
- RTL text support for Hebrew/Yiddish

### Visualization Components

#### Statistical Charts
- **Bar Charts**: Most borrowed books, most active readers
- **Pie/Doughnut**: Period and gender distributions
- **Line Charts**: Temporal trends and seasonality
- **Radar Chart**: Day-of-week activity patterns

#### Network Analysis
- **Global Network**: Complete borrower-book ecosystem
- **Ego-Networks**: Individual-centered views (1st and 2nd degree)
- **Force-Directed Layout**: ForceAtlas2 algorithm
- **Interactive Features**: Zoom, pan, node dragging

#### Timeline Analysis
- **Granularities**: Yearly, period, monthly, seasonal
- **Metrics**: Transactions, unique users, gender ratios
- **Gap Visualization**: Explicit 1905-1933 representation
- **Cumulative Views**: Collection growth over time

### Data Export
- **CSV Export**: Filtered lists with metadata
- **JSON Export**: Complete profiles with relationships
- **URL Sharing**: Stateful deep links
- **Print Layouts**: Optimized for paper output

## Performance Metrics

### Data Processing
- Processing time: ~3-5 seconds for 5,310 transactions
- Output size: 2.8MB JSON (from 4MB+ CSV sources)
- Memory usage: <200MB during processing

### Runtime Performance
- Initial load: 3.6s (1.2s download + 2.4s processing)
- Search operations: <50ms
- Filter operations: <100ms
- Network rendering: 30 FPS (up to 500 nodes)
- Memory footprint: <150MB sustained

### Optimization Strategies
- Pre-computed aggregations and network layouts
- Debounced search inputs
- Lazy loading for visualizations
- Indexed data structures (Map objects)

## Methodological Innovations

### Handling Sparse Data (99.7% sparsity)
The extreme sparsity of the borrower-book matrix necessitated novel visualization approaches:

- **Ego-Networks**: Focus on individual nodes rather than the full network
- **Reading Fingerprints**: Individual temporal patterns instead of aggregates
- **Adaptive Visualizations**: Different strategies for casual vs. power readers

### Ghost Records Management
21.2% of transactions reference books without catalog metadata. These "ghost records" are:
- Preserved as historical evidence
- Marked with `is_ghost: true` flag
- Filterable in all views
- Analyzed as indicators of collection loss

### Temporal Discontinuity
The 28-year gap (1905-1933) is visualized explicitly rather than compressed, acknowledging historical disruption as data.

## Development

### Prerequisites
- Modern web browser (Chrome 90+, Firefox 88+, Safari 14+, Edge 90+)
- Python 3.7+ with pandas, numpy (for data processing)
- Local web server for development

### Configuration

Edit `js/app-core.js`:
```javascript
const Config = {
    ITEMS_PER_PAGE: 20,        // Pagination size
    SEARCH_DELAY: 300,          // Search debounce (ms)
    API: { 
        dataPath: '../app/library_data.json'  // Data location
    }
};
```

### Data Processing

Rebuild JSON from source CSVs:
```bash
cd strashun
python prepare_data.py

# Output files:
# - app/library_data.json (2.8MB)
# - app/data_quality_report.json
# - app/data_summary.txt
```

**Processing Configuration:**
- Date formats: DD/MM/YYYY, YYYY-MM-DD, MM/DD/YYYY (auto-detected)
- Gender mapping: 'x', 'f', 'female' → 'W'; others → 'M'
- Ghost records: Preserved with `is_ghost: true` flag

## Academic Context

This project addresses critical challenges in digital humanities:

### Methodological Contributions
- Novel approaches for visualizing sparse historical data
- Preservation of incomplete records as historical evidence
- Individual narrative preservation within statistical frameworks
- Temporal discontinuity as meaningful data

### Historical Significance
The Strashun Library, founded by Mattityahu Strashun (1817-1885), served as a premier center of Jewish intellectual life in Eastern Europe. These lending records, preserved through digitization, provide rare insights into the reading culture of a community largely destroyed in the Holocaust. Each transaction represents tangible evidence of intellectual engagement in pre-war Jewish Vilna.

### Research Applications
- Literary reception studies
- Social network analysis
- Gender studies in historical contexts
- Community literacy patterns
- Intellectual history of Eastern European Jewry

## Related Resources

- [National Library of Israel](https://www.nli.org.il/)
- [YIVO Institute for Jewish Research](https://yivo.org/)
- [Vilna Collections](https://www.vc.id.lv/)
- [Jewish Libraries in Eastern Europe](https://www.jewishlibraries.org/)

## Contact

- **Repository Issues**: [GitHub Issues](https://github.com/chpollin/strashun/issues)
- **Project Maintainer**: Christopher Pollin
