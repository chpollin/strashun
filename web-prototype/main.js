// =================================================================================
// Strashun Library Digital Interface - Main JavaScript File (Academic Modern)
// =================================================================================

document.addEventListener('DOMContentLoaded', () => {
    // --- Global State ---
    let libraryData = { books: [], borrowers: [], transactions: [] };
    let filteredBooks = [];
    let filteredBorrowers = [];
    let charts = {};
    let network = null;
    let lastView = 'dashboard';
    let currentDetail = { type: null, id: null };

    // --- Pagination State ---
    const ITEMS_PER_PAGE = 20;
    let bookCurrentPage = 1;
    let borrowerCurrentPage = 1;

    // --- Application Initialization ---
    const initApp = async () => {
        try {
            const response = await fetch('../data/library_data.json');
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            libraryData = await response.json();

            processData();
            setupEventListeners();
            
            renderDashboard();
            updateBookView();
            updateBorrowerView();
            
            document.getElementById('loading-spinner').style.display = 'none';
            navigateTo('dashboard');

        } catch (error) {
            console.error("Failed to load and initialize the application:", error);
            document.getElementById('loading-spinner').innerHTML = `<p style="color: red;">Failed to load library data. Please check the console for errors.</p>`;
        }
    };

    // --- Data Processing ---
    const processData = () => {
        const bookMap = new Map(libraryData.books.map(b => [b.id, b]));
        libraryData.books.forEach(book => {
            book.transactions = book.transaction_ids.map(tid => libraryData.transactions.find(t => t.transaction_id === tid)).filter(Boolean);
            book.borrowerNames = [...new Set(book.transactions.map(t => t.borrower_name))];
        });
        libraryData.borrowers.forEach(borrower => {
            borrower.transactions = borrower.transaction_ids.map(tid => libraryData.transactions.find(t => t.transaction_id === tid)).filter(Boolean);
            borrower.bookIds = [...new Set(borrower.transactions.map(t => t.book_id))];
            borrower.books = borrower.bookIds.map(id => bookMap.get(id)).filter(Boolean);
        });
    };

    // --- Navigation ---
    const navigateTo = (viewId) => {
        document.querySelectorAll('.view').forEach(view => view.classList.remove('active'));
        const targetView = document.getElementById(`${viewId}-view`);
        if (targetView) targetView.classList.add('active');

        // Update both desktop and mobile nav links
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.toggle('active', link.dataset.view === viewId);
        });

        if (viewId === 'network' && !network) renderNetwork();
        if (viewId === 'timeline' && !charts['timeline-chart']) renderTimeline();
        if (viewId === 'books' || viewId === 'borrowers') lastView = viewId;
    };

    // --- Event Listeners Setup ---
    const setupEventListeners = () => {
        // --- Mobile Menu Logic ---
        const mobileMenuButton = document.getElementById('mobile-menu-button');
        const mobileMenu = document.getElementById('mobile-menu');
        
        mobileMenuButton.addEventListener('click', () => {
            const isExpanded = mobileMenuButton.getAttribute('aria-expanded') === 'true';
            mobileMenuButton.setAttribute('aria-expanded', !isExpanded);
            mobileMenu.classList.toggle('hidden');
        });

        // --- Navigation Logic (for all links) ---
        document.querySelectorAll('.nav-link').forEach(link => link.addEventListener('click', (e) => {
            e.preventDefault();
            navigateTo(e.target.dataset.view);
            // If it's a mobile link, close the menu after navigation
            if (link.classList.contains('mobile')) {
                mobileMenuButton.setAttribute('aria-expanded', 'false');
                mobileMenu.classList.add('hidden');
            }
        }));

        // --- Filter/Search Logic ---
        document.getElementById('book-search').addEventListener('input', () => { bookCurrentPage = 1; updateBookView(); });
        document.getElementById('book-sort').addEventListener('change', () => { bookCurrentPage = 1; updateBookView(); });
        document.getElementById('book-export-csv').addEventListener('click', () => exportListToCSV('books'));

        document.getElementById('borrower-search').addEventListener('input', () => { borrowerCurrentPage = 1; updateBorrowerView(); });
        document.getElementById('borrower-gender-filter').addEventListener('change', () => { borrowerCurrentPage = 1; updateBorrowerView(); });
        document.getElementById('borrower-export-csv').addEventListener('click', () => exportListToCSV('borrowers'));
        
        // --- Detail View Logic ---
        document.getElementById('back-to-list').addEventListener('click', () => navigateTo(lastView));
        document.getElementById('detail-export-json').addEventListener('click', exportDetailToJson);
    };

    // --- Main View Updaters ---
    function updateBookView() {
        const searchTerm = document.getElementById('book-search').value.toLowerCase();
        const sortOrder = document.getElementById('book-sort').value;
        filteredBooks = libraryData.books.filter(book => (book.title || `book id ${book.id}`).toLowerCase().includes(searchTerm));
        if (sortOrder === 'alpha') filteredBooks.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
        else if (sortOrder === 'popularity') filteredBooks.sort((a, b) => b.transaction_ids.length - a.transaction_ids.length);
        renderPaginatedList('books');
    }

    function updateBorrowerView() {
        const searchTerm = document.getElementById('borrower-search').value.toLowerCase();
        const genderFilter = document.getElementById('borrower-gender-filter').value;
        filteredBorrowers = libraryData.borrowers.filter(borrower => {
            const nameMatch = borrower.name.toLowerCase().includes(searchTerm);
            if (genderFilter === 'all') return nameMatch;
            const gender = borrower.name.includes('(F)') ? 'F' : 'M';
            return nameMatch && gender === genderFilter;
        });
        filteredBorrowers.sort((a, b) => a.name.localeCompare(b.name));
        renderPaginatedList('borrowers');
    }

    // --- Rendering Functions ---
    const renderDashboard = () => {
        const popularBooks = [...libraryData.books].sort((a, b) => b.transaction_ids.length - a.transaction_ids.length).slice(0, 10);
        const activeReaders = [...libraryData.borrowers].sort((a, b) => b.transaction_ids.length - a.transaction_ids.length).slice(0, 10);
        
        const chartOptions = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { 
                x: { ticks: { color: 'var(--text-secondary)', fontFamily: 'Inter' }, grid: { color: '#EDF2F7' } }, 
                y: { ticks: { color: 'var(--text-secondary)', fontFamily: 'Inter' }, grid: { display: false } } 
            }
        };

        createChart('popular-books-chart', 'bar', {
            labels: popularBooks.map(b => b.title || `Book ID: ${b.id}`),
            datasets: [{ label: 'Times Borrowed', data: popularBooks.map(b => b.transaction_ids.length), backgroundColor: 'rgba(74, 85, 104, 0.7)' }]
        }, { ...chartOptions, indexAxis: 'y', onClick: (evt, elements) => { if (elements.length > 0) showBookDetail(popularBooks[elements[0].index].id); }});

        createChart('active-readers-chart', 'bar', {
            labels: activeReaders.map(b => b.name),
            datasets: [{ label: 'Books Borrowed', data: activeReaders.map(b => b.transaction_ids.length), backgroundColor: 'rgba(56, 161, 105, 0.7)' }]
        }, { ...chartOptions, indexAxis: 'y', onClick: (evt, elements) => { if (elements.length > 0) showBorrowerDetail(activeReaders[elements[0].index].name); }});
        
        const periodCounts = libraryData.transactions.reduce((acc, t) => {
            const year = new Date(t.date).getFullYear();
            let period = 'Unknown';
            if (year === 1902) period = '1902'; else if (year === 1903 || year === 1904) period = '1903-1904'; else if (year === 1934) period = '1934'; else if (year === 1940) period = '1940';
            acc[period] = (acc[period] || 0) + 1;
            return acc;
        }, {});
        createChart('period-chart', 'pie', { labels: Object.keys(periodCounts), datasets: [{ data: Object.values(periodCounts), backgroundColor: ['#4A5568', '#38A169', '#D69E2E', '#E53E3E', '#805AD5'] }] }, { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top', labels: { color: 'var(--text-secondary)', fontFamily: 'Inter' } } } });
        
        const genderCounts = libraryData.borrowers.reduce((acc, b) => {
            const gender = b.name.includes('(F)') ? 'Female' : 'Male/Unknown';
            acc[gender] = (acc[gender] || 0) + 1;
            return acc;
        }, {});
        createChart('gender-chart', 'doughnut', { labels: Object.keys(genderCounts), datasets: [{ data: Object.values(genderCounts), backgroundColor: ['#D53F8C', '#6B46C1'] }] }, { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top', labels: { color: 'var(--text-secondary)', fontFamily: 'Inter' } } } });
    };
    
    const renderTimeline = () => {
        const yearlyData = libraryData.transactions.reduce((acc, t) => {
            const year = new Date(t.date).getFullYear();
            if (year >= 1900 && year <= 1941) acc[year] = (acc[year] || 0) + 1;
            return acc;
        }, {});
        const sortedYears = Object.keys(yearlyData).sort((a,b) => a - b);
        const chartData = {
            labels: sortedYears,
            datasets: [{
                label: 'Total Books Borrowed per Year',
                data: sortedYears.map(year => yearlyData[year]),
                fill: false,
                borderColor: 'var(--accent-primary)',
                tension: 0.1
            }]
        };
        createChart('timeline-chart', 'line', chartData, { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { ticks: { color: 'var(--text-secondary)' } }, y: { ticks: { color: 'var(--text-secondary)' } } } });
    };

    const renderNetwork = () => {
        const nodes = [
            ...libraryData.books.map(book => ({ id: `book-${book.id}`, label: book.title || `Book ${book.id}`, group: 'book', value: book.transaction_ids.length, title: `${book.transaction_ids.length} borrows` })),
            ...libraryData.borrowers.map(borrower => ({ id: `borrower-${borrower.name}`, label: borrower.name, group: 'borrower', value: borrower.transaction_ids.length, title: `${borrower.transaction_ids.length} borrows` }))
        ];
        const edges = libraryData.transactions.map(t => ({ from: `borrower-${t.borrower_name}`, to: `book-${t.book_id}` }));
        
        const container = document.getElementById('network-graph');
        const data = { nodes: new vis.DataSet(nodes), edges: new vis.DataSet(edges) };
        const options = {
            nodes: { shape: 'dot', scaling: { min: 10, max: 30 }, font: { size: 12, face: 'Inter', color: '#2D3748' } },
            groups: { book: { color: { background: '#63B3ED', border: '#4299E1' } }, borrower: { color: { background: '#68D391', border: '#48BB78' } } },
            physics: { solver: 'barnesHut', barnesHut: { gravitationalConstant: -8000, springConstant: 0.04, springLength: 95 }, stabilization: { iterations: 2500 } },
            layout: { improvedLayout: false }
        };
        network = new vis.Network(container, data, options);
    };

    // --- Detail View Renderers ---
    const showBookDetail = (bookId) => {
        const book = libraryData.books.find(b => b.id == bookId);
        if (!book) return;
        currentDetail = { type: 'book', id: bookId };
        const content = `
            <h2 class="text-3xl mb-2 ${isRTL(book.title) ? 'rtl' : ''}">${book.title || 'Untitled'}</h2>
            <p class="text-lg mb-6" style="color: var(--text-secondary);">${book.author || 'Unknown Author'}</p>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div class="p-4 rounded-lg text-center" style="background-color: #F7FAFC;"><span class="text-2xl font-bold">${book.transaction_ids.length}</span><span class="block text-sm">Total Borrows</span></div>
                <div class="p-4 rounded-lg text-center" style="background-color: #F7FAFC;"><span class="text-2xl font-bold">${book.borrowerNames.length}</span><span class="block text-sm">Unique Borrowers</span></div>
                ${book.nli_link ? `<div class="p-4 rounded-lg text-center flex items-center justify-center" style="background-color: #F7FAFC;"><a href="${book.nli_link}" target="_blank" style="color: var(--accent-primary);" class="hover:underline">View at NLI</a></div>` : ''}
            </div>
            <h3 class="text-xl mb-3">Borrowing History</h3>
            <div class="overflow-y-auto max-h-96 pr-2">${book.transactions.map(t => `<div class="p-3 border-b" style="border-color: #EDF2F7;"><p>Borrowed by <strong class="borrower-link cursor-pointer" style="color: var(--accent-green);" data-borrower-name="${t.borrower_name}">${t.borrower_name}</strong> on ${t.date}</p></div>`).join('')}</div>`;
        document.getElementById('detail-content').innerHTML = content;
        navigateTo('detail');
        document.querySelectorAll('.borrower-link').forEach(link => link.addEventListener('click', () => showBorrowerDetail(link.dataset.borrowerName)));
    };

    const showBorrowerDetail = (borrowerName) => {
        const borrower = libraryData.borrowers.find(b => b.name === borrowerName);
        if (!borrower) return;
        currentDetail = { type: 'borrower', id: borrowerName };
        const content = `
            <h2 class="text-3xl mb-6 ${isRTL(borrower.name) ? 'rtl' : ''}">${borrower.name}</h2>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                <div class="p-4 rounded-lg text-center" style="background-color: #F7FAFC;"><span class="text-2xl font-bold">${borrower.transaction_ids.length}</span><span class="block text-sm">Total Books Borrowed</span></div>
                <div class="p-4 rounded-lg text-center" style="background-color: #F7FAFC;"><span class="text-2xl font-bold">${borrower.bookIds.length}</span><span class="block text-sm">Unique Books Borrowed</span></div>
            </div>
            <h3 class="text-xl mb-3">Books Borrowed</h3>
            <div class="overflow-y-auto max-h-96 pr-2">${borrower.books.map(book => `<div class="p-3 border-b" style="border-color: #EDF2F7;"><p><strong class="book-link cursor-pointer" style="color: var(--accent-primary);" data-book-id="${book.id}">${book.title || 'Untitled'}</strong> by <span style="color: var(--text-secondary);">${book.author || 'Unknown'}</span></p></div>`).join('')}</div>`;
        document.getElementById('detail-content').innerHTML = content;
        navigateTo('detail');
        document.querySelectorAll('.book-link').forEach(link => link.addEventListener('click', () => showBookDetail(link.dataset.bookId)));
    };

    // --- Pagination and List Rendering ---
    const renderPaginatedList = (type) => {
        const isBooks = type === 'books';
        const data = isBooks ? filteredBooks : filteredBorrowers;
        const currentPage = isBooks ? bookCurrentPage : borrowerCurrentPage;
        const listContainer = document.getElementById(isBooks ? 'book-list' : 'borrower-list');
        
        if (!listContainer) {
            console.error(`Container for ${type} list not found!`);
            return;
        }

        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        const end = start + ITEMS_PER_PAGE;
        const pageItems = data.slice(start, end);

        listContainer.innerHTML = pageItems.map(item => isBooks ? `
            <div class="list-item book-item" data-book-id="${item.id}">
                <h4 class="list-item-title ${isRTL(item.title) ? 'rtl' : ''}">${item.title || 'Untitled'}</h4>
                <p class="list-item-subtitle">${item.author || 'Unknown Author'}</p>
                <p class="list-item-subtitle mt-1">Borrowed ${item.transaction_ids.length} time(s)</p>
            </div>` : `
            <div class="list-item borrower-item" data-borrower-name="${item.name}">
                <h4 class="list-item-title ${isRTL(item.name) ? 'rtl' : ''}">${item.name}</h4>
                <p class="list-item-subtitle mt-1">Borrowed ${item.transaction_ids.length} book(s)</p>
            </div>`).join('');
        
        listContainer.querySelectorAll(isBooks ? '.book-item' : '.borrower-item').forEach(item => {
            item.addEventListener('click', () => isBooks ? showBookDetail(item.dataset.bookId) : showBorrowerDetail(item.dataset.borrowerName));
        });

        renderPaginationControls(type);
    };

    const renderPaginationControls = (type) => {
        const isBooks = type === 'books';
        const data = isBooks ? filteredBooks : filteredBorrowers;
        let currentPage = isBooks ? bookCurrentPage : borrowerCurrentPage;
        const totalPages = Math.ceil(data.length / ITEMS_PER_PAGE);
        const paginationContainer = document.getElementById(isBooks ? 'book-pagination' : 'borrower-pagination');
        
        if (totalPages <= 1) { paginationContainer.innerHTML = ''; return; }

        let buttons = '';
        for (let i = 1; i <= totalPages; i++) {
            buttons += `<button class="pagination-btn px-3 py-1 rounded-md ${i === currentPage ? 'active' : ''}" data-page="${i}" data-type="${type}">${i}</button>`;
        }
        paginationContainer.innerHTML = buttons;

        paginationContainer.querySelectorAll('.pagination-btn').forEach(button => {
            button.addEventListener('click', () => {
                if (isBooks) bookCurrentPage = parseInt(button.dataset.page);
                else borrowerCurrentPage = parseInt(button.dataset.page);
                renderPaginatedList(type);
            });
        });
    };

    // --- Data Export ---
    const exportListToCSV = (type) => {
        const isBooks = type === 'books';
        const data = isBooks ? filteredBooks : filteredBorrowers;
        const headers = isBooks ? ['ID', 'Title', 'Author', 'Times Borrowed'] : ['Name', 'Times Borrowed'];
        const rows = data.map(item => isBooks ? 
            [item.id, `"${(item.title || '').replace(/"/g, '""')}"`, `"${(item.author || '').replace(/"/g, '""')}"`, item.transaction_ids.length] : 
            [`"${item.name.replace(/"/g, '""')}"`, item.transaction_ids.length]
        );
        const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
        downloadFile(csvContent, `${type}.csv`);
    };

    const exportDetailToJson = () => {
        if (!currentDetail.type || !currentDetail.id) return;
        const data = currentDetail.type === 'book' ? 
            libraryData.books.find(b => b.id == currentDetail.id) : 
            libraryData.borrowers.find(b => b.name === currentDetail.id);
        const jsonContent = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data, null, 2));
        downloadFile(jsonContent, `${currentDetail.type}_${currentDetail.id}.json`);
    };

    // --- Helper Functions ---
    const createChart = (canvasId, type, data, options = {}) => {
        const ctx = document.getElementById(canvasId).getContext('2d');
        if (charts[canvasId]) charts[canvasId].destroy();
        charts[canvasId] = new Chart(ctx, { type, data, options });
    };

    const isRTL = (s) => s && /[\u0590-\u05FF\u0600-\u06FF]/.test(s);
    
    const downloadFile = (content, fileName) => {
        const link = document.createElement("a");
        link.setAttribute("href", content);
        link.setAttribute("download", fileName);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // --- Start the application ---
    initApp();
});
