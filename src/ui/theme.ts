export const colors = {
  navy: "#102A43",
  navySoft: "#243B53",
  teal: "#0F766E",
  tealSoft: "#DDF3EF",
  coral: "#D96C4F",
  background: "#F3F6F8",
  surface: "#FFFFFF",
  text: "#243B53",
  muted: "#627D98",
  border: "#CBD5E1",
  warning: "#8A5200",
  warningBackground: "#FFF4D6",
  danger: "#B42318",
  dangerBackground: "#FDE8E7",
  target: "#F7F0DD",
} as const;

export const layout = {
  pagePadding: 20,
  sectionGap: 16,
  radius: 14,
  controlHeight: 48,
} as const;

export const shadows = {
  card: {
    shadowColor: "#102A43",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
} as const;

