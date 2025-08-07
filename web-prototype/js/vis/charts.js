// =================================================================================
// charts.js - Statistical Charts and Dashboard Visualizations
// Handles all Chart.js-based visualizations for the Strashun Library
// =================================================================================

(function() {
    'use strict';

    class ChartsVisualization {
        constructor() {
            this.charts = {};
            this.defaultColors = {
                primary: '#4A5568',
                secondary: '#38A169',
                accent: '#D69E2E',
                danger: '#E53E3E',
                purple: '#805AD5',
                blue: '#3182CE',
                pink: '#D53F8C',
                gray: '#A0AEC0'
            };
            this.initialized = false;
        }

        /**
         * Initialize charts module
         */
        init() {
            if (this.initialized) return;
            
            // Set Chart.js defaults
            this.setChartDefaults();
            
            // Register any custom chart types or plugins if needed
            this.registerCustomPlugins();
            
            this.initialized = true;
            console.log('📊 Charts module initialized');
        }

        /**
         * Set global Chart.js defaults
         */
        setChartDefaults() {
            if (typeof Chart === 'undefined') {
                console.error('Chart.js not loaded');
                return;
            }

            // Set default font
            Chart.defaults.font.family = "'Inter', sans-serif";
            Chart.defaults.font.size = 12;
            
            // Set default colors
            Chart.defaults.color = '#4A5568';
            Chart.defaults.borderColor = '#E2E8F0';
            
            // Animation defaults
            Chart.defaults.animation.duration = 750;
            Chart.defaults.animation.easing = 'easeInOutQuart';
        }

        /**
         * Register custom Chart.js plugins
         */
        registerCustomPlugins() {
            // Custom plugin for better tooltips
            const customTooltip = {
                id: 'customTooltip',
                beforeTooltipDraw: (chart) => {
                    // Could add custom tooltip styling here
                }
            };
            
            // Register if needed
            // Chart.register(customTooltip);
        }

        /**
         * Render all dashboard charts
         */
        renderDashboard() {
            console.log('📈 Rendering dashboard charts...');
            
            this.renderPopularBooksChart();
            this.renderActiveReadersChart();
            this.renderPeriodChart();
            this.renderGenderChart();
            this.renderSeasonalityChart();
            this.renderLanguageChart();
            this.renderDayOfWeekChart();
            this.renderReadingIntensityChart();
        }

        /**
         * Render popular books horizontal bar chart
         */
        renderPopularBooksChart() {
            const canvas = document.getElementById('popular-books-chart');
            if (!canvas) return;

            const popularBooks = this.getTopBooks(15);
            if (!popularBooks || popularBooks.length === 0) {
                this.showNoDataMessage(canvas.parentElement);
                return;
            }

            this.createChart('popular-books-chart', {
                type: 'bar',
                data: {
                    labels: popularBooks.map(b => this.truncateLabel(b.title || `Book ID: ${b.book_id}`, 40)),
                    datasets: [{
                        label: 'Times Borrowed',
                        data: popularBooks.map(b => b.transactions.length),
                        backgroundColor: 'rgba(74, 85, 104, 0.8)',
                        borderColor: 'rgba(74, 85, 104, 1)',
                        borderWidth: 1,
                        borderRadius: 4,
                        barThickness: 'flex',
                        maxBarThickness: 30
                    }]
                },
                options: {
                    indexAxis: 'y',
                    responsive: true,
                    maintainAspectRatio: false,
                    onClick: (evt, elements) => {
                        if (elements[0] && window.StrashunViews?.BookView) {
                            const book = popularBooks[elements[0].index];
                            window.StrashunViews.BookView.showDetail(book.book_id);
                        }
                    },
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            backgroundColor: 'rgba(0, 0, 0, 0.8)',
                            padding: 12,
                            cornerRadius: 8,
                            titleFont: { size: 14, weight: 'bold' },
                            bodyFont: { size: 12 },
                            callbacks: {
                                afterLabel: (context) => {
                                    const book = popularBooks[context.dataIndex];
                                    const uniqueReaders = new Set(book.transactions.map(t => t.borrower_name)).size;
                                    return [
                                        `Unique readers: ${uniqueReaders}`,
                                        book.author ? `Author: ${book.author}` : null,
                                        book.language ? `Language: ${book.language}` : null
                                    ].filter(Boolean);
                                }
                            }
                        }
                    },
                    scales: {
                        x: {
                            beginAtZero: true,
                            grid: { display: false },
                            ticks: { 
                                precision: 0,
                                color: '#718096'
                            }
                        },
                        y: {
                            grid: { color: '#F7FAFC' },
                            ticks: {
                                color: '#4A5568',
                                font: { size: 11 },
                                callback: function(value, index) {
                                    const label = this.getLabelForValue(value);
                                    return label.length > 35 ? label.substr(0, 35) + '...' : label;
                                }
                            }
                        }
                    },
                    interaction: {
                        intersect: false,
                        mode: 'index'
                    },
                    onHover: (event, elements) => {
                        canvas.style.cursor = elements.length > 0 ? 'pointer' : 'default';
                    }
                }
            });
        }

        /**
         * Render active readers horizontal bar chart
         */
        renderActiveReadersChart() {
            const canvas = document.getElementById('active-readers-chart');
            if (!canvas) return;

            const activeReaders = this.getTopBorrowers(15);
            if (!activeReaders || activeReaders.length === 0) {
                this.showNoDataMessage(canvas.parentElement);
                return;
            }

            this.createChart('active-readers-chart', {
                type: 'bar',
                data: {
                    labels: activeReaders.map(b => this.truncateLabel(b.borrower_name, 30)),
                    datasets: [{
                        label: 'Books Borrowed',
                        data: activeReaders.map(b => b.transactions.length),
                        backgroundColor: 'rgba(56, 161, 105, 0.8)',
                        borderColor: 'rgba(56, 161, 105, 1)',
                        borderWidth: 1,
                        borderRadius: 4,
                        barThickness: 'flex',
                        maxBarThickness: 30
                    }]
                },
                options: {
                    indexAxis: 'y',
                    responsive: true,
                    maintainAspectRatio: false,
                    onClick: (evt, elements) => {
                        if (elements[0] && window.StrashunViews?.BorrowerView) {
                            const borrower = activeReaders[elements[0].index];
                            window.StrashunViews.BorrowerView.showDetail(borrower.borrower_name);
                        }
                    },
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            backgroundColor: 'rgba(0, 0, 0, 0.8)',
                            padding: 12,
                            cornerRadius: 8,
                            callbacks: {
                                afterLabel: (context) => {
                                    const borrower = activeReaders[context.dataIndex];
                                    const uniqueBooks = new Set(borrower.transactions.map(t => t.book_id)).size;
                                    const avgReReads = (borrower.transactions.length / uniqueBooks).toFixed(1);
                                    return [
                                        `Unique books: ${uniqueBooks}`,
                                        `Avg re-reads: ${avgReReads}`,
                                        borrower.gender === 'W' ? '👩 Female' : borrower.gender === 'M' ? '👨 Male' : null
                                    ].filter(Boolean);
                                }
                            }
                        }
                    },
                    scales: {
                        x: {
                            beginAtZero: true,
                            grid: { display: false },
                            ticks: { 
                                precision: 0,
                                color: '#718096'
                            }
                        },
                        y: {
                            grid: { color: '#F7FAFC' },
                            ticks: {
                                color: '#4A5568',
                                font: { size: 11 }
                            }
                        }
                    },
                    onHover: (event, elements) => {
                        canvas.style.cursor = elements.length > 0 ? 'pointer' : 'default';
                    }
                }
            });
        }

        /**
         * Render period distribution pie chart
         */
        renderPeriodChart() {
            const canvas = document.getElementById('period-chart');
            if (!canvas) return;

            const periodData = this.getPeriodData();
            if (!periodData || periodData.length === 0) {
                this.showNoDataMessage(canvas.parentElement);
                return;
            }

            this.createChart('period-chart', {
                type: 'pie',
                data: {
                    labels: periodData.map(p => `${p.year}`),
                    datasets: [{
                        data: periodData.map(p => p.total_transactions),
                        backgroundColor: [
                            'rgba(74, 85, 104, 0.8)',
                            'rgba(56, 161, 105, 0.8)',
                            'rgba(214, 158, 46, 0.8)',
                            'rgba(229, 62, 62, 0.8)',
                            'rgba(128, 90, 213, 0.8)',
                            'rgba(49, 130, 206, 0.8)'
                        ],
                        borderColor: '#fff',
                        borderWidth: 2
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: {
                                padding: 15,
                                font: { size: 11 },
                                generateLabels: (chart) => {
                                    const data = chart.data;
                                    const total = data.datasets[0].data.reduce((a, b) => a + b, 0);
                                    return data.labels.map((label, i) => {
                                        const value = data.datasets[0].data[i];
                                        const percentage = ((value / total) * 100).toFixed(1);
                                        return {
                                            text: `${label}: ${percentage}%`,
                                            fillStyle: data.datasets[0].backgroundColor[i],
                                            hidden: false,
                                            index: i
                                        };
                                    });
                                }
                            }
                        },
                        tooltip: {
                            callbacks: {
                                label: (context) => {
                                    const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                    const percentage = ((context.parsed / total) * 100).toFixed(1);
                                    return `${context.label}: ${context.parsed.toLocaleString()} (${percentage}%)`;
                                }
                            }
                        }
                    }
                }
            });
        }

        /**
         * Render gender distribution doughnut chart
         */
        renderGenderChart() {
            const canvas = document.getElementById('gender-chart');
            if (!canvas) return;

            const genderData = this.getGenderData();
            if (!genderData || genderData.length === 0) {
                this.showNoDataMessage(canvas.parentElement);
                return;
            }

            this.createChart('gender-chart', {
                type: 'doughnut',
                data: {
                    labels: genderData.map(g => 
                        g.gender === 'W' ? 'Female' : 
                        g.gender === 'M' ? 'Male' : 
                        'Unknown'
                    ),
                    datasets: [{
                        data: genderData.map(g => g.total_transactions),
                        backgroundColor: [
                            'rgba(236, 72, 153, 0.8)',  // Pink for Female
                            'rgba(59, 130, 246, 0.8)',   // Blue for Male
                            'rgba(156, 163, 175, 0.8)'   // Gray for Unknown
                        ],
                        borderColor: '#fff',
                        borderWidth: 2
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    cutout: '60%',
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: {
                                padding: 15,
                                font: { size: 11 }
                            }
                        },
                        tooltip: {
                            callbacks: {
                                label: (context) => {
                                    const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                    const percentage = ((context.parsed / total) * 100).toFixed(1);
                                    return `${context.label}: ${context.parsed.toLocaleString()} (${percentage}%)`;
                                }
                            }
                        }
                    }
                }
            });
        }

        /**
         * Render seasonality line chart
         */
        renderSeasonalityChart() {
            const canvas = document.getElementById('seasonality-chart');
            if (!canvas) return;

            const monthlyData = this.getMonthlyData();
            if (!monthlyData) {
                this.showNoDataMessage(canvas.parentElement);
                return;
            }

            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

            this.createChart('seasonality-chart', {
                type: 'line',
                data: {
                    labels: months,
                    datasets: [{
                        label: 'Borrowing Activity',
                        data: monthlyData,
                        borderColor: 'rgba(59, 130, 246, 1)',
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        borderWidth: 2,
                        tension: 0.4,
                        fill: true,
                        pointRadius: 4,
                        pointHoverRadius: 6,
                        pointBackgroundColor: '#fff',
                        pointBorderColor: 'rgba(59, 130, 246, 1)',
                        pointBorderWidth: 2
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            callbacks: {
                                afterLabel: (context) => {
                                    const total = monthlyData.reduce((a, b) => a + b, 0);
                                    const percentage = ((context.parsed.y / total) * 100).toFixed(1);
                                    return `${percentage}% of yearly activity`;
                                }
                            }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            grid: { color: '#F7FAFC' },
                            ticks: { color: '#718096' }
                        },
                        x: {
                            grid: { display: false },
                            ticks: { color: '#718096' }
                        }
                    }
                }
            });
        }

        /**
         * Render language distribution chart
         */
        renderLanguageChart() {
            const canvas = document.getElementById('language-chart');
            if (!canvas) return;

            const languageData = this.getLanguageData();
            if (!languageData || languageData.length === 0) {
                this.showNoDataMessage(canvas.parentElement);
                return;
            }

            // Take top 8 languages
            const topLanguages = languageData.slice(0, 8);

            this.createChart('language-chart', {
                type: 'bar',
                data: {
                    labels: topLanguages.map(l => this.getLanguageName(l.language)),
                    datasets: [{
                        label: 'Books in Collection',
                        data: topLanguages.map(l => l.count),
                        backgroundColor: 'rgba(139, 92, 246, 0.8)',
                        borderColor: 'rgba(139, 92, 246, 1)',
                        borderWidth: 1,
                        borderRadius: 4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            callbacks: {
                                afterLabel: (context) => {
                                    const total = languageData.reduce((sum, l) => sum + l.count, 0);
                                    const percentage = ((context.parsed.y / total) * 100).toFixed(1);
                                    return `${percentage}% of collection`;
                                }
                            }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            grid: { color: '#F7FAFC' },
                            ticks: { 
                                precision: 0,
                                color: '#718096'
                            }
                        },
                        x: {
                            grid: { display: false },
                            ticks: { 
                                color: '#718096',
                                autoSkip: false,
                                maxRotation: 45,
                                minRotation: 0
                            }
                        }
                    }
                }
            });
        }

        /**
         * Render day of week activity chart (NEW)
         */
        renderDayOfWeekChart() {
            const canvas = document.getElementById('day-of-week-chart');
            if (!canvas) return;

            const dayData = this.getDayOfWeekData();
            if (!dayData) return;

            const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

            this.createChart('day-of-week-chart', {
                type: 'radar',
                data: {
                    labels: days,
                    datasets: [{
                        label: 'Borrowing Activity',
                        data: dayData,
                        borderColor: 'rgba(16, 185, 129, 1)',
                        backgroundColor: 'rgba(16, 185, 129, 0.2)',
                        borderWidth: 2,
                        pointRadius: 4,
                        pointHoverRadius: 6,
                        pointBackgroundColor: '#fff',
                        pointBorderColor: 'rgba(16, 185, 129, 1)'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            callbacks: {
                                label: (context) => {
                                    return `${context.label}: ${context.parsed.r} transactions`;
                                }
                            }
                        }
                    },
                    scales: {
                        r: {
                            beginAtZero: true,
                            grid: { color: '#E5E7EB' },
                            ticks: { 
                                color: '#718096',
                                backdropColor: 'transparent'
                            }
                        }
                    }
                }
            });
        }

        /**
         * Render reading intensity distribution (NEW)
         */
        renderReadingIntensityChart() {
            const canvas = document.getElementById('reading-intensity-chart');
            if (!canvas) return;

            const intensityData = this.getReadingIntensityData();
            if (!intensityData) return;

            this.createChart('reading-intensity-chart', {
                type: 'bar',
                data: {
                    labels: intensityData.labels,
                    datasets: [{
                        label: 'Number of Readers',
                        data: intensityData.values,
                        backgroundColor: [
                            'rgba(156, 163, 175, 0.8)',  // Gray for casual
                            'rgba(59, 130, 246, 0.8)',   // Blue for regular
                            'rgba(139, 92, 246, 0.8)',   // Purple for active
                            'rgba(236, 72, 153, 0.8)',   // Pink for power
                            'rgba(245, 158, 11, 0.8)'    // Amber for super
                        ],
                        borderColor: '#fff',
                        borderWidth: 2,
                        borderRadius: 4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            callbacks: {
                                afterLabel: (context) => {
                                    const total = intensityData.values.reduce((a, b) => a + b, 0);
                                    const percentage = ((context.parsed.y / total) * 100).toFixed(1);
                                    return `${percentage}% of all readers`;
                                }
                            }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            grid: { color: '#F7FAFC' },
                            ticks: { 
                                precision: 0,
                                color: '#718096'
                            }
                        },
                        x: {
                            grid: { display: false },
                            ticks: { color: '#718096' }
                        }
                    }
                }
            });
        }

        // ========== Data Processing Methods ==========

        /**
         * Get top books by borrowing frequency
         */
        getTopBooks(limit = 20) {
            if (!window.StrashunCore?.AppState?.libraryData?.books) return [];
            
            return [...window.StrashunCore.AppState.libraryData.books]
                .filter(book => book.transactions && book.transactions.length > 0)
                .sort((a, b) => b.transactions.length - a.transactions.length)
                .slice(0, limit);
        }

        /**
         * Get top borrowers by activity
         */
        getTopBorrowers(limit = 20) {
            if (!window.StrashunCore?.AppState?.libraryData?.borrowers) return [];
            
            return [...window.StrashunCore.AppState.libraryData.borrowers]
                .filter(borrower => borrower.transactions && borrower.transactions.length > 0)
                .sort((a, b) => b.transactions.length - a.transactions.length)
                .slice(0, limit);
        }

        /**
         * Get period distribution data
         */
        getPeriodData() {
            const stats = window.StrashunCore?.AppState?.libraryData?.stats;
            return stats?.by_year || [];
        }

        /**
         * Get gender distribution data
         */
        getGenderData() {
            const stats = window.StrashunCore?.AppState?.libraryData?.stats;
            return stats?.by_gender || [];
        }

        /**
         * Get language distribution data
         */
        getLanguageData() {
            const stats = window.StrashunCore?.AppState?.libraryData?.stats;
            if (!stats?.by_language) {
                // Calculate from books if not in stats
                const books = window.StrashunCore?.AppState?.libraryData?.books;
                if (!books) return [];
                
                const languageCounts = {};
                books.forEach(book => {
                    const lang = book.language || 'unknown';
                    languageCounts[lang] = (languageCounts[lang] || 0) + 1;
                });
                
                return Object.entries(languageCounts)
                    .map(([language, count]) => ({ language, count }))
                    .sort((a, b) => b.count - a.count);
            }
            
            return stats.by_language
                .map(l => ({ language: l.language, count: l.total_transactions }))
                .sort((a, b) => b.count - a.count);
        }

        /**
         * Get monthly distribution data
         */
        getMonthlyData() {
            const transactions = window.StrashunCore?.AppState?.libraryData?.transactions;
            if (!transactions) return null;

            const monthCounts = new Array(12).fill(0);
            transactions.forEach(t => {
                if (t.date) {
                    const month = new Date(t.date).getMonth();
                    if (!isNaN(month) && month >= 0 && month < 12) {
                        monthCounts[month]++;
                    }
                }
            });
            
            return monthCounts;
        }

        /**
         * Get day of week distribution data
         */
        getDayOfWeekData() {
            const transactions = window.StrashunCore?.AppState?.libraryData?.transactions;
            if (!transactions) return null;

            const dayCounts = new Array(7).fill(0);
            transactions.forEach(t => {
                if (t.date) {
                    const day = new Date(t.date).getDay();
                    if (!isNaN(day) && day >= 0 && day < 7) {
                        dayCounts[day]++;
                    }
                }
            });
            
            return dayCounts;
        }

        /**
         * Get reading intensity distribution
         */
        getReadingIntensityData() {
            const borrowers = window.StrashunCore?.AppState?.libraryData?.borrowers;
            if (!borrowers) return null;

            const categories = {
                'Casual (1 book)': 0,
                'Light (2-5 books)': 0,
                'Regular (6-20 books)': 0,
                'Active (21-50 books)': 0,
                'Power (50+ books)': 0
            };

            borrowers.forEach(borrower => {
                const count = borrower.transactions?.length || 0;
                if (count === 1) categories['Casual (1 book)']++;
                else if (count >= 2 && count <= 5) categories['Light (2-5 books)']++;
                else if (count >= 6 && count <= 20) categories['Regular (6-20 books)']++;
                else if (count >= 21 && count <= 50) categories['Active (21-50 books)']++;
                else if (count > 50) categories['Power (50+ books)']++;
            });

            return {
                labels: Object.keys(categories),
                values: Object.values(categories)
            };
        }

        // ========== Utility Methods ==========

        /**
         * Create or update a chart
         */
        createChart(canvasId, config) {
            const ctx = document.getElementById(canvasId)?.getContext('2d');
            if (!ctx) return null;

            // Destroy existing chart if it exists
            if (this.charts[canvasId]) {
                this.charts[canvasId].destroy();
                delete this.charts[canvasId];
            }

            // Create new chart
            this.charts[canvasId] = new Chart(ctx, config);
            return this.charts[canvasId];
        }

        /**
         * Update existing chart data
         */
        updateChart(canvasId, newData) {
            const chart = this.charts[canvasId];
            if (!chart) return;

            chart.data = newData;
            chart.update();
        }

        /**
         * Destroy a specific chart
         */
        destroyChart(canvasId) {
            if (this.charts[canvasId]) {
                this.charts[canvasId].destroy();
                delete this.charts[canvasId];
            }
        }

        /**
         * Destroy all charts
         */
        destroyAllCharts() {
            Object.keys(this.charts).forEach(id => this.destroyChart(id));
        }

        /**
         * Truncate long labels
         */
        truncateLabel(label, maxLength = 40) {
            if (!label) return '';
            return label.length > maxLength ? label.substring(0, maxLength - 3) + '...' : label;
        }

        /**
         * Get language display name
         */
        getLanguageName(code) {
            const languages = {
                'heb': 'Hebrew',
                'yid': 'Yiddish',
                'ger': 'German',
                'lat': 'Latin',
                'ara': 'Arabic',
                'arc': 'Aramaic',
                'eng': 'English',
                'rus': 'Russian',
                'pol': 'Polish',
                'fre': 'French',
                'spa': 'Spanish',
                'ita': 'Italian',
                'unknown': 'Unknown'
            };
            return languages[code?.toLowerCase()] || code || 'Unknown';
        }

        /**
         * Show no data message
         */
        showNoDataMessage(container) {
            if (!container) return;
            
            const canvas = container.querySelector('canvas');
            if (canvas) {
                canvas.style.display = 'none';
            }
            
            const message = document.createElement('div');
            message.className = 'text-center text-gray-500 py-8';
            message.innerHTML = `
                <svg class="w-12 h-12 mx-auto mb-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z">
                    </path>
                </svg>
                <p>No data available</p>
            `;
            container.appendChild(message);
        }

        /**
         * Refresh all charts
         */
        refresh() {
            console.log('🔄 Refreshing all charts...');
            this.renderDashboard();
        }

        /**
         * Export chart as image
         */
        exportChart(canvasId, filename = 'chart.png') {
            const chart = this.charts[canvasId];
            if (!chart) return;

            const url = chart.toBase64Image();
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            link.click();
        }

        /**
         * Get chart instance
         */
        getChart(canvasId) {
            return this.charts[canvasId];
        }

        /**
         * Check if charts are initialized
         */
        isInitialized() {
            return this.initialized;
        }
    }

    // Create singleton instance and export
    const chartsInstance = new ChartsVisualization();
    
    // Export to window
    window.ChartsVisualization = chartsInstance;
    
    // Also export to StrashunViz namespace for compatibility
    if (!window.StrashunViz) {
        window.StrashunViz = {};
    }
    window.StrashunViz.Charts = chartsInstance;
    window.StrashunViz.DashboardView = {
        render: () => chartsInstance.renderDashboard()
    };

    console.log('📊 Charts module loaded');
})();