"use client";

export type AppTab = "home" | "memories" | "wishes" | "profile";

type BottomNavigationProps = {
  activeTab: AppTab;
  onChange: (tab: AppTab) => void;
};

const items: Array<{
  id: AppTab;
  label: string;
  icon: string;
}> = [
  { id: "home", label: "首页", icon: "⌂" },
  { id: "memories", label: "相簿", icon: "◫" },
  { id: "wishes", label: "心愿", icon: "☆" },
  { id: "profile", label: "我的", icon: "○" },
];

export function BottomNavigation({
  activeTab,
  onChange,
}: BottomNavigationProps) {
  return (
    <nav className="bottom-navigation" aria-label="主导航">
      {items.map((item) => {
        const active = activeTab === item.id;

        return (
          <button
            key={item.id}
            type="button"
            className={`bottom-navigation-item${
              active ? " bottom-navigation-item-active" : ""
            }`}
            aria-current={active ? "page" : undefined}
            onClick={() => onChange(item.id)}
          >
            <span className="bottom-navigation-icon" aria-hidden="true">
              {item.icon}
            </span>
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
