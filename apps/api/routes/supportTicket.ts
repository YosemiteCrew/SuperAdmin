import express from 'express';
import supportTicketController from '../controllers/supportTicketController';
import { verifyToken } from '../middlewares/auth';

const router = express.Router();

router.use(verifyToken);
router.post('/create', supportTicketController.createTicket);
router.get('/', supportTicketController.getTickets);
router.get('/by-type/:userType', supportTicketController.getTicketsByUserType);
router.get('/counts/by-type', supportTicketController.getTicketCountsByUserType);
//router.get('/:id', supportTicketController.getTicketById);
router.patch('/:id/status', supportTicketController.updateTicketStatus);
router.get('/stats/overview', supportTicketController.getTicketStats);
router.delete('/:id', supportTicketController.deleteTicket);
router.get('/dashboard-stats', supportTicketController.getDashboardStats);
router.get('/unresolved', supportTicketController.getUnresolvedTickets);


export default router; 