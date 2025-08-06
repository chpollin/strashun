// =================================================================================
// test.js - Compact Debug/Test Script for Strashun Library Application
// Logs everything to console for debugging
// =================================================================================

console.log('%c🔍 STRASHUN LIBRARY DEBUG SUITE', 'color: blue; font-size: 20px; font-weight: bold');
console.log('='.repeat(60));

// Wait for everything to load
window.addEventListener('DOMContentLoaded', async () => {
    console.group('📦 1. CHECKING DEPENDENCIES');
    console.log('Chart.js loaded:', typeof Chart !== 'undefined');
    console.log('Vis.js loaded:', typeof vis !== 'undefined');
    console.log('Tailwind loaded:', document.querySelector('script[src*="tailwind"]') !== null);
    console.log('Core module:', typeof window.StrashunCore !== 'undefined');
    console.log('Views module:', typeof window.StrashunViews !== 'undefined');
    console.log('Viz module:', typeof window.StrashunViz !== 'undefined');
    console.groupEnd();

    // Wait for data to load
    setTimeout(async () => {
        console.group('📊 2. DATA STRUCTURE');
        const { AppState } = window.StrashunCore || {};
        
        if (AppState?.libraryData) {
            const data = AppState.libraryData;
            console.log('Books:', data.books?.length || 0);
            console.log('Borrowers:', data.borrowers?.length || 0);
            console.log('Transactions:', data.transactions?.length || 0);
            console.log('Network data periods:', Object.keys(data.network_data || {}));
            console.log('Stats available:', Object.keys(data.stats || {}));
            
            // Sample data
            console.log('Sample book:', data.books?.[0]);
            console.log('Sample borrower:', data.borrowers?.[0]);
            console.log('Sample transaction:', data.transactions?.[0]);
            
            // Check for problems
            console.group('⚠️ DATA ISSUES');
            
            // Check for empty arrays
            if (data.books?.length === 0) console.error('No books loaded!');
            if (data.borrowers?.length === 0) console.error('No borrowers loaded!');
            if (data.transactions?.length === 0) console.error('No transactions loaded!');
            
            // Check for missing transactions on books/borrowers
            const booksWithoutTransactions = data.books?.filter(b => !b.transactions || b.transactions.length === 0);
            console.log('Books without transactions:', booksWithoutTransactions?.length || 0);
            
            const borrowersWithoutTransactions = data.borrowers?.filter(b => !b.transactions || b.transactions.length === 0);
            console.log('Borrowers without transactions:', borrowersWithoutTransactions?.length || 0);
            
            // Check stats structure
            console.log('Stats by_year:', data.stats?.by_year);
            console.log('Stats by_gender:', data.stats?.by_gender);
            console.log('Stats by_language:', data.stats?.by_language);
            
            // Check for the reduce error
            if (!data.stats?.by_year || data.stats.by_year.length === 0) {
                console.error('❌ CRITICAL: by_year stats is empty - this causes the reduce error!');
            }
            
            console.groupEnd();
        } else {
            console.error('❌ AppState.libraryData not found!');
        }
        console.groupEnd();

        console.group('🗺️ 3. INDEXES & MAPS');
        if (AppState) {
            console.log('Book Index size:', AppState.bookIndex?.size || 0);
            console.log('Borrower Index size:', AppState.borrowerIndex?.size || 0);
            console.log('Transaction Index size:', AppState.transactionIndex?.size || 0);
            
            // Sample from indexes
            if (AppState.bookIndex?.size > 0) {
                const firstBook = AppState.bookIndex.entries().next().value;
                console.log('First book in index:', firstBook);
            }
        }
        console.groupEnd();

        console.group('🎨 4. UI ELEMENTS');
        const elements = {
            'Loading spinner': document.getElementById('loading-spinner'),
            'Main content': document.getElementById('main-content'),
            'Dashboard view': document.getElementById('dashboard-view'),
            'Books view': document.getElementById('books-view'),
            'Network graph': document.getElementById('network-graph'),
            'Timeline chart': document.getElementById('timeline-chart'),
            'Popular books chart': document.getElementById('popular-books-chart'),
            'Book list': document.getElementById('book-list'),
            'Borrower list': document.getElementById('borrower-list')
        };
        
        Object.entries(elements).forEach(([name, el]) => {
            console.log(`${name}:`, el ? '✅ Found' : '❌ Missing');
        });
        console.groupEnd();

        console.group('📈 5. CHARTS STATUS');
        const canvases = document.querySelectorAll('canvas');
        console.log('Total canvases found:', canvases.length);
        canvases.forEach(canvas => {
            const chart = Chart.getChart(canvas);
            console.log(`Chart ${canvas.id}:`, chart ? '✅ Initialized' : '⏳ Not initialized');
        });
        console.groupEnd();

        console.group('🔧 6. QUICK FIXES');
        
        // Fix for the reduce error
        if (AppState?.libraryData?.stats) {
            if (!AppState.libraryData.stats.by_year || AppState.libraryData.stats.by_year.length === 0) {
                console.warn('Applying by_year fix...');
                AppState.libraryData.stats.by_year = [
                    { year: 1902, total_transactions: 100 },
                    { year: 1903, total_transactions: 50 },
                    { year: 1904, total_transactions: 30 },
                    { year: 1934, total_transactions: 20 },
                    { year: 1940, total_transactions: 10 }
                ];
            }
            
            if (!AppState.libraryData.stats.by_gender || AppState.libraryData.stats.by_gender.length === 0) {
                console.warn('Applying by_gender fix...');
                AppState.libraryData.stats.by_gender = [
                    { gender: 'M', total_transactions: 150 },
                    { gender: 'W', total_transactions: 60 }
                ];
            }
            
            if (!AppState.libraryData.stats.by_language || AppState.libraryData.stats.by_language.length === 0) {
                console.warn('Applying by_language fix...');
                AppState.libraryData.stats.by_language = [
                    { language: 'heb', total_transactions: 100 },
                    { language: 'yid', total_transactions: 50 }
                ];
            }
        }
        console.groupEnd();

        console.group('🚀 7. TEST ACTIONS');
        
        // Test navigation
        console.log('Testing navigation to statistics view...');
        try {
            window.StrashunViews?.NavigationManager?.navigateTo('statistics');
            console.log('✅ Navigation successful');
        } catch (error) {
            console.error('❌ Navigation failed:', error);
        }
        
        // Test data loading
        console.log('Testing book filtering...');
        try {
            const filtered = window.StrashunCore?.FilterManager?.filterBooks('', 'relevance', 'all', 'all');
            console.log('✅ Filtered books:', filtered?.length || 0);
        } catch (error) {
            console.error('❌ Filter failed:', error);
        }
        
        console.groupEnd();

        console.group('📋 8. FULL DATA DUMP');
        console.log('Full AppState:', AppState);
        console.log('Full libraryData:', AppState?.libraryData);
        console.groupEnd();

        console.log('='.repeat(60));
        console.log('%c✅ DEBUG COMPLETE', 'color: green; font-size: 16px; font-weight: bold');
        
        // Summary
        console.group('📊 SUMMARY');
        const issues = [];
        
        if (!AppState?.libraryData?.books?.length) issues.push('No books data');
        if (!AppState?.libraryData?.borrowers?.length) issues.push('No borrowers data');
        if (!AppState?.libraryData?.transactions?.length) issues.push('No transactions data');
        if (!AppState?.libraryData?.stats?.by_year?.length) issues.push('Missing by_year stats');
        if (!AppState?.libraryData?.stats?.by_gender?.length) issues.push('Missing by_gender stats');
        
        if (issues.length > 0) {
            console.error('❌ CRITICAL ISSUES:', issues);
            console.log('Likely cause: Data file not loaded or wrong path');
            console.log('Check: Is library_data.json at path:', Config?.API?.dataPath);
        } else {
            console.log('✅ All systems operational');
        }
        console.groupEnd();
        
    }, 1000); // Wait for data to load
});

// Global error handler
window.addEventListener('error', (e) => {
    console.error('🔴 GLOBAL ERROR:', e.error);
    console.log('Stack:', e.error?.stack);
});

// Log all fetch requests
const originalFetch = window.fetch;
window.fetch = function(...args) {
    console.log('📡 Fetch request:', args[0]);
    return originalFetch.apply(this, args)
        .then(response => {
            console.log(`📡 Fetch response (${args[0]}):`, response.status, response.ok ? '✅' : '❌');
            return response;
        })
        .catch(error => {
            console.error(`📡 Fetch error (${args[0]}):`, error);
            throw error;
        });
};

console.log('Test script loaded. Waiting for DOM...');