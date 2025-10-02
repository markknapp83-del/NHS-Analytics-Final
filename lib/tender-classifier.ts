// /lib/tender-classifier.ts
// Intelligent classification engine for Phase 1C

import { supabase } from '../src/lib/supabase-client';
import type { ParsedTender } from './contracts-finder-client';

interface Trust {
  trust_code: string;
  trust_name: string;
  icb_code: string;
  icb_name: string;
}

interface ICB {
  icb_code: string;
  icb_name: string;
}

export interface ClassificationResult {
  classification: 'insourcing_opportunity' | 'framework' | 'discard';
  reason: string;
  confidence: number; // 0-100
  matched_trust_code?: string;
  matched_trust_name?: string;
  matched_icb_code?: string;
  matched_icb_name?: string;
  matched_entity_type?: 'trust' | 'icb';
  is_framework?: boolean;
  framework_name?: string;
}

export class TenderClassifier {
  private trusts: Trust[] = [];
  private icbs: ICB[] = [];
  private trustNameVariants: Map<string, string[]> = new Map();
  private icbNameVariants: Map<string, string[]> = new Map();
  private initialized = false;

  /**
   * Initialize classifier with trust and ICB data from database
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    console.log('[TenderClassifier] Initializing...');

    // Load trusts using RPC function
    const { data: rpcData, error: rpcError } = await supabase.rpc('get_distinct_trusts') as {
      data: any[] | null,
      error: any
    };

    if (rpcError) {
      throw new Error(`Failed to load trusts: ${rpcError.message}`);
    }

    this.trusts = (rpcData || []).map((row: any) => ({
      trust_code: row.trust_code,
      trust_name: row.trust_name,
      icb_code: row.icb_code || '',
      icb_name: row.icb_name || ''
    }));

    console.log(`[TenderClassifier] Loaded ${this.trusts.length} trusts`);

    // Extract unique ICBs from trust data
    const icbMap = new Map<string, ICB>();
    this.trusts.forEach(trust => {
      if (trust.icb_code && trust.icb_name) {
        icbMap.set(trust.icb_code, {
          icb_code: trust.icb_code,
          icb_name: trust.icb_name
        });
      }
    });
    this.icbs = Array.from(icbMap.values());

    console.log(`[TenderClassifier] Loaded ${this.icbs.length} ICBs`);

    // Generate name variants for matching
    this.trusts.forEach(trust => {
      this.trustNameVariants.set(trust.trust_code, this.generateTrustNameVariants(trust));
    });

    this.icbs.forEach(icb => {
      this.icbNameVariants.set(icb.icb_code, this.generateICBNameVariants(icb));
    });

    this.initialized = true;
    console.log('[TenderClassifier] Initialization complete');
  }

  /**
   * Main classification method
   */
  async classify(tender: ParsedTender): Promise<ClassificationResult> {
    if (!this.initialized) {
      await this.initialize();
    }

    // STEP 1: Check if it's a framework
    const frameworkCheck = this.isFramework(tender);
    if (frameworkCheck.isFramework) {
      return {
        classification: 'framework',
        reason: `Framework identified: ${frameworkCheck.frameworkName}`,
        confidence: 95,
        is_framework: true,
        framework_name: frameworkCheck.frameworkName
      };
    }

    // STEP 2: Check if it's definitely non-healthcare
    const nonHealthcareCheck = this.isNonHealthcare(tender);
    if (nonHealthcareCheck.isNonHealthcare) {
      return {
        classification: 'discard',
        reason: nonHealthcareCheck.reason,
        confidence: nonHealthcareCheck.confidence
      };
    }

    // STEP 3: Check if it's healthcare staffing/insourcing related
    const insourcingCheck = this.isInsourcingRelated(tender);
    if (!insourcingCheck.isRelevant) {
      return {
        classification: 'discard',
        reason: insourcingCheck.reason,
        confidence: insourcingCheck.confidence
      };
    }

    // STEP 4: Try to match to Trust or ICB
    const trustMatch = this.matchToTrust(tender);
    const icbMatch = this.matchToICB(tender);

    if (!trustMatch.matched && !icbMatch.matched) {
      return {
        classification: 'discard',
        reason: 'Healthcare-related but no Trust or ICB match found',
        confidence: 80
      };
    }

    // STEP 5 (NEW): Verify it's actually an insourcing opportunity
    // (not equipment, vehicles, facilities, etc.)
    const insourcingOpportunityCheck = this.isActualInsourcingOpportunity(tender);
    if (!insourcingOpportunityCheck.isInsourcing) {
      return {
        classification: 'discard',
        reason: insourcingOpportunityCheck.reason,
        confidence: insourcingOpportunityCheck.confidence,
        // Store Trust/ICB match for review purposes
        matched_trust_code: trustMatch.matched ? trustMatch.trust_code : undefined,
        matched_trust_name: trustMatch.matched ? trustMatch.trust_name : undefined,
        matched_icb_code: icbMatch.matched ? icbMatch.icb_code : undefined,
        matched_icb_name: icbMatch.matched ? icbMatch.icb_name : undefined,
        matched_entity_type: trustMatch.matched ? 'trust' : (icbMatch.matched ? 'icb' : undefined)
      };
    }

    // All checks passed - this IS an insourcing opportunity
    if (trustMatch.matched) {
      return {
        classification: 'insourcing_opportunity',
        reason: `Insourcing opportunity matched to trust: ${trustMatch.trust_name}`,
        confidence: 95,
        matched_trust_code: trustMatch.trust_code,
        matched_trust_name: trustMatch.trust_name,
        matched_icb_code: trustMatch.icb_code,
        matched_entity_type: 'trust'
      };
    } else {
      return {
        classification: 'insourcing_opportunity',
        reason: `Insourcing opportunity matched to ICB: ${icbMatch.icb_name}`,
        confidence: 95,
        matched_icb_code: icbMatch.icb_code,
        matched_icb_name: icbMatch.icb_name,
        matched_entity_type: 'icb'
      };
    }
  }

