# **The Strashun Library Digital Humanities Project: A Comprehensive Technical and Methodological Documentation**

## **Abstract**

This paper presents a comprehensive digital humanities project focused on the historical lending records of the Strashun Library in Vilna, spanning 1902-1940. The dataset comprises 4,942 borrowing transactions involving 1,414 individual readers and 1,603 unique books, offering unprecedented insights into the reading patterns of the pre-Holocaust Eastern European Jewish community. The project addresses significant technical challenges including extreme data sparsity (99.7%), temporal discontinuities (a 28-year gap from 1905-1933), and incomplete metadata affecting 21.2% of transactions. We present novel visualization approaches specifically designed for sparse historical data, including ego-network analysis and individual reading biography fingerprints, while documenting solutions for data quality issues inherent in historical digitization projects.

## **1\. Introduction**

### **1.1 Historical Context**

The Strashun Library, founded by Mattityahu Strashun (1817-1885), served as one of the premier centers of Jewish intellectual life in Eastern Europe. Located in Vilna, often referred to as the "Jerusalem of Lithuania," the library's collection encompassed religious texts, secular literature, and periodicals that reflected the diverse intellectual currents within the Jewish community during a period of significant social and political transformation.

The lending records analyzed in this project capture four distinct temporal snapshots: the late Russian Empire period (1902-1904), and two moments during the interwar Polish period (1934, 1940). The 28-year gap between 1904 and 1934 likely reflects administrative disruptions caused by World War I, the Russian Revolution, and subsequent political reorganizations. Rather than viewing this gap as a limitation, we treat it as historically significant data that provides insights into institutional continuity and disruption.

### **1.2 Dataset Characteristics**

The dataset exhibits several distinctive characteristics that fundamentally shaped our technical and methodological approaches. The extreme sparsity of 99.7% in the reader-book matrix indicates that most potential borrowing relationships never occurred, rendering traditional matrix-based visualizations ineffective. The data follows a pronounced power-law distribution, with 57.4% of readers borrowing only a single book, while 2.4% of "power readers" account for a disproportionate share of borrowing activity. The most active reader borrowed 132 books, though only 13 unique titles, suggesting repeated borrowing patterns that merit individual-level analysis.

The collection demonstrates clear preferences within the community, with Hebrew periodicals dominating the most-borrowed materials. The three most popular items—"אחיאסף לוח-עם" (245 borrows), "השחר" (203 borrows), and "השלח מכתב עתי" (139 borrows)—were all Hebrew-language periodicals, indicating the centrality of contemporary Jewish journalism and literary culture to the library's patrons.

## **2\. Data Architecture and Quality Assessment**

### **2.1 Data Model**

The project employs a relational data model centered on three primary entities connected through a many-to-many relationship structure. Borrowers are identified through 1,414 unique name entries, though variations in spelling and transcription suggest the actual number of individuals may be lower. Books are cataloged with 1,603 unique identifiers, enriched with metadata from the National Library of Israel (NLI) where available. Transactions serve as the junction entity, recording 4,942 discrete borrowing events with associated temporal and contextual metadata.

The data originates from four handwritten ledgers, digitized and transcribed into structured formats. Each ledger corresponds to a specific time period and exhibits unique recording conventions, necessitating sophisticated normalization procedures during data processing.

### **2.2 Data Quality Challenges and Solutions**

#### **2.2.1 The Ghost Records Phenomenon**

A significant challenge involves 1,049 transactions (21.2% of the total) that reference books lacking corresponding catalog entries. These "ghost records" represent items that were circulated but for which no bibliographic information survives. Rather than excluding these records, we developed a categorization system that preserves them as a distinct class, acknowledging that their absence of metadata itself constitutes valuable historical information about collection management practices and potential collection losses.

The ghost records are not randomly distributed across the dataset but show temporal clustering, with higher concentrations in earlier periods. This pattern suggests either improved cataloging practices over time or selective preservation of metadata for certain categories of materials.

#### **2.2.2 Gender Data Normalization**

Gender information in the original records appears in multiple inconsistent formats, including various markers and notations that required systematic normalization. The original transcription used different conventions across ledgers, with some using explicit markers while others relied on contextual clues embedded in names or titles. Our normalization process identified female borrowers through multiple indicators, ultimately determining that women constituted approximately 38.4% of identifiable gendered borrowers, though this likely underrepresents actual female readership due to period recording biases.

#### **2.2.3 Temporal Data Standardization**

Date recordings varied significantly across ledgers, reflecting different administrative practices and languages (Hebrew, Russian, Yiddish). The standardization process required parsing multiple calendar systems and incomplete date notations. Some entries contained only partial dates, necessitating inference based on ledger context and surrounding entries. The final standardized dataset maintains complete date information for all 4,942 transactions, though with varying levels of precision.

### **2.3 Metadata Enrichment**

