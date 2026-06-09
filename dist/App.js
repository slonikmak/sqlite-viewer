import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import TextInput from 'ink-text-input';
import { DBService } from './db.js';
const COLORS = {
    primary: '#00ff41',
    secondary: '#003b00',
    surface: '#131313',
    text: '#ffffff',
    muted: '#84967e',
    warning: '#ffb000',
    black: '#000000'
};
export default function App({ dbPath }) {
    const { exit } = useApp();
    const [dbInstance, setDbInstance] = useState(null);
    const [tables, setTables] = useState([]);
    const [activePane, setActivePane] = useState('sidebar');
    const [selectedTableIdx, setSelectedTableIdx] = useState(0);
    // Data Grid State
    const [tableData, setTableData] = useState([]);
    const [columns, setColumns] = useState([]);
    const [currentSchema, setCurrentSchema] = useState([]);
    const [selectedRowIdx, setSelectedRowIdx] = useState(0);
    const [offset, setOffset] = useState(0);
    const limit = 50;
    // Console State
    const [query, setQuery] = useState('');
    const [queryResult, setQueryResult] = useState(null);
    const [queryError, setQueryError] = useState(null);
    const [queryHistory, setQueryHistory] = useState([]);
    const [historyIdx, setHistoryIdx] = useState(-1);
    const [isCustomQuery, setIsCustomQuery] = useState(false);
    const [inputKey, setInputKey] = useState(0);
    // Initialization
    useEffect(() => {
        let database;
        try {
            database = new DBService(dbPath);
            setDbInstance(database);
            const tbls = database.getTables();
            setTables(tbls);
            if (tbls.length > 0) {
                loadTableData(database, tbls[0].name, 0);
            }
        }
        catch (e) {
            console.error('Error opening DB:', e.message);
            exit();
        }
        return () => {
            if (database)
                database.close();
        };
    }, [dbPath, exit]);
    const loadTableData = (database, tableName, newOffset) => {
        try {
            const schema = database.getTableSchema(tableName);
            setCurrentSchema(schema);
            setColumns(schema.map(c => c.name));
            const data = database.getTableData(tableName, newOffset, limit);
            if (newOffset === 0) {
                setTableData(data);
                setSelectedRowIdx(0);
            }
            else {
                setTableData(prev => [...prev, ...data]);
            }
            setOffset(newOffset);
            setQueryResult(null);
            setQueryError(null);
            setIsCustomQuery(false);
        }
        catch (e) {
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
    }
    else {
        prevWord = words.length > 0 ? words[words.length - 1].toUpperCase() : '';
    }
    const isTableContext = ['FROM', 'JOIN', 'UPDATE', 'INTO'].includes(prevWord);
    const isColumnContext = ['SELECT', 'WHERE', 'SET', 'AND', 'OR', 'BY', 'HAVING', 'ON'].includes(prevWord);
    const keywords = ['SELECT ', 'FROM ', 'WHERE ', 'UPDATE ', 'INSERT INTO ', 'VALUES ', 'DELETE FROM ', 'LIMIT ', 'ORDER BY ', 'JOIN ', 'ON '];
    let dictionary = [];
    if (isTableContext) {
        dictionary = [...tables.map(t => t.name), ...keywords];
    }
    else if (isColumnContext) {
        dictionary = [...currentSchema.map(c => c.name), ...tables.map(t => t.name), ...keywords];
    }
    else {
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
            }
            else if (isLower) {
                suggestion = remainder.toLowerCase();
            }
            else {
                suggestion = keywords.includes(found) ? remainder.toLowerCase() : remainder;
            }
        }
    }
    else if (query.endsWith(' ') || query === '') {
        if (isTableContext && tables.length > 0) {
            suggestion = tables[0].name;
        }
        else if (isColumnContext && currentSchema.length > 0) {
            suggestion = currentSchema[0].name;
        }
        else if (query === '') {
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
        }
        else if (activePane === 'data') {
            if (key.downArrow || input === 'j') {
                if (selectedRowIdx < tableData.length - 1) {
                    setSelectedRowIdx(prev => prev + 1);
                }
                else if (tableData.length === offset + limit && dbInstance) {
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
        }
        else if (activePane === 'console') {
            if (key.rightArrow && suggestion) {
                setQuery(query + suggestion);
                setInputKey(k => k + 1);
            }
            else if (key.upArrow && queryHistory.length > 0) {
                const nextIdx = historyIdx === -1 ? queryHistory.length - 1 : Math.max(0, historyIdx - 1);
                setHistoryIdx(nextIdx);
                setQuery(queryHistory[nextIdx]);
                setInputKey(k => k + 1);
            }
            else if (key.downArrow && queryHistory.length > 0) {
                if (historyIdx !== -1) {
                    const nextIdx = historyIdx + 1;
                    if (nextIdx >= queryHistory.length) {
                        setHistoryIdx(-1);
                        setQuery('');
                        setInputKey(k => k + 1);
                    }
                    else {
                        setHistoryIdx(nextIdx);
                        setQuery(queryHistory[nextIdx]);
                        setInputKey(k => k + 1);
                    }
                }
            }
        }
    });
    const handleConsoleSubmit = (val) => {
        if (!val.trim() || !dbInstance)
            return;
        setQueryHistory(prev => [...prev, val]);
        setHistoryIdx(-1);
        const result = dbInstance.executeRaw(val);
        if (result.error) {
            setQueryError(result.error);
            setQueryResult(null);
        }
        else if (result.rows) {
            if (result.rows.length > 0) {
                setColumns(Object.keys(result.rows[0]));
            }
            else {
                setColumns([]);
            }
            setTableData(result.rows);
            setSelectedRowIdx(0);
            setQueryResult(`Returned ${result.rows.length} rows.`);
            setQueryError(null);
            setIsCustomQuery(true);
            setActivePane('data');
        }
        else {
            setQueryResult(`Changes: ${result.changes}`);
            setQueryError(null);
            if (tables.length > 0 && !isCustomQuery) {
                loadTableData(dbInstance, tables[selectedTableIdx].name, 0);
            }
        }
        setQuery('');
    };
    if (!dbInstance)
        return _jsx(Text, { children: "Loading database..." });
    const colWidth = Math.max(12, Math.floor(70 / (columns.length || 1)));
    const visibleRowCount = 12;
    const startRow = Math.max(0, selectedRowIdx - Math.floor(visibleRowCount / 2));
    const endRow = startRow + visibleRowCount;
    const visibleData = tableData.slice(startRow, endRow);
    const dbName = dbPath.split(/[/\\]/).pop();
    return (_jsxs(Box, { flexDirection: "column", height: 26, padding: 1, children: [_jsxs(Box, { justifyContent: "space-between", marginBottom: 1, children: [_jsx(Text, { bold: true, color: COLORS.primary, children: dbName }), _jsxs(Text, { color: COLORS.muted, children: ["Tables: ", tables.length] })] }), _jsxs(Box, { flexDirection: "row", flexGrow: 1, children: [_jsxs(Box, { width: 25, flexDirection: "column", marginRight: 2, children: [_jsxs(Box, { borderBottom: true, borderStyle: "single", borderColor: COLORS.secondary, borderTop: false, borderLeft: false, borderRight: false, paddingBottom: 0, children: [_jsx(Text, { color: COLORS.muted, bold: true, children: "TABLES" }), activePane === 'sidebar' && _jsx(Text, { color: COLORS.primary, children: " [ACTIVE]" })] }), _jsx(Box, { flexDirection: "column", flexGrow: 1, marginTop: 1, children: tables.map((t, i) => {
                                    const isSelected = i === selectedTableIdx;
                                    let str = ` ≡ ${t.name}`;
                                    if (isSelected) {
                                        str = str.padEnd(23, ' ') + ' >';
                                    }
                                    else {
                                        str = str.padEnd(25, ' ');
                                    }
                                    return (_jsx(Box, { children: _jsx(Text, { backgroundColor: isSelected ? COLORS.primary : undefined, color: isSelected ? COLORS.black : COLORS.text, bold: isSelected, children: str }) }, t.name));
                                }) }), _jsxs(Box, { flexDirection: "column", borderTop: true, borderStyle: "single", borderColor: COLORS.secondary, borderBottom: false, borderLeft: false, borderRight: false, paddingTop: 1, children: [_jsxs(Text, { color: COLORS.primary, children: [tables[selectedTableIdx]?.name, " schema"] }), _jsxs(Text, { color: COLORS.muted, wrap: "truncate", children: ["<", currentSchema.map(c => `${c.name} ${c.type}`).join(', '), ">"] })] })] }), _jsxs(Box, { flexGrow: 1, flexDirection: "column", borderLeft: true, borderStyle: "single", borderColor: activePane === 'data' ? COLORS.primary : COLORS.secondary, borderTop: false, borderBottom: false, borderRight: false, paddingLeft: 2, overflow: "hidden", children: [_jsxs(Box, { justifyContent: "space-between", marginBottom: 1, children: [_jsxs(Text, { color: COLORS.primary, bold: true, children: ["\u2637 Browsing: ", isCustomQuery ? 'Custom Query' : tables[selectedTableIdx]?.name] }), _jsxs(Text, { color: COLORS.muted, children: [tableData.length, " rows returned"] })] }), activePane === 'card' && tableData.length > 0 ? (_jsxs(Box, { flexDirection: "column", padding: 1, children: [_jsx(Text, { bold: true, color: COLORS.warning, children: "--- Row Details ---" }), columns.map(c => (_jsxs(Box, { marginTop: 1, flexDirection: "column", children: [_jsxs(Text, { bold: true, color: COLORS.primary, children: [c, ":"] }), _jsx(Text, { color: COLORS.text, children: String(tableData[selectedRowIdx][c] ?? 'NULL') })] }, c)))] })) : (_jsxs(Box, { flexDirection: "column", flexGrow: 1, children: [_jsx(Box, { flexDirection: "row", borderBottom: true, borderStyle: "single", borderColor: COLORS.secondary, borderTop: false, borderLeft: false, borderRight: false, children: columns.map(c => {
                                            const innerWidth = colWidth - 1;
                                            let str = ` ${c}`;
                                            if (str.length > innerWidth)
                                                str = str.substring(0, innerWidth - 1) + '…';
                                            str = str.padEnd(innerWidth, ' ');
                                            return (_jsx(Box, { width: colWidth, borderRight: true, borderStyle: "single", borderColor: COLORS.secondary, borderTop: false, borderBottom: false, borderLeft: false, children: _jsx(Text, { bold: true, color: COLORS.text, children: str }) }, c));
                                        }) }), visibleData.map((row, i) => {
                                        const actualIdx = startRow + i;
                                        const isSelected = actualIdx === selectedRowIdx && activePane === 'data';
                                        return (_jsx(Box, { flexDirection: "row", children: columns.map(c => {
                                                const innerWidth = colWidth - 1;
                                                const rawVal = String(row[c] ?? 'NULL');
                                                let str = ` ${rawVal}`;
                                                if (str.length > innerWidth)
                                                    str = str.substring(0, innerWidth - 1) + '…';
                                                str = str.padEnd(innerWidth, ' ');
                                                return (_jsx(Box, { width: colWidth, borderRight: true, borderStyle: "single", borderColor: COLORS.secondary, borderTop: false, borderBottom: false, borderLeft: false, children: _jsx(Text, { backgroundColor: isSelected ? COLORS.primary : undefined, color: isSelected ? COLORS.black : COLORS.text, children: str }) }, c));
                                            }) }, actualIdx));
                                    })] }))] })] }), _jsxs(Box, { flexDirection: "column", marginTop: 1, borderStyle: "single", borderColor: activePane === 'console' ? COLORS.primary : COLORS.secondary, children: [_jsx(Box, { paddingX: 1, children: _jsx(Text, { color: COLORS.muted, bold: true, children: "SQL QUERY EDITOR" }) }), _jsxs(Box, { flexDirection: "row", paddingX: 1, children: [_jsx(Text, { color: COLORS.primary, bold: true, children: "\u03BB " }), _jsx(TextInput, { value: query, onChange: setQuery, focus: activePane === 'console', onSubmit: handleConsoleSubmit }, inputKey), activePane === 'console' && suggestion && _jsx(Text, { color: COLORS.muted, children: suggestion })] })] }), _jsxs(Box, { flexDirection: "row", marginTop: 1, justifyContent: "space-between", children: [_jsxs(Box, { children: [_jsx(Text, { color: COLORS.primary, bold: true, children: "[Q] " }), _jsx(Text, { color: COLORS.text, children: "Quit  " }), _jsx(Text, { color: COLORS.primary, bold: true, children: "[Tab] " }), _jsxs(Text, { color: COLORS.text, children: [activePane === 'console' && suggestion ? 'Autocomplete' : 'Switch Pane', "  "] }), _jsx(Text, { color: COLORS.primary, bold: true, children: "[Enter] " }), _jsx(Text, { color: COLORS.text, children: "Select/Run  " }), _jsx(Text, { color: COLORS.primary, bold: true, children: "[Esc] " }), _jsx(Text, { color: COLORS.text, children: isCustomQuery ? 'Reset View' : 'Back' })] }), queryResult && _jsx(Text, { color: COLORS.primary, children: queryResult }), queryError && _jsx(Text, { color: COLORS.warning, children: queryError })] })] }));
}
