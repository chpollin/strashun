// =================================================================================
// app-core.js - Core Data Management, Processing, and Utilities
// Handles: Data loading, processing, filtering, searching, exporting
// =================================================================================

// --- Global Configuration ---
const Config = {
    ITEMS_PER_PAGE: 20,
    SEARCH_DELAY: 300,
    API: { dataPath: '../data/library_data.json' }
};

// --- Global State ---
const AppState = {
    libraryData: { books: [], borrowers: [], transactions: [] },
    filteredBooks: [],
    filteredBorrowers: [],
    bookIndex: new Map(),
    borrowerIndex: new Map(),
    transactionIndex: new Map(),
    currentPage: { books: 1, borrowers: 1 },
    currentDetail: { type: null, id: null },
    lastView: 'dashboard'
};

// --- Data Manager ---
class DataManager {
    static async loadData() {
        console.time('Total initialization');
        try {
            const response = await fetch(Config.API.dataPath);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            AppState.libraryData = await response.json();
            
            console.time('Data processing');
            this.processData();
            console.timeEnd('Data processing');
            
            this.updateStatistics();
            console.timeEnd('Total initialization');
            return true;
        } catch (error) {
            console.error("Failed to load data:", error);
            return false;
        }
    }
    
    static processData() {
        const { libraryData, bookIndex, borrowerIndex, transactionIndex } = AppState;
        
        // Build indexes for O(1) lookups
        libraryData.transactions.forEach(t => transactionIndex.set(t.transaction_id, t));
        
        libraryData.books.forEach(book => {
            bookIndex.set(book.id, book);
            book.transactions = [];
            book.borrowerNames = new Set();
            book.isLikuteiShoshanim = !!book.likutei_shoshanim_id;
        });
        
        libraryData.borrowers.forEach(borrower => {
            borrowerIndex.set(borrower.name, borrower);
            borrower.transactions = [];
            borrower.bookIds = new Set();
            borrower.books = [];
            borrower.gender = Utils.detectGender(borrower);
        });
        
        // Link relationships in single pass
        libraryData.transactions.forEach(transaction => {
            const book = bookIndex.get(transaction.book_id);
            const borrower = borrowerIndex.get(transaction.borrower_name);
            
            if (book) {
                book.transactions.push(transaction);
                book.borrowerNames.add(transaction.borrower_name);
            }
            
            if (borrower) {
                borrower.transactions.push(transaction);
                borrower.bookIds.add(transaction.book_id);
            }
        });
        
        // Convert Sets to Arrays
        libraryData.books.forEach(book => {
            book.borrowerNames = Array.from(book.borrowerNames);
        });
        
        libraryData.borrowers.forEach(borrower => {
            borrower.bookIds = Array.from(borrower.bookIds);
            borrower.books = borrower.bookIds.map(id => bookIndex.get(id)).filter(Boolean);
        });
    }
    
    static updateStatistics() {
        const { libraryData } = AppState;
        const stats = {
            totalBooks: libraryData.books.length,
            totalBorrowers: libraryData.borrowers.length,
            totalTransactions: libraryData.transactions.length,
            femaleBorrowers: libraryData.borrowers.filter(b => b.gender === 'female').length
        };
        
        Object.entries({
            'stat-total-books': stats.totalBooks,
            'stat-total-borrowers': stats.totalBorrowers,
            'stat-total-transactions': stats.totalTransactions,
            'stat-female-borrowers': stats.femaleBorrowers
        }).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) element.textContent = value.toLocaleString();
        });
        
        return stats;
    }
}

// --- Filter Manager ---
class FilterManager {
    static filterBooks(searchTerm = '', sortOrder = 'relevance', periodFilter = 'all', collectionFilter = 'all') {
        const { libraryData } = AppState;
        
        let filtered = libraryData.books.filter(book => {
            // Search filter
            const nameMatch = (book.title || `book id ${book.id}`).toLowerCase().includes(searchTerm.toLowerCase()) ||
                             (book.author || '').toLowerCase().includes(searchTerm.toLowerCase());
            
            // Period filter
            let periodMatch = true;
            if (periodFilter !== 'all') {
                periodMatch = book.transactions.some(t => {
                    const year = new Date(t.date).getFullYear();
                    if (periodFilter === '1902') return year === 1902;
                    if (periodFilter === '1903-1904') return year === 1903 || year === 1904;
                    if (periodFilter === '1934') return year === 1934;
                    if (periodFilter === '1940') return year === 1940;
                    return false;
                });
            }
            
            // Collection filter
            let collectionMatch = true;
            if (collectionFilter !== 'all') {
                collectionMatch = collectionFilter === 'likutei' ? 
                    book.isLikuteiShoshanim : !book.isLikuteiShoshanim;
            }
            
            return nameMatch && periodMatch && collectionMatch;
        });
        
        // Apply sorting
        if (sortOrder === 'alpha') {
            filtered.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
        } else if (sortOrder === 'popularity') {
            filtered.sort((a, b) => b.transaction_ids.length - a.transaction_ids.length);
        }
        
        AppState.filteredBooks = filtered;
        return filtered;
    }
    
