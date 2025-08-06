#!/usr/bin/env python3
"""
Strashun Library - Data Preparation & Cleaning Script
=====================================================
Dieses Skript liest die rohen CSV-Dateien aus dem 'data'-Verzeichnis,
bereinigt, normalisiert und kombiniert sie und speichert das Ergebnis
als eine saubere 'library_data.json'-Datei, die für den Prototyp
und die weitere Analyse verwendet werden kann.

Der gesamte Prozess wird in 'data_preparation.log' protokolliert.
"""

import pandas as pd
import numpy as np
import json
import logging
from pathlib import Path

# --- 1. Logging Konfiguration ---
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("data_preparation.log", mode='w'), # Log-Datei
        logging.StreamHandler() # Ausgabe auch in der Konsole
    ]
)

def create_clean_library_json(data_dir='data', output_file='app/library_data.json'):
    """
    Liest rohe CSVs, bereinigt sie und erzeugt eine saubere JSON-Datei.
    """
    logging.info("--- Starte Datenaufbereitungsprozess ---")
    data_path = Path(data_dir)
    output_path = Path(output_file)
    output_path.parent.mkdir(exist_ok=True, parents=True)

    # --- 2. Lade Transaktions-Ledger (Rohdaten) ---
    try:
        ledger_files = list(data_path.glob('Transcription - Pilot*.csv')) # Breites Muster, um alle zu fassen
        if not ledger_files:
            logging.error("Keine Ledger-CSV-Dateien im 'data'-Verzeichnis gefunden. Breche ab.")
            return
        
        all_ledgers = []
        for f in ledger_files:
            df = pd.read_csv(f)
            # Spaltennamen normalisieren (Entfernt Leerzeichen)
            df.columns = df.columns.str.strip()
            all_ledgers.append(df)
        
        ledgers_df = pd.concat(all_ledgers, ignore_index=True)
        logging.info(f"{len(ledger_files)} Ledger-Dateien mit insgesamt {len(ledgers_df)} Transaktionen geladen.")
    except Exception as e:
        logging.error(f"Fehler beim Laden der Ledger-Dateien: {e}")
        return

    # --- 3. Lade Buch-Katalog (Rohdaten) ---
    try:
        catalog_file = next(data_path.glob('*unique books list.csv'), None)
        if not catalog_file:
            logging.warning("Keine 'unique books list.csv' gefunden. Sprachinformationen werden fehlen.")
            catalog_df = pd.DataFrame()
        else:
            catalog_df = pd.read_csv(catalog_file)
            catalog_df.columns = catalog_df.columns.str.strip()
            logging.info(f"Buchkatalog '{catalog_file.name}' mit {len(catalog_df)} Einträgen geladen.")
    except Exception as e:
        logging.error(f"Fehler beim Laden des Buchkatalogs: {e}")
        return

    # --- 4. Datenbereinigung und Normalisierung ---
    
    # a) ID-Spalten vereinheitlichen
    if 'id' in ledgers_df.columns and 'book id' in ledgers_df.columns:
        ledgers_df['book_id'] = ledgers_df['book id'].fillna(ledgers_df['id'])
        ledgers_df.drop(columns=['id', 'book id'], inplace=True)
    elif 'id' in ledgers_df.columns:
        ledgers_df.rename(columns={'id': 'book_id'}, inplace=True)
    elif 'book id' in ledgers_df.columns:
        ledgers_df.rename(columns={'book id': 'book_id'}, inplace=True)
    
    # b) Jahreszahlen bereinigen
    initial_rows = len(ledgers_df)
    ledgers_df['year'] = pd.to_numeric(ledgers_df['year'], errors='coerce')
    ledgers_df.dropna(subset=['year'], inplace=True)
    ledgers_df = ledgers_df[(ledgers_df['year'] >= 1800) & (ledgers_df['year'] < 2025)]
    ledgers_df['year'] = ledgers_df['year'].astype(int)
    rows_after_year_cleaning = len(ledgers_df)
    logging.info(f"{initial_rows - rows_after_year_cleaning} Zeilen wegen ungültiger/fehlender Jahreszahlen entfernt.")

    # c) Gender normalisieren
    if '<F>' in ledgers_df.columns:
        gender_map = {'x': 'W', 'X': 'W'}
        ledgers_df['gender'] = ledgers_df['<F>'].str.strip().map(gender_map).fillna('M')
        ledgers_df.drop(columns=['<F>'], inplace=True)
        logging.info("Gender-Spalte aus '<F>' erstellt. 'x' -> 'W', Rest -> 'M'.")
    else:
        # Falls es eine andere Gender-Spalte gibt, könnte hier die Logik angepasst werden.
        logging.warning("Keine explizite Gender-Spalte ('<F>') gefunden.")
        ledgers_df['gender'] = 'U' # Unbekannt als Standard

    # d) Andere Spalten umbenennen
    rename_map = {'ID - record': 'transaction_id', "person's name": 'borrower_name'}
    ledgers_df.rename(columns=rename_map, inplace=True)

    # --- 5. Daten zusammenführen ---
    if not catalog_df.empty:
        # Stelle sicher, dass die 'book_id' Spalten den gleichen Typ haben
        ledgers_df['book_id'] = pd.to_numeric(ledgers_df['book_id'], errors='coerce')
        catalog_df.rename(columns={'id': 'book_id'}, inplace=True)
        catalog_df['book_id'] = pd.to_numeric(catalog_df['book_id'], errors='coerce')
        
        final_df = pd.merge(ledgers_df, catalog_df, on='book_id', how='left')
        logging.info("Transaktionen mit Buchkatalog zusammengeführt.")
    else:
        final_df = ledgers_df
    
    # Sprache auffüllen
    if 'language' not in final_df.columns:
        final_df['language'] = 'Unbekannt'
    else:
        missing_lang_count = final_df['language'].isna().sum()
        if missing_lang_count > 0:
            final_df['language'].fillna('Unbekannt', inplace=True)
            logging.info(f"{missing_lang_count} fehlende Sprachangaben mit 'Unbekannt' aufgefüllt.")

    # --- 6. Finale JSON-Struktur erstellen ---
    # Ersetze NaN durch None für JSON-Kompatibilität
    final_df.replace({np.nan: None, pd.NaT: None}, inplace=True)
    
    transactions_list = final_df.to_dict(orient='records')
    books_list = catalog_df.to_dict(orient='records') if not catalog_df.empty else []

    output_data = {
        'transactions': transactions_list,
        'books': books_list
    }

    # --- 7. Saubere JSON-Datei speichern ---
    try:
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(output_data, f, ensure_ascii=False, indent=2)
        logging.info(f"✓ Saubere Daten erfolgreich in '{output_path}' gespeichert.")
    except Exception as e:
        logging.error(f"Fehler beim Speichern der finalen JSON-Datei: {e}")

    logging.info("--- Datenaufbereitungsprozess abgeschlossen ---")


if __name__ == '__main__':
    create_clean_library_json()