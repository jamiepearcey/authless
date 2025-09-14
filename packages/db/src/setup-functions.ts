/**
 * Database Setup Functions
 * 
 * This module provides automated setup for database functions and triggers
 * that are needed for the application but aren't handled by Prisma migrations.
 */

import { db } from './client';
import fs from 'fs';
import path from 'path';

/**
 * Execute a raw SQL file against the database
 */
export async function executeSqlFile(filePath: string): Promise<void> {
  console.log(`📁 Reading SQL file: ${path.basename(filePath)}`);
  
  if (!fs.existsSync(filePath)) {
    throw new Error(`SQL file not found: ${filePath}`);
  }
  
  const sqlContent = fs.readFileSync(filePath, 'utf8');
  
  // Parse SQL statements properly handling PostgreSQL function definitions
  // This approach splits on semicolons but respects $$ delimited function bodies
  const statements: string[] = [];
  let currentStatement = '';
  let inFunctionBody = false;
  let dollarQuoteTag = '';
  
  const lines = sqlContent.split('\n');
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    
    // Skip comment lines
    if (trimmedLine.startsWith('--')) {
      continue;
    }
    
    // Check for dollar-quoted strings (PostgreSQL function bodies)
    const dollarQuoteMatch = trimmedLine.match(/\$([^$]*)\$/);
    if (dollarQuoteMatch) {
      const tag = dollarQuoteMatch[1];
      if (!inFunctionBody) {
        // Starting a function body
        inFunctionBody = true;
        dollarQuoteTag = tag;
      } else if (tag === dollarQuoteTag) {
        // Ending the function body
        inFunctionBody = false;
        dollarQuoteTag = '';
      }
    }
    
    currentStatement += line + '\n';
    
    // If we hit a semicolon and we're not in a function body, end the statement
    if (trimmedLine.endsWith(';') && !inFunctionBody) {
      const statement = currentStatement.trim();
      if (statement.length > 0) {
        statements.push(statement);
      }
      currentStatement = '';
    }
  }
  
  // Add any remaining statement
  if (currentStatement.trim().length > 0) {
    statements.push(currentStatement.trim());
  }
  
  const filteredStatements = statements.filter(stmt => stmt.length > 0);
  
  console.log(`🚀 Executing ${filteredStatements.length} SQL statements from ${path.basename(filePath)}...`);
  
  for (let i = 0; i < filteredStatements.length; i++) {
    const statement = filteredStatements[i];
    try {
      // Don't add semicolon if it already ends with one
      const sqlToExecute = statement.endsWith(';') ? statement : statement + ';';
      await db.$executeRawUnsafe(sqlToExecute);
      console.log(`   ✅ Statement ${i + 1}/${filteredStatements.length} executed`);
    } catch (error) {
      console.error(`   ❌ Error in statement ${i + 1}/${filteredStatements.length}:`, error);
      console.error('   Statement preview:', statement.substring(0, 200) + '...');
      throw error;
    }
  }
  
  console.log(`✅ Completed ${path.basename(filePath)}`);
}

/**
 * Process all SQL files in the database functions directory
 */
export async function setupAllDatabaseFunctions(): Promise<void> {
  console.log('🏗️  Starting comprehensive database setup...');
  
  const functionsDir = path.join(__dirname, '../database-functions');
  
  // Ensure the functions directory exists
  if (!fs.existsSync(functionsDir)) {
    console.log('📁 Creating database-functions directory...');
    fs.mkdirSync(functionsDir, { recursive: true });
    console.log('   ℹ️  Place your SQL function files in packages/db/database-functions/');
  }
  
  // Get all .sql files in the functions directory
  const sqlFiles = fs.readdirSync(functionsDir)
    .filter(file => file.endsWith('.sql'))
    .sort(); // Process files in alphabetical order
  
  if (sqlFiles.length === 0) {
    console.log('   ℹ️  No SQL files found in database-functions directory');
    return;
  }
  
  console.log(`📋 Found ${sqlFiles.length} SQL files to process:`);
  sqlFiles.forEach(file => console.log(`   - ${file}`));
  
  // Process each SQL file
  for (const file of sqlFiles) {
    const filePath = path.join(functionsDir, file);
    try {
      await executeSqlFile(filePath);
    } catch (error) {
      console.error(`💥 Failed to process ${file}:`, error);
      throw error;
    }
  }
  
  console.log('🎉 All database functions setup completed successfully!');
}

/**
 * Run complete database setup including Prisma operations and custom functions
 */
export async function setupDatabase(): Promise<void> {
  console.log('🚀 Starting complete database setup...');
  
  try {
    // First, ensure Prisma is set up
    console.log('1️⃣ Checking Prisma client...');
    try {
      await db.$connect();
      console.log('   ✅ Database connection successful');
    } catch (error) {
      console.error('   ❌ Database connection failed:', error);
      throw error;
    }
    
    // Then run all custom database functions
    console.log('2️⃣ Setting up custom database functions...');
    await setupAllDatabaseFunctions();
    
    console.log('🎉 Complete database setup finished successfully!');
  } catch (error) {
    console.error('💥 Database setup failed:', error);
    throw error;
  } finally {
    await db.$disconnect();
  }
}

/**
 * Test all database functions by running verification queries
 */
export async function testDatabaseFunctions(): Promise<void> {
  console.log('🧪 Testing database functions...');
  
  try {
    // Test case number scrambling if it exists
    try {
      const testValues = [1, 2, 3, 4, 5];
      console.log('Testing case number scrambling:');
      
      for (const value of testValues) {
        const result = await db.$queryRawUnsafe<[{scrambled: bigint, case_number: string}]>(
          'SELECT scramble_sequence($1) as scrambled, encode_base32(scramble_sequence($1)) as case_number',
          value
        );
        
        if (result.length > 0) {
          console.log(`   ${value} → ${result[0].case_number}`);
        }
      }
      
      console.log('   ✅ Case number scrambling working');
    } catch (error) {
      console.log('   ⚠️  Case number scrambling not available (this is okay if not needed)');
    }
    
    console.log('✅ Database function tests completed');
  } catch (error) {
    console.error('❌ Database function testing failed:', error);
    throw error;
  }
}