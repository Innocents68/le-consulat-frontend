import { FileDown, FileSpreadsheet } from 'lucide-react';
import { downloadExport } from '../../features/reporting/reportingApi';
import { useToast } from './Toast';
import { apiErrorMessage } from '../../lib/api';
import { useState } from 'react';

export default function ExportButtons({ endpoint, filenamePrefix = 'rapport' }) {
  const toast = useToast();
  const [loading, setLoading] = useState(null);

  async function handle(format) {
    setLoading(format);
    try {
      await downloadExport(endpoint, format, `${filenamePrefix}.${format === 'excel' ? 'xlsx' : 'pdf'}`);
    } catch (e) {
      toast.error(apiErrorMessage(e, "L'export n'a pas pu être généré."));
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="flex gap-2">
      <button className="btn-secondary" onClick={() => handle('pdf')} disabled={loading === 'pdf'}>
        <FileDown size={15} /> PDF
      </button>
      <button className="btn-secondary" onClick={() => handle('excel')} disabled={loading === 'excel'}>
        <FileSpreadsheet size={15} /> Excel
      </button>
    </div>
  );
}
