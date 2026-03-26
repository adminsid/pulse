'use client';

interface ExportButtonProps {
  url: string;
  filename?: string;
}

export default function ExportButton({ url, filename = 'timesheet.csv' }: ExportButtonProps) {
  const handleExport = async () => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('pulse_token') : null;
      const res = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
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
      Export CSV
    </button>
  );
}
