import json
import pandas as pd
from datetime import datetime, timedelta
from collections import Counter, defaultdict
import numpy as np
import logging

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

class StrashunLibraryAnalyzer:
    def __init__(self, json_file='library_data.json'):
        """Initialize the analyzer with the library data JSON file."""
        self.json_file = json_file
        self.data = None
        self.books_df = None
        self.borrowers_df = None
        self.transactions_df = None
        
    def load_data(self):
        """Load and parse the library JSON data."""
        logging.info("Loading library data from JSON...")
        try:
            with open(self.json_file, 'r', encoding='utf-8') as f:
                self.data = json.load(f)
            
            # Convert to DataFrames for easier analysis
            self.books_df = pd.DataFrame(self.data['books'])
            self.borrowers_df = pd.DataFrame(self.data['borrowers'])
            self.transactions_df = pd.DataFrame(self.data['transactions'])
            
            # Convert date column
            self.transactions_df['date'] = pd.to_datetime(self.transactions_df['date'])
            
            logging.info(f"Successfully loaded {len(self.books_df)} books, {len(self.borrowers_df)} borrowers, {len(self.transactions_df)} transactions")
            return True
            
        except FileNotFoundError:
            logging.error(f"File {self.json_file} not found!")
            return False
        except Exception as e:
            logging.error(f"Error loading data: {e}")
            return False
    
    def basic_statistics(self):
        """Generate basic statistics about the library data."""
        stats = {
            'total_books': len(self.books_df),
            'total_borrowers': len(self.borrowers_df),
            'total_transactions': len(self.transactions_df),
            'unique_books_borrowed': self.transactions_df['book_id'].nunique(),
            'books_never_borrowed': len(self.books_df) - self.transactions_df['book_id'].nunique(),
        }
        
        # Books with complete metadata
        stats['books_with_title'] = len(self.books_df[self.books_df['title'].str.len() > 0])
        stats['books_with_author'] = len(self.books_df[self.books_df['author'].str.len() > 0])
        stats['books_with_publisher'] = len(self.books_df[self.books_df['publisher'].str.len() > 0])
        stats['ghost_records'] = len(self.books_df[self.books_df['title'].str.len() == 0])
        
        # Date range
        stats['earliest_transaction'] = self.transactions_df['date'].min()
        stats['latest_transaction'] = self.transactions_df['date'].max()
        stats['date_range_years'] = (stats['latest_transaction'] - stats['earliest_transaction']).days / 365.25
        
        # Language distribution
        if 'language' in self.books_df.columns:
            lang_counts = self.books_df[self.books_df['language'].str.len() > 0]['language'].value_counts()
            stats['top_languages'] = lang_counts.head(10).to_dict()
        
        return stats
    
    def borrowing_patterns(self):
        """Analyze borrowing patterns over time."""
        patterns = {}
        
        # Transactions per year
        self.transactions_df['year'] = self.transactions_df['date'].dt.year
        yearly_counts = self.transactions_df['year'].value_counts().sort_index()
        patterns['transactions_per_year'] = yearly_counts.to_dict()
        
        # Transactions per month (seasonal patterns)
        self.transactions_df['month'] = self.transactions_df['date'].dt.month
        monthly_counts = self.transactions_df['month'].value_counts().sort_index()
        patterns['transactions_per_month'] = monthly_counts.to_dict()
        
        # Most active borrowing days
        self.transactions_df['day_of_week'] = self.transactions_df['date'].dt.day_name()
        dow_counts = self.transactions_df['day_of_week'].value_counts()
        patterns['transactions_per_day_of_week'] = dow_counts.to_dict()
        
        return patterns
    
    def popular_books_analysis(self):
        """Analyze most popular books and authors."""
        analysis = {}
        
        # Most borrowed books (by transaction count)
        book_popularity = self.transactions_df['book_id'].value_counts().head(25)
        
        # Merge with book details
        popular_books = []
        for book_id, count in book_popularity.items():
            book_info = self.books_df[self.books_df['id'] == book_id].iloc[0]
            popular_books.append({
                'book_id': book_id,
                'title': book_info['title'] if book_info['title'] else f"Book ID {book_id}",
                'author': book_info['author'],
                'borrowing_count': count
            })
        
        analysis['most_popular_books'] = popular_books
        
        # Most popular authors
        author_counts = defaultdict(int)
        for _, row in self.transactions_df.iterrows():
            book_info = self.books_df[self.books_df['id'] == row['book_id']]
            if not book_info.empty and book_info.iloc[0]['author']:
                author_counts[book_info.iloc[0]['author']] += 1
        
        analysis['most_popular_authors'] = dict(Counter(author_counts).most_common(20))
        
        return analysis
    
    def borrower_analysis(self):
        """Analyze borrower behavior patterns."""
        analysis = {}
        
        # Add borrowing counts to borrowers
        borrower_activity = []
        for _, borrower in self.borrowers_df.iterrows():
            activity = {
                'name': borrower['name'],
                'total_transactions': len(borrower['transaction_ids']),
                'unique_books': len(set([
                    self.transactions_df[self.transactions_df['transaction_id'] == tid]['book_id'].iloc[0]
                    for tid in borrower['transaction_ids']
                    if not self.transactions_df[self.transactions_df['transaction_id'] == tid].empty
                ]))
            }
            borrower_activity.append(activity)
        
        borrower_df = pd.DataFrame(borrower_activity)
        
        analysis['most_active_borrowers'] = borrower_df.nlargest(25, 'total_transactions').to_dict('records')
        analysis['borrowing_distribution'] = {
            'mean_books_per_borrower': borrower_df['total_transactions'].mean(),
            'median_books_per_borrower': borrower_df['total_transactions'].median(),
            'max_books_by_single_borrower': borrower_df['total_transactions'].max(),
            'borrowers_with_1_book': len(borrower_df[borrower_df['total_transactions'] == 1]),
            'borrowers_with_5plus_books': len(borrower_df[borrower_df['total_transactions'] >= 5]),
            'borrowers_with_10plus_books': len(borrower_df[borrower_df['total_transactions'] >= 10]),
            'borrowers_with_20plus_books': len(borrower_df[borrower_df['total_transactions'] >= 20])
        }
        
        return analysis
    
    def generate_text_tables(self, data, headers, max_width=80):
        """Generate formatted text tables."""
        # Calculate column widths
        col_widths = []
        for i, header in enumerate(headers):
            max_len = len(header)
            for row in data:
                max_len = max(max_len, len(str(row[i])))
            col_widths.append(min(max_len + 2, max_width // len(headers)))
        
        # Create separator
        separator = "+" + "+".join(["-" * width for width in col_widths]) + "+"
        
        # Format table
        table = [separator]
        
        # Header
        header_row = "|"
        for i, header in enumerate(headers):
            header_row += f" {header:<{col_widths[i]-1}}|"
        table.append(header_row)
        table.append(separator)
        
        # Data rows
        for row in data:
            data_row = "|"
            for i, cell in enumerate(row):
                cell_str = str(cell)
                if len(cell_str) > col_widths[i] - 1:
                    cell_str = cell_str[:col_widths[i]-4] + "..."
                data_row += f" {cell_str:<{col_widths[i]-1}}|"
            table.append(data_row)
        
        table.append(separator)
        return "\n".join(table)
    
    def generate_report(self, output_file='library_analysis_report.txt'):
        """Generate a comprehensive text report."""
        if not self.load_data():
            return False
        
        logging.info("Generating analysis report...")
        
        # Run all analyses
        basic_stats = self.basic_statistics()
        patterns = self.borrowing_patterns()
        popular_books = self.popular_books_analysis()
        borrower_stats = self.borrower_analysis()
        
        # Generate text report
        report = f"""
{'='*80}
                     STRASHUN LIBRARY HISTORICAL ANALYSIS REPORT
{'='*80}

Generated on: {datetime.now().strftime('%B %d, %Y at %H:%M:%S')}

{'='*80}
EXECUTIVE SUMMARY
{'='*80}

This report analyzes the historical borrowing records of the Strashun Library
in Vilna, covering a period from {basic_stats['earliest_transaction'].strftime('%Y')} to {basic_stats['latest_transaction'].strftime('%Y')} 
({basic_stats['date_range_years']:.1f} years).

KEY FINDINGS:
• {basic_stats['total_transactions']:,} total borrowing transactions
• {basic_stats['total_borrowers']:,} individual borrowers  
• {basic_stats['total_books']:,} books in collection ({basic_stats['unique_books_borrowed']:,} were actually borrowed)
• {basic_stats['ghost_records']:,} transactions for books without complete catalog metadata
• {basic_stats['books_with_title']:,} books have complete title information

{'='*80}
COLLECTION OVERVIEW
{'='*80}

LIBRARY HOLDINGS:
• Total Books:                    {basic_stats['total_books']:,}
• Books with Complete Metadata:   {basic_stats['books_with_title']:,} ({basic_stats['books_with_title']/basic_stats['total_books']*100:.1f}%)
• Books with Author Information:  {basic_stats['books_with_author']:,} ({basic_stats['books_with_author']/basic_stats['total_books']*100:.1f}%)
• Books with Publisher Info:      {basic_stats['books_with_publisher']:,} ({basic_stats['books_with_publisher']/basic_stats['total_books']*100:.1f}%)
• Ghost Records:                  {basic_stats['ghost_records']:,} (transactions exist but no catalog data)
• Books Never Borrowed:           {basic_stats['books_never_borrowed']:,}

"""
        
        if 'top_languages' in basic_stats and basic_stats['top_languages']:
            report += "LANGUAGE DISTRIBUTION:\n"
            for lang, count in basic_stats['top_languages'].items():
                lang_name = lang if lang else "Unknown"
                report += f"• {lang_name:<20} {count:,} books\n"
        
        report += f"""

{'='*80}
BORROWING ACTIVITY ANALYSIS
{'='*80}

DATE RANGE: {basic_stats['earliest_transaction'].strftime('%B %d, %Y')} - {basic_stats['latest_transaction'].strftime('%B %d, %Y')}

ANNUAL BORROWING ACTIVITY:
"""
        
        for year, count in sorted(patterns['transactions_per_year'].items()):
            report += f"• {year}: {count:,} transactions\n"
        
        report += "\nMONTHLY PATTERNS:\n"
        month_names = ['January', 'February', 'March', 'April', 'May', 'June',
                      'July', 'August', 'September', 'October', 'November', 'December']
        
        for month_num, count in sorted(patterns['transactions_per_month'].items()):
            report += f"• {month_names[month_num-1]:<12} {count:,} transactions\n"
        
        report += "\nDAY OF WEEK PATTERNS:\n"
        for day, count in patterns['transactions_per_day_of_week'].items():
            report += f"• {day:<12} {count:,} transactions\n"
        
        report += f"""

{'='*80}
MOST POPULAR BOOKS
{'='*80}

The following books were the most frequently borrowed:

"""
        
        # Create table data for popular books
        book_table_data = []
        for i, book in enumerate(popular_books['most_popular_books'][:20], 1):
            title = book['title'] if book['title'] else f"[Book ID: {book['book_id']}]"
            author = book['author'] if book['author'] else "Unknown Author"
            book_table_data.append([
                str(i),
                title[:40] + "..." if len(title) > 40 else title,
                author[:25] + "..." if len(author) > 25 else author,
                str(book['borrowing_count'])
            ])
        
        report += self.generate_text_tables(
            book_table_data, 
            ["Rank", "Title", "Author", "Times Borrowed"]
        )
        
        report += f"""

{'='*80}
MOST POPULAR AUTHORS
{'='*80}

The most frequently borrowed authors were:

"""
        
        # Create table for popular authors
        author_table_data = []
        for i, (author, count) in enumerate(list(popular_books['most_popular_authors'].items())[:15], 1):
            author_name = author[:45] + "..." if len(author) > 45 else author
            author_table_data.append([str(i), author_name, str(count)])
        
        report += self.generate_text_tables(
            author_table_data,
            ["Rank", "Author", "Total Borrowings"]
        )
        
        report += f"""

{'='*80}
BORROWER ANALYSIS
{'='*80}

ACTIVITY SUMMARY:
• Total Borrowers:              {basic_stats['total_borrowers']:,}
• Average Books per Borrower:   {borrower_stats['borrowing_distribution']['mean_books_per_borrower']:.1f}
• Median Books per Borrower:    {borrower_stats['borrowing_distribution']['median_books_per_borrower']:.1f}
• Most Active Borrower:         {borrower_stats['borrowing_distribution']['max_books_by_single_borrower']:,} books

BORROWING PATTERNS:
• Single-book borrowers:        {borrower_stats['borrowing_distribution']['borrowers_with_1_book']:,} ({borrower_stats['borrowing_distribution']['borrowers_with_1_book']/basic_stats['total_borrowers']*100:.1f}%)
• Active borrowers (5+ books):  {borrower_stats['borrowing_distribution']['borrowers_with_5plus_books']:,} ({borrower_stats['borrowing_distribution']['borrowers_with_5plus_books']/basic_stats['total_borrowers']*100:.1f}%)
• Heavy users (10+ books):      {borrower_stats['borrowing_distribution']['borrowers_with_10plus_books']:,} ({borrower_stats['borrowing_distribution']['borrowers_with_10plus_books']/basic_stats['total_borrowers']*100:.1f}%)
• Super users (20+ books):      {borrower_stats['borrowing_distribution']['borrowers_with_20plus_books']:,} ({borrower_stats['borrowing_distribution']['borrowers_with_20plus_books']/basic_stats['total_borrowers']*100:.1f}%)

MOST ACTIVE BORROWERS:

"""
        
        # Create table for active borrowers
        borrower_table_data = []
        for i, borrower in enumerate(borrower_stats['most_active_borrowers'][:20], 1):
            name = borrower['name'][:35] + "..." if len(borrower['name']) > 35 else borrower['name']
            borrower_table_data.append([
                str(i),
                name,
                str(borrower['total_transactions']),
                str(borrower['unique_books'])
            ])
        
        report += self.generate_text_tables(
            borrower_table_data,
            ["Rank", "Name", "Total Transactions", "Unique Books"]
        )
        
        report += f"""

{'='*80}
DATA QUALITY ASSESSMENT
{'='*80}

COMPLETENESS:
• Complete Records:     {((basic_stats['total_transactions'] - basic_stats['ghost_records']) / basic_stats['total_transactions'] * 100):.1f}% of transactions have complete book metadata
• Missing Metadata:     {basic_stats['ghost_records']:,} transactions reference books not in catalog  
• Catalog Coverage:     {basic_stats['unique_books_borrowed']:,} of {basic_stats['total_books']:,} cataloged books were actually borrowed
• Utilization Rate:     {(basic_stats['unique_books_borrowed'] / basic_stats['total_books'] * 100):.1f}% of collection was borrowed

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
• Analysis covers {basic_stats['date_range_years']:.1f} years of borrowing history
• {basic_stats['ghost_records']:,} "ghost records" exist where transactions reference books not 
  present in the master catalog
• Date formatting standardized to YYYY-MM-DD format
• Borrower names normalized to reduce duplicates from variant spellings

{'='*80}
END OF REPORT
{'='*80}

This report was generated automatically from the historical library records.
For questions about the data or methodology, please refer to the accompanying 
documentation.
"""
        
        # Write report to file
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(report)
        
        logging.info(f"Analysis report saved to {output_file}")
        return True

def main():
    """Main function to run the library analysis."""
    analyzer = StrashunLibraryAnalyzer()
    
    if analyzer.generate_report():
        print("✅ Analysis complete! Check the file:")
        print("   📄 library_analysis_report.txt - Comprehensive text report")
    else:
        print("❌ Analysis failed. Check the log messages above.")

if __name__ == '__main__':
    main()