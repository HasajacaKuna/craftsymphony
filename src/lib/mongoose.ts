import mongoose from "mongoose";


const MONGODB_URI = process.env.MONGODB_URI as string;
if (!MONGODB_URI) throw new Error("Brak MONGODB_URI w .env.local");


declare global {
// zapobiega wielokrotnym połączeniom w trybie hot-reload
var _mongooseConn: Promise<typeof mongoose> | undefined;
}


export default function dbConnect() {
if (!global._mongooseConn) {
global._mongooseConn = mongoose.connect(MONGODB_URI, { dbName: "craftsymphony" });
}
return global._mongooseConn;
}