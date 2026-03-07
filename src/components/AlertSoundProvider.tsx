import { useEffect, useRef } from "react";
import { useAlerts } from "@/hooks/useDatabase";
import { toast } from "sonner";

const ALERT_SOUND_URL = "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdH2DgYF7dnR4fYGDgYF7dnN3fICDgoJ9eHV3e3+CgoJ9eHV3en+CgoN+eXZ4en6Bg4N/enZ4en6Bg4OAe3d4en6BgoOAfHh5en6BgoOBfHl5e36BgoKBfXp6e36AgoKBfXt7fH+AgoGBfnt7fH+AgoGBf3x8fX+AgoGBf3x8fX+AgoGBf3x8fX+AgoGBf3x8fX+AgoGAgH19fn+AgoGAf319fn+AgoGAf319fn+AgoGAf319fn+AgoGAf319fn+AgoGAf319fn+AgoGAf319fn+AgoGAf319fn+AgoGAf319fn+AgoGA";

export default function AlertSoundProvider() {
  const { alerts } = useAlerts();
  const prevCountRef = useRef(alerts.length);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    audioRef.current = new Audio(ALERT_SOUND_URL);
    audioRef.current.volume = 0.5;
  }, []);

  useEffect(() => {
    if (alerts.length > prevCountRef.current) {
      const newAlerts = alerts.slice(0, alerts.length - prevCountRef.current);
      newAlerts.forEach((alert) => {
        const isCritical = alert.alert_type === "critical";
        toast[isCritical ? "error" : alert.alert_type === "warning" ? "warning" : "info"](
          alert.message,
          {
            duration: isCritical ? 10000 : 5000,
            description: `${alert.alert_type.toUpperCase()} alert`,
          }
        );
        if (isCritical && audioRef.current && localStorage.getItem("alert-sound-enabled") !== "false") {
          audioRef.current.play().catch(() => {});
        }
      });
    }
    prevCountRef.current = alerts.length;
  }, [alerts]);

  return null;
}
