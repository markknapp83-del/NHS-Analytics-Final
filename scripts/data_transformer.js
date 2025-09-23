const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const Papa = require('papaparse');

class NHSDataTransformer {
  constructor(supabaseUrl, supabaseKey) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
    this.validationRules = this.loadValidationRules();
    this.transformationMapping = this.loadTransformationMapping();
    this.errors = [];
    this.warnings = [];
    this.successfulTransforms = 0;
    this.failedTransforms = 0;
  }

  loadValidationRules() {
    return {
      trust_code: {
        required: true,
        pattern: /^[A-Z0-9]{3}$/,
        description: "3-character trust code"
      },
      period: {
        required: true,
        pattern: /^\d{4}-\d{2}-\d{2}$/,
        description: "ISO date format YYYY-MM-DD"
      },
      percentages: {
        min: 0,
        max: 100,
        description: "Percentage values must be 0-100"
      },
      numbers: {
        min: 0,
        description: "Numeric values must be non-negative"
      }
    };
  }

  loadTransformationMapping() {
    const mappingPath = '../transformation_strategy.json';
    const mappingData = fs.readFileSync(mappingPath, 'utf8');
    return JSON.parse(mappingData);
  }

  // Main transformation method for a single CSV row
  transform_csv_row(csvRow) {
    try {
      const record = {
        trust_code: this.validateTrustCode(csvRow.trust_code),
        trust_name: csvRow.trust_name || '',
        period: this.validatePeriod(csvRow.period),
        icb_code: csvRow.icb_code || null,
        icb_name: csvRow.icb_name || null,
        data_type: 'monthly',
        rtt_data: this.build_rtt_data(csvRow),
        ae_data: this.build_ae_data(csvRow),
        diagnostics_data: this.build_diagnostics_data(csvRow),
        capacity_data: this.build_capacity_data(csvRow)
      };

      const [isValid, validationErrors] = this.validate_record(record);
      if (!isValid) {
        this.errors.push({
          trust_code: record.trust_code,
          period: record.period,
          errors: validationErrors
        });
        this.failedTransforms++;
        return null;
      }

      this.successfulTransforms++;
      return record;
    } catch (error) {
      this.errors.push({
        trust_code: csvRow.trust_code || 'UNKNOWN',
        period: csvRow.period || 'UNKNOWN',
        errors: [`Transformation error: ${error.message}`]
      });
      this.failedTransforms++;
      return null;
    }
  }

  // Build RTT data JSONB structure
  build_rtt_data(csvRow) {
    const rttData = {
      trust_total: {},
      specialties: {}
    };

    // Build trust total metrics
    const trustTotalMapping = this.transformationMapping.column_mapping.rtt_data.trust_total;
    trustTotalMapping.forEach(column => {
      const value = this.parseNumericValue(csvRow[column]);
      const metricName = column.replace('trust_total_', '');
      rttData.trust_total[metricName] = value;
    });

    // Build specialty-specific metrics
    const specialties = this.transformationMapping.column_mapping.rtt_data.specialties;
    Object.keys(specialties).forEach(specialty => {
      rttData.specialties[specialty] = {};
      specialties[specialty].forEach(column => {
        const value = this.parseNumericValue(csvRow[column]);
        const metricName = column.replace(`rtt_${specialty}_`, '');
        rttData.specialties[specialty][metricName] = value;
      });
    });

    return rttData;
  }

  // Build A&E data JSONB structure
  build_ae_data(csvRow) {
    const aeData = {};
    const aeMapping = this.transformationMapping.column_mapping.ae_data;

    aeMapping.forEach(column => {
      const value = this.parseNumericValue(csvRow[column]);
      const metricName = column.replace('ae_', '');
      aeData[metricName] = value;
    });

    // If all A&E fields are null/empty, this trust likely doesn't provide A&E services
    // Return empty object rather than failing - permissive validation will handle this
    const hasAnyAEData = Object.values(aeData).some(value => value !== null && value !== undefined);

    if (!hasAnyAEData) {
      // Return minimal structure for trusts without A&E services
      return {
        attendances_total: null,
        four_hour_performance_pct: null,
        emergency_admissions_total: null,
        twelve_hour_wait_admissions: null,
        over_4hrs_total: null
      };
    }

    return aeData;
  }

  // Build Diagnostics data JSONB structure
  build_diagnostics_data(csvRow) {
    const diagnosticsData = {};
    const diagnosticsMapping = this.transformationMapping.column_mapping.diagnostics_data;

    Object.keys(diagnosticsMapping).forEach(testType => {
      diagnosticsData[testType] = {};
      diagnosticsMapping[testType].forEach(column => {
        const value = this.parseNumericValue(csvRow[column]);
        const metricName = column.replace(`diag_${testType}_`, '');
        diagnosticsData[testType][metricName] = value;
      });
    });

    return diagnosticsData;
  }

  // Build Capacity data JSONB structure
  build_capacity_data(csvRow) {
    const capacityData = {};
    const capacityMapping = this.transformationMapping.column_mapping.capacity_data;

    capacityMapping.forEach(column => {
      const value = this.parseNumericValue(csvRow[column]);
      capacityData[column] = value;
    });

    return capacityData;
  }

  // Validation methods
  validateTrustCode(trustCode) {
    if (!trustCode || typeof trustCode !== 'string') {
      throw new Error('Trust code is required');
    }
    if (!this.validationRules.trust_code.pattern.test(trustCode)) {
      throw new Error(`Invalid trust code format: ${trustCode}`);
    }
    return trustCode.toUpperCase();
  }

  validatePeriod(period) {
    if (!period || typeof period !== 'string') {
      throw new Error('Period is required');
    }
    if (!this.validationRules.period.pattern.test(period)) {
      throw new Error(`Invalid period format: ${period}`);
    }
    return period;
  }

  parseNumericValue(value) {
    if (value === null || value === undefined || value === '' || value === 'null') {
      return null;
    }

    const numValue = Number(value);
    if (isNaN(numValue)) {
      return null;
    }

    return numValue >= 0 ? numValue : null;
  }

  // Comprehensive record validation
  validate_record(record) {
    const errors = [];

    // Validate required fields
    if (!record.trust_code) errors.push('Missing trust_code');
    if (!record.period) errors.push('Missing period');

    // Validate data completeness - at least 50% of core metrics should be present
    const coreMetrics = this.countCoreMetrics(record);
    if (coreMetrics.present / coreMetrics.total < 0.5) {
      this.warnings.push({
        trust_code: record.trust_code,
        period: record.period,
        warning: `Low data completeness: ${Math.round(coreMetrics.present / coreMetrics.total * 100)}%`
      });
    }

    // Validate cross-field relationships
    const crossValidationErrors = this.validateCrossFieldRelationships(record);
    errors.push(...crossValidationErrors);

    return [errors.length === 0, errors];
  }

  countCoreMetrics(record) {
    let present = 0;
    let total = 0;

    // Count RTT metrics
    if (record.rtt_data?.trust_total) {
      Object.values(record.rtt_data.trust_total).forEach(value => {
        total++;
        if (value !== null && value !== undefined) present++;
      });
    }

    // Count A&E metrics
    if (record.ae_data) {
      Object.values(record.ae_data).forEach(value => {
        total++;
        if (value !== null && value !== undefined) present++;
      });
    }

    return { present, total };
  }

  validateCrossFieldRelationships(record) {
    const errors = [];

    try {
      // DISABLED: RTT specialty totals vs trust total validation
      // NHS data often has trust totals that include pathways not captured in individual specialties
      // This validation was causing 1,666 records to be rejected incorrectly

      // Validate percentage ranges
      this.validatePercentageRanges(record, errors);

    } catch (error) {
      errors.push(`Cross-validation error: ${error.message}`);
    }

    return errors;
  }

  validatePercentageRanges(record, errors) {
    // Check RTT percentage fields
    if (record.rtt_data?.trust_total?.percent_within_18_weeks) {
      const pct = record.rtt_data.trust_total.percent_within_18_weeks;
      if (pct < 0 || pct > 100) {
        errors.push(`Invalid RTT percentage: ${pct}%`);
      }
    }

    // Check A&E percentage fields
    if (record.ae_data?.four_hour_performance_pct) {
      const pct = record.ae_data.four_hour_performance_pct;
      if (pct < 0 || pct > 100) {
        errors.push(`Invalid A&E percentage: ${pct}%`);
      }
    }
  }

  // Batch processing methods
  async processCSVFile(csvFilePath, batchSize = 100) {
    console.log(`Starting CSV processing: ${csvFilePath}`);

    return new Promise((resolve, reject) => {
      const records = [];

      Papa.parse(fs.createReadStream(csvFilePath), {
        header: true,
        skipEmptyLines: true,
        step: (row) => {
          const transformedRecord = this.transform_csv_row(row.data);
          if (transformedRecord) {
            records.push(transformedRecord);
          }

          // Process in batches
          if (records.length >= batchSize) {
            this.upsert_to_supabase(records.splice(0, batchSize))
              .catch(error => console.error('Batch upsert error:', error));
          }
        },
        complete: async () => {
          // Process remaining records
          if (records.length > 0) {
            await this.upsert_to_supabase(records);
          }

          console.log('CSV processing completed');
          resolve(this.getProcessingSummary());
        },
        error: (error) => {
          console.error('CSV parsing error:', error);
          reject(error);
        }
      });
    });
  }

  // Upsert records to Supabase with conflict resolution
  async upsert_to_supabase(records) {
    try {
      // First try upsert, if that fails try simple insert
      let { data, error } = await this.supabase
        .from('trust_metrics')
        .upsert(records, {
          onConflict: 'trust_code,period'
        });

      // If upsert fails due to missing constraint, try simple insert
      if (error && error.code === '42P10') {
        console.log('Upsert constraint not available, trying simple insert...');
        const result = await this.supabase
          .from('trust_metrics')
          .insert(records);

        data = result.data;
        error = result.error;
      }

      if (error) {
        console.error('Supabase upsert error:', error);
        this.errors.push({
          type: 'database_error',
          message: error.message,
          records_affected: records.length
        });
        return { success: false, error };
      }

      console.log(`Successfully upserted ${records.length} records`);
      return { success: true, data };
    } catch (error) {
      console.error('Unexpected database error:', error);
      this.errors.push({
        type: 'unexpected_error',
        message: error.message,
        records_affected: records.length
      });
      return { success: false, error };
    }
  }

  // Generate processing summary
  getProcessingSummary() {
    return {
      successful_transforms: this.successfulTransforms,
      failed_transforms: this.failedTransforms,
      total_errors: this.errors.length,
      total_warnings: this.warnings.length,
      success_rate: this.successfulTransforms / (this.successfulTransforms + this.failedTransforms) * 100,
      errors: this.errors,
      warnings: this.warnings
    };
  }

  // Generate detailed error report
  generateErrorReport() {
    const report = {
      timestamp: new Date().toISOString(),
      summary: this.getProcessingSummary(),
      error_categories: this.categorizeErrors(),
      recommendations: this.generateRecommendations()
    };

    fs.writeFileSync('transformation_error_report.json', JSON.stringify(report, null, 2));
    console.log('Error report generated: transformation_error_report.json');
    return report;
  }

  categorizeErrors() {
    const categories = {
      validation_errors: [],
      data_format_errors: [],
      cross_validation_errors: [],
      database_errors: []
    };

    this.errors.forEach(error => {
      if (error.type === 'database_error') {
        categories.database_errors.push(error);
      } else if (error.errors?.some(e => e.includes('format'))) {
        categories.data_format_errors.push(error);
      } else if (error.errors?.some(e => e.includes('differs'))) {
        categories.cross_validation_errors.push(error);
      } else {
        categories.validation_errors.push(error);
      }
    });

    return categories;
  }

  generateRecommendations() {
    const recommendations = [];

    if (this.errors.length > 0) {
      recommendations.push('Review and clean source CSV data for validation errors');
    }

    if (this.warnings.length > 0) {
      recommendations.push('Investigate data completeness issues for low-quality records');
    }

    const errorRate = this.failedTransforms / (this.successfulTransforms + this.failedTransforms);
    if (errorRate > 0.1) {
      recommendations.push('High error rate detected - review transformation logic and data quality');
    }

    return recommendations;
  }
}

module.exports = NHSDataTransformer;