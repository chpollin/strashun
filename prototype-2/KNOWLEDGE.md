# KNOWLEDGE.md

## Projektziel

Visualisierung und Analyse historischer Ausleihdaten der Strashun-Bibliothek (1902–1940) als exploratives Digital-Humanities-Forschungstool.

## Datenübersicht

* Ca. 5.000 Transaktionen, \~1.400 Leser, \~1.600 Bücher.
* Große Datenlücke (1905–1933).
* Hohe Sparsity (99,7 %): die meisten Leser/Bücher-Kombinationen existieren nicht.
* Problematischer Anteil an unvollständigen („Ghost Records“) und inkonsistenten Daten.

## Zielgruppe

* Historiker\:innen
* Digital-Humanities-Forscher\:innen
* Genealog\:innen
* Bibliothekar\:innen und Archivar\:innen

## Stärken des bisherigen Tools

* Intelligente Datenvorverarbeitung
* Effiziente JSON-basierte Datenstruktur
* Performance-Optimierungen (Debouncing, Pagination)
* Modularer, klar strukturierter Frontend-Code

## Schwächen und Herausforderungen

* Zu starke Fokussierung auf technische Visualisierungen ohne ausreichende analytische Tiefe
* Mangel an Nutzerforschung (echte Bedürfnisse und reale Forschungsfragen unbekannt)
* Wenig Berücksichtigung der extrem hohen Sparsity der Daten
* Historische Lücken bislang nicht angemessen integriert

## Empfohlene nächste Schritte

### 1. Data Audit

* Überprüfung der Datenqualität (Duplikate, Inkonsistenzen, Sparsity)
* Historische Ursachen der Datenlücke (1905–1933) erforschen
* Identifikation einer Kern-Community (aktive Leser und Bücher)

### 2. User Research

* Interviews mit echten Nutzer\:innen (Historiker\:innen, Digital-Humanities-Forscher\:innen)
* Sammlung konkreter Forschungsfragen und realer Nutzungsszenarien

### 3. Entwicklung eines Minimum Viable Product (MVP)

* Einfachste funktionale Version mit:

  * Durchsuchbarer Tabelle
  * Top-Listen von Büchern und Lesern
  * Hervorhebung der historischen Datenlücke

### 4. Iterative Erweiterung basierend auf Nutzerfeedback

* Einführung minimaler, fokussierter Visualisierungen (z. B. Ego-Networks, Leserbiografien, zeitliche Vergleiche)

## Vorgeschlagene Visualisierungen (angepasst an Datenrealität)

* **Ego-Networks:** Individuelle Netzwerke (Leser ↔ Bücher)
* **Zeitscheiben-Differenz-Netzwerk:** Veränderungen zwischen früher und später Phase
* **Lesebiografie-Fingerprint:** Zeitliche Aktivitätsmuster einzelner Leser
* **Core-Periphery:** Visualisierung aktiver Kern-Leser und -Bücher

## Technische Pfade (Empfehlung)

* Einheitlicher Datenpfad für konsistente Verarbeitung:

```
projekt-root/
├── data/
│   └── prepare_data.py
├── app/
│   └── library_data.json
├── web-prototype/
│   └── data/library_data.json
```

## Fazit

* Projekt muss von der technischen Lösung zur daten- und nutzerzentrierten Entwicklung wechseln.
* Fokussierte, minimalistische Visualisierungen, die narrativ-historischen Kontext berücksichtigen, bieten höchsten Wert.
* Iterative Entwicklung mit realem Nutzerfeedback ist entscheidend für den Erfolg.


# KNOWLEDGE.md

## Zusammenfassung der Diskussion zum Strashun Library Digital Humanities Projekt

**Datum:** 6. August 2025
**Thema:** Schrittweise Analyse und Neukonzeption eines Forschungswerkzeugs für historische Ausleihdaten (Strashun-Bibliothek, Vilna, 1902–1940)

---

## 1. Ausgangspunkt und Ziel

* Projekt umfasst historische Ausleihtransaktionen (\~5.310), Nutzer (\~1.588), Bücher (\~1.261).
* Ziel: Explorative Visualisierung (nach Card, Mackinlay & Shneiderman).

---

## 2. Schlüsselprobleme in den Daten

* **Sparsity**:

  * Nur ca. 0,27% aller möglichen Beziehungen existieren tatsächlich.
  * Mehr als 50% der Nutzer haben lediglich ein Buch ausgeliehen.
  * Wenige aktive Nutzer dominieren stark („Power-Law“-Verteilung).

* **Zeitliche Lücke** (1905–1933):

  * Essentielle historische Information, derzeit nicht visuell repräsentiert.
  * Abwesenheit von Daten als narratives Element begreifen.

* **Datenqualität**:

  * \~21% der Transaktionen besitzen unvollständige Metadaten („Ghost Records“).
  * Inkonsistente Angaben zu Anzahl Transaktionen, Büchern, Entleihern in Dokumentation.

---

## 3. Kritik an initialer Visualisierungsidee

