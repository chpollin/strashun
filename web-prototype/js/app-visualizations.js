// =================================================================================
// app-visualizations.js - Charts, Network, Timeline, and Ego-Network Visualizations
// Enhanced version with Ego-Network implementation
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
    let egoNetworkInstance = null;
    window.timelineChart = null;

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

    // --- Dashboard View ---
    class DashboardView {
        static render() {
            this.renderPopularBooksChart();
            this.renderActiveReadersChart();
            this.renderPeriodChart();
            this.renderGenderChart();
            this.renderSeasonalityChart();
            this.renderLanguageDistribution();
        }

        static renderPopularBooksChart() {
            const popularBooks = FilterManager.getTopBooks(15);
            if (!popularBooks || popularBooks.length === 0) return;

            ChartManager.createChart('popular-books-chart', 'bar', {
                labels: popularBooks.map(b => {
                    const title = b.title || `Book ID: ${b.book_id}`;
                    return title.length > 40 ? title.substring(0, 37) + '...' : title;
                }),
                datasets: [{
                    label: 'Times Borrowed',
                    data: popularBooks.map(b => b.transactions.length),
                    backgroundColor: 'rgba(74, 85, 104, 0.7)',
                    borderColor: 'rgba(74, 85, 104, 1)',
                    borderWidth: 1
                }]
            }, {
                ...ChartManager.getDefaultOptions(),
                indexAxis: 'y',
                onClick: (evt, elements) => {
                    if (elements[0]) {
                        const book = popularBooks[elements[0].index];
                        window.StrashunViews.BookView.showDetail(book.book_id);
                    }
                },
                plugins: {
                    ...ChartManager.getDefaultOptions().plugins,
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                const book = popularBooks[context.dataIndex];
                                return [
                                    `Borrowed: ${context.parsed.x} times`,
                                    `By ${new Set(book.transactions.map(t => t.borrower_name)).size} unique readers`
                                ];
                            }
                        }
                    }
                }
            });
        }

        static renderActiveReadersChart() {
            const activeReaders = FilterManager.getTopBorrowers(15);
            if (!activeReaders || activeReaders.length === 0) return;
            
            ChartManager.createChart('active-readers-chart', 'bar', {
                labels: activeReaders.map(b => {
                    const name = b.borrower_name;
                    return name.length > 30 ? name.substring(0, 27) + '...' : name;
                }),
                datasets: [{
                    label: 'Books Borrowed',
                    data: activeReaders.map(b => b.transactions.length),
                    backgroundColor: 'rgba(56, 161, 105, 0.7)',
                    borderColor: 'rgba(56, 161, 105, 1)',
                    borderWidth: 1
                }]
            }, {
                ...ChartManager.getDefaultOptions(),
                indexAxis: 'y',
                onClick: (evt, elements) => {
                    if (elements[0]) {
                        const borrower = activeReaders[elements[0].index];
                        window.StrashunViews.BorrowerView.showDetail(borrower.borrower_name);
                    }
                },
                plugins: {
                    ...ChartManager.getDefaultOptions().plugins,
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                const borrower = activeReaders[context.dataIndex];
                                const uniqueBooks = new Set(borrower.transactions.map(t => t.book_id)).size;
                                return [
                                    `Total transactions: ${context.parsed.x}`,
                                    `Unique books: ${uniqueBooks}`
                                ];
                            }
                        }
                    }
                }
            });
        }

        static renderPeriodChart() {
            const periodData = AppState.libraryData.stats?.by_year;
            if (!periodData || periodData.length === 0) return;

            ChartManager.createChart('period-chart', 'pie', {
                labels: periodData.map(p => `Year ${p.year}`),
                datasets: [{
                    data: periodData.map(p => p.total_transactions),
                    backgroundColor: ['#4A5568', '#38A169', '#D69E2E', '#E53E3E', '#805AD5', '#3182CE'],
                    borderWidth: 2,
                    borderColor: '#fff'
                }]
            }, {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                        labels: { color: '#4A5568', padding: 10 }
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = ((context.parsed / total) * 100).toFixed(1);
                                return `${context.label}: ${context.parsed} (${percentage}%)`;
                            }
                        }
                    }
                }
            });
        }

        static renderGenderChart() {
            const genderData = AppState.libraryData.stats?.by_gender;
            if (!genderData || genderData.length === 0) return;

            ChartManager.createChart('gender-chart', 'doughnut', {
                labels: genderData.map(g => 
                    g.gender === 'W' ? 'Female' : 
                    g.gender === 'M' ? 'Male' : 
                    'Unknown'
                ),
                datasets: [{
                    data: genderData.map(g => g.total_transactions),
                    backgroundColor: ['#D53F8C', '#6B46C1', '#A0AEC0'],
                    borderWidth: 2,
                    borderColor: '#fff'
                }]
            }, {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                        labels: { color: '#4A5568', padding: 10 }
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = ((context.parsed / total) * 100).toFixed(1);
                                return `${context.label}: ${context.parsed} transactions (${percentage}%)`;
                            }
                        }
                    }
                }
            });
        }

        // NEW: Seasonality Chart
        static renderSeasonalityChart() {
            const canvas = document.getElementById('seasonality-chart');
            if (!canvas) return;

            const monthlyData = this.calculateMonthlyDistribution();
            if (!monthlyData) return;

            ChartManager.createChart('seasonality-chart', 'line', {
                labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
                datasets: [{
                    label: 'Borrowing Activity',
                    data: monthlyData,
                    borderColor: 'rgba(59, 130, 246, 1)',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            }, {
                ...ChartManager.getDefaultOptions(),
                plugins: {
                    ...ChartManager.getDefaultOptions().plugins,
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                const total = monthlyData.reduce((a, b) => a + b, 0);
                                const percentage = ((context.parsed.y / total) * 100).toFixed(1);
                                return `${context.parsed.y} transactions (${percentage}% of year)`;
                            }
                        }
                    }
                }
            });
        }

        // NEW: Language Distribution Chart
        static renderLanguageDistribution() {
            const canvas = document.getElementById('language-chart');
            if (!canvas) return;

            const languageData = AppState.libraryData.stats?.by_language;
            if (!languageData || languageData.length === 0) return;

            // Take top 10 languages
            const topLanguages = languageData
                .sort((a, b) => b.total_transactions - a.total_transactions)
                .slice(0, 10);

            ChartManager.createChart('language-chart', 'bar', {
                labels: topLanguages.map(l => this.getLanguageName(l.language)),
                datasets: [{
                    label: 'Books in Collection',
                    data: topLanguages.map(l => l.total_transactions),
                    backgroundColor: 'rgba(139, 92, 246, 0.7)',
                    borderColor: 'rgba(139, 92, 246, 1)',
                    borderWidth: 1
                }]
            }, {
                ...ChartManager.getDefaultOptions(),
                plugins: {
                    ...ChartManager.getDefaultOptions().plugins,
                    legend: { display: false }
                }
            });
        }

        static calculateMonthlyDistribution() {
            const transactions = AppState.libraryData.transactions;
            if (!transactions) return null;

            const monthCounts = new Array(12).fill(0);
            transactions.forEach(t => {
                if (t.date) {
                    const month = new Date(t.date).getMonth();
                    if (!isNaN(month)) monthCounts[month]++;
                }
            });
            return monthCounts;
        }

        static getLanguageName(code) {
            const languages = {
                'heb': 'Hebrew',
                'yid': 'Yiddish',
                'ger': 'German',
                'lat': 'Latin',
                'ara': 'Arabic',
                'arc': 'Aramaic',
                'eng': 'English',
                'rus': 'Russian',
                'pol': 'Polish'
            };
            return languages[code?.toLowerCase()] || code || 'Unknown';
        }
    }

    // --- Network View ---
    class NetworkView {
        static init() {
            document.getElementById('network-refresh')?.addEventListener('click', () => this.render());
            document.getElementById('network-period-filter')?.addEventListener('change', () => this.render());
            document.getElementById('network-layout')?.addEventListener('change', () => this.render());
        }

        static render() {
            Utils.showLoading('network-graph');

            const periodFilter = document.getElementById('network-period-filter')?.value || 'all';
            const layoutType = document.getElementById('network-layout')?.value || 'physics';

            const networkData = AppState.libraryData.network_data?.[periodFilter];

            const statsElement = document.getElementById('network-stats');
            const graphContainer = document.getElementById('network-graph');

            if (!networkData || !networkData.nodes || networkData.nodes.length === 0) {
                graphContainer.innerHTML = '<p class="text-center text-gray-500 p-8">No data available for this period.</p>';
                if(statsElement) statsElement.textContent = 'Nodes: 0 | Edges: 0';
                return;
            }

            const { nodes, edges } = networkData;

            // Add degree information to nodes
            const nodeDegrees = new Map();
            edges.forEach(edge => {
                nodeDegrees.set(edge.from, (nodeDegrees.get(edge.from) || 0) + 1);
                nodeDegrees.set(edge.to, (nodeDegrees.get(edge.to) || 0) + 1);
            });

            // Enhance nodes with degree-based sizing
            const enhancedNodes = nodes.map(node => ({
                ...node,
                value: nodeDegrees.get(node.id) || 1,
                title: `${node.label}<br>Connections: ${nodeDegrees.get(node.id) || 0}`
            }));

            if (statsElement) {
                const bookNodes = nodes.filter(n => n.group === 'book').length;
                const borrowerNodes = nodes.filter(n => n.group === 'borrower').length;
                statsElement.innerHTML = `
                    <span>Books: ${bookNodes}</span> | 
                    <span>Borrowers: ${borrowerNodes}</span> | 
                    <span>Connections: ${edges.length}</span>
                `;
            }

            this.createNetwork(graphContainer, enhancedNodes, edges, layoutType);
        }

        static createNetwork(container, nodes, edges, layoutType = 'physics') {
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
                    scaling: {
                        min: 10,
                        max: 40,
                        label: { enabled: false }
                    },
                    font: { size: 12, face: 'Inter', color: '#1A202C' }
                },
                groups: {
                    book: { 
                        color: { background: '#63B3ED', border: '#4299E1' },
                        shape: 'square'
                    },
                    borrower: { 
                        color: { background: '#68D391', border: '#48BB78' },
                        shape: 'dot'
                    },
                },
                edges: {
                    color: { color: '#CBD5E0', highlight: '#4A5568' },
                    smooth: {
                        type: layoutType === 'hierarchical' ? 'cubicBezier' : 'dynamic'
                    }
                },
                physics: layoutType === 'physics' ? {
                    enabled: true,
                    solver: 'barnesHut',
                    barnesHut: {
                        gravitationalConstant: -15000,
                        centralGravity: 0.1,
                        springLength: 120,
                        springConstant: 0.05,
                        damping: 0.09
                    },
                    stabilization: { 
                        enabled: true,
                        iterations: 150,
                        updateInterval: 10
                    }
                } : { enabled: false },
                layout: layoutType === 'hierarchical' ? {
                    hierarchical: {
                        direction: 'UD',
                        sortMethod: 'directed',
                        nodeSpacing: 150,
                        levelSeparation: 150
                    }
                } : {},
                interaction: {
                    hover: true,
                    tooltipDelay: 200,
                    dragNodes: true,
                    zoomView: true,
                    navigationButtons: true
                },
            };

            networkInstance = new vis.Network(container, data, options);
            window.networkInstance = networkInstance;

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

            // Add double-click to show ego network
            networkInstance.on("doubleClick", (params) => {
                if (params.nodes.length > 0) {
                    const nodeId = params.nodes[0];
                    const nodeData = data.nodes.get(nodeId);
                    if (nodeData?.group === 'book') {
                        const bookId = parseInt(nodeId.split('-')[1], 10);
                        EgoNetworkView.showInModal(bookId, 'book');
                    } else if (nodeData?.group === 'borrower') {
                        const borrowerName = nodeId.substring(nodeId.indexOf('-') + 1);
                        EgoNetworkView.showInModal(borrowerName, 'borrower');
                    }
                }
            });
        }
    }

    // --- NEW: Ego-Network View ---
    class EgoNetworkView {
        static init() {
            // Initialize ego network buttons if they exist
            document.addEventListener('click', (e) => {
                if (e.target.classList.contains('ego-network-btn')) {
                    const entityType = e.target.dataset.entityType;
                    const entityId = e.target.dataset.entityId;
                    this.toggleEgoNetwork(entityType, entityId);
                }
            });
        }

        static toggleEgoNetwork(entityType, entityId) {
            const container = document.getElementById('ego-network-container');
            const detailContent = document.getElementById('detail-content');
            
            if (!container) {
                console.error('Ego network container not found');
                return;
            }
            
            if (container.style.display === 'none' || !container.style.display) {
                container.style.display = 'block';
                if (detailContent) detailContent.style.display = 'none';
                this.render(entityId, entityType);
            } else {
                container.style.display = 'none';
                if (detailContent) detailContent.style.display = 'block';
            }
        }

        static showInModal(entityId, entityType) {
            // Create modal container if it doesn't exist
            let modal = document.getElementById('ego-network-modal');
            if (!modal) {
                modal = document.createElement('div');
                modal.id = 'ego-network-modal';
                modal.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4';
                modal.style.display = 'none';
                document.body.appendChild(modal);
            }

            modal.innerHTML = `
                <div class="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
                    <div class="p-4 border-b flex justify-between items-center">
                        <h3 class="text-xl font-semibold">Ego Network View</h3>
                        <button id="close-ego-modal" class="text-gray-500 hover:text-gray-700">
                            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                            </svg>
                        </button>
                    </div>
                    <div id="ego-modal-content" class="p-4 overflow-y-auto" style="max-height: calc(90vh - 100px);">
                        <div class="text-center p-8">
                            <div class="spinner"></div>
                            <p>Loading ego network...</p>
                        </div>
                    </div>
                </div>
            `;

            modal.style.display = 'flex';
            
            document.getElementById('close-ego-modal').addEventListener('click', () => {
                modal.style.display = 'none';
            });

            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.style.display = 'none';
                }
            });

            // Render ego network in modal
            setTimeout(() => {
                this.renderInContainer(entityId, entityType, 'ego-modal-content');
            }, 100);
        }

        static render(entityId, entityType, depth = 1) {
            this.renderInContainer(entityId, entityType, 'ego-network-container', depth);
        }

        static renderInContainer(entityId, entityType, containerId, depth = 1) {
            const container = document.getElementById(containerId);
            if (!container) return;

            // Get ego network data
            const networkData = entityType === 'book' ? 
                this.getBookEgoNetwork(entityId, depth) :
                this.getBorrowerEgoNetwork(entityId, depth);

            if (!networkData || networkData.nodes.length === 0) {
                container.innerHTML = '<p class="text-center text-gray-500 p-8">No network data available.</p>';
                return;
            }

            // Build container content
            container.innerHTML = `
                <div class="mb-4">
                    <div class="flex justify-between items-center mb-2">
                        <div>
                            <h3 class="text-lg font-semibold">
                                ${entityType === 'book' ? 'Book' : 'Borrower'} Network
                            </h3>
                            <p class="text-sm text-gray-600">
                                ${networkData.nodes.length} nodes, ${networkData.edges.length} connections
                                ${depth === 2 ? ' (including 2nd degree)' : ''}
                            </p>
                        </div>
                        ${containerId === 'ego-network-container' ? `
                            <button id="close-ego-network" class="text-gray-500 hover:text-gray-700">
                                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                                </svg>
                            </button>
                        ` : ''}
                    </div>
                    <div class="flex gap-2 mt-2">
                        <button class="ego-depth-btn px-3 py-1 text-sm rounded ${depth === 1 ? 'bg-blue-500 text-white' : 'bg-gray-200'}" 
                                data-depth="1" data-entity-id="${entityId}" data-entity-type="${entityType}" data-container="${containerId}">
                            Direct only
                        </button>
                        <button class="ego-depth-btn px-3 py-1 text-sm rounded ${depth === 2 ? 'bg-blue-500 text-white' : 'bg-gray-200'}" 
                                data-depth="2" data-entity-id="${entityId}" data-entity-type="${entityType}" data-container="${containerId}">
                            Include 2nd degree
                        </button>
                        <div class="ml-4 flex gap-4 text-sm">
                            <span class="flex items-center">
                                <span class="w-3 h-3 bg-blue-400 inline-block mr-1"></span>
                                Books
                            </span>
                            <span class="flex items-center">
                                <span class="w-3 h-3 bg-green-400 rounded-full inline-block mr-1"></span>
                                Borrowers
                            </span>
                        </div>
                    </div>
                </div>
                <div id="ego-network-graph-${containerId}" style="height: 500px; border: 1px solid #e5e7eb; border-radius: 8px;"></div>
            `;

            // Create the network visualization
            this.createEgoNetwork(networkData, entityId, entityType, `ego-network-graph-${containerId}`);

            // Setup event handlers
            if (containerId === 'ego-network-container') {
                document.getElementById('close-ego-network')?.addEventListener('click', () => {
                    container.style.display = 'none';
                    const detailContent = document.getElementById('detail-content');
                    if (detailContent) detailContent.style.display = 'block';
                });
            }

            document.querySelectorAll('.ego-depth-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const newDepth = parseInt(e.target.dataset.depth);
                    const entityId = e.target.dataset.entityId;
                    const entityType = e.target.dataset.entityType;
                    const containerId = e.target.dataset.container;
                    this.renderInContainer(entityId, entityType, containerId, newDepth);
                });
            });
        }

        static getBookEgoNetwork(bookId, depth = 1) {
            const book = AppState.bookIndex.get(parseInt(bookId));
            if (!book) return null;

            const nodes = [];
            const edges = [];
            const processedNodes = new Set();

            // Add the central book node
            nodes.push({
                id: `book-${bookId}`,
                label: book.title || `Book ${bookId}`,
                group: 'book',
                level: 0,
                value: 30,
                color: { background: '#3B82F6', border: '#1E40AF' },
                font: { size: 14, color: '#ffffff', strokeWidth: 3, strokeColor: '#1E40AF' },
                shape: 'square'
            });
            processedNodes.add(`book-${bookId}`);

            // Add all borrowers who borrowed this book
            if (book.transactions) {
                const borrowerCounts = {};
                book.transactions.forEach(t => {
                    borrowerCounts[t.borrower_name] = (borrowerCounts[t.borrower_name] || 0) + 1;
                });

                Object.entries(borrowerCounts).forEach(([borrowerName, count]) => {
                    const nodeId = `borrower-${borrowerName}`;
                    if (!processedNodes.has(nodeId)) {
                        const borrower = AppState.borrowerIndex.get(borrowerName);
                        nodes.push({
                            id: nodeId,
                            label: borrowerName,
                            group: 'borrower',
                            level: 1,
                            value: Math.min(10 + count * 2, 25),
                            title: `${borrowerName}<br>Borrowed this book ${count} time(s)<br>Total books borrowed: ${borrower?.transactions?.length || count}`,
                            color: borrower?.gender === 'W' ? 
                                { background: '#EC4899', border: '#BE185D' } :
                                { background: '#10B981', border: '#059669' }
                        });
                        processedNodes.add(nodeId);
                    }
                    
                    edges.push({
                        from: nodeId,
                        to: `book-${bookId}`,
                        value: count,
                        title: `${count} transaction(s)`,
                        color: { color: '#94A3B8' }
                    });
                });

                // If depth = 2, add other books these borrowers read
                if (depth === 2) {
                    const relatedBooks = new Map();
                    
                    Object.keys(borrowerCounts).forEach(borrowerName => {
                        const borrower = AppState.borrowerIndex.get(borrowerName);
                        if (borrower && borrower.transactions) {
                            borrower.transactions.forEach(t => {
                                if (t.book_id && t.book_id != bookId) {
                                    const count = relatedBooks.get(t.book_id) || 0;
                                    relatedBooks.set(t.book_id, count + 1);
                                }
                            });
                        }
                    });

                    // Add top related books (limit to avoid clutter)
                    const topRelated = Array.from(relatedBooks.entries())
                        .sort((a, b) => b[1] - a[1])
                        .slice(0, 20);

                    topRelated.forEach(([relatedBookId, sharedReaders]) => {
                        const otherBook = AppState.bookIndex.get(relatedBookId);
                        if (otherBook) {
                            const otherNodeId = `book-${relatedBookId}`;
                            if (!processedNodes.has(otherNodeId)) {
                                nodes.push({
                                    id: otherNodeId,
                                    label: otherBook.title || `Book ${relatedBookId}`,
                                    group: 'book',
                                    level: 2,
                                    value: Math.min(5 + sharedReaders, 15),
                                    title: `${otherBook.title}<br>Shared readers: ${sharedReaders}`,
                                    color: { background: '#93C5FD', border: '#60A5FA' },
                                    shape: 'square'
                                });
                                processedNodes.add(otherNodeId);
                            }

                            // Connect through shared readers
                            Object.keys(borrowerCounts).forEach(borrowerName => {
                                const borrower = AppState.borrowerIndex.get(borrowerName);
                                if (borrower?.transactions?.some(t => t.book_id == relatedBookId)) {
                                    edges.push({
                                        from: `borrower-${borrowerName}`,
                                        to: otherNodeId,
                                        value: 1,
                                        dashes: true,
                                        color: { color: '#E2E8F0' }
                                    });
                                }
                            });
                        }
                    });
                }
            }

            return { nodes, edges };
        }

        static getBorrowerEgoNetwork(borrowerName, depth = 1) {
            const borrower = AppState.borrowerIndex.get(borrowerName);
            if (!borrower) return null;

            const nodes = [];
            const edges = [];
            const processedNodes = new Set();

            // Add the central borrower node
            nodes.push({
                id: `borrower-${borrowerName}`,
                label: borrowerName,
                group: 'borrower',
                level: 0,
                value: 30,
                color: borrower.gender === 'W' ?
                    { background: '#EC4899', border: '#BE185D' } :
                    { background: '#10B981', border: '#059669' },
                font: { size: 14, color: '#ffffff', strokeWidth: 3, strokeColor: '#059669' }
            });
            processedNodes.add(`borrower-${borrowerName}`);

            // Add all books this person borrowed
            if (borrower.transactions) {
                const bookCounts = {};
                borrower.transactions.forEach(t => {
                    if (t.book_id) {
                        bookCounts[t.book_id] = (bookCounts[t.book_id] || 0) + 1;
                    }
                });

                Object.entries(bookCounts).forEach(([bookId, count]) => {
                    const book = AppState.bookIndex.get(parseInt(bookId));
                    if (book) {
                        const nodeId = `book-${bookId}`;
                        if (!processedNodes.has(nodeId)) {
                            nodes.push({
                                id: nodeId,
                                label: book.title || `Book ${bookId}`,
                                group: 'book',
                                level: 1,
                                value: Math.min(10 + count * 2, 25),
                                title: `${book.title}<br>Borrowed ${count} time(s)<br>Total borrows: ${book.transactions?.length || count}`,
                                shape: 'square'
                            });
                            processedNodes.add(nodeId);
                        }
                        
                        edges.push({
                            from: `borrower-${borrowerName}`,
                            to: nodeId,
                            value: count,
                            title: `${count} transaction(s)`,
                            color: { color: '#94A3B8' }
                        });
                    }
                });

                // If depth = 2, add other borrowers who read the same books
                if (depth === 2) {
                    const relatedBorrowers = new Map();
                    
                    Object.keys(bookCounts).forEach(bookId => {
                        const book = AppState.bookIndex.get(parseInt(bookId));
                        if (book && book.transactions) {
                            book.transactions.forEach(t => {
                                if (t.borrower_name && t.borrower_name !== borrowerName) {
                                    const count = relatedBorrowers.get(t.borrower_name) || 0;
                                    relatedBorrowers.set(t.borrower_name, count + 1);
                                }
                            });
                        }
                    });

                    // Add top related borrowers
                    const topRelated = Array.from(relatedBorrowers.entries())
                        .sort((a, b) => b[1] - a[1])
                        .slice(0, 20);

                    topRelated.forEach(([relatedBorrowerName, sharedBooks]) => {
                        const otherNodeId = `borrower-${relatedBorrowerName}`;
                        if (!processedNodes.has(otherNodeId)) {
                            const otherBorrower = AppState.borrowerIndex.get(relatedBorrowerName);
                            nodes.push({
                                id: otherNodeId,
                                label: relatedBorrowerName,
                                group: 'borrower',
                                level: 2,
                                value: Math.min(5 + sharedBooks, 15),
                                title: `${relatedBorrowerName}<br>Shared books: ${sharedBooks}`,
                                color: otherBorrower?.gender === 'W' ?
                                    { background: '#F9A8D4', border: '#EC4899' } :
                                    { background: '#86EFAC', border: '#4ADE80' }
                            });
                            processedNodes.add(otherNodeId);
                        }

                        // Connect through shared books
                        Object.keys(bookCounts).forEach(bookId => {
                            const book = AppState.bookIndex.get(parseInt(bookId));
                            if (book?.transactions?.some(t => t.borrower_name === relatedBorrowerName)) {
                                const bookNodeId = `book-${bookId}`;
                                // Check if edge already exists
                                const edgeExists = edges.some(e => 
                                    (e.from === otherNodeId && e.to === bookNodeId)
                                );
                                if (!edgeExists) {
                                    edges.push({
                                        from: otherNodeId,
                                        to: bookNodeId,
                                        value: 1,
                                        dashes: true,
                                        color: { color: '#E2E8F0' }
                                    });
                                }
                            }
                        });
                    });
                }
            }

            return { nodes, edges };
        }

        static createEgoNetwork(networkData, centralId, entityType, containerId) {
            const container = document.getElementById(containerId);
            if (!container) return;

            // Destroy existing instance if it exists
            if (egoNetworkInstance) {
                egoNetworkInstance.destroy();
                egoNetworkInstance = null;
            }

            const data = {
                nodes: new vis.DataSet(networkData.nodes),
                edges: new vis.DataSet(networkData.edges)
            };

            const options = {
                nodes: {
                    shape: 'dot',
                    scaling: {
                        min: 10,
                        max: 40,
                        label: { 
                            enabled: true,
                            min: 12,
                            max: 20
                        }
                    },
                    font: { 
                        size: 12, 
                        face: 'Inter',
                        strokeWidth: 2,
                        strokeColor: '#ffffff'
                    }
                },
                groups: {
                    book: { 
                        color: { background: '#93C5FD', border: '#3B82F6' },
                        shape: 'square'
                    },
                    borrower: { 
                        color: { background: '#86EFAC', border: '#10B981' },
                        shape: 'dot'
                    }
                },
                edges: {
                    smooth: {
                        type: 'cubicBezier',
                        forceDirection: 'none',
                        roundness: 0.5
                    },
                    scaling: {
                        min: 1,
                        max: 5
                    }
                },
                physics: {
                    enabled: true,
                    solver: 'forceAtlas2Based',
                    forceAtlas2Based: {
                        gravitationalConstant: -50,
                        centralGravity: 0.01,
                        springLength: 100,
                        springConstant: 0.08,
                        damping: 0.4,
                        avoidOverlap: 0.5
                    },
                    stabilization: {
                        enabled: true,
                        iterations: 200,
                        updateInterval: 10
                    }
                },
                layout: {
                    improvedLayout: true,
                    randomSeed: 42
                },
                interaction: {
                    hover: true,
                    tooltipDelay: 200,
                    zoomView: true,
                    dragNodes: true,
                    navigationButtons: true,
                    keyboard: {
                        enabled: true,
                        speed: { x: 10, y: 10, zoom: 0.02 }
                    }
                }
            };

            egoNetworkInstance = new vis.Network(container, data, options);

            // Click handler to navigate to entity
            egoNetworkInstance.on("click", (params) => {
                if (params.nodes.length > 0) {
                    const nodeId = params.nodes[0];
                    // Don't navigate if clicking the central node
                    if (nodeId === `${entityType}-${centralId}`) return;
                    
                    if (nodeId.startsWith('book-')) {
                        const bookId = parseInt(nodeId.split('-')[1]);
                        window.StrashunViews.BookView.showDetail(bookId);
                    } else if (nodeId.startsWith('borrower-')) {
                        const borrowerName = nodeId.substring(9);
                        window.StrashunViews.BorrowerView.showDetail(borrowerName);
                    }
                }
            });

            // Double click to show ego network of clicked node
            egoNetworkInstance.on("doubleClick", (params) => {
                if (params.nodes.length > 0) {
                    const nodeId = params.nodes[0];
                    if (nodeId === `${entityType}-${centralId}`) return;
                    
                    if (nodeId.startsWith('book-')) {
                        const bookId = parseInt(nodeId.split('-')[1]);
                        this.renderInContainer(bookId, 'book', containerId.replace('ego-network-graph-', ''));
                    } else if (nodeId.startsWith('borrower-')) {
                        const borrowerName = nodeId.substring(9);
                        this.renderInContainer(borrowerName, 'borrower', containerId.replace('ego-network-graph-', ''));
                    }
                }
            });

            // Focus on central node after stabilization
            egoNetworkInstance.once('stabilizationIterationsDone', () => {
                egoNetworkInstance.focus(`${entityType}-${centralId}`, {
                    scale: 1.5,
                    animation: {
                        duration: 1000,
                        easingFunction: 'easeInOutQuad'
                    }
                });
            });

            // Add legend
            egoNetworkInstance.on('afterDrawing', (ctx) => {
                ctx.font = '12px Inter';
                ctx.fillStyle = '#4A5568';
                ctx.fillText('Click: View details | Double-click: Show ego network', 10, container.offsetHeight - 10);
            });
        }
    }

    // --- Timeline View ---
    class TimelineView {
        static init() {
            ['timeline-granularity', 'timeline-metric', 'timeline-refresh'].forEach(id => {
                document.getElementById(id)?.addEventListener('change', () => this.render());
            });
        }
        
        static render() {
            const granularity = document.getElementById('timeline-granularity')?.value || 'yearly';
            const metric = document.getElementById('timeline-metric')?.value || 'total';
            
            const data = granularity === 'yearly' ? 
                this.getYearlyData(metric) : 
                this.getPeriodData(metric);
            
            if (!data || data.labels.length === 0) {
                document.getElementById('timeline-chart').innerHTML = 
                    '<p class="text-center text-gray-500 p-8">No timeline data available.</p>';
                return;
            }

            if (window.timelineChart) {
                window.timelineChart.destroy();
            }

            const ctx = document.getElementById('timeline-chart')?.getContext('2d');
            if (!ctx) return;

            window.timelineChart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: data.labels,
                    datasets: [{
                        label: this.getMetricLabel(metric),
                        data: data.values,
                        borderColor: 'rgba(59, 130, 246, 1)',
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        tension: 0.3,
                        fill: true,
                        pointRadius: 5,
                        pointHoverRadius: 7,
                        pointBackgroundColor: 'rgba(59, 130, 246, 1)',
                        pointBorderColor: '#fff',
                        pointBorderWidth: 2
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: true },
                        tooltip: {
                            callbacks: {
                                label: (context) => {
                                    const label = context.dataset.label || '';
                                    const value = context.parsed.y;
                                    if (metric === 'gender') {
                                        return `${label}: ${value.toFixed(1)}% female`;
                                    }
                                    return `${label}: ${value}`;
                                }
                            }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                callback: function(value) {
                                    if (metric === 'gender') return value + '%';
                                    return value;
                                }
                            }
                        }
                    }
                }
            });
        }
        
        static getYearlyData(metric) {
            const transactions = AppState.libraryData.transactions;
            if (!transactions) return null;
            
            const yearMap = new Map();
            
            transactions.forEach(t => {
                if (!t.date) return;
                const year = new Date(t.date).getFullYear();
                if (isNaN(year)) return;
                
                if (!yearMap.has(year)) {
                    yearMap.set(year, { total: 0, female: 0, unique_borrowers: new Set(), unique_books: new Set() });
                }
                
                const yearData = yearMap.get(year);
                yearData.total++;
                if (t.gender === 'W') yearData.female++;
                yearData.unique_borrowers.add(t.borrower_name);
                yearData.unique_books.add(t.book_id);
            });
            
            const sortedYears = Array.from(yearMap.keys()).sort();
            const values = sortedYears.map(year => {
                const data = yearMap.get(year);
                return this.calculateMetricValue(data, metric);
            });
            
            return { labels: sortedYears, values };
        }
        
        static getPeriodData(metric) {
            const periods = [
                { label: '1902', filter: t => new Date(t.date).getFullYear() === 1902 },
                { label: '1903-1904', filter: t => [1903, 1904].includes(new Date(t.date).getFullYear()) },
                { label: '1934', filter: t => new Date(t.date).getFullYear() === 1934 },
                { label: '1940', filter: t => new Date(t.date).getFullYear() === 1940 }
            ];
            
            const values = periods.map(period => this.calculatePeriodMetric(period, metric));
            const labels = periods.map(p => p.label);
            
            return { labels, values };
        }

        static calculatePeriodMetric(period, metric) {
            const transactions = AppState.libraryData.transactions;
            if (!transactions) return 0;
            
            const periodTransactions = transactions.filter(period.filter);
            const data = {
                total: periodTransactions.length,
                female: periodTransactions.filter(t => t.gender === 'W').length,
                unique_borrowers: new Set(periodTransactions.map(t => t.borrower_name)),
                unique_books: new Set(periodTransactions.map(t => t.book_id))
            };
            
            return this.calculateMetricValue(data, metric);
        }
        
        static calculateMetricValue(data, metric) {
            switch(metric) {
                case 'total': return data.total;
                case 'unique_borrowers': return data.unique_borrowers.size;
                case 'unique_books': return data.unique_books.size;
                case 'gender': return data.total > 0 ? (data.female / data.total * 100) : 0;
                default: return data.total;
            }
        }
        
        static getMetricLabel(metric) {
            const labels = {
                'total': 'Total Transactions',
                'unique_borrowers': 'Unique Borrowers',
                'unique_books': 'Unique Books',
                'gender': 'Female Borrowers (%)'
            };
            return labels[metric] || 'Transactions';
        }
    }

    // --- Main Initialization ---
    document.addEventListener('DOMContentLoaded', async () => {
        if (!window.StrashunCore || !window.StrashunViews) {
            console.error('Core or Views modules not loaded!');
            return;
        }

        const success = await window.StrashunCore.DataManager.loadData();
        if (!success) return;

        // Initialize all managers
        window.StrashunViews.NavigationManager.init();
        window.StrashunViews.BookView.init();
        window.StrashunViews.BorrowerView.init();
        NetworkView.init();
        TimelineView.init();
        EgoNetworkView.init(); // NEW

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
        ChartManager,
        DashboardView,
        NetworkView,
        TimelineView,
        EgoNetworkView // NEW
    };
})();