    static filterBorrowers(searchTerm = '', genderFilter = 'all', activityFilter = 'all') {
        const { libraryData } = AppState;
        
        let filtered = libraryData.borrowers.filter(borrower => {
            const nameMatch = borrower.name.toLowerCase().includes(searchTerm.toLowerCase());
            
            let genderMatch = true;
            if (genderFilter !== 'all') {
                const borrowerGender = borrower.gender === 'female' ? 'F' : 'M';
                genderMatch = borrowerGender === genderFilter;
            }
            
            let activityMatch = true;
            if (activityFilter !== 'all') {
                const count = borrower.transaction_ids.length;
                if (activityFilter === '1-5') activityMatch = count >= 1 && count <= 5;
                else if (activityFilter === '6-20') activityMatch = count >= 6 && count <= 20;
                else if (activityFilter === '21+') activityMatch = count >= 21;
            }
            
            return nameMatch && genderMatch && activityMatch;
        });
        
        filtered.sort((a, b) => a.name.localeCompare(b.name));
        AppState.filteredBorrowers = filtered;
        return filtered;
    }
    
    static getTopBooks(limit = 20) {
        return [...AppState.libraryData.books]
            .sort((a, b) => b.transaction_ids.length - a.transaction_ids.length)
            .slice(0, limit);
    }
    
    static getTopBorrowers(limit = 20) {
        return [...AppState.libraryData.borrowers]
            .sort((a, b) => b.transaction_ids.length - a.transaction_ids.length)
            .slice(0, limit);
    }
}

// --- Export Manager ---
class ExportManager {
    static toCSV(type) {
        const isBooks = type === 'books';
        const data = isBooks ? AppState.filteredBooks : AppState.filteredBorrowers;
        
        const headers = isBooks ? 
            ['ID', 'Title', 'Author', 'Publisher', 'Year', 'Language', 'Collection', 'Times Borrowed', 'Unique Borrowers'] : 
            ['Name', 'Gender', 'Total Books Borrowed', 'Unique Books'];
        
        const rows = data.map(item => isBooks ? 
            [
                item.id, 
                `"${(item.title || '').replace(/"/g, '""')}"`, 
                `"${(item.author || '').replace(/"/g, '""')}"`,
                `"${(item.publisher || '').replace(/"/g, '""')}"`,
                item.year || '',
                item.language || '',
                item.isLikuteiShoshanim ? 'Likutei Shoshanim' : 'General',
                item.transaction_ids.length,
                item.borrowerNames.length
            ] : 
            [
                `"${item.name.replace(/"/g, '""')}"`, 
                item.gender === 'female' ? 'Female' : 'Male/Unknown',
                item.transaction_ids.length,
                item.bookIds.length
            ]
        );
        
        const csvContent = "data:text/csv;charset=utf-8," + 
            [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
        
        const timestamp = new Date().toISOString().split('T')[0];
        Utils.downloadFile(csvContent, `strashun_${type}_${timestamp}.csv`);
    }
    
    static toJSON() {
        const { currentDetail, bookIndex, borrowerIndex, libraryData } = AppState;
        if (!currentDetail.type || !currentDetail.id) return;
        
        const data = currentDetail.type === 'book' ? 
            bookIndex.get(currentDetail.id) || libraryData.books.find(b => b.id == currentDetail.id) : 
            borrowerIndex.get(currentDetail.id) || libraryData.borrowers.find(b => b.name === currentDetail.id);
        
        const enrichedData = {...data};
        if (currentDetail.type === 'book') {
            enrichedData.totalBorrows = data.transaction_ids.length;
            enrichedData.uniqueBorrowers = data.borrowerNames.length;
            enrichedData.borrowingHistory = data.transactions;
        } else {
            enrichedData.totalBooksBorrowed = data.transaction_ids.length;
            enrichedData.uniqueBooksBorrowed = data.bookIds.length;
            enrichedData.booksDetails = data.books;
        }
        
        const jsonContent = "data:text/json;charset=utf-8," + 
            encodeURIComponent(JSON.stringify(enrichedData, null, 2));
        
        const timestamp = new Date().toISOString().split('T')[0];
        const fileName = `strashun_${currentDetail.type}_${currentDetail.id.toString().replace(/[^a-z0-9]/gi, '_')}_${timestamp}.json`;
        Utils.downloadFile(jsonContent, fileName);
    }
}

// --- URL State Manager ---
class URLManager {
    static updateURL() {
        const params = new URLSearchParams();
        
        const activeView = document.querySelector('.view.active')?.id?.replace('-view', '');
        if (activeView && activeView !== 'dashboard') params.set('view', activeView);
        
        // Save filters
        ['book-search', 'book-sort', 'book-period-filter', 'book-collection-filter',
         'borrower-search', 'borrower-gender-filter', 'borrower-activity-filter'].forEach(id => {
            const element = document.getElementById(id);
            if (element?.value && element.value !== 'all' && element.value !== 'relevance' && element.value !== '') {
                params.set(id, element.value);
            }
        });
        
        // Save detail state
        const { currentDetail } = AppState;
        if (currentDetail.type && currentDetail.id) {
            params.set('detail-type', currentDetail.type);
            params.set('detail-id', currentDetail.id);
        }
        
        const newURL = params.toString() ? `${window.location.pathname}?${params}` : window.location.pathname;
        window.history.replaceState({}, '', newURL);
    }
    
