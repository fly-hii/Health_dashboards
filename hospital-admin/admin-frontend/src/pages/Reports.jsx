import { useState, useEffect } from 'react';
import { 
  BarChart3, 
  FileText, 
  FileSpreadsheet, 
  ArrowRight, 
  Download, 
  Clock, 
  CheckCircle 
} from 'lucide-react';
import { toast } from 'react-toastify';
import API from '../services/api';

export default function Reports() {
  const [reportType, setReportType] = useState('Patient');
  const [reportFormat, setReportFormat] = useState('CSV');
  const [title, setTitle] = useState('Quarterly Patients Summary');
  const [reportsList, setReportsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const fetchReportsHistory = async () => {
    try {
      const res = await API.get('/reports');
      if (res.data.success) {
        setReportsList(res.data.data);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load reports audit logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportsHistory();
  }, []);

  const handleGenerateReport = async (e) => {
    e.preventDefault();
    setGenerating(true);

    try {
      const res = await API.post('/reports', {
        title,
        type: reportType,
        format: reportFormat,
        parameters: { date: new Date() }
      });

      if (res.data.success) {
        toast.success(`Report '${title}' generated successfully`);
        
        // Trigger Client Side download
        triggerClientDownload(res.data.data, title, reportFormat);

        setTitle('');
        fetchReportsHistory();
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to generate report export');
    } finally {
      setGenerating(false);
    }
  };

  // Simulated Client Side CSV/Text File Formatter and Downloader
  const triggerClientDownload = (dataList, reportTitle, format) => {
    if (!dataList || dataList.length === 0) return toast.warning('No data to export for this report type');

    let fileContent = '';
    let mimeType = 'text/plain';
    let extension = 'txt';

    if (format === 'CSV' || format === 'Excel') {
      mimeType = 'text/csv;charset=utf-8,';
      extension = 'csv';
      
      // Determine columns based on keys
      const sample = dataList[0];
      const headers = Object.keys(sample).filter(k => typeof sample[k] !== 'object');
      const rows = dataList.map(item => headers.map(h => item[h]));
      
      fileContent = [headers.join(','), ...rows.map(r => r.map(v => `"${v}"`).join(','))].join('\n');
    } else {
      // Simple simulated text PDF formatting
      extension = 'txt';
      fileContent = `=======================================\n`;
      fileContent += `   CAREPLUS HEALTHCARE REPORT EXPORT\n`;
      fileContent += `   TITLE: ${reportTitle}\n`;
      fileContent += `   DATE: ${new Date().toLocaleString()}\n`;
      fileContent += `=======================================\n\n`;
      fileContent += JSON.stringify(dataList, null, 2);
    }

    const encodedUri = encodeURI("data:" + mimeType + fileContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${reportTitle.replace(/\s+/g, '_')}_${Date.now()}.${extension}`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Download started for ${reportTitle}.${extension}`);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      {/* LEFT COLUMN: Report Config Form (Col span 5) */}
      <div className="lg:col-span-5 bg-white border border-slate-200 rounded-card p-6 shadow-sm space-y-6">
        <div>
          <h2 className="text-lg font-bold text-slate-800 tracking-tight font-sans">Generate Reports</h2>
          <p className="text-xs text-slate-400 mt-0.5">Select filters and template layouts to export data.</p>
        </div>

        <form onSubmit={handleGenerateReport} className="space-y-4 text-xs">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Report Title*</label>
            <input
              type="text"
              required
              placeholder="e.g. Q2 Operational Compliance Summary"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:border-primary"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Report Type*</label>
              <select
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:border-primary"
              >
                <option value="Patient">Patient Demographics</option>
                <option value="Doctor">Doctor Roster & Schedules</option>
                <option value="Appointment">Appointments History</option>
                <option value="Revenue">Financial Collection Reports</option>
                <option value="Pharmacy">Pharmacy Order Logs</option>
                <option value="Lab">Laboratory Diagnostics</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Download Format*</label>
              <select
                value={reportFormat}
                onChange={(e) => setReportFormat(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:border-primary"
              >
                <option value="CSV">Comma Separated (CSV)</option>
                <option value="Excel">Excel Spreadsheet (.xlsx)</option>
                <option value="PDF">Formatted Document (PDF)</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={generating}
            className="flex items-center justify-center gap-2 w-full py-3 bg-primary hover:bg-primary-hover text-white text-xs font-semibold rounded-xl transition-all shadow-md shadow-primary/20"
          >
            <span>{generating ? 'Exporting...' : 'Compile & Download Report'}</span>
            {!generating && <Download className="w-4 h-4" />}
          </button>
        </form>
      </div>

      {/* RIGHT COLUMN: Past Reports History (Col span 7) */}
      <div className="lg:col-span-7 bg-white border border-slate-200 rounded-card p-6 shadow-sm space-y-6">
        <div>
          <h2 className="text-lg font-bold text-slate-800 tracking-tight font-sans">Report Compilation Archives</h2>
          <p className="text-xs text-slate-400 mt-0.5">Historical compiled document exports logged</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-6">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary"></div>
          </div>
        ) : reportsList.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-6">No previous report records logged</p>
        ) : (
          <div className="space-y-3">
            {reportsList.map((rep) => (
              <div key={rep._id} className="p-4 border border-slate-100 rounded-xl flex items-center justify-between hover:border-slate-200 transition-all">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-slate-100 rounded-lg">
                    {rep.format === 'PDF' ? (
                      <FileText className="w-5 h-5 text-rose-500" />
                    ) : (
                      <FileSpreadsheet className="w-5 h-5 text-emerald-500" />
                    )}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-700">{rep.title}</h4>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Compiled by: {rep.generatedBy?.name || 'Administrator'} &bull; Format: {rep.format}
                    </p>
                  </div>
                </div>

                <div className="text-right space-y-1">
                  <span className="text-[10px] text-slate-400 block">
                    {new Date(rep.createdAt).toLocaleDateString()}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                    <CheckCircle className="w-3 h-3" />
                    <span>Success</span>
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
