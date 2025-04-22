"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = __importDefault(require("./app"));
const config_1 = require("./config");
const dbConnection_1 = __importDefault(require("./dbConfig/dbConnection"));
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
app_1.default.use("/api/v1/auth", auth_routes_1.default);
// run server
(0, dbConnection_1.default)()
    .then(() => {
    app_1.default.listen(config_1.port, () => {
        console.log(`Server is running on: http://localhost:${config_1.port}`);
    });
})
    .catch((err) => {
    console.error("Database connection failed:", err);
    process.exit(1);
});
