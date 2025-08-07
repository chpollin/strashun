#!/usr/bin/env python3
"""
Strashun Library - Final Corrected Verifier with Full Console Output
Handles book variations and uses correct ID columns
"""

import pandas as pd
import numpy as np
from pathlib import Path
from collections import defaultdict
import re

class StrashunFinalVerifier:
    def __init__(self):
        self.script_dir = Path(__file__).parent
        self.results = []
        
    def load_data(self):
        """Load all transaction CSVs"""
        print("\n" + "=" * 70)
        print("DATA LOADING PHASE")
        print("=" * 70)
        
        print("\nScanning for CSV files...")
        transaction_files = list(self.script_dir.glob("*record*.csv"))
        print(f"Found {len(transaction_files)} transaction files")
        
        all_dfs = []
        
        for f in transaction_files:
            print(f"\nLoading: {f.name}")
            df = pd.read_csv(f, encoding='utf-8', low_memory=False)
            original_len = len(df)
            
            # Remove internal duplicates
            df = df.drop_duplicates()
            dups_removed = original_len - len(df)
            
            # Detect period
            if '1902' in f.name:
                df['period'] = '1902'
                period = '1902'
            elif 'vol_1_1' in f.name.lower() or 'vol 1_1' in f.name.lower():
                df['period'] = '1903-1904'
                period = '1903-1904'
            elif '1934' in f.name:
                df['period'] = '1934'
                period = '1934'
            elif '1940' in f.name:
                df['period'] = '1940'
                period = '1940'
            else:
                df['period'] = 'unknown'
                period = 'unknown'
            
            all_dfs.append(df)
            print(f"  → Period: {period}")
            print(f"  → Records: {len(df)} (removed {dups_removed} duplicates)")
        
        print("\nCombining all transaction files...")
        self.df = pd.concat(all_dfs, ignore_index=True)
        print(f"Combined total: {len(self.df)} transactions")
        
        # Remove duplicates by record ID
        if ' ID - record' in self.df.columns:
            original = len(self.df)
            self.df = self.df.drop_duplicates(subset=[' ID - record'])
            print(f"Removed {original - len(self.df)} duplicate records by ID")
        
        print(f"\n✓ Final transaction count: {len(self.df)}")
        
        # Analyze columns
        print("\n" + "=" * 70)
        print("COLUMN IDENTIFICATION")
        print("=" * 70)
        
        print("\nKey columns found:")
        key_cols = {
            'Record ID': ' ID - record',
            'Book Name': 'book name',
            'Book ID (catalog)': 'id',
            'Book ID (sparse)': 'book id',
            'Borrower Name': "person's name",
            'Date': 'date',
            'Return Date': 'return date'
        }
        
        for label, col in key_cols.items():
            if col in self.df.columns:
                non_null = self.df[col].notna().sum()
                unique = self.df[col].nunique()
                pct = (non_null / len(self.df)) * 100
                print(f"  • {label:20} → '{col}'")
                print(f"    {non_null:,} values ({pct:.1f}% filled), {unique:,} unique")
        
        return True
    
    def aggregate_book_variations(self, book_name):
        """Extract base book name for aggregation"""
        if pd.isna(book_name):
            return None
        
        # Remove volume/year indicators
        book_name = str(book_name)
        # Remove Hebrew years
        book_name = re.sub(r'תר[פצקרשת]["׳א-ת]+', '', book_name)
        # Remove numbers after punctuation
        book_name = re.sub(r'[\.:\-]\s*\d+\s*$', '', book_name)
        # Remove volume indicators
        book_name = re.sub(r'\s+\d+\s*$', '', book_name)
        # Clean up
        book_name = book_name.strip(' .-:')
        
        return book_name if book_name else None
    
    def verify_all(self):
        """Run all verifications with detailed output"""
        print("\n" + "=" * 70)
        print("VERIFICATION RESULTS")
        print("=" * 70)
        
        # 1. Basic Counts
        print("\n1. BASIC COUNTS")
        print("-" * 50)
        
        total = len(self.df)
        self.check("Total transactions", 4942, total)
        
        # 2. Period Breakdown
        print("\n2. PERIOD BREAKDOWN")
        print("-" * 50)
        
        if 'period' in self.df.columns:
            period_counts = self.df['period'].value_counts().to_dict()
            print("\nActual distribution:")
            for period in ['1902', '1903-1904', '1934', '1940', 'unknown']:
                if period in period_counts:
                    print(f"  {period:10} → {period_counts[period]:,} transactions")
            
            print("\nVerification:")
            expected = {'1902': 2410, '1903-1904': 2085, '1934': 319, '1940': 128}
            for period, exp_count in expected.items():
                actual_count = period_counts.get(period, 0)
                self.check(f"Period {period}", exp_count, actual_count)
        
        # 3. Unique Entities
        print("\n3. UNIQUE ENTITIES")
        print("-" * 50)
        
        # Books using 'id' column (the correct one)
        if 'id' in self.df.columns:
            unique_books = self.df['id'].nunique()
            non_null_books = self.df['id'].notna().sum()
            print(f"\nBooks (using 'id' column):")
            print(f"  Non-null IDs: {non_null_books:,}")
            print(f"  Unique IDs: {unique_books:,}")
            self.check("Unique books", 1603, unique_books)
        
        # Book names
        if 'book name' in self.df.columns:
            unique_names = self.df['book name'].nunique()
            print(f"\nBook titles (raw):")
            print(f"  Unique titles: {unique_names:,}")
            
            # Clean and count again
            cleaned = self.df['book name'].str.strip().str.replace(r'\s+', ' ', regex=True)
            unique_cleaned = cleaned.nunique()
            print(f"  After cleaning: {unique_cleaned:,}")
        
        # Borrowers
        if "person's name" in self.df.columns:
            unique_borrowers = self.df["person's name"].nunique()
            print(f"\nBorrowers:")
            print(f"  Unique names: {unique_borrowers:,}")
            self.check("Unique borrowers", 1414, unique_borrowers)
        
        # 4. Ghost Records Analysis
        print("\n4. GHOST RECORDS")
        print("-" * 50)
        
        if 'book name' in self.df.columns and 'id' in self.df.columns:
            has_name = self.df['book name'].notna()
            has_id = self.df['id'].notna()
            
            both = (has_name & has_id).sum()
            name_only = (has_name & ~has_id).sum()
            id_only = (~has_name & has_id).sum()
            neither = (~has_name & ~has_id).sum()
            
            print(f"\nTransaction breakdown:")
            print(f"  Has both name & ID: {both:,} ({both/len(self.df)*100:.1f}%)")
            print(f"  Name only (ghost):  {name_only:,} ({name_only/len(self.df)*100:.1f}%)")
            print(f"  ID only:            {id_only:,} ({id_only/len(self.df)*100:.1f}%)")
            print(f"  Neither:            {neither:,} ({neither/len(self.df)*100:.1f}%)")
            
            ghost_pct = (name_only / len(self.df)) * 100
            print(f"\nGhost records verification:")
            self.check("Ghost records count", 1049, name_only, tolerance=50)
            self.check("Ghost records %", 21.2, round(ghost_pct, 1))
        
        # 5. Temporal Patterns
        print("\n5. TEMPORAL PATTERNS")
        print("-" * 50)
        
        if 'date' in self.df.columns:
            print("\nParsing dates...")
            dates = pd.to_datetime(self.df['date'], errors='coerce', dayfirst=True)
            valid_dates = dates.dropna()
            print(f"  Successfully parsed: {len(valid_dates):,} of {len(dates):,} dates")
            
            if len(valid_dates) > 0:
                # Monthly distribution
                monthly = valid_dates.dt.month.value_counts().sort_index()
                total_dated = len(valid_dates)
                
                print("\nMonthly distribution:")
                for month in range(1, 13):
                    count = monthly.get(month, 0)
                    pct = (count / total_dated) * 100
                    bar = "█" * int(pct / 2)  # Visual bar
                    print(f"  Month {month:2}: {count:4,} ({pct:5.1f}%) {bar}")
                
                print("\nKey months verification:")
                dec_count = monthly.get(12, 0)
                dec_pct = (dec_count / total_dated) * 100
                self.check("December transactions", 3136, dec_count)
                self.check("December %", 63.5, round(dec_pct, 1))
                
                nov_count = monthly.get(11, 0)
                nov_pct = (nov_count / total_dated) * 100
                self.check("November transactions", 1135, nov_count)
                self.check("November %", 23.0, round(nov_pct, 1))
                
                # Day of week
                print("\nDay of week distribution:")
                days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
                weekday = valid_dates.dt.dayofweek.value_counts().sort_index()
                for i, day in enumerate(days):
                    count = weekday.get(i, 0)
                    print(f"  {day:10}: {count:4,}")
        
        # 6. Popular Books (with aggregation)
        print("\n6. MOST BORROWED BOOKS")
        print("-" * 50)
        
        if 'book name' in self.df.columns:
            # Raw counts
            book_counts = self.df['book name'].value_counts()
            
            print("\nTop 10 books (raw titles):")
            for i, (book, count) in enumerate(book_counts.head(10).items(), 1):
                print(f"  {i:2}. {book}: {count} borrows")
            
            # Aggregate variations
            print("\nAggregating book variations...")
            self.df['book_base'] = self.df['book name'].apply(self.aggregate_book_variations)
            base_counts = self.df['book_base'].value_counts()
            
            print("\nTop 10 books (aggregated):")
            for i, (book, count) in enumerate(base_counts.head(10).items(), 1):
                if book:  # Skip None values
                    print(f"  {i:2}. {book}: {count} borrows")
            
            # Check specific popular books
            print("\nSearching for claimed top books:")
            popular_books = [
                ('אחיאסף', 245),
                ('השחר', 203),
                ('השלח', 139)
            ]
            
            for book_term, expected in popular_books:
                # Find all matching variations
                matching_books = {}
                total = 0
                
                for book, count in book_counts.items():
                    if book and book_term in str(book):
                        matching_books[book] = count
                        total += count
                
                print(f"\n  '{book_term}':")
                print(f"    Found {len(matching_books)} variations, total {total} borrows")
                
                # Show top 3 variations
                if matching_books:
                    sorted_matches = sorted(matching_books.items(), key=lambda x: x[1], reverse=True)
                    for book, count in sorted_matches[:3]:
                        print(f"      • {book}: {count}")
                
                self.check(f"'{book_term}' total", expected, total, tolerance=10)
        
        # 7. Distribution Patterns
        print("\n7. DISTRIBUTION PATTERNS")
        print("-" * 50)
        
        if "person's name" in self.df.columns:
            borrower_counts = self.df["person's name"].value_counts()
            
            print(f"\nBorrower activity distribution:")
            print(f"  Total borrowers: {len(borrower_counts):,}")
            
            # Distribution breakdown
            dist_ranges = [(1, 1), (2, 5), (6, 10), (11, 20), (21, 50), (51, 200)]
            for min_books, max_books in dist_ranges:
                count = ((borrower_counts >= min_books) & (borrower_counts <= max_books)).sum()
                pct = (count / len(borrower_counts)) * 100
                if min_books == max_books:
                    label = f"{min_books} book"
                else:
                    label = f"{min_books}-{max_books} books"
                print(f"  {label:12}: {count:5,} borrowers ({pct:5.1f}%)")
            
            print("\nKey statistics:")
            single = (borrower_counts == 1).sum()
            single_pct = (single / len(borrower_counts)) * 100
            print(f"  Single-book borrowers: {single:,} ({single_pct:.1f}%)")
            
            max_books = borrower_counts.max()
            max_borrower = borrower_counts.index[0]
            print(f"  Most active: '{max_borrower}' with {max_books} books")
            
            avg = borrower_counts.mean()
            median = borrower_counts.median()
            print(f"  Average: {avg:.1f} books")
            print(f"  Median: {median:.0f} books")
            
            print("\nVerification:")
            self.check("Single-book borrowers %", 57.4, round(single_pct, 1))
            self.check("Max books by borrower", 132, max_books, tolerance=25)
            self.check("Avg books per borrower", 3.5, round(avg, 1))
        
        # 8. Matrix Sparsity
        print("\n8. MATRIX SPARSITY")
        print("-" * 50)
        
        if "person's name" in self.df.columns and 'id' in self.df.columns:
            unique_borrowers = self.df["person's name"].nunique()
            unique_books = self.df['id'].nunique()
            total_possible = unique_borrowers * unique_books
            actual = len(self.df)
            filled = (actual / total_possible) * 100
            sparsity = 100 - filled
            
            print(f"\nMatrix dimensions:")
            print(f"  Borrowers: {unique_borrowers:,}")
            print(f"  Books: {unique_books:,}")
            print(f"  Possible connections: {total_possible:,}")
            print(f"  Actual connections: {actual:,}")
            print(f"  Matrix filled: {filled:.2f}%")
            print(f"  Matrix sparse: {sparsity:.2f}%")
            
            self.check("Matrix sparsity %", 99.7, round(sparsity, 1))
    
    def check(self, name, expected, actual, tolerance=None):
        """Check a single statistic with detailed output"""
        if tolerance is None:
            if isinstance(expected, float) and expected < 1:
                tolerance = 0.01  # 1% for percentages
            else:
                tolerance = max(1, expected * 0.01)  # 1% tolerance
        
        if isinstance(expected, (int, float)) and isinstance(actual, (int, float)):
            match = abs(expected - actual) <= tolerance
        else:
            match = expected == actual
        
        symbol = "✅" if match else "❌"
        
        self.results.append({
            'metric': name,
            'expected': expected,
            'actual': actual,
            'match': match,
            'diff': actual - expected if isinstance(expected, (int, float)) else None
        })
        
        # Format values for display
        if isinstance(expected, int):
            exp_str = f"{expected:,}"
            act_str = f"{actual:,}"
        elif isinstance(expected, float):
            exp_str = f"{expected:.1f}"
            act_str = f"{actual:.1f}"
        else:
            exp_str = str(expected)
            act_str = str(actual)
        
        print(f"  {symbol} {name:35} Expected: {exp_str:>10} | Actual: {act_str:>10}")
        
        if not match and isinstance(expected, (int, float)):
            diff = actual - expected
            pct = (diff / expected) * 100 if expected != 0 else 0
            print(f"     → Difference: {diff:+.0f} ({pct:+.1f}%)")
    
    def summary(self):
        """Print detailed summary"""
        print("\n" + "=" * 70)
        print("FINAL SUMMARY")
        print("=" * 70)
        
        df = pd.DataFrame(self.results)
        passed = df['match'].sum()
        total = len(df)
        rate = (passed / total) * 100
        
        print(f"\nOverall Results:")
        print(f"  Total checks: {total}")
        print(f"  Passed: {passed}")
        print(f"  Failed: {total - passed}")
        print(f"  Success rate: {rate:.1f}%")
        
        # Visual indicator
        bar_length = 50
        filled = int(bar_length * rate / 100)
        bar = "█" * filled + "░" * (bar_length - filled)
        print(f"\n  [{bar}] {rate:.1f}%")
        
        # Assessment
        print("\nAssessment:")
        if rate >= 90:
            print("  🎉 EXCELLENT! The data strongly validates the paper's claims!")
            print("  The statistics are essentially verified with only minor variations.")
        elif rate >= 75:
            print("  ✅ GOOD! Most statistics are verified.")
            print("  The core findings of the paper are supported by the data.")
        elif rate >= 60:
            print("  ⚠️  FAIR. Many statistics match but some discrepancies need investigation.")
            print("  The data generally supports the paper with some caveats.")
        else:
            print("  ❌ POOR. Significant discrepancies found.")
            print("  Further investigation needed to reconcile differences.")
        
        # Failed checks detail
        failed = df[~df['match']]
        if len(failed) > 0:
            print("\n" + "-" * 70)
            print("Failed Checks (Detail):")
            print("-" * 70)
            for _, row in failed.iterrows():
                if isinstance(row['expected'], (int, float)):
                    exp_str = f"{row['expected']:,.1f}" if isinstance(row['expected'], float) else f"{row['expected']:,}"
                    act_str = f"{row['actual']:,.1f}" if isinstance(row['actual'], float) else f"{row['actual']:,}"
                else:
                    exp_str = str(row['expected'])
                    act_str = str(row['actual'])
                    
                print(f"  • {row['metric']}:")
                print(f"    Expected: {exp_str}")
                print(f"    Actual: {act_str}")
                
                if row['diff'] is not None:
                    pct = (row['diff'] / row['expected']) * 100 if row['expected'] != 0 else 0
                    print(f"    Difference: {row['diff']:+.0f} ({pct:+.1f}%)")
        
        # Recommendations
        print("\n" + "=" * 70)
        print("RECOMMENDATIONS")
        print("=" * 70)
        
        if rate >= 90:
            print("\n✓ The verification is successful!")
            print("  The minor differences are within expected variation for historical data.")
        else:
            print("\nTo improve verification accuracy:")
            print("  1. Load the catalog files (books_table.csv, borrowers_table.csv)")
            print("  2. Normalize borrower names to handle variations")
            print("  3. Check for additional data cleaning in the paper's methodology")
            
            if 'Unique books' in failed['metric'].values:
                print("  4. The book count issue may be due to missing catalog data")
            
            if any('Period' in m for m in failed['metric'].values):
                print("  5. Some records may have been excluded based on data quality")
    
    def run(self):
        """Main execution"""
        print("=" * 70)
        print("STRASHUN LIBRARY - FINAL VERIFICATION")
        print("=" * 70)
        print(f"Script location: {self.script_dir}")
        
        if self.load_data():
            self.verify_all()
            self.summary()
        else:
            print("\nERROR: Failed to load data!")

if __name__ == "__main__":
    verifier = StrashunFinalVerifier()
    verifier.run()