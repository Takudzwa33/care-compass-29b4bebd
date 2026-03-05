import { useFeedback, usePatients } from "@/hooks/useDatabase";
import { Star, MessageSquare } from "lucide-react";

function Stars({ count }: { count: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} className={`w-4 h-4 ${i <= count ? "fill-warning text-warning" : "text-border"}`} />
      ))}
    </div>
  );
}

export default function PatientFeedback() {
  const { feedback, loading } = useFeedback();
  const { patients } = usePatients();

  // Also get feedback from patient records (patient_feedback_text column)
  const patientFeedbackTexts = patients
    .filter((p: any) => p.patient_feedback_text)
    .map((p: any) => ({
      id: `pt-${p.id}`,
      patient_name: p.full_name,
      created_at: p.updated_at || p.created_at,
      satisfaction: 0,
      nurse_responsiveness: 0,
      overall_experience: 0,
      comments: p.patient_feedback_text,
      isFromRecord: true,
    }));

  const avgSatisfaction = feedback.length > 0
    ? (feedback.reduce((s, f) => s + f.satisfaction, 0) / feedback.length).toFixed(1)
    : "N/A";
  const avgResponsiveness = feedback.length > 0
    ? (feedback.reduce((s, f) => s + f.nurse_responsiveness, 0) / feedback.length).toFixed(1)
    : "N/A";

  const allFeedback = [...feedback, ...patientFeedbackTexts.filter(
    pt => !feedback.some(f => f.comments === pt.comments && f.patient_name === pt.patient_name)
  )];

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Patient Feedback</h1>
        <p className="page-description">Treatment evaluation and satisfaction ratings (includes patient record feedback)</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div className="kpi-card text-center">
          <p className="text-sm text-muted-foreground mb-2">Avg Satisfaction</p>
          <p className="text-4xl font-bold">{avgSatisfaction}</p>
          {avgSatisfaction !== "N/A" && <div className="flex justify-center mt-2"><Stars count={Math.round(Number(avgSatisfaction))} /></div>}
        </div>
        <div className="kpi-card text-center">
          <p className="text-sm text-muted-foreground mb-2">Avg Nurse Responsiveness</p>
          <p className="text-4xl font-bold">{avgResponsiveness}</p>
          {avgResponsiveness !== "N/A" && <div className="flex justify-center mt-2"><Stars count={Math.round(Number(avgResponsiveness))} /></div>}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <span className="animate-spin w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full" />
        </div>
      ) : allFeedback.length === 0 ? (
        <div className="kpi-card text-center py-12">
          <p className="text-muted-foreground">No patient feedback yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          {allFeedback.map((f: any) => (
            <div key={f.id} className="kpi-card">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="font-medium flex items-center gap-2">
                    {f.patient_name}
                    {f.isFromRecord && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-accent text-accent-foreground flex items-center gap-1">
                        <MessageSquare className="w-3 h-3" /> From Patient Record
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">{new Date(f.created_at).toLocaleDateString()}</p>
                </div>
                {!f.isFromRecord && <Stars count={f.overall_experience} />}
              </div>
              {!f.isFromRecord && (
                <div className="grid grid-cols-2 gap-4 mb-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">Satisfaction: </span>
                    <span className="font-medium">{f.satisfaction}/5</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Nurse Responsiveness: </span>
                    <span className="font-medium">{f.nurse_responsiveness}/5</span>
                  </div>
                </div>
              )}
              {f.comments && (
                <p className="text-sm text-muted-foreground italic border-t border-border pt-3">"{f.comments}"</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
