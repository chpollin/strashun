"""
Strashun Library Data Preparation Script v2.0
==============================================
Processes historical library records and creates comprehensive JSON data
for the web visualization application.

Major enhancements:
- Creates borrowers array with full transaction history
- Links books to their transactions
- Handles ghost records properly
- Includes data quality validation
- Standardizes all dates to ISO format
"""

import pandas as pd
import numpy as np
import json
import logging
import warnings
warnings.filterwarnings('ignore', category=FutureWarning)
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Any, Optional

# Setup detailed logging
logging.basicConfig(
    level=logging.INFO, 
    format='%(asctime)s - %(levelname)s - %(message)s'
)

def load_and_prepare_ledgers(data_path: Path) -> pd.DataFrame:
    """
    Loads ledgers, cleans them, and standardizes data.
    
    Args:
        data_path: Path to the data directory
        
    Returns:
        DataFrame with combined and cleaned ledger data
    """
    logging.info("Loading and preparing ledger data...")
    
    # Find all ledger files
    ledger_files = list(data_path.glob('Transcription - Pilot - copy noam - Transcription - Pilot - record-*.csv'))
    
    if not ledger_files:
        logging.error("CRITICAL: No ledger files found in %s", data_path)
        return pd.DataFrame()

    all_ledgers = []
    
    for f in ledger_files:
        try:
            df = pd.read_csv(f, encoding='utf-8', low_memory=False)
            df.columns = df.columns.str.strip()
            
            # Extract year from filename
            year_part = f.stem.split('-')[-1].strip()
            if '_' in year_part:
                year_part = year_part.split('_')[-1]
            df['year'] = year_part
            
            all_ledgers.append(df)
            logging.info(f"  Loaded {len(df)} records from {f.name}")
            
        except Exception as e:
            logging.error(f"Error loading file {f}: {e}")
            continue

    if not all_ledgers:
        logging.error("No ledger files could be loaded successfully")
        return pd.DataFrame()

    # Combine all ledgers
    ledgers = pd.concat(all_ledgers, ignore_index=True)
    logging.info(f"Combined {len(all_ledgers)} files: {len(ledgers)} total transactions")
    
    # Replace NaN values with None for JSON compatibility
    ledgers = ledgers.replace({np.nan: None})
    
    # Standardize book_id column
    if 'id' in ledgers.columns and 'book id' in ledgers.columns:
        ledgers['book_id'] = ledgers['book id'].fillna(ledgers['id'])
        ledgers.drop(columns=['id', 'book id'], inplace=True, errors='ignore')
    elif 'id' in ledgers.columns:
        ledgers.rename(columns={'id': 'book_id'}, inplace=True)
    elif 'book id' in ledgers.columns:
        ledgers.rename(columns={'book id': 'book_id'}, inplace=True)

    # Standardize column names
    rename_map = {
        'ID - record': 'transaction_id',
        "person's name": 'borrower_name',
        'book name': 'book_name',
        'date - Transcription': 'date_transcription',
        'return date - Transcription': 'return_date_transcription'
    }
    ledgers.rename(columns=rename_map, inplace=True)

    # Process gender field
    if '<F>' in ledgers.columns:
        ledgers['gender'] = ledgers['<F>'].apply(
            lambda x: 'W' if str(x).strip().lower() in ['x', 'f', 'female'] else 'M' if pd.notna(x) else 'M'
        )
        ledgers.drop(columns=['<F>'], inplace=True)
    else:
        ledgers['gender'] = 'Unknown'

    # Create binary gender columns for statistics
    ledgers['is_man'] = (ledgers['gender'] == 'M').astype(int)
    ledgers['is_woman'] = (ledgers['gender'] == 'W').astype(int)

    # Standardize dates
    ledgers = standardize_dates(ledgers)
    
    # Clean year field
    ledgers['year'] = pd.to_numeric(ledgers['year'], errors='coerce')
    
    logging.info("Data preparation complete")
    return ledgers


