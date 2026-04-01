import app from "./app.js";

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`SmartQueue backend running at http://localhost:${PORT}`);
});
