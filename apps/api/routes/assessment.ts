import express, { Router } from 'express';
import assessmentController from '../controllers/assessmentController';
import { verifyToken } from '../middlewares/auth';
//import fileUpload from 'express-fileupload';

const router: Router = express.Router();

// Configure file upload for assessment routes
// router.use(fileUpload({
//   createParentPath: true,
//   limits: {
//     fileSize: 10 * 1024 * 1024, // 10MB limit
//   },
//   abortOnLimit: true,
//   responseOnLimit: "File size limit has been reached",
// }));

// Protected routes (require authentication)
router.use(verifyToken);
// Image upload route
router.post('/upload-image', assessmentController.uploadQuestionImage);

// Assessment CRUD routes
router.post('/create', assessmentController.createAssessment);
router.get('/list', assessmentController.getAssessments);
router.get('/:id', assessmentController.getAssessmentById);
router.put('/:id', assessmentController.updateAssessment);
router.delete('/:id', assessmentController.deleteAssessment);



// Publish/Unpublish routes
router.post('/:id/publish', assessmentController.publishAssessment);
router.post('/:id/unpublish', assessmentController.unpublishAssessment);

export default router; 