def standardize_dates(df: pd.DataFrame) -> pd.DataFrame:
    """
    Standardize all date formats to ISO 8601 (YYYY-MM-DD).
    
    Args:
        df: DataFrame with date columns
        
    Returns:
        DataFrame with standardized dates
    """
    date_columns = ['date', 'return_date']
    
    for col in date_columns:
        if col not in df.columns:
            continue
            
        logging.info(f"Standardizing {col}...")
        
        # Try multiple date formats
        formats = [
            '%d/%m/%Y',
            '%Y-%m-%d',
            '%m/%d/%Y',
            '%d.%m.%Y',
            '%Y/%m/%d',
            '%d-%m-%Y'
        ]
        
        # First attempt with pandas inference
        standardized = pd.to_datetime(df[col], errors='coerce', dayfirst=True)
        
        # Try specific formats for remaining NaT values
        for fmt in formats:
            mask = standardized.isna() & df[col].notna()
            if mask.any():
                try:
                    parsed = pd.to_datetime(df.loc[mask, col], format=fmt, errors='coerce')
                    standardized.loc[mask] = parsed
                except:
                    continue
        
        # Convert to ISO format string
        df[col] = standardized.dt.strftime('%Y-%m-%d').where(standardized.notna(), None)
        
        valid_count = standardized.notna().sum()
        total_count = df[col].notna().sum()
        logging.info(f"  {col}: {valid_count}/{total_count} dates standardized")
    
    return df


def load_master_book_catalog(data_path: Path) -> pd.DataFrame:
    """
    Loads and cleans the master book catalog.
    
    Args:
        data_path: Path to the data directory
        
    Returns:
        DataFrame with book catalog data
    """
    logging.info("Loading master book catalog...")
    
    catalog_files = list(data_path.glob('*unique books list.csv'))
    
    if not catalog_files:
        logging.error("CRITICAL: Master book catalog not found")
        return pd.DataFrame()
    
    try:
        df = pd.read_csv(catalog_files[0], encoding='utf-8', low_memory=False)
        df.columns = df.columns.str.strip()
        
        # Replace NaN values
        df = df.replace({np.nan: None})
        
        # Rename language column if needed
        if 'language_nli' in df.columns:
            df.rename(columns={'language_nli': 'language'}, inplace=True)
        
        # Ensure book_id is numeric
        if 'book_id' in df.columns:
            df['book_id'] = pd.to_numeric(df['book_id'], errors='coerce')
        
        logging.info(f"  Loaded {len(df)} books from catalog")
        return df
        
    except Exception as e:
        logging.error(f"Error loading catalog: {e}")
        return pd.DataFrame()


