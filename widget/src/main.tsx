import { render } from "preact";
import App from "./App";
import styles from "./styles.css?inline";

const container = document.createElement("div");
container.id = "clank-widget-container";
document.body.appendChild(container);

const shadow = container.attachShadow({ mode: "closed" });

const styleEl = document.createElement("style");
styleEl.textContent = styles;
shadow.appendChild(styleEl);

const root = document.createElement("div");
shadow.appendChild(root);

render(<App />, root);