  /**
   * Check if tender is a framework
   */
  private isFramework(tender: ParsedTender): { isFramework: boolean; frameworkName?: string } {
    const text = `${tender.title} ${tender.description}`.toLowerCase();

    // Framework keywords
    const frameworkKeywords = [
      'framework agreement',
      'dynamic purchasing system',
      'dps',
      'lot ',
      'lots ',
      'call-off',
      'call off',
      'standing offer',
      'panel of suppliers',
      'multi-supplier',
      'multi supplier'
    ];

    // Known framework names
    const knownFrameworks = [
      'nhs workforce alliance',
      'shared business services',
      'crown commercial service',
      'nhs supply chain',
      'workforce alliance',
      'staff bank framework',
      'locum framework',
      'agency framework',
      'procurement framework'
    ];

    // Check for framework keywords
    for (const keyword of frameworkKeywords) {
      if (text.includes(keyword)) {
        return { isFramework: true, frameworkName: `Framework (${keyword})` };
      }
    }

    // Check for known frameworks
    for (const framework of knownFrameworks) {
      if (text.includes(framework)) {
        return { isFramework: true, frameworkName: framework };
      }
    }

    return { isFramework: false };
  }

  /**
   * Check if tender is definitely non-healthcare
   */
  private isNonHealthcare(tender: ParsedTender): { isNonHealthcare: boolean; reason: string; confidence: number } {
    const text = `${tender.title} ${tender.description}`.toLowerCase();

    // DEFINITE non-healthcare indicators
    const definitiveExclusions = [
      // Buildings/Construction (not clinical)
      { keywords: ['refurbishment', 'renovation', 'building works'], context: ['village hall', 'community centre', 'school', 'office building'] },
      { keywords: ['construction', 'demolition', 'scaffolding'], context: ['residential', 'housing', 'office'] },

      // Energy/Utilities
      { keywords: ['electricity supply', 'gas supply', 'energy procurement', 'utility management'], context: [] },
      { keywords: ['solar panels', 'heating system', 'boiler replacement', 'hvac'], context: [] },

      // General maintenance (not medical equipment)
      { keywords: ['grounds maintenance', 'landscaping', 'grass cutting'], context: [] },
      { keywords: ['cleaning services'], context: ['office', 'administrative', 'non-clinical'] },

      // IT/Software (unless healthcare specific)
      { keywords: ['software license', 'it support', 'network infrastructure'], context: ['payroll', 'hr system', 'finance'] },

      // General supplies (not medical)
      { keywords: ['office furniture', 'stationery', 'catering supplies'], context: [] },
      { keywords: ['fleet management', 'vehicle hire', 'car parking'], context: [] },

      // Food services (not patient meals)
      { keywords: ['catering', 'food service'], context: ['staff', 'office', 'canteen'] }
    ];

    for (const exclusion of definitiveExclusions) {
      const hasKeyword = exclusion.keywords.some(kw => text.includes(kw));
      const hasContext = exclusion.context.length === 0 || exclusion.context.some(ctx => text.includes(ctx));

      if (hasKeyword && hasContext) {
        return {
          isNonHealthcare: true,
          reason: `Non-healthcare: ${exclusion.keywords[0]}`,
          confidence: 95
        };
      }
    }

    return { isNonHealthcare: false, reason: '', confidence: 0 };
  }