def create_borrowers_list(ledgers: pd.DataFrame, catalog: pd.DataFrame) -> List[Dict]:
    """
    Create comprehensive borrower profiles with transaction history.
    
    Args:
        ledgers: DataFrame with transaction data
        catalog: DataFrame with book catalog
        
    Returns:
        List of borrower dictionaries with full profiles
    """
    logging.info("Creating borrowers list with transaction history...")
    
    borrowers_dict = {}
    
    for idx, transaction in ledgers.iterrows():
        borrower_name = transaction.get('borrower_name')
        
        # Skip invalid entries
        if not borrower_name or pd.isna(borrower_name):
            continue
            
        # Initialize borrower if new
        if borrower_name not in borrowers_dict:
            borrowers_dict[borrower_name] = {
                'borrower_name': borrower_name,
                'gender': transaction.get('gender', 'Unknown'),
                'first_seen': transaction.get('date'),
                'last_seen': transaction.get('date'),
                'transactions': [],
                'unique_books': set(),
                'years_active': set(),
                'favorite_months': {},
                'reading_velocity': 0
            }
        
        borrower = borrowers_dict[borrower_name]
        
        # Update gender if more specific
        if borrower['gender'] == 'Unknown' and transaction.get('gender') != 'Unknown':
            borrower['gender'] = transaction.get('gender')
        
        # Create transaction record
        trans_data = {
            'transaction_id': transaction.get('transaction_id'),
            'book_id': int(transaction.get('book_id')) if pd.notna(transaction.get('book_id')) else None,
            'book_name': transaction.get('book_name'),
            'date': transaction.get('date'),
            'return_date': transaction.get('return_date') if 'return_date' in transaction.index else None,  # CHECK IF EXISTS
            'year': int(transaction.get('year')) if pd.notna(transaction.get('year')) else None
        }
        
        # Add to transactions
        borrower['transactions'].append(trans_data)
        
        # Track unique books
        if trans_data['book_id']:
            borrower['unique_books'].add(trans_data['book_id'])
        
        # Track years active
        if trans_data['year']:
            borrower['years_active'].add(trans_data['year'])
        
        # Track monthly patterns
        if transaction.get('date'):
            try:
                month = pd.to_datetime(transaction.get('date')).month
                borrower['favorite_months'][month] = borrower['favorite_months'].get(month, 0) + 1
            except:
                pass
        
        # Update date range
        if transaction.get('date'):
            if not borrower['first_seen'] or transaction.get('date') < borrower['first_seen']:
                borrower['first_seen'] = transaction.get('date')
            if not borrower['last_seen'] or transaction.get('date') > borrower['last_seen']:
                borrower['last_seen'] = transaction.get('date')
    
    # Convert to list and calculate derived metrics
    borrowers_list = []
    
    for name, borrower in borrowers_dict.items():
        # Convert sets to lists for JSON serialization
        borrower['unique_books'] = list(borrower['unique_books'])
        borrower['years_active'] = sorted(list(borrower['years_active']))
        
        # Calculate summary statistics
        borrower['total_transactions'] = len(borrower['transactions'])
        borrower['unique_book_count'] = len(borrower['unique_books'])
        
        # Calculate reading velocity (books per year)
        if borrower['years_active']:
            years_span = max(borrower['years_active']) - min(borrower['years_active']) + 1
            borrower['reading_velocity'] = round(borrower['total_transactions'] / years_span, 2)
        else:
            borrower['reading_velocity'] = 0
        
        # Find most active month
        if borrower['favorite_months']:
            most_active_month = max(borrower['favorite_months'].items(), key=lambda x: x[1])
            borrower['most_active_month'] = most_active_month[0]
        else:
            borrower['most_active_month'] = None
        
        # Clean up temporary fields
        del borrower['favorite_months']
        
        borrowers_list.append(borrower)
    
    # Sort by activity level
    borrowers_list.sort(key=lambda x: x['total_transactions'], reverse=True)
    
    logging.info(f"  Created {len(borrowers_list)} borrower profiles")
    
    # Log summary statistics
    total_trans = sum(b['total_transactions'] for b in borrowers_list)
    single_book = sum(1 for b in borrowers_list if b['unique_book_count'] == 1)
    power_users = sum(1 for b in borrowers_list if b['total_transactions'] >= 20)
    
    logging.info(f"  Total transactions: {total_trans}")
    logging.info(f"  Single-book borrowers: {single_book} ({single_book/len(borrowers_list)*100:.1f}%)")
    logging.info(f"  Power users (20+ books): {power_users}")
    
    return borrowers_list


