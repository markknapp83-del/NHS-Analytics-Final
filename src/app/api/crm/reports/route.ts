import { supabaseAuth } from '@/lib/supabase-auth';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const reportType = searchParams.get('type');

    if (!reportType) {
      return NextResponse.json(
        { data: null, error: 'Report type is required. Use ?type=trust-coverage, ?type=performance-alerts, or ?type=pipeline-analytics' },
        { status: 400 }
      );
    }

    let query;
    let viewName;

    switch (reportType) {
      case 'trust-coverage':
        viewName = 'vw_trust_coverage';
        query = supabaseAuth
          .from(viewName)
          .select('*')
          .order('trust_name');
        break;

      case 'performance-alerts':
        viewName = 'vw_trust_performance_alerts';
        query = supabaseAuth
          .from(viewName)
          .select('*')
          .order('trust_name');
        break;

      case 'pipeline-analytics':
        viewName = 'vw_pipeline_analytics';
        query = supabaseAuth
          .from(viewName)
          .select('*')
          .order('trust_name');
        break;

      default:
        return NextResponse.json(
          { data: null, error: `Invalid report type: ${reportType}. Valid types are: trust-coverage, performance-alerts, pipeline-analytics` },
          { status: 400 }
        );
    }

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json({ data, error: null });
  } catch (error: any) {
    return NextResponse.json({ data: null, error: error.message }, { status: 500 });
  }
}