  /**
   * Check if tender is insourcing/staffing related
   */
  private isInsourcingRelated(tender: ParsedTender): { isRelevant: boolean; reason: string; confidence: number } {
    const text = `${tender.title} ${tender.description}`.toLowerCase();

    // HIGH RELEVANCE: Core insourcing keywords
    const coreInsourcingKeywords = [
      'staffing', 'staff bank', 'locum', 'agency staff',
      'medical staff', 'nursing staff', 'clinical staff',
      'doctors', 'nurses', 'consultants', 'physicians',
      'theatre staff', 'operating theatre',
      'anaesthetist', 'anaesthesia',
      'radiologist', 'radiographer',
      'pathologist', 'pathology services',
      'diagnostic services', 'imaging services',
      'outpatient services', 'clinic services',
      'surgical services', 'surgery services',
      'endoscopy', 'colonoscopy', 'cystoscopy',
      'ultrasound', 'mri', 'ct scan',
      'physiotherapy', 'occupational therapy',
      'pharmacy services', 'pharmaceutical',
      'ambulance', 'paramedic',
      'mental health', 'psychiatr',
      'maternity', 'midwife'
    ];

    // MEDIUM RELEVANCE: Healthcare service keywords
    const healthcareServiceKeywords = [
      'patient care', 'clinical services',
      'healthcare services', 'medical services',
      'treatment services', 'therapy services',
      'assessment services', 'screening services',
      'specialist services', 'consultant services',
      'primary care', 'secondary care',
      'acute care', 'emergency care',
      'elective care'
    ];

    // Check core insourcing keywords
    for (const keyword of coreInsourcingKeywords) {
      if (text.includes(keyword)) {
        return {
          isRelevant: true,
          reason: `Insourcing keyword: ${keyword}`,
          confidence: 95
        };
      }
    }

    // Check healthcare service keywords
    for (const keyword of healthcareServiceKeywords) {
      if (text.includes(keyword)) {
        return {
          isRelevant: true,
          reason: `Healthcare service: ${keyword}`,
          confidence: 80
        };
      }
    }

    // Check CPV codes if available (85000000 = Health services)
    if (tender.cpvCodes.some(code => code.startsWith('85'))) {
      return {
        isRelevant: true,
        reason: 'CPV code indicates health services',
        confidence: 70
      };
    }

    return {
      isRelevant: false,
      reason: 'No insourcing or healthcare service keywords found',
      confidence: 85
    };
  }

