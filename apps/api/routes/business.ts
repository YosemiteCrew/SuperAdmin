import express, { Request, Response, Router } from 'express';
import businessController from '../controllers/businessController';

const router: Router = express.Router();

// Existing routes
router.post('/allbusiness', businessController.allBusiness);
router.post('/pendingVerifications', businessController.pendingVerifications);
router.get('/details/:id', businessController.getBusinessDetails);
router.post('/approve/:id', businessController.approveBusiness);

// Route with file upload support (no multer needed)
router.post('/rejectWithEmail', businessController.rejectWithEmail);

export default router;