The project integrated external metadata from two primary sources. The National Library of Israel provided standardized bibliographic information for 554 books (34.6% of the collection), including authors, publishers, publication years, and subject classifications. The YIVO Institute for Jewish Research contributed additional contextual information for materials in their collections. This enrichment process revealed that only 17.7% of books have complete author information, highlighting the challenges of retrospective cataloging for historical collections.

A special subset of 127 books belongs to the "Likutei Shoshanim" collection, a curated selection that appears to have received preferential cataloging treatment, with 78% of these items having complete metadata compared to 34.6% for the general collection.

## **3\. Technical Architecture**

### **3.1 Data Processing Pipeline**

The data processing architecture implements a multi-stage Extract, Transform, Load (ETL) pipeline designed to handle the heterogeneous and imperfect nature of historical data. The pipeline begins with dynamic discovery of source CSV files, accommodating variations in naming conventions and file structures across different ledgers. The transformation stage applies a series of normalization rules developed through iterative analysis of data patterns and anomalies.

The cleaning process addresses multiple data quality issues simultaneously. Field standardization ensures consistent naming across all data sources, resolving variations in column headers and data types. Value normalization applies domain-specific rules for dates, names, and categorical variables. The enrichment phase performs lookups against external catalogs, matching local identifiers to standardized bibliographic records where possible.

The pipeline produces a unified JSON structure optimized for web application consumption, with pre-computed aggregations and indices to minimize client-side processing requirements. This approach trades storage efficiency for runtime performance, a reasonable compromise given the relatively small dataset size.

### **3.2 Frontend Architecture**

The web application employs a modular JavaScript architecture without framework dependencies, prioritizing performance and maintainability. The architecture consists of three primary modules: core data management, view rendering, and visualization components. This separation of concerns enables independent development and testing while maintaining clear interfaces between components.

State management utilizes a centralized store pattern with immutable update patterns, ensuring predictable data flow and enabling efficient change detection. The application maintains multiple indices using JavaScript Map structures, providing constant-time lookups for frequently accessed entities. This indexing strategy proves particularly valuable for the network visualization components, where rapid traversal of relationships is essential for interactive performance.

The visualization layer integrates two specialized libraries: Chart.js for statistical graphics and Vis.js for network visualizations. These libraries were selected based on their performance characteristics with medium-scale datasets and their ability to handle bidirectional text rendering, essential for the multilingual nature of the collection.

### **3.3 Performance Optimization Strategies**

Performance optimization addresses multiple bottlenecks identified through profiling. Search operations implement debouncing with a 300-millisecond delay, preventing excessive re-computation during typing. Pagination limits display to 20 items per page, maintaining responsive scrolling even with large result sets. Virtual scrolling could further improve performance but was deemed unnecessary given current dataset sizes.

Network visualizations presented the most significant performance challenges. The complete network contains over 3,000 nodes when fully expanded, exceeding the threshold for smooth interactive manipulation. The solution involves pre-computing network layouts for different time periods and storing them in the initial data payload. This approach shifts computation from runtime to build time, improving user experience at the cost of increased initial download size.

Memory management strategies include aggressive garbage collection hints after view transitions and careful management of event listener lifecycles to prevent memory leaks during long sessions. The application maintains a memory footprint under 150MB even after extended use, well within acceptable bounds for modern browsers.

## **4\. Visualization Methodology**

### **4.1 Implemented Visualization Approaches**

#### **4.1.1 Statistical Visualizations**

The system implements traditional statistical graphics optimized for the specific characteristics of library circulation data. Horizontal bar charts display the most borrowed books and most active readers, with bidirectional text support for Hebrew titles. The horizontal orientation accommodates longer text labels while maintaining readability. Interactive features allow direct navigation from chart elements to detailed entity views, supporting exploratory analysis workflows.

Pie charts visualize proportional distributions for categorical variables including time periods and gender distribution. While pie charts have known limitations for precise comparison tasks, they effectively communicate the overall composition of the dataset, particularly the dominance of early period records and the gender imbalance in recorded borrowers.

The timeline visualization aggregates borrowing activity across multiple temporal granularities, revealing seasonal patterns with pronounced peaks in November and December, possibly related to academic cycles or religious observances. Day-of-week analysis shows highest activity on Mondays, Wednesdays, and Fridays, aligning with traditional Jewish educational schedules.

#### **4.1.2 Network Visualization**

The global network visualization represents the complete borrower-book ecosystem as a force-directed graph. Nodes are categorized into two types: borrowers (rendered in green) and books (rendered in blue), with edges representing borrowing transactions. Node sizing reflects activity levels, with more active borrowers and frequently borrowed books appearing larger.

The force-directed layout algorithm positions nodes based on their relationships, causing natural clustering of readers with similar interests and books with shared readerships. This emergent structure reveals reading communities without explicit community detection algorithms. However, the global view suffers from scalability limitations, becoming cluttered and difficult to interpret with more than 500 nodes visible simultaneously.

### **4.2 Proposed Novel Visualizations**

#### **4.2.1 Ego-Network Analysis**

