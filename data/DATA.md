Here is the final, complete `DATA.md` file containing all the information derived from the provided CSV files.

-----

# DATA.md

## Introduction

This document provides a comprehensive analysis of the dataset, which consists of transcribed borrowing records from a historical library, identified as the Strashun Library in Vilna. The data captures detailed information about the books available, the individuals who borrowed them, and the specific transaction dates for each loan.

The dataset is structured into several interconnected CSV files:

  * **Raw Ledger Data**: Four files contain the direct transcriptions of borrowing records from different ledgers and time periods (1902, 1903-1904, 1934, and 1940). These are the foundational source of the transaction data.
  * **Master Catalogs**: Two files serve as master lists for the books. One is a comprehensive `unique books list`, enriched with data from external catalogs like the National Library of Israel (NLI) and YIVO. The other details a specific collection, `Likutei Shoshanim`.
  * **Summary Tables**: Two files provide aggregated summaries of the raw data. The `books table` summarizes the borrowing history for each book, and the `borrowers table` summarizes the activity of each borrower.

The data model links the local library records to external, standardized cataloging systems, creating a rich dataset for historical and sociological analysis of the community's reading habits.

## Data Model and Relationships

The dataset is built on a relational model centered around **Books**, **Borrowers**, and the **Transactions** that link them.

  * **Borrowers**: Individuals who checked out books, identified by `person's name` and a unique `name_index`.
  * **Books**: The items borrowed from the library, identified by `book name` and a unique `id` or `book_id`.
  * **Transactions**: The core of the dataset, captured in the `record-*.csv` ledger files. Each row represents a single act of a borrower checking out a book on a specific date.

The files are linked using the following key identifiers:

```
                               +-------------------------+
                               |   unique books list.csv | (Master Book Catalog)
                               +-------------------------+
                                         ^
                                         | (id / book_id)
                                         |
+---------------------+      +---------------------------+      +-----------------+
| borrowers table.csv |<---- |   record-*.csv (Ledgers)  |----> | books table.csv |
| (Borrower Summary)  |      |      (Transactions)       |      | (Book Summary)  |
+---------------------+      +---------------------------+      +-----------------+
          ^ (name_index)                 | (Likutei Shoshanim_id)
          |                              |
          |                              v
          |                  +--------------------------+
          +----------------> |   Likutei Shoshanim.csv  | (Specific Collection)
                             +--------------------------+

```

## File Details and Data Fields

This section provides a detailed breakdown of each file, its purpose, and its data fields.

-----

### 1\. Ledger/Transaction Files

These four files contain the raw, transcribed borrowing records and form the foundation of the dataset. They all share a similar structure.

  * `Transcription - Pilot - copy noam - Transcription - Pilot - record-Vol_1_1902.csv`
  * `Transcription - Pilot - copy noam - Transcription - Pilot - record- vol 1_1.csv` (Covers 1903-1904)
  * `Transcription - Pilot - copy noam - Transcription - Pilot - record-SL Ledger 1934.csv`
  * `Transcription - Pilot - copy noam - Transcription - Pilot - record-SL Ledger 1940.csv`

**Description**: These files are the primary source of data, listing each instance a book was borrowed. Each row represents a unique transaction.

| Column Name | Data Type | Description |
| :--- | :--- | :--- |
| `Folder` | `object` (String) | The name of the source ledger or folder the record comes from (e.g., `Vol_1_1902`). |
| `ID - record` | `object` (String) | A unique identifier for the transcribed record. |
| `Page Number` | `int64` / `float64` | The page number in the original ledger where the record was found. |
| `Image name` | `object` (String) | The filename of the scanned image of the ledger page. |
| `language - record` | `object` (String) | The language of the entry in the ledger (e.g., `He` for Hebrew, `Ru` for Russian, `Yd` for Yiddish). |
| `number` | `int64` / `float64` | A sequential number assigned to the record within the ledger. |
| `date - Transcription` | `object` (String) | The date as it was written in the ledger. |
| `date` | `object` (String) | The standardized date of the borrowing transaction (e.g., `DD/MM/YYYY`). |
| `book name` | `object` (String) | The title of the book that was borrowed. |
| `person's name` | `object` (String) | The name of the person who borrowed the book. |
| `return date - Transcription`| `object` (String) | The return date as it was written in the ledger. |
| `return date` | `object` (String) | The standardized date the book was returned. |
| `<F>` | `object` (String) | A flag, likely 'F' to indicate a female borrower. |
| `Comment` | `object` (String) | Any additional comments or notes from the transcription. |
| `name_index` | `int64` / `float64`| A unique numerical ID assigned to each borrower. **Foreign Key to `borrowers table.csv`**. |
| `id` / `book id` | `int64` / `object` | A unique numerical ID for the book. **Foreign Key to `unique books list.csv`**. |

