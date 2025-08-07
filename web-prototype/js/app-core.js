// =================================================================================
// app-core.js - Core Data Management, Processing, and Utilities
// Handles: Data loading, processing, filtering, searching, exporting
// =================================================================================

// --- Global Configuration ---
const Config = {
    ITEMS_PER_PAGE: 20,
    SEARCH_DELAY: 300,
    // Fix the path for GitHub Pages
    API: { 
        dataPath: window.location.hostname === 'localhost' 
            ? './app/library_data.json'  // Local development
            : './library_data.json'      // GitHub Pages (file in root)
    }
};

// --- Global State ---
const AppState = {
    libraryData: { books: [], borrowers: [], transactions: [], stats: {}, network_data: {} },
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
            const spinner = document.getElementById('loading-spinner');
            if (spinner) spinner.innerHTML = `<p class="text-red-600 font-bold">Error: Could not load data. Please check the console.</p>`;
            return false;
        }
    }

    static processData() {
        const { libraryData, bookIndex, borrowerIndex, transactionIndex } = AppState;
        if (libraryData.transactions) libraryData.transactions.forEach(t => transactionIndex.set(t.transaction_id, t));
        if (libraryData.books) libraryData.books.forEach(book => {
            bookIndex.set(book.book_id, book);
            book.transactions = [];
        });
        if (libraryData.borrowers) libraryData.borrowers.forEach(borrower => {
            borrowerIndex.set(borrower.borrower_name, borrower);
            borrower.transactions = [];
        });
        if (libraryData.transactions) libraryData.transactions.forEach(transaction => {
            const book = bookIndex.get(transaction.book_id);
            if (book) book.transactions.push(transaction);
            const borrower = borrowerIndex.get(transaction.borrower_name);
            if (borrower) borrower.transactions.push(transaction);
        });
    }

    static updateStatistics() {
        const { libraryData } = AppState;
        const totalBooks = libraryData.books?.length || 0;
        const totalBorrowers = libraryData.borrowers?.length || 0;
        const totalTransactions = libraryData.transactions?.length || 0;
        const genderStat = libraryData.stats?.by_gender?.find(g => g.gender === 'W');
        const femaleBorrowers = genderStat ? genderStat.total_transactions : 0;
        const stats = { totalBooks, totalBorrowers, totalTransactions, femaleBorrowers };
        Object.entries(stats).forEach(([id, value]) => {
            const el = document.getElementById(`stat-${id.replace(/([A-Z])/g, "-$1").toLowerCase()}`);
            if (el) el.textContent = value.toLocaleString();
        });
        return stats;
    }
}

// --- Filter Manager ---
class FilterManager {
    static filterBooks(searchTerm = '', sortOrder = 'relevance', periodFilter = 'all', collectionFilter = 'all') {
        const { libraryData } = AppState;
        if (!libraryData.books) return [];
        let filtered = libraryData.books.filter(book => {
            const nameMatch = (book.title || `book id ${book.book_id}`).toLowerCase().includes(searchTerm.toLowerCase());
            let periodMatch = periodFilter === 'all' || book.transactions.some(t => t.year == periodFilter);
            return nameMatch && periodMatch;
        });
        if (sortOrder === 'alpha') filtered.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
        else if (sortOrder === 'popularity') filtered.sort((a, b) => b.transactions.length - a.transactions.length);
        AppState.filteredBooks = filtered;
        return filtered;
    }

    static filterBorrowers(searchTerm = '', genderFilter = 'all', activityFilter = 'all') {
        const { libraryData } = AppState;
        if (!libraryData.borrowers) return [];
        let filtered = libraryData.borrowers.filter(borrower => {
            const nameMatch = (borrower.borrower_name || '').toLowerCase().includes(searchTerm.toLowerCase());
            let genderMatch = genderFilter === 'all' || borrower.gender === genderFilter;
            let activityMatch = true;
            if (activityFilter !== 'all') {
                const count = borrower.transactions.length;
                if (activityFilter === '1-5') activityMatch = count >= 1 && count <= 5;
                else if (activityFilter === '6-20') activityMatch = count >= 6 && count <= 20;
                else if (activityFilter === '21+') activityMatch = count >= 21;
            }
            return nameMatch && genderMatch && activityMatch;
        });
        filtered.sort((a, b) => (a.borrower_name || '').localeCompare(b.borrower_name || ''));
        AppState.filteredBorrowers = filtered;
        return filtered;
    }
    
