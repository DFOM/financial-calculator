# If this file IS your main app module (app.py), use this:
from flask import Flask, render_template, request, jsonify
from app import app

# If this file is a routes module inside a package and you already create app elsewhere,
# then instead of the two lines above use:
# from flask import render_template, request, jsonify
# from app import app

from decimal import Decimal, getcontext
import math
import numpy_financial as npf
getcontext().prec = 50

VARIABLES = {
    'pv': 'Present Value (PV)', 'fv': 'Future Value (FV)',
    'pmt': 'Regular Payment (PMT)', 'specific_pmt': 'Specific Payment',
    'nper': 'Number of Periods', 'rate': 'Interest Rate (%)',
}
PERIOD_NAMES = {
    1: "Year", 2: "Semi-Annual Period", 4: "Quarter",
    12: "Month", 52: "Week"
}

@app.route('/')
def index():
    return render_template('index.html', variables=VARIABLES)

@app.route('/calculate', methods=['POST'])
def calculate():
    try:
        data = request.get_json() or {}

        # ---------- Helpers ----------
        def to_decimal(value, default=Decimal(0)):
            if value is None or value == '':
                return default
            return Decimal(str(value))

        def to_int(value, default=0):
            if value is None or value == '':
                return default
            return int(value)

        # ---------- 1. Extract and normalize inputs ----------
        solve_for = data.get('solve_for')
        scenario = data.get('scenario', 'investment')
        rate_type = data.get('rate_type', 'apr')
        compounding_freq = to_int(data.get('compounding_freq', 1))
        has_pmt = data.get('has_pmt', 'no')
        pmt_freq = to_int(data.get('pmt_freq', compounding_freq))
        when_str = data.get('when', 'end')
        when_int = 1 if when_str in ('begin', 'annuity_due', '1') else 0

        # numeric inputs
        pv = to_decimal(data.get('pv'))
        fv = to_decimal(data.get('fv'))
        pmt = to_decimal(data.get('pmt'))
        
        # --- FIX: Only calculate NPer from Term if we are NOT solving for NPer ---
        if solve_for == 'nper':
            nper = Decimal(0) # Use a placeholder
        else:
            term_in_years = to_decimal(data.get('term_in_years'))
            nper = term_in_years * pmt_freq
        # --- END FIX ---

        rate = to_decimal(data.get('rate'))
        initial_pmt = to_decimal(data.get('initial_pmt', 0))
        growth_rate = to_decimal(data.get('growth_rate', 0)) / Decimal(100)
        specific_pmt_period = to_int(data.get('specific_pmt_period', 0))

        custom_payments_list = data.get('custom_payments', []) or []
        custom_payments = [to_decimal(x) for x in custom_payments_list]

        if has_pmt == 'custom':
            nper = Decimal(len(custom_payments))

        # ---------- 2. Convert provided rate into per-period Decimal rate ----------
        rate_decimal = rate / Decimal(100)
        per_period_rate = Decimal(0)

        if rate_type == 'period_rate':
            per_period_rate = rate_decimal
        elif rate_type == 'ear':
            per_period_rate = Decimal(str((1.0 + float(rate_decimal)) ** (1.0 / float(pmt_freq)) - 1.0))
        else:
            if compounding_freq <= 0:
                raise ValueError("compounding_freq must be >= 1")
            apr = rate_decimal
            ear = Decimal(str((1.0 + float(apr) / compounding_freq) ** compounding_freq - 1.0))
            per_period_rate = Decimal(str((1.0 + float(ear)) ** (1.0 / float(pmt_freq)) - 1.0))

        # ---------- 3. Build the payments array (signed) ----------
        all_payments = []
        count = int(round(float(nper))) if nper != 0 and solve_for != 'nper' else 0
        
        if has_pmt == 'yes':
            signed_pmt = -abs(pmt)
            all_payments = [signed_pmt] * count
        elif has_pmt == 'growing':
            signed_initial = -abs(initial_pmt)
            all_payments = [signed_initial * ( (Decimal(1) + growth_rate) ** i ) for i in range(count)]
        elif has_pmt == 'custom':
            all_payments = [-abs(x) for x in custom_payments]
        
        # ---------- 4. Set sign conventions for PV/FV ----------
        def sign_for_pv(scenario_in, current_pv):
            return -abs(current_pv) if scenario_in == 'investment' else abs(current_pv)

        def sign_for_fv(scenario_in, current_fv):
            return abs(current_fv) if scenario_in == 'investment' else -abs(current_fv)

        if solve_for != 'pv':
            pv = sign_for_pv(scenario, pv)
        if solve_for != 'fv':
            fv = sign_for_fv(scenario, fv)
        if solve_for != 'pmt' and has_pmt == 'yes' and pmt != 0:
            pmt = -abs(pmt)

        # ---------- 5. Solve numeric unknown ----------
        solved_value = Decimal(0)
        if solve_for == 'specific_pmt':
            if specific_pmt_period <= 0 or specific_pmt_period > len(all_payments):
                raise ValueError(f"specific_pmt_period must be between 1 and {len(all_payments)}")
            solved_value = all_payments[specific_pmt_period - 1]
        elif has_pmt in ('growing', 'custom'):
            if solve_for == 'fv':
                current_val = pv
                for payment in all_payments:
                    current_val = current_val * (Decimal(1) + per_period_rate) + payment
                solved_value = current_val
                fv = solved_value
            elif solve_for == 'pv':
                npv = Decimal(0)
                for i, payment in enumerate(all_payments):
                    npv += payment / ((Decimal(1) + per_period_rate) ** (i + 1))
                npv += fv / ((Decimal(1) + per_period_rate) ** len(all_payments))
                solved_value = -npv
                pv = solved_value
            else:
                raise ValueError("Solving for RATE or NPER with irregular payments is not supported.")
        else:
            params = {
                'rate': float(per_period_rate), 'nper': float(nper or 0),
                'pmt': float(pmt), 'pv': float(pv), 'fv': float(fv), 'when': when_int
            }
            if solve_for in params: del params[solve_for]
            
            npf_functions = {'fv': npf.fv, 'pv': npf.pv, 'pmt': npf.pmt, 'nper': npf.nper, 'rate': npf.rate}
            np_solved = npf_functions.get(solve_for, lambda **kwargs: 0.0)(**params)

            solved_value = Decimal(str(float(np_solved)))

            if solve_for == 'pv': pv = solved_value
            elif solve_for == 'fv': fv = solved_value
            elif solve_for == 'pmt': pmt = solved_value
            elif solve_for == 'nper': nper = solved_value # Now nper is the solved value

        if solve_for == 'fv' and scenario == 'investment': solved_value = abs(solved_value)
        if solve_for == 'pv' and scenario == 'loan': solved_value = abs(solved_value)

        # ---------- 6. Build amortization / schedule table ----------
        schedule = []
        balance = pv
        total_interest = Decimal(0)
        total_payments_val = Decimal(0)
        schedule_nper = int(round(float(nper))) if nper != 0 else len(all_payments)

        if has_pmt == 'yes' and solve_for == 'nper':
             all_payments = [-abs(pmt)] * schedule_nper

        for i in range(schedule_nper):
            start_balance = balance
            current_pmt = all_payments[i] if i < len(all_payments) else pmt if has_pmt == 'yes' else Decimal(0)
            
            if when_int == 0:  # END of period
                interest = start_balance * per_period_rate
                principal_paid = -current_pmt - interest
                end_balance = start_balance + interest + current_pmt
            else:  # BEGINNING of period
                after_payment_balance = start_balance + current_pmt
                interest = after_payment_balance * per_period_rate
                principal_paid = -current_pmt - interest
                end_balance = after_payment_balance + interest

            total_interest += interest
            total_payments_val += -current_pmt

            schedule.append({
                'period': i + 1, 'start_balance': float(start_balance),
                'interest': float(interest), 'payment': float(current_pmt),
                'principal_paid': float(principal_paid), 'end_balance': float(end_balance)
            })
            balance = end_balance

        # ---------- 7. Prepare response values ----------
        final_solved_value = float(solved_value)
        final_balance_val = float(balance)
        final_total_payments = float(total_payments_val)
        final_total_interest = float(total_interest)

        if not all(math.isfinite(v) for v in [final_solved_value, final_balance_val, final_total_payments, final_total_interest]):
            raise ValueError("Calculation resulted in an invalid number (NaN or Infinity). Please check your inputs.")

        period_name = PERIOD_NAMES.get(pmt_freq, "Period")
        
        # When solving for NPer, return it in years
        if solve_for == 'nper':
            final_solved_value = float(solved_value / pmt_freq) if pmt_freq > 0 else 0
            period_labels = [f"{period_name} {i}" for i in range(1, int(round(float(solved_value))) + 1)]
        else:
            period_labels = [f"{period_name} {i}" for i in range(1, schedule_nper + 1)]


        return jsonify({
            'success': True, 'solved_variable': solve_for,
            'solved_value': final_solved_value, 'final_balance': final_balance_val,
            'total_payments': final_total_payments, 'total_interest': final_total_interest,
            'schedule': schedule, 'period_labels': period_labels
        })

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 400

