// =================================================================================
// app-views.js - Enhanced Views, Navigation, and UI Components
// Includes: List views, detail views with ego-network, pagination, navigation
// =================================================================================

(function() {
    'use strict';

    // Wait for core module to be available
    if (!window.StrashunCore) {
        console.error('Core module must be loaded before views module');
        return;
    }

    // Get dependencies from core
    const { Config, AppState, FilterManager, ExportManager, URLManager, Utils } = window.StrashunCore;

    // --- Navigation Manager ---
    class NavigationManager {
        static init() {
            this.setupEventListeners();
            this.setupMobileMenu();
            this.setupKeyboardShortcuts();
        }

        static navigateTo(viewId) {
            // Update view visibility
            document.querySelectorAll('.view').forEach(view => view.classList.remove('active'));
            const targetView = document.getElementById(`${viewId}-view`);
            if (targetView) targetView.classList.add('active');

            // Update navigation links
            document.querySelectorAll('.nav-link').forEach(link => {
                link.classList.toggle('active', link.dataset.view === viewId);
            });

            // Initialize views on first access
            if (viewId === 'network' && !window.networkInstance) {
                setTimeout(() => window.StrashunViz?.NetworkView.render(), 0);
            }
            if (viewId === 'timeline' && !window.timelineChart) {
                setTimeout(() => window.StrashunViz?.TimelineView.render(), 0);
            }
            if (viewId === 'statistics') {
                setTimeout(() => this.renderStatisticsView(), 0);
            }

            // Track last view for back navigation
            if (viewId === 'books' || viewId === 'borrowers') {
                AppState.lastView = viewId;
            }

            // Clear detail state when navigating away
            if (viewId !== 'detail') {
                AppState.currentDetail = { type: null, id: null };
            }

            // Update page title
            this.updatePageTitle(viewId);
            URLManager.updateURL();
        }

        static updatePageTitle(viewId) {
            const titles = {
                'dashboard': 'Dashboard',
                'books': 'Books Collection',
                'borrowers': 'Library Patrons',
                'network': 'Network Analysis',
                'timeline': 'Timeline',
                'statistics': 'Statistics',
                'detail': 'Details',
                'about': 'About'
            };
            document.title = `Strashun Library - ${titles[viewId] || 'Digital Archive'}`;
        }

        static setupEventListeners() {
            // Navigation links
            document.querySelectorAll('.nav-link').forEach(link => {
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.navigateTo(e.target.dataset.view);

                    // Close mobile menu if open
                    const mobileMenuButton = document.getElementById('mobile-menu-button');
                    const mobileMenu = document.getElementById('mobile-menu');
                    if (mobileMenu && !mobileMenu.classList.contains('hidden')) {
                        mobileMenuButton?.setAttribute('aria-expanded', 'false');
                        mobileMenu.classList.add('hidden');
                    }
                });
            });

            // Back button
            document.getElementById('back-to-list')?.addEventListener('click', () => {
                this.navigateTo(AppState.lastView);
            });

            // About link
            document.getElementById('about-link')?.addEventListener('click', (e) => {
                e.preventDefault();
                this.navigateTo('about');
            });

            // Quick stats cards navigation
            document.querySelectorAll('.quick-stat-card').forEach(card => {
                card.addEventListener('click', () => {
                    const target = card.dataset.target;
                    if (target) this.navigateTo(target);
                });
            });
        }

        static setupMobileMenu() {
            const mobileMenuButton = document.getElementById('mobile-menu-button');
            const mobileMenu = document.getElementById('mobile-menu');

            mobileMenuButton?.addEventListener('click', () => {
                const isExpanded = mobileMenuButton.getAttribute('aria-expanded') === 'true';
                mobileMenuButton.setAttribute('aria-expanded', !isExpanded);
                mobileMenu?.classList.toggle('hidden');
            });
        }

        static setupKeyboardShortcuts() {
            document.addEventListener('keydown', (e) => {
                // Alt + number for quick navigation
                if (e.altKey && !e.ctrlKey && !e.shiftKey) {
                    switch(e.key) {
                        case '1': this.navigateTo('dashboard'); break;
                        case '2': this.navigateTo('books'); break;
                        case '3': this.navigateTo('borrowers'); break;
                        case '4': this.navigateTo('network'); break;
                        case '5': this.navigateTo('timeline'); break;
                        case '6': this.navigateTo('statistics'); break;
                    }
                }
                
                // Escape to close modals
                if (e.key === 'Escape') {
                    const modal = document.getElementById('ego-network-modal');
                    if (modal && modal.style.display !== 'none') {
                        modal.style.display = 'none';
                    }
                }
            });
        }

        static renderStatisticsView() {
            const container = document.getElementById('statistics-content');
            if (!container) return;

            const { libraryData } = AppState;
            const books = libraryData.books || [];
            const borrowers = libraryData.borrowers || [];
            const transactions = libraryData.transactions || [];

            // Calculate advanced statistics
            const stats = this.calculateAdvancedStatistics(books, borrowers, transactions);

            container.innerHTML = `
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <!-- Collection Overview -->
                    <div class="card">
                        <h3 class="text-xl font-semibold mb-4">Collection Overview</h3>
                        <div class="space-y-3">
                            <div class="flex justify-between">
                                <span class="text-gray-600">Total Books:</span>
                                <span class="font-semibold">${stats.totalBooks.toLocaleString()}</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-gray-600">Books with Metadata:</span>
                                <span class="font-semibold">${stats.booksWithMetadata} (${stats.metadataPercentage}%)</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-gray-600">Ghost Records:</span>
                                <span class="font-semibold text-red-600">${stats.ghostRecords}</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-gray-600">Average Borrows per Book:</span>
                                <span class="font-semibold">${stats.avgBorrowsPerBook}</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-gray-600">Most Popular Language:</span>
                                <span class="font-semibold">${stats.mostPopularLanguage}</span>
                            </div>
                        </div>
                    </div>

                    <!-- Borrower Statistics -->
                    <div class="card">
                        <h3 class="text-xl font-semibold mb-4">Borrower Analysis</h3>
                        <div class="space-y-3">
                            <div class="flex justify-between">
                                <span class="text-gray-600">Total Borrowers:</span>
                                <span class="font-semibold">${stats.totalBorrowers.toLocaleString()}</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-gray-600">Female Borrowers:</span>
                                <span class="font-semibold">${stats.femaleBorrowers} (${stats.femalePercentage}%)</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-gray-600">Single-Book Readers:</span>
                                <span class="font-semibold">${stats.singleBookReaders} (${stats.singleBookPercentage}%)</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-gray-600">Power Readers (20+ books):</span>
                                <span class="font-semibold">${stats.powerReaders}</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-gray-600">Average Books per Reader:</span>
                                <span class="font-semibold">${stats.avgBooksPerReader}</span>
                            </div>
                        </div>
                    </div>

                    <!-- Temporal Patterns -->
                    <div class="card">
                        <h3 class="text-xl font-semibold mb-4">Temporal Patterns</h3>
                        <div class="space-y-3">
                            <div class="flex justify-between">
                                <span class="text-gray-600">Active Years:</span>
                                <span class="font-semibold">${stats.activeYears.join(', ')}</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-gray-600">Peak Year:</span>
                                <span class="font-semibold">${stats.peakYear} (${stats.peakYearTransactions} transactions)</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-gray-600">Peak Month:</span>
                                <span class="font-semibold">${stats.peakMonth}</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-gray-600">Winter Activity (Nov-Dec):</span>
                                <span class="font-semibold">${stats.winterPercentage}%</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-gray-600">Data Gap:</span>
                                <span class="font-semibold">1905-1933 (28 years)</span>
                            </div>
                        </div>
                    </div>

                    <!-- Network Metrics -->
                    <div class="card">
                        <h3 class="text-xl font-semibold mb-4">Network Metrics</h3>
                        <div class="space-y-3">
                            <div class="flex justify-between">
                                <span class="text-gray-600">Network Density:</span>
                                <span class="font-semibold">${stats.networkDensity}%</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-gray-600">Most Connected Book:</span>
                                <span class="font-semibold text-blue-600 cursor-pointer" 
                                      onclick="window.StrashunViews.BookView.showDetail(${stats.mostConnectedBook.id})">
                                    ${stats.mostConnectedBook.title}
                                </span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-gray-600">Most Active Reader:</span>
                                <span class="font-semibold text-green-600 cursor-pointer"
                                      onclick="window.StrashunViews.BorrowerView.showDetail('${stats.mostActiveReader.name}')">
                                    ${stats.mostActiveReader.name}
                                </span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-gray-600">Unique Connections:</span>
                                <span class="font-semibold">${stats.uniqueConnections.toLocaleString()}</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-gray-600">Average Degree:</span>
                                <span class="font-semibold">${stats.avgDegree}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Additional Insights -->
                <div class="card mt-6">
                    <h3 class="text-xl font-semibold mb-4">Key Insights</h3>
                    <div class="prose max-w-none">
                        <ul class="space-y-2">
                            <li>The library shows extreme seasonality with <strong>${stats.winterPercentage}%</strong> of all activity in November-December</li>
                            <li>There's a <strong>${stats.declinePercentage}% decline</strong> in activity from 1902-1904 to 1940, indicating community disruption</li>
                            <li><strong>${stats.singleBookPercentage}%</strong> of readers borrowed only one book, showing casual usage patterns</li>
                            <li>Hebrew materials dominate with <strong>${stats.hebrewPercentage}%</strong> of the collection</li>
                            <li>The most borrowed book was checked out <strong>${stats.mostBorrowedCount} times</strong></li>
                        </ul>
                    </div>
                </div>
            `;
        }

        static calculateAdvancedStatistics(books, borrowers, transactions) {
            // Basic counts
            const totalBooks = books.length;
            const totalBorrowers = borrowers.length;
            const totalTransactions = transactions.length;

            // Metadata statistics
            const booksWithMetadata = books.filter(b => b.title).length;
            const ghostRecords = transactions.filter(t => !AppState.bookIndex.has(t.book_id)).length;

            // Gender statistics
            const femaleBorrowers = borrowers.filter(b => b.gender === 'W').length;
            const femalePercentage = ((femaleBorrowers / totalBorrowers) * 100).toFixed(1);

            // Reading patterns
            const singleBookReaders = borrowers.filter(b => (b.transactions?.length || 0) === 1).length;
            const powerReaders = borrowers.filter(b => (b.transactions?.length || 0) >= 20).length;

            // Temporal analysis
            const yearCounts = {};
            const monthCounts = new Array(12).fill(0);
            transactions.forEach(t => {
                if (t.date) {
                    const date = new Date(t.date);
                    const year = date.getFullYear();
                    const month = date.getMonth();
                    yearCounts[year] = (yearCounts[year] || 0) + 1;
                    monthCounts[month]++;
                }
            });

            const activeYears = Object.keys(yearCounts).sort();
            const peakYear = Object.entries(yearCounts).sort((a, b) => b[1] - a[1])[0];
            const winterTransactions = monthCounts[10] + monthCounts[11]; // Nov + Dec
            const winterPercentage = ((winterTransactions / totalTransactions) * 100).toFixed(1);

            // Network metrics
            const uniqueConnections = transactions.length;
            const possibleConnections = totalBooks * totalBorrowers;
            const networkDensity = ((uniqueConnections / possibleConnections) * 100).toFixed(3);

            // Most connected entities
            const mostConnectedBook = books.reduce((max, book) => 
                (book.transactions?.length || 0) > (max.transactions?.length || 0) ? book : max
            );
            const mostActiveReader = borrowers.reduce((max, borrower) => 
                (borrower.transactions?.length || 0) > (max.transactions?.length || 0) ? borrower : max
            );

            // Language analysis
            const languageCounts = {};
            books.forEach(b => {
                const lang = b.language || 'unknown';
                languageCounts[lang] = (languageCounts[lang] || 0) + 1;
            });
            const mostPopularLanguage = Object.entries(languageCounts).sort((a, b) => b[1] - a[1])[0];

            // Calculate decline
            const earlyPeriodAvg = (yearCounts[1902] + yearCounts[1903] + yearCounts[1904]) / 3;
            const latePeriod = yearCounts[1940] || 0;
            const declinePercentage = (((earlyPeriodAvg - latePeriod) / earlyPeriodAvg) * 100).toFixed(1);

            return {
                totalBooks,
                totalBorrowers,
                totalTransactions,
                booksWithMetadata,
                metadataPercentage: ((booksWithMetadata / totalBooks) * 100).toFixed(1),
                ghostRecords,
                femaleBorrowers,
                femalePercentage,
                singleBookReaders,
                singleBookPercentage: ((singleBookReaders / totalBorrowers) * 100).toFixed(1),
                powerReaders,
                avgBooksPerReader: (totalTransactions / totalBorrowers).toFixed(1),
                avgBorrowsPerBook: (totalTransactions / totalBooks).toFixed(1),
                activeYears,
                peakYear: peakYear ? peakYear[0] : 'N/A',
                peakYearTransactions: peakYear ? peakYear[1] : 0,
                peakMonth: ['January', 'February', 'March', 'April', 'May', 'June', 
                           'July', 'August', 'September', 'October', 'November', 'December'][
                    monthCounts.indexOf(Math.max(...monthCounts))
                ],
                winterPercentage,
                networkDensity,
                mostConnectedBook: {
                    id: mostConnectedBook.book_id,
                    title: mostConnectedBook.title || 'Unknown',
                    connections: mostConnectedBook.transactions?.length || 0
                },
                mostActiveReader: {
                    name: mostActiveReader.borrower_name,
                    connections: mostActiveReader.transactions?.length || 0
                },
                uniqueConnections,
                avgDegree: ((uniqueConnections * 2) / (totalBooks + totalBorrowers)).toFixed(2),
                mostPopularLanguage: mostPopularLanguage ? `${mostPopularLanguage[0]} (${mostPopularLanguage[1]} books)` : 'Unknown',
                declinePercentage,
                hebrewPercentage: ((languageCounts['heb'] || 0) / totalBooks * 100).toFixed(1),
                mostBorrowedCount: mostConnectedBook.transactions?.length || 0
            };
        }
    }

    // --- Book View Manager ---
    class BookView {
        static init() {
            const searchInput = document.getElementById('book-search');
            const debouncedUpdate = Utils.debounce(() => {
                AppState.currentPage.books = 1;
                this.update();
            }, Config.SEARCH_DELAY);

            searchInput?.addEventListener('input', debouncedUpdate);

            ['book-sort', 'book-period-filter', 'book-collection-filter', 'book-language-filter'].forEach(id => {
                document.getElementById(id)?.addEventListener('change', () => {
                    AppState.currentPage.books = 1;
                    this.update();
                });
            });

            document.getElementById('book-export-csv')?.addEventListener('click', () => {
                ExportManager.toCSV('books');
            });

            document.getElementById('book-clear-filters')?.addEventListener('click', () => {
                document.getElementById('book-search').value = '';
                document.getElementById('book-sort').value = 'relevance';
                document.getElementById('book-period-filter').value = 'all';
                document.getElementById('book-collection-filter').value = 'all';
                document.getElementById('book-language-filter').value = 'all';
                AppState.currentPage.books = 1;
                this.update();
            });
        }

        static update() {
            Utils.showLoading('book-list');

            const searchTerm = document.getElementById('book-search')?.value || '';
            const sortOrder = document.getElementById('book-sort')?.value || 'relevance';
            const periodFilter = document.getElementById('book-period-filter')?.value || 'all';
            const collectionFilter = document.getElementById('book-collection-filter')?.value || 'all';
            const languageFilter = document.getElementById('book-language-filter')?.value || 'all';

            let filtered = FilterManager.filterBooks(searchTerm, sortOrder, periodFilter, collectionFilter);
            
            // Additional language filter
            if (languageFilter !== 'all') {
                filtered = filtered.filter(book => book.language === languageFilter);
            }

            const countElement = document.getElementById('book-results-count');
            if (countElement) {
                countElement.innerHTML = `
                    <span>Showing <strong>${filtered.length.toLocaleString()}</strong> book${filtered.length !== 1 ? 's' : ''}</span>
                    ${searchTerm ? `<span class="ml-2 text-sm">(searching for "${searchTerm}")</span>` : ''}
                `;
            }

            PaginationManager.render('books', filtered, searchTerm);
            URLManager.updateURL();
        }

        static showDetail(bookId) {
            if (typeof bookId === 'string') bookId = parseInt(bookId, 10);
            
            const book = AppState.bookIndex.get(bookId);
            if (!book) {
                console.error('Book not found:', bookId);
                document.getElementById('detail-content').innerHTML = `
                    <div class="text-center p-8">
                        <p class="text-red-500 text-lg">Book with ID ${bookId} not found.</p>
                        <button class="mt-4 btn btn-primary" onclick="window.StrashunViews.NavigationManager.navigateTo('books')">
                            Back to Books
                        </button>
                    </div>`;
                NavigationManager.navigateTo('detail');
                return;
            }

            AppState.currentDetail = { type: 'book', id: bookId };
            
            const totalBorrows = book.transactions?.length || 0;
            const uniqueBorrowers = new Set(book.transactions?.map(t => t.borrower_name) || []).size;
            
            // Calculate borrowing trends
            const borrowsByYear = {};
            book.transactions?.forEach(t => {
                if (t.date) {
                    const year = new Date(t.date).getFullYear();
                    borrowsByYear[year] = (borrowsByYear[year] || 0) + 1;
                }
            });

            // Find most frequent borrowers
            const borrowerFrequency = {};
            book.transactions?.forEach(t => {
                borrowerFrequency[t.borrower_name] = (borrowerFrequency[t.borrower_name] || 0) + 1;
            });
            const topBorrowers = Object.entries(borrowerFrequency)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5);

            const content = `
                <div class="mb-6">
                    <h2 class="text-3xl mb-2 ${Utils.isRTL(book.title) ? 'rtl' : ''}">${book.title || 'Untitled'}</h2>
                    <p class="text-lg mb-2 text-gray-600">${book.author || 'Unknown Author'}</p>
                    
                    <div class="flex flex-wrap gap-2 mb-4">
                        ${book.language ? `<span class="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm">Language: ${book.language}</span>` : ''}
                        ${book.publisher ? `<span class="px-2 py-1 bg-green-100 text-green-800 rounded text-sm">Publisher: ${book.publisher}</span>` : ''}
                        ${book.creationdate ? `<span class="px-2 py-1 bg-purple-100 text-purple-800 rounded text-sm">Year: ${book.creationdate}</span>` : ''}
                        ${book.subjects ? `<span class="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-sm">Subject: ${book.subjects}</span>` : ''}
                    </div>
                </div>
                
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div class="card text-center">
                        <span class="text-3xl font-bold text-blue-600">${totalBorrows.toLocaleString()}</span>
                        <span class="block text-sm text-gray-600 mt-1">Total Borrows</span>
                    </div>
                    <div class="card text-center">
                        <span class="text-3xl font-bold text-green-600">${uniqueBorrowers.toLocaleString()}</span>
                        <span class="block text-sm text-gray-600 mt-1">Unique Borrowers</span>
                    </div>
                    <div class="card text-center">
                        <span class="text-3xl font-bold text-purple-600">${(totalBorrows/uniqueBorrowers).toFixed(1)}</span>
                        <span class="block text-sm text-gray-600 mt-1">Avg Borrows/Reader</span>
                    </div>
                </div>

                <!-- Action Buttons -->
                <div class="flex flex-wrap gap-2 mb-6">
                    <button class="ego-network-btn btn btn-secondary" 
                            data-entity-type="book" 
                            data-entity-id="${bookId}">
                        <svg class="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"></path>
                        </svg>
                        Show Network View
                    </button>
                    ${book.link_to_nli_page ? `
                        <a href="${book.link_to_nli_page}" target="_blank" class="btn btn-primary">
                            <svg class="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path>
                            </svg>
                            View at NLI
                        </a>` : ''
                    }
                    <button id="detail-export-json" class="btn bg-gray-600 text-white hover:bg-gray-700">
                        <svg class="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
                        </svg>
                        Export JSON
                    </button>
                    <button id="detail-share" class="btn bg-gray-600 text-white hover:bg-gray-700">
                        <svg class="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m9.032 4.026a3 3 0 10-4.631-3.797M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                        </svg>
                        Share
                    </button>
                </div>

                <!-- Ego Network Container -->
                <div id="ego-network-container" style="display: none;" class="mb-6"></div>

                <!-- Insights Section -->
                ${topBorrowers.length > 0 ? `
                    <div class="card mb-6">
                        <h3 class="text-lg font-semibold mb-3">Top Borrowers</h3>
                        <div class="space-y-2">
                            ${topBorrowers.map(([name, count]) => `
                                <div class="flex justify-between items-center p-2 hover:bg-gray-50 rounded cursor-pointer"
                                     onclick="window.StrashunViews.BorrowerView.showDetail('${name}')">
                                    <span class="text-blue-600 hover:underline">${name}</span>
                                    <span class="text-sm text-gray-500">${count} time${count > 1 ? 's' : ''}</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}

                <!-- Borrowing History -->
                <div class="card">
                    <h3 class="text-lg font-semibold mb-3">Complete Borrowing History</h3>
                    <div class="overflow-y-auto max-h-96 pr-2">
                        ${(book.transactions && book.transactions.length > 0) ? 
                            `<div class="space-y-2">
                                ${book.transactions.map(t => `
                                    <div class="p-3 border-l-4 border-blue-400 bg-gray-50 hover:bg-gray-100 transition-colors">
                                        <div class="flex justify-between items-start">
                                            <div>
                                                <span class="font-semibold text-blue-600 cursor-pointer hover:underline" 
                                                      onclick="window.StrashunViews.BorrowerView.showDetail('${t.borrower_name}')">
                                                    ${t.borrower_name}
                                                </span>
                                                ${t.gender === 'W' ? '<span class="ml-2 text-xs px-2 py-1 bg-pink-100 text-pink-700 rounded">F</span>' : ''}
                                            </div>
                                            <span class="text-sm text-gray-500">
                                                ${t.date ? new Date(t.date).toLocaleDateString() : 'Date unknown'}
                                            </span>
                                        </div>
                                        ${t.return_date ? `
                                            <p class="text-xs text-gray-500 mt-1">
                                                Returned: ${new Date(t.return_date).toLocaleDateString()}
                                            </p>
                                        ` : ''}
                                    </div>
                                `).join('')}
                            </div>` 
                            : '<p class="text-gray-500 text-center py-8">No borrowing history available.</p>'
                        }
                    </div>
                </div>
            `;

            document.getElementById('detail-content').innerHTML = content;
            NavigationManager.navigateTo('detail');
            NavigationManager.updatePageTitle('detail');
            URLManager.updateURL();

            // Initialize ego network functionality
            if (window.StrashunViz?.EgoNetworkView) {
                window.StrashunViz.EgoNetworkView.init();
            }
        }
    }

    // --- Borrower View Manager ---
    class BorrowerView {
        static init() {
            const searchInput = document.getElementById('borrower-search');
            const debouncedUpdate = Utils.debounce(() => {
                AppState.currentPage.borrowers = 1;
                this.update();
            }, Config.SEARCH_DELAY);
            
            searchInput?.addEventListener('input', debouncedUpdate);

            ['borrower-gender-filter', 'borrower-activity-filter', 'borrower-period-filter'].forEach(id => {
                document.getElementById(id)?.addEventListener('change', () => {
                    AppState.currentPage.borrowers = 1;
                    this.update();
                });
            });

            document.getElementById('borrower-export-csv')?.addEventListener('click', () => {
                ExportManager.toCSV('borrowers');
            });

            document.getElementById('borrower-clear-filters')?.addEventListener('click', () => {
                document.getElementById('borrower-search').value = '';
                document.getElementById('borrower-gender-filter').value = 'all';
                document.getElementById('borrower-activity-filter').value = 'all';
                document.getElementById('borrower-period-filter').value = 'all';
                AppState.currentPage.borrowers = 1;
                this.update();
            });
        }

        static update() {
            Utils.showLoading('borrower-list');

            const searchTerm = document.getElementById('borrower-search')?.value || '';
            const genderFilter = document.getElementById('borrower-gender-filter')?.value || 'all';
            const activityFilter = document.getElementById('borrower-activity-filter')?.value || 'all';
            const periodFilter = document.getElementById('borrower-period-filter')?.value || 'all';

            let filtered = FilterManager.filterBorrowers(searchTerm, genderFilter, activityFilter);
            
            // Additional period filter
            if (periodFilter !== 'all') {
                filtered = filtered.filter(borrower => 
                    borrower.transactions?.some(t => {
                        if (!t.date) return false;
                        const year = new Date(t.date).getFullYear();
                        if (periodFilter === '1902') return year === 1902;
                        if (periodFilter === '1903-1904') return year === 1903 || year === 1904;
                        if (periodFilter === '1934') return year === 1934;
                        if (periodFilter === '1940') return year === 1940;
                        return false;
                    })
                );
            }

            const countElement = document.getElementById('borrower-results-count');
            if (countElement) {
                const femaleCount = filtered.filter(b => b.gender === 'W').length;
                countElement.innerHTML = `
                    <span>Showing <strong>${filtered.length.toLocaleString()}</strong> borrower${filtered.length !== 1 ? 's' : ''}</span>
                    <span class="ml-2 text-sm">(${femaleCount} female, ${filtered.length - femaleCount} male/unknown)</span>
                `;
            }

            PaginationManager.render('borrowers', filtered, searchTerm);
            URLManager.updateURL();
        }

        static showDetail(borrowerName) {
            const borrower = AppState.borrowerIndex.get(borrowerName);
            if (!borrower) {
                console.error('Borrower not found:', borrowerName);
                document.getElementById('detail-content').innerHTML = `
                    <div class="text-center p-8">
                        <p class="text-red-500 text-lg">Borrower "${borrowerName}" not found.</p>
                        <button class="mt-4 btn btn-primary" onclick="window.StrashunViews.NavigationManager.navigateTo('borrowers')">
                            Back to Borrowers
                        </button>
                    </div>`;
                NavigationManager.navigateTo('detail');
                return;
            }

            AppState.currentDetail = { type: 'borrower', id: borrowerName };
            
            const genderBadge = borrower.gender === 'W' ?
                '<span class="ml-2 px-3 py-1 text-sm rounded-full bg-pink-100 text-pink-800">Female</span>' : 
                '<span class="ml-2 px-3 py-1 text-sm rounded-full bg-blue-100 text-blue-800">Male/Unknown</span>';
            
            const totalBorrows = borrower.transactions?.length || 0;
            const uniqueBooks = new Set(borrower.transactions?.map(t => t.book_id) || []).size;
            
            // Calculate reading patterns
            const readingByYear = {};
            const bookFrequency = {};
            borrower.transactions?.forEach(t => {
                if (t.date) {
                    const year = new Date(t.date).getFullYear();
                    readingByYear[year] = (readingByYear[year] || 0) + 1;
                }
                if (t.book_id) {
                    bookFrequency[t.book_id] = (bookFrequency[t.book_id] || 0) + 1;
                }
            });

            // Find favorite books (borrowed multiple times)
            const favoriteBooks = Object.entries(bookFrequency)
                .filter(([_, count]) => count > 1)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5);

            // Calculate reading velocity
            const activeYears = Object.keys(readingByYear).length;
            const booksPerYear = activeYears > 0 ? (totalBorrows / activeYears).toFixed(1) : 0;

            const content = `
                <div class="mb-6">
                    <h2 class="text-3xl mb-4 ${Utils.isRTL(borrower.borrower_name) ? 'rtl' : ''}">
                        ${borrower.borrower_name}${genderBadge}
                    </h2>
                    
                    ${activeYears > 0 ? `
                        <div class="text-sm text-gray-600 mb-4">
                            Active: ${Object.keys(readingByYear).sort().join(', ')}
                        </div>
                    ` : ''}
                </div>
                
                <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <div class="card text-center">
                        <span class="text-3xl font-bold text-blue-600">${totalBorrows.toLocaleString()}</span>
                        <span class="block text-sm text-gray-600 mt-1">Total Transactions</span>
                    </div>
                    <div class="card text-center">
                        <span class="text-3xl font-bold text-green-600">${uniqueBooks.toLocaleString()}</span>
                        <span class="block text-sm text-gray-600 mt-1">Unique Books</span>
                    </div>
                    <div class="card text-center">
                        <span class="text-3xl font-bold text-purple-600">${booksPerYear}</span>
                        <span class="block text-sm text-gray-600 mt-1">Books/Year</span>
                    </div>
                    <div class="card text-center">
                        <span class="text-3xl font-bold text-orange-600">${(totalBorrows/uniqueBooks).toFixed(1)}</span>
                        <span class="block text-sm text-gray-600 mt-1">Avg Re-reads</span>
                    </div>
                </div>

                <!-- Action Buttons -->
                <div class="flex flex-wrap gap-2 mb-6">
                    <button class="ego-network-btn btn btn-secondary" 
                            data-entity-type="borrower" 
                            data-entity-id="${borrowerName}">
                        <svg class="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"></path>
                        </svg>
                        Show Network View
                    </button>
                    <button id="detail-export-json" class="btn bg-gray-600 text-white hover:bg-gray-700">
                        <svg class="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
                        </svg>
                        Export JSON
                    </button>
                    <button id="detail-share" class="btn bg-gray-600 text-white hover:bg-gray-700">
                        <svg class="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m9.032 4.026a3 3 0 10-4.631-3.797M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                        </svg>
                        Share
                    </button>
                </div>

                <!-- Ego Network Container -->
                <div id="ego-network-container" style="display: none;" class="mb-6"></div>

                <!-- Favorite Books Section -->
                ${favoriteBooks.length > 0 ? `
                    <div class="card mb-6">
                        <h3 class="text-lg font-semibold mb-3">Favorite Books (Borrowed Multiple Times)</h3>
                        <div class="space-y-2">
                            ${favoriteBooks.map(([bookId, count]) => {
                                const book = AppState.bookIndex.get(parseInt(bookId));
                                return book ? `
                                    <div class="flex justify-between items-center p-2 hover:bg-gray-50 rounded cursor-pointer"
                                         onclick="window.StrashunViews.BookView.showDetail(${bookId})">
                                        <span class="text-blue-600 hover:underline">
                                            ${book.title || 'Untitled'}
                                        </span>
                                        <span class="text-sm text-gray-500">Borrowed ${count} times</span>
                                    </div>
                                ` : '';
                            }).join('')}
                        </div>
                    </div>
                ` : ''}

                <!-- Reading Timeline -->
                ${Object.keys(readingByYear).length > 0 ? `
                    <div class="card mb-6">
                        <h3 class="text-lg font-semibold mb-3">Reading Activity by Year</h3>
                        <div class="space-y-2">
                            ${Object.entries(readingByYear).sort((a, b) => a[0] - b[0]).map(([year, count]) => `
                                <div class="flex items-center">
                                    <span class="w-16 text-sm text-gray-600">${year}:</span>
                                    <div class="flex-1 bg-gray-200 rounded-full h-6 ml-2">
                                        <div class="bg-blue-500 h-6 rounded-full flex items-center justify-end pr-2" 
                                             style="width: ${(count / Math.max(...Object.values(readingByYear))) * 100}%">
                                            <span class="text-xs text-white font-semibold">${count}</span>
                                        </div>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}

                <!-- Complete Borrowing History -->
                <div class="card">
                    <h3 class="text-lg font-semibold mb-3">Complete Borrowing History</h3>
                    <div class="overflow-y-auto max-h-96 pr-2">
                        ${(borrower.transactions && totalBorrows > 0) ? 
                            `<div class="space-y-2">
                                ${borrower.transactions.map(t => {
                                    const book = AppState.bookIndex.get(t.book_id);
                                    return book ? `
                                        <div class="p-3 border-l-4 border-green-400 bg-gray-50 hover:bg-gray-100 transition-colors">
                                            <div class="flex justify-between items-start">
                                                <div>
                                                    <span class="font-semibold text-blue-600 cursor-pointer hover:underline" 
                                                          onclick="window.StrashunViews.BookView.showDetail(${book.book_id})">
                                                        ${book.title || 'Untitled'}
                                                    </span>
                                                    ${book.author ? `
                                                        <span class="text-sm text-gray-500 ml-2">by ${book.author}</span>
                                                    ` : ''}
                                                </div>
                                                <span class="text-sm text-gray-500">
                                                    ${t.date ? new Date(t.date).toLocaleDateString() : 'Date unknown'}
                                                </span>
                                            </div>
                                            ${t.return_date ? `
                                                <p class="text-xs text-gray-500 mt-1">
                                                    Returned: ${new Date(t.return_date).toLocaleDateString()}
                                                </p>
                                            ` : ''}
                                        </div>
                                    ` : `
                                        <div class="p-3 border-l-4 border-red-400 bg-red-50">
                                            <span class="text-sm text-red-600">Ghost Record - Book metadata missing</span>
                                            <span class="text-xs text-gray-500 ml-2">
                                                ${t.date ? new Date(t.date).toLocaleDateString() : 'Date unknown'}
                                            </span>
                                        </div>
                                    `;
                                }).join('')}
                            </div>` 
                            : '<p class="text-gray-500 text-center py-8">No borrowing history available.</p>'
                        }
                    </div>
                </div>
            `;

            document.getElementById('detail-content').innerHTML = content;
            NavigationManager.navigateTo('detail');
            NavigationManager.updatePageTitle('detail');
            URLManager.updateURL();

            // Initialize ego network functionality
            if (window.StrashunViz?.EgoNetworkView) {
                window.StrashunViz.EgoNetworkView.init();
            }
        }
    }

    // --- Pagination Manager ---
    class PaginationManager {
        static render(type, data, searchTerm = '') {
            const isBooks = type === 'books';
            const currentPage = AppState.currentPage[type];
            const listContainer = document.getElementById(isBooks ? 'book-list' : 'borrower-list');
            if (!listContainer) return;

            const start = (currentPage - 1) * Config.ITEMS_PER_PAGE;
            const end = start + Config.ITEMS_PER_PAGE;
            const pageItems = data.slice(start, end);

            if (pageItems.length === 0) {
                listContainer.innerHTML = `
                    <div class="text-center py-12">
                        <svg class="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                        <p class="text-gray-500 text-lg">No ${type} found</p>
                        <p class="text-gray-400 text-sm mt-2">Try adjusting your search or filters</p>
                    </div>`;
                document.getElementById(`${type}-pagination`).innerHTML = '';
                return;
            }

            listContainer.innerHTML = pageItems.map(item => isBooks ?
                this.renderBookItem(item, searchTerm) :
                this.renderBorrowerItem(item, searchTerm)
            ).join('');

            listContainer.querySelectorAll(isBooks ? '.book-item' : '.borrower-item').forEach(item => {
                item.addEventListener('click', (e) => {
                    if (!e.target.closest('button')) {
                        isBooks ? 
                            BookView.showDetail(item.dataset.bookId) : 
                            BorrowerView.showDetail(item.dataset.borrowerName);
                    }
                });
            });

            this.renderControls(type, data);
        }

        static renderBookItem(book, searchTerm) {
            const popularityBadge = book.transactions?.length > 50 ? 
                '<span class="ml-2 px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded">Popular</span>' : '';
            
            return `
                <div class="list-item book-item group" data-book-id="${book.book_id}">
                    <div class="flex justify-between items-start">
                        <div class="flex-1">
                            <h4 class="list-item-title ${Utils.isRTL(book.title) ? 'rtl' : ''}">
                                ${Utils.highlightMatch(book.title || 'Untitled', searchTerm)}
                                ${popularityBadge}
                            </h4>
                            <p class="list-item-subtitle">${Utils.highlightMatch(book.author || 'Unknown Author', searchTerm)}</p>
                            <div class="flex items-center gap-4 mt-2 text-sm text-gray-500">
                                <span>📚 ${book.transactions?.length || 0} borrows</span>
                                ${book.language ? `<span>🌐 ${book.language}</span>` : ''}
                                ${book.creationdate ? `<span>📅 ${book.creationdate}</span>` : ''}
                            </div>
                        </div>
                        <button class="ego-network-btn opacity-0 group-hover:opacity-100 transition-opacity p-2 hover:bg-gray-100 rounded" 
                                data-entity-type="book" 
                                data-entity-id="${book.book_id}"
                                title="Show network">
                            <svg class="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"></path>
                            </svg>
                        </button>
                    </div>
                </div>`;
        }

        static renderBorrowerItem(borrower, searchTerm) {
            const activityLevel = borrower.transactions?.length >= 20 ? 
                '<span class="ml-2 px-2 py-1 text-xs bg-green-100 text-green-800 rounded">Power Reader</span>' :
                borrower.transactions?.length === 1 ?
                '<span class="ml-2 px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">Casual</span>' : '';
            
            return `
                <div class="list-item borrower-item group" data-borrower-name="${borrower.borrower_name}">
                    <div class="flex justify-between items-start">
                        <div class="flex-1">
                            <h4 class="list-item-title ${Utils.isRTL(borrower.borrower_name) ? 'rtl' : ''}">
                                ${Utils.highlightMatch(borrower.borrower_name, searchTerm)}
                                ${borrower.gender === 'W' ? 
                                    '<span class="ml-2 px-2 py-1 text-xs bg-pink-100 text-pink-700 rounded">F</span>' : ''}
                                ${activityLevel}
                            </h4>
                            <div class="flex items-center gap-4 mt-2 text-sm text-gray-500">
                                <span>📖 ${borrower.transactions?.length || 0} books borrowed</span>
                                <span>📚 ${new Set(borrower.transactions?.map(t => t.book_id) || []).size} unique</span>
                            </div>
                        </div>
                        <button class="ego-network-btn opacity-0 group-hover:opacity-100 transition-opacity p-2 hover:bg-gray-100 rounded" 
                                data-entity-type="borrower" 
                                data-entity-id="${borrower.borrower_name}"
                                title="Show network">
                            <svg class="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"></path>
                            </svg>
                        </button>
                    </div>
                </div>`;
        }

        static renderControls(type, data) {
            const currentPage = AppState.currentPage[type];
            const totalPages = Math.ceil(data.length / Config.ITEMS_PER_PAGE);
            const container = document.getElementById(`${type}-pagination`);

            if (!container || totalPages <= 1) {
                if (container) container.innerHTML = '';
                return;
            }

            const maxButtons = 7;
            let buttons;
            if (totalPages <= maxButtons) {
                buttons = Array.from({ length: totalPages }, (_, i) => this.createPageButton(i + 1, currentPage)).join('');
            } else {
                buttons = this.renderSmartPagination(currentPage, totalPages);
            }
            
            const prevDisabled = currentPage === 1;
            const nextDisabled = currentPage === totalPages;

            container.innerHTML = `
                <div class="flex justify-center items-center space-x-2">
                    <button class="pagination-btn" data-page="${currentPage - 1}" ${prevDisabled ? 'disabled' : ''}>
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
                        </svg>
                    </button>
                    ${buttons}
                    <button class="pagination-btn" data-page="${currentPage + 1}" ${nextDisabled ? 'disabled' : ''}>
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                        </svg>
                    </button>
                </div>
                <div class="text-center mt-2 text-sm text-gray-500">
                    Page ${currentPage} of ${totalPages} (${data.length} total items)
                </div>`;

            container.querySelectorAll('.pagination-btn:not([disabled])').forEach(button => {
                button.addEventListener('click', (e) => {
                    AppState.currentPage[type] = parseInt(e.currentTarget.dataset.page);
                    this.render(type, data, document.getElementById(`${type.slice(0, -1)}-search`)?.value || '');
                    document.getElementById(`${type}-list`).scrollTop = 0;
                });
            });
        }
        
        static createPageButton(pageNumber, currentPage) {
            const isActive = pageNumber === currentPage;
            return `<button class="pagination-btn ${isActive ? 'active' : ''}" data-page="${pageNumber}">${pageNumber}</button>`;
        }
        
        static renderSmartPagination(current, total) {
            if (total <= 7) return Array.from({length: total}, (_, i) => this.createPageButton(i + 1, current)).join('');
            
            const pages = new Set([1]);
            if (current > 3) pages.add('...');
            for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) pages.add(i);
            if (current < total - 2) pages.add('...');
            pages.add(total);

            return Array.from(pages).map(p => 
                p === '...' ? `<span class="pagination-ellipsis px-2">...</span>` : this.createPageButton(p, current)
            ).join('');
        }
    }

    // --- Detail View Export & Share Handlers ---
    document.addEventListener('DOMContentLoaded', () => {
        document.addEventListener('click', (e) => {
            if (e.target.id === 'detail-export-json' || e.target.closest('#detail-export-json')) {
                ExportManager.toJSON();
            }
            if (e.target.id === 'detail-share' || e.target.closest('#detail-share')) {
                URLManager.shareCurrentView();
            }
        });
    });

    // Export for global access
    window.StrashunViews = {
        NavigationManager, BookView, BorrowerView, PaginationManager
    };
})();