    static getTopBooks(limit = 20) {
        if (!AppState.libraryData.books) return [];
        return [...AppState.libraryData.books].sort((a, b) => b.transactions.length - a.transactions.length).slice(0, limit);
    }
    
    static getTopBorrowers(limit = 20) {
        if (!AppState.libraryData.borrowers) return [];
        return [...AppState.libraryData.borrowers].sort((a, b) => b.transactions.length - a.transactions.length).slice(0, limit);
    }
}

// --- Export Manager ---
class ExportManager {
    static toCSV(type) {
        const isBooks = type === 'books';
        const data = isBooks ? AppState.filteredBooks : AppState.filteredBorrowers;
        const headers = isBooks ?
            ['ID', 'Title', 'Author', 'Language', 'Times Borrowed'] :
            ['Name', 'Gender', 'Total Books Borrowed'];
        const rows = data.map(item => isBooks ?
            [item.book_id, `"${item.title || ''}"`, `"${item.author || ''}"`, item.language || '', item.transactions.length] :
            [`"${item.borrower_name || ''}"`, item.gender || '', item.transactions.length]
        );
        Utils.downloadFile("data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(e => e.join(','))].join('\n'), `strashun_${type}.csv`);
    }

    static toJSON() {
        const { currentDetail, bookIndex, borrowerIndex } = AppState;
        if (!currentDetail.type || !currentDetail.id) return;
        const data = currentDetail.type === 'book' ? bookIndex.get(currentDetail.id) : borrowerIndex.get(currentDetail.id);
        Utils.downloadFile("data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data, null, 2)), `strashun_${currentDetail.type}_${currentDetail.id}.json`);
    }
}

// --- URL State Manager ---
class URLManager {
    static updateURL() {
        const params = new URLSearchParams();
        const activeView = document.querySelector('.view.active')?.id?.replace('-view', '');
        if (activeView && activeView !== 'dashboard') params.set('view', activeView);
        ['book-search', 'borrower-search'].forEach(id => {
            const el = document.getElementById(id);
            if (el?.value) params.set(id, el.value);
        });
        const { currentDetail } = AppState;
        if (currentDetail.type && currentDetail.id) {
            params.set('detail-type', currentDetail.type);
            params.set('detail-id', currentDetail.id);
        }
        window.history.replaceState({}, '', params.toString() ? `${window.location.pathname}?${params}` : window.location.pathname);
    }

    static loadFromURL() {
        const params = new URLSearchParams(window.location.search);
        params.forEach((value, key) => {
            const el = document.getElementById(key);
            if (el) el.value = value;
        });
        if (params.get('detail-type') && params.get('detail-id')) {
            return { type: 'detail', detailType: params.get('detail-type'), detailId: params.get('detail-id') };
        }
        return { type: 'view', view: params.get('view') || 'dashboard' };
    }

    static shareCurrentView() {
        navigator.clipboard?.writeText(window.location.href).then(() => Utils.showNotification('Link copied!'));
    }
}

// --- Utility Functions ---
const Utils = {
    isRTL: (s) => s && /[\u0590-\u05FF\u0600-\u06FF]/.test(s),
    highlightMatch: (text, searchTerm) => {
        if (!searchTerm || !text) return text;
        return text.replace(new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'), '<mark>$1</mark>');
    },
    debounce: (func, delay) => {
        let timeout;
        return (...args) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), delay);
        };
    },
    showLoading: (containerId) => {
        const el = document.getElementById(containerId);
        if (el) el.innerHTML = `<div class="text-center p-8"><div class="spinner"></div></div>`;
    },
    downloadFile: (content, fileName) => {
        const link = document.createElement("a");
        link.href = content;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    },
    showNotification: (message) => {
        const el = document.createElement('div');
        el.className = 'notification';
        el.textContent = message;
        document.body.appendChild(el);
        setTimeout(() => el.remove(), 3000);
    }
};

// --- Global Export ---
window.StrashunCore = {
    Config, AppState, DataManager, FilterManager, ExportManager, URLManager, Utils
};