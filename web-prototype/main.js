// =================================================================================
// Strashun Library Digital Interface - Enhanced Main JavaScript File
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
            
            // Load state from URL
            loadFromURL();
            
            updateBookView();
            updateBorrowerView();
            
            document.getElementById('loading-spinner').style.display = 'none';

        } catch (error) {
            console.error("Failed to load and initialize the application:", error);
            document.getElementById('loading-spinner').innerHTML = `<p style="color: red;">Failed to load library data. Please check the console for errors.</p>`;
        }
    };

    // --- Data Processing ---
    const processData = () => {
        const bookMap = new Map(libraryData.books.map(b => [b.id, b]));
        
        libraryData.books.forEach(book => {
            book.transactions = book.transaction_ids.map(tid => 
                libraryData.transactions.find(t => t.transaction_id === tid)
            ).filter(Boolean);
            book.borrowerNames = [...new Set(book.transactions.map(t => t.borrower_name))];
            
            // Add collection flag
            book.isLikuteiShoshanim = book.likutei_shoshanim_id ? true : false;
        });
        
        libraryData.borrowers.forEach(borrower => {
            borrower.transactions = borrower.transaction_ids.map(tid => 
                libraryData.transactions.find(t => t.transaction_id === tid)
            ).filter(Boolean);
            borrower.bookIds = [...new Set(borrower.transactions.map(t => t.book_id))];
            borrower.books = borrower.bookIds.map(id => bookMap.get(id)).filter(Boolean);
            
            // Improved gender detection
            borrower.gender = 'unknown';
            if (borrower.F_flag === 'F' || borrower.name.includes('(F)')) {
                borrower.gender = 'female';
            } else if (borrower.name.match(/\b(Mrs?|Miss|Ms)\b/i)) {
                borrower.gender = 'female';
            }
        });
    };

    // --- URL State Management ---
    const updateURL = () => {
        const params = new URLSearchParams();
        
        // Save current view
        const activeView = document.querySelector('.view.active')?.id?.replace('-view', '');
        if (activeView && activeView !== 'dashboard') params.set('view', activeView);
        
        // Save book filters
        const bookSearch = document.getElementById('book-search')?.value;
        if (bookSearch) params.set('book-search', bookSearch);
        
        const bookSort = document.getElementById('book-sort')?.value;
        if (bookSort && bookSort !== 'relevance') params.set('book-sort', bookSort);
        
        const bookPeriod = document.getElementById('book-period-filter')?.value;
        if (bookPeriod && bookPeriod !== 'all') params.set('book-period', bookPeriod);
        
        const bookCollection = document.getElementById('book-collection-filter')?.value;
        if (bookCollection && bookCollection !== 'all') params.set('book-collection', bookCollection);
        
        // Save borrower filters
        const borrowerSearch = document.getElementById('borrower-search')?.value;
        if (borrowerSearch) params.set('borrower-search', borrowerSearch);
        
        const borrowerGender = document.getElementById('borrower-gender-filter')?.value;
        if (borrowerGender && borrowerGender !== 'all') params.set('borrower-gender', borrowerGender);
        
        const borrowerActivity = document.getElementById('borrower-activity-filter')?.value;
        if (borrowerActivity && borrowerActivity !== 'all') params.set('borrower-activity', borrowerActivity);
        
        // Save detail view state
        if (currentDetail.type && currentDetail.id) {
            params.set('detail-type', currentDetail.type);
            params.set('detail-id', currentDetail.id);
        }
        
        // Update URL without reload
        const newURL = params.toString() ? `${window.location.pathname}?${params}` : window.location.pathname;
        window.history.replaceState({}, '', newURL);
    };

    const loadFromURL = () => {
        const params = new URLSearchParams(window.location.search);
        
        // Restore book filters
        if (params.get('book-search')) {
            document.getElementById('book-search').value = params.get('book-search');
        }
        if (params.get('book-sort')) {
            document.getElementById('book-sort').value = params.get('book-sort');
        }
        if (params.get('book-period')) {
            const periodFilter = document.getElementById('book-period-filter');
            if (periodFilter) periodFilter.value = params.get('book-period');
        }
        if (params.get('book-collection')) {
            const collectionFilter = document.getElementById('book-collection-filter');
            if (collectionFilter) collectionFilter.value = params.get('book-collection');
        }
        
        // Restore borrower filters
        if (params.get('borrower-search')) {
            document.getElementById('borrower-search').value = params.get('borrower-search');
        }
        if (params.get('borrower-gender')) {
            document.getElementById('borrower-gender-filter').value = params.get('borrower-gender');
        }
        if (params.get('borrower-activity')) {
            const activityFilter = document.getElementById('borrower-activity-filter');
            if (activityFilter) activityFilter.value = params.get('borrower-activity');
        }
        
        // Navigate to saved view or detail
        if (params.get('detail-type') && params.get('detail-id')) {
            const type = params.get('detail-type');
            const id = params.get('detail-id');
            if (type === 'book') {
                showBookDetail(id);
            } else if (type === 'borrower') {
                showBorrowerDetail(id);
            }
        } else {
            const view = params.get('view') || 'dashboard';
            navigateTo(view);
        }
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
        
        // Clear detail state when navigating away from detail
        if (viewId !== 'detail') {
            currentDetail = { type: null, id: null };
        }
        
        updateURL();
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

        // --- Book Filter/Search Logic ---
        document.getElementById('book-search').addEventListener('input', () => { 
            bookCurrentPage = 1; 
            updateBookView(); 
        });
        document.getElementById('book-sort').addEventListener('change', () => { 
            bookCurrentPage = 1; 
            updateBookView(); 
        });
        document.getElementById('book-period-filter')?.addEventListener('change', () => { 
            bookCurrentPage = 1; 
            updateBookView(); 
        });
        document.getElementById('book-collection-filter')?.addEventListener('change', () => { 
            bookCurrentPage = 1; 
            updateBookView(); 
        });
        document.getElementById('book-export-csv').addEventListener('click', () => exportListToCSV('books'));

        // --- Borrower Filter/Search Logic ---
        document.getElementById('borrower-search').addEventListener('input', () => { 
            borrowerCurrentPage = 1; 
            updateBorrowerView(); 
        });
        document.getElementById('borrower-gender-filter').addEventListener('change', () => { 
            borrowerCurrentPage = 1; 
            updateBorrowerView(); 
        });
        document.getElementById('borrower-activity-filter')?.addEventListener('change', () => { 
            borrowerCurrentPage = 1; 
            updateBorrowerView(); 
        });
        document.getElementById('borrower-export-csv').addEventListener('click', () => exportListToCSV('borrowers'));
        
        // --- Network Filter Logic ---
        document.getElementById('network-refresh')?.addEventListener('click', renderNetwork);
        
        // --- Detail View Logic ---
        document.getElementById('back-to-list').addEventListener('click', () => navigateTo(lastView));
        document.getElementById('detail-export-json').addEventListener('click', exportDetailToJson);
    };

    // --- Helper Functions ---
    const showLoading = (containerId) => {
        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = '<div class="text-center py-8"><div class="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2" style="border-color: var(--accent-primary);"></div><p class="mt-4 text-sm" style="color: var(--text-secondary);">Loading...</p></div>';
        }
    };

    const highlightMatch = (text, searchTerm) => {
        if (!searchTerm || !text) return text;
        const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
        return text.replace(regex, '<mark style="background-color: #FEF3C7; padding: 2px; border-radius: 2px;">$1</mark>');
    };

    // --- Main View Updaters ---
    function updateBookView() {
        showLoading('book-list');
        
        const searchTerm = document.getElementById('book-search').value.toLowerCase();
        const sortOrder = document.getElementById('book-sort').value;
        const periodFilter = document.getElementById('book-period-filter')?.value || 'all';
        const collectionFilter = document.getElementById('book-collection-filter')?.value || 'all';
        
        filteredBooks = libraryData.books.filter(book => {
            const nameMatch = (book.title || `book id ${book.id}`).toLowerCase().includes(searchTerm) ||
                             (book.author || '').toLowerCase().includes(searchTerm);
            
            // Period filter - check transactions for dates
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
            filteredBooks.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
        } else if (sortOrder === 'popularity') {
            filteredBooks.sort((a, b) => b.transaction_ids.length - a.transaction_ids.length);
        }
        
        renderPaginatedList('books', searchTerm);
        updateURL();
    }

    function updateBorrowerView() {
        showLoading('borrower-list');
        
        const searchTerm = document.getElementById('borrower-search').value.toLowerCase();
        const genderFilter = document.getElementById('borrower-gender-filter').value;
        const activityFilter = document.getElementById('borrower-activity-filter')?.value || 'all';
        
        filteredBorrowers = libraryData.borrowers.filter(borrower => {
            const nameMatch = borrower.name.toLowerCase().includes(searchTerm);
            
            // Gender filter
            let genderMatch = true;
            if (genderFilter !== 'all') {
                const borrowerGender = borrower.gender === 'female' ? 'F' : 'M';
                genderMatch = borrowerGender === genderFilter;
            }
            
            // Activity level filter
            let activityMatch = true;
            if (activityFilter !== 'all') {
                const count = borrower.transaction_ids.length;
                if (activityFilter === '1-5') activityMatch = count >= 1 && count <= 5;
                else if (activityFilter === '6-20') activityMatch = count >= 6 && count <= 20;
                else if (activityFilter === '21+') activityMatch = count >= 21;
            }
            
            return nameMatch && genderMatch && activityMatch;
        });
        
        filteredBorrowers.sort((a, b) => a.name.localeCompare(b.name));
        renderPaginatedList('borrowers', searchTerm);
        updateURL();
    }

    // --- Rendering Functions ---
    const renderDashboard = () => {
        // Changed from 10 to 20 items
        const popularBooks = [...libraryData.books].sort((a, b) => b.transaction_ids.length - a.transaction_ids.length).slice(0, 20);
        const activeReaders = [...libraryData.borrowers].sort((a, b) => b.transaction_ids.length - a.transaction_ids.length).slice(0, 20);
        
        const chartOptions = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { 
                x: { ticks: { color: 'var(--text-secondary)', fontFamily: 'Inter' }, grid: { color: '#EDF2F7' } }, 
                y: { ticks: { color: 'var(--text-secondary)', fontFamily: 'Inter', autoSkip: false }, grid: { display: false } } 
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
            if (year === 1902) period = '1902'; 
            else if (year === 1903 || year === 1904) period = '1903-1904'; 
            else if (year === 1934) period = '1934'; 
            else if (year === 1940) period = '1940';
            acc[period] = (acc[period] || 0) + 1;
            return acc;
        }, {});
        
        createChart('period-chart', 'pie', { 
            labels: Object.keys(periodCounts), 
            datasets: [{ data: Object.values(periodCounts), backgroundColor: ['#4A5568', '#38A169', '#D69E2E', '#E53E3E', '#805AD5'] }] 
        }, { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top', labels: { color: 'var(--text-secondary)', fontFamily: 'Inter' } } } });
        
        const genderCounts = libraryData.borrowers.reduce((acc, b) => {
            const gender = b.gender === 'female' ? 'Female' : 'Male/Unknown';
            acc[gender] = (acc[gender] || 0) + 1;
            return acc;
        }, {});
        
        createChart('gender-chart', 'doughnut', { 
            labels: Object.keys(genderCounts), 
            datasets: [{ data: Object.values(genderCounts), backgroundColor: ['#D53F8C', '#6B46C1'] }] 
        }, { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top', labels: { color: 'var(--text-secondary)', fontFamily: 'Inter' } } } });
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
        createChart('timeline-chart', 'line', chartData, { 
            responsive: true, 
            maintainAspectRatio: false, 
            plugins: { legend: { display: false } }, 
            scales: { 
                x: { ticks: { color: 'var(--text-secondary)' } }, 
                y: { ticks: { color: 'var(--text-secondary)' } } 
            } 
        });
    };

    const renderNetwork = () => {
        showLoading('network-graph');
        
        const periodFilter = document.getElementById('network-period-filter')?.value || 'all';
        const minConnections = parseInt(document.getElementById('network-min-connections')?.value || '0');
        
        // Filter transactions by period
        let filteredTransactions = libraryData.transactions;
        if (periodFilter !== 'all') {
            filteredTransactions = libraryData.transactions.filter(t => {
                const year = new Date(t.date).getFullYear();
                if (periodFilter === '1902') return year === 1902;
                if (periodFilter === '1903-1904') return year === 1903 || year === 1904;
                if (periodFilter === '1934') return year === 1934;
                if (periodFilter === '1940') return year === 1940;
                return false;
            });
        }
        
        // Filter books by minimum connections
        const bookConnectionCounts = {};
        filteredTransactions.forEach(t => {
            bookConnectionCounts[t.book_id] = (bookConnectionCounts[t.book_id] || 0) + 1;
        });
        
        const validBookIds = Object.keys(bookConnectionCounts)
            .filter(id => bookConnectionCounts[id] >= minConnections)
            .map(id => parseInt(id));
        
        // Build filtered nodes and edges
        const relevantBorrowers = new Set(
            filteredTransactions
                .filter(t => validBookIds.includes(t.book_id))
                .map(t => t.borrower_name)
        );
        
        const nodes = [
            ...libraryData.books
                .filter(book => validBookIds.includes(book.id))
                .map(book => ({ 
                    id: `book-${book.id}`, 
                    label: book.title || `Book ${book.id}`, 
                    group: 'book', 
                    value: bookConnectionCounts[book.id] || 1,
                    title: `${book.title || 'Book ' + book.id}<br>${bookConnectionCounts[book.id]} borrows`
                })),
            ...libraryData.borrowers
                .filter(borrower => relevantBorrowers.has(borrower.name))
                .map(borrower => ({ 
                    id: `borrower-${borrower.name}`, 
                    label: borrower.name, 
                    group: 'borrower', 
                    value: borrower.transaction_ids.filter(tid => 
                        filteredTransactions.some(t => t.transaction_id === tid)
                    ).length,
                    title: `${borrower.name}<br>${borrower.transaction_ids.length} total borrows`
                }))
        ];
        
        const edges = filteredTransactions
            .filter(t => validBookIds.includes(t.book_id))
            .map(t => ({ from: `borrower-${t.borrower_name}`, to: `book-${t.book_id}` }));
        
        // Update or create network
        if (network) network.destroy();
        
        const container = document.getElementById('network-graph');
        const data = { nodes: new vis.DataSet(nodes), edges: new vis.DataSet(edges) };
        const options = {
            nodes: { 
                shape: 'dot', 
                scaling: { min: 10, max: 30 }, 
                font: { size: 12, face: 'Inter', color: '#2D3748' } 
            },
            groups: { 
                book: { color: { background: '#63B3ED', border: '#4299E1' } }, 
                borrower: { color: { background: '#68D391', border: '#48BB78' } } 
            },
            physics: { 
                solver: 'barnesHut', 
                barnesHut: { gravitationalConstant: -8000, springConstant: 0.04, springLength: 95 }, 
                stabilization: { iterations: 2500 } 
            },
            layout: { improvedLayout: false },
            interaction: { hover: true, tooltipDelay: 200 }
        };
        network = new vis.Network(container, data, options);
        
        // Add click event for network nodes
        network.on("click", function(params) {
            if (params.nodes.length > 0) {
                const nodeId = params.nodes[0];
                if (nodeId.startsWith('book-')) {
                    const bookId = nodeId.replace('book-', '');
                    showBookDetail(bookId);
                } else if (nodeId.startsWith('borrower-')) {
                    const borrowerName = nodeId.replace('borrower-', '');
                    showBorrowerDetail(borrowerName);
                }
            }
        });
    };

    // --- Detail View Renderers ---
    const showBookDetail = (bookId) => {
        const book = libraryData.books.find(b => b.id == bookId);
        if (!book) return;
        currentDetail = { type: 'book', id: bookId };
        
        const content = `
            <h2 class="text-3xl mb-2 ${isRTL(book.title) ? 'rtl' : ''}">${book.title || 'Untitled'}</h2>
            <p class="text-lg mb-2" style="color: var(--text-secondary);">${book.author || 'Unknown Author'}</p>
            
            <!-- Additional metadata -->
            <div class="mb-4 text-sm" style="color: var(--text-secondary);">
                ${book.publisher ? `<p><strong>Publisher:</strong> ${book.publisher}</p>` : ''}
                ${book.year ? `<p><strong>Year:</strong> ${book.year}</p>` : ''}
                ${book.language ? `<p><strong>Language:</strong> ${book.language}</p>` : ''}
                ${book.isLikuteiShoshanim ? `<p><strong>Collection:</strong> Likutei Shoshanim</p>` : ''}
            </div>
            
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div class="p-4 rounded-lg text-center" style="background-color: #F7FAFC;">
                    <span class="text-2xl font-bold">${book.transaction_ids.length}</span>
                    <span class="block text-sm">Total Borrows</span>
                </div>
                <div class="p-4 rounded-lg text-center" style="background-color: #F7FAFC;">
                    <span class="text-2xl font-bold">${book.borrowerNames.length}</span>
                    <span class="block text-sm">Unique Borrowers</span>
                </div>
                ${book.nli_link ? `
                    <div class="p-4 rounded-lg text-center flex items-center justify-center" style="background-color: #F7FAFC;">
                        <a href="${book.nli_link}" target="_blank" style="color: var(--accent-primary);" class="hover:underline">View at NLI →</a>
                    </div>` : 
                    '<div class="p-4 rounded-lg text-center" style="background-color: #F7FAFC;"><span class="text-sm text-gray-500">No NLI Link</span></div>'
                }
            </div>
            
            <h3 class="text-xl mb-3">Borrowing History</h3>
            <div class="overflow-y-auto max-h-96 pr-2">
                ${book.transactions.map(t => `
                    <div class="p-3 border-b" style="border-color: #EDF2F7;">
                        <p>Borrowed by <strong class="borrower-link cursor-pointer" style="color: var(--accent-green);" data-borrower-name="${t.borrower_name}">${t.borrower_name}</strong></p>
                        <p class="text-sm" style="color: var(--text-secondary);">
                            Date: ${t.date}${t.return_date ? ` | Returned: ${t.return_date}` : ' | Not returned'}
                        </p>
                    </div>
                `).join('')}
            </div>`;
            
        document.getElementById('detail-content').innerHTML = content;
        navigateTo('detail');
        document.querySelectorAll('.borrower-link').forEach(link => 
            link.addEventListener('click', () => showBorrowerDetail(link.dataset.borrowerName))
        );
        updateURL();
    };

    const showBorrowerDetail = (borrowerName) => {
        const borrower = libraryData.borrowers.find(b => b.name === borrowerName);
        if (!borrower) return;
        currentDetail = { type: 'borrower', id: borrowerName };
        
        const genderBadge = borrower.gender === 'female' ? 
            '<span class="ml-2 px-2 py-1 text-xs rounded-full" style="background-color: #FED7E2; color: #97266D;">Female</span>' : '';
        
        const content = `
            <h2 class="text-3xl mb-6 ${isRTL(borrower.name) ? 'rtl' : ''}">${borrower.name}${genderBadge}</h2>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                <div class="p-4 rounded-lg text-center" style="background-color: #F7FAFC;">
                    <span class="text-2xl font-bold">${borrower.transaction_ids.length}</span>
                    <span class="block text-sm">Total Books Borrowed</span>
                </div>
                <div class="p-4 rounded-lg text-center" style="background-color: #F7FAFC;">
                    <span class="text-2xl font-bold">${borrower.bookIds.length}</span>
                    <span class="block text-sm">Unique Books Borrowed</span>
                </div>
            </div>
            
            <h3 class="text-xl mb-3">Books Borrowed</h3>
            <div class="overflow-y-auto max-h-96 pr-2">
                ${borrower.books.map(book => {
                    const bookTransactions = borrower.transactions.filter(t => t.book_id === book.id);
                    return `
                        <div class="p-3 border-b" style="border-color: #EDF2F7;">
                            <p>
                                <strong class="book-link cursor-pointer" style="color: var(--accent-primary);" data-book-id="${book.id}">
                                    ${book.title || 'Untitled'}
                                </strong> 
                                by <span style="color: var(--text-by <span style="color: var(--text-secondary);">${book.author || 'Unknown'}</span>
                           </p>
                           <p class="text-sm" style="color: var(--text-secondary);">
                               Borrowed ${bookTransactions.length} time(s)
                               ${bookTransactions.map(t => t.date).join(', ')}
                           </p>
                       </div>
                   `;
               }).join('')}
           </div>`;
           
       document.getElementById('detail-content').innerHTML = content;
       navigateTo('detail');
       document.querySelectorAll('.book-link').forEach(link => 
           link.addEventListener('click', () => showBookDetail(link.dataset.bookId))
       );
       updateURL();
   };

   // --- Pagination and List Rendering ---
   const renderPaginatedList = (type, searchTerm = '') => {
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

       if (pageItems.length === 0) {
           listContainer.innerHTML = `
               <div class="text-center py-8">
                   <p style="color: var(--text-secondary);">No ${type} found matching your criteria.</p>
               </div>`;
           return;
       }

       listContainer.innerHTML = pageItems.map(item => isBooks ? `
           <div class="list-item book-item" data-book-id="${item.id}">
               <h4 class="list-item-title ${isRTL(item.title) ? 'rtl' : ''}">
                   ${highlightMatch(item.title || 'Untitled', searchTerm)}
               </h4>
               <p class="list-item-subtitle">${highlightMatch(item.author || 'Unknown Author', searchTerm)}</p>
               <p class="list-item-subtitle mt-1">
                   Borrowed ${item.transaction_ids.length} time(s)
                   ${item.isLikuteiShoshanim ? '• <span style="color: var(--accent-primary);">Likutei Shoshanim</span>' : ''}
               </p>
           </div>` : `
           <div class="list-item borrower-item" data-borrower-name="${item.name}">
               <h4 class="list-item-title ${isRTL(item.name) ? 'rtl' : ''}">
                   ${highlightMatch(item.name, searchTerm)}
                   ${item.gender === 'female' ? '<span class="ml-2 text-xs" style="color: #D53F8C;">(F)</span>' : ''}
               </h4>
               <p class="list-item-subtitle mt-1">Borrowed ${item.transaction_ids.length} book(s)</p>
           </div>`).join('');
       
       listContainer.querySelectorAll(isBooks ? '.book-item' : '.borrower-item').forEach(item => {
           item.addEventListener('click', () => isBooks ? 
               showBookDetail(item.dataset.bookId) : 
               showBorrowerDetail(item.dataset.borrowerName)
           );
       });

       renderPaginationControls(type);
   };

   const renderPaginationControls = (type) => {
       const isBooks = type === 'books';
       const data = isBooks ? filteredBooks : filteredBorrowers;
       let currentPage = isBooks ? bookCurrentPage : borrowerCurrentPage;
       const totalPages = Math.ceil(data.length / ITEMS_PER_PAGE);
       const paginationContainer = document.getElementById(isBooks ? 'book-pagination' : 'borrower-pagination');
       
       if (totalPages <= 1) { 
           paginationContainer.innerHTML = ''; 
           return; 
       }

       // Intelligent pagination with ellipsis
       let buttons = '';
       const maxButtons = 7;
       
       if (totalPages <= maxButtons) {
           // Show all pages if total is small
           for (let i = 1; i <= totalPages; i++) {
               buttons += `<button class="pagination-btn px-3 py-1 rounded-md ${i === currentPage ? 'active' : ''}" data-page="${i}" data-type="${type}">${i}</button>`;
           }
       } else {
           // Show intelligent pagination with ellipsis
           buttons += `<button class="pagination-btn px-3 py-1 rounded-md ${1 === currentPage ? 'active' : ''}" data-page="1" data-type="${type}">1</button>`;
           
           if (currentPage > 3) {
               buttons += `<span class="px-2">...</span>`;
           }
           
           for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
               buttons += `<button class="pagination-btn px-3 py-1 rounded-md ${i === currentPage ? 'active' : ''}" data-page="${i}" data-type="${type}">${i}</button>`;
           }
           
           if (currentPage < totalPages - 2) {
               buttons += `<span class="px-2">...</span>`;
           }
           
           buttons += `<button class="pagination-btn px-3 py-1 rounded-md ${totalPages === currentPage ? 'active' : ''}" data-page="${totalPages}" data-type="${type}">${totalPages}</button>`;
       }
       
       // Add prev/next buttons
       const prevDisabled = currentPage === 1 ? 'opacity-50 cursor-not-allowed' : '';
       const nextDisabled = currentPage === totalPages ? 'opacity-50 cursor-not-allowed' : '';
       
       paginationContainer.innerHTML = `
           <button class="pagination-btn px-3 py-1 rounded-md ${prevDisabled}" data-page="${Math.max(1, currentPage - 1)}" data-type="${type}" ${currentPage === 1 ? 'disabled' : ''}>←</button>
           ${buttons}
           <button class="pagination-btn px-3 py-1 rounded-md ${nextDisabled}" data-page="${Math.min(totalPages, currentPage + 1)}" data-type="${type}" ${currentPage === totalPages ? 'disabled' : ''}>→</button>
       `;

       paginationContainer.querySelectorAll('.pagination-btn:not([disabled])').forEach(button => {
           button.addEventListener('click', () => {
               const newPage = parseInt(button.dataset.page);
               if (isBooks) {
                   bookCurrentPage = newPage;
               } else {
                   borrowerCurrentPage = newPage;
               }
               renderPaginatedList(type, document.getElementById(isBooks ? 'book-search' : 'borrower-search').value.toLowerCase());
               
               // Scroll to top of list
               listContainer.scrollTop = 0;
           });
       });
   };

   // --- Data Export ---
   const exportListToCSV = (type) => {
       const isBooks = type === 'books';
       const data = isBooks ? filteredBooks : filteredBorrowers;
       
       // Enhanced CSV headers
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
       downloadFile(csvContent, `strashun_${type}_${timestamp}.csv`);
   };

   const exportDetailToJson = () => {
       if (!currentDetail.type || !currentDetail.id) return;
       
       const data = currentDetail.type === 'book' ? 
           libraryData.books.find(b => b.id == currentDetail.id) : 
           libraryData.borrowers.find(b => b.name === currentDetail.id);
       
       // Enrich the export with additional computed fields
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
       const fileName = `strashun_${currentDetail.type}_${currentDetail.id.replace(/[^a-z0-9]/gi, '_')}_${timestamp}.json`;
       downloadFile(jsonContent, fileName);
   };

   // --- Helper Functions ---
   const createChart = (canvasId, type, data, options = {}) => {
       const ctx = document.getElementById(canvasId)?.getContext('2d');
       if (!ctx) return;
       
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

   // --- Copy to Clipboard Function (for sharing URLs) ---
   const copyToClipboard = (text) => {
       if (navigator.clipboard) {
           navigator.clipboard.writeText(text).then(() => {
               console.log('URL copied to clipboard');
           }).catch(err => {
               console.error('Failed to copy: ', err);
           });
       } else {
           // Fallback for older browsers
           const textArea = document.createElement("textarea");
           textArea.value = text;
           textArea.style.position = "fixed";
           textArea.style.left = "-999999px";
           document.body.appendChild(textArea);
           textArea.focus();
           textArea.select();
           try {
               document.execCommand('copy');
               console.log('URL copied to clipboard (fallback)');
           } catch (err) {
               console.error('Failed to copy: ', err);
           }
           document.body.removeChild(textArea);
       }
   };

   // --- Add Share Button Handler (optional - add share button to UI) ---
   const shareCurrentView = () => {
       const currentURL = window.location.href;
       copyToClipboard(currentURL);
       
       // Show temporary notification
       const notification = document.createElement('div');
       notification.innerHTML = 'Link copied to clipboard!';
       notification.style.cssText = `
           position: fixed;
           bottom: 20px;
           right: 20px;
           background: var(--accent-green);
           color: white;
           padding: 12px 20px;
           border-radius: 8px;
           box-shadow: 0 4px 6px rgba(0,0,0,0.1);
           z-index: 1000;
           animation: slideIn 0.3s ease-out;
       `;
       document.body.appendChild(notification);
       setTimeout(() => {
           notification.style.animation = 'slideOut 0.3s ease-out';
           setTimeout(() => document.body.removeChild(notification), 300);
       }, 3000);
   };

   // --- Start the application ---
   initApp();
});

// Add CSS animations for notifications
const style = document.createElement('style');
style.textContent = `
   @keyframes slideIn {
       from { transform: translateX(100%); opacity: 0; }
       to { transform: translateX(0); opacity: 1; }
   }
   @keyframes slideOut {
       from { transform: translateX(0); opacity: 1; }
       to { transform: translateX(100%); opacity: 0; }
   }
`;
document.head.appendChild(style);