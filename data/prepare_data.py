import pandas as pd
import glob
import json
import os
import re
import logging

# --- Setup Compact Logger ---
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

def normalize_borrower_name(name):
    """
    A simple function to normalize borrower names.
    This can be expanded with more rules.
    """
    if not isinstance(name, str):
        return name
    # Example rule: Standardize different spellings of a name
    name = name.strip()
    if 'קאצ' in name:
        name = re.sub(r'קאצינעלנבויגן|קאצענעלענבויגן', 'אברהם קצנלנבוגן (מאוחד)', name)
    # Add more normalization rules here as needed
    return name

def create_data_for_app():
    """
    Loads all CSVs, processes them, and exports a single, optimized
    JSON file for use in a web application.
    """
    logging.info("Starting Data Preparation for Strashun Library App.")

    # --- 1. LOAD DATA ---
    logging.info("[1/5] Loading all source CSV files...")
    try:
        # Load the master book catalog
        books_df = pd.read_csv('Transcription - Pilot - copy noam - unique books list.csv')
        logging.info(f"  - Loaded book catalog with {len(books_df)} rows.")

        # Load all ledger files
        ledger_files = glob.glob('Transcription - Pilot - copy noam - Transcription - Pilot - record-*.csv')
        if not ledger_files:
            logging.error("No ledger files found. Aborting.")
            return
        
        transactions_list = [pd.read_csv(f) for f in ledger_files]
        transactions_df = pd.concat(transactions_list, ignore_index=True)
        logging.info(f"  - Loaded and combined {len(ledger_files)} ledgers into {len(transactions_df)} total transaction rows.")

    except FileNotFoundError as e:
        logging.error(f"Missing file - {e.filename}. Aborting.")
        return
    except Exception as e:
        logging.error(f"An error occurred during file loading: {e}")
        return

    # --- 2. CLEAN AND PREPARE DATA ---
    logging.info("[2/5] Cleaning and preparing data...")
    
    # --- Clean Transactions ---
    initial_transactions = len(transactions_df)
    
    # Debug: Print column names to understand the structure
    logging.info(f"  - Transaction columns: {list(transactions_df.columns)}")
    
    # Handle book_id column unification more carefully
    if 'book id' in transactions_df.columns and 'id' in transactions_df.columns:
        # Fill missing 'id' values with 'book id' values
        transactions_df['id'] = transactions_df['id'].fillna(transactions_df['book id'])
        transactions_df = transactions_df.drop(columns=['book id'])
    elif 'book id' in transactions_df.columns:
        transactions_df.rename(columns={'book id': 'id'}, inplace=True)
    
    # Rename to standardized column name
    transactions_df.rename(columns={'id': 'book_id'}, inplace=True)
    
    # Convert book_id to numeric, handling various formats
    transactions_df['book_id'] = pd.to_numeric(transactions_df['book_id'], errors='coerce')
    
    # Remove rows with missing critical data
    transactions_df.dropna(subset=['book_id', 'date', "person's name"], inplace=True)
    
    # Convert to int after dropping NaN
    transactions_df['book_id'] = transactions_df['book_id'].astype(int)
    
    # Clean and standardize dates
    transactions_df['date'] = pd.to_datetime(transactions_df['date'], dayfirst=True, errors='coerce').dt.strftime('%Y-%m-%d')
    transactions_df.dropna(subset=['date'], inplace=True)
    
    # Create transaction IDs
    transactions_df['transaction_id'] = transactions_df.index.astype(str)
    logging.info(f"  - Transactions: Kept {len(transactions_df)} of {initial_transactions} rows after cleaning.")

    # --- Clean Books Catalog ---
    initial_books = len(books_df)
    
    # Debug: Print books column names
    logging.info(f"  - Books columns: {list(books_df.columns)}")
    
    # Map column names more carefully
    book_col_mapping = {}
    available_cols = books_df.columns.tolist()
    
    # Find the correct book ID column
    id_candidates = ['record_id', 'book_id', 'id']
    id_col = None
    for candidate in id_candidates:
        if candidate in available_cols:
            id_col = candidate
            break
    
    if id_col is None:
        logging.error("Could not find book ID column in books catalog!")
        return
    
    book_col_mapping[id_col] = 'book_id'
    
    # Map other important columns
    col_mappings = {
        'title': 'book_title',
        'creator-yivo': 'author',
        'publisher': 'publisher', 
        'link_to_nli_page': 'nli_link',
        'language_nli': 'language'
    }
    
    for old_col, new_col in col_mappings.items():
        if old_col in available_cols:
            book_col_mapping[old_col] = new_col
    
    # Select and rename columns
    selected_cols = list(book_col_mapping.keys())
    books_df = books_df[selected_cols].rename(columns=book_col_mapping)
    
    # Clean book_id column
    books_df['book_id'] = pd.to_numeric(books_df['book_id'], errors='coerce')
    books_df.dropna(subset=['book_id'], inplace=True)
    books_df['book_id'] = books_df['book_id'].astype(int)
    books_df.drop_duplicates(subset=['book_id'], keep='first', inplace=True)
    
    logging.info(f"  - Book Catalog: Kept {len(books_df)} of {initial_books} unique book records.")
    logging.info(f"  - Book ID range: {books_df['book_id'].min()} to {books_df['book_id'].max()}")
    logging.info(f"  - Transaction book ID range: {transactions_df['book_id'].min()} to {transactions_df['book_id'].max()}")

    # --- 3. NORMALIZE BORROWER NAMES ---
    logging.info("[3/5] Normalizing borrower names...")
    unique_names_before = transactions_df["person's name"].nunique()
    transactions_df['borrower_name_normalized'] = transactions_df["person's name"].apply(normalize_borrower_name)
    unique_names_after = transactions_df['borrower_name_normalized'].nunique()
    logging.info(f"  - Consolidated {unique_names_before} unique names down to {unique_names_after}.")

    # --- 4. ENRICH AND STRUCTURE DATA ---
    logging.info("[4/5] Merging data and building final JSON structure...")
    
    # Debug merge operation
    logging.info(f"  - Books available for merge: {len(books_df)}")
    logging.info(f"  - Transactions to merge: {len(transactions_df)}")
    
    # Check for common book_ids
    common_ids = set(books_df['book_id']).intersection(set(transactions_df['book_id']))
    logging.info(f"  - Common book IDs between datasets: {len(common_ids)}")
    
    merged_df = pd.merge(transactions_df, books_df, on='book_id', how='left')
    
    unmatched_transactions = merged_df[merged_df.columns[merged_df.columns.str.endswith('_x') == False]].select_dtypes(include=['object']).isna().all(axis=1).sum()
    if 'book_title' in merged_df.columns:
        unmatched_transactions = merged_df['book_title'].isna().sum()
    else:
        unmatched_transactions = len(merged_df) - len(common_ids)
    
    if unmatched_transactions > 0:
        logging.warning(f"  - Found {unmatched_transactions} transactions for books not present in the catalog (ghost records).")

    # Fill missing values for string columns
    str_cols_to_fill = []
    for col in ['book_title', 'author', 'publisher', 'language', 'nli_link']:
        if col in merged_df.columns:
            str_cols_to_fill.append(col)
            merged_df[col] = merged_df[col].fillna('')

    # Create books list
    books_list = []
    for book_id, group in merged_df.groupby('book_id'):
        first_row = group.iloc[0]
        book_data = {
            "id": int(book_id),
            "transaction_ids": group['transaction_id'].tolist()
        }
        
        # Add available book metadata
        for col in ['book_title', 'author', 'publisher', 'language', 'nli_link']:
            if col in first_row.index:
                book_data[col.replace('book_', '')] = first_row[col]
            else:
                book_data[col.replace('book_', '')] = ''
        
        books_list.append(book_data)

    # Create borrowers list
    borrowers_list = []
    for name, group in merged_df.groupby('borrower_name_normalized'):
        borrowers_list.append({
            "name": name,
            "transaction_ids": group['transaction_id'].tolist()
        })

    # Create transactions list
    transaction_cols = ['transaction_id', 'date', 'book_id', 'borrower_name_normalized']
    available_transaction_cols = [col for col in transaction_cols if col in merged_df.columns]
    
    transactions_list = merged_df[available_transaction_cols].rename(
        columns={'borrower_name_normalized': 'borrower_name'}
    ).to_dict('records')

    # Create the final structured dictionary
    final_data = {
        "books": books_list,
        "borrowers": borrowers_list,
        "transactions": transactions_list
    }
    logging.info("  - Final data structure created.")

    # --- 5. EXPORT TO JSON ---
    logging.info("[5/5] Exporting to JSON file...")
    output_filename = 'library_data.json'
    try:
        with open(output_filename, 'w', encoding='utf-8') as f:
            json.dump(final_data, f, ensure_ascii=False, indent=2)
        
        # Provide detailed statistics
        books_with_metadata = sum(1 for book in final_data['books'] if book.get('title', '').strip())
        books_without_metadata = len(final_data['books']) - books_with_metadata
        
        logging.info(f"Successfully created '{output_filename}' with:")
        logging.info(f"  - {len(final_data['books'])} Total Books")
        logging.info(f"    - {books_with_metadata} with complete metadata")
        logging.info(f"    - {books_without_metadata} ghost records (transactions only)")
        logging.info(f"  - {len(final_data['borrowers'])} Borrowers (normalized)")
        logging.info(f"  - {len(final_data['transactions'])} Transactions")
        
        # Show a sample of books with metadata
        sample_books = [book for book in final_data['books'][:5] if book.get('title', '').strip()]
        if sample_books:
            logging.info("  - Sample books with metadata:")
            for book in sample_books[:3]:
                logging.info(f"    - ID {book['id']}: {book.get('title', 'No title')[:50]}...")
        
    except Exception as e:
        logging.error(f"Error writing to JSON file: {e}")

    logging.info("Data preparation complete.")


if __name__ == '__main__':
    create_data_for_app()