def enhance_books_with_transactions(catalog: pd.DataFrame, ledgers: pd.DataFrame) -> List[Dict]:
    """
    Link books to their transaction history and add ghost records.
    
    Args:
        catalog: DataFrame with book catalog
        ledgers: DataFrame with transaction data
        
    Returns:
        List of book dictionaries with transaction data
    """
    logging.info("Enhancing books with transaction data...")
    
    # Create book transaction map
    book_transactions = {}
    book_borrowers = {}
    
    for idx, transaction in ledgers.iterrows():
        book_id = transaction.get('book_id')
        
        if pd.isna(book_id):
            continue
            
        book_id = int(book_id)
        
        if book_id not in book_transactions:
            book_transactions[book_id] = []
            book_borrowers[book_id] = set()
        
        trans_data = {
            'transaction_id': transaction.get('transaction_id'),
            'borrower_name': transaction.get('borrower_name'),
            'date': transaction.get('date'),
            'return_date': transaction.get('return_date') if 'return_date' in transaction.index else None,  # CHECK IF EXISTS
            'year': int(transaction.get('year')) if pd.notna(transaction.get('year')) else None,
            'gender': transaction.get('gender')
        }
        
        book_transactions[book_id].append(trans_data)
        
        if transaction.get('borrower_name'):
            book_borrowers[book_id].add(transaction.get('borrower_name'))
    
    # Process catalog books
    enhanced_books = []
    cataloged_ids = set()
    
    for idx, book in catalog.iterrows():
        book_dict = book.to_dict()
        book_id = book_dict.get('book_id')
        
        # Clean up None values
        book_dict = {k: v for k, v in book_dict.items() if v is not None}
        
        if book_id and not pd.isna(book_id):
            book_id = int(book_id)
            cataloged_ids.add(book_id)
            
            book_dict['book_id'] = book_id
            book_dict['transactions'] = book_transactions.get(book_id, [])
            book_dict['transaction_count'] = len(book_dict['transactions'])
            book_dict['unique_borrowers'] = list(book_borrowers.get(book_id, set()))
            book_dict['unique_borrower_count'] = len(book_dict['unique_borrowers'])
            book_dict['is_ghost'] = False
        else:
            book_dict['transactions'] = []
            book_dict['transaction_count'] = 0
            book_dict['unique_borrowers'] = []
            book_dict['unique_borrower_count'] = 0
            book_dict['is_ghost'] = False
        
        enhanced_books.append(book_dict)
    
    # Add ghost records (books in transactions but not in catalog)
    ghost_ids = set(book_transactions.keys()) - cataloged_ids
    
    logging.info(f"  Found {len(ghost_ids)} ghost records (books in transactions but not catalog)")
    
    for ghost_id in ghost_ids:
        # Try to find book name from transactions
        book_names = [t.get('book_name') for t in ledgers[ledgers['book_id'] == ghost_id].to_dict('records') 
                     if t.get('book_name')]
        book_name = book_names[0] if book_names else f'Unknown Book #{ghost_id}'
        
        ghost_book = {
            'book_id': ghost_id,
            'title': book_name,
            'book_name': book_name,
            'is_ghost': True,
            'transactions': book_transactions[ghost_id],
            'transaction_count': len(book_transactions[ghost_id]),
            'unique_borrowers': list(book_borrowers[ghost_id]),
            'unique_borrower_count': len(book_borrowers[ghost_id])
        }
        enhanced_books.append(ghost_book)
    
    # Sort by popularity
    enhanced_books.sort(key=lambda x: x['transaction_count'], reverse=True)
    
    logging.info(f"  Enhanced {len(enhanced_books)} total books")
    logging.info(f"  {len(cataloged_ids)} from catalog, {len(ghost_ids)} ghost records")
    
    return enhanced_books


