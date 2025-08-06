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
                window.StrashunViz?.NetworkView.render();
            }
            if (viewId === 'timeline' && !window.timelineChart) {
                window.StrashunViz?.TimelineView.render();
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
                    if (link.classList.contains('mobile')) {
                        const mobileMenu = document.getElementById('mobile-menu');
                        const mobileMenuButton = document.getElementById('mobile-menu-button');
                        mobileMenuButton?.setAttribute('aria-expanded', 'false');
                        mobileMenu?.classList.add('hidden');
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
            
            // Update count
            const countElement = document.getElementById('book-results-count');
            if (countElement) {
                countElement.textContent = `Showing ${filtered.length} book${filtered.length !== 1 ? 's' : ''}`;
            }
            
            PaginationManager.render('books', filtered, searchTerm);
            URLManager.updateURL();
        }
        
        static showDetail(bookId) {
            // Ensure bookId is a number
            if (typeof bookId === 'string') bookId = parseInt(bookId);
            
            const book = AppState.bookIndex.get(bookId) || 
                         AppState.libraryData.books.find(b => b.id === bookId);
            
            if (!book) {
                console.error('Book not found:', bookId);
                return;
            }
            
            AppState.currentDetail = { type: 'book', id: bookId };
            
            const content = `
                <h2 class="text-3xl mb-2 ${Utils.isRTL(book.title) ? 'rtl' : ''}">${book.title || 'Untitled'}</h2>
                <p class="text-lg mb-2" style="color: var(--text-secondary);">${book.author || 'Unknown Author'}</p>
                
                <div class="mb-4 text-sm" style="color: var(--text-secondary);">
                    ${book.publisher ? `<p><strong>Publisher:</strong> ${book.publisher}</p>` : ''}
                    ${book.year ? `<p><strong>Year:</strong> ${book.year}</p>` : ''}
                    ${book.language ? `<p><strong>Language:</strong> ${book.language}</p>` : ''}
                    ${book.isLikuteiShoshanim ? `<p><strong>Collection:</strong> Likutei Shoshanim</p>` : ''}
                </div>
                
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                    <div class="p-4 rounded-lg text-center" style="background-color: #F7FAFC;">
                        <span class="text-2xl font-bold">${book.transaction_ids.length}</span>
                        <span class="block text-sm">Total Borrows</span>
                    </div>
                    <div class="p-4 rounded-lg text-center" style="background-color: #F7FAFC;">
                        <span class="text-2xl font-bold">${book.borrowerNames.length}</span>
                        <span class="block text-sm">Unique Borrowers</span>
                    </div>
                    ${book.nli_link ? `
                        <div class="p-4 rounded-lg text-center flex items-center justify-center" style="background-color: #F7FAFC;">
                            <a href="${book.nli_link}" target="_blank" style="color: var(--accent-primary);" class="hover:underline">View at NLI →</a>
                        </div>` : 
                        '<div class="p-4 rounded-lg text-center" style="background-color: #F7FAFC;"><span class="text-sm text-gray-500">No NLI Link</span></div>'
                    }
                </div>
                
                <h3 class="text-xl mb-3">Borrowing History</h3>
                <div class="overflow-y-auto max-h-96 pr-2">
                    ${book.transactions.map(t => `
                        <div class="p-3 border-b" style="border-color: #EDF2F7;">
                            <p>Borrowed by <strong class="borrower-link cursor-pointer" style="color: var(--accent-green);" 
                               data-borrower-name="${t.borrower_name}">${t.borrower_name}</strong></p>
                            <p class="text-sm" style="color: var(--text-secondary);">
                                Date: ${t.date}${t.return_date ? ` | Returned: ${t.return_date}` : ' | Not returned'}
                            </p>
                        </div>
                    `).join('')}
                </div>`;
            
            document.getElementById('detail-content').innerHTML = content;
            NavigationManager.navigateTo('detail');
            
            // Add click handlers for borrower links
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
            
            // Update count
            const countElement = document.getElementById('borrower-results-count');
            if (countElement) {
                countElement.textContent = `Showing ${filtered.length} borrower${filtered.length !== 1 ? 's' : ''}`;
            }
            
            PaginationManager.render('borrowers', filtered, searchTerm);
            URLManager.updateURL();
        }
        
        static showDetail(borrowerName) {
            const borrower = AppState.borrowerIndex.get(borrowerName) || 
                            AppState.libraryData.borrowers.find(b => b.name === borrowerName);
            
            if (!borrower) {
                console.error('Borrower not found:', borrowerName);
                return;
            }
            
            AppState.currentDetail = { type: 'borrower', id: borrowerName };
            
            const genderBadge = borrower.gender === 'female' ? 
                '<span class="ml-2 px-2 py-1 text-xs rounded-full" style="background-color: #FED7E2; color: #97266D;">Female</span>' : '';
            
            const content = `
                <h2 class="text-3xl mb-6 ${Utils.isRTL(borrower.name) ? 'rtl' : ''}">${borrower.name}${genderBadge}</h2>
                
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                    <div class="p-4 rounded-lg text-center" style="background-color: #F7FAFC;">
                        <span class="text-2xl font-bold">${borrower.transaction_ids.length}</span>
                        <span class="block text-sm">Total Books Borrowed</span>
                    </div>
                    <div class="p-4 rounded-lg text-center" style="background-color: #F7FAFC;">
                        <span class="text-2xl font-bold">${borrower.bookIds.length}</span>
                        <span class="block text-sm">Unique Books Borrowed</span>
                    </div>
                </div>
                
                <h3 class="text-xl mb-3">Books Borrowed</h3>
                <div class="overflow-y-auto max-h-96 pr-2">
                    ${borrower.books.map(book => {
                        const bookTransactions = borrower.transactions.filter(t => t.book_id === book.id);
                        return `
                            <div class="p-3 border-b" style="border-color: #EDF2F7;">
                                <p>
                                    <strong class="book-link cursor-pointer" style="color: var(--accent-primary);" 
                                            data-book-id="${book.id}">${book.title || 'Untitled'}</strong> 
                                    by <span style="color: var(--text-secondary);">${book.author || 'Unknown'}</span>
                                </p>
                                <p class="text-sm" style="color: var(--text-secondary);">
                                    Borrowed ${bookTransactions.length} time(s): ${bookTransactions.map(t => t.date).join(', ')}
                                </p>
                            </div>`;
                    }).join('')}
                </div>`;
            
            document.getElementById('detail-content').innerHTML = content;
            NavigationManager.navigateTo('detail');
            
            // Add click handlers for book links
            document.querySelectorAll('.book-link').forEach(link => {
                link.addEventListener('click', () => BookView.showDetail(parseInt(link.dataset.bookId)));
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
                listContainer.innerHTML = `
                    <div class="text-center py-8">
                        <p style="color: var(--text-secondary);">No ${type} found matching your criteria.</p>
                    </div>`;
                return;
            }
            
            // Render items
            listContainer.innerHTML = pageItems.map(item => isBooks ? 
                this.renderBookItem(item, searchTerm) : 
                this.renderBorrowerItem(item, searchTerm)
            ).join('');
            
            // Add click handlers
            listContainer.querySelectorAll(isBooks ? '.book-item' : '.borrower-item').forEach(item => {
                item.addEventListener('click', () => {
                    if (isBooks) {
                        BookView.showDetail(parseInt(item.dataset.bookId));
                    } else {
                        BorrowerView.showDetail(item.dataset.borrowerName);
                    }
                });
            });
            
            this.renderControls(type, data);
        }
        
        static renderBookItem(book, searchTerm) {
            return `
                <div class="list-item book-item" data-book-id="${book.id}">
                    <h4 class="list-item-title ${Utils.isRTL(book.title) ? 'rtl' : ''}">
                        ${Utils.highlightMatch(book.title || 'Untitled', searchTerm)}
                    </h4>
                    <p class="list-item-subtitle">${Utils.highlightMatch(book.author || 'Unknown Author', searchTerm)}</p>
                    <p class="list-item-subtitle mt-1">
                        Borrowed ${book.transaction_ids.length} time(s)
                        ${book.isLikuteiShoshanim ? '• <span style="color: var(--accent-primary);">Likutei Shoshanim</span>' : ''}
                    </p>
                </div>`;
        }
        
        static renderBorrowerItem(borrower, searchTerm) {
            return `
                <div class="list-item borrower-item" data-borrower-name="${borrower.name}">
                    <h4 class="list-item-title ${Utils.isRTL(borrower.name) ? 'rtl' : ''}">
                        ${Utils.highlightMatch(borrower.name, searchTerm)}
                        ${borrower.gender === 'female' ? '<span class="ml-2 text-xs" style="color: #D53F8C;">(F)</span>' : ''}
                    </h4>
                    <p class="list-item-subtitle mt-1">Borrowed ${borrower.transaction_ids.length} book(s)</p>
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
            
            let buttons = '';
            const maxButtons = 7;
            
            if (totalPages <= maxButtons) {
                for (let i = 1; i <= totalPages; i++) {
                    buttons += `<button class="pagination-btn px-3 py-1 rounded-md ${i === currentPage ? 'active' : ''}" 
                               data-page="${i}">${i}</button>`;
                }
            } else {
                buttons = this.renderSmartPagination(currentPage, totalPages);
            }
            
            const prevDisabled = currentPage === 1;
            const nextDisabled = currentPage === totalPages;
            
            container.innerHTML = `
                <button class="pagination-btn px-3 py-1 rounded-md ${prevDisabled ? 'opacity-50 cursor-not-allowed' : ''}" 
                        data-page="${Math.max(1, currentPage - 1)}" ${prevDisabled ? 'disabled' : ''}>←</button>
                ${buttons}
                <button class="pagination-btn px-3 py-1 rounded-md ${nextDisabled ? 'opacity-50 cursor-not-allowed' : ''}" 
                        data-page="${Math.min(totalPages, currentPage + 1)}" ${nextDisabled ? 'disabled' : ''}>→</button>`;
            
            // Add click handlers
            container.querySelectorAll('.pagination-btn:not([disabled])').forEach(button => {
                button.addEventListener('click', () => {
                    AppState.currentPage[type] = parseInt(button.dataset.page);
                    const searchTerm = document.getElementById(`${type.slice(0, -1)}-search`)?.value || '';
                    this.render(type, data, searchTerm);
                    
                    // Scroll to top
                    const listContainer = document.getElementById(`${type}-list`);
                    if (listContainer) listContainer.scrollTop = 0;
                });
            });
        }
        
        static renderSmartPagination(current, total) {
            let buttons = `<button class="pagination-btn px-3 py-1 rounded-md ${1 === current ? 'active' : ''}" data-page="1">1</button>`;
            
            if (current > 3) buttons += `<span class="px-2">...</span>`;
            
            for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) {
                buttons += `<button class="pagination-btn px-3 py-1 rounded-md ${i === current ? 'active' : ''}" 
                           data-page="${i}">${i}</button>`;
            }
            
            if (current < total - 2) buttons += `<span class="px-2">...</span>`;
            
            buttons += `<button class="pagination-btn px-3 py-1 rounded-md ${total === current ? 'active' : ''}" 
                       data-page="${total}">${total}</button>`;
            
            return buttons;
        }
    }

    // --- Detail View Export Handler ---
    document.getElementById('detail-export-json')?.addEventListener('click', () => {
        ExportManager.toJSON();
    });

    // --- Share Button Handlers ---
    ['share-button', 'mobile-share-button', 'detail-share'].forEach(id => {
        document.getElementById(id)?.addEventListener('click', () => {
            URLManager.shareCurrentView();
        });
    });

    // Export for global access
    window.StrashunViews = {
        NavigationManager, BookView, BorrowerView, PaginationManager
    };
})();