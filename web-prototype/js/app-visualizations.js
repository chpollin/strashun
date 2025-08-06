// =================================================================================
// app-visualizations.js - Charts, Network, and Timeline Visualizations
// Handles: Dashboard charts, network graph, timeline view
// =================================================================================

(function() {
    'use strict';
    
    // Wait for dependencies
    if (!window.StrashunCore) {
        console.error('Core module must be loaded before visualizations module');
        return;
    }
    
    // Get dependencies from core
    const { AppState, FilterManager } = window.StrashunCore;
    
    // Chart instances storage
    const charts = {};
    let networkInstance = null;

    // --- Chart Manager ---
    class ChartManager {
        static createChart(canvasId, type, data, options = {}) {
            const ctx = document.getElementById(canvasId)?.getContext('2d');
            if (!ctx) return;
            
            // Destroy existing chart
            if (charts[canvasId]) charts[canvasId].destroy();
            
            // Create new chart
            charts[canvasId] = new Chart(ctx, { type, data, options });
            return charts[canvasId];
        }
        
        static getDefaultOptions() {
            return {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { 
                    legend: { display: false } 
                },
                scales: { 
                    x: { 
                        ticks: { color: 'var(--text-secondary)', fontFamily: 'Inter' }, 
                        grid: { color: '#EDF2F7' } 
                    }, 
                    y: { 
                        ticks: { color: 'var(--text-secondary)', fontFamily: 'Inter', autoSkip: false }, 
                        grid: { display: false } 
                    } 
                }
            };
        }
    }

    // --- Dashboard View ---
    class DashboardView {
        static render() {
            this.renderPopularBooksChart();
            this.renderActiveReadersChart();
            this.renderPeriodChart();
            this.renderGenderChart();
        }
        
        static renderPopularBooksChart() {
            const popularBooks = FilterManager.getTopBooks(20);
            const chartOptions = {
                ...ChartManager.getDefaultOptions(),
                indexAxis: 'y',
                onClick: (evt, elements) => {
                    if (elements.length > 0) {
                        const book = popularBooks[elements[0].index];
                        window.StrashunViews.BookView.showDetail(book.id);
                    }
                }
            };
            
            ChartManager.createChart('popular-books-chart', 'bar', {
                labels: popularBooks.map(b => b.title || `Book ID: ${b.id}`),
                datasets: [{
                    label: 'Times Borrowed',
                    data: popularBooks.map(b => b.transaction_ids.length),
                    backgroundColor: 'rgba(74, 85, 104, 0.7)'
                }]
            }, chartOptions);
        }
        
        static renderActiveReadersChart() {
            const activeReaders = FilterManager.getTopBorrowers(20);
            const chartOptions = {
                ...ChartManager.getDefaultOptions(),
                indexAxis: 'y',
                onClick: (evt, elements) => {
                    if (elements.length > 0) {
                        const borrower = activeReaders[elements[0].index];
                        window.StrashunViews.BorrowerView.showDetail(borrower.name);
                    }
                }
            };
            
            ChartManager.createChart('active-readers-chart', 'bar', {
                labels: activeReaders.map(b => b.name),
                datasets: [{
                    label: 'Books Borrowed',
                    data: activeReaders.map(b => b.transaction_ids.length),
                    backgroundColor: 'rgba(56, 161, 105, 0.7)'
                }]
            }, chartOptions);
        }
        
        static renderPeriodChart() {
            const periodCounts = AppState.libraryData.transactions.reduce((acc, t) => {
                const year = new Date(t.date).getFullYear();
                let period = 'Unknown';
                if (year === 1902) period = '1902';
                else if (year === 1903 || year === 1904) period = '1903-1904';
                else if (year === 1934) period = '1934';
                else if (year === 1940) period = '1940';
                acc[period] = (acc[period] || 0) + 1;
                return acc;
            }, {});
            
            ChartManager.createChart('period-chart', 'pie', {
                labels: Object.keys(periodCounts),
                datasets: [{
                    data: Object.values(periodCounts),
                    backgroundColor: ['#4A5568', '#38A169', '#D69E2E', '#E53E3E', '#805AD5']
                }]
            }, {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                        labels: { color: 'var(--text-secondary)', fontFamily: 'Inter' }
                    }
                }
            });
        }
        
        static renderGenderChart() {
            const genderCounts = AppState.libraryData.borrowers.reduce((acc, b) => {
                const gender = b.gender === 'female' ? 'Female' : 'Male/Unknown';
                acc[gender] = (acc[gender] || 0) + 1;
                return acc;
            }, {});
            
            ChartManager.createChart('gender-chart', 'doughnut', {
                labels: Object.keys(genderCounts),
                datasets: [{
                    data: Object.values(genderCounts),
                    backgroundColor: ['#D53F8C', '#6B46C1']
                }]
            }, {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                        labels: { color: 'var(--text-secondary)', fontFamily: 'Inter' }
                    }
                }
            });
        }
    }

    // --- Network View ---
    class NetworkView {
        static init() {
            document.getElementById('network-refresh')?.addEventListener('click', () => this.render());
            
            ['network-period-filter', 'network-min-connections', 'network-gender-filter'].forEach(id => {
                document.getElementById(id)?.addEventListener('change', () => this.render());
            });
        }
        
        static render() {
            window.StrashunCore.Utils.showLoading('network-graph');
            
            const periodFilter = document.getElementById('network-period-filter')?.value || 'all';
            const minConnections = parseInt(document.getElementById('network-min-connections')?.value || '0');
            const genderFilter = document.getElementById('network-gender-filter')?.value || 'all';
            
            // Filter transactions
            let filteredTransactions = this.filterTransactionsByPeriod(periodFilter);
            
            // Count connections per book
            const bookConnectionCounts = {};
            filteredTransactions.forEach(t => {
                bookConnectionCounts[t.book_id] = (bookConnectionCounts[t.book_id] || 0) + 1;
            });
            
            // Filter books by minimum connections
            const validBookIds = Object.keys(bookConnectionCounts)
                .filter(id => bookConnectionCounts[id] >= minConnections)
                .map(id => parseInt(id));
            
            // Filter borrowers by gender
            let relevantBorrowers = this.filterBorrowersByGender(genderFilter);
            const relevantBorrowerNames = new Set(relevantBorrowers.map(b => b.name));
            
            // Final transaction filter
            filteredTransactions = filteredTransactions.filter(t => 
                validBookIds.includes(t.book_id) && relevantBorrowerNames.has(t.borrower_name)
            );
            
            // Build nodes and edges
            const { nodes, edges } = this.buildNetworkData(
                validBookIds, relevantBorrowers, filteredTransactions, bookConnectionCounts
            );
            
            // Update stats
            const statsElement = document.getElementById('network-stats');
            if (statsElement) {
                statsElement.textContent = `Nodes: ${nodes.length} | Edges: ${edges.length}`;
            }
            
            // Create network
            this.createNetwork(nodes, edges);
        }
        
        static filterTransactionsByPeriod(periodFilter) {
            if (periodFilter === 'all') return AppState.libraryData.transactions;
            
            return AppState.libraryData.transactions.filter(t => {
                const year = new Date(t.date).getFullYear();
                if (periodFilter === '1902') return year === 1902;
                if (periodFilter === '1903-1904') return year === 1903 || year === 1904;
                if (periodFilter === '1934') return year === 1934;
                if (periodFilter === '1940') return year === 1940;
                return false;
            });
        }
        
        static filterBorrowersByGender(genderFilter) {
            if (genderFilter === 'all') return AppState.libraryData.borrowers;
            
            return AppState.libraryData.borrowers.filter(b => {
                if (genderFilter === 'female') return b.gender === 'female';
                if (genderFilter === 'male') return b.gender !== 'female';
                return true;
            });
        }
        
        static buildNetworkData(validBookIds, relevantBorrowers, filteredTransactions, bookConnectionCounts) {
            const nodes = [
                // Book nodes
                ...AppState.libraryData.books
                    .filter(book => validBookIds.includes(book.id))
                    .map(book => ({
                        id: `book-${book.id}`,
                        label: book.title || `Book ${book.id}`,
                        group: 'book',
                        value: bookConnectionCounts[book.id] || 1,
                        title: `${book.title || 'Book ' + book.id}<br>${bookConnectionCounts[book.id]} borrows`,
                        bookId: book.id // Store for click handler
                    })),
                // Borrower nodes
                ...relevantBorrowers
                    .filter(borrower => filteredTransactions.some(t => t.borrower_name === borrower.name))
                    .map(borrower => ({
                        id: `borrower-${borrower.name}`,
                        label: borrower.name,
                        group: borrower.gender === 'female' ? 'borrower-female' : 'borrower',
                        value: borrower.transaction_ids.filter(tid =>
                            filteredTransactions.some(t => t.transaction_id === tid)
                        ).length,
                        title: `${borrower.name}<br>${borrower.transaction_ids.length} total borrows${
                            borrower.gender === 'female' ? '<br>(Female)' : ''
                        }`,
                        borrowerName: borrower.name // Store for click handler
                    }))
            ];
            
            const edges = filteredTransactions.map(t => ({
                from: `borrower-${t.borrower_name}`,
                to: `book-${t.book_id}`
            }));
            
            return { nodes, edges };
        }
        
        static createNetwork(nodes, edges) {
            // Destroy existing network
            if (networkInstance) {
                networkInstance.destroy();
                networkInstance = null;
            }
            
            const container = document.getElementById('network-graph');
            const data = {
                nodes: new vis.DataSet(nodes),
                edges: new vis.DataSet(edges)
            };
            
            const options = {
                nodes: {
                    shape: 'dot',
                    scaling: { min: 10, max: 30 },
                    font: { size: 12, face: 'Inter', color: '#2D3748' }
                },
                groups: {
                    book: { color: { background: '#63B3ED', border: '#4299E1' } },
                    borrower: { color: { background: '#68D391', border: '#48BB78' } },
                    'borrower-female': { color: { background: '#D53F8C', border: '#B83280' } }
                },
                physics: {
                    solver: 'barnesHut',
                    barnesHut: {
                        gravitationalConstant: -8000,
                        springConstant: 0.04,
                        springLength: 95
                    },
                    stabilization: { iterations: 2500 }
                },
                layout: { improvedLayout: false },
                interaction: { hover: true, tooltipDelay: 200 }
            };
            
            networkInstance = new vis.Network(container, data, options);
            window.networkInstance = networkInstance; // Store globally
            
            // Add click handler
            networkInstance.on("click", (params) => {
                if (params.nodes.length > 0) {
                    const nodeData = data.nodes.get(params.nodes[0]);
                    if (nodeData) {
                        if (nodeData.bookId !== undefined) {
                            window.StrashunViews.BookView.showDetail(nodeData.bookId);
                        } else if (nodeData.borrowerName !== undefined) {
                            window.StrashunViews.BorrowerView.showDetail(nodeData.borrowerName);
                        }
                    }
                }
            });
            
            // Add double-click to fit
            networkInstance.on("doubleClick", () => {
                networkInstance.fit();
            });
        }
    }

    // --- Timeline View ---
    class TimelineView {
        static init() {
            document.getElementById('timeline-refresh')?.addEventListener('click', () => this.render());
            
            ['timeline-granularity', 'timeline-metric'].forEach(id => {
                document.getElementById(id)?.addEventListener('change', () => this.render());
            });
        }
        
        static render() {
            const granularity = document.getElementById('timeline-granularity')?.value || 'year';
            const metric = document.getElementById('timeline-metric')?.value || 'transactions';
            
            let chartData;
            if (granularity === 'year') {
                chartData = this.getYearlyData(metric);
            } else {
                chartData = this.getPeriodData(metric);
            }
            
            const options = {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: true } },
                scales: {
                    x: { ticks: { color: 'var(--text-secondary)' } },
                    y: { ticks: { color: 'var(--text-secondary)' } }
                }
            };
            
            window.timelineChart = ChartManager.createChart('timeline-chart', 
                granularity === 'year' ? 'line' : 'bar', 
                chartData, options
            );
        }
        
        static getYearlyData(metric) {
            const yearlyData = {};
            
            if (metric === 'transactions') {
                AppState.libraryData.transactions.forEach(t => {
                    const year = new Date(t.date).getFullYear();
                    if (year >= 1900 && year <= 1941) {
                        yearlyData[year] = (yearlyData[year] || 0) + 1;
                    }
                });
            } else if (metric === 'unique-books') {
                const yearBooks = {};
                AppState.libraryData.transactions.forEach(t => {
                    const year = new Date(t.date).getFullYear();
                    if (year >= 1900 && year <= 1941) {
                        if (!yearBooks[year]) yearBooks[year] = new Set();
                        yearBooks[year].add(t.book_id);
                    }
                });
                Object.keys(yearBooks).forEach(year => {
                    yearlyData[year] = yearBooks[year].size;
                });
            } else if (metric === 'unique-borrowers') {
                const yearBorrowers = {};
                AppState.libraryData.transactions.forEach(t => {
                    const year = new Date(t.date).getFullYear();
                    if (year >= 1900 && year <= 1941) {
                        if (!yearBorrowers[year]) yearBorrowers[year] = new Set();
                        yearBorrowers[year].add(t.borrower_name);
                    }
                });
                Object.keys(yearBorrowers).forEach(year => {
                    yearlyData[year] = yearBorrowers[year].size;
                });
            }
            
            const sortedYears = Object.keys(yearlyData).sort((a, b) => a - b);
            
            return {
                labels: sortedYears,
                datasets: [{
                    label: this.getMetricLabel(metric),
                    data: sortedYears.map(year => yearlyData[year]),
                    fill: false,
                    borderColor: 'var(--accent-primary)',
                    tension: 0.1
                }]
            };
        }
        
        static getPeriodData(metric) {
            const periods = ['1902', '1903-1904', '1934', '1940'];
            const periodData = {};
            
            periods.forEach(period => {
                periodData[period] = this.calculatePeriodMetric(period, metric);
            });
            
            return {
                labels: periods,
                datasets: [{
                    label: this.getMetricLabel(metric),
                    data: periods.map(p => periodData[p]),
                    backgroundColor: ['#4A5568', '#38A169', '#D69E2E', '#E53E3E']
                }]
            };
        }
        
        static calculatePeriodMetric(period, metric) {
            const transactions = AppState.libraryData.transactions.filter(t => {
                const year = new Date(t.date).getFullYear();
                if (period === '1902') return year === 1902;
                if (period === '1903-1904') return year === 1903 || year === 1904;
                if (period === '1934') return year === 1934;
                if (period === '1940') return year === 1940;
                return false;
            });
            
            if (metric === 'transactions') {
                return transactions.length;
            } else if (metric === 'unique-books') {
                return new Set(transactions.map(t => t.book_id)).size;
            } else if (metric === 'unique-borrowers') {
                return new Set(transactions.map(t => t.borrower_name)).size;
            }
            return 0;
        }
        
        static getMetricLabel(metric) {
            const labels = {
                'transactions': 'Total Transactions',
                'unique-books': 'Unique Books Borrowed',
                'unique-borrowers': 'Active Borrowers'
            };
            return labels[metric] || 'Metric';
        }
    }

    // --- Main Initialization ---
    document.addEventListener('DOMContentLoaded', async () => {
        // Ensure all modules are loaded
        if (!window.StrashunCore) {
            console.error('Core module not loaded!');
            return;
        }
        
        // Ensure views module is loaded
        if (!window.StrashunViews) {
            console.error('Views module not loaded!');
            return;
        }
        
        // Load data
        const success = await window.StrashunCore.DataManager.loadData();
        if (!success) {
            document.getElementById('loading-spinner').innerHTML = 
                '<p style="color: red;">Failed to load library data. Please check the console for errors.</p>';
            return;
        }
        
        // Initialize views
        window.StrashunViews.NavigationManager.init();
        window.StrashunViews.BookView.init();
        window.StrashunViews.BorrowerView.init();
        NetworkView.init();
        TimelineView.init();
        
        // Render dashboard
        DashboardView.render();
        
        // Load URL state
        const urlState = window.StrashunCore.URLManager.loadFromURL();
        if (urlState.type === 'detail') {
            if (urlState.detailType === 'book') {
                window.StrashunViews.BookView.showDetail(parseInt(urlState.detailId));
            } else {
                window.StrashunViews.BorrowerView.showDetail(urlState.detailId);
            }
        } else {
            window.StrashunViews.NavigationManager.navigateTo(urlState.view);
        }
        
        // Update initial views
        window.StrashunViews.BookView.update();
        window.StrashunViews.BorrowerView.update();
        
        // Hide loading spinner
        document.getElementById('loading-spinner').style.display = 'none';
    });

    // Export for global access
    window.StrashunViz = {
        ChartManager, DashboardView, NetworkView, TimelineView
    };
})();