"use client";

import React, { useRef, useEffect, useCallback, useState } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
  type VisibilityState,
  type OnChangeFn,
} from "@tanstack/react-table";

interface DataGridProps<T = any> {
  data: T[];
  columns: ColumnDef<T>[];
  height?: number;
  sorting?: SortingState;
  onSortingChange?: OnChangeFn<SortingState>;
  columnFilters?: ColumnFiltersState;
  onColumnFiltersChange?: OnChangeFn<ColumnFiltersState>;
  columnVisibility?: VisibilityState;
  onColumnVisibilityChange?: OnChangeFn<VisibilityState>;
  onDataRequest?: (x0: number, y0: number, x1: number, y1: number) => Promise<{
    num_rows: number;
    num_columns: number;
    row_headers?: string[][];
    column_headers?: string[][];
    data: any[][];
  }>;
}

export function DataGrid<T = any>({
  data = [],
  columns,
  height = 600,
  sorting = [],
  onSortingChange,
  columnFilters = [],
  onColumnFiltersChange,
  columnVisibility = {},
  onColumnVisibilityChange,
  onDataRequest,
}: DataGridProps<T>) {
  const tableRef = useRef<any>(null);
  const [isTableReady, setIsTableReady] = useState(false);
  const [cachedData, setCachedData] = useState<{ [key: string]: string }>({});
  const [totalRows, setTotalRows] = useState(0);

  const tanstackTable = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
    },
    onSortingChange,
    onColumnFiltersChange,
    onColumnVisibilityChange,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    enableColumnResizing: false,
  });

  // Initialize regular-table
  const initializeTable = useCallback(async () => {
    try {
      console.log("Initializing regular-table...");
      
      // Import regular-table with error handling
      try {
        await import("regular-table");
        console.log("✅ Regular-table module imported successfully");
      } catch (importError) {
        console.error("❌ Failed to import regular-table:", importError);
        throw importError;
      }
      
      // Wait for custom element definition
      try {
        await customElements.whenDefined("regular-table");
        console.log("✅ Regular-table custom element defined");
      } catch (defineError) {
        console.error("❌ Failed to define regular-table custom element:", defineError);
        throw defineError;
      }
      
      // Wait a bit more to ensure the element is fully ready
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Try to access the regular-table constructor directly
      const RegularTable = customElements.get('regular-table');
      console.log("Regular-table constructor:", RegularTable);
      
      const rt = tableRef.current;
      if (!rt) {
        console.error("❌ No table ref found");
        throw new Error("Table ref is null");
      }
      
      console.log("✅ Regular table element found:", rt);
      console.log("📊 Element type:", rt.constructor.name);
      console.log("🔌 Element connected:", rt.isConnected);
      console.log("⚡ Element ready state:", rt.readyState);
      
      // Check properties safely
      try {
        const methods = Object.getOwnPropertyNames(rt);
        console.log("📋 Available methods:", methods.filter(name => typeof (rt as any)[name] === 'function'));
        console.log("🎯 setDataListener method:", typeof rt.setDataListener);
        console.log("🎯 setScrollDimensions method:", typeof rt.setScrollDimensions);
        console.log("🎯 draw method:", typeof rt.draw);
      } catch (propsError) {
        console.error("❌ Error checking element properties:", propsError);
      }
      
      // Wait for element to be fully connected and ready
      if (!rt.isConnected) {
        console.log("Element not connected, waiting...");
        await new Promise(resolve => {
          const checkConnection = () => {
            if (rt.isConnected) {
              resolve(undefined);
            } else {
              setTimeout(checkConnection, 50);
            }
          };
          checkConnection();
        });
      }

      // Set up data listener using regular-table's API - simplified to avoid readonly issues
      const dataListener = async (x0: number, y0: number, x1: number, y1: number) => {
        console.log(`📥 Data request: x0=${x0}, y0=${y0}, x1=${x1}, y1=${y1}`);
        
        // Handle dimension queries and invalid ranges
        if (x1 <= x0 || y1 <= y0) {
          let numRows = onDataRequest ? 10000 : tanstackTable.getRowModel().rows.length;
          let numColumns = columns.length;
          
          console.log(`Dimension/invalid query - returning ${numRows} rows, ${numColumns} columns`);
          
          return {
            num_rows: numRows,
            num_columns: numColumns,
            data: []
          };
        }
        
        if (onDataRequest) {
          try {
            const result = await onDataRequest(x0, y0, x1, y1);
            console.log(`DuckDB response:`, result);
            setTotalRows(result.num_rows);
            return result;
          } catch (error) {
            console.error("DuckDB data request failed:", error);
            return {
              num_rows: 0,
              num_columns: columns.length,
              data: []
            };
          }
        } else {
          // Use local data - following official regular-table format
          const rows = tanstackTable.getRowModel().rows;
          const numRows = rows.length;
          const numColumns = columns.length;
          
          console.log(`Local data: ${numRows} rows, ${numColumns} columns`);
          
          // Official format: column_headers is 2D array, one array per column
          const columnHeaders = [];
          for (let x = x0; x < Math.min(x1, numColumns); x++) {
            const column = columns[x];
            if (column && typeof column.header === 'string') {
              columnHeaders.push([column.header]); // Wrap in array for hierarchy
            } else {
              columnHeaders.push(['Column']);
            }
          }
          
          // Official format: row_headers is 2D array, one array per row
          const rowHeaders = [];
          for (let y = y0; y < Math.min(y1, numRows); y++) {
            rowHeaders.push([`Row ${y + 1}`]); // Wrap in array for hierarchy
          }
          
          // Official format: data is 2D array where each sub-array is a COLUMN
          const data = [];
          for (let x = x0; x < Math.min(x1, numColumns); x++) {
            const column = columns[x];
            const columnData = [];
            
            for (let y = y0; y < Math.min(y1, numRows); y++) {
              const row = rows[y];
              if (row && column) {
                const accessorKey = (column as any).accessorKey;
                if (accessorKey && row.original) {
                  const value = (row.original as any)[accessorKey];
                  columnData.push(String(value || ''));
                } else {
                  columnData.push('');
                }
              } else {
                columnData.push('');
              }
            }
            data.push(columnData);
          }
          
          return {
            num_rows: numRows,
            num_columns: numColumns,
            row_headers: rowHeaders,
            column_headers: columnHeaders,
            data: data
          };
        }
      };

      console.log("Setting data listener...");
      
      // Use the correct setDataListener API as per official documentation
      try {
        if (typeof rt.setDataListener === 'function') {
          console.log("Using setDataListener API");
          rt.setDataListener(dataListener);
          console.log("Data listener set successfully");
        } else {
          throw new Error("setDataListener method not available on regular-table element");
        }
      } catch (error) {
        console.error("Error setting data listener:", error);
        console.error("Error details:", error instanceof Error ? error.message : String(error));
        throw error;
      }
      
      // Set scroll dimensions for virtual scrolling
      if (typeof rt.setScrollDimensions === 'function') {
        console.log("Setting scroll dimensions...");
        rt.setScrollDimensions({
          width: 800,
          height: height
        });
      }
      
      // Try to draw the table
      if (typeof rt.draw === 'function') {
        console.log("Drawing table...");
        rt.draw();
        
        // Add event listeners to see what's happening
        rt.addEventListener('regular-table-draw', () => {
          console.log('🎨 regular-table draw event fired');
        });
        
        rt.addEventListener('scroll', () => {
          console.log('📜 regular-table scroll event');
        });
        
      } else {
        console.log("draw method not available, trying alternative...");
        // Try to trigger a redraw
        rt.dispatchEvent(new Event('regular-table-draw'));
      }

      // Add basic styling
      if (!document.getElementById("datagrid-styles")) {
        const style = document.createElement("style");
        style.id = "datagrid-styles";
        style.textContent = `
          regular-table {
            font-family: ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace;
            font-size: 12px;
            background-color: white;
            color: #1f2937;
            border: 1px solid #e5e7eb;
            border-radius: 6px;
            overflow: auto;
            position: relative;
            display: block;
            width: 100%;
            height: 100%;
          }
          regular-table::-webkit-scrollbar { width: 12px; height: 12px; }
          regular-table::-webkit-scrollbar-track { background: #334155; border-radius: 6px; }
          regular-table::-webkit-scrollbar-thumb { background: #64748b; border-radius: 6px; border: 2px solid #334155; }
          regular-table::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
          regular-table::-webkit-scrollbar-corner { background: #334155; }
          regular-table th {
            position: relative;
            overflow: hidden;
            min-width: 80px;
            max-width: 300px;
            white-space: nowrap;
            text-overflow: ellipsis;
            background-color: #f9fafb;
            color: #374151;
            border-bottom: 1px solid #e5e7eb;
            font-weight: 600;
            padding: 8px 12px;
          }
          regular-table td {
            border-right: 1px solid #e5e7eb;
            padding: 8px 12px;
            background-color: white;
          }
          regular-table tbody tr:hover {
            background-color: #f3f4f6;
          }
        `;
        document.head.appendChild(style);
      }

      console.log("Drawing table...");
      rt.draw();
      
      // Set scroll dimensions after a small delay to ensure element is sized
      setTimeout(() => {
        if (typeof rt.setScrollDimensions === 'function') {
          const actualWidth = rt.offsetWidth || rt.clientWidth || 800;
          const actualHeight = rt.offsetHeight || rt.clientHeight || height;
          
          console.log(`📐 Element dimensions: ${actualWidth} x ${actualHeight}, container: ${rt.parentElement?.offsetWidth} x ${rt.parentElement?.offsetHeight}`);
          console.log(`📐 Setting scroll dimensions: ${actualWidth} x ${actualHeight}`);
          
          // Set explicit dimensions for virtual scrolling
          try {
            rt.setScrollDimensions({
              width: actualWidth,
              height: actualHeight
            });
            console.log(`✅ Scroll dimensions set successfully`);
          } catch (scrollError) {
            console.warn("Could not set scroll dimensions:", scrollError);
          }
          
          // Set explicit table size to ensure proper viewport calculation
          if (onDataRequest) {
            console.log(`📐 Setting virtual table size for 10,000 rows`);
            // Tell regular-table we have a large virtual dataset
            try {
              if (rt.style) {
                rt.style.width = `${actualWidth}px`;
                rt.style.height = `${actualHeight}px`;
              }
            } catch (styleError) {
              console.warn("Could not set style properties:", styleError);
            }
          }
          
          console.log("🎨 Redrawing after setting dimensions...");
          rt.draw(); // Redraw after setting dimensions
        }
      }, 100);
      
      // Pre-load data for DuckDB if available
      if (onDataRequest) {
        loadInitialData();
      }
      
      console.log("Table initialization complete");
      setIsTableReady(true);
    } catch (error) {
      console.error("Failed to initialize regular-table:", error);
      setIsTableReady(false);
    }
  }, [tanstackTable, onDataRequest]);

  // Load initial chunk of data for DuckDB
  const loadInitialData = useCallback(async () => {
    if (!onDataRequest) return;
    
    try {
      console.log("Loading initial data chunk...");
      const result = await onDataRequest(0, 0, columns.length, Math.min(100, 1000));
      
      console.log("Initial data loaded:", result);
      setTotalRows(result.num_rows);
      
      // Populate cache with initial data
      const newCache: { [key: string]: string } = {};
      for (let x = 0; x < result.data.length; x++) {
        const columnData = result.data[x];
        for (let y = 0; y < columnData.length; y++) {
          const key = `${x}-${y}`;
          newCache[key] = columnData[y];
        }
      }
      
      setCachedData(newCache);
      
      // Trigger a redraw
      if (tableRef.current && typeof tableRef.current.draw === 'function') {
        tableRef.current.draw();
      }
    } catch (error) {
      console.error("Failed to load initial data:", error);
    }
  }, [onDataRequest, columns]);

  useEffect(() => {
    initializeTable();
  }, [initializeTable]);

  // Redraw when data changes
  useEffect(() => {
    if (isTableReady && tableRef.current && typeof tableRef.current.draw === 'function') {
      tableRef.current.draw();
    }
  }, [data, sorting, columnFilters, isTableReady]);

  return (
    <div 
      className="w-full border rounded-lg bg-white overflow-hidden relative"
      style={{ height: `${height}px` }}
    >
      <regular-table
        ref={(el) => {
          try {
            console.log("🔗 Setting table ref:", el);
            tableRef.current = el;
          } catch (refError) {
            console.error("❌ Error setting table ref:", refError);
          }
        }}
        style={{
          width: "100%",
          height: "100%",
          display: "block",
        } as React.CSSProperties}
      />
      
      {/* Debug overlay */}
      {!isTableReady && (
        <div className="absolute inset-0 bg-yellow-50 bg-opacity-90 flex items-center justify-center">
          <div className="text-center p-4">
            <div className="text-yellow-800 font-medium mb-2">Initializing Table...</div>
            <div className="text-xs text-yellow-600">
              Data: {data.length} rows, Columns: {columns.length}
            </div>
          </div>
        </div>
      )}
      
      {/* Empty state overlay */}
      {isTableReady && data.length === 0 && !onDataRequest && (
        <div className="absolute inset-0 bg-gray-50 bg-opacity-90 flex items-center justify-center">
          <div className="text-center p-4">
            <div className="text-gray-800 font-medium mb-2">No Data</div>
            <div className="text-xs text-gray-600">
              No data provided to display
            </div>
          </div>
        </div>
      )}
    </div>
  );
}