  /**
   * Match tender to NHS Trust
   */
  private matchToTrust(tender: ParsedTender): {
    matched: boolean;
    trust_code?: string;
    trust_name?: string;
    icb_code?: string;
    confidence: number
  } {
    const searchText = `${tender.buyer.name} ${tender.title} ${tender.description}`.toLowerCase();

    // Search for each trust
    for (const trust of this.trusts) {
      const variants = this.trustNameVariants.get(trust.trust_code) || [];

      for (const variant of variants) {
        if (searchText.includes(variant.toLowerCase())) {
          return {
            matched: true,
            trust_code: trust.trust_code,
            trust_name: trust.trust_name,
            icb_code: trust.icb_code,
            confidence: 95
          };
        }
      }
    }

    return { matched: false, confidence: 0 };
  }

  /**
   * Match tender to ICB
   */
  private matchToICB(tender: ParsedTender): {
    matched: boolean;
    icb_code?: string;
    icb_name?: string;
    confidence: number
  } {
    const searchText = `${tender.buyer.name} ${tender.title} ${tender.description}`.toLowerCase();

    // Search for each ICB
    for (const icb of this.icbs) {
      const variants = this.icbNameVariants.get(icb.icb_code) || [];

      for (const variant of variants) {
        if (searchText.includes(variant.toLowerCase())) {
          return {
            matched: true,
            icb_code: icb.icb_code,
            icb_name: icb.icb_name,
            confidence: 95
          };
        }
      }
    }

    return { matched: false, confidence: 0 };
  }

  /**
   * Generate name variants for trust matching
   */
  private generateTrustNameVariants(trust: Trust): string[] {
    const variants: string[] = [];
    const fullName = trust.trust_name;

    // Full name
    variants.push(fullName);

    // Remove NHS-specific suffixes
    const withoutSuffix = fullName
      .replace(/\s+(NHS\s+)?Foundation Trust$/i, '')
      .replace(/\s+NHS\s+Trust$/i, '')
      .replace(/\s+FT$/i, '')
      .trim();
    variants.push(withoutSuffix);

    // Remove "NHS" prefix
    const withoutNHS = fullName.replace(/^NHS\s+/i, '').trim();
    variants.push(withoutNHS);

    // Extract location names (first significant word/phrase)
    const locationMatch = fullName.match(/^(.+?)\s+(NHS|University|Hospitals?|Teaching)/i);
    if (locationMatch) {
      variants.push(locationMatch[1].trim());
    }

    return [...new Set(variants)]; // Deduplicate
  }

  /**
   * Generate ICB name variants
   */
  private generateICBNameVariants(icb: ICB): string[] {
    const variants: string[] = [];
    const fullName = icb.icb_name;

    // Full name
    variants.push(fullName);

    // Without NHS prefix
    const withoutNHS = fullName.replace(/^NHS\s+/i, '').trim();
    variants.push(withoutNHS);

    // Without ICB suffix
    const withoutICB = fullName
      .replace(/\s+ICB$/i, '')
      .replace(/\s+Integrated Care Board$/i, '')
      .trim();
    variants.push(withoutICB);

    // Without both
    const minimal = fullName
      .replace(/^NHS\s+/i, '')
      .replace(/\s+ICB$/i, '')
      .replace(/\s+Integrated Care Board$/i, '')
      .trim();
    variants.push(minimal);

    // Handle variations like "Cambridgeshire and Peterborough (ICB)"
    variants.push(`${minimal} (ICB)`);
    variants.push(`${minimal} [ICB]`);

    return [...new Set(variants)]; // Deduplicate
  }