-----

### 2\. Master and Collection Catalogs

These files provide detailed, canonical information about the books in the library's collection.

#### `Transcription - Pilot - copy noam - unique books list.csv`

**Description**: This is the master catalog of all unique books found in the ledgers. It is enriched with metadata pulled from external sources like the National Library of Israel (NLI) and YIVO, providing standardized titles, authors, and publication details.

| Column Name | Data Type | Description |
| :--- | :--- | :--- |
| `book name` | `object` (String) | The book title as it appears in the ledger. |
| `book_id` | `int64` | A unique identifier for the book. **Primary Key**. |
| `Likutei Shoshanim_id` | `object` (String) | An identifier that links the book to the `Likutei Shoshanim` collection. |
| `link_to_nli_page` | `object` (String) | URL to the book's page on the National Library of Israel website. |
| `title` | `object` (String) | The official or full title of the book from NLI. |
| `type` | `object` (String) | The type of resource (e.g., `book`). |
| `record_id` | `int64` | The record ID, often the same as `book_id`. |
| `language_nli` | `object` (String) | The language of the book according to NLI (e.g., `heb`). |
| `publisher` | `object` (String) | The publisher of the book. |
| *... (30+ other columns)* | *various* | Contains many other fields from NLI and YIVO providing rich metadata on authors, publication dates, genres, etc. |

#### `Transcription - Pilot - copy noam - Likutei Shoshanim.csv`

**Description**: A catalog of books from a specific collection called "Likutei Shoshanim." It includes its own metadata and links to NLI records.

| Column Name | Data Type | Description |
| :--- | :--- | :--- |
| `Index` | `object` (String) | A unique index for the entry in this list (e.g., `1_LS`). |
| `Original string` | `object` (String) | The original text describing the book from the source catalog. |
| `Book Title` | `object` (String) | The title of the book. |
| `Author` | `object` (String) | The author of the book. |
| `Publishing Place` | `object` (String) | The city or place of publication. |
| `Gregorian Calendar Year`| `int64` | The year of publication in the Gregorian calendar. |
| `api_record_id` | `object` (String) | The record ID from an external API, likely NLI. |
| *... (other columns)* | *various* | Includes other metadata fields from an API (`api_title`, `api_author`, etc.). |

-----

### 3\. Summary Tables

These files provide aggregated views of the borrowing data for easier analysis.

#### `Transcription - Pilot - copy noam - books table.csv`

**Description**: This table summarizes the borrowing history for each unique book, showing how many times it was borrowed and by which individuals.

| Column Name | Data Type | Description |
| :--- | :--- | :--- |
| `nli book name` | `object` (String) | The name of the book, often standardized from NLI. |
| `number of borrowers` | `int64` | The total number of times this book was borrowed. |
| `borrowers` | `object` (String) | A stringified dictionary listing the borrowers' names and the ledger they are from. |
| `id` | `int64` | The book's unique ID. **Foreign Key to `unique books list.csv`**. |
| `Unnamed: 0`, `Unnamed: 6` | `float64`, `object` | Index or empty columns. |
| `Borrower Selection`, `Borrower Link` | `object` (String) | Purpose unclear, often empty. |

#### `Transcription - Pilot - copy noam - borrowers table.csv`

**Description**: This table summarizes the activity for each unique borrower, showing how many and which books they borrowed.

| Column Name | Data Type | Description |
| :--- | :--- | :--- |
| `Name of the borrower` | `object` (String) | The name of the borrower. |
| `name_index` | `int64` | The unique ID for the borrower. **Primary Key**. |
| `number of borrowed books`| `int64` | The total count of books this person borrowed (including duplicates). |
| `Unique number of borrowed books`| `int64` | The count of unique book titles this person borrowed. |
| `borrowed books` | `object` (String) | A stringified dictionary listing the titles of the books borrowed and the ledger they are from. |
| `<F>` | `object` (String) | A flag, likely 'F' to indicate a female borrower. |
| `Book Selection`, `Book Link` | `object` (String) | Purpose unclear, often empty. |
| `Unnamed: 8`, `Unnamed: 9` | `float64` | Empty or auxiliary columns. |



