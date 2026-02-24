import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useWards } from "@/hooks/useDatabase";
import { Upload, FileText, CheckCircle, AlertTriangle, XCircle, Loader2, Download } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

const dateRegex = /^\d{4}-\d{2}-\d{2}/;

const patientRowSchema = z.object({
  patient_code: z.string().trim().min(1, "Patient code required").max(50),
  full_name: z.string().trim().min(1, "Name required").max(200),
  severity: z.enum(["Critical", "Serious", "Moderate", "Stable"]).default("Stable"),
  ward: z.string().trim().optional(),
  admission_date: z.string().trim().refine(v => !v || dateRegex.test(v), "Must be YYYY-MM-DD format").optional(),
  discharge_date: z.string().trim().refine(v => !v || dateRegex.test(v), "Must be YYYY-MM-DD format").optional(),
  date_of_birth: z.string().trim().refine(v => !v || dateRegex.test(v), "Must be YYYY-MM-DD format").optional(),
  gender: z.enum(["Male", "Female", "Other", "Unknown", ""]).default("Unknown"),
  blood_type: z.enum(["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", ""]).optional(),
  diagnosis: z.string().trim().max(500).optional(),
  insurance_id: z.string().trim().max(100).optional(),
  emergency_contact: z.string().trim().max(200).optional(),
  medical_record_number: z.string().trim().max(100).optional(),
});

const nurseRowSchema = z.object({
  nurse_code: z.string().trim().min(1, "Nurse code required").max(50),
  full_name: z.string().trim().min(1, "Name required").max(200),
  role_title: z.string().trim().default("Nurse"),
  ward: z.string().trim().optional(),
  shift: z.enum(["Day", "Night"]).default("Day"),
  status: z.enum(["On-Duty", "Off-Duty"]).default("On-Duty"),
  license_number: z.string().trim().max(100).optional(),
  specialization: z.string().trim().max(200).optional(),
  years_of_experience: z.string().trim().refine(v => !v || (!isNaN(Number(v)) && Number(v) >= 0), "Must be a non-negative number").optional(),
  contact_number: z.string().trim().max(50).optional(),
});

type ValidationError = { row: number; field: string; message: string; rowData?: Record<string, string> };
type ImportState = "idle" | "parsing" | "validated" | "importing" | "done" | "error";

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/\s+/g, "_"));
  return lines.slice(1).map((line) => {
    const values = line.split(",").map((v) => v.trim().replace(/^"|"$/g, ""));
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = values[i] || ""; });
    return row;
  });
}

