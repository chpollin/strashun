// =================================================================================
// app-init.js - Application Initialization and Orchestration
// Coordinates all modules and handles startup sequence
// =================================================================================

(function() {
    'use strict';

    // Application initialization controller
    class AppInitializer {
        constructor() {
            this.initStartTime = null;
            this.modules = {
                core: false,
                views: false,
                visualizations: false
            };
        }

        /**
         * Main initialization sequence
         */
        async init() {
            this.initStartTime = performance.now();
            console.log('🚀 Strashun Library Digital Archive - Initializing...');

            try {
                // Step 1: Verify dependencies
                this.verifyDependencies();

                // Step 2: Load data
                await this.loadData();

                // Step 3: Initialize UI managers
                this.initializeManagers();

                // Step 4: Initialize visualizations
                this.initializeVisualizations();

                // Step 5: Render initial views
                this.renderInitialViews();

                // Step 6: Handle URL state
                this.handleUrlState();

                // Step 7: Show application
                this.showApplication();

                // Log success
                const loadTime = ((performance.now() - this.initStartTime) / 1000).toFixed(2);
                console.log(`✅ Application initialized successfully in ${loadTime}s`);

            } catch (error) {
                console.error('❌ Initialization failed:', error);
                this.showError(error);
            }
        }

        /**
         * Verify all required dependencies are loaded
         */
        verifyDependencies() {
            console.group('📦 Verifying dependencies...');
            
            const dependencies = [
                { name: 'Chart.js', check: () => typeof Chart !== 'undefined' },
                { name: 'Vis.js', check: () => typeof vis !== 'undefined' },
                { name: 'Core Module', check: () => typeof window.StrashunCore !== 'undefined' },
                { name: 'Views Module', check: () => typeof window.StrashunViews !== 'undefined' },
                { name: 'Ego Network', check: () => typeof window.EgoNetwork !== 'undefined' }
            ];

            let allLoaded = true;
            dependencies.forEach(dep => {
                const loaded = dep.check();
                console.log(`${loaded ? '✅' : '❌'} ${dep.name}`);
                if (!loaded) allLoaded = false;
            });

            console.groupEnd();

            if (!allLoaded) {
                throw new Error('Missing required dependencies. Please check script loading order.');
            }

            this.modules.core = true;
        }

        /**
         * Load library data
         */
        async loadData() {
            console.log('📊 Loading library data...');
            
            const spinner = document.getElementById('loading-spinner');
            if (spinner) {
                spinner.querySelector('p').textContent = 'Loading library records...';
            }

            const success = await window.StrashunCore.DataManager.loadData();
            
            if (!success) {
                throw new Error('Failed to load library data. Please check the data file path.');
            }

            // Verify data integrity
            const { AppState } = window.StrashunCore;
            const stats = {
                books: AppState.libraryData?.books?.length || 0,
                borrowers: AppState.libraryData?.borrowers?.length || 0,
                transactions: AppState.libraryData?.transactions?.length || 0
            };

            console.log(`📚 Loaded: ${stats.books} books, ${stats.borrowers} borrowers, ${stats.transactions} transactions`);

            // Apply any necessary data fixes
            this.applyDataFixes();

            return stats;
        }

        /**
         * Apply fixes for known data issues
         */
        applyDataFixes() {
            const { AppState } = window.StrashunCore;
            
            if (!AppState?.libraryData?.stats) {
                console.warn('⚠️ Stats object missing, creating default...');
                AppState.libraryData.stats = {};
            }

            // Fix for missing by_year stats
            if (!AppState.libraryData.stats.by_year || AppState.libraryData.stats.by_year.length === 0) {
                console.warn('⚠️ Applying by_year stats fix...');
                
                // Calculate from transactions
                const yearCounts = {};
                AppState.libraryData.transactions?.forEach(t => {
                    if (t.date) {
                        const year = new Date(t.date).getFullYear();
                        if (!isNaN(year)) {
                            yearCounts[year] = (yearCounts[year] || 0) + 1;
                        }
                    }
                });

                AppState.libraryData.stats.by_year = Object.entries(yearCounts)
                    .map(([year, count]) => ({ year: parseInt(year), total_transactions: count }))
                    .sort((a, b) => a.year - b.year);
            }

            // Fix for missing by_gender stats
            if (!AppState.libraryData.stats.by_gender || AppState.libraryData.stats.by_gender.length === 0) {
                console.warn('⚠️ Applying by_gender stats fix...');
                
                const genderCounts = { M: 0, W: 0, U: 0 };
                AppState.libraryData.transactions?.forEach(t => {
                    const gender = t.gender || 'U';
                    genderCounts[gender]++;
                });

                AppState.libraryData.stats.by_gender = Object.entries(genderCounts)
                    .map(([gender, count]) => ({ gender, total_transactions: count }))
                    .filter(g => g.total_transactions > 0);
            }

            // Fix for missing by_language stats
            if (!AppState.libraryData.stats.by_language || AppState.libraryData.stats.by_language.length === 0) {
                console.warn('⚠️ Applying by_language stats fix...');
                
                const languageCounts = {};
                AppState.libraryData.books?.forEach(book => {
                    const lang = book.language || 'unknown';
                    languageCounts[lang] = (languageCounts[lang] || 0) + 1;
                });

                AppState.libraryData.stats.by_language = Object.entries(languageCounts)
                    .map(([language, count]) => ({ language, total_transactions: count }))
                    .sort((a, b) => b.total_transactions - a.total_transactions);
            }
        }

        /**
         * Initialize UI managers
         */
        initializeManagers() {
            console.log('🎨 Initializing UI managers...');
            
            const { NavigationManager, BookView, BorrowerView } = window.StrashunViews;
            
            // Initialize navigation
            NavigationManager.init();
            
            // Initialize views
            BookView.init();
            BorrowerView.init();
            
            this.modules.views = true;
            console.log('✅ UI managers initialized');
        }

        /**
         * Initialize visualization modules
         */
        initializeVisualizations() {
            console.log('📈 Initializing visualizations...');
            
            // Initialize Ego Network
            if (window.EgoNetwork) {
                window.EgoNetwork.init();
                console.log('✅ Ego Network initialized');
            }

            // Initialize Charts if available
            if (window.ChartsVisualization) {
                window.ChartsVisualization.init();
                console.log('✅ Charts initialized');
            }

            // Initialize Timeline if available
            if (window.TimelineVisualization) {
                window.TimelineVisualization.init();
                console.log('✅ Timeline initialized');
            }

            this.modules.visualizations = true;
        }

        /**
         * Render initial views
         */
        renderInitialViews() {
            console.log('🖼️ Rendering initial views...');
            
            // Render dashboard charts
            if (window.StrashunViz?.DashboardView) {
                window.StrashunViz.DashboardView.render();
            } else {
                // Fallback: render basic charts if the full viz module isn't loaded
                this.renderBasicDashboard();
            }

            // Initial render of lists
            window.StrashunViews.BookView.update();
            window.StrashunViews.BorrowerView.update();
            
            console.log('✅ Initial views rendered');
        }

        /**
         * Fallback dashboard rendering
         */
        renderBasicDashboard() {
            console.log('📊 Rendering basic dashboard...');
            
            // Update statistics
            window.StrashunCore.DataManager.updateStatistics();
            
            // You could add basic chart rendering here if needed
            // For now, just ensure the stats are displayed
        }

        /**
         * Handle URL state and navigation
         */
        handleUrlState() {
            console.log('🔗 Processing URL state...');
            
            const urlState = window.StrashunCore.URLManager.loadFromURL();
            
            if (urlState.type === 'detail') {
                // Navigate to detail view
                console.log(`📖 Navigating to ${urlState.detailType} detail: ${urlState.detailId}`);
                
                if (urlState.detailType === 'book') {
                    window.StrashunViews.BookView.showDetail(urlState.detailId);
                } else if (urlState.detailType === 'borrower') {
                    window.StrashunViews.BorrowerView.showDetail(urlState.detailId);
                }
            } else {
                // Navigate to specified view or dashboard
                const targetView = urlState.view || 'dashboard';
                console.log(`📍 Navigating to view: ${targetView}`);
                window.StrashunViews.NavigationManager.navigateTo(targetView);
            }
        }

        /**
         * Show the application and hide loading screen
         */
        showApplication() {
            const spinner = document.getElementById('loading-spinner');
            const mainContent = document.getElementById('main-content');
            
            if (spinner && mainContent) {
                // Fade out spinner
                spinner.style.transition = 'opacity 0.3s ease-out';
                spinner.style.opacity = '0';
                
                setTimeout(() => {
                    spinner.style.display = 'none';
                    mainContent.style.display = 'block';
                    
                    // Trigger a resize event for any charts that need it
                    window.dispatchEvent(new Event('resize'));
                    
                    console.log('🎉 Application ready!');
                }, 300);
            }
        }

        /**
         * Show error message
         */
        showError(error) {
            const spinner = document.getElementById('loading-spinner');
            if (spinner) {
                spinner.innerHTML = `
                    <div class="max-w-md mx-auto p-6 bg-red-50 rounded-lg">
                        <div class="text-center">
                            <svg class="w-16 h-16 text-red-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                                      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                            </svg>
                            <h2 class="text-xl font-bold text-red-700 mb-2">Initialization Error</h2>
                            <p class="text-red-600 mb-4">${error.message}</p>
                            <details class="text-left text-sm text-gray-600">
                                <summary class="cursor-pointer text-center text-blue-600 hover:underline">
                                    Show technical details
                                </summary>
                                <pre class="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto">${error.stack}</pre>
                            </details>
                            <button onclick="location.reload()" 
                                    class="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
                                Reload Page
                            </button>
                        </div>
                    </div>
                `;
            }
        }
    }

    // Global error handler
    window.addEventListener('error', (event) => {
        console.error('🔴 Global error caught:', event.error);
        
        // Log to console but don't break the app for non-critical errors
        if (event.error?.message?.includes('Cannot read properties')) {
            console.warn('⚠️ Attempting to recover from property access error...');
            event.preventDefault(); // Prevent default error handling
        }
    });

    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
        console.error('🔴 Unhandled promise rejection:', event.reason);
        
        // Don't break the app for network errors
        if (event.reason?.message?.includes('fetch')) {
            console.warn('⚠️ Network error detected, continuing...');
            event.preventDefault();
        }
    });

    // Performance monitoring
    window.addEventListener('load', () => {
        if (window.performance?.timing) {
            const loadTime = window.performance.timing.loadEventEnd - window.performance.timing.navigationStart;
            console.log(`📊 Page load time: ${loadTime}ms`);
        }
    });

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            const initializer = new AppInitializer();
            initializer.init();
        });
    } else {
        // DOM already loaded (shouldn't happen with defer, but just in case)
        const initializer = new AppInitializer();
        initializer.init();
    }

    // Export for debugging
    window.AppInitializer = AppInitializer;

})();

