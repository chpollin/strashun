// =================================================================================
// ego-network.js - Ego-Network Visualization for Sparse Historical Data
// Handles individual-centered network views for books and borrowers
// =================================================================================

(function() {
    'use strict';

    class EgoNetworkVisualization {
        constructor() {
            this.instance = null;
            this.currentEntityId = null;
            this.currentEntityType = null;
            this.currentDepth = 1;
            this.container = null;
        }

        /**
         * Initialize ego network functionality
         */
        init() {
            // Handle ego network buttons throughout the app
            document.addEventListener('click', (e) => {
                // Handle ego network toggle buttons
                if (e.target.closest('.ego-network-btn')) {
                    e.preventDefault();
                    e.stopPropagation();
                    const btn = e.target.closest('.ego-network-btn');
                    const entityType = btn.dataset.entityType;
                    const entityId = btn.dataset.entityId;
                    
                    // Check if we're in detail view or list view
                    const detailView = document.getElementById('detail-view');
                    if (detailView && detailView.classList.contains('active')) {
                        this.toggleInlineView(entityType, entityId);
                    } else {
                        this.showInModal(entityId, entityType);
                    }
                }

                // Handle depth toggle buttons
                if (e.target.closest('.ego-depth-btn')) {
                    const btn = e.target.closest('.ego-depth-btn');
                    const depth = parseInt(btn.dataset.depth);
                    const entityId = btn.dataset.entityId;
                    const entityType = btn.dataset.entityType;
                    const containerId = btn.dataset.container;
                    this.renderInContainer(entityId, entityType, containerId, depth);
                }

                // Handle close buttons
                if (e.target.closest('#close-ego-network')) {
                    this.hideInlineView();
                }

                if (e.target.closest('#close-ego-modal')) {
                    this.closeModal();
                }
            });

            // Handle escape key
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    const modal = document.getElementById('ego-network-modal');
                    if (modal && modal.style.display !== 'none') {
                        this.closeModal();
                    }
                }
            });
        }

        /**
         * Toggle inline ego network view (in detail page)
         */
        toggleInlineView(entityType, entityId) {
            const container = document.getElementById('ego-network-container');
            if (!container) {
                console.error('Ego network container not found');
                return;
            }
            
            if (container.style.display === 'none' || !container.style.display) {
                container.style.display = 'block';
                this.render(entityId, entityType);
            } else {
                this.hideInlineView();
            }
        }

        /**
         * Hide inline ego network view
         */
        hideInlineView() {
            const container = document.getElementById('ego-network-container');
            if (container) {
                container.style.display = 'none';
                if (this.instance) {
                    this.instance.destroy();
                    this.instance = null;
                }
            }
        }

        /**
         * Show ego network in modal
         */
        showInModal(entityId, entityType) {
            // Create or get modal
            let modal = document.getElementById('ego-network-modal');
            if (!modal) {
                modal = this.createModal();
            }

            // Get entity name for title
            const entityName = this.getEntityName(entityId, entityType);

            modal.innerHTML = `
                <div class="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
                    <div class="p-4 border-b flex justify-between items-center bg-gradient-to-r from-blue-50 to-green-50">
                        <div>
                            <h3 class="text-xl font-semibold">Ego Network View</h3>
                            <p class="text-sm text-gray-600 mt-1">${entityName}</p>
                        </div>
                        <button id="close-ego-modal" class="text-gray-500 hover:text-gray-700 transition-colors">
                            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                            </svg>
                        </button>
                    </div>
                    <div id="ego-modal-content" class="p-4 overflow-y-auto" style="max-height: calc(90vh - 100px);">
                        <div class="text-center p-8">
                            <div class="spinner w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                            <p class="text-gray-600">Loading network connections...</p>
                        </div>
                    </div>
                </div>
            `;

            modal.style.display = 'flex';
            
            // Add event listeners
            document.getElementById('close-ego-modal')?.addEventListener('click', () => this.closeModal());
            modal.addEventListener('click', (e) => {
                if (e.target === modal) this.closeModal();
            });

            // Render network
            setTimeout(() => {
                this.renderInContainer(entityId, entityType, 'ego-modal-content');
            }, 100);
        }

        /**
         * Close modal
         */
        closeModal() {
            const modal = document.getElementById('ego-network-modal');
            if (modal) {
                modal.style.display = 'none';
                if (this.instance) {
                    this.instance.destroy();
                    this.instance = null;
                }
            }
        }

        /**
         * Create modal element
         */
        createModal() {
            const modal = document.createElement('div');
            modal.id = 'ego-network-modal';
            modal.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4';
            modal.style.display = 'none';
            document.body.appendChild(modal);
            return modal;
        }

        /**
         * Main render method for inline view
         */
        render(entityId, entityType, depth = 1) {
            this.renderInContainer(entityId, entityType, 'ego-network-container', depth);
        }

        /**
         * Render in any container
         */
        renderInContainer(entityId, entityType, containerId, depth = 1) {
            const container = document.getElementById(containerId);
            if (!container) return;

            // Store current state
            this.currentEntityId = entityId;
            this.currentEntityType = entityType;
            this.currentDepth = depth;
            this.container = container;

            // Get network data
            const networkData = entityType === 'book' ? 
                this.getBookEgoNetwork(entityId, depth) :
                this.getBorrowerEgoNetwork(entityId, depth);

            if (!networkData || networkData.nodes.length === 0) {
                container.innerHTML = `
                    <div class="text-center p-8">
                        <svg class="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                        <p class="text-gray-500">No network connections found</p>
                    </div>`;
                return;
            }

            // Calculate stats
            const stats = this.calculateNetworkStats(networkData);

            // Build container content
            container.innerHTML = `
                <div class="mb-4">
                    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                        <div>
                            <h3 class="text-lg font-semibold mb-1">
                                ${entityType === 'book' ? '📚 Book' : '👤 Borrower'} Network
                            </h3>
                            <div class="flex flex-wrap gap-3 text-sm text-gray-600">
                                <span>📊 ${networkData.nodes.length} nodes</span>
                                <span>🔗 ${networkData.edges.length} connections</span>
                                ${depth === 2 ? '<span class="text-blue-600">Including 2nd degree</span>' : ''}
                            </div>
                        </div>
                        ${containerId === 'ego-network-container' ? `
                            <button id="close-ego-network" class="text-gray-500 hover:text-gray-700 transition-colors p-2">
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                                </svg>
                            </button>
                        ` : ''}
                    </div>
                    
                    <!-- Controls -->
                    <div class="flex flex-wrap items-center gap-3">
                        <div class="flex gap-2">
                            <button class="ego-depth-btn px-3 py-1.5 text-sm rounded-md transition-colors ${depth === 1 ? 'bg-blue-500 text-white' : 'bg-gray-100 hover:bg-gray-200'}" 
                                    data-depth="1" data-entity-id="${entityId}" data-entity-type="${entityType}" data-container="${containerId}">
                                Direct only
                            </button>
                            <button class="ego-depth-btn px-3 py-1.5 text-sm rounded-md transition-colors ${depth === 2 ? 'bg-blue-500 text-white' : 'bg-gray-100 hover:bg-gray-200'}" 
                                    data-depth="2" data-entity-id="${entityId}" data-entity-type="${entityType}" data-container="${containerId}">
                                Include 2nd degree
                            </button>
                        </div>
                        
                        <div class="flex gap-4 text-sm">
                            <span class="flex items-center">
                                <span class="w-3 h-3 bg-blue-400 inline-block mr-1 rounded-sm"></span>
                                Books (${stats.bookCount})
                            </span>
                            <span class="flex items-center">
                                <span class="w-3 h-3 bg-green-400 rounded-full inline-block mr-1"></span>
                                Borrowers (${stats.borrowerCount})
                            </span>
                            ${stats.femaleCount > 0 ? `
                                <span class="flex items-center">
                                    <span class="w-3 h-3 bg-pink-400 rounded-full inline-block mr-1"></span>
                                    Female (${stats.femaleCount})
                                </span>
                            ` : ''}
                        </div>
                    </div>
                    
                    ${depth === 2 && stats.secondDegreeCount > 0 ? `
                        <div class="mt-2 text-xs text-gray-500">
                            💡 Showing ${stats.firstDegreeCount} direct + ${stats.secondDegreeCount} indirect connections
                        </div>
                    ` : ''}
                </div>
                
                <div id="ego-network-graph-${containerId}" class="border border-gray-200 rounded-lg bg-gradient-to-br from-gray-50 to-white" style="height: 500px;"></div>
                
                <div class="mt-3 text-xs text-gray-500 text-center">
                    Click nodes to view details • Double-click to explore their network • Drag to rearrange
                </div>
            `;

            // Create the network visualization
            this.createNetworkVisualization(networkData, entityId, entityType, `ego-network-graph-${containerId}`);
        }

        /**
         * Calculate network statistics
         */
        calculateNetworkStats(networkData) {
            const stats = {
                bookCount: 0,
                borrowerCount: 0,
                femaleCount: 0,
                firstDegreeCount: 0,
                secondDegreeCount: 0
            };

            networkData.nodes.forEach(node => {
                if (node.group === 'book') stats.bookCount++;
                if (node.group === 'borrower') {
                    stats.borrowerCount++;
                    if (node.gender === 'W') stats.femaleCount++;
                }
                if (node.level === 1) stats.firstDegreeCount++;
                if (node.level === 2) stats.secondDegreeCount++;
            });

            return stats;
        }

        /**
         * Get entity display name
         */
        getEntityName(entityId, entityType) {
            if (!window.StrashunCore?.AppState) return `${entityType} ${entityId}`;
            
            const { AppState } = window.StrashunCore;
            
            if (entityType === 'book') {
                const book = AppState.bookIndex.get(parseInt(entityId));
                return book ? (book.title || `Book ${entityId}`) : `Book ${entityId}`;
            } else {
                return entityId; // Borrower name is the ID
            }
        }

        /**
         * Get book ego network data
         */
        getBookEgoNetwork(bookId, depth = 1) {
            if (!window.StrashunCore?.AppState) return null;
            
            const { AppState } = window.StrashunCore;
            const book = AppState.bookIndex.get(parseInt(bookId));
            if (!book) return null;

            const nodes = [];
            const edges = [];
            const processedNodes = new Set();

            // Add central book node (enhanced styling)
            nodes.push({
                id: `book-${bookId}`,
                label: this.truncateLabel(book.title || `Book ${bookId}`),
                group: 'book',
                level: 0,
                value: 35,
                color: { 
                    background: '#2563EB', 
                    border: '#1D4ED8',
                    highlight: { background: '#1D4ED8', border: '#1E40AF' }
                },
                font: { 
                    size: 16, 
                    color: '#ffffff', 
                    strokeWidth: 3, 
                    strokeColor: '#1D4ED8',
                    bold: true
                },
                shape: 'square',
                borderWidth: 3,
                title: this.createTooltip('book', book)
            });
            processedNodes.add(`book-${bookId}`);

            // Add borrowers
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
                            label: this.truncateLabel(borrowerName),
                            group: 'borrower',
                            gender: borrower?.gender,
                            level: 1,
                            value: Math.min(15 + count * 3, 30),
                            color: this.getBorrowerColor(borrower?.gender),
                            shape: 'dot',
                            borderWidth: 2,
                            title: this.createTooltip('borrower', borrower, { borrowCount: count })
                        });
                        processedNodes.add(nodeId);
                    }
                    
                    edges.push({
                        from: nodeId,
                        to: `book-${bookId}`,
                        value: Math.min(count * 2, 8),
                        title: `${count} transaction${count > 1 ? 's' : ''}`,
                        color: { 
                            color: count > 2 ? '#60A5FA' : '#CBD5E0',
                            highlight: '#2563EB'
                        },
                        smooth: { type: 'curvedCW', roundness: 0.2 }
                    });
                });

                // Add second degree connections if requested
                if (depth === 2) {
                    this.addSecondDegreeBooks(borrowerCounts, bookId, nodes, edges, processedNodes, AppState);
                }
            }

            return { nodes, edges };
        }

        /**
         * Get borrower ego network data
         */
        getBorrowerEgoNetwork(borrowerName, depth = 1) {
            if (!window.StrashunCore?.AppState) return null;
            
            const { AppState } = window.StrashunCore;
            const borrower = AppState.borrowerIndex.get(borrowerName);
            if (!borrower) return null;

            const nodes = [];
            const edges = [];
            const processedNodes = new Set();

            // Add central borrower node
            nodes.push({
                id: `borrower-${borrowerName}`,
                label: this.truncateLabel(borrowerName),
                group: 'borrower',
                gender: borrower.gender,
                level: 0,
                value: 35,
                color: this.getCentralBorrowerColor(borrower.gender),
                font: { 
                    size: 16, 
                    color: '#ffffff', 
                    strokeWidth: 3,
                    bold: true
                },
                shape: 'dot',
                borderWidth: 3,
                title: this.createTooltip('borrower', borrower)
            });
            processedNodes.add(`borrower-${borrowerName}`);

            // Add books
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
                                label: this.truncateLabel(book.title || `Book ${bookId}`),
                                group: 'book',
                                level: 1,
                                value: Math.min(15 + count * 3, 30),
                                color: { 
                                    background: '#60A5FA', 
                                    border: '#3B82F6',
                                    highlight: { background: '#3B82F6', border: '#2563EB' }
                                },
                                shape: 'square',
                                borderWidth: 2,
                                title: this.createTooltip('book', book, { borrowCount: count })
                            });
                            processedNodes.add(nodeId);
                        }
                        
                        edges.push({
                            from: `borrower-${borrowerName}`,
                            to: nodeId,
                            value: Math.min(count * 2, 8),
                            title: `Borrowed ${count} time${count > 1 ? 's' : ''}`,
                            color: { 
                                color: count > 1 ? '#60A5FA' : '#CBD5E0',
                                highlight: '#2563EB'
                            },
                            smooth: { type: 'curvedCW', roundness: 0.2 }
                        });
                    }
                });

                // Add second degree connections if requested
                if (depth === 2) {
                    this.addSecondDegreeBorrowers(bookCounts, borrowerName, nodes, edges, processedNodes, AppState);
                }
            }

            return { nodes, edges };
        }

        /**
         * Add second degree books (other books read by the same borrowers)
         */
        addSecondDegreeBooks(borrowerCounts, centralBookId, nodes, edges, processedNodes, AppState) {
            const relatedBooks = new Map();
            
            // Find other books these borrowers read
            Object.keys(borrowerCounts).forEach(borrowerName => {
                const borrower = AppState.borrowerIndex.get(borrowerName);
                if (borrower?.transactions) {
                    borrower.transactions.forEach(t => {
                        if (t.book_id && t.book_id != centralBookId) {
                            const count = relatedBooks.get(t.book_id) || 0;
                            relatedBooks.set(t.book_id, count + 1);
                        }
                    });
                }
            });

            // Add top related books (limit for clarity)
            const topRelated = Array.from(relatedBooks.entries())
                .sort((a, b) => b[1] - a[1])
                .slice(0, 15);

            topRelated.forEach(([relatedBookId, sharedReaders]) => {
                const otherBook = AppState.bookIndex.get(relatedBookId);
                if (otherBook) {
                    const otherNodeId = `book-${relatedBookId}`;
                    if (!processedNodes.has(otherNodeId)) {
                        nodes.push({
                            id: otherNodeId,
                            label: this.truncateLabel(otherBook.title || `Book ${relatedBookId}`),
                            group: 'book',
                            level: 2,
                            value: Math.min(8 + sharedReaders * 2, 20),
                            color: { 
                                background: '#BFDBFE', 
                                border: '#93C5FD',
                                highlight: { background: '#93C5FD', border: '#60A5FA' }
                            },
                            shape: 'square',
                            borderWidth: 1,
                            title: this.createTooltip('book', otherBook, { sharedReaders })
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
                                color: { color: '#E5E7EB', highlight: '#9CA3AF' },
                                smooth: { type: 'curvedCW', roundness: 0.4 }
                            });
                        }
                    });
                }
            });
        }

        /**
         * Add second degree borrowers (other readers of the same books)
         */
        addSecondDegreeBorrowers(bookCounts, centralBorrowerName, nodes, edges, processedNodes, AppState) {
            const relatedBorrowers = new Map();
            
            // Find other borrowers who read the same books
            Object.keys(bookCounts).forEach(bookId => {
                const book = AppState.bookIndex.get(parseInt(bookId));
                if (book?.transactions) {
                    book.transactions.forEach(t => {
                        if (t.borrower_name && t.borrower_name !== centralBorrowerName) {
                            const count = relatedBorrowers.get(t.borrower_name) || 0;
                            relatedBorrowers.set(t.borrower_name, count + 1);
                        }
                    });
                }
            });

            // Add top related borrowers
            const topRelated = Array.from(relatedBorrowers.entries())
                .sort((a, b) => b[1] - a[1])
                .slice(0, 15);

            topRelated.forEach(([relatedBorrowerName, sharedBooks]) => {
                const otherNodeId = `borrower-${relatedBorrowerName}`;
                if (!processedNodes.has(otherNodeId)) {
                    const otherBorrower = AppState.borrowerIndex.get(relatedBorrowerName);
                    nodes.push({
                        id: otherNodeId,
                        label: this.truncateLabel(relatedBorrowerName),
                        group: 'borrower',
                        gender: otherBorrower?.gender,
                        level: 2,
                        value: Math.min(8 + sharedBooks * 2, 20),
                        color: this.getSecondaryBorrowerColor(otherBorrower?.gender),
                        shape: 'dot',
                        borderWidth: 1,
                        title: this.createTooltip('borrower', otherBorrower, { sharedBooks })
                    });
                    processedNodes.add(otherNodeId);
                }

                // Connect through shared books
                Object.keys(bookCounts).forEach(bookId => {
                    const book = AppState.bookIndex.get(parseInt(bookId));
                    if (book?.transactions?.some(t => t.borrower_name === relatedBorrowerName)) {
                        const bookNodeId = `book-${bookId}`;
                        const edgeExists = edges.some(e => 
                            (e.from === otherNodeId && e.to === bookNodeId)
                        );
                        if (!edgeExists) {
                            edges.push({
                                from: otherNodeId,
                                to: bookNodeId,
                                value: 1,
                                dashes: true,
                                color: { color: '#E5E7EB', highlight: '#9CA3AF' },
                                smooth: { type: 'curvedCW', roundness: 0.4 }
                            });
                        }
                    }
                });
            });
        }

        /**
         * Create network visualization using vis.js
         */
        createNetworkVisualization(networkData, centralId, entityType, containerId) {
            const container = document.getElementById(containerId);
            if (!container) return;

            // Destroy existing instance
            if (this.instance) {
                this.instance.destroy();
                this.instance = null;
            }

            const data = {
                nodes: new vis.DataSet(networkData.nodes),
                edges: new vis.DataSet(networkData.edges)
            };

            const options = {
                nodes: {
                    shape: 'dot',
                    scaling: {
                        min: 12,
                        max: 45,
                        label: { 
                            enabled: true,
                            min: 11,
                            max: 18
                        }
                    },
                    font: { 
                        size: 13, 
                        face: 'Inter, sans-serif',
                        strokeWidth: 2,
                        strokeColor: '#ffffff'
                    },
                    shadow: {
                        enabled: true,
                        color: 'rgba(0,0,0,0.1)',
                        size: 10,
                        x: 3,
                        y: 3
                    }
                },
                edges: {
                    smooth: {
                        enabled: true,
                        type: 'dynamic',
                        forceDirection: 'none'
                    },
                    scaling: {
                        min: 1,
                        max: 8
                    },
                    shadow: {
                        enabled: false
                    }
                },
                physics: {
                    enabled: true,
                    solver: 'forceAtlas2Based',
                    forceAtlas2Based: {
                        gravitationalConstant: -60,
                        centralGravity: 0.015,
                        springLength: 120,
                        springConstant: 0.08,
                        damping: 0.4,
                        avoidOverlap: 0.8
                    },
                    stabilization: {
                        enabled: true,
                        iterations: 200,
                        updateInterval: 25,
                        fit: true
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
                    navigationButtons: false,
                    keyboard: {
                        enabled: true,
                        speed: { x: 10, y: 10, zoom: 0.02 }
                    }
                }
            };

            this.instance = new vis.Network(container, data, options);

            // Event handlers
            this.setupEventHandlers(centralId, entityType);

            // Focus on central node after stabilization
            this.instance.once('stabilizationIterationsDone', () => {
                this.instance.focus(`${entityType}-${centralId}`, {
                    scale: 1.2,
                    animation: {
                        duration: 800,
                        easingFunction: 'easeInOutQuad'
                    }
                });
            });
        }

        /**
         * Setup event handlers for the network
         */
        setupEventHandlers(centralId, entityType) {
            if (!this.instance) return;

            // Click to navigate to detail view
            this.instance.on("click", (params) => {
                if (params.nodes.length > 0) {
                    const nodeId = params.nodes[0];
                    // Don't navigate if clicking the central node
                    if (nodeId === `${entityType}-${centralId}`) return;
                    
                    if (nodeId.startsWith('book-')) {
                        const bookId = parseInt(nodeId.split('-')[1]);
                        if (window.StrashunViews?.BookView) {
                            window.StrashunViews.BookView.showDetail(bookId);
                        }
                    } else if (nodeId.startsWith('borrower-')) {
                        const borrowerName = nodeId.substring(9);
                        if (window.StrashunViews?.BorrowerView) {
                            window.StrashunViews.BorrowerView.showDetail(borrowerName);
                        }
                    }
                }
            });

            // Double click to show ego network of clicked node
            this.instance.on("doubleClick", (params) => {
                if (params.nodes.length > 0) {
                    const nodeId = params.nodes[0];
                    if (nodeId === `${entityType}-${centralId}`) return;
                    
                    if (nodeId.startsWith('book-')) {
                        const bookId = parseInt(nodeId.split('-')[1]);
                        const newContainer = this.container.id;
                        this.renderInContainer(bookId, 'book', newContainer, this.currentDepth);
                    } else if (nodeId.startsWith('borrower-')) {
                        const borrowerName = nodeId.substring(9);
                        const newContainer = this.container.id;
                        this.renderInContainer(borrowerName, 'borrower', newContainer, this.currentDepth);
                    }
                }
            });

            // Hover effects
            this.instance.on("hoverNode", () => {
                container.style.cursor = 'pointer';
            });

            this.instance.on("blurNode", () => {
                container.style.cursor = 'default';
            });
        }

        /**
         * Helper: Truncate long labels
         */
        truncateLabel(label, maxLength = 25) {
            if (!label) return '';
            return label.length > maxLength ? label.substring(0, maxLength - 2) + '...' : label;
        }

        /**
         * Helper: Create tooltip content
         */
        createTooltip(type, entity, extra = {}) {
            if (type === 'book') {
                const parts = [
                    `<b>${entity?.title || 'Unknown Title'}</b>`,
                    entity?.author ? `Author: ${entity.author}` : null,
                    entity?.language ? `Language: ${entity.language}` : null,
                    entity?.transactions ? `Total borrows: ${entity.transactions.length}` : null,
                    extra.borrowCount ? `This reader: ${extra.borrowCount} time(s)` : null,
                    extra.sharedReaders ? `Shared readers: ${extra.sharedReaders}` : null
                ].filter(Boolean);
                return parts.join('<br>');
            } else {
                const parts = [
                    `<b>${entity?.borrower_name || 'Unknown'}</b>`,
                    entity?.gender === 'W' ? 'Female' : entity?.gender === 'M' ? 'Male' : null,
                    entity?.transactions ? `Total books: ${entity.transactions.length}` : null,
                    extra.borrowCount ? `Borrowed ${extra.borrowCount} time(s)` : null,
                    extra.sharedBooks ? `Books in common: ${extra.sharedBooks}` : null
                ].filter(Boolean);
                return parts.join('<br>');
            }
        }

        /**
         * Helper: Get borrower node colors based on gender
         */
        getBorrowerColor(gender) {
            if (gender === 'W') {
                return { 
                    background: '#F9A8D4', 
                    border: '#EC4899',
                    highlight: { background: '#EC4899', border: '#DB2777' }
                };
            }
            return { 
                background: '#86EFAC', 
                border: '#22C55E',
                highlight: { background: '#22C55E', border: '#16A34A' }
            };
        }

        getCentralBorrowerColor(gender) {
            if (gender === 'W') {
                return { 
                    background: '#EC4899', 
                    border: '#DB2777',
                    highlight: { background: '#DB2777', border: '#BE185D' }
                };
            }
            return { 
                background: '#10B981', 
                border: '#059669',
                highlight: { background: '#059669', border: '#047857' }
            };
        }

        getSecondaryBorrowerColor(gender) {
            if (gender === 'W') {
                return { 
                    background: '#FBCFE8', 
                    border: '#F9A8D4',
                    highlight: { background: '#F9A8D4', border: '#EC4899' }
                };
            }
            return { 
                background: '#BBF7D0', 
                border: '#86EFAC',
                highlight: { background: '#86EFAC', border: '#4ADE80' }
            };
        }

        /**
         * Destroy the visualization instance
         */
        destroy() {
            if (this.instance) {
                this.instance.destroy();
                this.instance = null;
            }
            this.currentEntityId = null;
            this.currentEntityType = null;
            this.currentDepth = 1;
            this.container = null;
        }
    }

    // Create and export singleton instance
    window.EgoNetwork = new EgoNetworkVisualization();
})();