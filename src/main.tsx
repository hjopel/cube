import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  // <React.StrictMode>
  <App />
  // </React.StrictMode>,
  // react strict mode renders this twice in dev, causing the app to create two devices and messing up the renderpipeline etc
);
