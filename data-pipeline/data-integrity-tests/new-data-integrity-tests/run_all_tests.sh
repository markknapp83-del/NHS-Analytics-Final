#!/bin/bash
# NHS Data Integrity Test Suite Runner
# Comprehensive script to execute all data integrity tests

set -e  # Exit on any error

# Configuration
BASE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
LOG_FILE="${BASE_DIR}/test_execution_${TIMESTAMP}.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOG_FILE"
}

print_colored() {
    echo -e "${2}${1}${NC}"
}

print_header() {
    echo
    print_colored "============================================================" "$BLUE"
    print_colored "$1" "$BLUE"
    print_colored "============================================================" "$BLUE"
    echo
}

# Check prerequisites
check_prerequisites() {
    print_header "Checking Prerequisites"

    # Check Python
    if ! command -v python3 &> /dev/null; then
        print_colored "❌ Python3 not found" "$RED"
        exit 1
    fi
    print_colored "✅ Python3 found: $(python3 --version)" "$GREEN"

    # Check required Python packages
    local packages=("pandas" "numpy" "psycopg2" "requests")
    for package in "${packages[@]}"; do
        if python3 -c "import $package" 2>/dev/null; then
            print_colored "✅ $package is installed" "$GREEN"
        else
            print_colored "❌ $package not found. Installing..." "$YELLOW"
            pip3 install "$package" || {
                print_colored "❌ Failed to install $package" "$RED"
                exit 1
            }
        fi
    done

    # Check data directory
    DATA_DIR="../Data"
    if [ -d "$DATA_DIR" ]; then
        DATA_FILE_COUNT=$(find "$DATA_DIR" -name "*.xlsx" -o -name "*.csv" | wc -l)
        print_colored "✅ Data directory found with $DATA_FILE_COUNT files" "$GREEN"
    else
        print_colored "❌ Data directory not found: $DATA_DIR" "$RED"
        exit 1
    fi

    # Check environment variables
    if [ -z "$SUPABASE_PASSWORD" ]; then
        print_colored "⚠️  SUPABASE_PASSWORD not set - database tests may fail" "$YELLOW"
    else
        print_colored "✅ Database credentials configured" "$GREEN"
    fi

    log "Prerequisites check completed"
}

# Test database connectivity
test_database_connectivity() {
    print_header "Testing Database Connectivity"

    if [ -n "$SUPABASE_PASSWORD" ]; then
        log "Testing database connection..."

        # Simple connection test using Python
        python3 -c "
import psycopg2
import os
try:
    conn = psycopg2.connect(
        host=os.getenv('SUPABASE_HOST', 'db.fsopilxzaaukmcqcskqm.supabase.co'),
        port=5432,
        database='postgres',
        user='postgres',
        password=os.getenv('SUPABASE_PASSWORD')
    )
    conn.close()
    print('✅ Database connection successful')
except Exception as e:
    print(f'❌ Database connection failed: {e}')
    exit(1)
        " || {
            print_colored "❌ Database connectivity test failed" "$RED"
            exit 1
        }
    else
        print_colored "⚠️  Skipping database connectivity test - no credentials" "$YELLOW"
    fi
}

# Test frontend availability
test_frontend_availability() {
    print_header "Testing Frontend Availability"

    FRONTEND_URL="http://localhost:3000"

    if curl -s "$FRONTEND_URL" > /dev/null 2>&1; then
        print_colored "✅ Frontend is accessible at $FRONTEND_URL" "$GREEN"
    else
        print_colored "⚠️  Frontend not accessible at $FRONTEND_URL" "$YELLOW"
        print_colored "   End-to-end tests may be limited" "$YELLOW"
    fi
}

# Run individual test suite
run_test_suite() {
    local test_name="$1"
    local test_script="$2"
    local timeout_minutes="$3"

    print_header "Running $test_name"
    log "Starting $test_name..."

    local start_time=$(date +%s)

    # Run the test with timeout
    if timeout "${timeout_minutes}m" python3 "$test_script" > "${test_name}_${TIMESTAMP}.log" 2>&1; then
        local status="PASSED"
        local color="$GREEN"
        local icon="✅"
    else
        local exit_code=$?
        if [ $exit_code -eq 124 ]; then
            local status="TIMEOUT"
            local color="$YELLOW"
            local icon="⏱️"
        else
            local status="FAILED"
            local color="$RED"
            local icon="❌"
        fi
    fi

    local end_time=$(date +%s)
    local duration=$((end_time - start_time))

    print_colored "$icon $test_name: $status (${duration}s)" "$color"
    log "$test_name completed with status: $status in ${duration}s"

    # Store result for summary
    echo "$test_name,$status,$duration" >> "${BASE_DIR}/test_results_${TIMESTAMP}.csv"

    return $([[ "$status" == "PASSED" ]] && echo 0 || echo 1)
}

