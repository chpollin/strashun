// =================================================================================
// Strashun Library Performance Test Suite
// Run this in the browser console or as a separate test.js file
// =================================================================================

class PerformanceTestSuite {
    constructor() {
        this.results = [];
        this.libraryData = null;
    }

    // --- Utility Functions ---
    async measureTime(name, fn) {
        const start = performance.now();
        try {
            const result = await fn();
            const duration = performance.now() - start;
            this.results.push({
                test: name,
                duration: duration.toFixed(2),
                status: 'success',
                timestamp: new Date().toISOString()
            });
            return { duration, result };
        } catch (error) {
            const duration = performance.now() - start;
            this.results.push({
                test: name,
                duration: duration.toFixed(2),
                status: 'error',
                error: error.message,
                timestamp: new Date().toISOString()
            });
            throw error;
        }
    }

    measureMemory() {
        if (performance.memory) {
            return {
                usedJSHeapSize: (performance.memory.usedJSHeapSize / 1048576).toFixed(2) + ' MB',
                totalJSHeapSize: (performance.memory.totalJSHeapSize / 1048576).toFixed(2) + ' MB',
                jsHeapSizeLimit: (performance.memory.jsHeapSizeLimit / 1048576).toFixed(2) + ' MB'
            };
        }
        return { message: 'Memory API not available (try Chrome with --enable-precise-memory-info)' };
    }

    // --- Test Categories ---
    
    async testDataLoading() {
        console.log('\n📊 Testing Data Loading Performance...\n');
        
        // Test 1: Initial JSON load
        const loadResult = await this.measureTime('Load library_data.json', async () => {
            const response = await fetch('../data/library_data.json');
            const data = await response.json();
            this.libraryData = data;
            return {
                books: data.books.length,
                borrowers: data.borrowers.length,
                transactions: data.transactions.length
            };
        });
        console.log(`✓ Data loaded in ${loadResult.duration}ms:`, loadResult.result);

        // Test 2: Data processing simulation
        await this.measureTime('Process and enrich data', () => {
            const bookMap = new Map(this.libraryData.books.map(b => [b.id, b]));
            
            // Simulate the processData function
            this.libraryData.books.forEach(book => {
                book.transactions = book.transaction_ids.map(tid => 
                    this.libraryData.transactions.find(t => t.transaction_id === tid)
                ).filter(Boolean);
                book.borrowerNames = [...new Set(book.transactions.map(t => t.borrower_name))];
            });
            
            this.libraryData.borrowers.forEach(borrower => {
                borrower.transactions = borrower.transaction_ids.map(tid => 
                    this.libraryData.transactions.find(t => t.transaction_id === tid)
                ).filter(Boolean);
                borrower.bookIds = [...new Set(borrower.transactions.map(t => t.book_id))];
                borrower.books = borrower.bookIds.map(id => bookMap.get(id)).filter(Boolean);
            });
        });
        console.log(`✓ Data processing completed`);

        // Test 3: Memory usage after loading
        console.log('Memory usage:', this.measureMemory());
    }

    async testSearchPerformance() {
        console.log('\n🔍 Testing Search Performance...\n');
        
        if (!this.libraryData) {
            console.error('Data not loaded. Run testDataLoading() first.');
            return;
        }

        const searchTerms = ['א', 'מ', 'ש', 'book', 'the', 'abraham', 'יעקב'];
        
        for (const term of searchTerms) {
            await this.measureTime(`Search books for "${term}"`, () => {
                const results = this.libraryData.books.filter(book => 
                    (book.title || '').toLowerCase().includes(term.toLowerCase()) ||
                    (book.author || '').toLowerCase().includes(term.toLowerCase())
                );
                return results.length;
            });
        }

        // Test Fuse.js fuzzy search if available
        if (typeof Fuse !== 'undefined') {
            await this.measureTime('Initialize Fuse.js for books', () => {
                const fuse = new Fuse(this.libraryData.books, {
                    keys: ['title', 'author'],
                    threshold: 0.3
                });
                return fuse;
            });

            await this.measureTime('Fuse.js search for "library"', () => {
                const fuse = new Fuse(this.libraryData.books, {
                    keys: ['title', 'author'],
                    threshold: 0.3
                });
                return fuse.search('library').length;
            });
        }
    }

