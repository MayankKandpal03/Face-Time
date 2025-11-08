// Importing dependencies 
import express from 'express';
import mongoose from 'mongoose';
import {fileURLToPath} from 'url';
import path from 'path';
import methodOverride from 'method-override';

// Setting up path 
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// App object
const app = express();

// Middlewares
app.use(express.urlencoded({extended: true}));
app.use(express.json());
app.use(methodOverride("_method"));

// Connecting to database
async function connection(){
    await mongoose.connect("mongodb://localhost:27017/faceTime");
}

connection()
.then(console.log('Connection Established with Database'))
.catch((error)=> console.log("Error:", error))

