// =================================================================================
// Strashun Library Digital Interface - Main JavaScript File
// =================================================================================

document.addEventListener('DOMContentLoaded', () => {
    // --- Global State ---
    let libraryData = {}; // Will hold all books, borrowers, and transactions
    let charts = {}; // To hold chart instances for easy updates/destruction
    let network = null; // To hold the Vis.js network instance
    let lastView = 'dashboard'; // To track the last active list view for the back button

    // --- Application Initialization ---
    const initApp = async () => {
        try {
            // NOTE: The data file should be in the same directory as index.html for GitHub Pages deployment.
            const response = await fetch('../data/library_data.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            libraryData = await response.json();

            // Process data to add convenience properties
            processData();
            
            // Setup UI components and event listeners
            setupEventListeners();
            
            // Initial render of all components
            renderDashboard();
            renderBooks();
            renderBorrowers();
            // Network rendering is deferred until its view is activated for performance
            
            // Hide loading spinner and show the main content
            document.getElementById('loading-spinner').style.display = 'none';
            navigateTo('dashboard');

        } catch (error) {
            console.error("Failed to load and initialize the application:", error);
            document.getElementById('loading-spinner').innerHTML = `<p class="text-red-500">Failed to load library data. Please check the console for errors.</p>`;
        }
    };

    // --- Data Processing ---
    const processData = () => {
        // Create maps for quick lookups
        const bookMap = new Map(libraryData.books.map(b => [b.id, b]));
        const borrowerMap = new Map(libraryData.borrowers.map(b => [b.name, b]));

        // Augment books with transaction details and borrower names
        libraryData.books.forEach(book => {
            book.transactions = book.transaction_ids.map(tid => 
                libraryData.transactions.find(t => t.transaction_id === tid)
            ).filter(Boolean); // Filter out any undefined transactions
            book.borrowerNames = [...new Set(book.transactions.map(t => t.borrower_name))];
        });

        // Augment borrowers with transaction details and book titles
        libraryData.borrowers.forEach(borrower => {
            borrower.transactions = borrower.transaction_ids.map(tid => 
                libraryData.transactions.find(t => t.transaction_id === tid)
            ).filter(Boolean);
            borrower.bookIds = [...new Set(borrower.transactions.map(t => t.book_id))];
            borrower.books = borrower.bookIds.map(id => bookMap.get(id)).filter(Boolean);
        });
    };

    // --- Navigation ---
    const navigateTo = (viewId) => {
        // Hide all views
        document.querySelectorAll('.view').forEach(view => view.classList.remove('active'));
        
        // Show the target view
        const targetView = document.getElementById(`${viewId}-view`);
        if (targetView) {
            targetView.classList.add('active');
        }

        // Update active nav link
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('text-blue-600', 'border-blue-600');
            link.classList.add('text-gray-500');
            if (link.dataset.view === viewId) {
                link.classList.add('text-blue-600', 'border-blue-600');
                link.classList.remove('text-gray-500');
            }
        });

        // Lazy-load the network graph only when its tab is clicked
        if (viewId === 'network' && !network) {
            renderNetwork();
        }
        
        // Update lastView if it's a list view
        if (viewId === 'books' || viewId === 'borrowers') {
            lastView = viewId;
        }
    };

    // --- Event Listeners Setup ---
    const setupEventListeners = () => {
        // Navigation links
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                navigateTo(e.target.dataset.view);
            });
        });

        // Book filters and search
        document.getElementById('book-search').addEventListener('input', renderBooks);
        document.getElementById('book-period-filter').addEventListener('change', renderBooks);
        document.getElementById('book-sort').addEventListener('change', renderBooks);

        // Borrower filters and search
        document.getElementById('borrower-search').addEventListener('input', renderBorrowers);
        document.getElementById('borrower-gender-filter').addEventListener('change', renderBorrowers);
        document.getElementById('borrower-sort').addEventListener('change', renderBorrowers);

        // Detail view back button
        document.getElementById('back-to-list').addEventListener('click', () => navigateTo(lastView));
    };

    // --- Rendering Functions ---

    /**
     * Renders all charts on the dashboard.
     */
    const renderDashboard = () => {
        // 1. Top 10 Most Borrowed Books
        const popularBooks = [...libraryData.books]
            .sort((a, b) => b.transaction_ids.length - a.transaction_ids.length)
            .slice(0, 10);
        createChart('popular-books-chart', 'bar', {
            labels: popularBooks.map(b => b.title || `Book ID: ${b.id}`),
            datasets: [{
                label: 'Times Borrowed',
                data: popularBooks.map(b => b.transaction_ids.length),
                backgroundColor: 'rgba(59, 130, 246, 0.5)',
                borderColor: 'rgba(59, 130, 246, 1)',
                borderWidth: 1
            }]
        }, { indexAxis: 'y' });

        // 2. Top 10 Most Active Readers
        const activeReaders = [...libraryData.borrowers]
            .sort((a, b) => b.transaction_ids.length - a.transaction_ids.length)
            .slice(0, 10);
        createChart('active-readers-chart', 'bar', {
            labels: activeReaders.map(b => b.name),
            datasets: [{
                label: 'Books Borrowed',
                data: activeReaders.map(b => b.transaction_ids.length),
                backgroundColor: 'rgba(16, 185, 129, 0.5)',
                borderColor: 'rgba(16, 185, 129, 1)',
                borderWidth: 1
            }]
        }, { indexAxis: 'y' });

        // 3. Borrowing by Time Period
        const periodCounts = libraryData.transactions.reduce((acc, t) => {
            const year = new Date(t.date).getFullYear();
            let period = 'Unknown';
            if (year === 1902) period = '1902';
            else if (year === 1903 || year === 1904) period = '1903-1904';
            else if (year === 1934) period = '1934';
            else if (year === 1940) period = '1940';
            acc[period] = (acc[period] || 0) + 1;
            return acc;
        }, {});
        createChart('period-chart', 'pie', {
            labels: Object.keys(periodCounts),
            datasets: [{
                data: Object.values(periodCounts),
                backgroundColor: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6']
            }]
        });

        // 4. Gender Distribution
        const genderCounts = libraryData.borrowers.reduce((acc, b) => {
            const gender = b.name.includes('(F)') ? 'Female' : 'Male/Unknown';
            acc[gender] = (acc[gender] || 0) + 1;
            return acc;
        }, {});
        createChart('gender-chart', 'doughnut', {
            labels: Object.keys(genderCounts),
            datasets: [{
                data: Object.values(genderCounts),
                backgroundColor: ['#EC4899', '#6366F1', '#8B5CF6']
            }]
        });
    };

    /**
     * Renders the list of books based on current filters and sorting.
     */
    const renderBooks = () => {
        const searchTerm = document.getElementById('book-search').value.toLowerCase();
        const periodFilter = document.getElementById('book-period-filter').value;
        const sortOrder = document.getElementById('book-sort').value;

        let filteredBooks = libraryData.books.filter(book => {
            const titleMatch = (book.title || `book id ${book.id}`).toLowerCase().includes(searchTerm);
            
            if (periodFilter === 'all') return titleMatch;

            const periodMatch = book.transactions.some(t => {
                const year = new Date(t.date).getFullYear();
                if (periodFilter === '1903-1904') return year === 1903 || year === 1904;
                return year === parseInt(periodFilter);
            });
            return titleMatch && periodMatch;
        });

        if (sortOrder === 'alpha') {
            filteredBooks.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
        } else if (sortOrder === 'popularity') {
            filteredBooks.sort((a, b) => b.transaction_ids.length - a.transaction_ids.length);
        }

        const bookListContainer = document.getElementById('book-list');
        bookListContainer.innerHTML = filteredBooks.map(book => `
            <div class="p-4 border-b hover:bg-gray-50 cursor-pointer book-item" data-book-id="${book.id}">
                <h3 class="font-semibold text-blue-700 ${isRTL(book.title) ? 'rtl' : ''}">${book.title || 'Untitled'}</h3>
                <p class="text-sm text-gray-600">${book.author || 'Unknown Author'}</p>
                <p class="text-sm text-gray-500">Borrowed ${book.transaction_ids.length} time(s)</p>
            </div>
        `).join('');

        document.querySelectorAll('.book-item').forEach(item => {
            item.addEventListener('click', () => showBookDetail(item.dataset.bookId));
        });
    };

    /**
     * Renders the list of borrowers based on current filters and sorting.
     */
    const renderBorrowers = () => {
        const searchTerm = document.getElementById('borrower-search').value.toLowerCase();
        const genderFilter = document.getElementById('borrower-gender-filter').value;
        const sortOrder = document.getElementById('borrower-sort').value;

        let filteredBorrowers = libraryData.borrowers.filter(borrower => {
            const nameMatch = borrower.name.toLowerCase().includes(searchTerm);
            if (genderFilter === 'all') return nameMatch;
            
            const gender = borrower.name.includes('(F)') ? 'F' : 'M';
            return nameMatch && gender === genderFilter;
        });

        if (sortOrder === 'alpha') {
            filteredBorrowers.sort((a, b) => a.name.localeCompare(b.name));
        } else if (sortOrder === 'activity') {
            filteredBorrowers.sort((a, b) => b.transaction_ids.length - a.transaction_ids.length);
        }

        const borrowerListContainer = document.getElementById('borrower-list');
        borrowerListContainer.innerHTML = filteredBorrowers.map(borrower => `
            <div class="p-4 border-b hover:bg-gray-50 cursor-pointer borrower-item" data-borrower-name="${borrower.name}">
                <h3 class="font-semibold text-green-700 ${isRTL(borrower.name) ? 'rtl' : ''}">${borrower.name}</h3>
                <p class="text-sm text-gray-500">Borrowed ${borrower.transaction_ids.length} book(s)</p>
            </div>
        `).join('');

        document.querySelectorAll('.borrower-item').forEach(item => {
            item.addEventListener('click', () => showBorrowerDetail(item.dataset.borrowerName));
        });
    };

    /**
     * Renders the network graph.
     */
    const renderNetwork = () => {
        const nodes = [];
        const edges = [];

        const bookNodes = libraryData.books.map(book => ({
            id: `book-${book.id}`,
            label: book.title || `Book ${book.id}`,
            group: 'book',
            value: book.transaction_ids.length,
            title: `${book.transaction_ids.length} borrows`
        }));
        nodes.push(...bookNodes);

        const borrowerNodes = libraryData.borrowers.map(borrower => ({
            id: `borrower-${borrower.name}`,
            label: borrower.name,
            group: 'borrower',
            value: borrower.transaction_ids.length,
            title: `${borrower.transaction_ids.length} borrows`
        }));
        nodes.push(...borrowerNodes);

        libraryData.transactions.forEach(t => {
            edges.push({
                from: `borrower-${t.borrower_name}`,
                to: `book-${t.book_id}`
            });
        });

        const container = document.getElementById('network-graph');
        const data = { nodes: new vis.DataSet(nodes), edges: new vis.DataSet(edges) };
        const options = {
            nodes: {
                shape: 'dot',
                scaling: {
                    min: 10,
                    max: 30,
                },
                font: {
                    size: 12,
                    face: 'Inter'
                }
            },
            groups: {
                book: { color: { background: '#3B82F6', border: '#2563EB' } },
                borrower: { color: { background: '#10B981', border: '#059669' } }
            },
            physics: {
                solver: 'barnesHut',
                barnesHut: {
                    gravitationalConstant: -8000,
                    springConstant: 0.04,
                    springLength: 95
                },
                stabilization: { iterations: 2500 }
            }
        };
        network = new vis.Network(container, data, options);
    };

    // --- Detail View Renderers ---
    const showBookDetail = (bookId) => {
        const book = libraryData.books.find(b => b.id == bookId);
        if (!book) return;

        const content = `
            <h2 class="text-3xl font-bold mb-2 ${isRTL(book.title) ? 'rtl' : ''}">${book.title || 'Untitled'}</h2>
            <p class="text-lg text-gray-600 mb-4">${book.author || 'Unknown Author'}</p>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div class="bg-gray-100 p-4 rounded-lg text-center">
                    <span class="text-2xl font-bold">${book.transaction_ids.length}</span>
                    <span class="block text-sm">Total Borrows</span>
                </div>
                 <div class="bg-gray-100 p-4 rounded-lg text-center">
                    <span class="text-2xl font-bold">${book.borrowerNames.length}</span>
                    <span class="block text-sm">Unique Borrowers</span>
                </div>
                ${book.nli_link ? `<div class="bg-gray-100 p-4 rounded-lg text-center flex items-center justify-center"><a href="${book.nli_link}" target="_blank" class="text-blue-600 hover:underline">View at NLI</a></div>` : ''}
            </div>
            <h3 class="text-xl font-semibold mb-3">Borrowing History</h3>
            <div class="overflow-y-auto max-h-96 pr-2">
                ${book.transactions.map(t => `
                    <div class="p-3 border-b">
                        <p>Borrowed by <strong class="borrower-link cursor-pointer text-green-700" data-borrower-name="${t.borrower_name}">${t.borrower_name}</strong> on ${t.date}</p>
                    </div>
                `).join('')}
            </div>
        `;
        document.getElementById('detail-content').innerHTML = content;
        navigateTo('detail');
        
        document.querySelectorAll('.borrower-link').forEach(link => {
            link.addEventListener('click', () => showBorrowerDetail(link.dataset.borrowerName));
        });
    };

    const showBorrowerDetail = (borrowerName) => {
        const borrower = libraryData.borrowers.find(b => b.name === borrowerName);
        if (!borrower) return;

        const content = `
            <h2 class="text-3xl font-bold mb-2 ${isRTL(borrower.name) ? 'rtl' : ''}">${borrower.name}</h2>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                 <div class="bg-gray-100 p-4 rounded-lg text-center">
                    <span class="text-2xl font-bold">${borrower.transaction_ids.length}</span>
                    <span class="block text-sm">Total Books Borrowed</span>
                </div>
                 <div class="bg-gray-100 p-4 rounded-lg text-center">
                    <span class="text-2xl font-bold">${borrower.bookIds.length}</span>
                    <span class="block text-sm">Unique Books Borrowed</span>
                </div>
            </div>
            <h3 class="text-xl font-semibold mb-3">Books Borrowed</h3>
            <div class="overflow-y-auto max-h-96 pr-2">
                ${borrower.books.map(book => `
                    <div class="p-3 border-b">
                        <p><strong class="book-link cursor-pointer text-blue-700" data-book-id="${book.id}">${book.title || 'Untitled'}</strong> by ${book.author || 'Unknown'}</p>
                    </div>
                `).join('')}
            </div>
        `;
        document.getElementById('detail-content').innerHTML = content;
        navigateTo('detail');
        
        document.querySelectorAll('.book-link').forEach(link => {
            link.addEventListener('click', () => showBookDetail(link.dataset.bookId));
        });
    };

    // --- Helper Functions ---
    const createChart = (canvasId, type, data, options = {}) => {
        const ctx = document.getElementById(canvasId).getContext('2d');
        if (charts[canvasId]) {
            charts[canvasId].destroy();
        }
        charts[canvasId] = new Chart(ctx, { type, data, options });
    };

    const isRTL = (s) => {
        if (!s) return false;
        const rtlChars = /[\u0590-\u05FF\u0600-\u06FF]/;
        return rtlChars.test(s);
    };

    // --- Start the application ---
    initApp();
});
