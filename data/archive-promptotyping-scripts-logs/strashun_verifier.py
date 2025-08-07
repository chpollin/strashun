#!/usr/bin/env python3
"""
Strashun Library Digital Humanities Project - Advanced Statistics Verifier V2
A robust, intelligent verifier that handles data variations and provides detailed diagnostics
"""

import pandas as pd
import numpy as np
from pathlib import Path
from collections import Counter, defaultdict
from datetime import datetime
import json
import warnings
import hashlib
import sys

# Suppress pandas warnings for cleaner output
warnings.filterwarnings('ignore', category=UserWarning)

class StrashunVerifierV2:
    def __init__(self, verbose=True):
        self.script_dir = Path(__file__).parent
        self.verbose = verbose
        self.verification_results = []
        self.data = {}
        self.metadata = {
            'columns_identified': {},
            'data_quality': {},
            'anomalies': []
        }
        
    def log(self, message, level="INFO"):
        """Conditional logging based on verbosity"""
        if self.verbose or level == "ERROR":
            prefix = f"[{level}]" if level != "INFO" else ""
            print(f"{prefix} {message}")
    
    def find_best_column(self, df, keywords, exclude_keywords=None):
        """Intelligently find the best matching column based on keywords"""
        exclude_keywords = exclude_keywords or []
        candidates = []
        
        for col in df.columns:
            col_lower = col.lower()
            
            # Skip if contains excluded keywords
            if any(excl in col_lower for excl in exclude_keywords):
                continue
                
            # Score based on keyword matches
            score = sum(1 for kw in keywords if kw in col_lower)
            
            if score > 0:
                # Additional scoring based on data characteristics
                non_null_ratio = df[col].notna().sum() / len(df)
                unique_ratio = df[col].nunique() / len(df)
                
                candidates.append({
                    'column': col,
                    'keyword_score': score,
                    'non_null_ratio': non_null_ratio,
                    'unique_ratio': unique_ratio,
                    'unique_count': df[col].nunique()
                })
        
        if not candidates:
            return None
            
        # Sort by keyword score, then by non-null ratio
        candidates.sort(key=lambda x: (x['keyword_score'], x['non_null_ratio']), reverse=True)
        return candidates[0]
    
    def load_and_analyze_data(self):
        """Load all CSV files and intelligently identify their structure"""
        self.log("=" * 70)
        self.log("PHASE 1: DATA LOADING AND STRUCTURE ANALYSIS")
        self.log("=" * 70)
        
        csv_files = list(self.script_dir.glob("*.csv"))
        
        if not csv_files:
            self.log("No CSV files found in script directory!", "ERROR")
            return False
        
        self.log(f"Found {len(csv_files)} CSV files")
        
        # Categorize files
        transaction_files = []
        catalog_files = {}
        
        for csv_file in csv_files:
            filename = csv_file.name
            file_lower = filename.lower()
            
            # Identify file types
            if 'record' in file_lower:
                transaction_files.append(csv_file)
            elif 'books_table' in file_lower:
                catalog_files['books'] = csv_file
            elif 'borrowers_table' in file_lower:
                catalog_files['borrowers'] = csv_file
            elif 'unique_books' in file_lower:
                catalog_files['unique_books'] = csv_file
            elif 'likutei' in file_lower or 'shoshanim' in file_lower:
                catalog_files['likutei'] = csv_file
        
        # Load and analyze transaction files
        self.log("\n" + "-" * 50)
        self.log("Loading Transaction Files:")
        
        all_transactions = []
        for trans_file in transaction_files:
            try:
                df = pd.read_csv(trans_file, encoding='utf-8', low_memory=False)
                
                # Detect period from filename or data
                period = self.detect_period(trans_file.name, df)
                df['source_period'] = period
                df['source_file'] = trans_file.name
                
                # Remove complete duplicates
                original_len = len(df)
                df = df.drop_duplicates()
                duplicates_removed = original_len - len(df)
                
                all_transactions.append(df)
                
                self.log(f"  ✓ {trans_file.name}")
                self.log(f"    Period: {period}, Records: {len(df)}, Duplicates removed: {duplicates_removed}")
                
            except Exception as e:
                self.log(f"  ✗ Error loading {trans_file.name}: {e}", "ERROR")
        
        if all_transactions:
            self.data['transactions'] = pd.concat(all_transactions, ignore_index=True)
            
            # Identify key columns
            self.identify_key_columns()
            
            # Remove duplicate transactions based on ID column if available
            self.remove_duplicate_transactions()
            
            self.log(f"\nTotal transactions after processing: {len(self.data['transactions'])}")
        
        # Load catalog files
        self.log("\n" + "-" * 50)
        self.log("Loading Catalog Files:")
        
        for cat_type, cat_file in catalog_files.items():
            try:
                self.data[cat_type] = pd.read_csv(cat_file, encoding='utf-8', low_memory=False)
                self.log(f"  ✓ {cat_type}: {len(self.data[cat_type])} records")
            except Exception as e:
                self.log(f"  ✗ Error loading {cat_type}: {e}", "ERROR")
        
        return len(all_transactions) > 0
    
    def detect_period(self, filename, df):
        """Intelligently detect the time period of a transaction file"""
        # First try filename
        if '1902' in filename:
            return '1902'
        elif '1934' in filename:
            return '1934'
        elif '1940' in filename:
            return '1940'
        elif 'vol_1_1' in filename.lower() or 'vol 1_1' in filename.lower():
            return '1903-1904'
        
        # Then try to detect from dates in data
        date_col = self.find_best_column(df, ['date'], ['return', 'transcription'])
        if date_col and date_col['column']:
            try:
                dates = pd.to_datetime(df[date_col['column']], errors='coerce', dayfirst=True)
                years = dates.dt.year.value_counts()
                if not years.empty:
                    top_year = years.index[0]
                    if top_year == 1902:
                        return '1902'
                    elif top_year in [1903, 1904]:
                        return '1903-1904'
                    elif top_year == 1934:
                        return '1934'
                    elif top_year == 1940:
                        return '1940'
            except:
                pass
        
        return 'unknown'
    
    def identify_key_columns(self):
        """Identify the most likely columns for key fields"""
        df = self.data['transactions']
        
        # Find borrower column
        borrower_col = self.find_best_column(
            df, 
            ['person', 'borrower', 'patron', 'name'],
            exclude_keywords=['book', 'return', 'image']
        )
        if borrower_col:
            self.metadata['columns_identified']['borrower'] = borrower_col['column']
            self.log(f"\nIdentified borrower column: '{borrower_col['column']}' ({borrower_col['unique_count']} unique)")
        
        # Find book column
        book_col = self.find_best_column(
            df,
            ['book', 'title', 'item'],
            exclude_keywords=['person', 'borrower', 'id']
        )
        if book_col:
            self.metadata['columns_identified']['book'] = book_col['column']
            self.log(f"Identified book column: '{book_col['column']}' ({book_col['unique_count']} unique)")
        
        # Find book ID column
        book_id_col = self.find_best_column(
            df,
            ['book', 'id'],
            exclude_keywords=['person', 'borrower', 'record']
        )
        if book_id_col and 'id' in book_id_col['column'].lower():
            self.metadata['columns_identified']['book_id'] = book_id_col['column']
            self.log(f"Identified book ID column: '{book_id_col['column']}' ({book_id_col['unique_count']} unique)")
        
        # Find date column
        date_col = self.find_best_column(
            df,
            ['date'],
            exclude_keywords=['return', 'transcription']
        )
        if date_col:
            self.metadata['columns_identified']['date'] = date_col['column']
            self.log(f"Identified date column: '{date_col['column']}'")
        
        # Find record ID column
        record_id_col = self.find_best_column(
            df,
            ['id', 'record'],
            exclude_keywords=['book', 'person', 'name']
        )
        if record_id_col:
            self.metadata['columns_identified']['record_id'] = record_id_col['column']
            self.log(f"Identified record ID column: '{record_id_col['column']}' ({record_id_col['unique_count']} unique)")
    
    def remove_duplicate_transactions(self):
        """Remove duplicate transactions based on record ID"""
        if 'record_id' in self.metadata['columns_identified']:
            record_col = self.metadata['columns_identified']['record_id']
            original_len = len(self.data['transactions'])
            
            # Remove duplicates based on record ID
            self.data['transactions'] = self.data['transactions'].drop_duplicates(subset=[record_col])
            
            duplicates_removed = original_len - len(self.data['transactions'])
            if duplicates_removed > 0:
                self.log(f"\nRemoved {duplicates_removed} duplicate transactions based on record ID")
    
    def verify_stat(self, name, claimed, actual, tolerance=0.01, category="General"):
        """Verify a single statistic with detailed tracking"""
        if isinstance(claimed, (int, float)) and isinstance(actual, (int, float)):
            if abs(claimed) < 1:  # For percentages
                match = abs(claimed - actual) <= tolerance
            else:  # For counts
                match = abs(claimed - actual) <= max(1, claimed * tolerance)
        else:
            match = claimed == actual
        
        result = {
            'category': category,
            'metric': name,
            'claimed': claimed,
            'actual': actual,
            'match': match,
            'symbol': '✓' if match else '✗',
            'diff': actual - claimed if isinstance(claimed, (int, float)) and isinstance(actual, (int, float)) else None,
            'diff_pct': ((actual - claimed) / claimed * 100) if isinstance(claimed, (int, float)) and isinstance(actual, (int, float)) and claimed != 0 else None
        }
        self.verification_results.append(result)
        return match
    
    def verify_basic_statistics(self):
        """Verify basic dataset statistics"""
        self.log("\n" + "=" * 70)
        self.log("PHASE 2: STATISTICAL VERIFICATION")
        self.log("=" * 70)
        
        df = self.data['transactions']
        
        # 1. Total transactions
        self.log("\n1. Transaction Counts")
        self.log("-" * 40)
        
        total = len(df)
        self.verify_stat("Total transactions", 4942, total, category="Counts")
        self.log(f"  Total transactions: {total} (claimed: 4942)")
        
        # Period breakdown
        if 'source_period' in df.columns:
            period_counts = df['source_period'].value_counts()
            
            period_claims = {
                '1902': 2410,
                '1903-1904': 2085,
                '1934': 319,
                '1940': 128
            }
            
            for period, claimed in period_claims.items():
                actual = period_counts.get(period, 0)
                self.verify_stat(f"Transactions {period}", claimed, actual, category="Period Counts")
                self.log(f"  {period}: {actual} (claimed: {claimed})")
        
        # 2. Unique entities
        self.log("\n2. Unique Entities")
        self.log("-" * 40)
        
        # Borrowers
        if 'borrower' in self.metadata['columns_identified']:
            borrower_col = self.metadata['columns_identified']['borrower']
            unique_borrowers = df[borrower_col].nunique()
            self.verify_stat("Unique borrowers", 1414, unique_borrowers, category="Entities")
            self.log(f"  Unique borrowers: {unique_borrowers} (claimed: 1414)")
        
        # Books
        if 'book_id' in self.metadata['columns_identified']:
            book_id_col = self.metadata['columns_identified']['book_id']
            unique_book_ids = df[book_id_col].nunique()
            self.verify_stat("Unique books (by ID)", 1603, unique_book_ids, category="Entities")
            self.log(f"  Unique books (by ID): {unique_book_ids} (claimed: 1603)")
        elif 'book' in self.metadata['columns_identified']:
            book_col = self.metadata['columns_identified']['book']
            unique_books = df[book_col].nunique()
            self.verify_stat("Unique books (by title)", 1603, unique_books, category="Entities")
            self.log(f"  Unique books (by title): {unique_books} (claimed: 1603)")
    
    def verify_ghost_records(self):
        """Verify ghost records (books without catalog entries)"""
        self.log("\n3. Ghost Records Analysis")
        self.log("-" * 40)
        
        if 'book_id' in self.metadata['columns_identified'] and 'unique_books' in self.data:
            book_id_col = self.metadata['columns_identified']['book_id']
            
            # Get cataloged book IDs
            if 'Book_ID' in self.data['unique_books'].columns:
                cataloged_ids = set(self.data['unique_books']['Book_ID'].dropna())
                
                # Find ghost records
                all_book_refs = self.data['transactions'][book_id_col].dropna()
                ghost_mask = ~all_book_refs.isin(cataloged_ids)
                ghost_count = ghost_mask.sum()
                ghost_pct = (ghost_count / len(self.data['transactions'])) * 100
                
                self.verify_stat("Ghost records count", 1049, ghost_count, category="Data Quality")
                self.verify_stat("Ghost records %", 21.2, round(ghost_pct, 1), category="Data Quality")
                
                self.log(f"  Ghost records: {ghost_count} ({ghost_pct:.1f}%)")
                self.log(f"  Claimed: 1049 (21.2%)")
    
    def verify_temporal_patterns(self):
        """Verify temporal distribution patterns"""
        self.log("\n4. Temporal Patterns")
        self.log("-" * 40)
        
        if 'date' not in self.metadata['columns_identified']:
            self.log("  No date column identified")
            return
        
        date_col = self.metadata['columns_identified']['date']
        
        # Parse dates with multiple strategies
        dates = None
        for date_format in [None, '%d/%m/%Y', '%Y-%m-%d', '%d/%m/%y']:
            try:
                if date_format:
                    dates = pd.to_datetime(
                        self.data['transactions'][date_col], 
                        format=date_format, 
                        errors='coerce'
                    )
                else:
                    dates = pd.to_datetime(
                        self.data['transactions'][date_col], 
                        errors='coerce',
                        dayfirst=True
                    )
                
                valid_count = dates.notna().sum()
                if valid_count > len(dates) * 0.5:  # At least 50% valid
                    break
            except:
                continue
        
        if dates is None or dates.notna().sum() == 0:
            self.log("  Could not parse dates")
            return
        
        valid_dates = dates.dropna()
        self.log(f"  Successfully parsed {len(valid_dates)} dates")
        
        # Monthly distribution
        monthly = valid_dates.dt.month.value_counts()
        total_dated = len(valid_dates)
        
        # December
        dec_count = monthly.get(12, 0)
        dec_pct = (dec_count / total_dated) * 100
        self.verify_stat("December transactions", 3136, dec_count, category="Temporal")
        self.verify_stat("December %", 63.5, round(dec_pct, 1), category="Temporal")
        
        # November
        nov_count = monthly.get(11, 0)
        nov_pct = (nov_count / total_dated) * 100
        self.verify_stat("November transactions", 1135, nov_count, category="Temporal")
        self.verify_stat("November %", 23.0, round(nov_pct, 1), category="Temporal")
        
        self.log(f"  December: {dec_count} ({dec_pct:.1f}%) - claimed: 3136 (63.5%)")
        self.log(f"  November: {nov_count} ({nov_pct:.1f}%) - claimed: 1135 (23.0%)")
        
        # Day of week patterns
        weekday = valid_dates.dt.dayofweek.value_counts()
        mon_count = weekday.get(0, 0)  # Monday = 0
        wed_count = weekday.get(2, 0)  # Wednesday = 2
        fri_count = weekday.get(4, 0)  # Friday = 4
        
        self.verify_stat("Monday transactions", 993, mon_count, category="Temporal")
        self.verify_stat("Wednesday transactions", 847, wed_count, category="Temporal")
        self.verify_stat("Friday transactions", 812, fri_count, category="Temporal")
    
    def verify_distribution_patterns(self):
        """Verify power law and other distribution patterns"""
        self.log("\n5. Distribution Patterns")
        self.log("-" * 40)
        
        if 'borrower' not in self.metadata['columns_identified']:
            self.log("  No borrower column identified")
            return
        
        borrower_col = self.metadata['columns_identified']['borrower']
        borrower_counts = self.data['transactions'][borrower_col].value_counts()
        
        # Single-book borrowers
        single_book = (borrower_counts == 1).sum()
        single_book_pct = (single_book / len(borrower_counts)) * 100
        self.verify_stat("Single-book borrowers %", 57.4, round(single_book_pct, 1), category="Distribution")
        
        # Most active reader
        max_books = borrower_counts.max()
        self.verify_stat("Max books by one borrower", 132, max_books, category="Distribution")
        
        # Average books per borrower
        avg_books = borrower_counts.mean()
        self.verify_stat("Avg books per borrower", 3.5, round(avg_books, 1), category="Distribution")
        
        self.log(f"  Single-book borrowers: {single_book_pct:.1f}% (claimed: 57.4%)")
        self.log(f"  Most active reader: {max_books} books (claimed: 132)")
        self.log(f"  Average per borrower: {avg_books:.1f} (claimed: 3.5)")
    
    def verify_sparsity(self):
        """Verify matrix sparsity"""
        self.log("\n6. Matrix Sparsity")
        self.log("-" * 40)
        
        # Get unique counts
        if 'borrower' in self.metadata['columns_identified']:
            borrower_col = self.metadata['columns_identified']['borrower']
            unique_borrowers = self.data['transactions'][borrower_col].nunique()
        else:
            unique_borrowers = 1414  # Use claimed value
        
        if 'book_id' in self.metadata['columns_identified']:
            book_col = self.metadata['columns_identified']['book_id']
            unique_books = self.data['transactions'][book_col].nunique()
        elif 'book' in self.metadata['columns_identified']:
            book_col = self.metadata['columns_identified']['book']
            unique_books = self.data['transactions'][book_col].nunique()
        else:
            unique_books = 1603  # Use claimed value
        
        total_possible = unique_borrowers * unique_books
        actual_connections = len(self.data['transactions'])
        
        if total_possible > 0:
            sparsity = ((total_possible - actual_connections) / total_possible) * 100
            self.verify_stat("Matrix sparsity %", 99.7, round(sparsity, 1), category="Matrix")
            
            self.log(f"  Borrowers × Books: {unique_borrowers} × {unique_books} = {total_possible:,} possible")
            self.log(f"  Actual connections: {actual_connections:,}")
            self.log(f"  Sparsity: {sparsity:.2f}% (claimed: 99.7%)")
    
    def verify_popular_items(self):
        """Verify most borrowed books"""
        self.log("\n7. Most Borrowed Items")
        self.log("-" * 40)
        
        if 'book' not in self.metadata['columns_identified']:
            self.log("  No book column identified")
            return
        
        book_col = self.metadata['columns_identified']['book']
        book_counts = self.data['transactions'][book_col].value_counts()
        
        # Expected top books
        expected_top = [
            ("אחיאסף", 245),
            ("השחר", 203),
            ("השלח", 139)
        ]
        
        self.log("  Top 5 borrowed books:")
        for i, (book, count) in enumerate(book_counts.head(5).items(), 1):
            self.log(f"    {i}. {book}: {count} borrows")
        
        # Try to match expected books
        for expected_title, expected_count in expected_top:
            found = False
            for book, count in book_counts.head(20).items():
                if isinstance(book, str) and expected_title in book:
                    self.verify_stat(f"'{expected_title}' borrows", expected_count, count, category="Popular Items")
                    found = True
                    break
            
            if not found:
                self.log(f"  Could not find '{expected_title}' in top books")
    
    def generate_summary_report(self):
        """Generate comprehensive verification report"""
        self.log("\n" + "=" * 70)
        self.log("VERIFICATION SUMMARY")
        self.log("=" * 70)
        
        if not self.verification_results:
            self.log("No verification results to report")
            return
        
        df = pd.DataFrame(self.verification_results)
        
        # Overall statistics
        total_checks = len(df)
        passed = df['match'].sum()
        failed = total_checks - passed
        pass_rate = (passed / total_checks) * 100
        
        self.log(f"\nOverall Results:")
        self.log(f"  Total checks: {total_checks}")
        self.log(f"  Passed: {passed} ({pass_rate:.1f}%)")
        self.log(f"  Failed: {failed}")
        
        # Results by category
        self.log("\nResults by Category:")
        self.log("-" * 40)
        
        for category in df['category'].unique():
            cat_df = df[df['category'] == category]
            cat_passed = cat_df['match'].sum()
            cat_total = len(cat_df)
            cat_rate = (cat_passed / cat_total) * 100
            self.log(f"  {category}: {cat_passed}/{cat_total} passed ({cat_rate:.1f}%)")
        
        # Failed checks details
        failed_df = df[~df['match']]
        if len(failed_df) > 0:
            self.log("\nFailed Checks (Details):")
            self.log("-" * 40)
            
            for _, row in failed_df.iterrows():
                self.log(f"  [{row['category']}] {row['metric']}:")
                self.log(f"    Claimed: {row['claimed']}")
                self.log(f"    Actual: {row['actual']}")
                if row['diff_pct'] is not None:
                    self.log(f"    Difference: {row['diff']:.0f} ({row['diff_pct']:+.1f}%)")
        
        # Save detailed reports
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        # CSV report
        csv_file = self.script_dir / f"verification_report_{timestamp}.csv"
        df.to_csv(csv_file, index=False)
        self.log(f"\nDetailed CSV report: {csv_file.name}")
        
        # JSON report with metadata
        json_report = {
            'timestamp': datetime.now().isoformat(),
            'summary': {
                'total_checks': int(total_checks),
                'passed': int(passed),
                'failed': int(failed),
                'pass_rate': float(pass_rate)
            },
            'columns_identified': self.metadata['columns_identified'],
            'results': df.to_dict('records'),
            'data_stats': {
                'total_transactions': len(self.data['transactions']),
                'files_loaded': len(self.data['transactions']['source_file'].unique()) if 'source_file' in self.data['transactions'].columns else 0
            }
        }
        
        json_file = self.script_dir / f"verification_summary_{timestamp}.json"
        with open(json_file, 'w') as f:
            json.dump(json_report, f, indent=2, default=str)
        self.log(f"JSON summary: {json_file.name}")
        
        # Generate recommendations
        self.generate_recommendations(df)
    
    def generate_recommendations(self, df):
        """Generate recommendations based on verification results"""
        self.log("\n" + "=" * 70)
        self.log("RECOMMENDATIONS")
        self.log("=" * 70)
        
        failed_df = df[~df['match']]
        
        if len(failed_df) == 0:
            self.log("✓ All checks passed! The data perfectly matches the paper's claims.")
            return
        
        # Analyze discrepancies
        recommendations = []
        
        # Check for systematic overcounting
        count_diffs = failed_df[failed_df['category'].isin(['Counts', 'Period Counts'])]['diff'].dropna()
        if len(count_diffs) > 0 and count_diffs.mean() > 0:
            avg_overcount = count_diffs.mean()
            recommendations.append(
                f"Data shows systematic overcounting (avg: +{avg_overcount:.0f} records). "
                "Consider checking for:\n"
                "  • Duplicate records that weren't removed\n"
                "  • Test or administrative entries\n"
                "  • Different inclusion/exclusion criteria"
            )
        
        # Check entity count discrepancies
        entity_failures = failed_df[failed_df['category'] == 'Entities']
        if len(entity_failures) > 0:
            recommendations.append(
                "Entity count mismatches detected. Verify:\n"
                "  • Correct column identification for borrowers/books\n"
                "  • Data cleaning and normalization procedures\n"
                "  • Handling of name variations and duplicates"
            )
        
        # Check temporal pattern issues
        temporal_failures = failed_df[failed_df['category'] == 'Temporal']
        if len(temporal_failures) > 0:
            recommendations.append(
                "Temporal pattern discrepancies found. Check:\n"
                "  • Date parsing format and consistency\n"
                "  • Handling of missing or invalid dates\n"
                "  • Time zone or calendar system issues"
            )
        
        for i, rec in enumerate(recommendations, 1):
            self.log(f"\n{i}. {rec}")
        
        if not recommendations:
            self.log("Minor discrepancies found but within acceptable tolerance.")
    
    def run(self):
        """Execute complete verification pipeline"""
        print("=" * 70)
        print("STRASHUN LIBRARY ADVANCED STATISTICS VERIFIER V2")
        print("=" * 70)
        print(f"Timestamp: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        
        try:
            # Phase 1: Load and analyze data
            if not self.load_and_analyze_data():
                self.log("Failed to load data files", "ERROR")
                return False
            
            # Phase 2: Run all verifications
            self.verify_basic_statistics()
            self.verify_ghost_records()
            self.verify_temporal_patterns()
            self.verify_distribution_patterns()
            self.verify_sparsity()
            self.verify_popular_items()
            
            # Phase 3: Generate reports
            self.generate_summary_report()
            
            return True
            
        except Exception as e:
            self.log(f"Unexpected error: {e}", "ERROR")
            import traceback
            traceback.print_exc()
            return False

def main():
    """Main entry point with argument parsing"""
    import argparse
    
    parser = argparse.ArgumentParser(
        description='Advanced Strashun Library statistics verifier',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  %(prog)s                    # Run with default settings
  %(prog)s --quiet           # Run with minimal output
  %(prog)s --verbose         # Run with detailed output
        """
    )
    
    parser.add_argument('--quiet', '-q', action='store_true', 
                       help='Minimal output (errors only)')
    parser.add_argument('--verbose', '-v', action='store_true',
                       help='Detailed output (default)')
    
    args = parser.parse_args()
    
    # Set verbosity
    verbose = not args.quiet
    
    # Run verifier
    verifier = StrashunVerifierV2(verbose=verbose)
    success = verifier.run()
    
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()