// Development/Debug utilities
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    console.log('🔧 Development mode detected');
    
    // Add debug helpers to window
    window.StrashunDebug = {
        // Get current state
        getState: () => window.StrashunCore?.AppState,
        
        // Get statistics
        getStats: () => {
            const state = window.StrashunCore?.AppState;
            if (!state?.libraryData) return null;
            
            return {
                books: state.libraryData.books?.length || 0,
                borrowers: state.libraryData.borrowers?.length || 0,
                transactions: state.libraryData.transactions?.length || 0,
                bookIndex: state.bookIndex?.size || 0,
                borrowerIndex: state.borrowerIndex?.size || 0,
                ghostRecords: state.libraryData.transactions?.filter(t => 
                    !state.bookIndex.has(t.book_id)
                ).length || 0
            };
        },
        
        // Test navigation
        testNavigation: () => {
            const views = ['dashboard', 'books', 'borrowers', 'timeline', 'statistics'];
            views.forEach((view, i) => {
                setTimeout(() => {
                    console.log(`Testing navigation to: ${view}`);
                    window.StrashunViews?.NavigationManager?.navigateTo(view);
                }, i * 1000);
            });
        },
        
        // Test ego network
        testEgoNetwork: (bookId = 1) => {
            console.log(`Testing ego network for book ${bookId}`);
            window.EgoNetwork?.showInModal(bookId, 'book');
        },
        
        // Clear all filters
        clearAllFilters: () => {
            ['book-search', 'borrower-search', 'book-sort', 'book-period-filter', 
             'borrower-gender-filter', 'borrower-activity-filter'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.value = el.tagName === 'SELECT' ? el.options[0].value : '';
            });
            window.StrashunViews?.BookView?.update();
            window.StrashunViews?.BorrowerView?.update();
        },
        
        // Performance check
        checkPerformance: () => {
            const metrics = {
                memory: performance.memory ? 
                    `${(performance.memory.usedJSHeapSize / 1048576).toFixed(2)} MB` : 
                    'Not available',
                domNodes: document.getElementsByTagName('*').length,
                listeners: (() => {
                    let count = 0;
                    const allElements = document.getElementsByTagName('*');
                    for (let el of allElements) {
                        const listeners = getEventListeners ? getEventListeners(el) : {};
                        count += Object.keys(listeners).reduce((sum, key) => 
                            sum + listeners[key].length, 0
                        );
                    }
                    return count;
                })()
            };
            console.table(metrics);
            return metrics;
        }
    };
    
    console.log('Debug utilities available at window.StrashunDebug');
    console.log('Try: StrashunDebug.getStats() or StrashunDebug.testEgoNetwork()');
}