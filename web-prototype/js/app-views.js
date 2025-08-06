// =================================================================================
// app-views.js - Views, Navigation, and UI Components
// Handles: List views, detail views, pagination, navigation
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
                // Use a timeout to ensure the view is visible before rendering
                setTimeout(() => window.StrashunViz?.NetworkView.render(), 0);
            }
            if (viewId === 'timeline' && !window.timelineChart) {
                setTimeout(() => window.StrashunViz?.TimelineView.render(), 0);
            }

            // Track last view for back navigation
            if (viewId === 'books' || viewId === 'borrowers') {
                AppState.lastView = viewId;
            }

            // Clear detail state when navigating away
            if (viewId !== 'detail') {
                AppState.currentDetail = { type: null, id: null };
            }

            URLManager.updateURL();
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

            ['book-sort', 'book-period-filter', 'book-collection-filter'].forEach(id => {
                document.getElementById(id)?.addEventListener('change', () => {
                    AppState.currentPage.books = 1;
                    this.update();
                });
            });

            document.getElementById('book-export-csv')?.addEventListener('click', () => {
                ExportManager.toCSV('books');
            });
        }

        static update() {
            Utils.showLoading('book-list');

            const searchTerm = document.getElementById('book-search')?.value || '';
            const sortOrder = document.getElementById('book-sort')?.value || 'relevance';
            const periodFilter = document.getElementById('book-period-filter')?.value || 'all';
            const collectionFilter = document.getElementById('book-collection-filter')?.value || 'all';

            const filtered = FilterManager.filterBooks(searchTerm, sortOrder, periodFilter, collectionFilter);

            const countElement = document.getElementById('book-results-count');
            if (countElement) {
                countElement.textContent = `Showing ${filtered.length.toLocaleString()} book${filtered.length !== 1 ? 's' : ''}`;
            }

            PaginationManager.render('books', filtered, searchTerm);
            URLManager.updateURL();
        }

        static showDetail(bookId) {
            // Ensure bookId is a number for Map lookup
            if (typeof bookId === 'string') bookId = parseInt(bookId, 10);
            
            const book = AppState.bookIndex.get(bookId);
            if (!book) {
                console.error('Book not found:', bookId);
                document.getElementById('detail-content').innerHTML = `<p class="text-red-500">Book with ID ${bookId} not found.</p>`;
                NavigationManager.navigateTo('detail');
                return;
            }

            AppState.currentDetail = { type: 'book', id: bookId };
            
            // CORRECTED: Use book.transactions which is now pre-populated
            const totalBorrows = book.transactions?.length || 0;
            const uniqueBorrowers = new Set(book.transactions?.map(t => t.borrower_name) || []).size;

            const content = `
                <h2 class="text-3xl mb-2 ${Utils.isRTL(book.title) ? 'rtl' : ''}">${book.title || 'Untitled'}</h2>
                <p class="text-lg mb-2 text-gray-600">${book.author || 'Unknown Author'}</p>
                
                <div class="mb-4 text-sm text-gray-600">
                    ${book.publisher ? `<p><strong>Publisher:</strong> ${book.publisher}</p>` : ''}
                    ${book.creationdate ? `<p><strong>Year:</strong> ${book.creationdate}</p>` : ''}
                    ${book.language ? `<p><strong>Language:</strong> ${book.language}</p>` : ''}
                </div>
                
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                    <div class="p-4 rounded-lg text-center bg-gray-100">
                        <span class="text-2xl font-bold">${totalBorrows.toLocaleString()}</span>
                        <span class="block text-sm">Total Borrows</span>
                    </div>
                    <div class="p-4 rounded-lg text-center bg-gray-100">
                        <span class="text-2xl font-bold">${uniqueBorrowers.toLocaleString()}</span>
                        <span class="block text-sm">Unique Borrowers</span>
                    </div>
                    ${book.link_to_nli_page ? `
                        <div class="p-4 rounded-lg text-center flex items-center justify-center bg-gray-100">
                            <a href="${book.link_to_nli_page}" target="_blank" class="text-blue-600 hover:underline">View at NLI →</a>
                        </div>` :
                        '<div class="p-4 rounded-lg text-center flex items-center justify-center bg-gray-100"><span class="text-sm text-gray-500">No NLI Link</span></div>'
                    }
                </div>
                
                <h3 class="text-xl mb-3">Borrowing History</h3>
                <div class="overflow-y-auto max-h-96 pr-2 border rounded-md">
                    ${(book.transactions && book.transactions.length > 0) ? book.transactions.map(t => `
                        <div class="p-3 border-b border-gray-200 last:border-b-0">
                            <p>Borrowed by <strong class="borrower-link cursor-pointer text-green-600 hover:underline" 
                               data-borrower-name="${t.borrower_name}">${t.borrower_name}</strong></p>
                            <p class="text-sm text-gray-500">
                                Date: ${t.date || 'N/A'}
                            </p>
                        </div>
                    `).join('') : '<p class="p-3 text-gray-500">No borrowing history available.</p>'}
                </div>`;

            document.getElementById('detail-content').innerHTML = content;
            NavigationManager.navigateTo('detail');

            document.querySelectorAll('.borrower-link').forEach(link => {
                link.addEventListener('click', () => BorrowerView.showDetail(link.dataset.borrowerName));
            });

            URLManager.updateURL();
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

            ['borrower-gender-filter', 'borrower-activity-filter'].forEach(id => {
                document.getElementById(id)?.addEventListener('change', () => {
                    AppState.currentPage.borrowers = 1;
                    this.update();
                });
            });

            document.getElementById('borrower-export-csv')?.addEventListener('click', () => {
                ExportManager.toCSV('borrowers');
            });
        }

        static update() {
            Utils.showLoading('borrower-list');

            const searchTerm = document.getElementById('borrower-search')?.value || '';
            const genderFilter = document.getElementById('borrower-gender-filter')?.value || 'all';
            const activityFilter = document.getElementById('borrower-activity-filter')?.value || 'all';

            const filtered = FilterManager.filterBorrowers(searchTerm, genderFilter, activityFilter);

            const countElement = document.getElementById('borrower-results-count');
            if (countElement) {
                countElement.textContent = `Showing ${filtered.length.toLocaleString()} borrower${filtered.length !== 1 ? 's' : ''}`;
            }

            PaginationManager.render('borrowers', filtered, searchTerm);
            URLManager.updateURL();
        }

        static showDetail(borrowerName) {
            const borrower = AppState.borrowerIndex.get(borrowerName);
            if (!borrower) {
                console.error('Borrower not found:', borrowerName);
                return;
            }

            AppState.currentDetail = { type: 'borrower', id: borrowerName };
            
            // CORRECTED: Use standardized `gender` from Python script
            const genderBadge = borrower.gender === 'W' ?
                '<span class="ml-2 px-2 py-1 text-xs rounded-full bg-pink-100 text-pink-800">Female</span>' : '';
            
            // CORRECTED: Use .transactions.length
            const totalBorrows = borrower.transactions?.length || 0;
            const uniqueBooks = new Set(borrower.transactions?.map(t => t.book_id) || []).size;

            const content = `
                <h2 class="text-3xl mb-6 ${Utils.isRTL(borrower.borrower_name) ? 'rtl' : ''}">${borrower.borrower_name}${genderBadge}</h2>
                
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                    <div class="p-4 rounded-lg text-center bg-gray-100">
                        <span class="text-2xl font-bold">${totalBorrows.toLocaleString()}</span>
                        <span class="block text-sm">Total Books Borrowed</span>
                    </div>
                    <div class="p-4 rounded-lg text-center bg-gray-100">
                        <span class="text-2xl font-bold">${uniqueBooks.toLocaleString()}</span>
                        <span class="block text-sm">Unique Books Borrowed</span>
                    </div>
                </div>
                
                <h3 class="text-xl mb-3">Books Borrowed</h3>
                <div class="overflow-y-auto max-h-96 pr-2 border rounded-md">
                    ${(borrower.transactions && totalBorrows > 0) ? borrower.transactions.map(t => {
                        const book = AppState.bookIndex.get(t.book_id);
                        return book ? `
                            <div class="p-3 border-b border-gray-200 last:border-b-0">
                                <p>
                                    <strong class="book-link cursor-pointer text-blue-600 hover:underline" 
                                            data-book-id="${book.book_id}">${book.title || 'Untitled'}</strong> 
                                    by <span class="text-gray-500">${book.author || 'Unknown'}</span>
                                </p>
                            </div>` : '';
                    }).join('') : '<p class="p-3 text-gray-500">No borrowing history available.</p>'}
                </div>`;

            document.getElementById('detail-content').innerHTML = content;
            NavigationManager.navigateTo('detail');

            document.querySelectorAll('.book-link').forEach(link => {
                link.addEventListener('click', () => BookView.showDetail(link.dataset.bookId));
            });

            URLManager.updateURL();
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
                listContainer.innerHTML = `<div class="text-center py-8"><p class="text-gray-500">No ${type} found.</p></div>`;
                document.getElementById(`${type}-pagination`).innerHTML = ''; // Clear pagination controls
                return;
            }

            listContainer.innerHTML = pageItems.map(item => isBooks ?
                this.renderBookItem(item, searchTerm) :
                this.renderBorrowerItem(item, searchTerm)
            ).join('');

            listContainer.querySelectorAll(isBooks ? '.book-item' : '.borrower-item').forEach(item => {
                item.addEventListener('click', () => {
                    isBooks ? BookView.showDetail(item.dataset.bookId) : BorrowerView.showDetail(item.dataset.borrowerName);
                });
            });

            this.renderControls(type, data);
        }

        static renderBookItem(book, searchTerm) {
            // CORRECTED: use book_id and book.transactions.length
            return `
                <div class="list-item book-item" data-book-id="${book.book_id}">
                    <h4 class="list-item-title ${Utils.isRTL(book.title) ? 'rtl' : ''}">
                        ${Utils.highlightMatch(book.title || 'Untitled', searchTerm)}
                    </h4>
                    <p class="list-item-subtitle">${Utils.highlightMatch(book.author || 'Unknown Author', searchTerm)}</p>
                    <p class="list-item-subtitle mt-1">
                        Borrowed ${book.transactions?.length || 0} time(s)
                    </p>
                </div>`;
        }

        static renderBorrowerItem(borrower, searchTerm) {
            // CORRECTED: use borrower_name and standardized gender
            return `
                <div class="list-item borrower-item" data-borrower-name="${borrower.borrower_name}">
                    <h4 class="list-item-title ${Utils.isRTL(borrower.borrower_name) ? 'rtl' : ''}">
                        ${Utils.highlightMatch(borrower.borrower_name, searchTerm)}
                        ${borrower.gender === 'W' ? '<span class="ml-2 text-xs text-pink-700">(F)</span>' : ''}
                    </h4>
                    <p class="list-item-subtitle mt-1">Borrowed ${borrower.transactions?.length || 0} book(s)</p>
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
                    <button class="pagination-btn" data-page="${currentPage - 1}" ${prevDisabled ? 'disabled' : ''}>←</button>
                    ${buttons}
                    <button class="pagination-btn" data-page="${currentPage + 1}" ${nextDisabled ? 'disabled' : ''}>→</button>
                </div>`;

            container.querySelectorAll('.pagination-btn:not([disabled])').forEach(button => {
                button.addEventListener('click', (e) => {
                    AppState.currentPage[type] = parseInt(e.currentTarget.dataset.page);
                    this.render(type, data, document.getElementById(`${type.slice(0, -1)}-search`)?.value || '');
                    document.getElementById(`${type}-list`).parentElement.scrollTop = 0;
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
                p === '...' ? `<span class="pagination-ellipsis">...</span>` : this.createPageButton(p, current)
            ).join('');
        }
    }

    // --- Detail View Export & Share Handlers ---
    document.getElementById('detail-export-json')?.addEventListener('click', () => ExportManager.toJSON());
    ['share-button', 'mobile-share-button', 'detail-share'].forEach(id => {
        document.getElementById(id)?.addEventListener('click', () => URLManager.shareCurrentView());
    });

    // Export for global access
    window.StrashunViews = {
        NavigationManager, BookView, BorrowerView, PaginationManager
    };
})();