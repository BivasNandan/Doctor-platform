import { Sparkles } from "lucide-react";

export default function EmptyState({ title, description, action, icon: Icon = Sparkles }) {
  return (
    <div className="empty-state">
      <div className="empty-icon">
        <Icon size={22} />
      </div>
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  );
}
