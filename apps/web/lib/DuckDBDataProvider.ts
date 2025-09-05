import * as duckdb from "@duckdb/duckdb-wasm";

export interface FinancialRecord {
  id: string;
  company: string;
  symbol: string;
  sector: string;
  industry: string;
  current_price: number;
  price_change: number;
  price_change_percent: number;
  volume: number;
  avg_volume: number;
  market_cap: number;
  pe_ratio: number;
  pb_ratio: number;
  roe: number;
  roa: number;
  beta: number;
  dividend_yield: number;
  week_52_high: number;
  week_52_low: number;
  analyst_rating: string;
  target_price: number;
  revenue: number;
  profit: number;
  cash_flow: number;
  debt_to_equity: number;
  book_value: number;
  employees: number;
  founded_year: number;
  country: string;
  city: string;
  ceo: string;
  website: string;
  phone: string;
  email: string;
  status: string;
  risk_level: string;
  growth_rate: number;
  last_updated: string;
  tags: string[];
  description: string;
}

export class DuckDBDataProvider {
  private db: duckdb.AsyncDuckDB | null = null;
  private conn: duckdb.AsyncDuckDBConnection | null = null;
  private isInitialized = false;
  private data: FinancialRecord[] = [];

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Initialize DuckDB
      const JSDELIVR_BUNDLES = duckdb.getJsDelivrBundles();
      const bundle = await duckdb.selectBundle(JSDELIVR_BUNDLES);
      
      const worker_url = URL.createObjectURL(
        new Blob([`importScripts("${bundle.mainWorker}");`], { type: 'text/javascript' })
      );
      
      const logger = new duckdb.ConsoleLogger(duckdb.LogLevel.WARNING);
      const worker = new Worker(worker_url);
      this.db = new duckdb.AsyncDuckDB(logger, worker);
      await this.db.instantiate(bundle.mainModule, bundle.pthreadWorker);
      this.conn = await this.db.connect();