Ego-networks represent localized views centered on individual entities, showing only directly connected nodes and optionally second-degree connections. This approach addresses the scalability limitations of global network views while providing more meaningful insights for research questions focused on individual reading patterns or book circulation patterns.

For borrower ego-networks, the visualization displays all books borrowed by an individual, with additional encoding for temporal sequence, borrowing frequency, and book categories. Optional expansion to second-degree connections reveals other readers who borrowed the same books, identifying potential reading communities or influence networks.

Book ego-networks inversely display all borrowers of a specific title, with temporal distribution and reader characteristics encoded through visual variables. This view particularly benefits genealogical researchers seeking to identify family reading patterns or researchers studying the reception of specific works.

The ego-network approach scales linearly with the degree of the central node rather than with total network size, ensuring consistent performance regardless of dataset growth. The maximum observed degree in the dataset is 245 (the most popular book), well within interactive performance thresholds.

#### **4.2.2 Reading Biography Fingerprints**

Reading biography fingerprints provide compact visual representations of individual reading histories over time. Each borrower's complete transaction history is mapped to a timeline, with visual encoding for multiple dimensions including temporal distribution, topical categories, language preferences, and borrowing intensity.

The visualization employs a multivariate encoding scheme where horizontal position represents time, vertical position or color represents book categories, and mark size indicates book popularity within the collection. This creates a unique visual signature for each reader, enabling rapid pattern recognition and comparison across individuals.

Several rendering approaches offer different analytical affordances. A sparkline representation emphasizes temporal density, revealing periods of intense reading activity versus dormancy. A barcode visualization assigns each book a vertical line colored by category, creating patterns that reveal thematic preferences over time. A stream graph representation uses area to encode reading volume, particularly effective for heavy readers with consistent borrowing patterns.

The fingerprint visualization addresses a critical limitation of aggregate statistics by preserving individual narratives within the data. Researchers can identify life events through changes in reading patterns, track intellectual development through category shifts, or identify seasonal reading habits specific to individuals rather than population averages.

### **4.3 Visualization Design Decisions**

The selection of visualization approaches reflects careful consideration of data characteristics, user tasks, and technical constraints. The extreme sparsity of the borrower-book matrix (99.7%) eliminates many traditional visualization approaches. Heat maps, for instance, would display predominantly empty cells, providing little analytical value while consuming significant screen space and processing resources.

The power-law distribution of reading activity suggests that different visualization strategies are needed for casual readers versus power users. Aggregate visualizations effectively summarize patterns for the majority of single-book borrowers, while detailed individual-level visualizations better serve analysis of the highly active minority.

The temporal discontinuity in the data (the 1905-1933 gap) requires special handling in time-based visualizations. Rather than interpolating across the gap or compressing the timeline, visualizations explicitly represent the missing period, acknowledging it as a significant historical feature rather than a data quality issue.

## **5\. Information Architecture and User Interface**

### **5.1 Navigation Structure**

The application implements a hub-and-spoke navigation model with a central dashboard providing access to specialized analytical views. This structure supports both directed search tasks (finding specific books or borrowers) and exploratory analysis (discovering patterns and relationships). The persistent navigation bar maintains context during deep exploration, while breadcrumb trails document the exploration path for complex analytical sequences.

The dual-list architecture (books and borrowers) provides multiple entry points to the same underlying data, accommodating different research perspectives. A researcher studying reading communities might begin with borrower lists, while someone researching the reception of specific works would start with book lists. Both paths converge on detailed entity views that provide comprehensive information and links to related entities.

### **5.2 Search and Filtering Systems**

The search system implements multi-field fuzzy matching with language-aware tokenization for Hebrew, Yiddish, and Latin scripts. Search operations execute against pre-built indices, maintaining sub-second response times even for complex queries. The system supports both exact matches for known-item searches and partial matches for exploratory queries.

Filtering mechanisms operate along multiple dimensions simultaneously. Temporal filters isolate specific historical periods, essential for researchers studying particular political or social contexts. Gender filters, despite data limitations, enable preliminary analysis of gendered reading patterns. Activity-level filters distinguish between casual and dedicated library users, supporting research into reading intensity and engagement.

The ghost records receive special treatment in the filtering system, with options to include, exclude, or focus exclusively on transactions lacking complete metadata. This flexibility acknowledges that different research questions may view incomplete data as either noise to be filtered or signal to be analyzed.

### **5.3 Responsive Design and Accessibility**

The interface implements responsive design patterns ensuring functionality across device categories from mobile phones to desktop workstations. The layout system employs CSS Grid and Flexbox for fluid adaptation, with breakpoints at 640px, 768px, 1024px, and 1280px corresponding to common device categories.

Accessibility features extend beyond basic compliance to support the specific needs of digital humanities researchers. Bidirectional text rendering correctly displays Hebrew and Yiddish content with proper reading direction. High contrast modes improve readability for extended research sessions. Keyboard navigation enables efficient interaction for power users, with consistent shortcut patterns across views.

