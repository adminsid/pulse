'use client';

interface ExportButtonProps {
  data: any[];
  columns: { header: string; key: string }[];
  filename?: string;
  label?: string;
}

export default function ExportButton({ data, columns, filename = 'export.csv', label = 'Export CSV' }: ExportButtonProps) {
  const handleExport = () => {
    try {
      if (!data || data.length === 0) return;

      // Create CSV content
      const headers = columns.map(col => col.header).join(',');
      const rows = data.map(item => {
        return columns.map(col => {
          const val = item[col.key] || '';
          return typeof val === 'string' ? `"${val.replace(/"/g, '""')}"` : val;
        }).join(',');
      });
      
      const csvContent = [headers, ...rows].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const objectUrl = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(objectUrl);
    } catch (err) {
      console.error('Export error:', err);
    }
  };

  return (
    <button
      onClick={handleExport}
      className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition-colors"
    >
      <span>↓</span>
      {label}
    </button>
  );
}

