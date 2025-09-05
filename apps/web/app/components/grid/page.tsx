"use client";

import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@ui/base";
import {
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
  type VisibilityState,
} from "@tanstack/react-table";
import {
  Database,
  Table as TableIcon,
  Zap,
  RefreshCw,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { BreadcrumbNavigation } from "@/components/BreadcrumbNavigation";
import { DataGrid } from "@/components/DataGrid";
import { DuckDBDataProvider, type FinancialRecord } from "@/lib/DuckDBDataProvider";

// Simple demo data for direct table usage
const DEMO_DATA = [
  { id: 1, name: "Apple Inc.", symbol: "AAPL", price: 175.43, change: 2.15, sector: "Technology" },
  { id: 2, name: "Microsoft Corp.", symbol: "MSFT", price: 338.11, change: -1.25, sector: "Technology" },
  { id: 3, name: "Amazon.com Inc.", symbol: "AMZN", price: 127.74, change: 3.45, sector: "Consumer Discretionary" },
  { id: 4, name: "Alphabet Inc.", symbol: "GOOGL", price: 2847.50, change: 15.30, sector: "Communication Services" },
  { id: 5, name: "Tesla Inc.", symbol: "TSLA", price: 248.50, change: -5.20, sector: "Consumer Discretionary" },
  { id: 6, name: "Meta Platforms", symbol: "META", price: 504.20, change: 12.80, sector: "Communication Services" },
  { id: 7, name: "NVIDIA Corp.", symbol: "NVDA", price: 875.28, change: 45.60, sector: "Technology" },
  { id: 8, name: "Netflix Inc.", symbol: "NFLX", price: 445.05, change: -8.15, sector: "Communication Services" },
];

// Simple columns for demo data
const DEMO_COLUMNS: ColumnDef<typeof DEMO_DATA[0]>[] = [
  { accessorKey: "symbol", header: "Symbol", size: 80 },
  { accessorKey: "name", header: "Company", size: 200 },
  { accessorKey: "price", header: "Price", size: 100, cell: ({ getValue }) => `$${(getValue() as number).toFixed(2)}` },
  { accessorKey: "change", header: "Change", size: 100, cell: ({ getValue }) => {
    const value = getValue() as number;
    return <span style={{ color: value >= 0 ? '#10b981' : '#ef4444' }}>{value >= 0 ? '+' : ''}{value.toFixed(2)}</span>;
  }},
  { accessorKey: "sector", header: "Sector", size: 180 },
];

// Financial data columns for DuckDB demo
const FINANCIAL_COLUMNS: ColumnDef<FinancialRecord>[] = [
  { accessorKey: "symbol", header: "Symbol", size: 80 },
  { accessorKey: "company", header: "Company", size: 200 },
  { accessorKey: "current_price", header: "Price", size: 90 },
  { accessorKey: "price_change", header: "Change", size: 90 },
  { accessorKey: "price_change_percent", header: "Change %", size: 100 },
  { accessorKey: "volume", header: "Volume", size: 100 },
  { accessorKey: "market_cap", header: "Market Cap", size: 120 },
  { accessorKey: "pe_ratio", header: "P/E Ratio", size: 90 },
  { accessorKey: "sector", header: "Sector", size: 150 },
  { accessorKey: "analyst_rating", header: "Rating", size: 100 },
];

export default function DataGridDemoPage() {
  // Simple demo state
  const [demoSorting, setDemoSorting] = useState<SortingState>([]);
  const [demoFilters, setDemoFilters] = useState<ColumnFiltersState>([]);
  const [demoVisibility, setDemoVisibility] = useState<VisibilityState>({});

  // DuckDB demo state
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dataSize, setDataSize] = useState<number>(10000);
  const [duckSorting, setDuckSorting] = useState<SortingState>([]);
  const [duckFilters, setDuckFilters] = useState<ColumnFiltersState>([]);
  const [duckVisibility, setDuckVisibility] = useState<VisibilityState>({});

  const dataProviderRef = React.useRef<DuckDBDataProvider | null>(null);

  // Initialize DuckDB data provider
  const initializeDuckDB = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log(`Starting DuckDB initialization with ${dataSize} records...`);
      const provider = new DuckDBDataProvider();
      
      console.log('Initializing DuckDB connection...');
      await provider.initialize();
      
      console.log('Loading sample data...');
      await provider.loadData(dataSize);
      
      dataProviderRef.current = provider;
      setIsInitialized(true);
      console.log('✅ DuckDB initialized successfully with provider:', provider);
      console.log('✅ Provider ready status:', provider.isReady());
    } catch (err) {
      console.error('❌ Failed to initialize DuckDB:', err);
      console.error('Error details:', err);
      setError(err instanceof Error ? err.message : 'Initialization failed');
    } finally {
      setIsLoading(false);
    }
  };

  // DuckDB data request handler
  const handleDuckDBDataRequest = async (x0: number, y0: number, x1: number, y1: number) => {
    console.log(`🔍 DuckDB data request: [${x0},${y0}] to [${x1},${y1}]`);
    
    if (!dataProviderRef.current?.isReady()) {
      console.log('❌ DuckDB provider not ready');
      return { num_rows: 0, num_columns: 0, column_headers: [], data: [] };
    }

    try {
      // Always request all columns for DuckDB - regular-table will handle the viewport
      const allColumnKeys = FINANCIAL_COLUMNS.map(col => (col as any).accessorKey).filter(Boolean);
      
      // But return headers only for the requested column range
      const requestedColumnHeaders = FINANCIAL_COLUMNS.slice(x0, x1).map(
        col => typeof col.header === 'string' ? col.header : 'Column'
      );
      
      console.log(`📊 All columns available: ${allColumnKeys.length}, Headers for range [${x0}-${x1}]: ${requestedColumnHeaders.length}`);
      console.log(`🎯 Requested headers:`, requestedColumnHeaders);

      let orderBy = 'symbol';
      if (duckSorting.length > 0) {
        const sort = duckSorting[0];
        orderBy = `${sort.id} ${sort.desc ? 'DESC' : 'ASC'}`;
      }
      
      // Request more rows to ensure good performance
      const rowCount = Math.max(y1 - y0, 20); // At least 20 rows
      console.log(`🔄 Querying DuckDB: all columns (${allColumnKeys.length}), rows=[${y0}-${y0 + rowCount}], orderBy=${orderBy}`);

      const result = await dataProviderRef.current.queryData(
        allColumnKeys,
        y0,
        rowCount,
        orderBy,
        {}
      );
      
      console.log(`✅ DuckDB query completed:`, {
        totalRows: result.totalRows,
        dataRows: result.data.length,
        columns: result.columnHeaders.length,
        allHeaders: result.columnHeaders
      });

      // Extract only the requested column data for the viewport
      const viewportData: any[][] = [];
      for (let rowIdx = 0; rowIdx < result.data.length; rowIdx++) {
        const rowData = result.data[rowIdx];
        const viewportRow: any[] = [];
        
        // Extract only columns for the requested range [x0, x1)
        for (let colIdx = x0; colIdx < Math.min(x1, allColumnKeys.length); colIdx++) {
          viewportRow.push(rowData[colIdx] || '');
        }
        viewportData.push(viewportRow);
      }

      console.log(`🎯 Viewport data: ${viewportData.length} rows x ${requestedColumnHeaders.length} columns`);
      console.log(`📋 Sample viewport row:`, viewportData[0]);

      return {
        num_rows: result.totalRows,
        num_columns: FINANCIAL_COLUMNS.length,
        column_headers: requestedColumnHeaders,
        data: viewportData,
      };
    } catch (error) {
      console.error('❌ DuckDB data request failed:', error);
      console.error('Error details:', error);
      return { num_rows: 0, num_columns: 0, column_headers: [], data: [] };
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <BreadcrumbNavigation
        items={[
          { label: "Home", href: "/" },
          { label: "Components", href: "/components" },
          { label: "Data Grid", href: "/components/grid" },
        ]}
      />

      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              <span className="bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">
                DataGrid Demonstrations
              </span>
            </h1>
            <p className="text-gray-600">
              Compare direct table usage vs DuckDB-powered virtual scrolling
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>DataGrid Component Demos</CardTitle>
              <CardDescription>
                Two approaches: direct data and DuckDB-powered virtual scrolling
              </CardDescription>
            </CardHeader>
            
            <CardContent>
              <Tabs defaultValue="simple" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="simple" className="flex items-center gap-2">
                    <TableIcon className="h-4 w-4" />
                    Simple Table (Direct Data)
                  </TabsTrigger>
                  <TabsTrigger value="duckdb" className="flex items-center gap-2">
                    <Database className="h-4 w-4" />
                    DuckDB Table (Virtual Scrolling)
                  </TabsTrigger>
                </TabsList>

                {/* Simple Direct Data Demo */}
                <TabsContent value="simple" className="space-y-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h3 className="font-semibold text-blue-900 mb-2">Direct Data Demo</h3>
                    <p className="text-sm text-blue-800">
                      This shows the DataGrid component working with in-memory data passed directly as props.
                      Perfect for smaller datasets (under 1,000 rows).
                    </p>
                  </div>

                  <DataGrid
                    data={DEMO_DATA}
                    columns={DEMO_COLUMNS}
                    height={400}
                    sorting={demoSorting}
                    onSortingChange={setDemoSorting}
                    columnFilters={demoFilters}
                    onColumnFiltersChange={setDemoFilters}
                    columnVisibility={demoVisibility}
                    onColumnVisibilityChange={setDemoVisibility}
                  />

                  <div className="text-xs text-gray-500">
                    ✅ Shows {DEMO_DATA.length} records using direct data props. 
                    Click headers to sort, scroll to see virtual scrolling in action.
                  </div>
                </TabsContent>

                {/* DuckDB Virtual Scrolling Demo */}
                <TabsContent value="duckdb" className="space-y-4">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h3 className="font-semibold text-green-900 mb-2">DuckDB Virtual Scrolling Demo</h3>
                    <p className="text-sm text-green-800">
                      This shows the DataGrid component powered by DuckDB WASM for handling large datasets
                      with SQL queries and virtual scrolling. Perfect for 10,000+ rows.
                    </p>
                  </div>

                  {/* Controls */}
                  <div className="flex items-center gap-4 p-4 bg-gray-100 rounded-lg">
                    <div className="flex items-center gap-2">
                      <label className="text-sm font-medium text-gray-700">Dataset Size:</label>
                      <select 
                        value={dataSize} 
                        onChange={(e) => setDataSize(Number(e.target.value))}
                        className="px-3 py-1 text-sm border rounded"
                        disabled={isInitialized}
                      >
                        <option value={1000}>1,000 records</option>
                        <option value={10000}>10,000 records</option>
                        <option value={50000}>50,000 records</option>
                        <option value={100000}>100,000 records</option>
                      </select>
                    </div>

                    <Button
                      onClick={initializeDuckDB}
                      disabled={isLoading}
                      variant={isInitialized ? "default" : "outline"}
                      className={isInitialized ? "bg-green-600 hover:bg-green-700 text-white" : ""}
                    >
                      {isLoading ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Initializing...
                        </>
                      ) : isInitialized ? (
                        <>
                          <CheckCircle className="h-4 w-4 mr-2" />
                          DuckDB Ready ({dataSize.toLocaleString()} records)
                        </>
                      ) : (
                        <>
                          <Zap className="h-4 w-4 mr-2" />
                          Initialize DuckDB
                        </>
                      )}
                    </Button>
                  </div>

                  {/* DuckDB Table or Error/Loading State */}
                  {error ? (
                    <div className="h-[400px] flex items-center justify-center bg-red-50 border border-red-200 rounded-lg">
                      <div className="text-center max-w-md">
                        <AlertCircle className="h-8 w-8 text-red-600 mx-auto mb-4" />
                        <p className="text-red-800 font-medium mb-2">DuckDB Error</p>
                        <p className="text-sm text-red-700 mb-4">{error}</p>
                        <Button variant="outline" size="sm" onClick={() => setError(null)}>
                          Dismiss
                        </Button>
                      </div>
                    </div>
                  ) : isInitialized ? (
                    <DataGrid
                      data={[]} // DuckDB handles data
                      columns={FINANCIAL_COLUMNS}
                      height={400}
                      sorting={duckSorting}
                      onSortingChange={setDuckSorting}
                      columnFilters={duckFilters}
                      onColumnFiltersChange={setDuckFilters}
                      columnVisibility={duckVisibility}
                      onColumnVisibilityChange={setDuckVisibility}
                      onDataRequest={handleDuckDBDataRequest}
                    />
                  ) : (
                    <div className="h-[400px] flex items-center justify-center bg-gradient-to-br from-gray-50 to-indigo-50 border rounded-lg">
                      <div className="text-center max-w-md">
                        <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-6">
                          <Database className="h-8 w-8 text-indigo-600" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">DuckDB Demo</h3>
                        <p className="text-gray-600 mb-6">
                          Click "Initialize DuckDB" to load {dataSize.toLocaleString()} financial records 
                          and see virtual scrolling in action
                        </p>
                        <Button onClick={initializeDuckDB} disabled={isLoading}>
                          <Zap className="h-5 w-5 mr-2" /> 
                          Initialize DuckDB Demo
                        </Button>
                      </div>
                    </div>
                  )}

                  <div className="text-xs text-gray-500">
                    {isInitialized 
                      ? `✅ Showing virtual scrolling through ${dataSize.toLocaleString()} records via DuckDB SQL queries.`
                      : "Click Initialize to see DuckDB-powered virtual scrolling with large datasets."
                    }
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}