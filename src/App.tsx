import React, { useState, useEffect } from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import TextInput from 'ink-text-input';
import { DBService, TableInfo, ColumnInfo } from './db.js';

interface AppProps {
  dbPath: string;
}

type Pane = 'sidebar' | 'data' | 'console' | 'card';

const COLORS = {
  primary: '#00ff41',
  secondary: '#003b00',
  surface: '#131313',
  text: '#ffffff',
  muted: '#84967e',
  warning: '#ffb000',
  black: '#000000'
};

export default function App({ dbPath }: AppProps) {
  const { exit } = useApp();
  const [dbInstance, setDbInstance] = useState<DBService | null>(null);
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [activePane, setActivePane] = useState<Pane>('sidebar');
  
  const [selectedTableIdx, setSelectedTableIdx] = useState(0);
  
  // Data Grid State
  const [tableData, setTableData] = useState<any[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [currentSchema, setCurrentSchema] = useState<ColumnInfo[]>([]);
  const [selectedRowIdx, setSelectedRowIdx] = useState(0);
  const [offset, setOffset] = useState(0);
  const limit = 50;

  // Console State
  const [query, setQuery] = useState('');
  const [queryResult, setQueryResult] = useState<string | null>(null);
  const [queryError, setQueryError] = useState<string | null>(null);
  const [queryHistory, setQueryHistory] = useState<string[]>([]);
  const [historyIdx, setHistoryIdx] = useState(-1);
  const [isCustomQuery, setIsCustomQuery] = useState(false);
  const [inputKey, setInputKey] = useState(0);

  // Initialization
  useEffect(() => {
    let database: DBService;
    try {
      database = new DBService(dbPath);
      setDbInstance(database);
      const tbls = database.getTables();
      setTables(tbls);
      if (tbls.length > 0) {
        loadTableData(database, tbls[0].name, 0);
      }
    } catch (e: any) {
      console.error('Error opening DB:', e.message);
      exit();
    }
    return () => {
      if (database) database.close();
    };
  }, [dbPath, exit]);

  const loadTableData = (database: DBService, tableName: string, newOffset: number) => {
    try {
      const schema = database.getTableSchema(tableName);
      setCurrentSchema(schema);
      setColumns(schema.map(c => c.name));
      const data = database.getTableData(tableName, newOffset, limit);
      
      if (newOffset === 0) {
        setTableData(data);
        setSelectedRowIdx(0);
      } else {
        setTableData(prev => [...prev, ...data]);
      }
      setOffset(newOffset);
      setQueryResult(null);
      setQueryError(null);
      setIsCustomQuery(false);
    } catch (e: any) {
      setColumns([]);
      setTableData([]);
    }
  };

  const lastWordMatch = query.match(/([a-zA-Z0-9_]+)$/);
  const lastWord = lastWordMatch ? lastWordMatch[1] : '';

  const words = query.trimEnd().split(/[\s,()=]+/);
  let prevWord = '';
  if (lastWord) {
     prevWord = words.length > 1 ? words[words.length - 2].toUpperCase() : '';
  } else {
     prevWord = words.length > 0 ? words[words.length - 1].toUpperCase() : '';
  }

  const isTableContext = ['FROM', 'JOIN', 'UPDATE', 'INTO'].includes(prevWord);
  const isColumnContext = ['SELECT', 'WHERE', 'SET', 'AND', 'OR', 'BY', 'HAVING', 'ON'].includes(prevWord);

  const keywords = ['SELECT ', 'FROM ', 'WHERE ', 'UPDATE ', 'INSERT INTO ', 'VALUES ', 'DELETE FROM ', 'LIMIT ', 'ORDER BY ', 'JOIN ', 'ON '];
  
  let dictionary: string[] = [];
  if (isTableContext) {
      dictionary = [...tables.map(t => t.name), ...keywords];
  } else if (isColumnContext) {
      dictionary = [...currentSchema.map(c => c.name), ...tables.map(t => t.name), ...keywords];
  } else {
      dictionary = [...keywords, ...tables.map(t => t.name), ...currentSchema.map(c => c.name)];
  }

  let suggestion = '';
  if (lastWord.length > 0) {
     const lowerLast = lastWord.toLowerCase();
     const found = dictionary.find(w => w.toLowerCase().startsWith(lowerLast) && w.toLowerCase() !== lowerLast);
     if (found) {
        const remainder = found.substring(lastWord.length);
        const isUpper = lastWord === lastWord.toUpperCase() && /[a-zA-Z]/.test(lastWord);
        const isLower = lastWord === lastWord.toLowerCase() && /[a-zA-Z]/.test(lastWord);
        
        if (isUpper) {
            suggestion = remainder.toUpperCase();
        } else if (isLower) {
            suggestion = remainder.toLowerCase();
        } else {
            suggestion = keywords.includes(found) ? remainder.toLowerCase() : remainder;
        }
     }
  } else if (query.endsWith(' ') || query === '') {
      if (isTableContext && tables.length > 0) {
          suggestion = tables[0].name;
      } else if (isColumnContext && currentSchema.length > 0) {
          suggestion = currentSchema[0].name;
      } else if (query === '') {
          suggestion = 'SELECT ';
      }
  }

  useInput((input, key) => {
    if (input && input.toLowerCase() === 'q' && activePane !== 'console') {
      exit();
      return;
    }
    if (key.escape) {
      if (activePane === 'card') {
        setActivePane('data');
        return;
      }
      if (activePane === 'console') {
        setActivePane('data');
        return;
      }
      if (isCustomQuery) {
        if (tables.length > 0 && dbInstance) {
          loadTableData(dbInstance, tables[selectedTableIdx].name, 0);
        }
        return;
      }
      exit();
      return;
    }
    
    if (key.tab && activePane !== 'card') {
      if (activePane === 'console' && suggestion) {
        setQuery(query + suggestion);
        setInputKey(k => k + 1);
        return;
      }
      setActivePane(p => p === 'sidebar' ? 'data' : (p === 'data' ? 'console' : 'sidebar'));
      return;
    }

    if (activePane === 'sidebar') {
      if (key.downArrow || input === 'j') {
        setSelectedTableIdx(prev => Math.min(tables.length - 1, prev + 1));
      }
      if (key.upArrow || input === 'k') {
        setSelectedTableIdx(prev => Math.max(0, prev - 1));
      }
      if (key.return) {
        if (tables.length > 0 && dbInstance) {
          loadTableData(dbInstance, tables[selectedTableIdx].name, 0);
          setActivePane('data');
        }
      }
    } else if (activePane === 'data') {
      if (key.downArrow || input === 'j') {
        if (selectedRowIdx < tableData.length - 1) {
          setSelectedRowIdx(prev => prev + 1);
        } else if (tableData.length === offset + limit && dbInstance) {
           const tblName = tables[selectedTableIdx]?.name;
           if (tblName) {
             const newData = dbInstance.getTableData(tblName, offset + limit, limit);
             if (newData.length > 0) {
                setTableData(prev => [...prev, ...newData]);
                setOffset(offset + limit);
                setSelectedRowIdx(prev => prev + 1);
             }
           }
        }
      }
      if (key.upArrow || input === 'k') {
        setSelectedRowIdx(prev => Math.max(0, prev - 1));
      }
      if (key.return && tableData.length > 0) {
        setActivePane('card');
      }
    } else if (activePane === 'console') {
      if (key.rightArrow && suggestion) {
        setQuery(query + suggestion);
        setInputKey(k => k + 1);
      } else if (key.upArrow && queryHistory.length > 0) {
        const nextIdx = historyIdx === -1 ? queryHistory.length - 1 : Math.max(0, historyIdx - 1);
        setHistoryIdx(nextIdx);
        setQuery(queryHistory[nextIdx]);
        setInputKey(k => k + 1);
      } else if (key.downArrow && queryHistory.length > 0) {
        if (historyIdx !== -1) {
          const nextIdx = historyIdx + 1;
          if (nextIdx >= queryHistory.length) {
            setHistoryIdx(-1);
            setQuery('');
            setInputKey(k => k + 1);
          } else {
            setHistoryIdx(nextIdx);
            setQuery(queryHistory[nextIdx]);
            setInputKey(k => k + 1);
          }
        }
      }
    }
  });

  const handleConsoleSubmit = (val: string) => {
    if (!val.trim() || !dbInstance) return;
    
    setQueryHistory(prev => [...prev, val]);
    setHistoryIdx(-1);

    const result = dbInstance.executeRaw(val);
    if (result.error) {
      setQueryError(result.error);
      setQueryResult(null);
    } else if (result.rows) {
      if (result.rows.length > 0) {
         setColumns(Object.keys(result.rows[0]));
      } else {
         setColumns([]);
      }
      setTableData(result.rows);
      setSelectedRowIdx(0);
      setQueryResult(`Returned ${result.rows.length} rows.`);
      setQueryError(null);
      setIsCustomQuery(true);
      setActivePane('data');
    } else {
      setQueryResult(`Changes: ${result.changes}`);
      setQueryError(null);
      if (tables.length > 0 && !isCustomQuery) {
          loadTableData(dbInstance, tables[selectedTableIdx].name, 0);
      }
    }
    setQuery('');
  };

  if (!dbInstance) return <Text>Loading database...</Text>;

  const colWidth = Math.max(12, Math.floor(70 / (columns.length || 1)));

  const visibleRowCount = 12;
  const startRow = Math.max(0, selectedRowIdx - Math.floor(visibleRowCount / 2));
  const endRow = startRow + visibleRowCount;
  const visibleData = tableData.slice(startRow, endRow);

  const dbName = dbPath.split(/[/\\]/).pop();

  return (
    <Box flexDirection="column" height={26} padding={1}>
      {/* Header */}
      <Box justifyContent="space-between" marginBottom={1}>
        <Text bold color={COLORS.primary}>{dbName}</Text>
        <Text color={COLORS.muted}>Tables: {tables.length}</Text>
      </Box>

      {/* Main Container */}
      <Box flexDirection="row" flexGrow={1}>
        
        {/* Left Sidebar */}
        <Box width={25} flexDirection="column" marginRight={2}>
          <Box borderBottom borderStyle="single" borderColor={COLORS.secondary} borderTop={false} borderLeft={false} borderRight={false} paddingBottom={0}>
             <Text color={COLORS.muted} bold>TABLES</Text>
             {activePane === 'sidebar' && <Text color={COLORS.primary}> [ACTIVE]</Text>}
          </Box>
          <Box flexDirection="column" flexGrow={1} marginTop={1}>
            {tables.map((t, i) => {
              const isSelected = i === selectedTableIdx;
              let str = ` ≡ ${t.name}`;
              if (isSelected) {
                 str = str.padEnd(23, ' ') + ' >';
              } else {
                 str = str.padEnd(25, ' ');
              }
              return (
                <Box key={t.name}>
                   <Text backgroundColor={isSelected ? COLORS.primary : undefined} color={isSelected ? COLORS.black : COLORS.text} bold={isSelected}>
                     {str}
                   </Text>
                </Box>
              );
            })}
          </Box>
          <Box flexDirection="column" borderTop borderStyle="single" borderColor={COLORS.secondary} borderBottom={false} borderLeft={false} borderRight={false} paddingTop={1}>
             <Text color={COLORS.primary}>{tables[selectedTableIdx]?.name} schema</Text>
             <Text color={COLORS.muted} wrap="truncate">&lt;{currentSchema.map(c => `${c.name} ${c.type}`).join(', ')}&gt;</Text>
          </Box>
        </Box>

        {/* Data Grid */}
        <Box flexGrow={1} flexDirection="column" borderLeft borderStyle="single" borderColor={activePane === 'data' ? COLORS.primary : COLORS.secondary} borderTop={false} borderBottom={false} borderRight={false} paddingLeft={2} overflow="hidden">
           <Box justifyContent="space-between" marginBottom={1}>
             <Text color={COLORS.primary} bold>☷ Browsing: {isCustomQuery ? 'Custom Query' : tables[selectedTableIdx]?.name}</Text>
             <Text color={COLORS.muted}>{tableData.length} rows returned</Text>
           </Box>

           {activePane === 'card' && tableData.length > 0 ? (
             <Box flexDirection="column" padding={1}>
                <Text bold color={COLORS.warning}>--- Row Details ---</Text>
                {columns.map(c => (
                  <Box key={c} marginTop={1} flexDirection="column">
                    <Text bold color={COLORS.primary}>{c}:</Text>
                    <Text color={COLORS.text}>{String(tableData[selectedRowIdx][c] ?? 'NULL')}</Text>
                  </Box>
                ))}
             </Box>
           ) : (
             <Box flexDirection="column" flexGrow={1}>
               <Box flexDirection="row" borderBottom borderStyle="single" borderColor={COLORS.secondary} borderTop={false} borderLeft={false} borderRight={false}>
                 {columns.map(c => {
                   const innerWidth = colWidth - 1;
                   let str = ` ${c}`;
                   if (str.length > innerWidth) str = str.substring(0, innerWidth - 1) + '…';
                   str = str.padEnd(innerWidth, ' ');
                   return (
                     <Box width={colWidth} key={c} borderRight borderStyle="single" borderColor={COLORS.secondary} borderTop={false} borderBottom={false} borderLeft={false}>
                       <Text bold color={COLORS.text}>{str}</Text>
                     </Box>
                   );
                 })}
               </Box>
               {visibleData.map((row, i) => {
                   const actualIdx = startRow + i;
                   const isSelected = actualIdx === selectedRowIdx && activePane === 'data';
                   return (
                     <Box key={actualIdx} flexDirection="row">
                       {columns.map(c => {
                         const innerWidth = colWidth - 1;
                         const rawVal = String(row[c] ?? 'NULL');
                         let str = ` ${rawVal}`;
                         if (str.length > innerWidth) str = str.substring(0, innerWidth - 1) + '…';
                         str = str.padEnd(innerWidth, ' ');
                         return (
                           <Box width={colWidth} key={c} borderRight borderStyle="single" borderColor={COLORS.secondary} borderTop={false} borderBottom={false} borderLeft={false}>
                             <Text backgroundColor={isSelected ? COLORS.primary : undefined} color={isSelected ? COLORS.black : COLORS.text}>{str}</Text>
                           </Box>
                         );
                       })}
                     </Box>
                   );
               })}
             </Box>
           )}
        </Box>
      </Box>

      {/* SQL Console */}
      <Box flexDirection="column" marginTop={1} borderStyle="single" borderColor={activePane === 'console' ? COLORS.primary : COLORS.secondary}>
        <Box paddingX={1}><Text color={COLORS.muted} bold>SQL QUERY EDITOR</Text></Box>
        <Box flexDirection="row" paddingX={1}>
          <Text color={COLORS.primary} bold>λ </Text>
          <TextInput
            key={inputKey}
            value={query}
            onChange={setQuery}
            focus={activePane === 'console'}
            onSubmit={handleConsoleSubmit}
          />
          {activePane === 'console' && suggestion && <Text color={COLORS.muted}>{suggestion}</Text>}
        </Box>
      </Box>

      {/* Status Bar */}
      <Box flexDirection="row" marginTop={1} justifyContent="space-between">
        <Box>
          <Text color={COLORS.primary} bold>[Q] </Text><Text color={COLORS.text}>Quit  </Text>
          <Text color={COLORS.primary} bold>[Tab] </Text><Text color={COLORS.text}>{activePane === 'console' && suggestion ? 'Autocomplete' : 'Switch Pane'}  </Text>
          <Text color={COLORS.primary} bold>[Enter] </Text><Text color={COLORS.text}>Select/Run  </Text>
          <Text color={COLORS.primary} bold>[Esc] </Text><Text color={COLORS.text}>{isCustomQuery ? 'Reset View' : 'Back'}</Text>
        </Box>
        {queryResult && <Text color={COLORS.primary}>{queryResult}</Text>}
        {queryError && <Text color={COLORS.warning}>{queryError}</Text>}
      </Box>
    </Box>
  );
}