  /**
   * STEP 5 (NEW): Check if healthcare service is actually an insourcing opportunity
   * This filters out equipment, supplies, and non-clinical services
   */
  private isActualInsourcingOpportunity(tender: ParsedTender): {
    isInsourcing: boolean;
    reason: string;
    confidence: number;
  } {
    const text = `${tender.title} ${tender.description}`.toLowerCase();

    // DEFINITE EXCLUSIONS - Healthcare but not insourcing

    // 1. Medical Equipment/Hardware Supply
    const equipmentKeywords = [
      'supply of ct', 'supply of mri', 'supply of x-ray',
      'scanner', 'imaging equipment', 'medical equipment supply',
      'purchase of equipment', 'procurement of equipment',
      'medical devices', 'diagnostic equipment supply',
      'ultrasound machine', 'endoscopy equipment supply',
      'ventilator', 'infusion pump', 'defibrillator',
      'patient monitors', 'surgical instruments supply',
      'ppe supply', 'protective equipment supply',
      'consumables', 'disposables supply',
      'medical supplies', 'pharmaceutical supplies'
    ];

    // 2. Vehicle/Fleet Services
    const vehicleKeywords = [
      'vehicle maintenance', 'fleet management', 'ambulance maintenance',
      'windscreen', 'tyres', 'mot testing', 'vehicle repair',
      'car servicing', 'vehicle hire', 'lease vehicles',
      'motor vehicle', 'transport maintenance'
    ];

    // 3. Facilities Management
    const facilitiesKeywords = [
      'building maintenance', 'grounds maintenance', 'landscaping',
      'cleaning services', 'catering services', 'portering',
      'security services', 'car parking', 'waste management',
      'laundry services', 'pest control', 'window cleaning',
      'reception services', 'switchboard', 'housekeeping',
      'estates management', 'facilities support'
    ];

    // 4. IT Hardware/Infrastructure (non-clinical)
    const itHardwareKeywords = [
      'supply of computers', 'supply of laptops', 'supply of tablets',
      'network infrastructure', 'server hardware', 'storage hardware',
      'it equipment supply', 'desktop computers', 'printers supply',
      'telephony hardware', 'cabling', 'wifi equipment',
      'it infrastructure', 'hardware procurement'
    ];

    // 5. Construction/Refurbishment
    const constructionKeywords = [
      'construction', 'refurbishment', 'building works', 'renovation',
      'demolition', 'scaffolding', 'electrical works', 'plumbing',
      'hvac', 'air conditioning', 'heating installation',
      'flooring', 'decoration', 'partitioning',
      'building project', 'capital works'
    ];

    // 6. General Supplies (commodity procurement)
    const suppliesKeywords = [
      'supply of office', 'stationery supply', 'furniture supply',
      'supply of uniforms', 'linen supply', 'supply of food',
      'supply of drinks', 'supply of cleaning', 'supply of chemicals',
      'office supplies', 'general supplies'
    ];

    // 7. Systems and Software
    const softwareKeywords = [
      'software', // Broad catch-all for any software provision
      ' system', // Clinical systems, IT systems, etc (space prefix to avoid "ecosystem")
      ' solution', // Digital solutions, IT solutions (space prefix to avoid words ending in "solution")
      'lims', 'laboratory information management'
    ];

    // 8. Fire Safety Services
    const fireSafetyKeywords = [
      'fire safety', 'fire alarm', 'fire detection', 'fire protection',
      'fire risk assessment', 'fire extinguisher', 'fire suppression',
      'fire door', 'fire equipment', 'fire maintenance', 'fire system',
      'fire prevention', 'fire compliance', 'fire issues', 'fire consultants',
      'pfi contract', 'pfi compliance', 'pfi consultants'
    ];

    // 9. Payroll and Financial Services
    const financialKeywords = [
      'payroll', 'payroll service', 'payroll system', 'payroll processing',
      'financial services', 'accounting services', 'audit services',
      'banking services', 'financial audit', 'financial management',
      'accountancy', 'tax services', 'bookkeeping', 'financial advice',
      'financial consultancy', 'treasury services', 'finance system'
    ];

    // 10. Yoga Therapy and Alternative Therapies
    const alternativeTherapyKeywords = [
      'yoga therapy', 'yoga service', 'yoga classes', 'yoga instruction',
      'complementary therapy', 'alternative therapy', 'holistic therapy',
      'meditation', 'mindfulness classes', 'wellness programme',
      'aromatherapy', 'reflexology', 'reiki', 'acupuncture training'
    ];

    // 11. Training and Education Services
    const trainingKeywords = [
      'training service', 'training programme', 'training delivery',
      'education service', 'educational programme', 'learning module',
      'training course', 'course delivery', 'learning programme',
      'professional development', 'staff development', 'teaching service',
      'training workshop', 'elearning', 'e-learning', 'training platform',
      'learning management system', 'training material', 'training content',
      'educational workshop', 'osce examination', 'exam service',
      'cadaveric training', 'msc in', 'degree course', 'university course',
      'postgraduate course', 'masters course', 'training academy',
      'university-based programme'
    ];

    // 12. Rental and Hardware Support Services
    const rentalSupportKeywords = [
      'rental', 'hire of equipment', 'lease of equipment', 'equipment hire',
      'equipment rental', 'renting', 'leasing service', 'temporary hire',
      'hardware support', 'maintenance and support', 'servicing and maintenance',
      'system maintenance', 'preventative maintenance', 'equipment servicing',
      'repair and maintenance', 'technical support service', 'support contract',
      'maintenance contract', 'service agreement', 'annual maintenance'
    ];

    // 13. Marketing and Communications
    const marketingKeywords = [
      'marketing', 'marketing service', 'marketing campaign', 'advertising',
      'public relations', 'pr service', 'communications service',
      'brand development', 'marketing consultancy', 'media buying',
      'creative services', 'design and marketing', 'marketing strategy',
      'promotional', 'publicity', 'media relations', 'social media marketing'
    ];

    // 14. Property and Estate Services
    const propertyKeywords = [
      'property agent', 'estate agent', 'property management', 'estate management',
      'property services', 'property consultancy', 'real estate', 'property advisor',
      'property valuation', 'lettings', 'property disposal', 'property acquisition',
      'property development', 'facilities estate'
    ];

    // 15. Machinery Parts and Printing
    const machineryPrintingKeywords = [
      'machinery parts', 'machinery components', 'spare parts',
      'replacement parts', 'mechanical parts', 'machinery spares',
      'oem parts', 'dental machinery parts',
      'printing service', 'print service', 'printing contract', 'print production',
      'commercial printing', 'digital printing', 'print management',
      'reprographics', 'copying service', 'print and design'
    ];

    // 16. Laboratory/Service Provider Appointments (not lab staffing)
    const providerAppointmentKeywords = [
      'laboratory provider', 'lab provider', 'pathology provider',
      'diagnostic provider', 'imaging provider', 'service provider contract',
      'provider appointment', 'appointment of provider', 'select a provider',
      'appoint a laboratory', 'appoint a lab'
    ];

    // Check each exclusion category
    const exclusions = [
      { keywords: equipmentKeywords, category: 'Medical equipment/hardware supply' },
      { keywords: vehicleKeywords, category: 'Vehicle/fleet services' },
      { keywords: facilitiesKeywords, category: 'Facilities management' },
      { keywords: itHardwareKeywords, category: 'IT hardware supply' },
      { keywords: constructionKeywords, category: 'Construction/refurbishment' },
      { keywords: suppliesKeywords, category: 'General supplies' },
      { keywords: softwareKeywords, category: 'Systems and software' },
      { keywords: fireSafetyKeywords, category: 'Fire safety services' },
      { keywords: financialKeywords, category: 'Payroll and financial services' },
      { keywords: alternativeTherapyKeywords, category: 'Alternative therapy services' },
      { keywords: trainingKeywords, category: 'Training and education services' },
      { keywords: rentalSupportKeywords, category: 'Rental and hardware support services' },
      { keywords: marketingKeywords, category: 'Marketing and communications' },
      { keywords: propertyKeywords, category: 'Property and estate services' },
      { keywords: machineryPrintingKeywords, category: 'Machinery parts and printing services' },
      { keywords: providerAppointmentKeywords, category: 'Service provider appointment (not staffing)' }
    ];

    for (const exclusion of exclusions) {
      for (const keyword of exclusion.keywords) {
        if (text.includes(keyword)) {
          return {
            isInsourcing: false,
            reason: `Healthcare service but not insourcing: ${exclusion.category}`,
            confidence: 90
          };
        }
      }
    }

    // POSITIVE INSOURCING INDICATORS - Must have at least one
    const insourcingKeywords = [
      // Clinical staffing
      'bank staff', 'locum', 'agency staff', 'medical staff',
      'nursing staff', 'clinical staff', 'doctors', 'nurses',
      'consultants', 'physicians', 'therapists', 'radiographers',
      'healthcare professionals', 'clinical workforce',

      // Clinical services delivery
      'insourcing', 'clinical services', 'treatment services',
      'diagnostic services', 'pathology services', 'radiology services',
      'imaging services', 'endoscopy services', 'surgical services',
      'outpatient services', 'therapy services', 'phlebotomy services',
      'patient services', 'medical services',

      // Patient-facing services
      'patient care', 'patient assessment', 'patient treatment',
      'screening services', 'clinic services', 'ward services',
      'clinical assessment', 'patient management',

      // Specific clinical procedures
      'performing', 'providing clinical', 'delivering clinical',
      'undertaking', 'carrying out procedures',
      'clinical delivery', 'service provision'
    ];

    // Must have at least one positive insourcing indicator
    const hasInsourcingIndicator = insourcingKeywords.some(kw => text.includes(kw));

    if (!hasInsourcingIndicator) {
      return {
        isInsourcing: false,
        reason: 'Healthcare service but lacks clinical staffing/service delivery indicators',
        confidence: 85
      };
    }

    // Passed all checks - this IS an insourcing opportunity
    return {
      isInsourcing: true,
      reason: 'Clinical staffing or service delivery opportunity',
      confidence: 95
    };
  }

