const dotenv = require("dotenv");
const path = require("path");
// Load environment variables
dotenv.config({ path: path.resolve(__dirname, "../.env") });

// Since server.js and app.js are in the same 'src' folder, use "./app"
const app = require("./app");

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Production Server listening on port ${PORT}`);
});