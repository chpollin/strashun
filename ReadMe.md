# Strashun Library Digital Archive

A web-based visualization platform for historical library lending records from the Strashun Library in Vilna (1902-1940).

## Project Overview

This digital humanities project presents an interactive exploration of 5,310 borrowing transactions from the Strashun Library, one of the most significant Jewish libraries in Eastern Europe before the Holocaust. The dataset encompasses 1,587 individual borrowers and 2,897 unique books, offering insights into the reading patterns and intellectual life of the pre-war Jewish community in Vilna.

## Dataset Characteristics

### Temporal Coverage
- **Active Periods**: 1902, 1903-1904, 1934, 1940
- **Data Gap**: 1905-1933 (28 years, attributed to WWI and political reorganization)
- **Total Span**: 37.4 years of library history

### Data Composition
- **Transactions**: 5,310 borrowing records
- **Borrowers**: 1,587 unique individuals (38.4% identified as female)
- **Books**: 2,897 titles (1,261 with complete metadata, 1,636 "ghost records")
- **Network Density**: 0.3% (99.7% sparsity in borrower-book matrix)
- **Languages**: Hebrew (519 titles), Yiddish (14 titles), mixed languages (14 titles)

### Key Patterns
- Extreme seasonality: 86% of borrowing activity concentrated in November-December
- Power-law distribution: 58.4% of borrowers checked out only one book
- Significant decline: 93% reduction in library usage from 1902-1904 to 1940
- Hebrew periodicals dominated the most-borrowed items

## Technical Architecture

### Frontend Technologies

#### Core JavaScript Implementation
- **Module Architecture**: ES6 modules with namespace pattern
- **State Management**: Centralized AppState object with immutable update patterns
- **Data Structures**: JavaScript Map objects for O(1) lookups, Set objects for unique collections
- **Performance Optimizations**: 
  - Debouncing (300ms delay for search operations)
  - Lazy loading for visualization components
  - Virtual DOM updates for list rendering
  - Request Animation Frame for smooth animations

#### Data Visualization Libraries

**Chart.js v4.4.0**
- Implementation of statistical visualizations
- Chart types utilized: bar, horizontal bar, line, pie, doughnut, radar
- Custom plugins for tooltip enhancement and data labeling
- Configuration for responsive sizing and interactive legends

**Vis.js Network v9.1.2**
- Force-directed graph layouts using ForceAtlas2 algorithm
- Physics simulation parameters:
  - Gravitational constant: -60
  - Central gravity: 0.015
  - Spring length: 120
  - Damping: 0.4
- Node clustering based on edge weights
- Interactive features: zoom, pan, node dragging, click events

#### Styling Framework

**Tailwind CSS v3.x (CDN)**
- Utility-first CSS framework
- Responsive breakpoints: 640px, 768px, 1024px, 1280px
- Custom color palette defined in CSS variables
- Grid and Flexbox layouts for responsive design

### Data Processing Pipeline

#### ETL Process
1. **Extract**: Dynamic discovery of CSV source files
2. **Transform**: 
   - Field standardization across ledgers
   - Date normalization (Hebrew, Russian, Yiddish calendars)
   - Name disambiguation and normalization
   - Gender marker standardization
3. **Load**: Generation of unified JSON structure with pre-computed indices

#### Data Enrichment
- Integration with National Library of Israel (NLI) catalog
- YIVO Institute metadata incorporation
- Bibliographic standardization for 34.6% of collection

### Browser Technologies

- **Local Storage**: Avoided due to artifact environment constraints
- **URL State Management**: URLSearchParams API for deep linking
- **File API**: FileReader for data export functionality
- **Canvas API**: Chart rendering and image export
- **Intersection Observer**: Planned for infinite scroll implementation

## Application Architecture

### Module Structure

```
app-core.js (12KB)
├── Config: Application configuration
├── AppState: Global state management
├── DataManager: Data loading and processing
├── FilterManager: Search and filter operations
├── ExportManager: CSV/JSON export functionality
└── URLManager: URL state synchronization

app-views.js (28KB)
├── NavigationManager: View routing and navigation
├── BookView: Book list and detail views
├── BorrowerView: Borrower list and detail views
└── PaginationManager: List pagination controls

Visualization Modules:
├── charts.js (18KB): Statistical visualizations
├── timeline.js (22KB): Temporal analysis
└── ego-network.js (25KB): Network visualizations
```

### Data Flow Architecture

1. **Initial Load**: JSON data fetched and parsed (~3.6 seconds)
2. **Indexing**: Creation of lookup maps for O(1) access
3. **Filtering**: Client-side filtering with result caching
4. **Rendering**: Component-based view updates
5. **Export**: Synchronous generation of CSV/JSON downloads

## Visualization Methodologies