def create_aggregated_data(ledgers: pd.DataFrame, catalog: pd.DataFrame) -> Dict:
    """
    Create aggregated statistics for the dashboard.
    """
    logging.info("Creating aggregated data summaries...")
    
    # Clean year data
    ledgers = ledgers.copy()
    ledgers['year'] = pd.to_numeric(ledgers['year'], errors='coerce')
    ledgers = ledgers.dropna(subset=['year'])
    ledgers['year'] = ledgers['year'].astype(int)
    
    # By year statistics
    by_year = ledgers.groupby('year').agg(
        total_transactions=('transaction_id', 'size'),
        men_transactions=('is_man', 'sum'),
        women_transactions=('is_woman', 'sum'),
        unique_borrowers=('borrower_name', 'nunique'),
        unique_books=('book_id', 'nunique')
    ).reset_index()
    
    # By gender statistics
    by_gender = ledgers.groupby('gender').agg(
        total_transactions=('transaction_id', 'size'),
        unique_borrowers=('borrower_name', 'nunique')
    ).reset_index()
    
    # By language statistics (if catalog available)
    by_language = pd.DataFrame()
    if not catalog.empty and 'language' in catalog.columns:
        ledgers_copy = ledgers.copy()
        ledgers_copy['book_id'] = pd.to_numeric(ledgers_copy['book_id'], errors='coerce')
        catalog_copy = catalog.copy()
        catalog_copy['book_id'] = pd.to_numeric(catalog_copy['book_id'], errors='coerce')
        
        merged_df = pd.merge(ledgers_copy, catalog_copy[['book_id', 'language']], 
                           on='book_id', how='left')
        
        by_language = merged_df.groupby('language').agg(
            total_transactions=('transaction_id', 'size'),
            unique_books=('book_id', 'nunique')
        ).reset_index()
        by_language = by_language.dropna(subset=['language'])
    
    # By month statistics (aggregate across all years)
    ledgers['month'] = pd.to_datetime(ledgers['date'], errors='coerce').dt.month
    by_month = ledgers.groupby('month').agg(
        total_transactions=('transaction_id', 'size')
    ).reset_index()
    by_month = by_month.dropna(subset=['month'])
    by_month['month'] = by_month['month'].astype(int)
    
    # Summary statistics - FIX HERE
    # Convert date strings back to datetime for min/max operations
    date_series = pd.to_datetime(ledgers['date'], errors='coerce')
    valid_dates = date_series.dropna()
    
    summary = {
        'total_transactions': len(ledgers),
        'total_borrowers': ledgers['borrower_name'].nunique(),
        'total_books': ledgers['book_id'].nunique(),
        'date_range': {
            'start': valid_dates.min().strftime('%Y-%m-%d') if not valid_dates.empty else None,
            'end': valid_dates.max().strftime('%Y-%m-%d') if not valid_dates.empty else None
        },
        'avg_transactions_per_borrower': round(len(ledgers) / ledgers['borrower_name'].nunique(), 2) if ledgers['borrower_name'].nunique() > 0 else 0,
        'avg_transactions_per_book': round(len(ledgers) / ledgers['book_id'].nunique(), 2) if ledgers['book_id'].nunique() > 0 else 0
    }
    
    return {
        'by_year': by_year.to_dict('records'),
        'by_gender': by_gender.to_dict('records'),
        'by_language': by_language.to_dict('records') if not by_language.empty else [],
        'by_month': by_month.to_dict('records'),
        'summary': summary
    }

def create_network_data(transactions_df: pd.DataFrame) -> Dict:
    """
    Create pre-aggregated network data for visualization.
    
    Args:
        transactions_df: DataFrame with transaction data
        
    Returns:
        Dictionary with network data for different time periods
    """
    logging.info("Creating network data...")
    
    network_data = {}
    
    # Clean year data
    transactions_df = transactions_df.copy()
    transactions_df['year'] = pd.to_numeric(transactions_df['year'], errors='coerce')
    transactions_df = transactions_df.dropna(subset=['year'])
    transactions_df['year'] = transactions_df['year'].astype(int)
    
    # Define time periods
    all_years = transactions_df['year'].unique()
    min_year = transactions_df['year'].min()
    max_year = transactions_df['year'].max()
    
    time_periods = {
        'all': (min_year, max_year),
        '1902': (1902, 1902),
        '1903-1904': (1903, 1904),
        '1934': (1934, 1934),
        '1940': (1940, 1940)
    }
    
    for period, (start_year, end_year) in time_periods.items():
        period_transactions = transactions_df[
            (transactions_df['year'] >= start_year) & 
            (transactions_df['year'] <= end_year)
        ]
        
        if period_transactions.empty:
            continue
        
        nodes = []
        edges = []
        
        # Get unique books and borrowers
        book_nodes = period_transactions['book_id'].dropna().unique()
        borrower_nodes = period_transactions['borrower_name'].dropna().unique()
        
        # Create book nodes
        for book_id in book_nodes:
            nodes.append({
                'id': f'book-{int(book_id)}',
                'label': str(int(book_id)),
                'group': 'book',
                'value': len(period_transactions[period_transactions['book_id'] == book_id])
            })
        
        # Create borrower nodes with gender info
        for borrower_name in borrower_nodes:
            borrower_trans = period_transactions[period_transactions['borrower_name'] == borrower_name]
            gender = borrower_trans['gender'].mode()[0] if not borrower_trans.empty else 'Unknown'
            
            nodes.append({
                'id': f'borrower-{borrower_name}',
                'label': borrower_name,
                'group': 'borrower',
                'gender': gender,
                'value': len(borrower_trans)
            })
        
        # Create edges with weights
        edge_weights = {}
        for idx, row in period_transactions.iterrows():
            if pd.notna(row['borrower_name']) and pd.notna(row['book_id']):
                edge_key = (f'borrower-{row["borrower_name"]}', f'book-{int(row["book_id"])}')
                edge_weights[edge_key] = edge_weights.get(edge_key, 0) + 1
        
        for (from_node, to_node), weight in edge_weights.items():
            edges.append({
                'from': from_node,
                'to': to_node,
                'value': weight
            })
        
        network_data[period] = {
            'nodes': nodes,
            'edges': edges,
            'summary': {
                'total_nodes': len(nodes),
                'total_edges': len(edges),
                'book_nodes': len(book_nodes),
                'borrower_nodes': len(borrower_nodes)
            }
        }
        
        logging.info(f"  Period {period}: {len(nodes)} nodes, {len(edges)} edges")
    
    return network_data


