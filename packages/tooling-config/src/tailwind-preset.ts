import typography from "@tailwindcss/typography";
import type { Config } from "tailwindcss";

const tailwindPreset = {
  theme: {
    extend: {
      colors: {
        ink: "#152233",
        mist: "#f4f7fb",
        signal: "#3a6ea5",
        accent: "#d67a5c"
      }
    }
  },
  plugins: [
    typography
  ]
} satisfies Partial<Config>;

export default tailwindPreset;
