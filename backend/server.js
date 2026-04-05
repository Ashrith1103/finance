const app = require("./app");
const { connectDatabase } = require("./models");

const port = Number(process.env.PORT || 5000);

const startServer = async () => {
  try {
    await connectDatabase();

    app.listen(port, () => {
      console.log(`Server running on port ${port}`);
    });
  } catch (error) {
    const details = {
      name: error?.name || "UnknownError",
      message: error?.message || "No error message returned.",
      code: error?.original?.code || error?.parent?.code || error?.code || null
    };

    console.error("Failed to start server:", details);
    process.exit(1);
  }
};

startServer();
