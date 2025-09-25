# Advanced Financial Calculator

This is a powerful, web-based financial calculator built with Python and Flask. It is designed to solve a wide range of complex time-value-of-money (TVM) problems, from simple savings goals to intricate loan amortization schedules with irregular payments.

# Key Features:
Solve for Any TVM Variable: Calculate Present Value (PV), Future Value (FV), Payment (PMT), Number of Periods (NPer), or the Interest Rate.
 # Flexible Payment Scenarios:
- Lump Sum: Simple calculations with no recurring payments.
- Regular Payments: Standard annuities like loans and mortgages.
- Growing Payments: Payments that increase by a fixed percentage each period.
- Irregular Payments: Input a custom stream of uneven cash flows.
- Advanced Rate Handling: Accurately converts between Nominal APR, Effective Annual Rate (EAR), and Per-Period rates with different compounding and payment frequencies.
- Detailed Amortization Schedules: Generates a full, period-by-period table showing the breakdown of interest, principal, and balance.
- Interactive Visualization: Includes a chart that visually represents the account balance over time.

# Running the Application Locally:
* To run this project on your own computer, follow these steps:
- Clone the repository:git clone [https://github.com/DFOM/financial-calculator.git]
- cd financial-calculator
- Create and activate a Python virtual environment: 

* For macOS/Linux
- python3 -m venv venv
- source venv/bin/activate

* For Windows
- py -m venv venv
- venv\Scripts\activate
- Install the required packages:pip install -r requirements.txt
- Run the Flask application:python app.py
- The application will be available at http://127.0.0.1:5000 in your web browser.