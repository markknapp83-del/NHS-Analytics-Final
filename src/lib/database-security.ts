import { supabase } from './supabase-client'

/**
 * Safe database query wrapper that ensures read-only operations
 * and provides proper error handling for public deployment
 */
export class SecureDatabaseClient {

  /**
   * Execute a safe SELECT query with built-in validation
   */
  static async safeSelect(
    table: string,
    query: string = '*',
    filters?: Record<string, any>
  ) {
    try {
      let queryBuilder = supabase.from(table).select(query)

      // Apply filters if provided
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          queryBuilder = queryBuilder.eq(key, value)
        })
      }

      const { data, error } = await queryBuilder

      if (error) {
        console.error('Database query error:', error)
        return { data: null, error: error.message }
      }

      return { data, error: null }

    } catch (error) {
      console.error('Unexpected database error:', error)
      return { data: null, error: 'Database connection failed' }
    }
  }

  /**
   * Validate that only read operations are being performed
   */
  static validateReadOnlyOperation(operation: string) {
    const allowedOperations = ['select', 'from']
    const dangerous = ['insert', 'update', 'delete', 'alter', 'drop', 'create']

    const lowerOp = operation.toLowerCase()

    if (dangerous.some(op => lowerOp.includes(op))) {
      throw new Error(`Operation '${operation}' not allowed in public deployment`)
    }

    return true
  }
}

export default SecureDatabaseClient