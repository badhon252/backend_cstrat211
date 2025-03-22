import app from "./app";
import { port } from "./config";
import dbConfig from "./dbConfig/dbConnection";

// run server
app.listen(port, async () => {
  console.log(`Server is running on: http://localhost:${port}`);
  await dbConfig();
});
