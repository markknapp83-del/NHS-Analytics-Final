const NHSDataTransformer = require('./data_transformer');
const ValidationEngine = require('./validation_engine');
const fs = require('fs');
const Papa = require('papaparse');

class CSVToSupabasePipeline {
  constructor(supabaseUrl, supabaseKey) {
    this.transformer = new NHSDataTransformer(supabaseUrl, supabaseKey);
    this.validator = new ValidationEngine();
    this.processedRecords = 0;
    this.batchSize = 100;
    this.pipeline_start_time = new Date();
    this.batches_processed = 0;
    this.records_queue = [];
  }

  async runPipeline(csvFilePath, options = {}) {
    console.log('🚀 Starting NHS Data Pipeline...');
    console.log(`📁 Source file: ${csvFilePath}`);
    console.log(`🎯 Batch size: ${options.batchSize || this.batchSize}`);

    if (options.batchSize) {
      this.batchSize = options.batchSize;
    }

    try {
      // Verify source file exists
      if (!fs.existsSync(csvFilePath)) {
        throw new Error(`CSV file not found: ${csvFilePath}`);
      }

      // Pre-validate CSV structure
      await this.validateCSVStructure(csvFilePath);

      // Process CSV file
      const result = await this.processCSVFile(csvFilePath);

      // Generate comprehensive report
      const report = await this.generateComprehensiveReport();

      console.log('✅ Pipeline completed successfully!');
      return {
        success: true,
        ...result,
        report
      };

    } catch (error) {
      console.error('❌ Pipeline failed:', error.message);
      const report = await this.generateComprehensiveReport();

      return {
        success: false,
        error: error.message,
        report
      };
    }
  }

  async validateCSVStructure(csvFilePath) {
    return new Promise((resolve, reject) => {
      console.log('🔍 Validating CSV structure...');

      const stream = fs.createReadStream(csvFilePath);
      let headerValidated = false;

      Papa.parse(stream, {
        header: true,
        skipEmptyLines: true,
        step: (row, parser) => {
          if (!headerValidated) {
            this.validateCSVHeaders(row.meta.fields);
            headerValidated = true;
            parser.abort(); // We only need to check the header
            resolve();
          }
        },
        error: (error) => {
          reject(new Error(`CSV parsing error: ${error.message}`));
        }
      });
    });
  }

  validateCSVHeaders(headers) {
    const requiredHeaders = [
      'trust_code', 'trust_name', 'period',
      'trust_total_total_incomplete_pathways', 'trust_total_percent_within_18_weeks',
      'ae_attendances_total', 'ae_4hr_performance_pct'
    ];

    const missingHeaders = requiredHeaders.filter(header => !headers.includes(header));

    if (missingHeaders.length > 0) {
      throw new Error(`Missing required CSV headers: ${missingHeaders.join(', ')}`);
    }

    console.log(`✅ CSV structure validated - ${headers.length} columns found`);
  }

  async processCSVFile(csvFilePath) {
    console.log('📊 Processing CSV data...');

    return new Promise((resolve, reject) => {
      const processingStats = {
        total_rows: 0,
        processed_rows: 0,
        valid_records: 0,
        invalid_records: 0,
        batches_uploaded: 0
      };

      Papa.parse(fs.createReadStream(csvFilePath), {
        header: true,
        skipEmptyLines: true,
        step: async (row) => {
          processingStats.total_rows++;

          try {
            // Transform CSV row to Supabase format
            const transformedRecord = this.transformer.transform_csv_row(row.data);

            if (transformedRecord) {
              // Try standard validation first
              let validationResult = this.validator.validateRecord(transformedRecord);

              // If standard validation fails, try permissive validation
              if (!validationResult.isValid) {
                validationResult = this.validator.validateRecord(transformedRecord, true); // permissive mode
                if (validationResult.isValid) {
                  console.log(`📋 Permissive validation accepted: ${transformedRecord.trust_code} (${validationResult.warnings.length} warnings)`);
                }
              }

              if (validationResult.isValid) {
                this.records_queue.push(transformedRecord);
                processingStats.valid_records++;

                // Process batch when queue is full
                if (this.records_queue.length >= this.batchSize) {
                  await this.processBatch(processingStats);
                }
              } else {
                processingStats.invalid_records++;
                console.log(`❌ Record rejected: ${transformedRecord.trust_code} - ${validationResult.errors.join(', ')}`);
              }
            } else {
              processingStats.invalid_records++;
            }

            processingStats.processed_rows++;

            // Progress reporting
            if (processingStats.processed_rows % 100 === 0) {
              console.log(`📈 Progress: ${processingStats.processed_rows} rows processed, ${processingStats.valid_records} valid records`);
            }

          } catch (error) {
            console.error(`❌ Error processing row ${processingStats.total_rows}:`, error.message);
            processingStats.invalid_records++;
          }
        },
        complete: async () => {
          // Process remaining records in queue
          if (this.records_queue.length > 0) {
            await this.processBatch(processingStats);
          }

          console.log('📋 Processing Summary:');
          console.log(`  Total rows: ${processingStats.total_rows}`);
          console.log(`  Valid records: ${processingStats.valid_records}`);
          console.log(`  Invalid records: ${processingStats.invalid_records}`);
          console.log(`  Batches uploaded: ${processingStats.batches_uploaded}`);

          resolve(processingStats);
        },
        error: (error) => {
          reject(new Error(`CSV processing error: ${error.message}`));
        }
      });
    });
  }

