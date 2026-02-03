import { Request, Response } from "express";
import mongoose from "mongoose";
import { Assessment } from "../models/adminAssessment";
import AWS from 'aws-sdk';
import fs from 'fs';
import path from 'path';

// Configure AWS
AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || 'us-east-1',
});

const s3 = new AWS.S3();
const S3_BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME || '';



// S3 Upload function
async function uploadToS3(fileName: string): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      const fileContent = fs.readFileSync(fileName);
      const params = {
        Bucket: S3_BUCKET_NAME,
        Key: fileName,
        Body: fileContent,
        ContentType: 'image/jpeg',
        ContentDisposition: 'inline',
      };
      console.log("fileName", fileName);

      s3.upload(params, async function (err: Error, data: { Location: string }) {
        if (err) {
          reject(err);
        } else {
          const location = data.Location;
          console.log("location", location);
          // Delete from local
          try {
            fs.unlinkSync(fileName);
          } catch (unlinkError) {
            console.error('Error deleting local file:', unlinkError);
          }
          resolve(location);
        }
      });
    } catch (error) {
      reject(error);
    }
  });
}

// Extend Request interface for user
interface RequestWithUser extends Request {
  user?: {
    id: string;
    email: string;
  };
}

const assessmentController = {
  // Create new assessment
  createAssessment: async (req: RequestWithUser, res: Response): Promise<void> => {
    try {
      const { name, type, category, description, questions, painScores, isPublished, isDraft, scheduleDate} = req.body;
      const createdBy = req.user?.id || 'admin'; // Get from auth middleware

      // Validate required fields
      if (!name || !type || !category || !questions || questions.length === 0) {
        res.status(400).json({
          success: false,
          message: "Missing required fields"
        });
        return;
      }

      // Validate questions
      for (const question of questions) {
        if (!question.question || !question.question.trim()) {
          res.status(400).json({
            success: false,
            message: "All questions must have content"
          });
          return;
        }
      }

       // Validate pain scores
       if (painScores && painScores.length > 0) {
        for (const painScore of painScores) {
          if (!painScore.title || !painScore.title.trim()) {
            res.status(400).json({
              success: false,
              message: "All pain score options must have a title"
            });
            return;
          }
          if (!painScore.selectedNumbers || painScore.selectedNumbers.length === 0) {
            res.status(400).json({
              success: false,
              message: "All pain score options must have at least one selected number"
            });
            return;
          }
          // Validate selected numbers are between 1-10
          for (const num of painScore.selectedNumbers) {
            if (num < 1 || num > 10) {
              res.status(400).json({
                success: false,
                message: "Pain score numbers must be between 1 and 10"
              });
              return;
            }
          }
        }
      }

      // Validate scheduled date is in the future
     if (scheduleDate) {
      const scheduledDateCheck = new Date(scheduleDate);
      if (scheduledDateCheck <= new Date()) {
        res.status(400).json({
          success: false,
          message: "Scheduled publish date must be in the future"
        });
        return;
      }
     }

      const assessment = new Assessment({
        name,
        type,
        category,
        description,
        questions,
        painScores: painScores || [],
        isPublished: isPublished || false,
        isDraft: isDraft || false,
        isSchedule: {
            type: isPublished ? 'none' : ('scheduled'),
            date: scheduleDate || null
          },
        createdBy
      });

      await assessment.save();

      res.status(201).json({
        success: true,
        message: isPublished ? "Assessment published successfully" : "Assessment saved as draft",
        data: assessment
      });
    } catch (error) {
      console.error('Error creating assessment:', error);
      res.status(500).json({
        success: false,
        message: "Error creating assessment"
      });
    }
  },

  // Get all assessments with pagination
  getAssessments: async (req: Request, res: Response): Promise<void> => {
    try {
      const { page = 1, limit = 10, status = 'all', search = '', category, statusFilter } = req.query;
      const skip = (Number(page) - 1) * Number(limit);

      const query: any = {};

      // Filter by status
      if (status === 'published') {
        query.isPublished = true;
      } else if (status === 'unpublished') {
        query.isPublished = false;
      }

     

      // Filter by category
      if (category && category !== 'all') {
        query.category = category;
      }

    
      // Filter by schedule status (isSchedule.type)
      if (statusFilter && statusFilter !== 'all') {
        query['isSchedule.type'] = statusFilter; // can be "scheduled" | "work-in-progress" | "pending"
      }

      // Search functionality
      if (search && typeof search === 'string') {
        query.$or = [
          { name: { $regex: search, $options: 'i' } },
          { category: { $regex: search, $options: 'i' } },
          { type: { $regex: search, $options: 'i' } }
        ];
      }

      const assessments = await Assessment.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        //.select('-questions') // Don't include questions in list view
        .lean(); 

      const total = await Assessment.countDocuments(query);
      const totalPages = Math.ceil(total / Number(limit));
      res.status(200).json({
        success: true,
        data: assessments,
        pagination: {
          currentPage: Number(page),
          totalPages: Math.ceil(total / Number(limit)),
          totalItems: total,
          itemsPerPage: Number(limit)
        }
      });

      // res.status(200).json({
      //   success: true,
      //   data: {
      //     assessments,
      //     totalPages,
      //     currentPage: Number(page),
      //     total
      //   }
      // });
    } catch (error) {
      console.error('Error fetching assessments:', error);
      res.status(500).json({
        success: false,
        message: "Error fetching assessments"
      });
    }
  },

  // Get single assessment by ID
  getAssessmentById: async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(400).json({
          success: false,
          message: "Invalid assessment ID"
        });
        return;
      }

      const assessment = await Assessment.findById(id);
      if (!assessment) {
        res.status(404).json({
          success: false,
          message: "Assessment not found"
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: assessment
      });
    } catch (error) {
      console.error('Error fetching assessment:', error);
      res.status(500).json({
        success: false,
        message: "Error fetching assessment"
      });
    }
  },

  // Update assessment
  updateAssessment: async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { name, type, category, description, questions, painScores, isPublished } = req.body;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(400).json({
          success: false,
          message: "Invalid assessment ID"
        });
        return;
      }

      const assessment = await Assessment.findById(id);
      if (!assessment) {
        res.status(404).json({
          success: false,
          message: "Assessment not found"
        });
        return;
      }

       // Validate pain scores if provided
    if (painScores && painScores.length > 0) {
      for (const painScore of painScores) {
        if (!painScore.title || !painScore.title.trim()) {
          res.status(400).json({
            success: false,
            message: "All pain score options must have a title"
          });
          return;
        }
        if (!painScore.selectedNumbers || painScore.selectedNumbers.length === 0) {
          res.status(400).json({
            success: false,
            message: "All pain score options must have at least one selected number"
          });
          return;
        }
        // Validate selected numbers are between 1-10
        for (const num of painScore.selectedNumbers) {
          if (num < 1 || num > 10) {
            res.status(400).json({
              success: false,
              message: "Pain score numbers must be between 1 and 10"
            });
            return;
          }
        }
      }
    }

      // Update fields
      if (name !== undefined) assessment.name = name;
      if (type !== undefined) assessment.type = type;
      if (category !== undefined) assessment.category = category;
      if (description !== undefined) assessment.description = description;
      if (questions !== undefined) assessment.questions = questions;
      if (painScores !== undefined) assessment.painScores = painScores;
      if (isPublished !== undefined) {
        assessment.isPublished = isPublished;
        assessment.isSchedule = {
          type: isPublished ? '' : (req.body.isSchedule?.type || 'scheduled'),
          date: req.body.scheduleDate || assessment.isSchedule?.date || null
        };
      }
      
      // allow updating schedule explicitly
      if (req.body.isSchedule) {
        assessment.isSchedule = {
          type: req.body.isSchedule.type ?? assessment.isSchedule?.type ?? '',
          date: req.body.isSchedule.date ?? assessment.isSchedule?.date ?? null
        };
      }

      await assessment.save();

      res.status(200).json({
        success: true,
        message: "Assessment updated successfully",
        data: assessment
      });
    } catch (error) {
      console.error('Error updating assessment:', error);
      res.status(500).json({
        success: false,
        message: "Error updating assessment"
      });
    }
  },

  // Delete assessment
  deleteAssessment: async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(400).json({
          success: false,
          message: "Invalid assessment ID"
        });
        return;
      }

      const assessment = await Assessment.findByIdAndDelete(id);
      if (!assessment) {
        res.status(404).json({
          success: false,
          message: "Assessment not found"
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: "Assessment deleted successfully"
      });
    } catch (error) {
      console.error('Error deleting assessment:', error);
      res.status(500).json({
        success: false,
        message: "Error deleting assessment"
      });
    }
  },

  // Upload image for question
  uploadQuestionImage: async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.files || !(req.files as any).image) {
        res.status(400).json({
          success: false,
          message: "No image file provided"
        });
        return;
      }

      const file = (req.files as any).image;
      
      // Validate file type
      const allowedMimes = [
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp'
      ];
      
      if (!allowedMimes.includes(file.mimetype)) {
        res.status(400).json({
          success: false,
          message: "Invalid file type. Only images are allowed."
        });
        return;
      }

      const currentDate = Date.now();
      const fileName = `${currentDate}_${file.name}`;
      const relativePath = path.join('Uploads', 'Images', fileName); 
      //const filePath = path.join(process.cwd(), relativePath);
      const filePath = path.join('Uploads/Images', fileName);
      

      // Ensure directory exists
      const uploadDir = path.dirname(filePath);
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      // Move file to local storage temporarily
      await file.mv(filePath);

      // Upload to S3
      const imageUrl = await uploadToS3(filePath);

      

      res.status(200).json({
        success: true,
        message: "Image uploaded successfully",
        data: {
          imageUrl:filePath
        }
      });
    } catch (error) {
      console.error('Error uploading image:', error);
      res.status(500).json({
        success: false,
        message: "Error uploading image"
      });
    }
  },

  // Publish assessment
  publishAssessment: async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(400).json({
          success: false,
          message: "Invalid assessment ID"
        });
        return;
      }

      const assessment = await Assessment.findById(id);
      if (!assessment) {
        res.status(404).json({
          success: false,
          message: "Assessment not found"
        });
        return;
      }

      assessment.isPublished = true;
      assessment.isDraft = false;
      assessment.isSchedule = { type: 'none', date: null };
      await assessment.save();

      res.status(200).json({
        success: true,
        message: "Assessment published successfully",
        data: assessment
      });
    } catch (error) {
      console.error('Error publishing assessment:', error);
      res.status(500).json({
        success: false,
        message: "Error publishing assessment"
      });
    }
  },

  // Unpublish assessment
  unpublishAssessment: async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(400).json({
          success: false,
          message: "Invalid assessment ID"
        });
        return;
      }

      const assessment = await Assessment.findById(id);
      if (!assessment) {
        res.status(404).json({
          success: false,
          message: "Assessment not found"
        });
        return;
      }

      assessment.isPublished = false;
      assessment.isDraft = false;
      assessment.isSchedule = {
       type: req.body.isSchedule?.type || 'none',
       date: req.body.scheduleDate || assessment.isSchedule?.date || null
      };
      await assessment.save();

      res.status(200).json({
        success: true,
        message: "Assessment unpublished successfully",
        data: assessment
      });
    } catch (error) {
      console.error('Error unpublishing assessment:', error);
      res.status(500).json({
        success: false,
        message: "Error unpublishing assessment"
      });
    }
  }
};

export default assessmentController; 