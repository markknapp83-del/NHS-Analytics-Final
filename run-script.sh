#!/bin/bash

# NHS Data Analytics Tool - Script Runner
# Usage: ./run-script.sh <script-name> [args...]

if [ $# -eq 0 ]; then
    echo "NHS Data Analytics Tool - Script Runner"
    echo "======================================="
    echo ""
    echo "Usage: ./run-script.sh <script-name> [args...]"
    echo ""
    echo "Available scripts:"
    echo "  demo                 - Run transformation demo (no database required)"
    echo "  populate             - Populate database with NHS data"
    echo "  check-database       - Check current database state"
    echo "  optimize-coverage    - Optimize database for maximum trust coverage"
    echo "  missing-analysis     - Analyze missing trusts"
    echo "  complete-missing     - Complete missing trust processing"
    echo ""
    echo "Examples:"
    echo "  ./run-script.sh demo"
    echo "  ./run-script.sh populate --clear"
    echo "  ./run-script.sh check-database"
    echo ""
    exit 1
fi

SCRIPT_NAME=$1
shift # Remove script name from arguments

case $SCRIPT_NAME in
    demo)
        cd scripts && node demo_transformation.js "$@"
        ;;
    populate)
        cd scripts && node populate_database.js "$@"
        ;;
    check-database)
        cd scripts && node check_database_state.js "$@"
        ;;
    optimize-coverage)
        cd scripts && node optimize_for_trust_coverage.js "$@"
        ;;
    missing-analysis)
        cd scripts && node missing_trusts_analysis.js "$@"
        ;;
    complete-missing)
        cd scripts && node complete_missing_trusts.js "$@"
        ;;
    test)
        cd scripts && node test_transformation.js "$@"
        ;;
    *)
        echo "Unknown script: $SCRIPT_NAME"
        echo "Run './run-script.sh' for available options"
        exit 1
        ;;
esac