    static loadFromURL() {
        const params = new URLSearchParams(window.location.search);
        
        // Restore filters
        params.forEach((value, key) => {
            const element = document.getElementById(key);
            if (element) element.value = value;
        });
        
        // Return navigation instructions
        if (params.get('detail-type') && params.get('detail-id')) {
            return {
                type: 'detail',
                detailType: params.get('detail-type'),
                detailId: params.get('detail-id')
            };
        }
        
        return { type: 'view', view: params.get('view') || 'dashboard' };
    }
    
    static shareCurrentView() {
        const currentURL = window.location.href;
        Utils.copyToClipboard(currentURL);
        Utils.showNotification('Link copied to clipboard!');
    }
}

// --- Utility Functions ---
const Utils = {
    isRTL: (s) => s && /[\u0590-\u05FF\u0600-\u06FF]/.test(s),
    
    detectGender: (borrower) => {
        if (borrower.F_flag === 'F' || borrower['<F>'] === 'F' || borrower.name.includes('(F)')) {
            return 'female';
        }
        if (borrower.name.match(/\b(Mrs?|Miss|Ms)\b/i)) {
            return 'female';
        }
        return 'unknown';
    },
    
    highlightMatch: (text, searchTerm) => {
        if (!searchTerm || !text) return text;
        const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
        return text.replace(regex, '<mark style="background-color: #FEF3C7; padding: 2px; border-radius: 2px;">$1</mark>');
    },
    
    debounce: (func, delay) => {
        let timeout;
        return (...args) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), delay);
        };
    },
    
    showLoading: (containerId) => {
        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = `
                <div class="text-center py-8">
                    <div class="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2" 
                         style="border-color: var(--accent-primary);"></div>
                    <p class="mt-4 text-sm" style="color: var(--text-secondary);">Loading...</p>
                </div>`;
        }
    },
    
    downloadFile: (content, fileName) => {
        const link = document.createElement("a");
        link.setAttribute("href", content);
        link.setAttribute("download", fileName);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    },
    
    copyToClipboard: (text) => {
        if (navigator.clipboard) {
            navigator.clipboard.writeText(text);
        } else {
            const textArea = document.createElement("textarea");
            textArea.value = text;
            textArea.style.position = "fixed";
            textArea.style.left = "-999999px";
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
        }
    },
    
    showNotification: (message) => {
        const notification = document.createElement('div');
        notification.innerHTML = message;
        notification.style.cssText = `
            position: fixed; bottom: 20px; right: 20px;
            background: var(--accent-green); color: white;
            padding: 12px 20px; border-radius: 8px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            z-index: 1000; animation: slideIn 0.3s ease-out;`;
        document.body.appendChild(notification);
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease-out';
            setTimeout(() => document.body.removeChild(notification), 300);
        }, 3000);
    }
};

// Export for use in other modules
window.StrashunCore = {
    Config, AppState, DataManager, FilterManager, 
    ExportManager, URLManager, Utils
};