import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { 
  Database, 
  Table, 
  Search, 
  RefreshCw, 
  ArrowLeft, 
  CheckCircle2, 
  Users, 
  FileText, 
  Briefcase, 
  GraduationCap,
  Edit2,
  Trash2,
  X,
  Check,
  Plus,
  AlertCircle
} from 'lucide-react';

interface TableSummary {
  tableName: string;
  count: number;
}

interface ColumnMeta {
  column_name: string;
  data_type: string;
}

export const DatabaseAdmin: React.FC = () => {
  const navigate = useNavigate();
  const [tables, setTables] = useState<TableSummary[]>([]);
  const [selectedTable, setSelectedTable] = useState<string>('users');
  const [columns, setColumns] = useState<ColumnMeta[]>([]);
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Edit State
  const [editingRow, setEditingRow] = useState<any | null>(null);
  const [editFormData, setEditFormData] = useState<Record<string, any>>({});
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Delete State
  const [rowToDelete, setRowToDelete] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  const fetchTables = async () => {
    try {
      const data = await api.adminGet<{ tables: TableSummary[] }>('/admin/tables-summary');
      if (data.tables) {
        setTables(data.tables);
      }
    } catch (e) {
      console.error('Failed to load tables summary', e);
    }
  };

  const fetchTableData = async (tableName: string) => {
    setLoading(true);
    try {
      const data = await api.adminGet<{ rows: any[]; columns: ColumnMeta[] }>(`/admin/table-data/${tableName}`);
      if (data.rows && data.columns) {
        setColumns(data.columns);
        setRows(data.rows);
      }
    } catch (e) {
      console.error('Failed to load table rows', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTables();
  }, []);

  useEffect(() => {
    if (selectedTable) {
      setEditingRow(null);
      setRowToDelete(null);
      fetchTableData(selectedTable);
    }
  }, [selectedTable]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchTables(), fetchTableData(selectedTable)]);
    setRefreshing(false);
  };

  // Open Edit Modal
  const handleStartEdit = (row: any) => {
    setEditingRow(row);
    const initialData: Record<string, any> = {};
    columns.forEach((col) => {
      const val = row[col.column_name];
      if (val !== null && val !== undefined && typeof val === 'object') {
        initialData[col.column_name] = JSON.stringify(val, null, 2);
      } else {
        initialData[col.column_name] = val === null || val === undefined ? '' : String(val);
      }
    });
    setEditFormData(initialData);
  };

  // Save Edit
  const handleSaveEdit = async () => {
    if (!editingRow) return;
    setIsSaving(true);
    setFeedbackMsg(null);

    try {
      const payload: Record<string, any> = {};
      for (const col of columns) {
        if (col.column_name === 'id') continue;
        const rawVal = editFormData[col.column_name];

        if (col.data_type === 'jsonb' || col.data_type === 'json') {
          try {
            payload[col.column_name] = rawVal ? JSON.parse(rawVal) : [];
          } catch {
            setFeedbackMsg({ type: 'error', text: `Invalid JSON format in field "${col.column_name}"` });
            setIsSaving(false);
            return;
          }
        } else if (col.data_type === 'boolean') {
          payload[col.column_name] = rawVal === 'true' || rawVal === true;
        } else if (col.data_type === 'integer' || col.data_type === 'numeric') {
          payload[col.column_name] = rawVal === '' ? null : Number(rawVal);
        } else {
          payload[col.column_name] = rawVal;
        }
      }

      const data = await api.adminPut(`/admin/table-data/${selectedTable}/${editingRow.id}`, payload);

      if (!data || (!data.success && !data.updatedRow)) {
        throw new Error(data.error || 'Failed to update record');
      }

      setFeedbackMsg({ type: 'success', text: `Record ${editingRow.id} successfully updated!` });
      setTimeout(() => {
        setEditingRow(null);
        setFeedbackMsg(null);
      }, 1000);

      await Promise.all([fetchTables(), fetchTableData(selectedTable)]);
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.message || 'Error updating record' });
    } finally {
      setIsSaving(false);
    }
  };

  // Delete Row
  const handleConfirmDelete = async () => {
    if (!rowToDelete) return;
    setIsDeleting(true);

    try {
      const data = await api.adminDelete(`/admin/table-data/${selectedTable}/${rowToDelete.id}`);

      if (!data) {
        throw new Error(data.error || 'Failed to delete record');
      }

      setRowToDelete(null);
      await Promise.all([fetchTables(), fetchTableData(selectedTable)]);
    } catch (err: any) {
      alert(`Delete error: ${err.message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  // Filter rows based on search input
  const filteredRows = rows.filter((row) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return Object.values(row).some((val) => {
      if (val === null || val === undefined) return false;
      if (typeof val === 'object') return JSON.stringify(val).toLowerCase().includes(query);
      return String(val).toLowerCase().includes(query);
    });
  });

  const getTableIcon = (name: string) => {
    switch (name) {
      case 'users':
        return <Users className="w-4 h-4 text-sky-400" />;
      case 'students':
        return <GraduationCap className="w-4 h-4 text-emerald-400" />;
      case 'jobs':
        return <Briefcase className="w-4 h-4 text-amber-400" />;
      case 'applications':
        return <FileText className="w-4 h-4 text-purple-400" />;
      default:
        return <Table className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col antialiased font-sans">
      
      {/* Top Django-Style Admin Navigation Header */}
      <header className="bg-slate-900 border-b border-slate-800 px-6 py-3.5 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold transition-all border border-slate-700 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Portal</span>
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-base font-extrabold tracking-tight text-white flex items-center gap-2">
                <span>S.P.A.R.K. Database Administration</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  PostgreSQL 18 Live
                </span>
              </h1>
              <p className="text-[11px] text-slate-400 font-mono">avishkar_db @ localhost:5432</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-sm disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Refresh Data</span>
          </button>
        </div>
      </header>

      {/* Main Layout: Sidebar Tables + Main Data Table */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Left Sidebar: Tables List (Django style) */}
        <aside className="w-64 bg-slate-900/70 border-r border-slate-800/80 p-4 flex flex-col space-y-4 overflow-y-auto">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500 mb-2 px-2">
              Database Tables
            </p>
            <div className="space-y-1">
              {tables.map((t) => {
                const isSelected = selectedTable === t.tableName;
                return (
                  <button
                    key={t.tableName}
                    onClick={() => setSelectedTable(t.tableName)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all text-left cursor-pointer ${
                      isSelected
                        ? 'bg-blue-600/20 text-blue-300 border border-blue-500/40 shadow-xs'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      {getTableIcon(t.tableName)}
                      <span className="capitalize">{t.tableName.replace('_', ' ')}</span>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${
                      isSelected ? 'bg-blue-500/30 text-blue-200' : 'bg-slate-800 text-slate-500'
                    }`}>
                      {t.count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Connection Metadata Box */}
          <div className="mt-auto p-3 bg-slate-800/40 rounded-2xl border border-slate-800 text-[11px] space-y-1.5 text-slate-400">
            <p className="font-bold text-slate-300">Connection Info</p>
            <p><span className="text-slate-500">Host:</span> localhost:5432</p>
            <p><span className="text-slate-500">DB:</span> avishkar_db</p>
            <p><span className="text-slate-500">User:</span> postgres</p>
          </div>
        </aside>

        {/* Center: Table View and Search */}
        <main className="flex-1 flex flex-col overflow-hidden p-6">
          
          {/* Action & Filter Bar */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-sm font-bold text-white capitalize">
                Table: <span className="text-blue-400 font-mono">{selectedTable}</span>
              </span>
              <span className="text-xs text-slate-400">
                ({filteredRows.length} {filteredRows.length === 1 ? 'row' : 'rows'} returned)
              </span>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                Click any row or Edit button to update
              </span>
            </div>

            {/* Quick Search */}
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search across all fields..."
                className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Data Grid */}
          <div className="flex-1 bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden flex flex-col shadow-inner">
            {loading ? (
              <div className="flex-1 flex items-center justify-center text-slate-400 text-xs gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-blue-400" />
                <span>Querying PostgreSQL {selectedTable}...</span>
              </div>
            ) : filteredRows.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-500 text-xs">
                <Database className="w-8 h-8 text-slate-700 mb-2" />
                <p>No records found in table "{selectedTable}".</p>
              </div>
            ) : (
              <div className="flex-1 overflow-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="sticky top-0 bg-slate-950 border-b border-slate-800 z-10">
                    <tr>
                      <th className="px-3 py-3 font-mono font-bold text-[11px] text-slate-300 uppercase tracking-wider text-center bg-slate-950 w-24">
                        Actions
                      </th>
                      {columns.map((col) => (
                        <th 
                          key={col.column_name}
                          className="px-4 py-3 font-mono font-bold text-[11px] text-slate-300 uppercase tracking-wider whitespace-nowrap bg-slate-950"
                        >
                          <div className="flex items-center gap-1.5">
                            <span>{col.column_name}</span>
                            <span className="text-[9px] text-slate-500 lowercase font-normal">({col.data_type})</span>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-sans">
                    {filteredRows.map((row, rIdx) => (
                      <tr 
                        key={rIdx} 
                        className="hover:bg-slate-800/60 transition-colors group cursor-pointer"
                        onDoubleClick={() => handleStartEdit(row)}
                      >
                        {/* Row Actions */}
                        <td className="px-3 py-3 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStartEdit(row);
                              }}
                              className="p-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 hover:text-blue-300 border border-blue-500/30 transition-all cursor-pointer"
                              title="Edit this record"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setRowToDelete(row);
                              }}
                              className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 border border-rose-500/30 transition-all cursor-pointer"
                              title="Delete this record"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>

                        {columns.map((col) => {
                          const val = row[col.column_name];
                          let displayVal: React.ReactNode = '-';
                          
                          if (val !== null && val !== undefined) {
                            if (typeof val === 'boolean') {
                              displayVal = val ? (
                                <span className="inline-flex items-center gap-1 text-emerald-400 font-bold">
                                  <CheckCircle2 className="w-3.5 h-3.5" /> true
                                </span>
                              ) : (
                                <span className="text-slate-500 font-bold">false</span>
                              );
                            } else if (typeof val === 'object') {
                              displayVal = (
                                <pre className="font-mono text-[10px] text-slate-300 max-w-xs truncate bg-slate-950/60 px-2 py-0.5 rounded border border-slate-800">
                                  {JSON.stringify(val)}
                                </pre>
                              );
                            } else {
                              displayVal = String(val);
                            }
                          }

                          return (
                            <td 
                              key={col.column_name}
                              className="px-4 py-3 text-slate-200 whitespace-nowrap max-w-sm truncate"
                              title={typeof val === 'object' ? JSON.stringify(val) : String(val)}
                              onClick={() => handleStartEdit(row)}
                            >
                              {displayVal}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </main>
      </div>

      {/* Edit Record Drawer / Modal */}
      {editingRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-slate-900 rounded-3xl border border-slate-800 shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                  <Edit2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    Edit Record ({selectedTable})
                  </h3>
                  <p className="text-[11px] text-slate-400 font-mono">
                    ID: {editingRow.id}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setEditingRow(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form Fields */}
            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              {feedbackMsg && (
                <div className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                  feedbackMsg.type === 'success' 
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                    : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                }`}>
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{feedbackMsg.text}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                {columns.map((col) => {
                  const isId = col.column_name === 'id';
                  const isJson = col.data_type === 'jsonb' || col.data_type === 'json';
                  const isBoolean = col.data_type === 'boolean';

                  return (
                    <div 
                      key={col.column_name} 
                      className={isJson ? 'sm:col-span-2 space-y-1' : 'space-y-1'}
                    >
                      <div className="flex items-center justify-between">
                        <label className="font-bold text-slate-300 font-mono text-[11px]">
                          {col.column_name}
                        </label>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {col.data_type} {isId ? '(Primary Key - Read Only)' : ''}
                        </span>
                      </div>

                      {isId ? (
                        <input
                          type="text"
                          value={editFormData[col.column_name] || ''}
                          disabled
                          className="w-full px-3 py-2 bg-slate-950/60 border border-slate-800/80 rounded-xl text-slate-500 font-mono text-xs cursor-not-allowed"
                        />
                      ) : isBoolean ? (
                        <select
                          value={String(editFormData[col.column_name])}
                          onChange={(e) => setEditFormData({ ...editFormData, [col.column_name]: e.target.value === 'true' })}
                          className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:outline-none focus:border-blue-500"
                        >
                          <option value="true">true</option>
                          <option value="false">false</option>
                        </select>
                      ) : isJson ? (
                        <textarea
                          rows={4}
                          value={editFormData[col.column_name] || ''}
                          onChange={(e) => setEditFormData({ ...editFormData, [col.column_name]: e.target.value })}
                          placeholder="JSON format: [] or {}"
                          className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono text-[11px] focus:outline-none focus:border-blue-500"
                        />
                      ) : (
                        <input
                          type="text"
                          value={editFormData[col.column_name] || ''}
                          onChange={(e) => setEditFormData({ ...editFormData, [col.column_name]: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:outline-none focus:border-blue-500"
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Footer Actions */}
            <div className="p-4 border-t border-slate-800 bg-slate-950 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setEditingRow(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={isSaving}
                className="flex items-center gap-1.5 px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-md disabled:opacity-50 cursor-pointer"
              >
                {isSaving ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Save Changes to PostgreSQL</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {rowToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-slate-900 rounded-3xl border border-rose-500/30 shadow-2xl max-w-md w-full p-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-bold text-white">Delete Record from {selectedTable}?</h3>
              <p className="text-xs text-slate-400">
                Are you sure you want to permanently delete record <span className="font-mono text-white font-bold">{rowToDelete.id}</span>? This action is irreversible.
              </p>
            </div>

            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRowToDelete(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition-all shadow-md disabled:opacity-50 cursor-pointer"
              >
                {isDeleting ? 'Deleting...' : 'Yes, Delete Record'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
