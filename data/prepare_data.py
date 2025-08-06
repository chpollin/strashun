import pandas as pd
import numpy as np
import json
import logging
from pathlib import Path

# Setup detailed logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

def load_and_prepare_ledgers(data_path):
    """
    Loads ledgers, cleans them, and standardizes data, including NaN values.
    """
    logging.info("Loading and preparing ledger data...")
    ledger_files = list(data_path.glob('Transcription - Pilot - copy noam - Transcription - Pilot - record-*.csv'))
    if not ledger_files:
        logging.error("CRITICAL: No ledger files found.")
        return pd.DataFrame()

    all_ledgers = []
    for f in ledger_files:
        try:
            df = pd.read_csv(f)
            df.columns = df.columns.str.strip()
            year_part = f.stem.split('-')[-1].strip()
            df['year'] = year_part.split('_')[-1]
            all_ledgers.append(df)
        except Exception as e:
            logging.error(f"Error loading or processing file {f}: {e}")

    if not all_ledgers: return pd.DataFrame()

    ledgers = pd.concat(all_ledgers, ignore_index=True)
    logging.info(f"Successfully loaded and combined {len(all_ledgers)} ledger files.")
    
    # --- FIX for JSON Error: Replace all NaN values with None (which becomes null in JSON) ---
    ledgers = ledgers.replace({np.nan: None})
    logging.info("Replaced NaN values with None for JSON compatibility.")


    # --- Data Standardization ---
    if 'id' in ledgers.columns and 'book id' in ledgers.columns:
        ledgers['book_id'] = ledgers['book id'].fillna(ledgers['id'])
        ledgers.drop(columns=['id', 'book id'], inplace=True)
    elif 'id' in ledgers.columns:
        ledgers.rename(columns={'id': 'book_id'}, inplace=True)
    elif 'book id' in ledgers.columns:
        ledgers.rename(columns={'book id': 'book_id'}, inplace=True)

    rename_map = {'ID - record': 'transaction_id', "person's name": 'borrower_name'}
    ledgers.rename(columns=rename_map, inplace=True)

    if '<F>' in ledgers.columns:
        ledgers['gender'] = np.where(ledgers['<F>'].astype(str).str.strip().str.lower() == 'x', 'W', 'M')
        ledgers.drop(columns=['<F>'], inplace=True)
    else:
        ledgers['gender'] = 'Unknown'

    ledgers['is_man'] = (ledgers['gender'] == 'M').astype(int)
    ledgers['is_woman'] = (ledgers['gender'] == 'W').astype(int)

    return ledgers

def load_master_book_catalog(data_path):
    """Loads and cleans the master book catalog."""
    logging.info("Loading master book catalog...")
    catalog_files = list(data_path.glob('*unique books list.csv'))
    if not catalog_files:
        logging.error("CRITICAL: Master book catalog not found.")
        return pd.DataFrame()
    
    df = pd.read_csv(catalog_files[0])
    df.columns = df.columns.str.strip()
    
    # --- FIX for JSON Error: Replace NaN values ---
    df = df.replace({np.nan: None})

    if 'language_nli' in df.columns:
        df.rename(columns={'language_nli': 'language'}, inplace=True)
    
    return df

# (The rest of the functions: create_aggregated_data, create_network_data remain the same)
def create_aggregated_data(ledgers, catalog):
    logging.info("Creating aggregated data summaries...")
    ledgers['year'] = pd.to_numeric(ledgers['year'], errors='coerce')
    ledgers.dropna(subset=['year'], inplace=True)
    ledgers['year'] = ledgers['year'].astype(int)
    by_year = ledgers.groupby('year').agg(total_transactions=('transaction_id', 'size'),men_transactions=('is_man', 'sum'),women_transactions=('is_woman', 'sum')).reset_index()
    by_gender = ledgers.groupby('gender').agg(total_transactions=('transaction_id', 'size')).reset_index()
    if not catalog.empty and 'language' in catalog.columns and 'book_id' in ledgers.columns:
        ledgers['book_id'] = pd.to_numeric(ledgers['book_id'], errors='coerce')
        catalog['book_id'] = pd.to_numeric(catalog['book_id'], errors='coerce')
        merged_df = pd.merge(ledgers, catalog, on='book_id', how='left')
        by_language = merged_df.groupby('language').agg(total_transactions=('transaction_id', 'size')).reset_index()
    else: by_language = pd.DataFrame()
    return {'by_year': by_year.to_dict('records'),'by_gender': by_gender.to_dict('records'),'by_language': by_language.to_dict('records')}

def create_network_data(transactions_df):
    logging.info("Creating pre-aggregated network data...")
    network_data = {}
    transactions_df['year'] = pd.to_numeric(transactions_df['year'], errors='coerce')
    transactions_df.dropna(subset=['year'], inplace=True)
    transactions_df['year'] = transactions_df['year'].astype(int)
    time_periods = {'all': (transactions_df['year'].min(), transactions_df['year'].max()),'1846-1866': (1846, 1866),'1867-1881': (1867, 1881),'1882-1900': (1882, 1900),'1901-1940': (1901, 1940)}
    for period, (start_year, end_year) in time_periods.items():
        period_transactions = transactions_df[(transactions_df['year'] >= start_year) & (transactions_df['year'] <= end_year)]
        if period_transactions.empty: continue
        nodes = []
        book_nodes = pd.unique(period_transactions['book_id'].dropna())
        borrower_nodes = pd.unique(period_transactions['borrower_name'].dropna())
        for book_id in book_nodes: nodes.append({'id': f'book-{book_id}', 'label': str(book_id), 'group': 'book'})
        for borrower_name in borrower_nodes: nodes.append({'id': f'borrower-{borrower_name}', 'label': borrower_name, 'group': 'borrower'})
        edges = period_transactions.dropna(subset=['borrower_name', 'book_id']).apply(lambda row: {'from': f'borrower-{row["borrower_name"]}', 'to': f'book-{int(row["book_id"])}'}, axis=1).tolist()
        network_data[period] = {'nodes': nodes, 'edges': edges}
    return network_data

def create_data_for_app():
    """Main function to generate the final JSON data for the web app."""
    logging.info("--- Starting Data Preparation ---")
    data_path = Path('./data')
    output_path = Path('./app/library_data.json')
    
    ledgers = load_and_prepare_ledgers(data_path)
    if ledgers.empty: return

    catalog = load_master_book_catalog(data_path)
    
    aggregated_data = create_aggregated_data(ledgers.copy(), catalog.copy())
    network_data = create_network_data(ledgers.copy())
    
    # In the final conversion to dict, pandas might re-introduce NaNs if there are Nones in mixed-type columns.
    # A final pass to convert the dictionaries is the most robust solution.
    final_data = {
        'transactions': json.loads(ledgers.to_json(orient='records')),
        'books': json.loads(catalog.to_json(orient='records')) if not catalog.empty else [],
        'stats': aggregated_data,
        'network_data': network_data
    }

    output_path.parent.mkdir(exist_ok=True, parents=True)
    try:
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(final_data, f, ensure_ascii=False, indent=2)
        logging.info(f"--- SUCCESS: Application data created at: {output_path} ---")
    except Exception as e:
        logging.error(f"FATAL: Failed to write final JSON file: {e}")

if __name__ == '__main__':
    create_data_for_app()