    async testFilteringPerformance() {
        console.log('\n🎯 Testing Filtering Performance...\n');
        
        if (!this.libraryData) {
            console.error('Data not loaded. Run testDataLoading() first.');
            return;
        }

        // Test complex filtering scenarios
        await this.measureTime('Filter books by period 1902', () => {
            return this.libraryData.books.filter(book => 
                book.transactions && book.transactions.some(t => {
                    const year = new Date(t.date).getFullYear();
                    return year === 1902;
                })
            ).length;
        });

        await this.measureTime('Filter borrowers by gender', () => {
            return this.libraryData.borrowers.filter(b => 
                b.gender === 'female' || b.F_flag === 'F' || b.name.includes('(F)')
            ).length;
        });

        await this.measureTime('Filter heavy readers (20+ books)', () => {
            return this.libraryData.borrowers.filter(b => 
                b.transaction_ids && b.transaction_ids.length >= 20
            ).length;
        });

        await this.measureTime('Combined filters (period + popularity)', () => {
            return this.libraryData.books.filter(book => {
                const hasCorrectPeriod = book.transactions && book.transactions.some(t => {
                    const year = new Date(t.date).getFullYear();
                    return year === 1934;
                });
                const isPopular = book.transaction_ids && book.transaction_ids.length >= 10;
                return hasCorrectPeriod && isPopular;
            }).length;
        });
    }

    async testSortingPerformance() {
        console.log('\n📈 Testing Sorting Performance...\n');
        
        if (!this.libraryData) {
            console.error('Data not loaded. Run testDataLoading() first.');
            return;
        }

        await this.measureTime('Sort books alphabetically', () => {
            const sorted = [...this.libraryData.books].sort((a, b) => 
                (a.title || '').localeCompare(b.title || '')
            );
            return sorted.length;
        });

        await this.measureTime('Sort books by popularity', () => {
            const sorted = [...this.libraryData.books].sort((a, b) => 
                (b.transaction_ids?.length || 0) - (a.transaction_ids?.length || 0)
            );
            return sorted.length;
        });

        await this.measureTime('Sort transactions by date', () => {
            const sorted = [...this.libraryData.transactions].sort((a, b) => 
                new Date(a.date) - new Date(b.date)
            );
            return sorted.length;
        });
    }

    async testPaginationPerformance() {
        console.log('\n📄 Testing Pagination Performance...\n');
        
        if (!this.libraryData) {
            console.error('Data not loaded. Run testDataLoading() first.');
            return;
        }

        const ITEMS_PER_PAGE = 20;
        const totalPages = Math.ceil(this.libraryData.books.length / ITEMS_PER_PAGE);

        await this.measureTime(`Paginate ${totalPages} pages`, () => {
            const pages = [];
            for (let i = 0; i < totalPages; i++) {
                const start = i * ITEMS_PER_PAGE;
                const end = start + ITEMS_PER_PAGE;
                pages.push(this.libraryData.books.slice(start, end));
            }
            return pages.length;
        });

        // Test rendering simulation
        await this.measureTime('Simulate rendering 20 items', () => {
            const page = this.libraryData.books.slice(0, 20);
            const html = page.map(book => `
                <div class="list-item">
                    <h4>${book.title || 'Untitled'}</h4>
                    <p>${book.author || 'Unknown'}</p>
                    <p>Borrowed ${book.transaction_ids?.length || 0} times</p>
                </div>
            `).join('');
            return html.length;
        });
    }

    async testNetworkVisualization() {
        console.log('\n🕸️ Testing Network Visualization Performance...\n');
        
        if (!this.libraryData) {
            console.error('Data not loaded. Run testDataLoading() first.');
            return;
        }

        // Test node/edge creation for different scales
        const testScales = [
            { books: 50, borrowers: 50 },
            { books: 200, borrowers: 200 },
            { books: 500, borrowers: 500 },
            { books: 1000, borrowers: 1000 }
        ];

        for (const scale of testScales) {
            await this.measureTime(`Create network (${scale.books} books, ${scale.borrowers} borrowers)`, () => {
                const books = this.libraryData.books.slice(0, scale.books);
                const borrowers = this.libraryData.borrowers.slice(0, scale.borrowers);
                
                const nodes = [
                    ...books.map(b => ({
                        id: `book-${b.id}`,
                        label: b.title || `Book ${b.id}`,
                        group: 'book'
                    })),
                    ...borrowers.map(b => ({
                        id: `borrower-${b.name}`,
                        label: b.name,
                        group: 'borrower'
                    }))
                ];
                
                const edges = [];
                const transactionLimit = Math.min(1000, this.libraryData.transactions.length);
                for (let i = 0; i < transactionLimit; i++) {
                    const t = this.libraryData.transactions[i];
                    if (books.some(b => b.id === t.book_id) && 
                        borrowers.some(b => b.name === t.borrower_name)) {
                        edges.push({
                            from: `borrower-${t.borrower_name}`,
                            to: `book-${t.book_id}`
                        });
                    }
                }
                
                return { nodes: nodes.length, edges: edges.length };
            });
        }
    }