      this.isInitialized = true;
      console.log('DuckDB initialized successfully');
    } catch (error) {
      console.error('Failed to initialize DuckDB:', error);
      throw error;
    }
  }

  async loadData(recordCount: number = 10000): Promise<void> {
    if (!this.conn) throw new Error('DuckDB not initialized');

    // Generate sample financial data
    this.data = this.generateFinancialData(recordCount);

    // Create table and insert data
    await this.setupDuckDBTable();
  }

  private generateFinancialData(count: number): FinancialRecord[] {
    const companies = [
      "Apple Inc.", "Microsoft Corporation", "Amazon.com Inc.", "Alphabet Inc.", "Tesla Inc.",
      "Meta Platforms Inc.", "NVIDIA Corporation", "Netflix Inc.", "Adobe Inc.", "Salesforce Inc.",
      "Oracle Corporation", "Intel Corporation", "Cisco Systems Inc.", "IBM Corporation", "AMD Inc.",
      "PayPal Holdings Inc.", "Uber Technologies Inc.", "Twitter Inc.", "Spotify Technology SA", "Zoom Video Communications"
    ];
    
    const symbols = ["AAPL", "MSFT", "AMZN", "GOOGL", "TSLA", "META", "NVDA", "NFLX", "ADBE", "CRM", "ORCL", "INTC", "CSCO", "IBM", "AMD", "PYPL", "UBER", "TWTR", "SPOT", "ZM"];
    const sectors = ["Technology", "Healthcare", "Financial Services", "Consumer Discretionary", "Industrials", "Energy", "Materials"];
    const industries = ["Software", "Hardware", "Semiconductors", "Biotechnology", "Banking", "Insurance", "Retail", "E-commerce"];
    const countries = ["United States", "Germany", "Japan", "United Kingdom", "Canada", "France", "South Korea", "Netherlands"];
    const cities = ["Cupertino", "Redmond", "Seattle", "Mountain View", "Austin", "San Francisco", "New York", "Boston", "London", "Toronto"];
    const statuses = ["active", "pending", "inactive"];
    const riskLevels = ["low", "medium", "high"];
    const ratings = ["Strong Buy", "Buy", "Hold", "Sell", "Strong Sell"];

    return Array.from({ length: count }, (_, i) => {
      const companyIndex = i % companies.length;
      const company = companies[companyIndex];
      const symbol = symbols[companyIndex];
      const basePrice = 50 + Math.random() * 500;
      const priceChange = (Math.random() - 0.5) * 10;
      const volume = Math.floor(Math.random() * 100000000) + 1000000;

      return {
        id: `fin_${i + 1}`,
        company,
        symbol: symbol + (i > symbols.length - 1 ? `_${Math.floor(i / symbols.length)}` : ''),
        sector: sectors[Math.floor(Math.random() * sectors.length)],
        industry: industries[Math.floor(Math.random() * industries.length)],
        current_price: Math.round(basePrice * 100) / 100,
        price_change: Math.round(priceChange * 100) / 100,
        price_change_percent: Math.round((priceChange / basePrice) * 10000) / 100,
        volume,
        avg_volume: Math.floor(volume * (0.8 + Math.random() * 0.4)),
        market_cap: Math.floor((basePrice * Math.random() * 1000000000) + 1000000000),
        pe_ratio: Math.round((15 + Math.random() * 20) * 100) / 100,
        pb_ratio: Math.round((1 + Math.random() * 5) * 100) / 100,
        roe: Math.round((5 + Math.random() * 20) * 100) / 100,
        roa: Math.round((3 + Math.random() * 15) * 100) / 100,
        beta: Math.round((0.5 + Math.random() * 1.5) * 100) / 100,
        dividend_yield: Math.round(Math.random() * 5 * 100) / 100,
        week_52_high: Math.round(basePrice * (1.1 + Math.random() * 0.3) * 100) / 100,
        week_52_low: Math.round(basePrice * (0.7 - Math.random() * 0.2) * 100) / 100,
        analyst_rating: ratings[Math.floor(Math.random() * ratings.length)],
        target_price: Math.round(basePrice * (0.9 + Math.random() * 0.4) * 100) / 100,
        revenue: Math.floor(Math.random() * 500000000000) + 1000000000,
        profit: Math.floor(Math.random() * 100000000000) + 100000000,
        cash_flow: Math.floor(Math.random() * 150000000000) + 500000000,
        debt_to_equity: Math.round((Math.random() * 2) * 100) / 100,
        book_value: Math.round((basePrice * (0.8 + Math.random() * 0.6)) * 100) / 100,
        employees: Math.floor(Math.random() * 500000) + 1000,
        founded_year: 1980 + Math.floor(Math.random() * 40),
        country: countries[Math.floor(Math.random() * countries.length)],
        city: cities[Math.floor(Math.random() * cities.length)],
        ceo: `CEO ${i + 1}`,
        website: `https://www.${company.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`,
        phone: `+1-${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 9000) + 1000}`,
        email: `contact@${company.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`,
        status: statuses[Math.floor(Math.random() * statuses.length)],
        risk_level: riskLevels[Math.floor(Math.random() * riskLevels.length)],
        growth_rate: Math.round((Math.random() * 30 - 5) * 100) / 100,
        last_updated: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
        tags: [`tag${Math.floor(Math.random() * 10)}`, `category${Math.floor(Math.random() * 5)}`],
        description: `${company} is a leading company in the ${industries[Math.floor(Math.random() * industries.length)]} industry.`,
      };
    });
  }

  private async setupDuckDBTable(): Promise<void> {
    if (!this.conn) throw new Error('DuckDB not initialized');

    // Create table
    await this.conn.query(`
      CREATE OR REPLACE TABLE financial_data (
        id VARCHAR,
        company VARCHAR,
        symbol VARCHAR,
        sector VARCHAR,
        industry VARCHAR,
        current_price DOUBLE,
        price_change DOUBLE,
        price_change_percent DOUBLE,
        volume INTEGER,
        avg_volume INTEGER,
        market_cap BIGINT,
        pe_ratio DOUBLE,
        pb_ratio DOUBLE,
        roe DOUBLE,
        roa DOUBLE,
        beta DOUBLE,
        dividend_yield DOUBLE,
        week_52_high DOUBLE,
        week_52_low DOUBLE,
        analyst_rating VARCHAR,
        target_price DOUBLE,
        revenue BIGINT,
        profit BIGINT,
        cash_flow BIGINT,
        debt_to_equity DOUBLE,
        book_value DOUBLE,
        employees INTEGER,
        founded_year INTEGER,
        country VARCHAR,
        city VARCHAR,
        ceo VARCHAR,
        website VARCHAR,
        phone VARCHAR,
        email VARCHAR,
        status VARCHAR,
        risk_level VARCHAR,
        growth_rate DOUBLE,
        last_updated VARCHAR,
        tags VARCHAR[],
        description VARCHAR
      )
    `);

    // Insert data in batches
    const batchSize = 1000;
    for (let i = 0; i < this.data.length; i += batchSize) {
      const batch = this.data.slice(i, i + batchSize);
      const values = batch.map(record => 
        `('${record.id}', '${record.company.replace(/'/g, "''")}', '${record.symbol}', '${record.sector}', '${record.industry}', ${record.current_price}, ${record.price_change}, ${record.price_change_percent}, ${record.volume}, ${record.avg_volume}, ${record.market_cap}, ${record.pe_ratio}, ${record.pb_ratio}, ${record.roe}, ${record.roa}, ${record.beta}, ${record.dividend_yield}, ${record.week_52_high}, ${record.week_52_low}, '${record.analyst_rating}', ${record.target_price}, ${record.revenue}, ${record.profit}, ${record.cash_flow}, ${record.debt_to_equity}, ${record.book_value}, ${record.employees}, ${record.founded_year}, '${record.country}', '${record.city}', '${record.ceo.replace(/'/g, "''")}', '${record.website}', '${record.phone}', '${record.email}', '${record.status}', '${record.risk_level}', ${record.growth_rate}, '${record.last_updated}', ARRAY[${record.tags.map(tag => `'${tag}'`).join(', ')}], '${record.description.replace(/'/g, "''")}')`
      ).join(', ');
      
      if (values) {
        await this.conn.query(`INSERT INTO financial_data VALUES ${values}`);
      }
    }

    console.log(`Inserted ${this.data.length} records into DuckDB`);
  }

  async queryData(
    columns: string[],
    offset: number = 0,
    limit: number = 100,
    orderBy: string = 'symbol',
    filters: Record<string, any> = {}
  ): Promise<{
    data: any[][];
    totalRows: number;
    columnHeaders: string[];
  }> {
    if (!this.conn) throw new Error('DuckDB not initialized');

    try {
      // Build WHERE clause
      let whereClause = '';
      if (Object.keys(filters).length > 0) {
        const conditions = Object.entries(filters)
          .filter(([_, value]) => value && value !== 'all')
          .map(([key, value]) => `${key} ILIKE '%${value}%'`);
        
        if (conditions.length > 0) {
          whereClause = 'WHERE ' + conditions.join(' AND ');
        }
      }

      // Get total count
      const countResult = await this.conn.query(`
        SELECT COUNT(*) as total 
        FROM financial_data 
        ${whereClause}
      `);
      const totalRows = Number(countResult.toArray()[0]?.total || 0);

      // Get data
      const selectColumns = columns.join(', ');
      const result = await this.conn.query(`
        SELECT ${selectColumns}
        FROM financial_data 
        ${whereClause}
        ORDER BY ${orderBy}
        LIMIT ${limit} OFFSET ${offset}
      `);

      // Convert to row-major format for regular-table
      const resultArray = result.toArray();
      const data: any[][] = [];
      
      // Process each row
      for (const row of resultArray) {
        const rowData: any[] = [];
        
        for (const columnName of columns) {
          let value = row[columnName];
          
          // Format values based on column type
          if (columnName === 'current_price' || columnName === 'target_price' || columnName === 'week_52_high' || columnName === 'week_52_low') {
            value = `$${Number(value).toFixed(2)}`;
          } else if (columnName === 'price_change') {
            const num = Number(value);
            value = `${num >= 0 ? '+' : ''}${num.toFixed(2)}`;
          } else if (columnName === 'price_change_percent') {
            const num = Number(value);
            value = `${num >= 0 ? '+' : ''}${num.toFixed(2)}%`;
          } else if (columnName === 'volume' || columnName === 'avg_volume') {
            value = Number(value).toLocaleString();
          } else if (columnName === 'market_cap' || columnName === 'revenue' || columnName === 'profit' || columnName === 'cash_flow') {
            const num = Number(value);
            if (num >= 1e12) value = `$${(num / 1e12).toFixed(1)}T`;
            else if (num >= 1e9) value = `$${(num / 1e9).toFixed(1)}B`;
            else if (num >= 1e6) value = `$${(num / 1e6).toFixed(1)}M`;
            else if (num >= 1e3) value = `$${(num / 1e3).toFixed(1)}K`;
            else value = `$${num.toFixed(0)}`;
          } else if (['pe_ratio', 'pb_ratio', 'roe', 'roa', 'beta', 'dividend_yield', 'debt_to_equity', 'growth_rate', 'book_value'].includes(columnName)) {
            value = Number(value).toFixed(2);
          }
          
          rowData.push(String(value || ''));
        }
        data.push(rowData);
      }
      
      console.log(`DuckDB queryData returning ${data.length} rows x ${columns.length} columns`);
      console.log(`Sample row:`, data[0]);
      console.log(`Column headers:`, columns);

      return {
        data,
        totalRows,
        columnHeaders: columns,
      };
    } catch (error) {
      console.error('Query failed:', error);
      return {
        data: [],
        totalRows: 0,
        columnHeaders: columns,
      };
    }
  }

  getData(): FinancialRecord[] {
    return this.data;
  }

  isReady(): boolean {
    return this.isInitialized && this.conn !== null;
  }
}