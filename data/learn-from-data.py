import pandas as pd
import glob
import os

def generate_report():
    """
    Loads, processes, and analyzes the Strashun Library dataset
    to generate a comprehensive report.
    """
    print("Starting Data Analysis for Strashun Library Records...")
    print("="*50)

    # --- 1. DATA LOADING AND CONSOLIDATION ---
    print("\n[Phase 1/4] Loading and consolidating data files...")

    try:
        # Load the master book catalog
        unique_books_path = 'Transcription - Pilot - copy noam - unique books list.csv'
        if not os.path.exists(unique_books_path):
            print(f"ERROR: Master book catalog not found at '{unique_books_path}'")
            return
        unique_books_df = pd.read_csv(unique_books_path)

        # Use glob to find all ledger record files
        ledger_files = glob.glob('Transcription - Pilot - copy noam - Transcription - Pilot - record-*.csv')
        if not ledger_files:
            print("ERROR: No ledger files found. Make sure they are in the correct directory.")
            return

        all_transactions = []
        for f in ledger_files:
            df = pd.read_csv(f)
            # Standardize the book ID column name for merging
            df.rename(columns={'id': 'book_id', 'book id': 'book_id'}, inplace=True)
            all_transactions.append(df)

        # Concatenate all ledger files into a single DataFrame
        transactions_df = pd.concat(all_transactions, ignore_index=True)
        print(f"Successfully loaded and combined {len(ledger_files)} ledger files.")
        print(f"Total raw transaction records: {len(transactions_df)}")

    except Exception as e:
        print(f"An error occurred during data loading: {e}")
        return

    # --- 2. DATA CLEANING AND PREPROCESSING ---
    print("\n[Phase 2/4] Cleaning and preprocessing data...")

    # Clean book IDs in both dataframes before merging
    # Convert to numeric, coercing errors to NaN, then drop rows with no ID
    transactions_df['book_id'] = pd.to_numeric(transactions_df['book_id'], errors='coerce')
    transactions_df.dropna(subset=['book_id'], inplace=True)
    transactions_df['book_id'] = transactions_df['book_id'].astype(int)

    unique_books_df.rename(columns={'book_id': 'book_id_cat'}, inplace=True) # Avoid name clash before cleaning
    unique_books_df['book_id'] = pd.to_numeric(unique_books_df['record_id'], errors='coerce')
    unique_books_df.dropna(subset=['book_id'], inplace=True)
    unique_books_df['book_id'] = unique_books_df['book_id'].astype(int)


    # Convert 'date' column to datetime objects
    transactions_df['date'] = pd.to_datetime(transactions_df['date'], dayfirst=True, errors='coerce')
    transactions_df.dropna(subset=['date'], inplace=True)

    # Extract year and month for trend analysis
    transactions_df['year'] = transactions_df['date'].dt.year
    transactions_df['month'] = transactions_df['date'].dt.month

    # Standardize the gender column '<F>'
    transactions_df['is_female'] = transactions_df['<F>'] == 'F'

    print("Data cleaning complete.")
    print(f"Total valid transaction records after cleaning: {len(transactions_df)}")


    # --- 3. MERGING DATASETS ---
    print("\n[Phase 3/4] Merging transaction data with book catalog...")
    # Merge transactions with the unique books catalog to enrich the data
    # Using a left merge to keep all transactions, even if book metadata is missing
    merged_df = pd.merge(
        transactions_df,
        unique_books_df,
        on='book_id',
        how='left'
    )
    print("Merge complete.")
    print(f"Total records in merged dataset: {len(merged_df)}")


    # --- 4. ANALYSIS AND REPORTING ---
    print("\n[Phase 4/4] Performing analysis and generating report...")
    print("\n\n" + "="*60)
    print(" " * 15 + "STRASHUN LIBRARY LENDING REPORT")
    print("="*60)

    # Overall Summary Statistics
    total_loans = len(merged_df)
    unique_books_borrowed = merged_df['book_id'].nunique()
    unique_borrowers = merged_df["person's name"].nunique()
    start_date = merged_df['date'].min().strftime('%Y-%m-%d')
    end_date = merged_df['date'].max().strftime('%Y-%m-%d')

    print("\n--- GENERAL OVERVIEW ---")
    print(f"Analysis Period: {start_date} to {end_date}")
    print(f"Total Loans Recorded: {total_loans}")
    print(f"Unique Books Borrowed: {unique_books_borrowed}")
    print(f"Unique Borrowers: {unique_borrowers}")
    print("-" * 25)

    # Temporal Analysis
    print("\n--- BORROWING TRENDS OVER TIME ---")
    loans_by_year = merged_df['year'].value_counts().sort_index()
    print("Total Loans by Year:")
    print(loans_by_year.to_string())
    print("-" * 25)

    # Book Analysis
    print("\n--- BOOK ANALYSIS ---")
    # Clean the title column for better display
    merged_df['title'] = merged_df['title'].str.strip().str.replace('"', '')
    top_books = merged_df.dropna(subset=['title'])['title'].value_counts().nlargest(10)
    print("Top 10 Most Borrowed Books:")
    print(top_books.to_string())
    print("\n")

    # Clean the author column
    merged_df['creator-yivo'] = merged_df['creator-yivo'].str.split(';').str[0].str.strip()
    top_authors = merged_df.dropna(subset=['creator-yivo'])['creator-yivo'].value_counts().nlargest(10)
    print("Top 10 Most Borrowed Authors:")
    print(top_authors.to_string())
    print("-" * 25)

    # Language Analysis
    print("\n--- LANGUAGE ANALYSIS ---")
    book_language_dist = merged_df['language_nli'].value_counts()
    print("Distribution of Borrowed Books by Language (from NLI catalog):")
    print(book_language_dist.to_string())
    print("\n")
    
    record_language_dist = merged_df['language - record'].value_counts()
    print("Distribution of Ledger Entry Languages:")
    print(record_language_dist.to_string())
    print("-" * 25)
    
    # Borrower Analysis
    print("\n--- BORROWER ANALYSIS ---")
    top_borrowers = merged_df["person's name"].value_counts().nlargest(10)
    print("Top 10 Most Active Borrowers:")
    print(top_borrowers.to_string())
    print("\n")

    gender_dist = merged_df['is_female'].value_counts(normalize=True).mul(100).round(2)
    gender_dist.index = gender_dist.index.map({True: 'Female', False: 'Male/Unknown'})
    print("Gender Distribution of Borrowers (where identified):")
    print(gender_dist.to_string())
    print("-" * 25)

    print("\n" + "="*60)
    print(" " * 20 + "END OF REPORT")
    print("="*60)


if __name__ == '__main__':
    # Ensure all required files are present before running
    required_files = [
        'Transcription - Pilot - copy noam - unique books list.csv',
        'Transcription - Pilot - copy noam - Transcription - Pilot - record-Vol_1_1902.csv',
        'Transcription - Pilot - copy noam - Transcription - Pilot - record- vol 1_1.csv',
        'Transcription - Pilot - copy noam - Transcription - Pilot - record-SL Ledger 1934.csv',
        'Transcription - Pilot - copy noam - Transcription - Pilot - record-SL Ledger 1940.csv'
    ]
    
    missing_files = [f for f in required_files if not os.path.exists(f)]
    
    if not missing_files:
        generate_report()
    else:
        print("Execution failed. The following required files are missing:")
        for f in missing_files:
            print(f"- {f}")
        print("\nPlease ensure all files are in the same directory as the script.")
