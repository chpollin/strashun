#!/usr/bin/env python3
"""
Strashun Library - Advanced Data Diagnosis Script (Version 2.0)
================================================================
Dieses Skript führt eine tiefgehende Analyse der Bibliotheksdaten durch,
um quantitative Metriken und narrative Muster aufzudecken.

Es liest 'library_data.json' und erzeugt 'data_diagnosis_report.json'.
"""

import json
import pandas as pd
from pathlib import Path
import numpy as np

def diagnose_data(input_filename="library_data.json", output_filename="data_diagnosis_report.json", verbose=True):
    """
    Führt die Daten-Diagnose durch und speichert einen strukturierten Report.
    :param verbose: Wenn True, werden die wichtigsten Ergebnisse im Terminal ausgegeben.
    """
    print("Starte erweiterte Daten-Diagnose (v2.0)...")
    
    # Pfade und Laden (unverändert)
    data_path = Path("./")
    input_file = data_path / '..' / 'app' / input_filename
    output_file = data_path / output_filename
    
    try:
        with open(input_file, 'r', encoding='utf-8') as f: data = json.load(f)
        if verbose: print(f"✓ '{input_file}' erfolgreich geladen.")
    except Exception as e:
        print(f"❌ KRITISCHER FEHLER beim Laden: {e}")
        return

    transactions_df = pd.DataFrame(data.get('transactions', []))
    books_df = pd.DataFrame(data.get('books', []))

    if transactions_df.empty:
        print("❌ 'transactions' ist leer. Analyse wird abgebrochen.")
        return

    # === DATENBEREINIGUNG & VORVERARBEITUNG ===
    # Zeit-Filterung (wie zuvor)
    transactions_df['year_num'] = pd.to_numeric(transactions_df['year'], errors='coerce')
    transactions_df = transactions_df.dropna(subset=['year_num'])
    transactions_df = transactions_df[(transactions_df['year_num'] > 1800) & (transactions_df['year_num'] < 2100)].copy()
    transactions_df['year_num'] = transactions_df['year_num'].astype(int)

    # Merge mit Buchtiteln für Analysen
    if not books_df.empty:
        books_df['book_id'] = pd.to_numeric(books_df['book_id'], errors='coerce')
        merged_df = pd.merge(transactions_df, books_df, on='book_id', how='left')
    else:
        merged_df = transactions_df

    # === ALLGEMEINE METRIKEN & QUALITÄT (unverändert) ===
    num_transactions = len(merged_df)
    num_unique_borrowers = merged_df['borrower_name'].nunique()
    num_unique_books = merged_df['book_id'].nunique()

    # === NEU: VERTEILUNGSANALYSE (LESER & BÜCHER) ===
    borrower_activity = merged_df.dropna(subset=['borrower_name'])['borrower_name'].value_counts()
    book_popularity = merged_df.dropna(subset=['book_id'])['book_id'].value_counts()
    
    distribution_analysis = {
        "leser_aktivitaet": {
            "nur_1_buch_gelesen": int((borrower_activity == 1).sum()),
            "2_bis_5_buecher": int(((borrower_activity > 1) & (borrower_activity <= 5)).sum()),
            "6_bis_20_buecher": int(((borrower_activity > 5) & (borrower_activity <= 20)).sum()),
            "power_leser_ueber_20": int((borrower_activity > 20).sum()),
            "durchschnitt_ausleihen_pro_leser": round(borrower_activity.mean(), 2)
        },
        "buch_popularitaet": {
            "nur_1_mal_gelesen": int((book_popularity == 1).sum()),
            "2_bis_5_mal_gelesen": int(((book_popularity > 1) & (book_popularity <= 5)).sum()),
            "ueber_5_mal_gelesen": int((book_popularity > 5).sum()),
        }
    }

    # === NEU: GESCHLECHTER- & SPRACHANALYSE ===
    gender_distribution = merged_df.dropna(subset=['gender'])['gender'].value_counts().to_dict()
    language_distribution = merged_df.dropna(subset=['language'])['language'].value_counts().to_dict()
    
    demographics = {
        "geschlechterverteilung_transaktionen": {k: int(v) for k, v in gender_distribution.items()},
        "sprachenverteilung_transaktionen": {k: int(v) for k, v in language_distribution.items()}
    }

    # === ZEITLICHE VERTEILUNG & LÜCKEN (leicht angepasst) ===
    valid_years = merged_df['year_num']
    min_year, max_year = int(valid_years.min()), int(valid_years.max())
    active_years = sorted(valid_years.unique())
    
    gaps = []
    gap_year_start = 0
    for i in range(len(active_years) - 1):
        if active_years[i+1] - active_years[i] > 1:
            gaps.append({"von": int(active_years[i]), "bis": int(active_years[i+1])})
            gap_year_start = active_years[i]

    # === NEU: ANALYSE DER ZEITPERIODEN (VORHER vs. NACHHER) ===
    pre_gap_df = merged_df[merged_df['year_num'] <= gap_year_start] if gap_year_start > 0 else pd.DataFrame()
    post_gap_df = merged_df[merged_df['year_num'] > gap_year_start] if gap_year_start > 0 else pd.DataFrame()

    periods_analysis = {}
    if not pre_gap_df.empty and not post_gap_df.empty:
        pre_gap_readers = pre_gap_df['borrower_name'].nunique()
        post_gap_readers = post_gap_df['borrower_name'].nunique()
        
        # Leser-Überschneidung
        common_readers = len(set(pre_gap_df['borrower_name']) & set(post_gap_df['borrower_name']))

        periods_analysis = {
            "vor_der_luecke": {
                "zeitraum": f"{pre_gap_df['year_num'].min()}-{pre_gap_df['year_num'].max()}",
                "transaktionen": len(pre_gap_df),
                "eindeutige_leser": int(pre_gap_readers),
                "top_5_buecher": pre_gap_df['title'].value_counts().nlargest(5).to_dict() if 'title' in pre_gap_df else {}
            },
            "nach_der_luecke": {
                "zeitraum": f"{post_gap_df['year_num'].min()}-{post_gap_df['year_num'].max()}",
                "transaktionen": len(post_gap_df),
                "eindeutige_leser": int(post_gap_readers),
                "top_5_buecher": post_gap_df['title'].value_counts().nlargest(5).to_dict() if 'title' in post_gap_df else {}
            },
            "ueberschneidung": {
                "leser_in_beiden_perioden": int(common_readers),
                "anteil_ueberlebende_leser": f"{(common_readers / pre_gap_readers * 100) if pre_gap_readers > 0 else 0:.2f}%"
            }
        }

    # === NEU: COMMUNITY-INDIKATOREN ===
    readers_per_book = merged_df.dropna(subset=['book_id'])['book_id'].value_counts()
    shared_books_count = int((readers_per_book > 1).sum())
    
    community_indicators = {
        "buecher_von_mehr_als_1_person_gelesen": shared_books_count,
        "anteil_geteilter_buecher": f"{(shared_books_count / num_unique_books * 100) if num_unique_books > 0 else 0:.2f}%"
    }

    # === FINALEN REPORT ZUSAMMENSTELLEN ===
    final_report = {
        "report_metadata": {"erstellt_am": pd.Timestamp.now().isoformat(), "diagnose_skript_version": "2.0"},
        "ueberblick": {
            "anzahl_transaktionen": num_transactions,
            "anzahl_entleiher": num_unique_borrowers,
            "anzahl_buecher": num_unique_books
        },
        # NEUE SEKTIONEN
        "verteilungsanalyse": distribution_analysis,
        "demografie_und_sprache": demographics,
        "zeitperioden_analyse": periods_analysis,
        "community_indikatoren": community_indicators,
        # Alte Sektionen bleiben erhalten
        "zeitliche_verteilung": {"zeitraum_gesamt": f"{min_year}-{max_year}", "gefundene_luecken": gaps},
        "datenqualitaet": { "transactions_ohne_entleiher": int(merged_df['borrower_name'].isna().sum())} # Vereinfacht
    }
    
    # Report speichern
    output_file.parent.mkdir(exist_ok=True, parents=True)
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(final_report, f, ensure_ascii=False, indent=4)
        
    print("-" * 60)
    print("✓ Erweiterte Diagnose abgeschlossen!")
    print(f"✓ Report wurde erfolgreich in '{output_file}' gespeichert.")
    print("-" * 60)

    # === NEU: VERBOSE KONSOLENAUSGABE ===
    if verbose:
        print("\n K E R N E R K E N N T N I S S E\n" + "=" * 35)
        
        # Leser-Verteilung
        leser_verteilung = final_report['verteilungsanalyse']['leser_aktivitaet']
        print(f"👤 Leser-Analyse ({num_unique_borrowers} Personen):")
        print(f"   - {leser_verteilung['nur_1_buch_gelesen']} Personen ({leser_verteilung['nur_1_buch_gelesen']/num_unique_borrowers:.1%}) waren 'One-Hit-Wonders'.")
        print(f"   - Nur {leser_verteilung['power_leser_ueber_20']} Personen waren 'Power-Leser' (>20 Bücher).\n")

        # Perioden-Vergleich
        if periods_analysis:
            vorher = periods_analysis['vor_der_luecke']
            nachher = periods_analysis['nach_der_luecke']
            print(f"⏳ Perioden-Analyse (Die große Lücke):")
            print(f"   - Vorher  ({vorher['zeitraum']}): {vorher['transaktionen']} Ausleihen von {vorher['eindeutige_leser']} Lesern.")
            print(f"   - Nachher ({nachher['zeitraum']}):  {nachher['transaktionen']} Ausleihen von {nachher['eindeutige_leser']} Lesern.")
            print(f"   - Nur {periods_analysis['ueberschneidung']['leser_in_beiden_perioden']} Leser waren in beiden Perioden aktiv!\n")
        
        # Community
        print(f"👥 Community-Analyse:")
        print(f"   - {community_indicators['anteil_geteilter_buecher']} der Bücher wurden von mehr als einer Person gelesen.")
        print("=" * 35)

if __name__ == '__main__':
    diagnose_data()