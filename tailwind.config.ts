import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "Urbanist",
          "Plus Jakarta Sans",
          "Outfit",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          '"Segoe UI"',
          "Roboto",
          "sans-serif",
        ],
      },
      colors: {
        base: {
          bg: "#F4F4F1", // Warm off-white page background
          card: "#FFFFFF", // Pure white card
          cardWarm: "#FAFAF8", // Warm white card
          panel: "#EBEBE8", // Contextual drawer light grey panel
          border: "#ECECE8", // 1px subtle divider
        },
        charcoal: {
          900: "#2B2B2B", // Soft charcoal for headings and primary buttons
          800: "#3D3D3D", // Slightly lighter charcoal for hover
          700: "#4F4F4F",
          muted: "#8A8A8A", // Soft grey for secondary text
          light: "#B5B5B2",
        },
        pastel: {
          lavender: "#E3D6EE", // Lavender accent / KPI 1
          lavenderDeep: "#4A3B69",
          lavenderRail: "#DCD3EC",
          blue: "#C7D8EA", // Baby blue accent / KPI 2
          blueDeep: "#2C4866",
          blueRail: "#D0DEEE",
          yellow: "#F8DA7A", // Butter yellow accent / KPI 3
          yellowDeep: "#614E14",
          sage: "#D2E7D6", // Soft sage
          sageDeep: "#2E5E37",
          peach: "#FAD5C0", // Soft peach
          peachDeep: "#6E3E20",
          blush: "#F5D3D8", // Soft blush
          blushDeep: "#6B2D38",
        },
        status: {
          pendingBg: "#FFF3E6",
          pendingText: "#B25E00",
          pendingBorder: "#FFE2C2",
          readyBg: "#E3F9ED",
          readyText: "#157347",
          readyBorder: "#C1EED5",
          rejectedBg: "#FCE8E8",
          rejectedText: "#A72828",
          rejectedBorder: "#F7C3C3",
          submittedBg: "#E0F8FB",
          submittedText: "#007380",
          submittedBorder: "#B5EEF6",
          ideaBg: "#F0F0EE",
          ideaText: "#555555",
          ideaBorder: "#E2E2DE",
        },
      },
      boxShadow: {
        soft: "0 4px 20px -2px rgba(0, 0, 0, 0.04), 0 2px 6px -1px rgba(0, 0, 0, 0.02)",
        softHover: "0 8px 30px -4px rgba(0, 0, 0, 0.08), 0 4px 10px -2px rgba(0, 0, 0, 0.03)",
        drawer: "-4px 0 30px -4px rgba(0, 0, 0, 0.06)",
        pill: "0 2px 8px -1px rgba(0, 0, 0, 0.05)",
      },
      borderRadius: {
        "2xl": "20px",
        "3xl": "24px",
        "4xl": "28px",
      },
    },
  },
  plugins: [],
};
export default config;

