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
    enableColumnResizing: true,
    enableSorting: true,
    enableColumnFilters: true,
    enableGrouping: true,
    columnResizeMode: 'onChange',
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
          
          // Use TanStack Table's header features - support hierarchical headers
          const headerGroups = tanstackTable.getHeaderGroups();
          const currentLeafHeaders = headerGroups[headerGroups.length - 1]?.headers || [];
          
          const columnHeaders = [];
          for (let x = x0; x < Math.min(x1, numColumns); x++) {
            const leafHeader = currentLeafHeaders[x];
            if (leafHeader) {
              // Build hierarchical header array from all header groups
              const headerHierarchy = [];
              
              // Go through each header group to build hierarchy
              for (const headerGroup of headerGroups) {
                const headerInGroup = headerGroup.headers.find(h => 
                  h.column.id === leafHeader.column.id || 
                  h.column.columnDef === leafHeader.column.columnDef
                );
                
                if (headerInGroup) {
                  const headerText = typeof headerInGroup.column.columnDef.header === 'string' 
                    ? headerInGroup.column.columnDef.header 
                    : headerInGroup.id;
                  
                  // Add indicators only to leaf headers
                  if (headerInGroup === leafHeader) {
                    const sortDirection = headerInGroup.column.getIsSorted();
                    const isGrouped = headerInGroup.column.getIsGrouped();
                    const isFiltered = headerInGroup.column.getIsFiltered();
                    const canResize = headerInGroup.column.getCanResize();
                    
                    // Build HTML header with proper elements and layout
                    let headerHTML = `<div class="header-content">`;
                    headerHTML += `<span class="header-text">${headerText}</span>`;
                    
                    // Add status icons in a group
                    headerHTML += `<div class="header-icons">`;
                    
                    if (sortDirection) {
                      const sortIcon = sortDirection === 'asc' 
                        ? '<svg class="sort-icon sort-asc" width="12" height="12" viewBox="0 0 12 12"><path d="M6 2L10 8H2L6 2Z" fill="currentColor"/></svg>'
                        : '<svg class="sort-icon sort-desc" width="12" height="12" viewBox="0 0 12 12"><path d="M6 10L2 4H10L6 10Z" fill="currentColor"/></svg>';
                      headerHTML += sortIcon;
                    }
                    
                    if (isGrouped) {
                      headerHTML += '<svg class="group-icon" width="12" height="12" viewBox="0 0 12 12"><rect x="1" y="2" width="10" height="2" fill="currentColor"/><rect x="1" y="5" width="7" height="2" fill="currentColor"/><rect x="1" y="8" width="10" height="2" fill="currentColor"/></svg>';
                    }
                    
                    if (isFiltered) {
                      headerHTML += '<svg class="filter-icon" width="12" height="12" viewBox="0 0 12 12"><path d="M1 2H11L7 6V10L5 8V6L1 2Z" fill="currentColor"/></svg>';
                    }
                    
                    headerHTML += `</div>`; // close header-icons
                    headerHTML += `</div>`; // close header-content
                    
                    if (canResize) {
                      headerHTML += '<div class="resize-handle"><svg class="resize-icon" width="8" height="16" viewBox="0 0 8 16"><path d="M2 2V14M6 2V14" stroke="currentColor" stroke-width="1" stroke-linecap="round"/></svg></div>';
                    }
                    
                    headerHierarchy.push(headerHTML);
                  } else {
                    headerHierarchy.push(headerText);
                  }
                }
              }
              
              // If no hierarchy, use just the leaf header
              if (headerHierarchy.length === 0) {
                const headerText = typeof leafHeader.column.columnDef.header === 'string' 
                  ? leafHeader.column.columnDef.header 
                  : leafHeader.id;
                headerHierarchy.push(headerText);
              }
              
              columnHeaders.push(headerHierarchy);
            } else {
              columnHeaders.push(['Column']);
            }
          }
          
          // Official format: row_headers is 2D array, one array per row
          // Enhanced with TanStack Table row information
          const rowHeaders = [];
          for (let y = y0; y < Math.min(y1, numRows); y++) {
            const row = rows[y];
            if (row) {
              let rowLabel = `Row ${y + 1}`;
              
              // Add grouping information
              if (row.getIsGrouped()) {
                rowLabel = `📁 ${rowLabel} (Group)`;
              } else if (row.depth > 0) {
                const indent = '  '.repeat(row.depth);
                rowLabel = `${indent}↳ ${rowLabel}`;
              }
              
              // Add selection indicator if row is selected
              if (row.getIsSelected()) {
                rowLabel = `✓ ${rowLabel}`;
              } else if (row.getIsSomeSelected()) {
                rowLabel = `◐ ${rowLabel}`;
              }
              
              rowHeaders.push([rowLabel]);
            } else {
              rowHeaders.push([`Row ${y + 1}`]);
            }
          }
          
          // Official format: data is 2D array where each sub-array is a COLUMN
          // Use TanStack Table's processed data (sorted, filtered, grouped)
          const data = [];
          
          for (let x = x0; x < Math.min(x1, numColumns); x++) {
            const leafHeader = currentLeafHeaders[x];
            const columnData = [];
            
            for (let y = y0; y < Math.min(y1, numRows); y++) {
              const row = rows[y];
              if (row && leafHeader) {
                // Use TanStack Table's cell value which respects sorting/filtering/grouping
                const cell = row.getVisibleCells().find(cell => cell.column.id === leafHeader.column.id);
                if (cell) {
                  const value = cell.getValue();
                  // Handle grouped cells differently
                  if (leafHeader.column.getIsGrouped() && row.getIsGrouped()) {
                    columnData.push(`${value} (${row.subRows?.length || 0} items)`);
                  } else {
                    columnData.push(String(value || ''));
                  }
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
          
          // Post-process headers to inject HTML content
          const headerCells = rt.querySelectorAll('th');
          headerCells.forEach((th: Element, index: number) => {
            const textContent = th.textContent || '';
            if (textContent.includes('<span') || textContent.includes('<svg')) {
              // This header contains HTML - render it properly
              th.innerHTML = textContent;
            }
          });
        });
        
        rt.addEventListener('scroll', () => {
          console.log('📜 regular-table scroll event');
        });
        
        // Add header click handlers for TanStack Table features
        rt.addEventListener('click', (event: any) => {
          const target = event.target as HTMLElement;
          
          // Don't handle clicks on resize handles
          if (target.closest('.resize-handle')) {
            event.stopPropagation();
            return;
          }
          
          // Handle clicks on headers or their child elements (SVG icons, spans)
          let headerCell: HTMLElement | null = target;
          if (target.tagName !== 'TH') {
            // If clicked on a child element, find the parent TH
            headerCell = target.closest('th') as HTMLElement | null;
          }
          
          if (headerCell && headerCell.tagName === 'TH') {
            const meta = rt.getMeta ? rt.getMeta(headerCell) : null;
            if (meta && meta.x !== undefined && meta.y === undefined) {
              // Header click - determine which column was clicked
              const clickHeaderGroups = tanstackTable.getHeaderGroups();
              const clickLeafHeaders = clickHeaderGroups[clickHeaderGroups.length - 1]?.headers || [];
              const clickedHeader = clickLeafHeaders[meta.x];
              
              if (clickedHeader) {
                // Handle sorting
                if (clickedHeader.column.getCanSort()) {
                  clickedHeader.column.toggleSorting();
                  console.log(`🔄 Toggled sorting for column: ${clickedHeader.column.id}`);
                  
                  // Redraw table to show updated sorting indicators
                  rt.draw();
                }
              }
            }
          }
        });
        
        // Add resize functionality
        let isResizing = false;
        let resizeColumn: any = null;
        let startX = 0;
        let startWidth = 0;
        
        rt.addEventListener('mousedown', (event: any) => {
          const target = event.target as HTMLElement;
          const resizeHandle = target.closest('.resize-handle');
          
          if (resizeHandle) {
            event.preventDefault();
            isResizing = true;
            startX = event.clientX;
            
            const headerCell = resizeHandle.closest('th');
            if (headerCell) {
              const meta = rt.getMeta ? rt.getMeta(headerCell) : null;
              if (meta && meta.x !== undefined) {
                const clickHeaderGroups = tanstackTable.getHeaderGroups();
                const clickLeafHeaders = clickHeaderGroups[clickHeaderGroups.length - 1]?.headers || [];
                resizeColumn = clickLeafHeaders[meta.x];
                startWidth = headerCell.offsetWidth;
                
                // Add visual feedback
                document.body.style.cursor = 'col-resize';
                headerCell.classList.add('resizing');
              }
            }
          }
        });
        
        document.addEventListener('mousemove', (event: MouseEvent) => {
          if (!isResizing || !resizeColumn) return;
          
          event.preventDefault();
          const deltaX = event.clientX - startX;
          const newWidth = Math.max(50, startWidth + deltaX); // Minimum width of 50px
          
          // Update column size in TanStack Table
          resizeColumn.column.setSize(newWidth);
          
          console.log(`Resizing column ${resizeColumn.column.id} to ${newWidth}px`);
        });
        
        document.addEventListener('mouseup', () => {
          if (isResizing) {
            isResizing = false;
            resizeColumn = null;
            document.body.style.cursor = '';
            
            // Remove visual feedback
            const headers = rt.querySelectorAll('th.resizing');
            headers.forEach((th: Element) => {
              th.classList.remove('resizing');
            });
            
            // Redraw table with new sizes
            rt.draw();
          }
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
            font-family: system-ui, -apple-system, sans-serif;
            font-size: 14px;
            background-color: white;
            color: #374151;
            border: 1px solid #e5e7eb;
            border-radius: 6px;
            overflow: auto;
            position: relative;
            display: block;
            width: 100%;
            height: 100%;
          }
          regular-table::-webkit-scrollbar { width: 12px; height: 12px; }
          regular-table::-webkit-scrollbar-track { background: #f1f5f9; border-radius: 6px; }
          regular-table::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 6px; border: 2px solid #f1f5f9; }
          regular-table::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
          regular-table::-webkit-scrollbar-corner { background: #f1f5f9; }
          regular-table th {
            position: relative;
            overflow: visible;
            min-width: 80px;
            max-width: 300px;
            background-color: #f9fafb;
            color: #374151;
            border-right: 1px solid #e5e7eb;
            border-bottom: 1px solid #e5e7eb;
            font-weight: 600;
            padding: 8px 12px;
            cursor: pointer;
            user-select: none;
            white-space: nowrap;
          }
          regular-table th:hover {
            background-color: #f3f4f6;
          }
          regular-table th:hover .resize-handle {
            opacity: 1;
          }
          regular-table th .header-content {
            display: flex;
            align-items: center;
            justify-content: space-between;
            width: 100%;
            min-height: 20px;
            padding-right: 12px;
          }
          regular-table th .header-text {
            font-weight: 600;
            flex: 1;
            min-width: 0;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }
          regular-table th .header-icons {
            display: flex;
            align-items: center;
            gap: 3px;
            flex-shrink: 0;
            margin-left: 8px;
          }
          regular-table th .sort-icon {
            display: block;
            color: #6b7280;
            transition: color 0.2s;
          }
          regular-table th .sort-icon.sort-asc {
            color: #3b82f6;
          }
          regular-table th .sort-icon.sort-desc {
            color: #3b82f6;
          }
          regular-table th .group-icon {
            display: block;
            color: #10b981;
          }
          regular-table th .filter-icon {
            display: block;
            color: #f59e0b;
          }
          regular-table th .resize-handle {
            position: absolute;
            top: 0;
            right: -4px;
            bottom: 0;
            width: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            opacity: 0;
            transition: all 0.2s ease;
            cursor: col-resize;
            z-index: 10;
            background: transparent;
            border-radius: 3px;
          }
          regular-table th .resize-handle:hover {
            background: rgba(59, 130, 246, 0.15);
            opacity: 1;
          }
          regular-table th .resize-handle:active {
            background: rgba(59, 130, 246, 0.25);
          }
          regular-table th .resize-handle .resize-icon {
            color: #3b82f6;
            pointer-events: none;
            opacity: 0.8;
            transition: opacity 0.2s;
          }
          regular-table th .resize-handle:hover .resize-icon {
            opacity: 1;
          }
          regular-table th.resizing {
            border-right: 2px solid #3b82f6 !important;
          }
          regular-table th.resizing .resize-handle {
            opacity: 1;
            background: rgba(59, 130, 246, 0.25);
          }
          regular-table td {
            border-right: 1px solid #e5e7eb;
            border-bottom: 1px solid #e5e7eb;
            padding: 8px 12px;
            background-color: white;
          }
          regular-table tbody tr:hover {
            background-color: #f9fafb;
          }
          regular-table tbody tr:nth-child(even) {
            background-color: #fafafa;
          }
          regular-table tbody tr:nth-child(even):hover {
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