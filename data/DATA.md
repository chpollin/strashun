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