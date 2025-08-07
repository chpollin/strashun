// =================================================================================
// timeline.js - Timeline Analysis and Temporal Visualizations
// Handles temporal patterns, trends, and time-based analysis
// =================================================================================

(function() {
    'use strict';

    class TimelineVisualization {
        constructor() {
            this.chart = null;
            this.currentView = 'overview';
            this.currentGranularity = 'yearly';
            this.currentMetric = 'total';
            this.initialized = false;
            
            // Color schemes for different metrics
            this.colorSchemes = {
                total: {
                    border: 'rgba(59, 130, 246, 1)',
                    background: 'rgba(59, 130, 246, 0.1)'
                },
                unique_borrowers: {
                    border: 'rgba(16, 185, 129, 1)',
                    background: 'rgba(16, 185, 129, 0.1)'
                },
                unique_books: {
                    border: 'rgba(139, 92, 246, 1)',
                    background: 'rgba(139, 92, 246, 0.1)'
                },
                gender: {
                    border: 'rgba(236, 72, 153, 1)',
                    background: 'rgba(236, 72, 153, 0.1)'
                },
                avg_books_per_reader: {
                    border: 'rgba(245, 158, 11, 1)',
                    background: 'rgba(245, 158, 11, 0.1)'
                },
                ghost_records: {
                    border: 'rgba(239, 68, 68, 1)',
                    background: 'rgba(239, 68, 68, 0.1)'
                }
            };

            // Cache for processed data
            this.dataCache = {};
        }

        /**
         * Initialize timeline module
         */
        init() {
            if (this.initialized) return;
            
            this.setupEventListeners();
            this.initialized = true;
            console.log('📅 Timeline module initialized');
        }

        /**
         * Setup event listeners for controls
         */
        setupEventListeners() {
            // Granularity selector
            const granularitySelect = document.getElementById('timeline-granularity');
            if (granularitySelect) {
                granularitySelect.addEventListener('change', (e) => {
                    this.currentGranularity = e.target.value;
                    this.render();
                });
            }

            // Metric selector
            const metricSelect = document.getElementById('timeline-metric');
            if (metricSelect) {
                metricSelect.addEventListener('change', (e) => {
                    this.currentMetric = e.target.value;
                    this.render();
                });
            }

            // Refresh button
            const refreshBtn = document.getElementById('timeline-refresh');
            if (refreshBtn) {
                refreshBtn.addEventListener('click', () => {
                    this.clearCache();
                    this.render();
                });
            }

            // View mode buttons (if you add them)
            document.addEventListener('click', (e) => {
                if (e.target.matches('[data-timeline-view]')) {
                    this.currentView = e.target.dataset.timelineView;
                    this.render();
                }
            });
        }

        /**
         * Main render method
         */
        render() {
            console.log('📈 Rendering timeline:', this.currentGranularity, this.currentMetric);
            
            const canvas = document.getElementById('timeline-chart');
            if (!canvas) {
                console.error('Timeline canvas not found');
                return;
            }

            // Clear any existing no-data message
            const container = canvas.parentElement;
            const existingMessage = container.querySelector('.no-data-message');
            if (existingMessage) existingMessage.remove();

            // Get data based on current settings
            const data = this.getData(this.currentGranularity, this.currentMetric);
            
            if (!data || data.labels.length === 0) {
                this.showNoData(container);
                return;
            }

            // Render based on current view
            switch (this.currentView) {
                case 'comparison':
                    this.renderComparisonView(data);
                    break;
                case 'cumulative':
                    this.renderCumulativeView(data);
                    break;
                case 'breakdown':
                    this.renderBreakdownView(data);
                    break;
                default:
                    this.renderOverviewChart(data);
            }

            // Update info panel if it exists
            this.updateInfoPanel(data);
        }

        /**
         * Render main overview chart
         */
        renderOverviewChart(data) {
            const ctx = document.getElementById('timeline-chart')?.getContext('2d');
            if (!ctx) return;

            // Destroy existing chart
            if (this.chart) {
                this.chart.destroy();
                this.chart = null;
            }

            const colorScheme = this.colorSchemes[this.currentMetric] || this.colorSchemes.total;

            // Create the chart configuration
            const config = {
                type: this.getChartType(),
                data: {
                    labels: data.labels,
                    datasets: [{
                        label: this.getMetricLabel(this.currentMetric),
                        data: data.values,
                        borderColor: colorScheme.border,
                        backgroundColor: colorScheme.background,
                        borderWidth: 2,
                        tension: 0.3,
                        fill: true,
                        pointRadius: 4,
                        pointHoverRadius: 6,
                        pointBackgroundColor: '#fff',
                        pointBorderColor: colorScheme.border,
                        pointBorderWidth: 2
                    }]
                },
                options: this.getChartOptions(data)
            };

            // Add annotations for significant events
            this.addAnnotations(config, data);

            this.chart = new Chart(ctx, config);
        }

        /**
         * Render comparison view (multiple metrics)
         */
        renderComparisonView(data) {
            const ctx = document.getElementById('timeline-chart')?.getContext('2d');
            if (!ctx) return;

            if (this.chart) {
                this.chart.destroy();
                this.chart = null;
            }

            // Get data for multiple metrics
            const metrics = ['total', 'unique_borrowers', 'unique_books'];
            const datasets = metrics.map(metric => {
                const metricData = this.getData(this.currentGranularity, metric);
                const colorScheme = this.colorSchemes[metric];
                
                return {
                    label: this.getMetricLabel(metric),
                    data: this.normalizeData(metricData.values),
                    borderColor: colorScheme.border,
                    backgroundColor: colorScheme.background,
                    borderWidth: 2,
                    tension: 0.3,
                    fill: false,
                    yAxisID: 'y',
                    pointRadius: 3,
                    pointHoverRadius: 5
                };
            });

            this.chart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: data.labels,
                    datasets: datasets
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    interaction: {
                        mode: 'index',
                        intersect: false
                    },
                    plugins: {
                        title: {
                            display: true,
                            text: 'Multi-Metric Comparison (Normalized)',
                            font: { size: 14, weight: 'bold' }
                        },
                        legend: {
                            display: true,
                            position: 'top'
                        },
                        tooltip: {
                            callbacks: {
                                label: (context) => {
                                    const originalData = this.getData(this.currentGranularity, 
                                        metrics[context.datasetIndex]);
                                    const originalValue = originalData.values[context.dataIndex];
                                    return `${context.dataset.label}: ${originalValue} (normalized: ${context.parsed.y.toFixed(2)})`;
                                }
                            }
                        }
                    },
                    scales: {
                        y: {
                            type: 'linear',
                            display: true,
                            position: 'left',
                            title: {
                                display: true,
                                text: 'Normalized Value (0-1)'
                            }
                        },
                        x: {
                            grid: { display: false }
                        }
                    }
                }
            });
        }

        /**
         * Render cumulative view
         */
        renderCumulativeView(data) {
            const ctx = document.getElementById('timeline-chart')?.getContext('2d');
            if (!ctx) return;

            if (this.chart) {
                this.chart.destroy();
                this.chart = null;
            }

            // Calculate cumulative values
            const cumulativeValues = [];
            let sum = 0;
            data.values.forEach(value => {
                sum += value;
                cumulativeValues.push(sum);
            });

            const colorScheme = this.colorSchemes[this.currentMetric];

            this.chart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: data.labels,
                    datasets: [{
                        label: `Cumulative ${this.getMetricLabel(this.currentMetric)}`,
                        data: cumulativeValues,
                        borderColor: colorScheme.border,
                        backgroundColor: colorScheme.background,
                        borderWidth: 2,
                        tension: 0.1,
                        fill: true,
                        pointRadius: 3,
                        pointHoverRadius: 5
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        title: {
                            display: true,
                            text: 'Cumulative Growth Over Time',
                            font: { size: 14, weight: 'bold' }
                        },
                        legend: { display: false },
                        tooltip: {
                            callbacks: {
                                afterLabel: (context) => {
                                    const percentage = ((context.parsed.y / sum) * 100).toFixed(1);
                                    return `${percentage}% of total`;
                                }
                            }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: 'Cumulative Count'
                            }
                        }
                    }
                }
            });
        }

        /**
         * Render breakdown view (stacked area chart)
         */
        renderBreakdownView(data) {
            const ctx = document.getElementById('timeline-chart')?.getContext('2d');
            if (!ctx) return;

            if (this.chart) {
                this.chart.destroy();
                this.chart = null;
            }

            // Get breakdown data (e.g., by gender or language)
            const breakdownData = this.getBreakdownData(this.currentGranularity);
            
            if (!breakdownData || breakdownData.datasets.length === 0) {
                this.showNoData(ctx.canvas.parentElement);
                return;
            }

            this.chart = new Chart(ctx, {
                type: 'bar',
                data: breakdownData,
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        title: {
                            display: true,
                            text: 'Activity Breakdown by Category',
                            font: { size: 14, weight: 'bold' }
                        },
                        legend: {
                            display: true,
                            position: 'top'
                        },
                        tooltip: {
                            callbacks: {
                                afterLabel: (context) => {
                                    const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                    const percentage = ((context.parsed.y / total) * 100).toFixed(1);
                                    return `${percentage}% of category total`;
                                }
                            }
                        }
                    },
                    scales: {
                        x: { stacked: true },
                        y: { 
                            stacked: true,
                            beginAtZero: true
                        }
                    }
                }
            });
        }

        // ========== Data Processing Methods ==========

        /**
         * Get data based on granularity and metric
         */
        getData(granularity, metric) {
            // Check cache first
            const cacheKey = `${granularity}_${metric}`;
            if (this.dataCache[cacheKey]) {
                return this.dataCache[cacheKey];
            }

            let data;
            switch (granularity) {
                case 'yearly':
                    data = this.getYearlyData(metric);
                    break;
                case 'period':
                    data = this.getPeriodData(metric);
                    break;
                case 'monthly':
                    data = this.getMonthlyData(metric);
                    break;
                case 'seasonal':
                    data = this.getSeasonalData(metric);
                    break;
                default:
                    data = this.getYearlyData(metric);
            }

            // Cache the result
            this.dataCache[cacheKey] = data;
            return data;
        }

        /**
         * Get yearly data
         */
        getYearlyData(metric) {
            const transactions = window.StrashunCore?.AppState?.libraryData?.transactions;
            if (!transactions) return null;

            const yearMap = new Map();

            transactions.forEach(t => {
                if (!t.date) return;
                const year = new Date(t.date).getFullYear();
                if (isNaN(year) || year < 1900 || year > 2000) return;

                if (!yearMap.has(year)) {
                    yearMap.set(year, {
                        total: 0,
                        female: 0,
                        male: 0,
                        unknown: 0,
                        unique_borrowers: new Set(),
                        unique_books: new Set(),
                        ghost_records: 0
                    });
                }

                const yearData = yearMap.get(year);
                yearData.total++;
                
                // Gender tracking
                if (t.gender === 'W') yearData.female++;
                else if (t.gender === 'M') yearData.male++;
                else yearData.unknown++;
                
                // Unique tracking
                if (t.borrower_name) yearData.unique_borrowers.add(t.borrower_name);
                if (t.book_id) yearData.unique_books.add(t.book_id);
                
                // Ghost records
                if (!window.StrashunCore.AppState.bookIndex.has(t.book_id)) {
                    yearData.ghost_records++;
                }
            });

            const sortedYears = Array.from(yearMap.keys()).sort();
            
            // Handle the gap (1905-1933)
            if (sortedYears.includes(1904) && sortedYears.includes(1934)) {
                // Add gap years with zero values
                for (let year = 1905; year <= 1933; year++) {
                    if (!sortedYears.includes(year)) {
                        sortedYears.push(year);
                        yearMap.set(year, {
                            total: 0,
                            female: 0,
                            male: 0,
                            unknown: 0,
                            unique_borrowers: new Set(),
                            unique_books: new Set(),
                            ghost_records: 0
                        });
                    }
                }
                sortedYears.sort();
            }

            const values = sortedYears.map(year => {
                const data = yearMap.get(year);
                return this.calculateMetricValue(data, metric);
            });

            return { 
                labels: sortedYears.map(y => y.toString()), 
                values,
                rawData: yearMap
            };
        }

        /**
         * Get period data
         */
        getPeriodData(metric) {
            const periods = [
                { label: '1902', years: [1902] },
                { label: '1903-1904', years: [1903, 1904] },
                { label: 'Gap (1905-1933)', years: [] },
                { label: '1934', years: [1934] },
                { label: '1940', years: [1940] }
            ];

            const transactions = window.StrashunCore?.AppState?.libraryData?.transactions;
            if (!transactions) return null;

            const values = periods.map(period => {
                const periodData = {
                    total: 0,
                    female: 0,
                    male: 0,
                    unknown: 0,
                    unique_borrowers: new Set(),
                    unique_books: new Set(),
                    ghost_records: 0
                };

                if (period.years.length === 0) {
                    return 0; // Gap period
                }

                transactions.forEach(t => {
                    if (!t.date) return;
                    const year = new Date(t.date).getFullYear();
                    
                    if (period.years.includes(year)) {
                        periodData.total++;
                        if (t.gender === 'W') periodData.female++;
                        else if (t.gender === 'M') periodData.male++;
                        else periodData.unknown++;
                        
                        if (t.borrower_name) periodData.unique_borrowers.add(t.borrower_name);
                        if (t.book_id) periodData.unique_books.add(t.book_id);
                        
                        if (!window.StrashunCore.AppState.bookIndex.has(t.book_id)) {
                            periodData.ghost_records++;
                        }
                    }
                });

                return this.calculateMetricValue(periodData, metric);
            });

            return { 
                labels: periods.map(p => p.label), 
                values 
            };
        }

        /**
         * Get monthly data (aggregate across all years)
         */
        getMonthlyData(metric) {
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                          'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            
            const transactions = window.StrashunCore?.AppState?.libraryData?.transactions;
            if (!transactions) return null;

            const monthMap = new Map();
            
            // Initialize all months
            months.forEach((month, index) => {
                monthMap.set(index, {
                    total: 0,
                    female: 0,
                    male: 0,
                    unknown: 0,
                    unique_borrowers: new Set(),
                    unique_books: new Set(),
                    ghost_records: 0
                });
            });

            transactions.forEach(t => {
                if (!t.date) return;
                const month = new Date(t.date).getMonth();
                if (isNaN(month) || month < 0 || month > 11) return;

                const monthData = monthMap.get(month);
                monthData.total++;
                
                if (t.gender === 'W') monthData.female++;
                else if (t.gender === 'M') monthData.male++;
                else monthData.unknown++;
                
                if (t.borrower_name) monthData.unique_borrowers.add(t.borrower_name);
                if (t.book_id) monthData.unique_books.add(t.book_id);
                
                if (!window.StrashunCore.AppState.bookIndex.has(t.book_id)) {
                    monthData.ghost_records++;
                }
            });

            const values = Array.from({ length: 12 }, (_, i) => {
                const data = monthMap.get(i);
                return this.calculateMetricValue(data, metric);
            });

            return { labels: months, values };
        }

        /**
         * Get seasonal data
         */
        getSeasonalData(metric) {
            const seasons = [
                { label: 'Winter (Dec-Feb)', months: [11, 0, 1] },
                { label: 'Spring (Mar-May)', months: [2, 3, 4] },
                { label: 'Summer (Jun-Aug)', months: [5, 6, 7] },
                { label: 'Fall (Sep-Nov)', months: [8, 9, 10] }
            ];

            const transactions = window.StrashunCore?.AppState?.libraryData?.transactions;
            if (!transactions) return null;

            const values = seasons.map(season => {
                const seasonData = {
                    total: 0,
                    female: 0,
                    male: 0,
                    unknown: 0,
                    unique_borrowers: new Set(),
                    unique_books: new Set(),
                    ghost_records: 0
                };

                transactions.forEach(t => {
                    if (!t.date) return;
                    const month = new Date(t.date).getMonth();
                    
                    if (season.months.includes(month)) {
                        seasonData.total++;
                        if (t.gender === 'W') seasonData.female++;
                        else if (t.gender === 'M') seasonData.male++;
                        else seasonData.unknown++;
                        
                        if (t.borrower_name) seasonData.unique_borrowers.add(t.borrower_name);
                        if (t.book_id) seasonData.unique_books.add(t.book_id);
                        
                        if (!window.StrashunCore.AppState.bookIndex.has(t.book_id)) {
                            seasonData.ghost_records++;
                        }
                    }
                });

                return this.calculateMetricValue(seasonData, metric);
            });

            return { 
                labels: seasons.map(s => s.label), 
                values 
            };
        }

        /**
         * Get breakdown data for stacked charts
         */
        getBreakdownData(granularity) {
            const yearlyData = this.getYearlyData('total');
            if (!yearlyData) return null;

            const transactions = window.StrashunCore?.AppState?.libraryData?.transactions;
            if (!transactions) return null;

            // Create gender breakdown
            const genderBreakdown = {
                labels: yearlyData.labels,
                datasets: [
                    {
                        label: 'Female',
                        data: [],
                        backgroundColor: 'rgba(236, 72, 153, 0.8)',
                        borderColor: 'rgba(236, 72, 153, 1)',
                        borderWidth: 1
                    },
                    {
                        label: 'Male',
                        data: [],
                        backgroundColor: 'rgba(59, 130, 246, 0.8)',
                        borderColor: 'rgba(59, 130, 246, 1)',
                        borderWidth: 1
                    },
                    {
                        label: 'Unknown',
                        data: [],
                        backgroundColor: 'rgba(156, 163, 175, 0.8)',
                        borderColor: 'rgba(156, 163, 175, 1)',
                        borderWidth: 1
                    }
                ]
            };

            // Calculate gender counts per year
            yearlyData.labels.forEach(yearLabel => {
                const year = parseInt(yearLabel);
                let female = 0, male = 0, unknown = 0;

                transactions.forEach(t => {
                    if (t.date && new Date(t.date).getFullYear() === year) {
                        if (t.gender === 'W') female++;
                        else if (t.gender === 'M') male++;
                        else unknown++;
                    }
                });

                genderBreakdown.datasets[0].data.push(female);
                genderBreakdown.datasets[1].data.push(male);
                genderBreakdown.datasets[2].data.push(unknown);
            });

            return genderBreakdown;
        }

        /**
         * Calculate metric value from data
         */
        calculateMetricValue(data, metric) {
            if (!data) return 0;

            switch (metric) {
                case 'total':
                    return data.total;
                case 'unique_borrowers':
                    return data.unique_borrowers.size;
                case 'unique_books':
                    return data.unique_books.size;
                case 'gender':
                    // Return female percentage
                    return data.total > 0 ? (data.female / data.total * 100) : 0;
                case 'avg_books_per_reader':
                    return data.unique_borrowers.size > 0 ? 
                        (data.total / data.unique_borrowers.size) : 0;
                case 'ghost_records':
                    return data.ghost_records;
                default:
                    return data.total;
            }
        }

        // ========== Utility Methods ==========

        /**
         * Get chart type based on current settings
         */
        getChartType() {
            if (this.currentGranularity === 'period' || this.currentGranularity === 'seasonal') {
                return 'bar';
            }
            return 'line';
        }

        /**
         * Get chart options
         */
        getChartOptions(data) {
            const isPercentage = this.currentMetric === 'gender';
            const isAverage = this.currentMetric === 'avg_books_per_reader';

            return {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false
                },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        padding: 12,
                        cornerRadius: 8,
                        callbacks: {
                            label: (context) => {
                                let label = context.dataset.label || '';
                                let value = context.parsed.y;
                                
                                if (isPercentage) {
                                    return `${label}: ${value.toFixed(1)}% female`;
                                } else if (isAverage) {
                                    return `${label}: ${value.toFixed(2)} books/reader`;
                                } else {
                                    return `${label}: ${value.toLocaleString()}`;
                                }
                            },
                            afterLabel: (context) => {
                                // Add context about the data point
                                const index = context.dataIndex;
                                const label = data.labels[index];
                                
                                // Special handling for gap years
                                if (label >= '1905' && label <= '1933') {
                                    return '📌 Gap period - no data';
                                }
                                
                                // Add percentage of total for count metrics
                                if (!isPercentage && !isAverage) {
                                    const total = data.values.reduce((a, b) => a + b, 0);
                                    const percentage = ((context.parsed.y / total) * 100).toFixed(1);
                                    return `${percentage}% of total`;
                                }
                                
                                return null;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: this.getYAxisLabel(this.currentMetric)
                        },
                        ticks: {
                            callback: (value) => {
                                if (isPercentage) return value.toFixed(0) + '%';
                                if (isAverage) return value.toFixed(1);
                                return value.toLocaleString();
                            }
                        }
                    },
                    x: {
                        grid: { display: false },
                        ticks: {
                            maxRotation: 45,
                            minRotation: 0,
                            autoSkip: true,
                            maxTicksLimit: 20
                        }
                    }
                }
            };
        }

        /**
         * Add annotations for significant events
         */
        addAnnotations(config, data) {
            // Add annotation plugin configuration
            if (!config.options.plugins.annotation) {
                config.options.plugins.annotation = {
                    annotations: {}
                };
            }

            // Mark the gap period if in yearly view
            if (this.currentGranularity === 'yearly') {
                const startIndex = data.labels.indexOf('1905');
                const endIndex = data.labels.indexOf('1933');
                
                if (startIndex !== -1 && endIndex !== -1) {
                    config.options.plugins.annotation.annotations.gapPeriod = {
                        type: 'box',
                        xMin: startIndex - 0.5,
                        xMax: endIndex + 0.5,
                        backgroundColor: 'rgba(255, 0, 0, 0.05)',
                        borderColor: 'rgba(255, 0, 0, 0.2)',
                        borderWidth: 1,
                        label: {
                            display: true,
                            content: 'Data Gap (WWI & Political Changes)',
                            position: 'center',
                            color: 'rgba(255, 0, 0, 0.5)',
                            font: { size: 11 }
                        }
                    };
                }
            }

            // Mark significant years
            const significantYears = {
                '1914': 'WWI Begins',
                '1918': 'WWI Ends',
                '1939': 'WWII Begins',
                '1941': 'German Occupation'
            };

            Object.entries(significantYears).forEach(([year, event]) => {
                const index = data.labels.indexOf(year);
                if (index !== -1) {
                    config.options.plugins.annotation.annotations[`year${year}`] = {
                        type: 'line',
                        scaleID: 'x',
                        value: index,
                        borderColor: 'rgba(255, 99, 71, 0.5)',
                        borderWidth: 1,
                        borderDash: [5, 5],
                        label: {
                            display: true,
                            content: event,
                            position: 'start',
                            backgroundColor: 'rgba(255, 99, 71, 0.8)',
                            color: 'white',
                            font: { size: 10 },
                            padding: 2
                        }
                    };
                }
            });
        }

        /**
         * Update info panel with statistics
         */
        updateInfoPanel(data) {
            const panel = document.getElementById('timeline-info-panel');
            if (!panel) return;

            const total = data.values.reduce((a, b) => a + b, 0);
            const average = (total / data.values.length).toFixed(1);
            const max = Math.max(...data.values);
            const min = Math.min(...data.values.filter(v => v > 0));
            const maxIndex = data.values.indexOf(max);
            const minIndex = data.values.indexOf(min);

            panel.innerHTML = `
                <div class="grid grid-cols-2 gap-4 text-sm">
                    <div>
                        <span class="text-gray-500">Total:</span>
                        <span class="font-semibold ml-2">${total.toLocaleString()}</span>
                    </div>
                    <div>
                        <span class="text-gray-500">Average:</span>
                        <span class="font-semibold ml-2">${average}</span>
                    </div>
                    <div>
                        <span class="text-gray-500">Peak:</span>
                        <span class="font-semibold ml-2">${max} (${data.labels[maxIndex]})</span>
                    </div>
                    <div>
                        <span class="text-gray-500">Lowest:</span>
                        <span class="font-semibold ml-2">${min} (${data.labels[minIndex]})</span>
                    </div>
                </div>
            `;
        }

        /**
         * Get metric label
         */
        getMetricLabel(metric) {
            const labels = {
                'total': 'Total Transactions',
                'unique_borrowers': 'Unique Borrowers',
                'unique_books': 'Unique Books',
                'gender': 'Female Percentage',
                'avg_books_per_reader': 'Average Books per Reader',
                'ghost_records': 'Ghost Records'
            };
            return labels[metric] || 'Transactions';
        }

        /**
         * Get Y-axis label
         */
        getYAxisLabel(metric) {
            const labels = {
                'total': 'Number of Transactions',
                'unique_borrowers': 'Number of Unique Borrowers',
                'unique_books': 'Number of Unique Books',
                'gender': 'Female Borrowers (%)',
                'avg_books_per_reader': 'Books per Reader',
                'ghost_records': 'Records with Missing Metadata'
            };
            return labels[metric] || 'Count';
        }

        /**
         * Normalize data to 0-1 range
         */
        normalizeData(values) {
            const max = Math.max(...values);
            const min = Math.min(...values);
            const range = max - min;
            
            if (range === 0) return values.map(() => 0.5);
            
            return values.map(v => (v - min) / range);
        }

        /**
         * Show no data message
         */
        showNoData(container) {
            const canvas = container.querySelector('canvas');
            if (canvas) {
                canvas.style.display = 'none';
            }

            const message = document.createElement('div');
            message.className = 'no-data-message text-center text-gray-500 py-12';
            message.innerHTML = `
                <svg class="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                          d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                <p class="text-lg font-semibold mb-2">No Timeline Data Available</p>
                <p class="text-sm">Unable to generate timeline for the selected options</p>
            `;
            container.appendChild(message);
        }

        /**
         * Clear data cache
         */
        clearCache() {
            this.dataCache = {};
            console.log('📊 Timeline cache cleared');
        }

        /**
         * Export timeline as CSV
         */
        exportAsCSV() {
            const data = this.getData(this.currentGranularity, this.currentMetric);
            if (!data) return;

            const csv = [
                ['Period', this.getMetricLabel(this.currentMetric)],
                ...data.labels.map((label, i) => [label, data.values[i]])
            ].map(row => row.join(',')).join('\n');

            const blob = new Blob([csv], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `timeline_${this.currentGranularity}_${this.currentMetric}.csv`;
            link.click();
            URL.revokeObjectURL(url);
        }

        /**
         * Destroy chart
         */
        destroy() {
            if (this.chart) {
                this.chart.destroy();
                this.chart = null;
            }
            this.clearCache();
        }
    }

    // Create singleton instance and export
    const timelineInstance = new TimelineVisualization();
    
    // Export to window
    window.TimelineVisualization = timelineInstance;
    
    // Also export to StrashunViz namespace for compatibility
    if (!window.StrashunViz) {
        window.StrashunViz = {};
    }
    window.StrashunViz.TimelineView = {
        init: () => timelineInstance.init(),
        render: () => timelineInstance.render()
    };

    console.log('📅 Timeline module loaded');
})();