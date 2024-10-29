const express = require('express');
// const mysql = require('mysql');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const mysql = require('mysql2/promise');
const app = express();
const port = 5000;
// CORS configuration
app.use(cors({
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type'],
    credentials:true,
    
}));
app.use(express.json());
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, `${Date.now()}${ext}`);
    }
});
const upload = multer({ storage });

const ExamCreation = require('./ExamCreation');
app.use('/ExamCreation', ExamCreation);

//start the server
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});