// Local development entry point — NOT used by Vercel.
// Vercel invokes api/index.js directly as a serverless function.
import app from "./app.js";

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`SurakshaPay backend running at http://localhost:${PORT}`);
});