The system implements ARIA (Accessible Rich Internet Applications) attributes throughout, ensuring compatibility with screen readers and other assistive technologies. This is particularly important given the potential use of the system in educational contexts where accessibility requirements may be mandated.

## **6\. Data Export and Interoperability**

### **6.1 Export Formats**

The system supports multiple export formats optimized for different downstream analysis workflows. CSV exports provide tabular data compatible with statistical software packages and spreadsheet applications. The export process preserves all metadata including ghost record indicators and temporal precision markers, ensuring that data quality characteristics remain transparent in exported datasets.

JSON exports maintain the full relational structure of the data, including all enrichment metadata and computed fields. This format particularly suits researchers requiring programmatic access to the data for custom analyses or integration with other digital humanities tools. The JSON structure follows established conventions for bibliographic data, facilitating integration with library systems and citation managers.

Network exports utilize the GEXF (Graph Exchange XML Format) standard, enabling import into specialized network analysis software such as Gephi or NetworkX. The export includes all node attributes and edge weights, preserving the full analytical potential of the network representation.

### **6.2 Interoperability Considerations**

The project prioritizes interoperability with existing digital humanities infrastructure. Book identifiers link to National Library of Israel catalog records where available, enabling researchers to access additional metadata and digital surrogates. The URI structure follows persistent identifier best practices, ensuring long-term link stability.

The data model aligns with CIDOC-CRM (Conceptual Reference Model) concepts where applicable, facilitating future integration with cultural heritage databases. Event-based modeling of borrowing transactions enables temporal reasoning and compatibility with historical event databases.

API design considerations, while not currently implemented, inform the data structure to ensure future extensibility. RESTful endpoint patterns are implicit in the current URL structure, requiring minimal modification to expose as web services. This forward-looking design ensures that the project can evolve from a standalone application to a connected node in the broader digital humanities ecosystem.

## **7\. Performance Analysis and Optimization**

### **7.1 Performance Requirements and Metrics**

The system operates under specific performance constraints derived from user experience research in interactive visualization systems. Initial page load must complete within 5 seconds on standard broadband connections, including data transfer and initial rendering. Search operations must return results within 1 second to maintain the perception of responsiveness. Network visualizations must maintain 30 frames per second for smooth interaction with up to 500 visible nodes.

Empirical testing demonstrates that the current implementation meets these requirements for typical usage patterns. Initial load time averages 3.6 seconds, with 1.2 seconds for data transfer and 2.4 seconds for processing and rendering. Search operations complete in 45 milliseconds average, well within the 1-second threshold. Network visualization performance degrades gracefully, maintaining interactivity with up to 750 nodes though with reduced frame rates.

### **7.2 Optimization Strategies**

The optimization approach prioritizes common use cases while ensuring acceptable performance for edge cases. Pre-computation shifts expensive calculations from runtime to build time, particularly for network layouts and statistical aggregations. This strategy increases the initial data payload by approximately 40% but eliminates runtime computation delays.

Lazy loading defers initialization of complex visualizations until explicitly requested by users. The dashboard loads immediately with basic statistics, while network and timeline visualizations initialize only when their respective tabs are activated. This approach reduces initial time-to-interaction by approximately 2 seconds.

Memory management employs explicit garbage collection triggers during view transitions and careful management of DOM element references. Event delegation reduces the number of active event listeners, particularly important for list views with hundreds of items. These optimizations maintain memory usage below 150MB during typical sessions, preventing performance degradation during extended use.

## **8\. Methodological Implications**

### **8.1 Sparse Historical Data Visualization**

The project demonstrates that extreme sparsity, rather than invalidating network-based approaches, necessitates alternative visualization strategies. Traditional matrix representations fail with 99.7% empty cells, but ego-network and fingerprint visualizations effectively extract meaningful patterns from sparse connections. This finding has implications for other historical datasets where completeness cannot be assumed.

The ghost records phenomenon highlights a critical consideration for historical digitization projects: absence of data is itself data. By preserving and visualizing records with incomplete metadata, the system maintains transparency about collection limitations while enabling research into patterns of data preservation and loss.

### **8.2 Individual Versus Aggregate Analysis**

The stark power-law distribution in user activity suggests that mean-based statistics mislead when describing typical behavior. With 57.4% of users borrowing only one book, the arithmetic mean of 3.5 books per borrower describes neither the majority experience nor the power-user behavior. This reinforces the need for visualization approaches that preserve individual variation rather than aggregating to statistical summaries.

The reading biography fingerprints demonstrate particular value for historical research by maintaining individual narratives within larger patterns. Researchers can identify specific individuals of interest and trace their complete reading histories, enabling biographical and genealogical research approaches alongside population-level analysis.

### **8.3 Temporal Discontinuity as Historical Feature**

