const express = require("express");
const router = express.Router();
const db = require("./database"); // Ensure this points to your database connection
const mysql = require('mysql');
const multer = require('multer');
const mammoth = require('mammoth');
const upload = multer({ dest: 'uploads/' });
const path = require('path');
const fsPromises = require('fs').promises;
const cheerio = require('cheerio');
const cors = require('cors'); // Import the cors package
const pool = require('./database');
// Use CORS
router.use(cors());

const { promisify } = require('util');

// Promisify the database query for easier async/await usage
const query = promisify(db.query).bind(db);

router.get('/exams', async (req, res) => {
    try {
        const [results] = await db.query('SELECT * FROM exams');

        res.json(results);
    } catch (err) {
        console.error('Error:', err);
        return res.status(500).send('Error fetching exams');
    }
});



router.get('/subjectsForExams/:exam_id', async (req, res) => {
    const { exam_id } = req.params;
    try {
        // Modify the query to include a LEFT JOIN to get subject names
        const query = `
            SELECT s.subject_id, s.subject_name 
            FROM examwithsubjects es
            LEFT JOIN subjects s ON es.subject_id = s.subject_id 
            WHERE es.exam_id = ?`;

        const [results] = await db.query(query, [exam_id]);

        res.json(results);
    } catch (err) {
        console.error('Error:', err);
        return res.status(500).send('Error fetching subjects');
    }
});



// ______________ Present Working code __________________________________

async function insertRecord(document, data) {
    const [result] = await db.query(`INSERT INTO ${document} SET ?`, data);
    return result.insertId;
}


router.post('/uploadDocument', upload.single('document'), async (req, res) => {
    const outputDir = path.join(__dirname, 'uploads');
    const filePath = req.file.path;
    let questionLevelIdFromText
 
    try {
        await fsPromises.mkdir(outputDir, { recursive: true });
 
        const result = await mammoth.convertToHtml({ path: filePath });
        const htmlContent = result.value;
        const textResult = await mammoth.extractRawText({ path: filePath });
        const textContent = textResult.value;
 
        const textSections = textContent.split('\n\n');
        const { selectedSubjects } = req.body;
        const documentName = req.file.originalname;
        const topicName = req.body.topicName;
 
        const topicId = await insertRecord('topics', {
            subject_id: selectedSubjects,
            topic_name: topicName,
        });
 
        const documentResult = await insertRecord('documents', {
            doc_name: documentName,
            subject_id: selectedSubjects,
            topic_id: topicId,
        });
        const documentId = documentResult;
        const QUESTION_TYPES = {
            MCQ4: 1,
            MCQ5: 2,
            NATD:3,
            NATI:4
           
        };
       
        const images = [];
        const $ = cheerio.load(htmlContent);
        $('img').each((i, element) => {
            const base64Data = $(element).attr('src').replace(/^data:image\/\w+;base64,/, '');
            if (base64Data) {
                const imageBuffer = Buffer.from(base64Data, 'base64');
                images.push(imageBuffer);
            }
        });
 
        let question_code = '';
        let question_id = 0;
        let solution_id = 0;
        let imageIndex = 0;
        let qnlevel_id = null;
        let k = 1;
 
        for (let i = 0; i < textSections.length; i++) {
            if (textSections[i].includes('[QID]')) {
                question_code = textSections[i].replace('[QID]', '').trim();
                const questionCodeData = { question_code, doc_id: documentId };
                await insertRecord('question_code_table', questionCodeData);
            }
            const qnlevel_name = textSections[i].replace('[QL]', '').trim();
            if (qnlevel_name === 'Easy') {
                questionLevelIdFromText = 1;
            }
            else if (qnlevel_name === 'Medium') {
                questionLevelIdFromText = 2;
            }
            else if (qnlevel_name === 'Hard') {
                questionLevelIdFromText = 3;
            }
 
            else if (textSections[i].includes('[Q]')) {
                let questionImagePath = '';
                if (imageIndex < images.length) {
                    const imageName = `snapshot_${documentId}_question_${k}.png`;
                    const imagePath = path.join(outputDir, imageName);
                    await fsPromises.writeFile(imagePath, images[imageIndex]);
                    questionImagePath = imageName;
                    imageIndex++;
                    k++;
                }
                const questionData = { question_code, question_img: questionImagePath, subject_id: selectedSubjects, qnlevel_id: questionLevelIdFromText };
                question_id = await insertRecord('questions', questionData);
            }
     
            else if (textSections[i].includes('[QANS]')) {
                const answerText = textSections[i].replace('[QANS]', '').trim();
                const answerData = { answer_text: answerText, question_id: question_id };
                await insertRecord('answers', answerData);
            }
            else if (textSections[i].includes('[QTYPE]')) {
                const questionType = textSections[i].replace('[QTYPE]', '').trim();
           
                // Check if the question type is a constant
                if (QUESTION_TYPES[questionType]) {
                    const questionTypeId = QUESTION_TYPES[questionType];
           
                    // Insert into the qtype table with question_id and question_type_id
                    const qTypeData = { question_id: question_id, question_type_id: questionTypeId };
                    await insertRecord('qtype', qTypeData);
                } else {
                    console.error(`Unknown question type: ${questionType}`);
                }
            }
           
 
            else if (textSections[i].includes('[QSOL]')) {
                let solutionImagePath = '';
                if (imageIndex < images.length) {
                    const imageName = `snapshot_${documentId}_solution_${k}.png`;
                    const imagePath = path.join(outputDir, imageName);
                    await fsPromises.writeFile(imagePath, images[imageIndex]);
                    solutionImagePath = imageName;
                    imageIndex++;
                    k++;
                }
                const solutionData = { question_id: question_id, solution_img: solutionImagePath };
                solution_id = await insertRecord('solution', solutionData);
            }
            else if (textSections[i].includes('[QVSOL]')) {
                if (solution_id) {
                    const solution_link = textSections[i].replace('[QVSOL]', '').trim();
                    const videoSolutionData = { solution_id: solution_id, video_sol_link: solution_link };
                    await insertRecord('video_solution', videoSolutionData);
                } else {
                    console.error('Solution ID not found for video solution');
                }
            }
            else if (['(a)', '(b)', '(c)', '(d)'].some(option => textSections[i].startsWith(option))) {
                const optionText = textSections[i].trim();
                let optionImagePath = '';
                if (imageIndex < images.length) {
                    const imageName = `snapshot_${documentId}_option_${k}.png`;
                    const imagePath = path.join(outputDir, imageName);
                    await fsPromises.writeFile(imagePath, images[imageIndex]);
                    optionImagePath = imageName;
                    imageIndex++;
                    k++;
                }
                const optionData = { question_id: question_id, option_index: optionText, option_img: optionImagePath };
                await insertRecord('options', optionData);
            }
        }
 
        res.send('Document uploaded and processed successfully.');
    } catch (error) {
        console.error('Error during document processing:', error);
        res.status(500).send('Failed to upload and process the document.');
    }
});









module.exports = router;

