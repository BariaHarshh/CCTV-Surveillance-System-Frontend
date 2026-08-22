export const EMPLOYMENT_TYPES = [
  "Full Time",
  "Part Time",
  "Contract",
  "Temporary",
  "Other",
] as const;

export const STAFF_PERMISSIONS = {
  dashboard: ["dashboard:view"],
  organization: ["org:view"],
  monitoring: [
    "monitoring:cameras",
    "monitoring:alerts",
    "monitoring:events",
  ],
  reports: ["reports:view", "reports:export"],
  security: ["security:activity"],
} as const;

export const ALL_STAFF_PERMISSIONS = Object.values(STAFF_PERMISSIONS).flat();

export const DEFAULT_STAFF_PERMISSIONS = [
  "dashboard:view",
  "org:view",
  "monitoring:alerts",
  "reports:view",
];

export const STAFF_PERMISSION_LABELS: Record<string, string> = {
  "dashboard:view": "View Dashboard",
  "org:view": "View Organization",
  "monitoring:cameras": "View Cameras",
  "monitoring:alerts": "View Alerts",
  "monitoring:events": "View Events",
  "reports:view": "View Reports",
  "reports:export": "Export Reports",
  "security:activity": "View Security Activity",
};