================================================================================
                     STRASHUN LIBRARY HISTORICAL ANALYSIS REPORT
================================================================================

Generated on: August 06, 2025 at 15:29:53

================================================================================
EXECUTIVE SUMMARY
================================================================================

This report analyzes the historical borrowing records of the Strashun Library
in Vilna, covering a period from 1902 to 1940 
(37.4 years).

KEY FINDINGS:
• 4,942 total borrowing transactions
• 1,414 individual borrowers  
• 1,603 books in collection (1,603 were actually borrowed)
• 1,049 transactions for books without complete catalog metadata
• 554 books have complete title information

================================================================================
COLLECTION OVERVIEW
================================================================================

LIBRARY HOLDINGS:
• Total Books:                    1,603
• Books with Complete Metadata:   554 (34.6%)
• Books with Author Information:  284 (17.7%)
• Books with Publisher Info:      494 (30.8%)
• Ghost Records:                  1,049 (transactions exist but no catalog data)
• Books Never Borrowed:           0

LANGUAGE DISTRIBUTION:
• heb                  519 books
• yid                  14 books
• heb;ger              4 books
• heb;yid              2 books
• yid;heb              2 books
• heb;lat              1 books
• ger;heb              1 books
• ara;heb              1 books
• heb;arc;lat          1 books
• arc;heb              1 books


================================================================================
BORROWING ACTIVITY ANALYSIS
================================================================================

DATE RANGE: November 14, 1902 - April 10, 1940

ANNUAL BORROWING ACTIVITY:
• 1902: 2,410 transactions
• 1903: 1,861 transactions
• 1904: 224 transactions
• 1934: 319 transactions
• 1940: 128 transactions

MONTHLY PATTERNS:
• January      319 transactions
• February     224 transactions
• April        128 transactions
• November     1,135 transactions
• December     3,136 transactions

DAY OF WEEK PATTERNS:
• Monday       993 transactions
• Wednesday    847 transactions
• Friday       812 transactions
• Tuesday      762 transactions
• Thursday     691 transactions
• Sunday       423 transactions
• Saturday     414 transactions


================================================================================
MOST POPULAR BOOKS
================================================================================

The following books were the most frequently borrowed:

+------+--------------------+--------------------+----------------+
| Rank | Title              | Author             | Times Borrowed |
+------+--------------------+--------------------+----------------+
| 1    | אחיאסף לוח-עם ספ...| Unknown Author     | 245            |
| 2    | השחר : ... בו יב...| Unknown Author     | 203            |
| 3    | השלח מכתב עתי חד...| Unknown Author     | 139            |
| 4    | דברי ימי היהודים...| Unknown Author     | 116            |
| 5    | התועה בדרכי החיי...| Unknown Author     | 107            |
| 6    | זכרונות לבית דוד...| Unknown Author     | 105            |
| 7    | [תלמוד בבלי] / ....| עובדיה מברטנורה....| 89             |
| 8    | תורה, נביאים וכת...| Unknown Author     | 83             |
| 9    | המליץ.             | טראכטמאן, ישעיהו...| 75             |
| 10   | הדור יוצא אחת בש...| Unknown Author     | 61             |
| 11   | מסתרי פאריז : הי...| Unknown Author     | 61             |
| 12   | שולחן ערוך / ......| Unknown Author     | 49             |
| 13   | עולם כמנהגו : ספ...| גארדאן, יהודה לי...| 48             |
| 14   | ספר דברי ימי עול...| חריף, שלום בן אי...| 46             |
| 15   | הישראלי : צייטונ...| Unknown Author     | 42             |
| 16   | Book ID 99002240...| Unknown Author     | 40             |
| 17   | קול מבשר : הוספה...| Unknown Author     | 38             |
| 18   | חטאת נעורים, או,...| Unknown Author     | 36             |
| 19   | על פרשת דרכים : ...| רוזאניס, יהודא. ...| 36             |
| 20   | ספר כור עני : בת...| Unknown Author     | 30             |
+------+--------------------+--------------------+----------------+

================================================================================
MOST POPULAR AUTHORS
================================================================================

The most frequently borrowed authors were:

