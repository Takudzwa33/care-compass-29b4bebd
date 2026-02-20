import { useFeedback } from "@/hooks/useDatabase";
import { Star } from "lucide-react";

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

  const avgSatisfaction = feedback.length > 0
    ? (feedback.reduce((s, f) => s + f.satisfaction, 0) / feedback.length).toFixed(1)
    : "N/A";
  const avgResponsiveness = feedback.length > 0
    ? (feedback.reduce((s, f) => s + f.nurse_responsiveness, 0) / feedback.length).toFixed(1)
    : "N/A";

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Patient Feedback</h1>
        <p className="page-description">Treatment evaluation and satisfaction ratings</p>
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
      ) : feedback.length === 0 ? (
        <div className="kpi-card text-center py-12">
          <p className="text-muted-foreground">No patient feedback yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          {feedback.map((f) => (
            <div key={f.id} className="kpi-card">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="font-medium">{f.patient_name}</p>
                  <p className="text-xs text-muted-foreground">{new Date(f.created_at).toLocaleDateString()}</p>
                </div>
                <Stars count={f.overall_experience} />
              </div>
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