def validate_and_report_data_quality(
    ledgers: pd.DataFrame, 
    catalog: pd.DataFrame, 
    borrowers: List[Dict], 
    books: List[Dict]
) -> Dict:
    """
    Generate comprehensive data quality report.
    """
    logging.info("Validating data quality...")
    
    quality_report = {
        'timestamp': datetime.now().isoformat(),
        'version': '2.0',
        'summary': {},
        'issues': [],
        'warnings': [],
        'info': []
    }
    
    # Transaction validation - CHECK IF COLUMNS EXIST FIRST
    total_transactions = len(ledgers)
    transactions_with_dates = ledgers['date'].notna().sum() if 'date' in ledgers.columns else 0
    transactions_with_returns = ledgers['return_date'].notna().sum() if 'return_date' in ledgers.columns else 0
    transactions_with_books = ledgers['book_id'].notna().sum() if 'book_id' in ledgers.columns else 0
    transactions_with_borrowers = ledgers['borrower_name'].notna().sum() if 'borrower_name' in ledgers.columns else 0
    
    quality_report['summary']['transactions'] = {
        'total': total_transactions,
        'with_dates': transactions_with_dates,
        'with_returns': transactions_with_returns,
        'with_books': transactions_with_books,
        'with_borrowers': transactions_with_borrowers,
        'completeness_rate': round(transactions_with_books / total_transactions * 100, 2) if total_transactions > 0 else 0
    }
    
    # Log missing columns as issues
    expected_columns = ['date', 'return_date', 'book_id', 'borrower_name']
    missing_columns = [col for col in expected_columns if col not in ledgers.columns]
    if missing_columns:
        quality_report['warnings'].append({
            'type': 'missing_columns',
            'columns': missing_columns,
            'message': f'Expected columns not found in data: {", ".join(missing_columns)}'
        })
    
    # Ghost records analysis
    catalog_ids = set(catalog['book_id'].dropna().astype(int)) if not catalog.empty and 'book_id' in catalog.columns else set()
    if 'book_id' in ledgers.columns:
        transaction_book_ids = set(ledgers['book_id'].dropna().astype(int))
        ghost_ids = transaction_book_ids - catalog_ids
        
        if ghost_ids:
            quality_report['issues'].append({
                'type': 'ghost_records',
                'severity': 'medium',
                'count': len(ghost_ids),
                'message': f'{len(ghost_ids)} books appear in transactions but not in the catalog',
                'sample_ids': list(ghost_ids)[:10]
            })
    else:
        ghost_ids = set()
    
    # Date consistency checks - ONLY IF BOTH COLUMNS EXIST
    date_issues = []
    if 'date' in ledgers.columns and 'return_date' in ledgers.columns:
        for idx, row in ledgers.iterrows():
            if pd.notna(row.get('date')) and pd.notna(row.get('return_date')):
                try:
                    borrow_date = pd.to_datetime(row['date'])
                    return_date = pd.to_datetime(row['return_date'])
                    if return_date < borrow_date:
                        date_issues.append({
                            'transaction_id': row.get('transaction_id'),
                            'borrow_date': str(borrow_date),
                            'return_date': str(return_date)
                        })
                except:
                    pass
        
        if date_issues:
            quality_report['warnings'].append({
                'type': 'date_inconsistency',
                'count': len(date_issues),
                'message': 'Some return dates are before borrow dates',
                'samples': date_issues[:5]
            })
    
    # Borrower analysis
    female_count = sum(1 for b in borrowers if b.get('gender') == 'W')
    male_count = sum(1 for b in borrowers if b.get('gender') == 'M')
    unknown_gender = sum(1 for b in borrowers if b.get('gender') not in ['W', 'M'])
    
    quality_report['summary']['borrowers'] = {
        'total': len(borrowers),
        'single_book_borrowers': sum(1 for b in borrowers if b.get('unique_book_count', 0) == 1),
        'power_users': sum(1 for b in borrowers if b.get('total_transactions', 0) >= 20),
        'super_users': sum(1 for b in borrowers if b.get('total_transactions', 0) >= 50),
        'gender_distribution': {
            'female': female_count,
            'male': male_count,
            'unknown': unknown_gender,
            'female_percentage': round(female_count / len(borrowers) * 100, 2) if borrowers else 0
        }
    }
    
    # Book utilization
    ghost_books = [b for b in books if b.get('is_ghost', False)]
    never_borrowed = [b for b in books if b.get('transaction_count', 0) == 0]
    most_popular = max(books, key=lambda x: x.get('transaction_count', 0)) if books else None
    
    quality_report['summary']['books'] = {
        'total_cataloged': len(catalog),
        'total_with_transactions': len(books),
        'ghost_records': len(ghost_books),
        'never_borrowed': len(never_borrowed),
        'utilization_rate': round((len(books) - len(never_borrowed)) / len(books) * 100, 2) if books else 0,
        'most_popular': {
            'title': most_popular.get('title', 'Unknown') if most_popular else None,
            'transactions': most_popular.get('transaction_count', 0) if most_popular else 0
        }
    }
    
    # Missing data warnings
    if 'return_date' not in ledgers.columns:
        quality_report['warnings'].append({
            'type': 'no_return_dates',
            'message': 'Return date column not found in data'
        })
    elif transactions_with_returns < total_transactions * 0.1:
        quality_report['warnings'].append({
            'type': 'missing_return_dates',
            'percentage': round(transactions_with_returns / total_transactions * 100, 2),
            'message': 'Very few transactions have return dates recorded'
        })
    
    # Add info about data coverage
    quality_report['info'].append({
        'type': 'temporal_coverage',
        'message': 'Data covers multiple time periods with gaps',
        'periods': ['1902', '1903-1904', '1934', '1940'],
        'gap_years': '1905-1933 (28 years)'
    })
    
    # Log summary
    logging.info(f"  Data completeness: {quality_report['summary']['transactions']['completeness_rate']}%")
    logging.info(f"  Issues found: {len(quality_report['issues'])}")
    logging.info(f"  Warnings: {len(quality_report['warnings'])}")
    
    return quality_report

