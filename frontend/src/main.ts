import { createPinia } from "pinia";
import { createApp } from "vue";

import App from "./App.vue";
import { createAppRouter } from "./router";

import "@fontsource/inter/latin-400.css";
import "@fontsource/inter/latin-500.css";
import "@fontsource/inter/latin-700.css";
import "@fontsource/inter/latin-800.css";
import "@fontsource/m-plus-1p/400.css";
import "@fontsource/m-plus-1p/500.css";
import "@fontsource/m-plus-1p/700.css";
import "@fontsource/m-plus-1p/800.css";
import "basiq-ui/styles.css";
import "./styles/index.css";

const app = createApp(App);

app.use(createPinia());
app.use(createAppRouter());

app.mount("#app");
