"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = App;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const ink_1 = require("ink");
const ink_text_input_1 = __importDefault(require("ink-text-input"));
const db_js_1 = require("./db.js");
const COLORS = {
    primary: '#00ff41',
    secondary: '#003b00',
    surface: '#131313',
    text: '#ffffff',
    muted: '#84967e',
    warning: '#ffb000',
    black: '#000000'
};
function App({ dbPath }) {
    const { exit } = (0, ink_1.useApp)();
    const [dbInstance, setDbInstance] = (0, react_1.useState)(null);
    const [tables, setTables] = (0, react_1.useState)([]);
    const [activePane, setActivePane] = (0, react_1.useState)('sidebar');
    const [selectedTableIdx, setSelectedTableIdx] = (0, react_1.useState)(0);
    // Data Grid State
    const [tableData, setTableData] = (0, react_1.useState)([]);
    const [columns, setColumns] = (0, react_1.useState)([]);
    const [currentSchema, setCurrentSchema] = (0, react_1.useState)([]);
    const [selectedRowIdx, setSelectedRowIdx] = (0, react_1.useState)(0);
    const [offset, setOffset] = (0, react_1.useState)(0);
    const limit = 50;
    // Console State
    const [query, setQuery] = (0, react_1.useState)('');
    const [queryResult, setQueryResult] = (0, react_1.useState)(null);
    const [queryError, setQueryError] = (0, react_1.useState)(null);
    const [queryHistory, setQueryHistory] = (0, react_1.useState)([]);
    const [historyIdx, setHistoryIdx] = (0, react_1.useState)(-1);
    const [isCustomQuery, setIsCustomQuery] = (0, react_1.useState)(false);
    const [inputKey, setInputKey] = (0, react_1.useState)(0);
    // Initialization
    (0, react_1.useEffect)(() => {
        let database;
        try {
            database = new db_js_1.DBService(dbPath);
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
    (0, ink_1.useInput)((input, key) => {
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
        return (0, jsx_runtime_1.jsx)(ink_1.Text, { children: "Loading database..." });
    const colWidth = Math.max(12, Math.floor(70 / (columns.length || 1)));
    const visibleRowCount = 12;
    const startRow = Math.max(0, selectedRowIdx - Math.floor(visibleRowCount / 2));
    const endRow = startRow + visibleRowCount;
    const visibleData = tableData.slice(startRow, endRow);
    const dbName = dbPath.split(/[/\\]/).pop();
    return ((0, jsx_runtime_1.jsxs)(ink_1.Box, { flexDirection: "column", height: 26, padding: 1, children: [(0, jsx_runtime_1.jsxs)(ink_1.Box, { justifyContent: "space-between", marginBottom: 1, children: [(0, jsx_runtime_1.jsx)(ink_1.Text, { bold: true, color: COLORS.primary, children: dbName }), (0, jsx_runtime_1.jsxs)(ink_1.Text, { color: COLORS.muted, children: ["Tables: ", tables.length] })] }), (0, jsx_runtime_1.jsxs)(ink_1.Box, { flexDirection: "row", flexGrow: 1, children: [(0, jsx_runtime_1.jsxs)(ink_1.Box, { width: 25, flexDirection: "column", marginRight: 2, children: [(0, jsx_runtime_1.jsxs)(ink_1.Box, { borderBottom: true, borderStyle: "single", borderColor: COLORS.secondary, borderTop: false, borderLeft: false, borderRight: false, paddingBottom: 0, children: [(0, jsx_runtime_1.jsx)(ink_1.Text, { color: COLORS.muted, bold: true, children: "TABLES" }), activePane === 'sidebar' && (0, jsx_runtime_1.jsx)(ink_1.Text, { color: COLORS.primary, children: " [ACTIVE]" })] }), (0, jsx_runtime_1.jsx)(ink_1.Box, { flexDirection: "column", flexGrow: 1, marginTop: 1, children: tables.map((t, i) => {
                                    const isSelected = i === selectedTableIdx;
                                    let str = ` ≡ ${t.name}`;
                                    if (isSelected) {
                                        str = str.padEnd(23, ' ') + ' >';
                                    }
                                    else {
                                        str = str.padEnd(25, ' ');
                                    }
                                    return ((0, jsx_runtime_1.jsx)(ink_1.Box, { children: (0, jsx_runtime_1.jsx)(ink_1.Text, { backgroundColor: isSelected ? COLORS.primary : undefined, color: isSelected ? COLORS.black : COLORS.text, bold: isSelected, children: str }) }, t.name));
                                }) }), (0, jsx_runtime_1.jsxs)(ink_1.Box, { flexDirection: "column", borderTop: true, borderStyle: "single", borderColor: COLORS.secondary, borderBottom: false, borderLeft: false, borderRight: false, paddingTop: 1, children: [(0, jsx_runtime_1.jsxs)(ink_1.Text, { color: COLORS.primary, children: [tables[selectedTableIdx]?.name, " schema"] }), (0, jsx_runtime_1.jsxs)(ink_1.Text, { color: COLORS.muted, wrap: "truncate", children: ["<", currentSchema.map(c => `${c.name} ${c.type}`).join(', '), ">"] })] })] }), (0, jsx_runtime_1.jsxs)(ink_1.Box, { flexGrow: 1, flexDirection: "column", borderLeft: true, borderStyle: "single", borderColor: activePane === 'data' ? COLORS.primary : COLORS.secondary, borderTop: false, borderBottom: false, borderRight: false, paddingLeft: 2, overflow: "hidden", children: [(0, jsx_runtime_1.jsxs)(ink_1.Box, { justifyContent: "space-between", marginBottom: 1, children: [(0, jsx_runtime_1.jsxs)(ink_1.Text, { color: COLORS.primary, bold: true, children: ["\u2637 Browsing: ", isCustomQuery ? 'Custom Query' : tables[selectedTableIdx]?.name] }), (0, jsx_runtime_1.jsxs)(ink_1.Text, { color: COLORS.muted, children: [tableData.length, " rows returned"] })] }), activePane === 'card' && tableData.length > 0 ? ((0, jsx_runtime_1.jsxs)(ink_1.Box, { flexDirection: "column", padding: 1, children: [(0, jsx_runtime_1.jsx)(ink_1.Text, { bold: true, color: COLORS.warning, children: "--- Row Details ---" }), columns.map(c => ((0, jsx_runtime_1.jsxs)(ink_1.Box, { marginTop: 1, flexDirection: "column", children: [(0, jsx_runtime_1.jsxs)(ink_1.Text, { bold: true, color: COLORS.primary, children: [c, ":"] }), (0, jsx_runtime_1.jsx)(ink_1.Text, { color: COLORS.text, children: String(tableData[selectedRowIdx][c] ?? 'NULL') })] }, c)))] })) : ((0, jsx_runtime_1.jsxs)(ink_1.Box, { flexDirection: "column", flexGrow: 1, children: [(0, jsx_runtime_1.jsx)(ink_1.Box, { flexDirection: "row", borderBottom: true, borderStyle: "single", borderColor: COLORS.secondary, borderTop: false, borderLeft: false, borderRight: false, children: columns.map(c => {
                                            const innerWidth = colWidth - 1;
                                            let str = ` ${c}`;
                                            if (str.length > innerWidth)
                                                str = str.substring(0, innerWidth - 1) + '…';
                                            str = str.padEnd(innerWidth, ' ');
                                            return ((0, jsx_runtime_1.jsx)(ink_1.Box, { width: colWidth, borderRight: true, borderStyle: "single", borderColor: COLORS.secondary, borderTop: false, borderBottom: false, borderLeft: false, children: (0, jsx_runtime_1.jsx)(ink_1.Text, { bold: true, color: COLORS.text, children: str }) }, c));
                                        }) }), visibleData.map((row, i) => {
                                        const actualIdx = startRow + i;
                                        const isSelected = actualIdx === selectedRowIdx && activePane === 'data';
                                        return ((0, jsx_runtime_1.jsx)(ink_1.Box, { flexDirection: "row", children: columns.map(c => {
                                                const innerWidth = colWidth - 1;
                                                const rawVal = String(row[c] ?? 'NULL');
                                                let str = ` ${rawVal}`;
                                                if (str.length > innerWidth)
                                                    str = str.substring(0, innerWidth - 1) + '…';
                                                str = str.padEnd(innerWidth, ' ');
                                                return ((0, jsx_runtime_1.jsx)(ink_1.Box, { width: colWidth, borderRight: true, borderStyle: "single", borderColor: COLORS.secondary, borderTop: false, borderBottom: false, borderLeft: false, children: (0, jsx_runtime_1.jsx)(ink_1.Text, { backgroundColor: isSelected ? COLORS.primary : undefined, color: isSelected ? COLORS.black : COLORS.text, children: str }) }, c));
                                            }) }, actualIdx));
                                    })] }))] })] }), (0, jsx_runtime_1.jsxs)(ink_1.Box, { flexDirection: "column", marginTop: 1, borderStyle: "single", borderColor: activePane === 'console' ? COLORS.primary : COLORS.secondary, children: [(0, jsx_runtime_1.jsx)(ink_1.Box, { paddingX: 1, children: (0, jsx_runtime_1.jsx)(ink_1.Text, { color: COLORS.muted, bold: true, children: "SQL QUERY EDITOR" }) }), (0, jsx_runtime_1.jsxs)(ink_1.Box, { flexDirection: "row", paddingX: 1, children: [(0, jsx_runtime_1.jsx)(ink_1.Text, { color: COLORS.primary, bold: true, children: "\u03BB " }), (0, jsx_runtime_1.jsx)(ink_text_input_1.default, { value: query, onChange: setQuery, focus: activePane === 'console', onSubmit: handleConsoleSubmit }, inputKey), activePane === 'console' && suggestion && (0, jsx_runtime_1.jsx)(ink_1.Text, { color: COLORS.muted, children: suggestion })] })] }), (0, jsx_runtime_1.jsxs)(ink_1.Box, { flexDirection: "row", marginTop: 1, justifyContent: "space-between", children: [(0, jsx_runtime_1.jsxs)(ink_1.Box, { children: [(0, jsx_runtime_1.jsx)(ink_1.Text, { color: COLORS.primary, bold: true, children: "[Q] " }), (0, jsx_runtime_1.jsx)(ink_1.Text, { color: COLORS.text, children: "Quit  " }), (0, jsx_runtime_1.jsx)(ink_1.Text, { color: COLORS.primary, bold: true, children: "[Tab] " }), (0, jsx_runtime_1.jsxs)(ink_1.Text, { color: COLORS.text, children: [activePane === 'console' && suggestion ? 'Autocomplete' : 'Switch Pane', "  "] }), (0, jsx_runtime_1.jsx)(ink_1.Text, { color: COLORS.primary, bold: true, children: "[Enter] " }), (0, jsx_runtime_1.jsx)(ink_1.Text, { color: COLORS.text, children: "Select/Run  " }), (0, jsx_runtime_1.jsx)(ink_1.Text, { color: COLORS.primary, bold: true, children: "[Esc] " }), (0, jsx_runtime_1.jsx)(ink_1.Text, { color: COLORS.text, children: isCustomQuery ? 'Reset View' : 'Back' })] }), queryResult && (0, jsx_runtime_1.jsx)(ink_1.Text, { color: COLORS.primary, children: queryResult }), queryError && (0, jsx_runtime_1.jsx)(ink_1.Text, { color: COLORS.warning, children: queryError })] })] }));
}
