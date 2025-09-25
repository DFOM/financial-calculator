/**
 * Main function to initialize all the dynamic functionality for the calculator page.
 */
document.addEventListener('DOMContentLoaded', function() {

    // --- 1. DYNAMIC FORM LOGIC ---
    // This section handles showing and hiding the payment details based on user selection.
    
    const hasPmtYesRadio = document.getElementById('pmt-yes');
    const hasPmtNoRadio = document.getElementById('pmt-no');
    const pmtDetailsSection = document.getElementById('pmt-details');
    const pmtInputFieldContainer = document.getElementById('field-pmt');
    // **NEW**: Get the actual input element for PMT
    const pmtInputField = document.getElementById('pmt-input');

    function togglePmtDetails() {
        // If the 'Yes' radio button for payments is checked...
        if (hasPmtYesRadio.checked) {
            // Show the detailed payment options (timing, frequency).
            if (pmtDetailsSection) pmtDetailsSection.style.display = 'block';
            // Show the payment amount input field.
            if (pmtInputFieldContainer) pmtInputFieldContainer.style.display = 'block';
            // **FIX**: Make the PMT input field required when it is visible.
            if (pmtInputField) pmtInputField.required = true;

        } else {
            // Otherwise, hide both sections.
            if (pmtDetailsSection) pmtDetailsSection.style.display = 'none';
            if (pmtInputFieldContainer) pmtInputFieldContainer.style.display = 'none';
            // **FIX**: Make the PMT input field NOT required when it is hidden.
            if (pmtInputField) {
                pmtInputField.required = false;
                // Also clear its value to prevent submitting a hidden value.
                pmtInputField.value = '';
            }
        }
    }

    // Add event listeners to both radio buttons to call the function on change.
    if (hasPmtYesRadio && hasPmtNoRadio) {
        hasPmtYesRadio.addEventListener('change', togglePmtDetails);
        hasPmtNoRadio.addEventListener('change', togglePmtDetails);
        // Run the function once on page load to set the initial state.
        togglePmtDetails();
    }


    // --- 2. CSV EXPORT LOGIC (No changes here) ---
    const exportButton = document.getElementById('export-csv');
    const calculatorForm = document.getElementById('calculator-form');

    if (exportButton && calculatorForm) {
        exportButton.addEventListener('click', () => {
            const originalAction = calculatorForm.action;
            calculatorForm.action = '/export_csv';
            calculatorForm.submit();
            calculatorForm.action = originalAction;
        });
    }


    // --- 3. CHART.JS GRAPHING LOGIC (No changes here) ---
    const resultsSection = document.getElementById('results-section');
    if (resultsSection) {
        const scheduleDataString = resultsSection.dataset.schedule;
        if (scheduleDataString && scheduleDataString.length > 2) {
            try {
                const scheduleData = JSON.parse(scheduleDataString);
                const labels = scheduleData.map(row => row.period);
                const dataPoints = scheduleData.map(row => Math.abs(row.balance));
                const canvasContext = document.getElementById('balance-chart').getContext('2d');
                
                new Chart(canvasContext, {
                    type: 'line',
                    data: {
                        labels: labels,
                        datasets: [{
                            label: 'Balance',
                            data: dataPoints,
                            borderColor: 'rgb(79, 70, 229)',
                            backgroundColor: 'rgba(79, 70, 229, 0.1)',
                            fill: true,
                            tension: 0.2,
                            pointRadius: 0,
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: true,
                        scales: {
                            y: {
                                beginAtZero: true,
                                ticks: {
                                    callback: function(value) {
                                        return '$' + value.toLocaleString();
                                    }
                                }
                            },
                            x: {
                                title: {
                                    display: true,
                                    text: 'Period'
                                }
                            }
                        },
                        plugins: {
                            legend: {
                                display: false
                            }
                        }
                    }
                });
            } catch (e) {
                console.error("Failed to parse schedule data for chart:", e);
            }
        }
    }
});