* Anfangs komplexe Visualisierungskonzepte vorgeschlagen (Heatmap, Bipartite-Netzwerke, Timeline-Streamgraph).
* Unzureichende Berücksichtigung tatsächlicher Dateneigenschaften (Sparsity, Lücken).
* Aggregation entfernt den Bezug zur individuellen Nutzer- und Buchgeschichte.

---

## 4. Gewonnene Meta-Erkenntnisse

* **„Data First“-Prinzip**:

  * Visualisierung darf erst entstehen, nachdem Daten gründlich verstanden wurden (Data Audit).

* **Realitätsprüfung („Reality Check“)**:

  * Praktische Datenanalyse muss komplexen Konzepten vorangestellt sein.
  * Einfache Kennzahlen (Median, Häufigkeit, Verteilung) oft entscheidender als aufwendige visuelle Darstellungen.

* **Wert der Einfachheit**:

  * Nicht die komplexeste Visualisierung, sondern die zugänglichste und einfachste Lösung bringt oft den größten Forschungsnutzen.
  * "Minimum Viable Insight"-Tool wichtiger als „perfekte“ Visualisierung.

* **Absenz als Information**:

  * Datenlücken sind selbst wichtige historische Hinweise.
  * Tools müssen narrative Funktionen haben, um diese Absenz zu kommunizieren.

---

## 5. Empfohlene Visualisierungsansätze

* **Ego-Networks**:

  * Kleine, verständliche Netzwerke um einzelne Nutzer/Bücher.
  * Vermeidung globaler Netzwerke (unübersichtlich).

* **„Fingerprint“-Timelines (Lesebiografien)**:

  * Individuelle Ausleihverhalten über Zeit visuell darstellen.

* **Core-Periphery Modell**:

  * Fokus auf zentrale, aktive Nutzer, sekundär auf gelegentliche Leser.

* **Aggregierte Archetypen statt Individuen**:

  * Sinnvolle Kategorien definieren („Talmud-Gelehrte“, „Roman-Leser“, „Einmal-Leser“).

* **Progressive Disclosure** („Stufenweise Offenlegung“):

  * Beginnen mit minimaler Darstellung (z. B. Tabelle), schrittweise Visualisierung hinzufügen.

---

## 6. Vorgeschlagener Implementierungsplan (Kurzfassung)

* **Phase 1 (Data Reality Check)**:

  * Kritische Analysen zur Datenqualität, Sparsity, Zeitlücken durchführen (Python-Diagnose-Skript).

* **Phase 2 (Minimum Viable Product)**:

  * Einfacher, funktionaler Prototyp („ehrliches Dashboard“).
  * Suche, einfache Top-Listen, Zeitleiste mit visualisierter Lücke.

* **Phase 3 (Iteratives Vorgehen)**:

  * Nutzerfeedback kontinuierlich integrieren.
  * Weiterentwicklung zu detaillierteren Einzelansichten (Ego-Netzwerke, Timelines, Sparklines).

---

## 7. Praktische technische Hinweise

* Klare Datenpfadstruktur definieren (keine inkonsistenten relativen Pfade).
* Keine komplexen Frameworks zu Beginn, sondern minimalistische Lösungen (HTML, JavaScript, JSON).
* Iterative Entwicklung (agil, sprints-basiert).

---

## 8. Philosophische und methodologische Leitlinien

* **„Das beste Forschungstool überbrückt die Kluft zwischen Daten und Bedeutung.“**
* **„Sophistication ≠ Insight: Einfachheit erzeugt oft mehr Erkenntnisse.“**
* **„Visualisierung an Daten anpassen, nicht umgekehrt.“**

---

## 9. Nächste konkrete Schritte

* **Sofort (Tag 1–2)**: Data Audit starten (Diagnosis-Skript).
* **Danach (Tag 3–5)**: MVP bauen und Nutzerinterviews durchführen.
* **Danach (Tag 6–10)**: Iterativ weiterentwickeln, ggf. einfache Visualisierung hinzufügen (Ego-Networks).

---

## Fazit & Empfehlung

Ein datenzentrierter, narrativer, iterativer Ansatz bietet mehr Wert als technisch beeindruckende, aber realitätsferne Visualisierungen. Ziel ist ein Tool, das Forschung nicht bloß unterstützt, sondern unmittelbar ermöglicht, indem es historische Bedeutung aus fragmentarischen Daten sichtbar macht.


Absolut. Hier ist eine umfassende Zusammenfassung des gesamten Prozesses, von der ersten Analyse bis zum aktuellen Stand und den klaren nächsten Schritten.

---

### **Gesamtzusammenfassung: Projekt Strashun-Bibliothek – Status und Ausblick**

Wir haben einen vollständigen Analyse- und Lösungszyklus durchlaufen. Ausgehend von einem unklaren Datenbestand haben wir uns systematisch zu einem tiefen Verständnis und einem konkreten Plan zur Datenaufbereitung vorgearbeitet.

#### **Phase 1: Problem-Entdeckung (Der "Reality Check")**

Wir begannen mit der Ausführung von Analyse-Skripten (`strashun_data_profiler.py`), die schnell an ihre Grenzen stießen. Diese erste Phase war von entscheidender Bedeutung, da sie mehrere kritische Probleme aufdeckte:

