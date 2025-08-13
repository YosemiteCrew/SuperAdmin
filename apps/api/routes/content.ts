import express, { Router } from "express";
import contentController from "../controllers/contentController";

const router: Router = express.Router();

router.post("/department/addDepartment", contentController.addDepartment);
router.post("/department/updateDepartment", contentController.updateDepartment);
router.post("/department/deleteDepartment", contentController.deleteDepartment);
router.post("/department/getSingleDepartment", contentController.getSingleDepartment);
router.post("/department/getDepartments", contentController.getDepartments);

export default router;
