# NHS Data Integrity Testing Suite

A comprehensive testing framework that validates data integrity across the entire NHS Analytics application stack, from raw Excel files through database storage to frontend visualization.

## Overview

This testing suite ensures that:
- Raw NHS data files are valid and complete
- Database storage maintains data accuracy
- API responses match database content
- Frontend displays reflect accurate data
- Mathematical calculations are correct
- Data transformations are applied properly

## Test Components

### 1. Raw Data Validation (`comprehensive_raw_data_validator.py`)
Validates the integrity of raw NHS data files:
- File accessibility and structure validation
- Data quality checks (missing values, duplicates, outliers)
- NHS standards compliance (trust codes, date formats)
- Cross-file consistency analysis
- Temporal coverage validation

**Usage:**
```bash
python3 comprehensive_raw_data_validator.py
```

### 2. Database Integrity Validation (`database_integrity_validator.py`)
Validates database structure and data integrity:
- Database connectivity and health checks
- Table structure and schema validation
- Data integrity constraints verification
- JSONB field structure validation
- Performance indicator analysis
- Security configuration review

**Usage:**
```bash
# Set environment variables first
export SUPABASE_HOST="your-host"
export SUPABASE_PASSWORD="your-password"

python3 database_integrity_validator.py
```

### 3. End-to-End Data Flow Validation (`end_to_end_data_flow_validator.py`)
Validates complete data flow from raw files to frontend:
- Raw data to database accuracy validation
- Database to API response consistency
- API to frontend rendering validation
- Mathematical calculation verification
- Cross-layer consistency checks
- Performance impact assessment

**Usage:**
```bash
# Ensure frontend is running on localhost:3000
npm run dev

python3 end_to_end_data_flow_validator.py
```

### 4. Master Test Orchestrator (`master_test_orchestrator.py`)
Coordinates all tests and generates comprehensive reports:
- Executes all test suites in proper sequence
- Aggregates results and generates HTML reports
- Provides CI/CD integration capabilities
- Sends alerts for critical failures
- Tracks testing trends over time

**Usage:**
```bash
# Run all tests
python3 master_test_orchestrator.py

# Run specific test suites
python3 master_test_orchestrator.py --filter raw_data_validation database_integrity

# View test history
python3 master_test_orchestrator.py --history 30

# Cleanup old files
python3 master_test_orchestrator.py --cleanup 30
```

## Setup Instructions

### Prerequisites
```bash
# Install required Python packages
pip3 install pandas numpy psycopg2-binary requests

# Ensure you have access to:
# - NHS data files in ../Data/ directory
# - Supabase database credentials
# - Running Next.js frontend (for end-to-end tests)
```

### Environment Variables
Create a `.env` file or set environment variables:
```bash
# Database configuration
SUPABASE_HOST=db.fsopilxzaaukmcqcskqm.supabase.co
SUPABASE_PORT=5432
SUPABASE_DATABASE=postgres
SUPABASE_USER=postgres
SUPABASE_PASSWORD=your_password

# Notification configuration (optional)
NOTIFICATION_EMAIL=admin@example.com
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your_email@gmail.com
SMTP_PASSWORD=your_app_password

# Test configuration
CONTINUE_ON_FAILURE=true
PARALLEL_EXECUTION=false
```

## Test Execution

### Quick Start
```bash
# Run all tests with comprehensive reporting
python3 master_test_orchestrator.py
```

### Individual Test Execution
```bash
# Test raw data only
python3 comprehensive_raw_data_validator.py

# Test database only (requires DB credentials)
python3 database_integrity_validator.py

# Test end-to-end flow (requires running frontend)
python3 end_to_end_data_flow_validator.py
```

### CI/CD Integration
```yaml
# Example GitHub Actions workflow
name: Data Integrity Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Setup Python
        uses: actions/setup-python@v2
        with:
          python-version: '3.9'
      - name: Install dependencies
        run: pip install pandas numpy psycopg2-binary requests
      - name: Run data integrity tests
        env:
          SUPABASE_PASSWORD: ${{ secrets.SUPABASE_PASSWORD }}
        run: |
          cd data-integrity-tests/new-data-integrity-tests
          python3 master_test_orchestrator.py
```

## Report Interpretation

### Test Statuses
- **PASS**: All validations successful
- **WARNING**: Minor issues detected, system functional
- **FAIL**: Significant issues found, requires attention
- **ERROR**: Test execution failed, technical issues
- **TIMEOUT**: Test took too long to complete

### Critical vs Non-Critical Issues
- **Critical Issues**: Prevent deployment, require immediate attention
- **Non-Critical Issues**: Should be addressed but don't block releases

### Report Outputs
- **JSON Reports**: Detailed machine-readable results in `results/` directory
- **HTML Reports**: Human-readable comprehensive reports in `reports/` directory
- **Console Output**: Summary information during test execution

## Troubleshooting

### Common Issues

#### Database Connection Failures
```bash
# Check database credentials
psql -h db.fsopilxzaaukmcqcskqm.supabase.co -U postgres -d postgres

# Verify environment variables
echo $SUPABASE_PASSWORD
```

#### Frontend Connection Issues
```bash
# Ensure frontend is running
curl http://localhost:3000/api/health

# Check if Next.js dev server is running
npm run dev
```

#### File Access Issues
```bash
# Verify data directory exists and is readable
ls -la ../Data/
chmod +r ../Data/*.xlsx
```

### Performance Optimization
- For large datasets, consider running tests during off-peak hours
- Use `--filter` option to run specific test suites
- Monitor test duration and adjust timeouts if needed

### Email Notifications
To receive alerts for critical failures:
1. Configure SMTP settings in environment variables
2. Set `NOTIFICATION_EMAIL` to your email address
3. Ensure firewall allows SMTP traffic

## Test Development

### Adding New Test Suites
1. Create new Python file following naming convention
2. Implement validation logic with proper error handling
3. Generate JSON report with standardized format
4. Update `master_test_orchestrator.py` configuration
5. Add documentation and examples

### Test Suite Template
```python
#!/usr/bin/env python3
"""
Custom Test Suite Template
"""

import json
from datetime import datetime
from typing import Dict, List, Any

class CustomValidator:
    def __init__(self):
        self.results = []

    def run_validation(self) -> Dict[str, Any]:
        report = {
            'validation_timestamp': datetime.now().isoformat(),
            'validator': 'Custom Validator',
            'validation_results': [],
            'overall_status': 'PASS'
        }

        # Add your validation logic here

        return report

def main():
    validator = CustomValidator()
    report = validator.run_validation()

    # Save report
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    with open(f"custom_validation_{timestamp}.json", 'w') as f:
        json.dump(report, f, indent=2, default=str)

    return report['overall_status'] in ['PASS', 'WARNING']

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)
```

## Best Practices

### Running Tests
- Run tests in a clean environment
- Ensure all dependencies are available
- Review test history for patterns
- Address warnings before they become failures

### Monitoring
- Schedule regular test runs (daily/weekly)
- Set up alerts for critical failures
- Monitor test performance trends
- Keep test results for audit purposes

### Maintenance
- Update tests when data schemas change
- Review and adjust timeout values periodically
- Clean up old test results regularly
- Update documentation as tests evolve

## Support

For issues, questions, or contributions:
1. Check the troubleshooting section above
2. Review test logs and error messages
3. Consult the NHS Analytics system documentation
4. Contact the development team with detailed error information

## Version History

- **v1.0**: Initial comprehensive testing suite
  - Raw data validation
  - Database integrity checks
  - End-to-end flow validation
  - Master test orchestrator
  - HTML report generation