* **Technische Hürden:** Die Skripte brachen aufgrund von `AttributeError`- und `TypeError`-Fehlern ab, was auf grundlegende Datenprobleme hindeutete.
* **Fehlerhafte Daten:** Eine erste erfolgreiche Ausführung des Diagnose-Skripts lieferte ein absurdes Ergebnis (`"zeitraum_gesamt": "1-1902"`), was der erste Beweis für massive Qualitätsmängel in den Quelldaten war.

#### **Phase 2: Systematische Diagnose (Die Wahrheit in den Daten)**

Basierend auf Ihrem pragmatischen Projektplan haben wir ein **fortschrittliches Diagnose-Skript (`diagnosis.py`)** entwickelt. Dessen Ausführung hat die Probleme nicht nur bestätigt, sondern auch präzise quantifiziert:

* **Das narrative Potenzial wurde bestätigt:**
    * **Power-Law-Verteilung:** Wir wissen nun definitiv, dass eine kleine Kerngruppe von **21 "Power-Lesern"** einen großen Teil der Aktivität ausmacht, während **fast die Hälfte der Leser (47,5%)** nur ein einziges Buch ausgeliehen hat.
    * **Community-Struktur:** Über **42% der Bücher wurden von mehreren Personen gelesen**, was die Idee von vernetzten "Ego-Netzwerk"-Visualisierungen stark unterstützt.

* **Die Datenprobleme wurden klar benannt:**
    * **Fehlende Zeiträume:** Nur das Jahr 1902 wurde korrekt verarbeitet. Die entscheidende Periode nach der großen Lücke (1934-1940) fehlte, was tiefgreifende Analysen verhinderte.
    * **Fehlerhafte Demografie:** Die Daten zeigten eine unmögliche Verteilung von 100% männlichen Lesern und 0% Sprachinformationen, was auf inkonsistente Kodierung und lückenhafte Datenverknüpfung hindeutete.

#### **Phase 3: Gezielte Lösung (Die Daten-Aufbereitung)**

Als Antwort auf die Diagnose haben wir ein neues, robustes Python-Skript entwickelt: **`prepare_clean_data.py`**. Dieses Skript ist die Lösung für die identifizierten Probleme und bildet das Herzstück Ihrer zukünftigen Daten-Pipeline.

* **Fähigkeiten des Skripts:**
    1.  **Laden & Parsen:** Es liest alle rohen CSV-Dateien dynamisch ein.
    2.  **Bereinigen & Normalisieren:** Es korrigiert gezielt die bekannten Fehler:
        * **Jahreszahlen:** Werden in ein sauberes, numerisches Format konvertiert.
        * **Geschlecht:** Inkonsistente Angaben (`<f>`, `x`) werden auf ein Standardformat (`M`, `W`, `U`) abgebildet.
        * **Sprache:** Fehlende Angaben werden durch einen "Unbekannt"-Platzhalter ersetzt.
    3.  **Protokollieren (Logging):** Jeder einzelne Schritt der Bereinigung wird in der Datei `data_preparation.log` transparent protokolliert. Dies macht den Prozess nachvollziehbar und erleichtert die zukünftige Fehlersuche.
    4.  **Exportieren:** Das Skript erzeugt eine **einzige, saubere und zuverlässige `library_data.json`**, die als "Single Source of Truth" für alle weiteren Schritte dient.

---

### **Aktueller Status und nächste Schritte**

Wir stehen an einem entscheidenden Wendepunkt. Wir haben die Phase der unsicheren Diagnose verlassen und besitzen nun ein Werkzeug, um eine verlässliche Datengrundlage zu schaffen.

**Ihr Action Plan für heute Abend (6. August 2025):**

1.  **Datenaufbereitung ausführen:** Führen Sie das finale Skript `prepare_clean_data.py` aus.
    * **Input:** Ihre originalen, "unsauberen" CSV-Dateien im `data/`-Ordner.
    * **Output:** Eine neue, saubere `app/library_data.json` und die Log-Datei `data_preparation.log`.

2.  **Erfolg verifizieren:** Führen Sie **unmittelbar danach** Ihr Diagnose-Skript `diagnosis.py` erneut aus, welches nun automatisch die neue, saubere JSON-Datei einlesen wird.

3.  **Report prüfen:** Öffnen Sie den neu erstellten `data_diagnosis_report.json`. Erwarten Sie folgende Verbesserungen:
    * Der `zeitraum_gesamt` sollte jetzt korrekt sein (z.B. "1902-1940").
    * Die `zeitperioden_analyse` sollte nun ausgefüllt sein und den Vergleich "vorher vs. nachher" zeigen.
    * Die `demografie_und_sprache` sollte eine plausible Geschlechter- und Sprachverteilung aufweisen.

4.  **Projekt fortsetzen:** Sobald der Diagnose-Report die erfolgreiche Datenbereinigung bestätigt, haben Sie grünes Licht, um mit **Phase 1 Ihres ursprünglichen Plans fortzufahren: dem Bau des "ehrlichen Dashboards"**. Sie können dies nun mit dem Vertrauen tun, dass die zugrunde liegenden Daten die Geschichten korrekt widerspiegeln.