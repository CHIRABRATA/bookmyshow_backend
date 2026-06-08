const dotenv = require("dotenv");
// Load environment variables
dotenv.config();

// Since server.js and app.js are in the same 'src' folder, use "./app"
const app = require("./app");

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Production Server listening on port ${PORT}`);
});