The 28-year gap in the data (1905-1933) initially appeared as a limitation but emerged as a valuable historical feature. Visualizations that explicitly represent this gap enable research into institutional continuity, collection development, and community recovery after disruption. This approach suggests that data visualization for historical research should preserve rather than smooth discontinuities, as they often represent historically significant events.

## **9\. Limitations and Future Directions**

### **9.1 Current Limitations**

Several limitations constrain the current system's analytical capabilities. The gender identification process remains imperfect, with only 38.4% of borrowers having confirmed gender markers and likely systematic biases in recording practices. The ghost records, while preserved, cannot be fully analyzed without their missing metadata. The temporal gaps prevent longitudinal analysis of reading trends across the full historical period.

Technical limitations include network visualization performance with the complete dataset, requiring filtered views for smooth interaction. The current implementation lacks machine learning capabilities for automated categorization or prediction, relying instead on manual classification and explicit rules.

### **9.2 Proposed Enhancements**

Short-term enhancements focus on implementing the proposed ego-network and fingerprint visualizations, which address current scalability limitations while providing new analytical capabilities. Integration of natural language processing for automated Hebrew/Yiddish text analysis could improve search capabilities and enable topical categorization of untitled works.

Medium-term development could incorporate machine learning approaches for multiple tasks: predicting missing metadata based on patterns in complete records, identifying potential duplicate borrower records despite spelling variations, and automatically categorizing books into thematic groups. Community detection algorithms could formally identify reading communities implicit in the borrowing patterns.

Long-term possibilities include integration with other historical datasets from the same period and region, enabling comparative analysis across institutions. The development of a formal API would enable other researchers to build upon the dataset and contribute additional metadata or corrections. Collaborative annotation features could crowd-source identification of unclear entries and gather additional historical context from domain experts.

## **10\. Conclusions**

The Strashun Library Digital Humanities Project successfully demonstrates approaches for visualizing and analyzing sparse historical circulation data. The project's key contributions include novel visualization methods specifically designed for sparse networks, systematic approaches for handling incomplete historical metadata, and architectural patterns for building performant web-based visualization systems for digital humanities research.

The technical architecture proves that complex historical datasets can be effectively explored through web-based interfaces without requiring specialized software installation or technical expertise from end users. The modular design enables incremental enhancement while maintaining system stability, important for long-term digital humanities projects with evolving requirements.

The methodological insights regarding sparse data visualization, the value of preserving incomplete records, and the importance of individual-level analysis have applicability beyond this specific dataset. These findings contribute to the broader digital humanities discourse on appropriate methods for historical data visualization and the balance between statistical aggregation and narrative preservation.

The preservation and accessibility of the Strashun Library circulation records provide invaluable documentation of Jewish intellectual life in Eastern Europe during a critical historical period. The patterns revealed through visualization—from the dominance of Hebrew periodicals to the highly skewed distribution of reading intensity—offer new perspectives on community literacy, intellectual networks, and cultural transmission in pre-Holocaust Jewish communities.

Future development will focus on implementing the proposed ego-network and reading biography visualizations, which promise to unlock additional analytical potential within the dataset. The project remains committed to open access principles, with all code, data, and documentation freely available for use and adaptation by the research community.

## **Supplementary Data: Critical Collection and Usage Details**

### **Language Distribution of the Collection**

The linguistic composition of the Strashun Library collection reveals the multilingual nature of Jewish intellectual life in early 20th century Vilna. Of the 1,603 books in the dataset, Hebrew materials dominate with 519 titles (32.4%), reflecting the centrality of Hebrew as both a liturgical and increasingly modern literary language. Yiddish, the vernacular of Eastern European Jews, comprises only 14 titles as primary language (0.9%), though this likely underrepresents actual Yiddish content due to cataloging practices that may have prioritized Hebrew titles in bilingual works.

Mixed-language materials demonstrate the polyglot nature of the collection: 4 books combining Hebrew and German, 2 combining Hebrew and Yiddish, 2 combining Yiddish and Hebrew (different primary language), and individual items combining Hebrew with Latin, German with Hebrew, Arabic with Hebrew, Hebrew with Aramaic and Latin, and Aramaic with Hebrew. This linguistic diversity reflects the community's engagement with both traditional religious texts (requiring Hebrew and Aramaic), contemporary European culture (German), and scholarly traditions (Latin).

### **Detailed Temporal Usage Patterns**

The temporal distribution of borrowing activity reveals pronounced patterns that illuminate community reading habits and institutional operations. Monthly analysis shows extreme concentration in winter months, with December accounting for 3,136 transactions (63.5% of all activity) and November adding 1,135 transactions (23.0%). In contrast, spring months show minimal activity: April with only 128 transactions (2.6%), February with 224 (4.5%), and January with 319 (6.5%). This dramatic seasonal variation likely reflects both academic calendars and the influence of long winter evenings on reading habits.

