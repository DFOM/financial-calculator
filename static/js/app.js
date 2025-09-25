document.addEventListener('DOMContentLoaded', () => {
    // --- FORM ELEMENTS ---
    const form = document.getElementById('tvm-form');
    const solveForSelect = document.getElementById('solve_for');
    const scenarioSelect = document.getElementById('scenario');
    const rateTypeSelect = document.getElementById('rate_type');
    const compoundingSection = document.getElementById('compounding-section');
    
    // Payment Sections
    const paymentTypeSelector = document.getElementById('payment-type-selector');
    const pmtTypeInput = document.getElementById('has_pmt'); // Hidden input
    const regularPaymentDetails = document.getElementById('regular-payment-details');
    const growingPaymentDetails = document.getElementById('growing-payment-details');
    const customPaymentsSection = document.getElementById('custom-payments-section');
    const specificPaymentPeriodSection = document.getElementById('specific-payment-period-section');
    
    // Known Variables
    const allInputGroups = document.querySelectorAll('.input-group');
    const numberInputs = form.querySelectorAll('input[type="number"]');
    const rateLabel = document.getElementById('rate-label'); // Get the dynamic rate label

    // --- DATA & INITIALIZATION ---
    const variablesData = JSON.parse(document.getElementById('variables-data').textContent);
    const paymentTypes = [
        { id: 'no', title: 'No Payments', desc: 'A single lump sum calculation.' },
        { id: 'yes', title: 'Regular', desc: 'A series of equal payments.' },
        { id: 'growing', title: 'Growing', desc: 'Payments increase by a fixed rate.' },
        { id: 'custom', title: 'Irregular', desc: 'A custom series of cash flows.' }
    ];

    const initializePaymentSelector = () => {
        paymentTypes.forEach(pt => {
            const card = document.createElement('div');
            card.className = 'payment-card';
            card.dataset.value = pt.id;
            card.innerHTML = `<span class="font-semibold text-gray-800">${pt.title}</span><span class="text-xs text-gray-500">${pt.desc}</span>`;
            paymentTypeSelector.appendChild(card);
        });
        document.querySelector('.payment-card[data-value="no"]').classList.add('selected');
    };

    const resetInputFields = () => {
        numberInputs.forEach(input => {
            input.value = '';
        });
        document.getElementById('custom-payments-table-container').innerHTML = '';
    };

    // --- UI UPDATE LOGIC ---
    const updateFormVisibility = () => {
        const solveForValue = solveForSelect.value;
        const scenarioValue = scenarioSelect.value;
        const rateTypeValue = rateTypeSelect.value;
        const pmtTypeValue = pmtTypeInput.value;

        // --- NEW DYNAMIC RATE UI LOGIC ---
        // Rule 1: Update the rate label text based on the rate type.
        if (rateTypeValue === 'apr') {
            rateLabel.textContent = 'Nominal APR (%)';
        } else if (rateTypeValue === 'ear') {
            rateLabel.textContent = 'Effective Annual Rate (EAR) (%)';
        } else {
            rateLabel.textContent = 'Rate Per Period (%)';
        }
        
        // Rule 2: Only show compounding frequency for APR.
        compoundingSection.style.display = rateTypeValue === 'apr' ? 'block' : 'none';
        // --- END NEW LOGIC ---

        // Basic visibility toggles
        regularPaymentDetails.style.display = pmtTypeValue === 'yes' ? 'grid' : 'none';
        growingPaymentDetails.style.display = pmtTypeValue === 'growing' ? 'grid' : 'none';
        customPaymentsSection.style.display = pmtTypeValue === 'custom' ? 'block' : 'none';
        
        const specificPmtOption = solveForSelect.querySelector('option[value="specific_pmt"]');
        specificPmtOption.disabled = pmtTypeValue !== 'growing';
        if (specificPmtOption.disabled && solveForValue === 'specific_pmt') {
            solveForSelect.value = 'fv';
        }
        specificPaymentPeriodSection.style.display = solveForSelect.value === 'specific_pmt' ? 'block' : 'none';

        // Intelligent Hiding Logic
        let requiredVars = new Set(['pv', 'fv', 'pmt', 'nper', 'rate', 'initial_pmt']);
        requiredVars.delete(solveForValue);

        if (pmtTypeValue === 'no') {
            requiredVars.delete('pmt');
            requiredVars.delete('initial_pmt');
        } else if (pmtTypeValue === 'yes') {
            requiredVars.delete('initial_pmt');
            if (solveForValue === 'fv') requiredVars.delete('pv');
            if (solveForValue === 'pv') requiredVars.delete('fv');
            if (scenarioValue === 'loan' && (solveForValue === 'pmt' || solveForValue === 'nper')) {
                requiredVars.delete('fv');
            }
        } else if (pmtTypeValue === 'growing') {
            requiredVars.delete('pmt');
            if (solveForValue === 'fv') requiredVars.delete('pv');
            if (solveForValue === 'pv') requiredVars.delete('fv');
        } else if (pmtTypeValue === 'custom') {
            requiredVars.delete('pmt');
            requiredVars.delete('initial_pmt');
            requiredVars.delete('nper');
            if (solveForValue === 'fv') requiredVars.delete('pv');
            if (solveForValue === 'pv') requiredVars.delete('fv');
        }
        
        if (solveForValue === 'specific_pmt') {
            requiredVars = new Set(['initial_pmt', 'nper', 'rate']);
        }

        allInputGroups.forEach(group => {
            const variable = group.dataset.variable;
            if (requiredVars.has(variable)) {
                group.style.display = 'block';
            } else {
                group.style.display = 'none';
            }
        });
    };
    
    // --- EVENT LISTENERS ---
    paymentTypeSelector.addEventListener('click', (e) => {
        const card = e.target.closest('.payment-card');
        if (!card) return;
        paymentTypeSelector.querySelectorAll('.payment-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        pmtTypeInput.value = card.dataset.value;
        resetInputFields();
        updateFormVisibility();
    });

    solveForSelect.addEventListener('change', () => {
        resetInputFields();
        updateFormVisibility();
    });
    
    scenarioSelect.addEventListener('change', updateFormVisibility);
    rateTypeSelect.addEventListener('change', updateFormVisibility);
    
    const generateCustomPaymentInputs = () => {
        const numPayments = parseInt(document.getElementById('num_custom_payments').value, 10);
        const container = document.getElementById('custom-payments-table-container');
        container.innerHTML = '';
        if (isNaN(numPayments) || numPayments <= 0) return;
        for (let i = 1; i <= numPayments; i++) {
            const inputRow = document.createElement('div');
            inputRow.className = 'custom-payment-row'; 
            inputRow.innerHTML = `<label for="custom_pmt_${i}" class="form-label">Payment ${i}:</label><input type="number" step="any" id="custom_pmt_${i}" name="custom_pmt_${i}" class="form-input" placeholder="Enter amount">`;
            container.appendChild(inputRow);
        }
    };
    document.getElementById('num_custom_payments').addEventListener('input', generateCustomPaymentInputs);

    // --- FORM SUBMISSION & RESULTS (logic is unchanged) ---
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const mainButton = document.getElementById('main-button');
        mainButton.disabled = true;
        mainButton.textContent = 'Calculating...';
        document.getElementById('error-message').style.display = 'none';
        document.getElementById('results-section').style.display = 'none';
        
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());

        if (data.has_pmt === 'custom') {
            const customPayments = [];
            for (const [key, value] of formData.entries()) {
                if (key.startsWith('custom_pmt_')) customPayments.push(value);
            }
            data.custom_payments = customPayments;
        }

        try {
            const response = await fetch('/calculate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            const result = await response.json();
            if (!response.ok || !result.success) throw new Error(result.error || 'An unknown error occurred.');
            displayResults(result);
        } catch (error) {
            document.getElementById('error-message').textContent = `Error: ${error.message}`;
            document.getElementById('error-message').style.display = 'block';
        } finally {
            mainButton.disabled = false;
            mainButton.textContent = 'Calculate';
        }
    });

    const displayResults = (result) => {
        const formatCurrency = (value) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
        
        document.getElementById('solved-variable-name').textContent = variablesData[result.solved_variable] || 'Result';
        let solved_display = formatCurrency(result.solved_value);
        if (result.solved_variable === 'nper') solved_display = result.solved_value.toFixed(2) + ' years';
        if (result.solved_variable === 'rate') solved_display = `${(result.solved_value * 100).toFixed(4)}%`;
        if (result.solved_variable === 'specific_pmt') solved_display = formatCurrency(result.solved_value);
        document.getElementById('solved-value').textContent = solved_display;

        document.getElementById('summary-final-balance').textContent = formatCurrency(result.final_balance);
        document.getElementById('summary-total-payments').textContent = formatCurrency(result.total_payments);
        document.getElementById('summary-total-interest').textContent = formatCurrency(result.total_interest);

        const scheduleTableBody = document.getElementById('schedule-table-body');
        scheduleTableBody.innerHTML = '';
        result.schedule.forEach((row, index) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td class="px-4 py-3 text-sm text-gray-700 text-center">${result.period_labels[index]}</td><td class="px-4 py-3 text-sm text-gray-700">${formatCurrency(row.start_balance)}</td><td class="px-4 py-3 text-sm text-gray-700">${formatCurrency(row.interest)}</td><td class="px-4 py-3 text-sm text-gray-700">${formatCurrency(row.payment)}</td><td class="px-4 py-3 text-sm text-gray-700">${formatCurrency(row.principal_paid)}</td><td class="px-4 py-3 text-sm text-gray-700 font-medium">${formatCurrency(row.end_balance)}</td>`;
            scheduleTableBody.appendChild(tr);
        });

        if (window.balanceChart) window.balanceChart.destroy();
        window.balanceChart = new Chart(document.getElementById('balance-chart'), {
            type: 'line',
            data: {
                labels: result.period_labels,
                datasets: [{
                    label: 'Ending Balance',
                    data: result.schedule.map(row => row.end_balance),
                    borderColor: 'rgba(79, 70, 229, 1)',
                    backgroundColor: 'rgba(79, 70, 229, 0.1)',
                    fill: true,
                    tension: 0.1,
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                scales: { y: { ticks: { callback: value => formatCurrency(value) } } },
                plugins: { tooltip: { callbacks: { label: context => `${context.dataset.label}: ${formatCurrency(context.raw)}` } } }
            }
        });

        document.getElementById('results-section').style.display = 'block';
        document.getElementById('results-section').scrollIntoView({ behavior: 'smooth' });
    };

    // --- INITIALIZE THE APP ---
    initializePaymentSelector();
    updateFormVisibility();
});

