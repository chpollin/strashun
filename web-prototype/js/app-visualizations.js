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
    const { AppState, FilterManager, Utils } = window.StrashunCore;

    // Chart instances storage
    const charts = {};
    let networkInstance = null;
    window.timelineChart = null; // Make timeline chart instance global

    // --- Chart Manager ---
    class ChartManager {
        static createChart(canvasId, type, data, options = {}) {
            const ctx = document.getElementById(canvasId)?.getContext('2d');
            if (!ctx) return null;

            // Destroy existing chart if it exists
            if (charts[canvasId]) {
                charts[canvasId].destroy();
            }

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
                    x: { ticks: { color: '#4A5568' }, grid: { color: '#E2E8F0' } },
                    y: { ticks: { color: '#4A5568' }, grid: { display: false } }
                }
            };
        }
    }

    // --- Dashboard View (UPDATED) ---
    class DashboardView {
        static render() {
            this.renderPopularBooksChart();
            this.renderActiveReadersChart();
            this.renderPeriodChart();
            this.renderGenderChart();
        }

        static renderPopularBooksChart() {
            const popularBooks = FilterManager.getTopBooks(15);
            if (!popularBooks || popularBooks.length === 0) return;

            ChartManager.createChart('popular-books-chart', 'bar', {
                labels: popularBooks.map(b => b.title || `Book ID: ${b.book_id}`),
                datasets: [{
                    label: 'Times Borrowed',
                    data: popularBooks.map(b => b.transactions.length),
                    backgroundColor: 'rgba(74, 85, 104, 0.7)'
                }]
            }, {
                ...ChartManager.getDefaultOptions(),
                indexAxis: 'y',
                onClick: (evt, elements) => {
                    if (elements[0]) {
                        const book = popularBooks[elements[0].index];
                        window.StrashunViews.BookView.showDetail(book.book_id);
                    }
                }
            });
        }

        static renderActiveReadersChart() {
            const activeReaders = FilterManager.getTopBorrowers(15);
            if (!activeReaders || activeReaders.length === 0) return;
            
            ChartManager.createChart('active-readers-chart', 'bar', {
                labels: activeReaders.map(b => b.borrower_name),
                datasets: [{
                    label: 'Books Borrowed',
                    data: activeReaders.map(b => b.transactions.length),
                    backgroundColor: 'rgba(56, 161, 105, 0.7)'
                }]
            }, {
                ...ChartManager.getDefaultOptions(),
                indexAxis: 'y',
                onClick: (evt, elements) => {
                    if (elements[0]) {
                        const borrower = activeReaders[elements[0].index];
                        window.StrashunViews.BorrowerView.showDetail(borrower.borrower_name);
                    }
                }
            });
        }

        static renderPeriodChart() {
            const periodData = AppState.libraryData.stats?.by_year;
            if (!periodData || periodData.length === 0) return;

            ChartManager.createChart('period-chart', 'pie', {
                labels: periodData.map(p => p.year),
                datasets: [{
                    data: periodData.map(p => p.total_transactions),
                    backgroundColor: ['#4A5568', '#38A169', '#D69E2E', '#E53E3E', '#805AD5', '#3182CE']
                }]
            }, {
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { position: 'top', labels: { color: '#4A5568' } } }
            });
        }

        static renderGenderChart() {
            const genderData = AppState.libraryData.stats?.by_gender;
            if (!genderData || genderData.length === 0) return;

            ChartManager.createChart('gender-chart', 'doughnut', {
                labels: genderData.map(g => g.gender === 'W' ? 'Female' : (g.gender === 'M' ? 'Male' : 'Unknown')),
                datasets: [{
                    data: genderData.map(g => g.total_transactions),
                    backgroundColor: ['#D53F8C', '#6B46C1', '#A0AEC0']
                }]
            }, {
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { position: 'top', labels: { color: '#4A5568' } } }
            });
        }
    }

    // --- Network View (HEAVILY MODIFIED AND OPTIMIZED) ---
    class NetworkView {
        static init() {
            document.getElementById('network-refresh')?.addEventListener('click', () => this.render());
            document.getElementById('network-period-filter')?.addEventListener('change', () => this.render());
        }

        // --- REWRITTEN render method ---
        // This is now extremely fast and simple.
        static render() {
            Utils.showLoading('network-graph');

            const periodFilter = document.getElementById('network-period-filter')?.value || 'all';

            // 1. Get the pre-calculated network data for the selected period
            const networkData = AppState.libraryData.network_data?.[periodFilter];

            const statsElement = document.getElementById('network-stats');
            const graphContainer = document.getElementById('network-graph');

            if (!networkData || !networkData.nodes || networkData.nodes.length === 0) {
                graphContainer.innerHTML = '<p class="text-center text-gray-500 p-8">No data available for this period.</p>';
                if(statsElement) statsElement.textContent = 'Nodes: 0 | Edges: 0';
                return;
            }

            const { nodes, edges } = networkData;

            if (statsElement) {
                statsElement.textContent = `Nodes: ${nodes.length} | Edges: ${edges.length}`;
            }

            this.createNetwork(graphContainer, nodes, edges);
        }

        static createNetwork(container, nodes, edges) {
            if (networkInstance) {
                networkInstance.destroy();
            }

            const data = {
                nodes: new vis.DataSet(nodes),
                edges: new vis.DataSet(edges)
            };

            const options = {
                nodes: {
                    shape: 'dot',
                    scaling: { min: 10, max: 40 },
                    font: { size: 12, face: 'Inter', color: '#1A202C' }
                },
                groups: {
                    book: { color: { background: '#63B3ED', border: '#4299E1' }, mass: 2 },
                    borrower: { color: { background: '#68D391', border: '#48BB78' }, mass: 1 },
                },
                edges: {
                    color: { color: '#CBD5E0', highlight: '#4A5568' },
                    arrows: { to: { enabled: false } }
                },
                physics: {
                    solver: 'barnesHut',
                    barnesHut: {
                        gravitationalConstant: -15000,
                        centralGravity: 0.1,
                        springLength: 120,
                        springConstant: 0.05,
                        damping: 0.09
                    },
                    stabilization: { iterations: 150 }
                },
                interaction: {
                    hover: true,
                    tooltipDelay: 200,
                    dragNodes: true
                },
            };

            networkInstance = new vis.Network(container, data, options);
            window.networkInstance = networkInstance; // Store globally for resize, etc.

            networkInstance.on("click", (params) => {
                if (params.nodes.length > 0) {
                    const nodeId = params.nodes[0];
                    const nodeData = data.nodes.get(nodeId);
                    if (nodeData?.group === 'book') {
                        const bookId = parseInt(nodeId.split('-')[1], 10);
                        window.StrashunViews.BookView.showDetail(bookId);
                    } else if (nodeData?.group === 'borrower') {
                        const borrowerName = nodeId.substring(nodeId.indexOf('-') + 1);
                        window.StrashunViews.BorrowerView.showDetail(borrowerName);
                    }
                }
            });
        }
    }

    // --- Timeline View ---
    class TimelineView {
        static init() {
            // This view can remain as is, since it was already performing its own aggregations
            // on the full transaction list, which is still available.
            ['timeline-granularity', 'timeline-metric', 'timeline-refresh'].forEach(id => {
                 document.getElementById(id)?.addEventListener('change', () => this.render());
            });
        }
        
        static render() {
            // (Content from your original file for this method)
        }
        
        static getYearlyData(metric) {
            // (Content from your original file for this method)
        }
        
        static getPeriodData(metric) {
            // (Content from your original file for this method)
        }

        static calculatePeriodMetric(period, metric) {
            // (Content from your original file for this method)
        }
        
        static getMetricLabel(metric) {
            // (Content from your original file for this method)
        }
    }

    // --- Main Initialization ---
    document.addEventListener('DOMContentLoaded', async () => {
        if (!window.StrashunCore || !window.StrashunViews) {
            console.error('Core or Views modules not loaded!');
            return;
        }

        const success = await window.StrashunCore.DataManager.loadData();
        if (!success) return; // Error message is handled in core.js

        // Initialize all managers
        window.StrashunViews.NavigationManager.init();
        window.StrashunViews.BookView.init();
        window.StrashunViews.BorrowerView.init();
        NetworkView.init();
        TimelineView.init();

        DashboardView.render();

        // Handle navigation from URL
        const urlState = window.StrashunCore.URLManager.loadFromURL();
        if (urlState.type === 'detail') {
            if (urlState.detailType === 'book') {
                window.StrashunViews.BookView.showDetail(urlState.detailId);
            } else {
                window.StrashunViews.BorrowerView.showDetail(urlState.detailId);
            }
        } else {
            window.StrashunViews.NavigationManager.navigateTo(urlState.view);
        }

        // Initial render of lists
        window.StrashunViews.BookView.update();
        window.StrashunViews.BorrowerView.update();
        
        document.getElementById('loading-spinner').style.display = 'none';
        document.getElementById('main-content').style.display = 'block';
    });

    // Export for global access
    window.StrashunViz = {
        ChartManager, DashboardView, NetworkView, TimelineView
    };
})();