# Generate summary report
generate_summary() {
    print_header "Test Execution Summary"

    local results_file="${BASE_DIR}/test_results_${TIMESTAMP}.csv"

    if [ -f "$results_file" ]; then
        local total_tests=0
        local passed_tests=0
        local failed_tests=0
        local timeout_tests=0
        local total_duration=0

        while IFS=',' read -r test_name status duration; do
            total_tests=$((total_tests + 1))
            total_duration=$((total_duration + duration))

            case "$status" in
                "PASSED") passed_tests=$((passed_tests + 1)) ;;
                "FAILED") failed_tests=$((failed_tests + 1)) ;;
                "TIMEOUT") timeout_tests=$((timeout_tests + 1)) ;;
            esac

            # Color code the output
            case "$status" in
                "PASSED") color="$GREEN" ;;
                "FAILED") color="$RED" ;;
                "TIMEOUT") color="$YELLOW" ;;
                *) color="$NC" ;;
            esac

            printf "%-30s %s%-10s%s %s\n" "$test_name" "$color" "$status" "$NC" "${duration}s"

        done < "$results_file"

        echo
        print_colored "Summary:" "$BLUE"
        print_colored "  Total Tests: $total_tests" "$NC"
        print_colored "  Passed: $passed_tests" "$GREEN"
        print_colored "  Failed: $failed_tests" "$RED"
        print_colored "  Timeout: $timeout_tests" "$YELLOW"
        print_colored "  Total Duration: ${total_duration}s" "$NC"

        local success_rate=$((passed_tests * 100 / total_tests))
        print_colored "  Success Rate: ${success_rate}%" "$NC"

        # Overall status
        if [ $failed_tests -eq 0 ] && [ $timeout_tests -eq 0 ]; then
            print_colored "🎉 Overall Status: ALL TESTS PASSED" "$GREEN"
            log "Test execution completed successfully - all tests passed"
            return 0
        elif [ $failed_tests -eq 0 ]; then
            print_colored "⚠️  Overall Status: WARNINGS (timeouts detected)" "$YELLOW"
            log "Test execution completed with warnings - timeout issues detected"
            return 1
        else
            print_colored "❌ Overall Status: FAILURES DETECTED" "$RED"
            log "Test execution completed with failures - $failed_tests test(s) failed"
            return 1
        fi
    else
        print_colored "❌ No test results found" "$RED"
        return 1
    fi
}

# Main execution
main() {
    print_header "NHS Data Integrity Test Suite"
    print_colored "Execution started at: $(date)" "$BLUE"
    print_colored "Log file: $LOG_FILE" "$BLUE"

    log "Starting NHS Data Integrity Test Suite execution"

    # Change to script directory
    cd "$BASE_DIR"

    # Check prerequisites
    check_prerequisites

    # Test connectivity
    test_database_connectivity
    test_frontend_availability

    # Initialize results file
    echo "test_name,status,duration" > "test_results_${TIMESTAMP}.csv"

    # Run test suites in order
    local overall_success=true

    # Phase 1: Raw Data Validation
    if ! run_test_suite "Raw Data Validation" "comprehensive_raw_data_validator.py" 10; then
        overall_success=false
        if [ "${CONTINUE_ON_FAILURE:-true}" != "true" ]; then
            print_colored "❌ Stopping execution due to critical failure" "$RED"
            exit 1
        fi
    fi

    # Phase 2: Database Integrity Validation
    if ! run_test_suite "Database Integrity" "database_integrity_validator.py" 15; then
        overall_success=false
        if [ "${CONTINUE_ON_FAILURE:-true}" != "true" ]; then
            print_colored "❌ Stopping execution due to critical failure" "$RED"
            exit 1
        fi
    fi

    # Phase 3: End-to-End Flow Validation
    if ! run_test_suite "End-to-End Flow" "end_to_end_data_flow_validator.py" 20; then
        overall_success=false
    fi

    # Generate summary
    if ! generate_summary; then
        overall_success=false
    fi

    # Final status
    echo
    print_colored "Test execution completed at: $(date)" "$BLUE"
    print_colored "Full log available at: $LOG_FILE" "$BLUE"

    # Find generated reports
    print_colored "Generated reports:" "$BLUE"
    find . -name "*validation_$(date +%Y%m%d)*.json" -o -name "*validation_$(date +%Y%m%d)*.html" | while read -r report; do
        print_colored "  - $report" "$NC"
    done

    log "Test suite execution completed"

    if $overall_success; then
        exit 0
    else
        exit 1
    fi
}

# Handle script interruption
cleanup() {
    print_colored "\n⚠️  Test execution interrupted" "$YELLOW"
    log "Test execution interrupted by user"
    exit 130
}

trap cleanup INT TERM

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --help|-h)
            echo "NHS Data Integrity Test Suite Runner"
            echo ""
            echo "Usage: $0 [options]"
            echo ""
            echo "Options:"
            echo "  --help, -h          Show this help message"
            echo "  --skip-connectivity Skip connectivity tests"
            echo "  --continue-on-fail  Continue execution even if tests fail"
            echo "  --stop-on-fail      Stop execution on first failure"
            echo ""
            echo "Environment Variables:"
            echo "  SUPABASE_PASSWORD   Database password for connectivity tests"
            echo "  CONTINUE_ON_FAILURE Continue on test failures (default: true)"
            echo ""
            exit 0
            ;;
        --skip-connectivity)
            SKIP_CONNECTIVITY=true
            shift
            ;;
        --continue-on-fail)
            export CONTINUE_ON_FAILURE=true
            shift
            ;;
        --stop-on-fail)
            export CONTINUE_ON_FAILURE=false
            shift
            ;;
        *)
            print_colored "Unknown option: $1" "$RED"
            print_colored "Use --help for usage information" "$RED"
            exit 1
            ;;
    esac
done

# Execute main function
main "$@"