function downloadCSV(errors: ValidationError[], rows: Record<string, string>[]) {
  const errorRowNums = new Set(errors.map(e => e.row));
  const errorRows = rows.filter((_, i) => errorRowNums.has(i + 2));
  if (errorRows.length === 0) return;
  const headers = Object.keys(errorRows[0]);
  const csv = [
    [...headers, "validation_errors"].join(","),
    ...errorRows.map((row, idx) => {
      const rowNum = Array.from(errorRowNums)[idx];
      const rowErrors = errors.filter(e => e.row === rowNum).map(e => `${e.field}: ${e.message}`).join("; ");
      return [...headers.map(h => `"${(row[h] || "").replace(/"/g, '""')}"`), `"${rowErrors}"`].join(",");
    }),
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "rejected_rows.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export default function EMRImport() {
  const { user } = useAuth();
  const { wards } = useWards();
  const fileRef = useRef<HTMLInputElement>(null);
  const [target, setTarget] = useState<"patients" | "nurses">("patients");
  const [state, setState] = useState<ImportState>("idle");
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [validCount, setValidCount] = useState(0);
  const [fileName, setFileName] = useState("");
  const [importResult, setImportResult] = useState({ inserted: 0, failed: 0 });
  const [duplicates, setDuplicates] = useState<number[]>([]);

  if (user?.role !== "admin") {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-muted-foreground">Admin access required for EMR data import.</p>
      </div>
    );
  }

  const wardMap = Object.fromEntries(wards.map((w) => [w.name.toLowerCase(), w.id]));

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setState("parsing");
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const parsed = parseCSV(text);
      setRows(parsed);
      validateRows(parsed);
    };
    reader.readAsText(file);
  };

  const validateRows = (data: Record<string, string>[]) => {
    const errs: ValidationError[] = [];
    const schema = target === "patients" ? patientRowSchema : nurseRowSchema;
    let valid = 0;
    const codeField = target === "patients" ? "patient_code" : "nurse_code";
    const seenCodes = new Map<string, number>();
    const dupeRows: number[] = [];

    data.forEach((row, i) => {
      const code = row[codeField]?.trim();
      // Duplicate detection
      if (code) {
        if (seenCodes.has(code)) {
          dupeRows.push(i + 2);
          errs.push({ row: i + 2, field: codeField, message: `Duplicate code "${code}" (first seen row ${seenCodes.get(code)})`, rowData: row });
        } else {
          seenCodes.set(code, i + 2);
        }
      }
      const result = schema.safeParse(row);
      if (!result.success) {
        result.error.issues.forEach((issue) => {
          errs.push({ row: i + 2, field: issue.path.join("."), message: issue.message, rowData: row });
        });
      } else if (!dupeRows.includes(i + 2)) {
        valid++;
      }
    });

    setDuplicates(dupeRows);
    setErrors(errs);
    setValidCount(valid);
    setState("validated");
  };

  const doImport = async () => {
    setState("importing");
    const schema = target === "patients" ? patientRowSchema : nurseRowSchema;
    let inserted = 0;
    let failed = 0;
    const batchErrors: any[] = [];

    for (let i = 0; i < rows.length; i++) {
      if (duplicates.includes(i + 2)) { failed++; continue; }
      const result = schema.safeParse(rows[i]);
      if (!result.success) { failed++; continue; }
      const d = result.data;
      try {
        if (target === "patients") {
          const pd = d as z.infer<typeof patientRowSchema>;
          const wardId = pd.ward ? wardMap[pd.ward.toLowerCase()] || null : null;
          const { error } = await supabase.from("patients").insert({
            patient_code: pd.patient_code, full_name: pd.full_name, severity: pd.severity,
            ward_id: wardId, admission_date: pd.admission_date || new Date().toISOString(),
            discharge_date: pd.discharge_date || null, date_of_birth: pd.date_of_birth || null,
            gender: pd.gender || "Unknown", blood_type: pd.blood_type || null,
            diagnosis: pd.diagnosis || null, insurance_id: pd.insurance_id || null,
            emergency_contact: pd.emergency_contact || null, medical_record_number: pd.medical_record_number || null,
            import_source: "csv", imported_at: new Date().toISOString(),
          } as any);
          if (error) { failed++; batchErrors.push({ row: i + 2, error: error.message }); }
          else inserted++;
        } else {
          const nd = d as z.infer<typeof nurseRowSchema>;
          const wardId = nd.ward ? wardMap[nd.ward.toLowerCase()] || null : null;
          const { error } = await supabase.from("nurses").insert({
            nurse_code: nd.nurse_code, full_name: nd.full_name, role_title: nd.role_title || "Nurse",
            ward_id: wardId, shift: nd.shift || "Day", status: nd.status || "On-Duty",
            license_number: nd.license_number || null, specialization: nd.specialization || null,
            years_of_experience: nd.years_of_experience ? parseInt(nd.years_of_experience) : 0,
            contact_number: nd.contact_number || null, import_source: "csv", imported_at: new Date().toISOString(),
          } as any);
          if (error) { failed++; batchErrors.push({ row: i + 2, error: error.message }); }
          else inserted++;
        }
      } catch { failed++; }
    }

    await (supabase.from("emr_import_batches" as any) as any).insert({
      file_name: fileName, target_table: target, total_rows: rows.length,
      valid_rows: inserted, error_rows: failed, errors: batchErrors,
      status: failed === rows.length ? "failed" : "completed",
      imported_by: user?.id, completed_at: new Date().toISOString(),
    });

    setImportResult({ inserted, failed });
    setState("done");
    toast.success(`Imported ${inserted} ${target} records`);
  };

  const reset = () => {
    setState("idle"); setRows([]); setErrors([]); setValidCount(0);
    setFileName(""); setImportResult({ inserted: 0, failed: 0 }); setDuplicates([]);
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">EMR Data Import</h1>
        <p className="page-description">Import patient and nurse data from CSV files with validation and audit logging</p>
      </div>

      <div className="kpi-card mb-6">
        <div className="flex items-center gap-4 mb-4">
          <label className="text-sm font-medium">Import Target:</label>
          <div className="flex gap-2">
            {(["patients", "nurses"] as const).map((t) => (
              <button key={t} onClick={() => { setTarget(t); reset(); }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${target === t ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent"}`}>
                {t === "patients" ? "Patients" : "Nurses"}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-muted/50 rounded-lg p-4 mb-4">
          <p className="text-xs font-medium text-muted-foreground mb-2">Expected CSV columns for {target}:</p>
          <p className="text-xs text-muted-foreground font-mono">
            {target === "patients"
              ? "patient_code, full_name, severity, ward, admission_date, discharge_date, date_of_birth, gender, blood_type, diagnosis, insurance_id, emergency_contact, medical_record_number"
              : "nurse_code, full_name, role_title, ward, shift, status, license_number, specialization, years_of_experience, contact_number"}
          </p>
        </div>

        {(state === "idle" || state === "parsing") && (
          <label className="flex flex-col items-center justify-center border-2 border-dashed border-border rounded-xl p-12 cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-colors">
            <Upload className="w-10 h-10 text-muted-foreground mb-3" />
            <span className="text-sm font-medium mb-1">{state === "parsing" ? "Parsing..." : "Click to upload CSV file"}</span>
            <span className="text-xs text-muted-foreground">Supports .csv files</span>
            <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFile} />
          </label>
        )}

        {state === "validated" && (
          <div className="space-y-4">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">{fileName}</span>
              </div>
              <span className="text-sm text-muted-foreground">{rows.length} total rows</span>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <CheckCircle className="w-5 h-5 text-emerald-500" />
                <div><p className="text-sm font-medium">{validCount} Valid</p><p className="text-xs text-muted-foreground">Ready to import</p></div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                <XCircle className="w-5 h-5 text-destructive" />
                <div><p className="text-sm font-medium">{rows.length - validCount} Invalid</p><p className="text-xs text-muted-foreground">Will be skipped</p></div>
              </div>
              {duplicates.length > 0 && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-warning/10 border border-warning/20">
                  <AlertTriangle className="w-5 h-5 text-warning" />
                  <div><p className="text-sm font-medium">{duplicates.length} Duplicates</p><p className="text-xs text-muted-foreground">Duplicate codes found</p></div>
                </div>
              )}
            </div>

            {errors.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-medium text-muted-foreground">Validation Errors:</p>
                  <button onClick={() => downloadCSV(errors, rows)}
                    className="flex items-center gap-1.5 text-xs text-primary hover:underline">
                    <Download className="w-3.5 h-3.5" /> Download Rejected Rows
                  </button>
                </div>
                <div className="max-h-48 overflow-y-auto bg-muted/50 rounded-lg p-3">
                  {errors.slice(0, 50).map((err, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs py-1">
                      <AlertTriangle className="w-3 h-3 text-amber-500 mt-0.5 shrink-0" />
                      <span>Row {err.row}: <strong>{err.field}</strong> — {err.message}</span>
                    </div>
                  ))}
                  {errors.length > 50 && <p className="text-xs text-muted-foreground mt-2">...and {errors.length - 50} more errors</p>}
                </div>
              </div>
            )}

            {/* Full preview table */}
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Data Preview:</p>
              <div className="overflow-x-auto max-h-64 overflow-y-auto border rounded-lg">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-muted">
                    <tr className="border-b border-border">
                      <th className="text-left py-2 px-3 font-medium text-muted-foreground">Status</th>
                      <th className="text-left py-2 px-3 font-medium text-muted-foreground">#</th>
                      {rows[0] && Object.keys(rows[0]).map((k) => (
                        <th key={k} className="text-left py-2 px-3 font-medium text-muted-foreground">{k}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.slice(0, 20).map((row, i) => {
                      const hasError = errors.some(e => e.row === i + 2);
                      const isDupe = duplicates.includes(i + 2);
                      return (
                        <tr key={i} className={`border-b border-border/50 ${hasError || isDupe ? "bg-destructive/5" : ""}`}>
                          <td className="py-2 px-3">
                            {hasError || isDupe ? <XCircle className="w-3.5 h-3.5 text-destructive" /> : <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />}
                          </td>
                          <td className="py-2 px-3 text-muted-foreground">{i + 1}</td>
                          {Object.values(row).map((v, j) => (
                            <td key={j} className="py-2 px-3 max-w-[150px] truncate">{v || "—"}</td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {rows.length > 20 && <p className="text-xs text-muted-foreground p-3">Showing 20 of {rows.length} rows</p>}
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={doImport} disabled={validCount === 0}
                className="px-5 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 transition">
                Import {validCount} Valid Records
              </button>
              <button onClick={reset} className="px-5 py-2.5 bg-muted text-muted-foreground rounded-lg text-sm font-medium hover:bg-accent transition">Cancel</button>
            </div>
          </div>
        )}

        {state === "importing" && (
          <div className="flex flex-col items-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary mb-3" />
            <p className="text-sm font-medium">Importing records...</p>
            <p className="text-xs text-muted-foreground">Each record is validated and audit-logged</p>
          </div>
        )}

        {state === "done" && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <CheckCircle className="w-6 h-6 text-emerald-500" />
              <div>
                <p className="font-medium">Import Complete</p>
                <p className="text-sm text-muted-foreground">{importResult.inserted} inserted, {importResult.failed} failed — all changes are audit-logged</p>
              </div>
            </div>
            <button onClick={reset} className="px-5 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition">Import Another File</button>
          </div>
        )}
      </div>
    </div>
  );
}