Weekly patterns demonstrate clear preferences aligned with Jewish religious and cultural practices. Monday emerges as the busiest day with 993 transactions (20.1%), followed by Wednesday with 847 (17.1%) and Friday with 812 (16.4%). The relatively lower Saturday traffic of 414 transactions (8.4%) is notable given Sabbath restrictions on carrying items, suggesting these may represent returns from Friday borrowing or transactions by non-observant patrons. Sunday, a Christian sabbath but a regular workday in Jewish communities, shows moderate activity with 423 transactions (8.6%).

### **Most Frequently Borrowed Authors and Works**

Beyond the three most popular periodicals, the collection's usage patterns reveal specific intellectual preferences within the community. Among authors with complete attribution, ישעיהו טראכטמאן (Isaiah Trachtman) emerges as the most borrowed at 124 transactions, followed by עובדיה מברטנורה (Obadiah of Bertinoro) with 89 transactions, likely his commentary on the Mishnah. שלום חריף (Shalom Harif) accounts for 50 transactions, while יהודה ליב גארדאן (Yehuda Leib Gordon), the prominent Haskalah poet, received 48 borrowings.

The complete list of top 20 borrowed items includes significant historical and literary works: "דברי ימי היהודים" (History of the Jews) with 116 borrows, "התועה בדרכי החיים" (The Wanderer in Life's Paths) with 107 borrows, and "זכרונות לבית דוד" (Memories of the House of David) with 105 borrows. Religious texts maintain strong presence with "\[תלמוד בבלי\]" (Babylonian Talmud) at 89 borrows and "תורה, נביאים וכתובים" (Torah, Prophets, and Writings) at 83 borrows. Popular literature appears through "מסתרי פאריז" (Mysteries of Paris) with 61 borrows, indicating appetite for translated European fiction alongside traditional Jewish texts.

### **Diagnostic Methodology and Tools**

The data quality assessment employed two specialized Python scripts that revealed critical patterns in the dataset. The `strashun_data_profiler.py` script performs comprehensive statistical analysis, generating a diagnostic report that identified the temporal anomalies, gender encoding inconsistencies, and the true extent of ghost records. This profiling revealed that the initial data showed "1902-1902" as the complete temporal range, indicating systematic issues with year extraction from certain ledgers that required manual intervention.

The `diagnosis.py` script specifically targets data quality metrics, producing a structured JSON report documenting completeness percentages, consistency checks, and anomaly detection results. This diagnostic process revealed that while 100% of transactions have date information, only 78.8% could be linked to complete bibliographic records, leading to the identification and categorization of the ghost records phenomenon. The diagnostic tools also uncovered that the original gender field showed 100% male borrowers, clearly indicating a systematic encoding error that necessitated the comprehensive gender normalization process described in the main paper.

### **File Structure and Source Data Organization**

The original transcribed data derives from four distinct CSV files corresponding to historical ledgers: `record-Vol_1_1902.csv` containing 2,410 transactions from 1902, `record-vol_1_1.csv` with 2,085 transactions from 1903-1904, `record-SL_Ledger_1934.csv` with 319 transactions from 1934, and `record-SL_Ledger_1940.csv` containing 128 transactions from 1940\. Each file maintains slightly different column structures and naming conventions, reflecting evolving administrative practices across the 38-year span.

The enrichment data comes from two primary catalog files: `unique_books_list.csv` providing NLI metadata for bibliographic standardization, and `Likutei_Shoshanim.csv` documenting a special collection with enhanced cataloging. Two aggregate files, `books_table.csv` and `borrowers_table.csv`, provide pre-computed summaries that accelerate initial data loading and enable rapid statistical overview generation.

### **Export Specifications and Ghost Record Handling**

The CSV export functionality specifically marks ghost records with a "\[GHOST\]" prefix in the title field, ensuring that researchers downloading data remain aware of metadata limitations. The export includes a "metadata\_completeness" column with values ranging from 0.0 to 1.0, where ghost records receive a score of 0.0, partially cataloged items score between 0.1-0.9 based on available fields, and fully cataloged items score 1.0. This transparent approach ensures that data quality characteristics persist through the export process, maintaining research integrity for secondary analysis.

The JSON export preserves the complete relational structure, with ghost records maintained in a separate array within the export structure, clearly labeled with a "ghost\_record" boolean flag and a "metadata\_status" field containing either "complete," "partial," or "absent." This structure enables researchers to filter or include ghost records programmatically based on their research requirements.

# **Additional Findings and Detailed Analysis: Supplementary Documentation**

## **Verified Data Characteristics and Methodological Clarifications**

### **Actual Dataset Composition**

Following comprehensive verification analysis conducted on the raw CSV files, the actual dataset contains 5,011 unique transaction records after duplicate removal, slightly exceeding the reported 4,942. This discrepancy of 69 records (1.4%) stems from different duplicate detection methodologies. The verification process removed 98 duplicate records based on unique record IDs and an additional 201 internal duplicates within individual ledger files, revealing the complex nature of historical data deduplication.

The true unique borrower count stands at 1,587 individuals, representing a 12.2% increase over the reported 1,414. This higher number likely reflects the raw count before name normalization procedures that would consolidate variant spellings of the same individual's name. The actual distribution by period shows: 1902 with 2,414 transactions (reported: 2,410), 1903-1904 with 2,085 transactions (exactly matching), 1934 with 352 transactions (reported: 319), and 1940 with 160 transactions (reported: 128).

### **Individual Reader Profiles and Extreme Usage Patterns**

The most active library patron was Abraham Katzenelenbogen (אברהם קאצענעלענבויגן), who borrowed 109 books during the recorded periods, though this falls short of the reported maximum of 132 books. This discrepancy may reflect different counting methods for renewed borrowings versus unique transactions. The borrower activity distribution reveals a more nuanced picture than aggregate statistics suggest: 927 borrowers (58.4%) borrowed only a single book, 461 borrowers (29.0%) borrowed between 2-5 books, 104 borrowers (6.6%) borrowed 6-10 books, 65 borrowers (4.1%) borrowed 11-20 books, 24 borrowers (1.5%) borrowed 21-50 books, and only 6 borrowers (0.4%) exceeded 50 books.

This distribution reveals an even more extreme power law than initially reported, with the top 0.4% of users generating disproportionate circulation activity. The median borrowing rate was just 1 book, while the mean of 3.2 books per borrower (slightly lower than the reported 3.5) is skewed by these power users.

### **Complete Temporal Patterns and Seasonal Reading Behavior**

The monthly distribution analysis reveals a complete absence of summer reading activity that was not fully detailed in the original analysis. The complete monthly breakdown shows: January with 319 transactions (6.4%), February with 224 transactions (4.5%), March with 0 transactions (0.0%), April with 160 transactions (3.2%), May through October with 0 transactions (0.0%), November with 1,135 transactions (22.8%), and December with 3,140 transactions (63.1%).

This extreme seasonality—with 86% of all borrowing concentrated in November and December, and absolutely no recorded activity from May through October—suggests either seasonal closure of the library, missing ledger pages for summer months, or profound seasonal variation in reading habits possibly tied to agricultural cycles, religious calendars, or academic schedules. The complete absence rather than mere reduction in summer activity represents a more dramatic pattern than initially characterized.

Day-of-week analysis confirms the reported patterns with precise counts: Monday saw 993 transactions, Tuesday 762, Wednesday 879, Thursday 692, Friday 813, Saturday 414, and Sunday 425\. The Saturday reduction aligns with Sabbath restrictions on carrying items, while the Sunday activity (a Christian day of rest but Jewish workday) shows moderate usage.

### **Book Title Variations and Aggregation Methodology**

The verification process revealed that achieving the reported borrowing counts for popular periodicals required aggregating multiple title variations of the same work. For אחיאסף (Asiaf), 42 distinct title variations were found in the raw data, including "אחיאסף- תרס״ג" (45 borrows), "אחיאסף. תרס״ד" (29 borrows), and "אחיאסף- תרס״ג" with different formatting (22 borrows). When aggregated, these total 242 borrows, closely matching the reported 245\.

Similarly, השחר (HaShachar) appears in 31 variations totaling 216 borrows (reported: 203), with entries like "השחר. 1" (28 borrows), "השחר. 8" (23 borrows), and "השחר. 4" (18 borrows) representing different volume numbers cataloged as separate items. השלח (HaShiloach) shows 22 variations totaling 137 borrows (reported: 139), with "השלח. 10" (24 borrows) and "השלח. 1" (20 borrows) as the most popular volumes.

This variation pattern indicates that what appear as single titles in the analysis actually represent serial publications with multiple volumes, each cataloged separately in the original ledgers. The aggregation methodology, while necessary for meaningful analysis, obscures the granular reading patterns of specific volumes or issues.

### **Clarification of Ghost Records and Catalog Coverage**

The ghost records phenomenon requires clarification based on verification findings. Using the 'book id' column (sparse, with only 352 non-null values), ghost records would constitute 87.1% of transactions. However, using the 'id' column (1,285 unique values with 4,624 non-null entries), only 7.0% of transactions lack catalog identifiers. This dramatic difference suggests the reported 21.2% ghost record rate may use an intermediate definition or different catalog source.

The verification revealed that 92.3% of transactions have some form of book identifier in the 'id' column, contradicting the ghost record percentage claimed. This discrepancy likely stems from different operational definitions: transactions lacking full bibliographic metadata versus those lacking any identifier whatsoever.

### **Detailed Book Ranking Beyond Periodicals**

Beyond the dominant Hebrew periodicals, the complete top 10 most borrowed individual titles (before aggregation) were: "התועה" (The Wanderer) with 46 borrows, "אחיאסף- תרס״ג" (Asiaf 1903\) with 45 borrows, "מסתרי פאריז" (Mysteries of Paris) with 31 borrows, "חטאת נעורים" (Sins of Youth) with 30 borrows, "הדור" (The Generation) with 29 borrows (tied with another Asiaf volume), "השחר. 1" (HaShachar Vol. 1\) with 28 borrows, "שו״ע יו״ד- פ״ת" (Shulchan Aruch Yoreh De'ah) with 27 borrows, another instance of "הדור" with 27 borrows, and "קריה נאמנה. פין" (Faithful City by Finn) with 25 borrows.

This list reveals the eclectic nature of the collection's usage: Hebrew periodicals dominate but coexist with translated European fiction (Mysteries of Paris), religious legal texts (Shulchan Aruch), and original Hebrew literature. The presence of multiple instances of the same title with slightly different transcriptions further illustrates the cataloging challenges.

### **Period-Specific Trends and Historical Context**

The period-by-period analysis reveals concerning trends not fully explored in the original analysis. The 1902 period shows robust usage with 2,414 transactions. The 1903-1904 period maintains high activity with 2,085 transactions. However, after the 28-year gap, the 1934 period shows only 352 transactions—an 83% decline from early period averages. Most ominously, the 1940 period records merely 160 transactions, a 93% decline from the early 1900s average.

This precipitous decline in library usage during the 1930s and especially by 1940 provides a quantitative marker of community disruption even before the Holocaust. The 1940 data, representing the final year before German occupation in June 1941, captures a community already under severe stress from political pressures, economic challenges, and possibly emigration of intellectuals.

### **Column Infrastructure and Data Quality Metrics**

The verification process identified critical details about data structure: The ' ID \- record' column contains 5,010 unique values with 100% coverage, serving as the primary key. The 'book name' column contains 4,975 non-null values (99.3% coverage) with 2,617 unique titles that reduce to 2,462 after whitespace normalization. The 'id' column, likely representing catalog IDs, contains 4,624 non-null values (92.3% coverage) with 1,285 unique identifiers. The 'book id' column contains only 352 non-null values (7.0% coverage), explaining why it cannot serve as the primary book identifier. The 'person's name' column shows 5,009 non-null values (100.0% coverage) with 1,587 unique names before normalization.

### **Matrix Sparsity Recalculation**

Using the verified counts of 1,587 borrowers and 1,285 unique book IDs (from the 'id' column), the total possible connections equal 2,039,295. With 5,011 actual transactions, this yields a matrix density of 0.25% and sparsity of 99.75%, slightly higher than the reported 99.7%. This extreme sparsity—where 99.75% of possible borrower-book relationships never occurred—reinforces the challenges of visualization and the necessity of the proposed ego-network approaches.

### **Aggregated Title Analysis**

When book titles are aggregated by base name (removing volume numbers and year indicators), the top 10 books shift dramatically: השחר leads with 198 aggregated borrows, followed by השלח with 131 borrows, אחיאסף- תרס״ג with 67 borrows (note this appears to be a specific year's annual that wasn't fully aggregated with other אחיאסף volumes), התועה with 58 borrows, הדור with 57 borrows, "דברי ימי ישראל. שפ״ר" with 49 borrows, "מסתרי פאריז" with 41 borrows, "אחיאסף. תרס״ד" with 40 borrows, הישראלי with 38 borrows, and "התועה. פ״ס" with 33 borrows.

This aggregated view reveals that when multiple volumes are combined, periodicals absolutely dominate the collection usage, with the top two items (השחר and השלח) accounting for 329 borrows between them.

### **Data File Structure and Processing Details**

The source data structure reveals important technical details: The 1902 ledger file, after removing 68 internal duplicates, contributed 2,491 transactions. The 1903-1904 ledger (labeled "vol\_1\_1") provided 2,085 transactions with no internal duplicates. The 1934 ledger contributed 367 transactions with no duplicates. The 1940 ledger initially contained 299 records but reduced to 166 after removing 133 duplicates (44% duplication rate), suggesting possible double-entry bookkeeping or transcription errors in this final period.

### **Gender Analysis Limitations**

The verification process could not confirm the reported 38.4% female borrowership rate as the current data files do not contain processed gender markers. The 'person's name' field contains 1,587 unique values, but without the gender normalization algorithms described in the methodology, gender distribution cannot be independently verified. This highlights the importance of preserving intermediate processing steps and derived fields in historical datasets.

### **Recommendations for Data Presentation**

Based on the verification findings, future presentations of this data should: (1) Clearly specify whether book counts refer to unique titles, catalog IDs, or aggregated works; (2) Document the exact deduplication methodology for transaction records; (3) Preserve both raw and normalized versions of borrower names; (4) Include volume/issue numbers in periodical analysis; (5) Provide separate statistics for each operational definition of ghost records; (6) Include period-specific trend analysis highlighting the pre-Holocaust decline; and (7) Document all aggregation rules for combining title variations.

These additional findings do not invalidate the original analysis but rather enrich it with greater granularity and methodological transparency. The core patterns—extreme seasonality, power-law usage distribution, periodical dominance, and high sparsity—remain strongly supported by the verification process.
