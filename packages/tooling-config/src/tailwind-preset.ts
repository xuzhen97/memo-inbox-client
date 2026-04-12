import typography from "@tailwindcss/typography";
import type { Config } from "tailwindcss";

const tailwindPreset = {
  theme: {
    fontFamily: {
      serif: ['Newsreader', 'Songti', 'serif'],
      sans: ['Manrope', 'Heiti', 'sans-serif'],
    },
    extend: {
      colors: {
        ink: "#152233",
        mist: "#f4f7fb",
        signal: "#3a6ea5",
        accent: "#d67a5c",
        surface: "#fcf9f4",
        "surface-container-lowest": "#ffffff",
        "surface-container-low": "#f6f3ee",
        "surface-container": "#f0ede9",
        "surface-container-high": "#e5e1db",
        primary: "#0d2225",
        "primary-container": "#23373a",
        "on-primary": "#ffffff",
        "on-surface": "#1c1c19",
        "on-surface-variant": "#444746",
        "outline-variant": "#c2c7c8",
        "cloud-blue-gray": "#D9E4E8",
        success: "#738A72",
        review: "#C9A46A"
      }
    }
  },
  plugins: [
    typography
  ]
} satisfies Partial<Config>;

export default tailwindPreset;
