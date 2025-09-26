// Force dynamic rendering to prevent SSG issues with Supabase env vars
export const dynamic = 'force-dynamic';

export default function TestPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">Test Page</h1>
      <p>This is a simple test page to verify routing works.</p>
    </div>
  );
}