    async testChartRendering() {
        console.log('\n📊 Testing Chart Data Preparation...\n');
        
        if (!this.libraryData) {
            console.error('Data not loaded. Run testDataLoading() first.');
            return;
        }

        await this.measureTime('Prepare top 20 books data', () => {
            const sorted = [...this.libraryData.books]
                .sort((a, b) => (b.transaction_ids?.length || 0) - (a.transaction_ids?.length || 0))
                .slice(0, 20);
            return {
                labels: sorted.map(b => b.title || `Book ${b.id}`),
                data: sorted.map(b => b.transaction_ids?.length || 0)
            };
        });

        await this.measureTime('Calculate period distribution', () => {
            const periodCounts = this.libraryData.transactions.reduce((acc, t) => {
                const year = new Date(t.date).getFullYear();
                let period = 'Unknown';
                if (year === 1902) period = '1902';
                else if (year === 1903 || year === 1904) period = '1903-1904';
                else if (year === 1934) period = '1934';
                else if (year === 1940) period = '1940';
                acc[period] = (acc[period] || 0) + 1;
                return acc;
            }, {});
            return periodCounts;
        });

        await this.measureTime('Calculate gender distribution', () => {
            return this.libraryData.borrowers.reduce((acc, b) => {
                const gender = (b.gender === 'female' || b.F_flag === 'F') ? 'Female' : 'Male/Unknown';
                acc[gender] = (acc[gender] || 0) + 1;
                return acc;
            }, {});
        });
    }

    async testWorstCaseScenarios() {
        console.log('\n⚠️ Testing Worst-Case Scenarios...\n');
        
        if (!this.libraryData) {
            console.error('Data not loaded. Run testDataLoading() first.');
            return;
        }

        // Find the borrower with most transactions
        const heaviestBorrower = this.libraryData.borrowers.reduce((max, b) => 
            (b.transaction_ids?.length || 0) > (max.transaction_ids?.length || 0) ? b : max
        );
        
        await this.measureTime(`Load heaviest borrower (${heaviestBorrower.transaction_ids.length} transactions)`, () => {
            const transactions = heaviestBorrower.transaction_ids.map(tid => 
                this.libraryData.transactions.find(t => t.transaction_id === tid)
            ).filter(Boolean);
            return transactions.length;
        });

        // Find the most borrowed book
        const heaviestBook = this.libraryData.books.reduce((max, b) => 
            (b.transaction_ids?.length || 0) > (max.transaction_ids?.length || 0) ? b : max
        );
        
        await this.measureTime(`Load most borrowed book (${heaviestBook.transaction_ids.length} transactions)`, () => {
            const transactions = heaviestBook.transaction_ids.map(tid => 
                this.libraryData.transactions.find(t => t.transaction_id === tid)
            ).filter(Boolean);
            return transactions.length;
        });

        // Test searching with Hebrew text
        await this.measureTime('Search with complex Hebrew query', () => {
            const hebrewBooks = this.libraryData.books.filter(book => 
                book.title && /[\u0590-\u05FF]/.test(book.title)
            );
            return hebrewBooks.length;
        });
    }

    generateReport() {
        console.log('\n' + '='.repeat(60));
        console.log('PERFORMANCE TEST REPORT');
        console.log('='.repeat(60));
        console.log(`Generated: ${new Date().toISOString()}\n`);

        // Group results by test category
        const categories = {};
        this.results.forEach(result => {
            const category = result.test.split(' ')[0];
            if (!categories[category]) categories[category] = [];
            categories[category].push(result);
        });

        // Calculate statistics
        const durations = this.results
            .filter(r => r.status === 'success')
            .map(r => parseFloat(r.duration));
        
        const stats = {
            total: durations.length,
            failed: this.results.filter(r => r.status === 'error').length,
            totalTime: durations.reduce((a, b) => a + b, 0).toFixed(2),
            avgTime: (durations.reduce((a, b) => a + b, 0) / durations.length).toFixed(2),
            minTime: Math.min(...durations).toFixed(2),
            maxTime: Math.max(...durations).toFixed(2)
        };

        console.log('SUMMARY STATISTICS:');
        console.log('-'.repeat(40));
        console.log(`Total Tests: ${stats.total}`);
        console.log(`Failed Tests: ${stats.failed}`);
        console.log(`Total Time: ${stats.totalTime}ms`);
        console.log(`Average Time: ${stats.avgTime}ms`);
        console.log(`Min Time: ${stats.minTime}ms`);
        console.log(`Max Time: ${stats.maxTime}ms`);

        console.log('\nPERFORMANCE THRESHOLDS:');
        console.log('-'.repeat(40));
        
        // Check against requirements
        const thresholds = {
            'Load library_data.json': 5000,  // NFR-001: Initial load < 5s
            'Search': 1000,  // NFR-002: Search results < 1s
            'Create network': 2000  // NFR-003: Smooth network interaction
        };

        this.results.forEach(result => {
            if (result.status === 'success') {
                for (const [key, threshold] of Object.entries(thresholds)) {
                    if (result.test.includes(key)) {
                        const status = parseFloat(result.duration) <= threshold ? '✅' : '❌';
                        console.log(`${status} ${result.test}: ${result.duration}ms (threshold: ${threshold}ms)`);
                    }
                }
            }
        });

        console.log('\nDETAILED RESULTS:');
        console.log('-'.repeat(40));
        
        // Sort by duration (slowest first)
        const sortedResults = [...this.results]
            .filter(r => r.status === 'success')
            .sort((a, b) => parseFloat(b.duration) - parseFloat(a.duration));

        console.log('Top 10 Slowest Operations:');
        sortedResults.slice(0, 10).forEach((result, i) => {
            console.log(`${i + 1}. ${result.test}: ${result.duration}ms`);
        });

        console.log('\nMemory Usage:');
        console.log(this.measureMemory());

        // Recommendations
        console.log('\n' + '='.repeat(60));
        console.log('PERFORMANCE RECOMMENDATIONS:');
        console.log('='.repeat(60));
        
        const slow = sortedResults.filter(r => parseFloat(r.duration) > 100);
        if (slow.length > 0) {
            console.log('\n⚠️ Operations taking >100ms that could be optimized:');
            slow.forEach(r => {
                console.log(`  - ${r.test}: ${r.duration}ms`);
                
                // Specific recommendations
                if (r.test.includes('Filter')) {
                    console.log('    → Consider indexing data by common filter fields');
                }
                if (r.test.includes('Search')) {
                    console.log('    → Consider implementing search index or debouncing');
                }
                if (r.test.includes('network')) {
                    console.log('    → Consider limiting initial network size or progressive loading');
                }
                if (r.test.includes('Process')) {
                    console.log('    → Consider processing data on server or using Web Workers');
                }
            });
        }

        // Return report as object
        return {
            summary: stats,
            results: this.results,
            recommendations: slow.map(r => ({
                operation: r.test,
                duration: r.duration,
                recommendation: this.getRecommendation(r.test)
            }))
        };
    }

