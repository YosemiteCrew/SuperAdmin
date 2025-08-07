import express, { Request, Response, Router } from 'express';
import businessController from '../controllers/businessController';

const router: Router = express.Router();

// All Business
router.post('/allbusiness', businessController.allBusiness);
router.post('/pendingVerifications', businessController.pendingVerifications);




export default router;