  async processBatch(stats) {
    try {
      console.log(`📤 Uploading batch of ${this.records_queue.length} records...`);

      const batch = this.records_queue.splice(0);
      const result = await this.transformer.upsert_to_supabase(batch);

      if (result.success) {
        stats.batches_uploaded++;
        this.batches_processed++;
        console.log(`✅ Batch ${this.batches_processed} uploaded successfully`);
      } else {
        console.error(`❌ Batch upload failed:`, result.error);
      }

    } catch (error) {
      console.error('❌ Batch processing error:', error.message);
    }
  }

  async generateComprehensiveReport() {
    const pipeline_end_time = new Date();
    const processing_duration = pipeline_end_time - this.pipeline_start_time;

    console.log('📊 Generating comprehensive report...');

    // Get transformation summary
    const transformationSummary = this.transformer.getProcessingSummary();

    // Get validation summary
    const validationSummary = this.validator.getValidationSummary();

    // Generate data quality assessment
    const dataQualityAssessment = await this.generateDataQualityAssessment();

    const comprehensiveReport = {
      pipeline_metadata: {
        timestamp: new Date().toISOString(),
        processing_duration_ms: processing_duration,
        processing_duration_human: this.formatDuration(processing_duration),
        batch_size: this.batchSize,
        batches_processed: this.batches_processed
      },
      transformation_summary: transformationSummary,
      validation_summary: validationSummary,
      data_quality_assessment: dataQualityAssessment,
      recommendations: this.generatePipelineRecommendations(transformationSummary, validationSummary),
      error_analysis: this.analyzeErrors(transformationSummary, validationSummary)
    };

    // Save report to file
    const reportFilename = `pipeline_report_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    fs.writeFileSync(reportFilename, JSON.stringify(comprehensiveReport, null, 2));
    console.log(`📄 Comprehensive report saved: ${reportFilename}`);

    return comprehensiveReport;
  }

  async generateDataQualityAssessment() {
    // Query database to validate final state
    try {
      const { data: recordCount, error: countError } = await this.transformer.supabase
        .from('trust_metrics')
        .select('*', { count: 'exact', head: true });

      if (countError) {
        console.warn('Could not verify database state:', countError.message);
        return { database_verification: 'failed', error: countError.message };
      }

      // Sample some records to check JSONB structure
      const { data: sampleRecords, error: sampleError } = await this.transformer.supabase
        .from('trust_metrics')
        .select('trust_code, rtt_data, ae_data, diagnostics_data')
        .limit(5);

      if (sampleError) {
        console.warn('Could not sample database records:', sampleError.message);
      }

      const assessment = {
        database_verification: 'success',
        total_records_in_db: recordCount?.length || 0,
        jsonb_structure_check: this.analyzeJSONBStructure(sampleRecords || []),
        data_completeness_analysis: this.analyzeDataCompleteness(sampleRecords || [])
      };

      return assessment;

    } catch (error) {
      return {
        database_verification: 'failed',
        error: error.message
      };
    }
  }

  analyzeJSONBStructure(sampleRecords) {
    const analysis = {
      sample_size: sampleRecords.length,
      rtt_data_populated: 0,
      ae_data_populated: 0,
      diagnostics_data_populated: 0,
      empty_jsonb_fields: 0
    };

    sampleRecords.forEach(record => {
      if (record.rtt_data && typeof record.rtt_data === 'object' && Object.keys(record.rtt_data).length > 0) {
        analysis.rtt_data_populated++;
      }
      if (record.ae_data && typeof record.ae_data === 'object' && Object.keys(record.ae_data).length > 0) {
        analysis.ae_data_populated++;
      }
      if (record.diagnostics_data && typeof record.diagnostics_data === 'object' && Object.keys(record.diagnostics_data).length > 0) {
        analysis.diagnostics_data_populated++;
      }

      // Check for "EMPTY" values that indicate failed transformation
      const jsonbFields = [record.rtt_data, record.ae_data, record.diagnostics_data];
      jsonbFields.forEach(field => {
        if (field === "EMPTY" || field === null) {
          analysis.empty_jsonb_fields++;
        }
      });
    });

    return analysis;
  }

  analyzeDataCompleteness(sampleRecords) {
    if (sampleRecords.length === 0) {
      return { analysis: 'No sample records available' };
    }

    let totalMetrics = 0;
    let populatedMetrics = 0;

    sampleRecords.forEach(record => {
      // Analyze RTT data completeness
      if (record.rtt_data?.trust_total) {
        Object.values(record.rtt_data.trust_total).forEach(value => {
          totalMetrics++;
          if (value !== null && value !== undefined) populatedMetrics++;
        });
      }

      // Analyze A&E data completeness
      if (record.ae_data) {
        Object.values(record.ae_data).forEach(value => {
          totalMetrics++;
          if (value !== null && value !== undefined) populatedMetrics++;
        });
      }
    });

    return {
      sample_size: sampleRecords.length,
      total_metrics_checked: totalMetrics,
      populated_metrics: populatedMetrics,
      completeness_percentage: totalMetrics > 0 ? Math.round(populatedMetrics / totalMetrics * 100) : 0
    };
  }

  generatePipelineRecommendations(transformationSummary, validationSummary) {
    const recommendations = [];

    // Transformation recommendations
    if (transformationSummary.success_rate < 90) {
      recommendations.push({
        priority: 'high',
        category: 'data_quality',
        message: 'Low transformation success rate - investigate CSV data quality issues'
      });
    }

    // Validation recommendations
    if (validationSummary.success_rate < 85) {
      recommendations.push({
        priority: 'high',
        category: 'validation',
        message: 'High validation failure rate - review business rules and data consistency'
      });
    }

    // Performance recommendations
    if (this.batches_processed > 50) {
      recommendations.push({
        priority: 'medium',
        category: 'performance',
        message: 'Consider increasing batch size for better performance with large datasets'
      });
    }

    // Data completeness recommendations
    if (validationSummary.average_warnings_per_record > 3) {
      recommendations.push({
        priority: 'medium',
        category: 'completeness',
        message: 'High warning rate indicates data completeness issues - investigate data collection processes'
      });
    }

    return recommendations;
  }

  analyzeErrors(transformationSummary, validationSummary) {
    const analysis = {
      transformation_errors: transformationSummary.errors || [],
      validation_errors: validationSummary.failed_records || [],
      common_error_patterns: this.identifyCommonErrorPatterns(transformationSummary, validationSummary),
      suggested_fixes: this.suggestErrorFixes(transformationSummary, validationSummary)
    };

    return analysis;
  }

  identifyCommonErrorPatterns(transformationSummary, validationSummary) {
    const patterns = {};

    // Analyze transformation errors
    if (transformationSummary.errors) {
      transformationSummary.errors.forEach(error => {
        if (error.errors) {
          error.errors.forEach(errorMsg => {
            const pattern = this.extractErrorPattern(errorMsg);
            patterns[pattern] = (patterns[pattern] || 0) + 1;
          });
        }
      });
    }

    return Object.entries(patterns)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([pattern, count]) => ({ pattern, count }));
  }

  extractErrorPattern(errorMessage) {
    if (errorMessage.includes('trust_code')) return 'trust_code_format';
    if (errorMessage.includes('period')) return 'date_format';
    if (errorMessage.includes('percentage')) return 'percentage_range';
    if (errorMessage.includes('differs')) return 'cross_validation';
    if (errorMessage.includes('missing')) return 'missing_data';
    return 'other';
  }

  suggestErrorFixes(transformationSummary, validationSummary) {
    const fixes = [];

    if (transformationSummary.failed_transforms > 0) {
      fixes.push('Review CSV data format and ensure trust codes are 3-character alphanumeric');
      fixes.push('Validate date formats are ISO YYYY-MM-DD format');
    }

    if (validationSummary.failed > 0) {
      fixes.push('Implement data cleaning processes for percentage and numeric value ranges');
      fixes.push('Add data quality checks at the source system level');
    }

    return fixes;
  }

  formatDuration(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }
}

module.exports = CSVToSupabasePipeline;

// CLI usage
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.length < 3) {
    console.log('Usage: node transform_csv_to_supabase.js <supabase_url> <supabase_key> <csv_file_path> [batch_size]');
    process.exit(1);
  }

  const [supabaseUrl, supabaseKey, csvFilePath, batchSize] = args;

  const pipeline = new CSVToSupabasePipeline(supabaseUrl, supabaseKey);

  pipeline.runPipeline(csvFilePath, {
    batchSize: batchSize ? parseInt(batchSize) : 100
  })
  .then(result => {
    if (result.success) {
      console.log('🎉 Pipeline completed successfully!');
      process.exit(0);
    } else {
      console.error('💥 Pipeline failed:', result.error);
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('💥 Unexpected error:', error);
    process.exit(1);
  });
}