### Statistical Visualizations
- **Bar Charts**: Most borrowed books, most active readers
- **Pie/Doughnut Charts**: Period and gender distributions
- **Line Charts**: Temporal trends and seasonality patterns
- **Radar Charts**: Day-of-week activity patterns

### Network Visualization Approaches

#### Global Network View
- Bipartite graph representation (borrowers and books as distinct node types)
- Force-directed layout for natural clustering
- Edge weights representing borrowing frequency
- Node sizing based on activity levels

#### Ego-Network Innovation
Addresses 99.7% sparsity through localized views:
- First-degree connections only (default)
- Optional second-degree connections
- Linear scaling with node degree rather than network size
- Maximum observed degree: 245 (most popular book)

### Temporal Visualizations
- Multiple granularities: yearly, period, monthly, seasonal
- Metrics: total transactions, unique borrowers/books, gender ratios
- Explicit representation of data gaps (1905-1933)
- Cumulative growth charts for collection analysis

## Performance Characteristics

### Load Performance
- Initial data fetch: 1.2 seconds
- Data processing: 2.4 seconds
- Time to interactive: 3.6 seconds
- Memory footprint: <150MB during extended sessions

### Runtime Performance
- Search operations: <50ms average response time
- Filter operations: <100ms for full dataset
- Network rendering: 30 FPS maintained up to 500 nodes
- Chart updates: <200ms for data refresh

### Optimization Strategies
- Pre-computed aggregations in build process
- Index structures for frequent lookups
- Debounced search inputs
- Pagination for large result sets (20 items per page)
- Lazy initialization of visualization components

## Data Quality Management

### Ghost Records (21.2% of transactions)
Books referenced in transactions but lacking catalog entries are preserved as "ghost records" rather than excluded, maintaining data integrity and enabling research into collection losses.

### Normalization Procedures
- **Name Standardization**: 1,587 unique borrowers after consolidation
- **Title Aggregation**: 42 variants of "Achiasef" consolidated
- **Date Standardization**: Multiple calendar systems unified to ISO format
- **Language Codes**: Standardized to ISO 639-2 (heb, yid, ger, etc.)

## Browser Compatibility

### Supported Browsers
- Chrome 90+ (recommended)
- Firefox 88+
- Safari 14+
- Edge 90+

### Required Browser APIs
- ES6 JavaScript support
- Canvas 2D Context
- Fetch API
- URL API
- CSS Grid and Flexbox

## Deployment Configuration

### Static Hosting Requirements
- Web server with MIME type support for JSON
- CORS headers for CDN resources
- HTTPS recommended for clipboard API functionality

### File Structure
```
web-prototype/
├── index.html (22KB)
├── style.css (15KB)
├── js/
│   ├── app-core.js (12KB)
│   ├── app-views.js (28KB)
│   ├── app-init.js (8KB)
│   └── vis/
│       ├── charts.js (18KB)
│       ├── timeline.js (22KB)
│       └── ego-network.js (25KB)
└── ../app/
    └── library_data.json (2.8MB)
```

## Development Environment

### Prerequisites
- Node.js 14+ or Python 3.7+ (for local server)
- Modern web browser with Developer Tools
- Git for version control

### Local Development Setup
```bash
# Clone repository
git clone [repository-url]

# Navigate to project
cd strashun-library

# Serve with Python
python -m http.server 8000

# Or serve with Node.js
npx http-server web-prototype -p 8000

# Access application
# http://localhost:8000/
```

### Debug Utilities
Browser console commands for development:
- `StrashunDebug.getStats()`: Current data statistics
- `StrashunDebug.checkPerformance()`: Memory and DOM metrics
- `StrashunDebug.testNavigation()`: Automated navigation testing

## Future Development Considerations

### Proposed Enhancements
1. Implementation of Web Workers for data processing
2. IndexedDB integration for offline functionality
3. Progressive Web App manifest for installability
4. WebAssembly modules for compute-intensive operations
5. Service Worker for advanced caching strategies

### Scalability Considerations
Current architecture supports datasets up to 50,000 transactions with minimal refactoring. Beyond this threshold, server-side processing and pagination would be recommended.

## Academic Context

This project addresses methodological challenges in digital humanities, specifically the visualization of sparse historical data. The ego-network approach and reading biography fingerprints represent novel solutions to the 99.7% sparsity problem inherent in the dataset.

## Data Preservation

The project serves as a digital preservation effort for materials from a library largely destroyed during the Holocaust. Each transaction record represents tangible evidence of intellectual life in pre-war Eastern European Jewish communities.

## Contact Information

For technical inquiries regarding implementation details or data structure, please refer to the project repository issues section. Academic inquiries about the historical context or dataset provenance should be directed to the project maintainers.

---

Last Updated: August 2025  
Version: 1.0.0