  /**
   * Batch classify multiple tenders
   */
  async classifyBatch(tenders: ParsedTender[]): Promise<Map<string, ClassificationResult>> {
    if (!this.initialized) {
      await this.initialize();
    }

    const results = new Map<string, ClassificationResult>();

    for (const tender of tenders) {
      const classification = await this.classify(tender);
      results.set(tender.id, classification);
    }

    return results;
  }

  /**
   * Get classification statistics
   */
  getClassificationStats(classifications: Map<string, ClassificationResult>): {
    total: number;
    insourcing_opportunities: number;
    frameworks: number;
    discarded: number;
    trust_matches: number;
    icb_matches: number;
  } {
    let insourcing = 0;
    let frameworks = 0;
    let discarded = 0;
    let trustMatches = 0;
    let icbMatches = 0;

    classifications.forEach(classification => {
      switch (classification.classification) {
        case 'insourcing_opportunity':
          insourcing++;
          if (classification.matched_entity_type === 'trust') trustMatches++;
          if (classification.matched_entity_type === 'icb') icbMatches++;
          break;
        case 'framework':
          frameworks++;
          break;
        case 'discard':
          discarded++;
          break;
      }
    });

    return {
      total: classifications.size,
      insourcing_opportunities: insourcing,
      frameworks,
      discarded,
      trust_matches: trustMatches,
      icb_matches: icbMatches
    };
  }
}

// Singleton instance
let classifierInstance: TenderClassifier | null = null;

export async function getTenderClassifier(): Promise<TenderClassifier> {
  if (!classifierInstance) {
    classifierInstance = new TenderClassifier();
    await classifierInstance.initialize();
  }
  return classifierInstance;
}
