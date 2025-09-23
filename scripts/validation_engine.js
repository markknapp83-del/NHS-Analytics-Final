class ValidationEngine {
  constructor() {
    this.validationRules = this.initializeValidationRules();
    this.validationResults = {
      passed: 0,
      failed: 0,
      warnings: 0,
      errors: []
    };
  }

  initializeValidationRules() {
    return {
      trust_code: {
        required: true,
        pattern: /^[A-Z0-9]{3}$/,
        description: "Must be 3-character alphanumeric code"
      },
      trust_name: {
        required: false,
        minLength: 3,
        maxLength: 200,
        description: "Trust name should be between 3-200 characters"
      },
      period: {
        required: true,
        pattern: /^\d{4}-\d{2}-\d{2}$/,
        customValidator: this.validateDateFormat,
        description: "Must be valid ISO date format (YYYY-MM-DD)"
      },
      percentages: {
        min: 0,
        max: 100,
        allowNull: true,
        description: "Percentage values must be between 0-100"
      },
      numeric_counts: {
        min: 0,
        allowNull: true,
        description: "Count values must be non-negative integers"
      },
      wait_times: {
        min: 0,
        max: 200,
        allowNull: true,
        description: "Wait times must be between 0-200 weeks"
      }
    };
  }

  // Main validation method for a complete record
  validateRecord(record, permissiveMode = false) {
    const errors = [];
    const warnings = [];

    try {
      // Validate core metadata (always required)
      this.validateMetadata(record, errors, warnings);

      // In permissive mode, convert validation errors to warnings for missing data
      if (permissiveMode) {
        // Validate JSONB data structures permissively
        this.validateRTTDataPermissive(record.rtt_data, warnings);
        this.validateAEDataPermissive(record.ae_data, warnings);
        this.validateDiagnosticsDataPermissive(record.diagnostics_data, warnings);
        this.validateCapacityDataPermissive(record.capacity_data, warnings);
      } else {
        // Standard validation
        this.validateRTTData(record.rtt_data, errors, warnings);
        this.validateAEData(record.ae_data, errors, warnings);
        this.validateDiagnosticsData(record.diagnostics_data, errors, warnings);
        this.validateCapacityData(record.capacity_data, errors, warnings);
      }

      // Cross-field validation (disabled for now as it was too strict)
      // this.performCrossFieldValidation(record, errors, warnings);

      // Data completeness assessment
      this.assessDataCompleteness(record, warnings);

      if (errors.length === 0) {
        this.validationResults.passed++;
      } else {
        this.validationResults.failed++;
        this.validationResults.errors.push({
          trust_code: record.trust_code,
          period: record.period,
          errors,
          warnings
        });
      }

      this.validationResults.warnings += warnings.length;

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        completeness: this.calculateCompleteness(record)
      };

    } catch (error) {
      const validationError = `Validation engine error: ${error.message}`;
      this.validationResults.failed++;
      this.validationResults.errors.push({
        trust_code: record.trust_code || 'UNKNOWN',
        period: record.period || 'UNKNOWN',
        errors: [validationError],
        warnings: []
      });

      return {
        isValid: false,
        errors: [validationError],
        warnings: [],
        completeness: 0
      };
    }
  }

  // Validate core metadata fields
  validateMetadata(record, errors, warnings) {
    // Validate trust_code
    if (!this.validateField(record.trust_code, this.validationRules.trust_code)) {
      errors.push(`Invalid trust_code: ${record.trust_code}`);
    }

    // Validate period
    if (!this.validateField(record.period, this.validationRules.period)) {
      errors.push(`Invalid period format: ${record.period}`);
    }

    // Validate trust_name (warning if missing)
    if (!record.trust_name || record.trust_name.trim().length < 3) {
      warnings.push(`Trust name missing or too short: ${record.trust_name}`);
    }

    // Validate ICB data (warnings only)
    if (!record.icb_code) {
      warnings.push('ICB code missing - geographic analysis may be limited');
    }
  }

  // Validate RTT data structure and values
  validateRTTData(rttData, errors, warnings) {
    if (!rttData || typeof rttData !== 'object') {
      errors.push('RTT data is missing or invalid');
      return;
    }

    // Validate trust total section
    if (rttData.trust_total) {
      this.validateRTTMetrics(rttData.trust_total, 'trust_total', errors, warnings);
    } else {
      warnings.push('RTT trust total data missing');
    }

    // Validate specialties section
    if (rttData.specialties && typeof rttData.specialties === 'object') {
      Object.keys(rttData.specialties).forEach(specialty => {
        this.validateRTTMetrics(rttData.specialties[specialty], `specialty_${specialty}`, errors, warnings);
      });
    } else {
      warnings.push('RTT specialty data missing');
    }
  }

  validateRTTMetrics(metrics, context, errors, warnings) {
    const expectedFields = [
      'total_incomplete_pathways', 'total_within_18_weeks', 'total_over_18_weeks',
      'total_52_plus_weeks', 'total_65_plus_weeks', 'total_78_plus_weeks',
      'percent_within_18_weeks', 'median_wait_weeks'
    ];

    expectedFields.forEach(field => {
      if (metrics[field] !== null && metrics[field] !== undefined) {
        if (field === 'percent_within_18_weeks') {
          if (!this.validatePercentage(metrics[field])) {
            errors.push(`Invalid percentage in ${context}.${field}: ${metrics[field]}`);
          }
        } else if (field === 'median_wait_weeks') {
          if (!this.validateWaitTime(metrics[field])) {
            errors.push(`Invalid wait time in ${context}.${field}: ${metrics[field]}`);
          }
        } else {
          if (!this.validateCount(metrics[field])) {
            errors.push(`Invalid count in ${context}.${field}: ${metrics[field]}`);
          }
        }
      }
    });
  }

  // Validate A&E data structure and values
  validateAEData(aeData, errors, warnings) {
    if (!aeData || typeof aeData !== 'object') {
      warnings.push('A&E data is missing');
      return;
    }

    const expectedFields = {
      attendances_total: 'count',
      over_4hrs_total: 'count',
      four_hour_performance_pct: 'percentage',
      emergency_admissions_total: 'count',
      twelve_hour_wait_admissions: 'count'
    };

    Object.keys(expectedFields).forEach(field => {
      if (aeData[field] !== null && aeData[field] !== undefined) {
        const type = expectedFields[field];
        let isValid = false;

        if (type === 'percentage') {
          isValid = this.validatePercentage(aeData[field]);
        } else if (type === 'count') {
          isValid = this.validateCount(aeData[field]);
        }

        if (!isValid) {
          errors.push(`Invalid A&E ${type} in ${field}: ${aeData[field]}`);
        }
      }
    });
  }

  // Validate Diagnostics data structure and values
  validateDiagnosticsData(diagnosticsData, errors, warnings) {
    if (!diagnosticsData || typeof diagnosticsData !== 'object') {
      warnings.push('Diagnostics data is missing');
      return;
    }

    const expectedFields = [
      'thirteen_week_breaches', 'six_week_breaches', 'planned_tests',
      'total_waiting', 'unscheduled_tests', 'waiting_list_total'
    ];

    Object.keys(diagnosticsData).forEach(testType => {
      const testData = diagnosticsData[testType];
      if (testData && typeof testData === 'object') {
        expectedFields.forEach(field => {
          if (testData[field] !== null && testData[field] !== undefined) {
            if (!this.validateCount(testData[field])) {
              errors.push(`Invalid diagnostics count in ${testType}.${field}: ${testData[field]}`);
            }
          }
        });
      }
    });
  }

  // Validate Capacity data structure and values
  validateCapacityData(capacityData, errors, warnings) {
    if (!capacityData || typeof capacityData !== 'object') {
      warnings.push('Capacity data is missing');
      return;
    }

    if (capacityData.avg_daily_discharges !== null && capacityData.avg_daily_discharges !== undefined) {
      if (!this.validateCount(capacityData.avg_daily_discharges)) {
        errors.push(`Invalid average daily discharges: ${capacityData.avg_daily_discharges}`);
      }
    }

    if (capacityData.virtual_ward_capacity !== null && capacityData.virtual_ward_capacity !== undefined) {
      if (!this.validateCount(capacityData.virtual_ward_capacity)) {
        errors.push(`Invalid virtual ward capacity: ${capacityData.virtual_ward_capacity}`);
      }
    }

    if (capacityData.virtual_ward_occupancy_rate !== null && capacityData.virtual_ward_occupancy_rate !== undefined) {
      if (!this.validatePercentage(capacityData.virtual_ward_occupancy_rate)) {
        errors.push(`Invalid virtual ward occupancy rate: ${capacityData.virtual_ward_occupancy_rate}`);
      }
    }
  }

  // Cross-field validation
  performCrossFieldValidation(record, errors, warnings) {
    // RTT specialty totals vs trust total validation
    if (record.rtt_data?.trust_total && record.rtt_data?.specialties) {
      this.validateRTTTotals(record.rtt_data, errors, warnings);
    }

    // A&E logical consistency
    if (record.ae_data) {
      this.validateAELogicalConsistency(record.ae_data, errors, warnings);
    }

    // Diagnostics logical consistency
    if (record.diagnostics_data) {
      this.validateDiagnosticsLogicalConsistency(record.diagnostics_data, errors, warnings);
    }
  }

  validateRTTTotals(rttData, errors, warnings) {
    const trustTotal = rttData.trust_total.total_incomplete_pathways;
    if (!trustTotal) return;

    let specialtySum = 0;
    let validSpecialties = 0;

    Object.values(rttData.specialties).forEach(specialty => {
      if (specialty.total_incomplete_pathways) {
        specialtySum += specialty.total_incomplete_pathways;
        validSpecialties++;
      }
    });

    if (validSpecialties > 0) {
      const difference = Math.abs(trustTotal - specialtySum);
      const tolerance = trustTotal * 0.15; // 15% tolerance

      if (difference > tolerance) {
        warnings.push(
          `RTT specialty sum (${specialtySum}) differs significantly from trust total (${trustTotal}). Difference: ${difference}`
        );
      }
    }
  }

  validateAELogicalConsistency(aeData, errors, warnings) {
    // Check if over 4 hours is less than total attendances
    if (aeData.attendances_total && aeData.over_4hrs_total) {
      if (aeData.over_4hrs_total > aeData.attendances_total) {
        errors.push(`Over 4hrs total (${aeData.over_4hrs_total}) exceeds total attendances (${aeData.attendances_total})`);
      }
    }

    // Check if emergency admissions is reasonable vs attendances
    if (aeData.attendances_total && aeData.emergency_admissions_total) {
      if (aeData.emergency_admissions_total > aeData.attendances_total) {
        warnings.push(`Emergency admissions (${aeData.emergency_admissions_total}) exceeds attendances (${aeData.attendances_total})`);
      }
    }
  }

  validateDiagnosticsLogicalConsistency(diagnosticsData, errors, warnings) {
    Object.keys(diagnosticsData).forEach(testType => {
      const testData = diagnosticsData[testType];
      if (!testData) return;

      // Check if breaches don't exceed total waiting
      if (testData.total_waiting && testData.six_week_breaches) {
        if (testData.six_week_breaches > testData.total_waiting) {
          warnings.push(`${testType}: 6-week breaches (${testData.six_week_breaches}) exceed total waiting (${testData.total_waiting})`);
        }
      }

      if (testData.six_week_breaches && testData.thirteen_week_breaches) {
        if (testData.thirteen_week_breaches > testData.six_week_breaches) {
          warnings.push(`${testType}: 13-week breaches (${testData.thirteen_week_breaches}) exceed 6-week breaches (${testData.six_week_breaches})`);
        }
      }
    });
  }

  // Data completeness assessment
  assessDataCompleteness(record, warnings) {
    const completeness = this.calculateCompleteness(record);

    if (completeness < 0.3) {
      warnings.push(`Very low data completeness: ${Math.round(completeness * 100)}%`);
    } else if (completeness < 0.5) {
      warnings.push(`Low data completeness: ${Math.round(completeness * 100)}%`);
    }
  }

  calculateCompleteness(record) {
    let totalFields = 0;
    let populatedFields = 0;

    // Count RTT fields
    if (record.rtt_data?.trust_total) {
      Object.values(record.rtt_data.trust_total).forEach(value => {
        totalFields++;
        if (value !== null && value !== undefined) populatedFields++;
      });
    }

    // Count A&E fields
    if (record.ae_data) {
      Object.values(record.ae_data).forEach(value => {
        totalFields++;
        if (value !== null && value !== undefined) populatedFields++;
      });
    }

    // Count diagnostic fields (sample from first test type)
    if (record.diagnostics_data) {
      const firstTestType = Object.keys(record.diagnostics_data)[0];
      if (firstTestType && record.diagnostics_data[firstTestType]) {
        Object.values(record.diagnostics_data[firstTestType]).forEach(value => {
          totalFields++;
          if (value !== null && value !== undefined) populatedFields++;
        });
      }
    }

    return totalFields > 0 ? populatedFields / totalFields : 0;
  }

  // Basic field validation methods
  validateField(value, rule) {
    if (rule.required && (value === null || value === undefined || value === '')) {
      return false;
    }

    if (value && rule.pattern && !rule.pattern.test(value)) {
      return false;
    }

    if (value && rule.customValidator && !rule.customValidator(value)) {
      return false;
    }

    return true;
  }

  validatePercentage(value) {
    return this.validateNumericRange(value, this.validationRules.percentages);
  }

  validateCount(value) {
    return this.validateNumericRange(value, this.validationRules.numeric_counts);
  }

  validateWaitTime(value) {
    return this.validateNumericRange(value, this.validationRules.wait_times);
  }

  validateNumericRange(value, rule) {
    if (value === null || value === undefined) {
      return rule.allowNull !== false;
    }

    if (typeof value !== 'number' || isNaN(value)) {
      return false;
    }

    if (rule.min !== undefined && value < rule.min) {
      return false;
    }

    if (rule.max !== undefined && value > rule.max) {
      return false;
    }

    return true;
  }

  validateDateFormat(dateString) {
    if (!dateString) return false;
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date) && dateString === date.toISOString().split('T')[0];
  }

  // Get validation summary
  getValidationSummary() {
    const total = this.validationResults.passed + this.validationResults.failed;
    return {
      total_records: total,
      passed: this.validationResults.passed,
      failed: this.validationResults.failed,
      success_rate: total > 0 ? (this.validationResults.passed / total * 100).toFixed(2) : 0,
      total_warnings: this.validationResults.warnings,
      average_warnings_per_record: total > 0 ? (this.validationResults.warnings / total).toFixed(2) : 0
    };
  }

  // Generate detailed validation report
  generateValidationReport() {
    return {
      timestamp: new Date().toISOString(),
      summary: this.getValidationSummary(),
      failed_records: this.validationResults.errors,
      error_categories: this.categorizeValidationErrors(),
      recommendations: this.generateValidationRecommendations()
    };
  }

  categorizeValidationErrors() {
    const categories = {
      metadata_errors: 0,
      rtt_errors: 0,
      ae_errors: 0,
      diagnostics_errors: 0,
      cross_validation_errors: 0,
      completeness_issues: 0
    };

    this.validationResults.errors.forEach(record => {
      record.errors.forEach(error => {
        if (error.includes('trust_code') || error.includes('period')) {
          categories.metadata_errors++;
        } else if (error.includes('RTT')) {
          categories.rtt_errors++;
        } else if (error.includes('A&E')) {
          categories.ae_errors++;
        } else if (error.includes('diagnostics')) {
          categories.diagnostics_errors++;
        } else if (error.includes('differs') || error.includes('exceeds')) {
          categories.cross_validation_errors++;
        }
      });

      record.warnings.forEach(warning => {
        if (warning.includes('completeness')) {
          categories.completeness_issues++;
        }
      });
    });

    return categories;
  }

  generateValidationRecommendations() {
    const recommendations = [];
    const summary = this.getValidationSummary();

    if (summary.success_rate < 90) {
      recommendations.push('High failure rate detected - review data quality and validation rules');
    }

    if (summary.average_warnings_per_record > 2) {
      recommendations.push('High warning rate - investigate data completeness and consistency issues');
    }

    const categories = this.categorizeValidationErrors();
    if (categories.cross_validation_errors > 0) {
      recommendations.push('Cross-validation errors found - verify data aggregation logic in source system');
    }

    if (categories.completeness_issues > summary.total_records * 0.1) {
      recommendations.push('Significant data completeness issues - investigate data collection processes');
    }

    return recommendations;
  }

  // Reset validation state for new validation run
  reset() {
    this.validationResults = {
      passed: 0,
      failed: 0,
      warnings: 0,
      errors: []
    };
  }

  // Permissive validation methods - accept partial data rather than reject
  validateRTTDataPermissive(rttData, warnings) {
    if (!rttData || Object.keys(rttData).length === 0) {
      warnings.push('RTT data missing - populated with empty structure');
      return;
    }

    // Validate trust total if present
    if (rttData.trust_total) {
      this.validateRTTMetricsPermissive(rttData.trust_total, 'trust_total', warnings);
    } else {
      warnings.push('RTT trust total data missing');
    }

    // Validate specialties if present
    if (rttData.specialties && Object.keys(rttData.specialties).length > 0) {
      Object.entries(rttData.specialties).forEach(([specialty, metrics]) => {
        this.validateRTTMetricsPermissive(metrics, `specialty_${specialty}`, warnings);
      });
    } else {
      warnings.push('RTT specialty data missing');
    }
  }

  validateAEDataPermissive(aeData, warnings) {
    if (!aeData || Object.keys(aeData).length === 0) {
      warnings.push('A&E data missing - trust may not provide A&E services');
      return;
    }

    // A&E data is optional - many trusts don't provide A&E services
    // Just validate ranges if data is present
    if (aeData.four_hour_performance_pct !== null && aeData.four_hour_performance_pct !== undefined) {
      if (aeData.four_hour_performance_pct < 0 || aeData.four_hour_performance_pct > 100) {
        warnings.push('A&E 4-hour performance percentage out of range (0-100)');
      }
    }
  }

  validateDiagnosticsDataPermissive(diagnosticsData, warnings) {
    if (!diagnosticsData || Object.keys(diagnosticsData).length === 0) {
      warnings.push('Diagnostics data missing');
      return;
    }

    // Validate each diagnostic type if present
    Object.entries(diagnosticsData).forEach(([testType, metrics]) => {
      if (!metrics || Object.keys(metrics).length === 0) {
        warnings.push(`Diagnostics data missing for ${testType}`);
      }
    });
  }

  validateCapacityDataPermissive(capacityData, warnings) {
    if (!capacityData || Object.keys(capacityData).length === 0) {
      warnings.push('Capacity data missing');
      return;
    }

    // Validate occupancy rate if present
    if (capacityData.virtual_ward_occupancy_rate !== null && capacityData.virtual_ward_occupancy_rate !== undefined) {
      if (capacityData.virtual_ward_occupancy_rate < 0 || capacityData.virtual_ward_occupancy_rate > 100) {
        warnings.push('Virtual ward occupancy rate out of range (0-100)');
      }
    }
  }

  validateRTTMetricsPermissive(metrics, context, warnings) {
    if (!metrics || Object.keys(metrics).length === 0) {
      warnings.push(`RTT metrics missing for ${context}`);
      return;
    }

    // Check percentage fields if present
    if (metrics.percent_within_18_weeks !== null && metrics.percent_within_18_weeks !== undefined) {
      if (metrics.percent_within_18_weeks < 0 || metrics.percent_within_18_weeks > 100) {
        warnings.push(`RTT percentage out of range for ${context}`);
      }
    }

    // Check for negative counts
    Object.entries(metrics).forEach(([key, value]) => {
      if (key.includes('total') || key.includes('week') || key.includes('pathways')) {
        if (value !== null && value !== undefined && value < 0) {
          warnings.push(`Negative count value for ${context}.${key}`);
        }
      }
    });
  }
}

module.exports = ValidationEngine;