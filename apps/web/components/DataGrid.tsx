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
    column_headers: string[];
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
      await import("regular-table");
      await customElements.whenDefined("regular-table");
      
      // Wait a bit more to ensure the element is fully ready
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Try to access the regular-table constructor directly
      const RegularTable = customElements.get('regular-table');
      console.log("Regular-table constructor:", RegularTable);
      
      const rt = tableRef.current;
      if (!rt) {
        console.error("No table ref found");
        return;
      }
      
      console.log("Regular table element found:", rt);
      console.log("Element connected:", rt.isConnected);
      console.log("Element ready state:", rt.readyState);
      console.log("Available methods:", Object.getOwnPropertyNames(rt));
      console.log("setDataModel method:", typeof rt.setDataModel);
      
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

      // Set up data listener using regular-table's API
      const dataListener = async (x0: number, y0: number, x1: number, y1: number) => {
        console.log(`Data request: x0=${x0}, y0=${y0}, x1=${x1}, y1=${y1}`);
        
        // Handle dimension queries and invalid ranges
        if (x1 <= x0 || y1 <= y0) {
          let numRows = 0;
          let numColumns = columns.length;
          
          if (onDataRequest) {
            // For DuckDB mode, use a large default for virtual scrolling
            numRows = 10000;
            numColumns = columns.length;
          } else {
            numRows = tanstackTable.getRowModel().rows.length;
          }
          
          const logMessage = x1 <= x0 && y1 <= y0 ? 'Dimension query' : 'Invalid coordinates';
          console.log(`${logMessage} [${x0},${y0}] to [${x1},${y1}] - returning ${numRows} rows, ${numColumns} columns`);
          
          return {
            num_rows: numRows,
            num_columns: numColumns,
            column_headers: [], // Empty headers for dimension/invalid query
            data: []
          };
        }
        
        if (onDataRequest) {
          // Clamp coordinates to valid bounds
          const clampedX0 = Math.max(0, x0);
          const clampedY0 = Math.max(0, y0);
          const clampedX1 = Math.min(x1, columns.length);
          const clampedY1 = Math.max(y1, y0 + 1); // Ensure y1 > y0
          
          console.log(`DuckDB mode: calling onDataRequest for range [${clampedX0},${clampedY0}] to [${clampedX1},${clampedY1}] (original: [${x0},${y0}] to [${x1},${y1}])`);
          
          try {
            const result = await onDataRequest(clampedX0, clampedY0, clampedX1, clampedY1);
            console.log(`DuckDB response:`, result);
            setTotalRows(result.num_rows);
            return result;
          } catch (error) {
            console.error("DuckDB data request failed:", error);
            console.error("Error details:", error);
            const fallbackHeaders = [];
            for (let x = clampedX0; x < clampedX1; x++) {
              const column = columns[x];
              if (column) {
                fallbackHeaders.push(typeof column.header === 'string' ? column.header : 'Column');
              }
            }
            return {
              num_rows: 0,
              num_columns: columns.length,
              column_headers: fallbackHeaders,
              data: []
            };
          }
        } else {
          // Use local data
          const rows = tanstackTable.getRowModel().rows;
          const numRows = rows.length;
          const numColumns = columns.length;

          // Clamp coordinates to valid bounds
          const clampedX0 = Math.max(0, x0);
          const clampedY0 = Math.max(0, y0);
          const clampedX1 = Math.min(x1, numColumns);
          const clampedY1 = Math.min(y1, numRows);

          console.log(`Local data: ${numRows} rows, ${numColumns} columns`);
          console.log(`Requested range: [${x0},${y0}] to [${x1},${y1}], clamped to: [${clampedX0},${clampedY0}] to [${clampedX1},${clampedY1}]`);
          console.log(`Sample row data:`, rows[0]?.original);
          console.log(`Columns:`, columns.map(col => ({ header: col.header, accessorKey: (col as any).accessorKey })));

          // Get column headers for the requested range
          const columnHeaders: string[] = [];
          for (let x = clampedX0; x < clampedX1; x++) {
            const column = columns[x];
            if (column) {
              columnHeaders.push(typeof column.header === 'string' ? column.header : 'Column');
            }
          }
          
          const data: any[][] = [];
          for (let y = clampedY0; y < clampedY1; y++) {
            const row = rows[y];
            if (!row) continue;
            
            const rowData: any[] = [];
            for (let x = clampedX0; x < clampedX1; x++) {
              const column = columns[x];
              if (!column) continue;
              
              const accessorKey = (column as any).accessorKey;
              if (accessorKey) {
                const value = (row.original as any)[accessorKey];
                if (typeof value === 'number') {
                  rowData.push(value.toFixed(2));
                } else {
                  rowData.push(String(value || ''));
                }
              } else {
                rowData.push('');
              }
            }
            data.push(rowData);
          }
          
          console.log(`Returning ${data.length} rows of data, ${columnHeaders.length} columns`);
          console.log(`Column headers for range [${x0}-${x1}]:`, columnHeaders);
          console.log(`Sample data:`, data[0]);
          console.log(`Full response:`, {
            num_rows: numRows,
            num_columns: numColumns,
            column_headers: columnHeaders,
            data: data
          });
          
          return {
            num_rows: numRows,
            num_columns: numColumns,
            column_headers: columnHeaders,
            data: data
          };
        }
      };

      console.log("Setting data listener...");
      
      // Use the correct regular-table API
      if (typeof rt.setDataListener === 'function') {
        rt.setDataListener(dataListener);
        console.log("Data listener set successfully");
      } else {
        throw new Error("setDataListener method not available on regular-table element");
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
          
          console.log(`Setting scroll dimensions: ${actualWidth} x ${actualHeight}`);
          rt.setScrollDimensions({
            width: actualWidth,
            height: actualHeight
          });
          
          console.log("Redrawing after setting dimensions...");
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
    <div className="w-full border rounded-lg bg-white overflow-hidden relative">
      <regular-table
        ref={tableRef}
        style={{
          width: "100%",
          height: `${height}px`,
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