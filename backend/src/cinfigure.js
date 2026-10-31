const mongoose = require("mongoose");

async function main() {
    const connectionString = process.env.DB_CONNECT_STRING || process.env.MONGO_URI;
    if (!connectionString) {
        throw new Error("DB_CONNECT_STRING or MONGO_URI must be defined in the environment.");
    }
    await mongoose.connect(connectionString)

}
module.exports = {
    main
}