def create_data_for_app():
    """
    Main function to generate the complete JSON data for the web application.
    """
    logging.info("=" * 60)
    logging.info("STRASHUN LIBRARY DATA PREPARATION v2.0")
    logging.info("=" * 60)
    
    # Setup paths
    data_path = Path('./data')
    output_path = Path('./app/library_data.json')
    
    # Verify data directory exists
    if not data_path.exists():
        logging.error(f"Data directory not found: {data_path}")
        return
    
    # Load and prepare data
    logging.info("\n1. LOADING DATA FILES")
    logging.info("-" * 40)
    
    ledgers = load_and_prepare_ledgers(data_path)
    if ledgers.empty:
        logging.error("No ledger data found. Cannot proceed.")
        return
    
    catalog = load_master_book_catalog(data_path)
    
    # Create all data components
    logging.info("\n2. PROCESSING DATA")
    logging.info("-" * 40)
    
    borrowers = create_borrowers_list(ledgers.copy(), catalog.copy())
    books = enhance_books_with_transactions(catalog.copy(), ledgers.copy())
    aggregated_data = create_aggregated_data(ledgers.copy(), catalog.copy())
    network_data = create_network_data(ledgers.copy())
    
    # Validate data quality
    logging.info("\n3. VALIDATING DATA QUALITY")
    logging.info("-" * 40)
    
    quality_report = validate_and_report_data_quality(
        ledgers, catalog, borrowers, books
    )
    
    # Prepare final data structure
    final_data = {
        'metadata': {
            'generated': datetime.now().isoformat(),
            'version': '2.0',
            'source': 'Strashun Library Historical Records',
            'quality_summary': {
                'total_transactions': quality_report['summary']['transactions']['total'],
                'total_borrowers': len(borrowers),
                'total_books': len(books),
                'completeness_rate': quality_report['summary']['transactions']['completeness_rate']
            }
        },
        'transactions': json.loads(ledgers.to_json(orient='records', date_format='iso')),
        'books': books,
        'borrowers': borrowers,
        'stats': aggregated_data,
        'network_data': network_data
    }
    
    # Write output files
    logging.info("\n4. WRITING OUTPUT FILES")
    logging.info("-" * 40)
    
    output_path.parent.mkdir(exist_ok=True, parents=True)
    
    try:
        # Write main data file
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(final_data, f, ensure_ascii=False, indent=2, default=str)
        
        file_size_mb = output_path.stat().st_size / (1024 * 1024)
        logging.info(f"  Main data file: {output_path}")
        logging.info(f"  File size: {file_size_mb:.2f} MB")
        
        # Write quality report
        quality_path = output_path.parent / 'data_quality_report.json'
        with open(quality_path, 'w', encoding='utf-8') as f:
            json.dump(quality_report, f, indent=2, default=str)
        
        logging.info(f"  Quality report: {quality_path}")
        
        # Write summary statistics
        summary_path = output_path.parent / 'data_summary.txt'
        with open(summary_path, 'w', encoding='utf-8') as f:
            f.write("STRASHUN LIBRARY DATA SUMMARY\n")
            f.write("=" * 50 + "\n\n")
            f.write(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n")
            f.write(f"Total Transactions: {quality_report['summary']['transactions']['total']:,}\n")
            f.write(f"Total Borrowers: {len(borrowers):,}\n")
            f.write(f"Total Books: {len(books):,}\n")
            f.write(f"  - From Catalog: {len(catalog):,}\n")
            f.write(f"  - Ghost Records: {len([b for b in books if b.get('is_ghost')]):,}\n")
            f.write(f"\nData Completeness: {quality_report['summary']['transactions']['completeness_rate']}%\n")
            f.write(f"\nGender Distribution:\n")
            f.write(f"  - Female: {quality_report['summary']['borrowers']['gender_distribution']['female']:,}\n")
            f.write(f"  - Male: {quality_report['summary']['borrowers']['gender_distribution']['male']:,}\n")
            f.write(f"  - Unknown: {quality_report['summary']['borrowers']['gender_distribution']['unknown']:,}\n")
            f.write(f"\nReading Patterns:\n")
            f.write(f"  - Single-book borrowers: {quality_report['summary']['borrowers']['single_book_borrowers']:,}\n")
            f.write(f"  - Power users (20+ books): {quality_report['summary']['borrowers']['power_users']:,}\n")
            f.write(f"  - Super users (50+ books): {quality_report['summary']['borrowers']['super_users']:,}\n")
        
        logging.info(f"  Summary file: {summary_path}")
        
        logging.info("\n" + "=" * 60)
        logging.info("SUCCESS! Data preparation complete.")
        logging.info("=" * 60)
        
    except Exception as e:
        logging.error(f"Failed to write output files: {e}")
        raise


if __name__ == '__main__':
    try:
        create_data_for_app()
    except Exception as e:
        logging.error(f"Fatal error: {e}")
        raise