import { Request, Response } from "express";
import {AdminDepartment} from "../models/adminDepartment"; // adjust path
import mongoose from "mongoose";

const contentController = {
  // ADD Department
  addDepartment: async (req: Request, res: Response): Promise<void> => {
    try {
      const { name, services, status } = req.body;

      if (!name) {
        res.status(400).json({ success: false, message: "Department name is required" });
        return;
      }

      const existingDept = await AdminDepartment.findOne({
        name: { $regex: `^${name}$`, $options: "i" },
      });

      if (existingDept) {
        res.status(400).json({ success: false, message: "Department name already exists" });
        return;
      }

      const formattedServices = (services || []).map((service: any) => ({
        _id: service._id || undefined,
        serviceName: service.serviceName,
        isActive: service.isActive !== undefined ? service.isActive : 1,
      }));

      const department = new AdminDepartment({
        name,
        status: status !== undefined ? status : 1,
        services: formattedServices,
      });

      await department.save();

      res.status(201).json({
        success: true,
        message: "Department added successfully",
        data: department,
      });
    } catch (err: any) {
      console.error("Department add error:", err);
      res.status(500).json({ success: false, message: "Department add failed", error: err.message });
    }
  },

  // UPDATE Department
  updateDepartment: async (req: Request, res: Response): Promise<void> => {
    try {
      const { id, name, services, status } = req.body;

      if (!id || !mongoose.Types.ObjectId.isValid(id)) {
        res.status(400).json({ success: false, message: "Valid department ID is required" });
        return;
      }

      const department = await AdminDepartment.findById(id);
      if (!department) {
        res.status(404).json({ success: false, message: "Department not found" });
        return;
      }

      if (name) {
        // check duplicate
        const duplicate = await AdminDepartment.findOne({
          _id: { $ne: id },
          name: { $regex: `^${name}$`, $options: "i" },
        });
        if (duplicate) {
          res.status(400).json({ success: false, message: "Department name already exists" });
          return;
        }
        department.name = name;
      }

      if (status !== undefined) department.status = status;
      if (services) {
        department.services = services.map((service: any) => ({
          _id: service._id || undefined,
          serviceName: service.serviceName,
          isActive: service.isActive !== undefined ? service.isActive : 1,
        }));
      }

      await department.save();

      res.status(200).json({
        success: true,
        message: "Department updated successfully",
        data: department,
      });
    } catch (err: any) {
      console.error("Department update error:", err);
      res.status(500).json({ success: false, message: "Department update failed", error: err.message });
    }
  },

  // DELETE Department
  deleteDepartment: async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.body;

      if (!id || !mongoose.Types.ObjectId.isValid(id)) {
        res.status(400).json({ success: false, message: "Valid department ID is required" });
        return;
      }

      const deleted = await AdminDepartment.findByIdAndDelete(id);

      if (!deleted) {
        res.status(404).json({ success: false, message: "Department not found" });
        return;
      }

      res.status(200).json({ success: true, message: "Department deleted successfully" });
    } catch (err: any) {
      console.error("Department delete error:", err);
      res.status(500).json({ success: false, message: "Department delete failed", error: err.message });
    }
  },

  // GET Single Department
  getSingleDepartment: async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.body;

      if (!id || !mongoose.Types.ObjectId.isValid(id)) {
        res.status(400).json({ success: false, message: "Valid department ID is required" });
        return;
      }

      const department = await AdminDepartment.findById(id);

      if (!department) {
        res.status(404).json({ success: false, message: "Department not found" });
        return;
      }

      res.status(200).json({ success: true, data: department });
    } catch (err: any) {
      console.error("Get single department error:", err);
      res.status(500).json({ success: false, message: "Get single department failed", error: err.message });
    }
  },

  // GET List of Departments
  getDepartments: async (req: Request, res: Response): Promise<void> => {
    try {
      const departments = await AdminDepartment.find().sort({ createdAt: -1 });
      res.status(200).json({ success: true, data: departments });
    } catch (err: any) {
      console.error("Get departments error:", err);
      res.status(500).json({ success: false, message: "Get departments failed", error: err.message });
    }
  },
};

export default contentController;
