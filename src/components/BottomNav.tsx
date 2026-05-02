import { Camera, MessageCircle, Sprout, UsersRound } from "lucide-react";

export type Tab = "feed" | "plant" | "capture" | "friends" | "profile";

const items: Array<{
  tab: Exclude<Tab, "profile">;
  label: string;
  icon: typeof Camera;
}> = [
  { tab: "feed", label: "Feed", icon: MessageCircle },
  { tab: "plant", label: "Plant", icon: Sprout },
  { tab: "capture", label: "Post", icon: Camera },
  { tab: "friends", label: "Friends", icon: UsersRound },
];

export function BottomNav({
  active,
  onChange,
}: {
  active: Tab;
  onChange: (tab: Tab) => void;
}) {
  return (
    <nav className="bottom-nav" aria-label="Primary">
      {items.map(({ tab, label, icon: Icon }) => (
        <button
          className={active === tab ? "nav-item active" : "nav-item"}
          key={tab}
          onClick={() => onChange(tab)}
          title={label}
          type="button"
        >
          <Icon size={20} strokeWidth={2.3} />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  );
}