+------+--------------------------+------------------+
| Rank | Author                   | Total Borrowings |
+------+--------------------------+------------------+
| 1    | טראכטמאן, ישעיהו, b. 1...| 124              |
| 2    | עובדיה מברטנורה. ; Oba...| 89               |
| 3    | חריף, שלום בן איסר, 17...| 50               |
| 4    | גארדאן, יהודה ליב, 186...| 48               |
| 5    | פין, שמואל יוסף, 1818-...| 44               |
| 6    | מאפו, אברהם בן יקותיאל...| 39               |
| 7    | רוזאניס, יהודא. ; Juda...| 36               |
| 8    | שטיינבעגג, יהושע, נפ׳ ...| 27               |
| 9    | קולון,יוסף. ; Joseph b...| 25               |
| 10   | שמואל פייווש כהנא. ; S...| 24               |
| 11   | מלאך, יצחק שמעון. ; Yi...| 23               |
| 12   | היילפרין, פ. ; P. Heil...| 16               |
| 13   | ווייס, אייזק הירש, 181...| 15               |
| 14   | Ẓevi Rabinowitz ha-Coh...| 14               |
| 15   | גינצבורג, מרדכי אהרן, ...| 12               |
+------+--------------------------+------------------+

================================================================================
BORROWER ANALYSIS
================================================================================

ACTIVITY SUMMARY:
• Total Borrowers:              1,414
• Average Books per Borrower:   3.5
• Median Books per Borrower:    1.0
• Most Active Borrower:         132 books

BORROWING PATTERNS:
• Single-book borrowers:        811 (57.4%)
• Active borrowers (5+ books):  223 (15.8%)
• Heavy users (10+ books):      121 (8.6%)
• Super users (20+ books):      34 (2.4%)

MOST ACTIVE BORROWERS:

+------+--------------------+--------------------+--------------+
| Rank | Name               | Total Transactions | Unique Books |
+------+--------------------+--------------------+--------------+
| 1    | אברהם אברהם קצנל...| 132                | 13           |
| 2    | מאיר מאצקין        | 107                | 42           |
| 3    | אברהם גארדאן       | 88                 | 36           |
| 4    | בנימין מער         | 80                 | 44           |
| 5    | יעקב טריוואש       | 60                 | 20           |
| 6    | Штернфельдъ Гиршъ  | 52                 | 27           |
| 7    | Кремеръ Биняминъ   | 50                 | 21           |
| 8    | יעקב וויינשטיין    | 49                 | 25           |
| 9    | Кобленцъ Хаимъ     | 42                 | 20           |
| 10   | מאיר גאלאמב        | 38                 | 23           |
| 11   | נתן גרינבלאט       | 33                 | 10           |
| 12   | צבי טייץ           | 32                 | 11           |
| 13   | Левинъ Гиршъ       | 31                 | 16           |
| 14   | חיים הערצמאן       | 31                 | 15           |
| 15   | חיים קריינעש       | 31                 | 7            |
| 16   | אהרן ראבינאוויץ    | 30                 | 12           |
| 17   | יעקב סגל           | 30                 | 20           |
| 18   | Мацкинъ Мееръ      | 29                 | 12           |
| 19   | משה אנטוקולסקי     | 29                 | 22           |
| 20   | Шапиро Бенцiонъ    | 28                 | 17           |
+------+--------------------+--------------------+--------------+

================================================================================
DATA QUALITY ASSESSMENT
================================================================================

COMPLETENESS:
• Complete Records:     78.8% of transactions have complete book metadata
• Missing Metadata:     1,049 transactions reference books not in catalog  
• Catalog Coverage:     1,603 of 1,603 cataloged books were actually borrowed
• Utilization Rate:     100.0% of collection was borrowed

HISTORICAL CONTEXT:
This dataset represents a fascinating snapshot of Jewish intellectual life in 
Vilna during the early 20th century. The Strashun Library was one of the most 
important Jewish libraries in Eastern Europe, serving as a center of learning 
and culture.

The borrowing patterns reveal insights into:
• Popular literary and religious texts of the period
• Reading habits across different seasons and years  
• Community engagement with the library as a cultural institution
• The diversity of the collection and its users

TECHNICAL NOTES:
• Analysis covers 37.4 years of borrowing history
• 1,049 "ghost records" exist where transactions reference books not 
  present in the master catalog
• Date formatting standardized to YYYY-MM-DD format
• Borrower names normalized to reduce duplicates from variant spellings

================================================================================
END OF REPORT
================================================================================

This report was generated automatically from the historical library records.
For questions about the data or methodology, please refer to the accompanying 
documentation.
