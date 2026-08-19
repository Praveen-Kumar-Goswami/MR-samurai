import { createRoot } from "react-dom/client";
import { RoninFilm } from "../app/ronin-film";
import "../app/globals.css";
import "../app/ronin.css";

const root = document.getElementById("root");

if (!root) {
  throw new Error("RONIN root element was not found.");
}

createRoot(root).render(<RoninFilm />);
