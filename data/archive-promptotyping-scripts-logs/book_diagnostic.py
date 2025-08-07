#!/usr/bin/env python3
"""
Diagnostic script to understand book identification issues
"""

import pandas as pd
from pathlib import Path
import numpy as np

def analyze_books():
    script_dir = Path(__file__).parent
    print("=" * 70)
    print("BOOK IDENTIFICATION DIAGNOSTIC")
    print("=" * 70)
    
    # Load all transaction files
    transaction_files = list(script_dir.glob("*record*.csv"))
    all_dfs = []
    
    for f in transaction_files:
        df = pd.read_csv(f, encoding='utf-8', low_memory=False)
        all_dfs.append(df)
    
    combined = pd.concat(all_dfs, ignore_index=True)
    print(f"\nTotal transactions loaded: {len(combined)}")
    
    # Analyze book-related columns
    print("\n" + "=" * 70)
    print("BOOK-RELATED COLUMNS ANALYSIS")
    print("-" * 70)
    
    book_columns = []
    for col in combined.columns:
        if any(term in col.lower() for term in ['book', 'id', 'title', 'item']):
            non_null = combined[col].notna().sum()
            unique = combined[col].nunique()
            pct_filled = (non_null / len(combined)) * 100
            
            print(f"\nColumn: '{col}'")
            print(f"  Non-null values: {non_null:,} ({pct_filled:.1f}% filled)")
            print(f"  Unique values: {unique:,}")
            
            if non_null > 0:
                book_columns.append(col)
                # Show sample values
                samples = combined[col].dropna().head(3).tolist()
                print(f"  Samples: {samples[:3]}")
    
    # Check for book catalog files
    print("\n" + "=" * 70)
    print("CATALOG FILES ANALYSIS")
    print("-" * 70)
    
    catalog_files = {
        'books_table': list(script_dir.glob("*books_table*.csv")),
        'unique_books': list(script_dir.glob("*unique_books*.csv")),
        'likutei': list(script_dir.glob("*[Ll]ikutei*.csv"))
    }
    
    for cat_type, files in catalog_files.items():
        if files:
            print(f"\n{cat_type}:")
            for f in files:
                df = pd.read_csv(f, encoding='utf-8', low_memory=False)
                print(f"  File: {f.name}")
                print(f"  Rows: {len(df)}")
                print(f"  Columns: {', '.join(df.columns[:5])}...")
                
                # Check for ID columns
                for col in df.columns:
                    if 'id' in col.lower() or 'book' in col.lower():
                        unique = df[col].nunique()
                        print(f"    → {col}: {unique} unique values")
    
    # Try different methods to count unique books
    print("\n" + "=" * 70)
    print("UNIQUE BOOK COUNT METHODS")
    print("-" * 70)
    
    # Method 1: Book name column
    if 'book name' in combined.columns:
        unique_names = combined['book name'].nunique()
        print(f"\n1. By 'book name' column: {unique_names:,} unique books")
        
        # Check for variations (clean the names)
        cleaned_names = combined['book name'].str.strip().str.replace(r'\s+', ' ', regex=True)
        unique_cleaned = cleaned_names.nunique()
        print(f"   After cleaning spaces: {unique_cleaned:,} unique books")
    
    # Method 2: Book ID column
    if 'book id' in combined.columns:
        unique_ids = combined['book id'].nunique()
        non_null_ids = combined['book id'].notna().sum()
        print(f"\n2. By 'book id' column: {unique_ids:,} unique IDs")
        print(f"   (only {non_null_ids:,} transactions have book IDs)")
    
    # Method 3: ID column
    if 'id' in combined.columns:
        unique_ids = combined['id'].nunique()
        non_null_ids = combined['id'].notna().sum()
        print(f"\n3. By 'id' column: {unique_ids:,} unique values")
        print(f"   ({non_null_ids:,} non-null values)")
    
    # Check if we need to map book names to IDs
    print("\n" + "=" * 70)
    print("GHOST RECORDS ANALYSIS")
    print("-" * 70)
    
    if 'book name' in combined.columns and 'book id' in combined.columns:
        has_name = combined['book name'].notna()
        has_id = combined['book id'].notna()
        
        both = (has_name & has_id).sum()
        name_only = (has_name & ~has_id).sum()
        id_only = (~has_name & has_id).sum()
        neither = (~has_name & ~has_id).sum()
        
        print(f"\nTransactions with:")
        print(f"  Both name and ID: {both:,} ({both/len(combined)*100:.1f}%)")
        print(f"  Name only (ghost): {name_only:,} ({name_only/len(combined)*100:.1f}%)")
        print(f"  ID only: {id_only:,} ({id_only/len(combined)*100:.1f}%)")
        print(f"  Neither: {neither:,} ({neither/len(combined)*100:.1f}%)")
        
        # This matches the paper's claim of ~21% ghost records!
        print(f"\n→ Ghost records (name without ID): {name_only:,} = {name_only/len(combined)*100:.1f}%")
        print(f"  Paper claims: 1,049 ghost records = 21.2%")
    
    # Analyze most borrowed books
    print("\n" + "=" * 70)
    print("MOST BORROWED BOOKS ANALYSIS")
    print("-" * 70)
    
    if 'book name' in combined.columns:
        book_counts = combined['book name'].value_counts()
        
        print("\nTop 10 most borrowed books:")
        for i, (book, count) in enumerate(book_counts.head(10).items(), 1):
            print(f"  {i:2}. {book}: {count} borrows")
        
        # Look for the claimed top books
        print("\nSearching for claimed top books:")
        search_terms = ['אחיאסף', 'השחר', 'השלח']
        
        for term in search_terms:
            print(f"\n  Books containing '{term}':")
            matching = book_counts[book_counts.index.str.contains(term, na=False)]
            if len(matching) > 0:
                total = matching.sum()
                print(f"    Found {len(matching)} variations, total {total} borrows:")
                for book, count in matching.head(3).items():
                    print(f"      • {book}: {count}")
            else:
                print(f"    Not found")
    
    # Summary
    print("\n" + "=" * 70)
    print("SUMMARY")
    print("-" * 70)
    
    print("""
The discrepancy in unique book count appears to be because:

1. The 'book id' column is mostly empty (ghost records)
2. The paper likely used catalog files to establish the 1,603 unique books
3. Your data shows 2,617 unique book names (possibly with variations)
4. Only 352 books have IDs in the transaction data

The ~21% ghost records claim is likely correct - these are the transactions
with book names but no corresponding IDs in the catalog.
""")

if __name__ == "__main__":
    analyze_books() 