    getRecommendation(testName) {
        if (testName.includes('Filter')) return 'Index data by filter fields';
        if (testName.includes('Search')) return 'Implement search indexing';
        if (testName.includes('network')) return 'Use progressive loading';
        if (testName.includes('Process')) return 'Use Web Workers';
        if (testName.includes('Sort')) return 'Pre-sort common views';
        return 'Optimize algorithm';
    }

    async runAllTests() {
        console.log('🚀 Starting Strashun Library Performance Test Suite...\n');
        
        try {
            await this.testDataLoading();
            await this.testSearchPerformance();
            await this.testFilteringPerformance();
            await this.testSortingPerformance();
            await this.testPaginationPerformance();
            await this.testNetworkVisualization();
            await this.testChartRendering();
            await this.testWorstCaseScenarios();
            
            return this.generateReport();
        } catch (error) {
            console.error('❌ Test suite failed:', error);
            return this.generateReport();
        }
    }
}

// --- Usage ---
// To run tests:
// 1. Include this script in your HTML: <script src="test.js"></script>
// 2. Or paste in browser console
// 3. Then run:

const tester = new PerformanceTestSuite();
tester.runAllTests().then(report => {
    console.log('\n✅ Test suite completed!');
    // Optionally save report
    // console.save(report, 'performance-report.json');
});

// --- Additional Utility: Real-time Performance Monitor ---
class PerformanceMonitor {
    constructor() {
        this.observers = [];
    }

    startMonitoring() {
        // Monitor long tasks
        if ('PerformanceObserver' in window) {
            const observer = new PerformanceObserver((list) => {
                for (const entry of list.getEntries()) {
                    if (entry.duration > 50) {
                        console.warn(`⚠️ Long task detected: ${entry.duration.toFixed(2)}ms`, entry);
                    }
                }
            });
            
            try {
                observer.observe({ entryTypes: ['longtask'] });
                this.observers.push(observer);
                console.log('📊 Performance monitoring started (long tasks > 50ms)');
            } catch (e) {
                console.log('Long task monitoring not supported');
            }
        }

        // Monitor memory periodically
        if (performance.memory) {
            this.memoryInterval = setInterval(() => {
                const used = (performance.memory.usedJSHeapSize / 1048576).toFixed(2);
                const total = (performance.memory.totalJSHeapSize / 1048576).toFixed(2);
                if (used / total > 0.9) {
                    console.warn(`⚠️ High memory usage: ${used}MB / ${total}MB`);
                }
            }, 5000);
        }
    }

    stopMonitoring() {
        this.observers.forEach(obs => obs.disconnect());
        if (this.memoryInterval) clearInterval(this.memoryInterval);
        console.log('📊 Performance monitoring stopped');
    }
}

// Uncomment to start real-time monitoring:
// const monitor = new PerformanceMonitor();
// monitor.startMonitoring();