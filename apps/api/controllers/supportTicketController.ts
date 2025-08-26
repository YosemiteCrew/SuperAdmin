import { Request, Response } from "express";
import validator from "validator";
import SupportTicket, { 
  ISupportTicket, 
  TicketStatus, 
  TicketCategory, 
  TicketPlatform, 
  UserType, 
  UserStatus 
} from "../models/supportTicket";

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

const supportTicketController = {
  // Create new support ticket
  createTicket: async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        category,
        platform,
        fullName,
        emailAddress,
        userType,
        createdBy,
        userStatus,
        message
      } = req.body;

      const errors: { field: string; message: string }[] = [];

      // Validation
      if (!category || !Object.values(TicketCategory).includes(category)) {
        errors.push({ field: "category", message: "Valid category is required" });
      }

      if (!platform || !Object.values(TicketPlatform).includes(platform)) {
        errors.push({ field: "platform", message: "Valid platform is required" });
      }

      if (!fullName || fullName.trim().length < 2 || fullName.trim().length > 100) {
        errors.push({ field: "fullName", message: "Full name must be between 2 and 100 characters" });
      }

      if (!emailAddress || !validator.isEmail(emailAddress)) {
        errors.push({ field: "emailAddress", message: "Valid email address is required" });
      }

      if (!userType || !Object.values(UserType).includes(userType)) {
        errors.push({ field: "userType", message: "Valid user type is required" });
      }

      if (!userStatus || !Object.values(UserStatus).includes(userStatus)) {
        errors.push({ field: "userStatus", message: "Valid user status is required" });
      }

      if (!message || message.trim().length < 10 || message.trim().length > 2000) {
        errors.push({ field: "message", message: "Message must be between 10 and 2000 characters" });
      }

      if (!createdBy || !['Admin', 'User', 'Guest', 'Professional'].includes(createdBy)) {
        errors.push({ field: "createdBy", message: "Valid created by is required" });
      }

      if (errors.length > 0) {
        res.status(400).json({ success: false, errors });
        return;
      }

      // Handle file uploads
      const attachmentUrls: string[] = [];
    //   if (req.files && req.files.attachments) {
    //     const files = Array.isArray(req.files.attachments) 
    //       ? req.files.attachments 
    //       : [req.files.attachments];

    //     const uploadResults = await S3Service.uploadMultipleFiles(files);
        
    //     // Check for upload errors
    //     const failedUploads = uploadResults.filter(result => !result.success);
    //     if (failedUploads.length > 0) {
    //       res.status(400).json({
    //         success: false,
    //         message: "Some files failed to upload",
    //         errors: failedUploads.map(result => ({ field: "attachments", message: result.error }))
    //       });
    //       return;
    //     }

    //     attachmentUrls = uploadResults
    //       .filter(result => result.success)
    //       .map(result => result.url!);
    //   }

      // Create ticket
      const ticket = new SupportTicket({
        category,
        platform,
        fullName: fullName.trim(),
        emailAddress: emailAddress.toLowerCase().trim(),
        userType,
        createdBy,
        userStatus,
        message: message.trim(),
        attachments: attachmentUrls
      });

      await ticket.save();

      res.status(201).json({
        success: true,
        message: "Support ticket created successfully",
        data: {
          ticketId: ticket.ticketId,
          status: ticket.status,
          createdAt: ticket.createdAt
        }
      });

    } catch (error: any) {
      console.error("Create ticket error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to create support ticket",
        error: error.message
      });
    }
  },

  // Get all tickets with filters
  getTickets: async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        page = 1,
        limit = 10,
        status,
        category,
        userType,
        search,
        startDate,
        endDate
      } = req.query;

      const errors: { field: string; message: string }[] = [];

      // Validation
      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);

      if (isNaN(pageNum) || pageNum < 1) {
        errors.push({ field: "page", message: "Page must be a positive number" });
      }

      if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
        errors.push({ field: "limit", message: "Limit must be between 1 and 100" });
      }

      if (status && !Object.values(TicketStatus).includes(status as TicketStatus)) {
        errors.push({ field: "status", message: "Invalid status filter" });
      }

      if (category && !Object.values(TicketCategory).includes(category as TicketCategory)) {
        errors.push({ field: "category", message: "Invalid category filter" });
      }

      if (userType && !Object.values(UserType).includes(userType as UserType)) {
        errors.push({ field: "userType", message: "Invalid user type filter" });
      }

      if (errors.length > 0) {
        res.status(400).json({ success: false, errors });
        return;
      }

      // Build filter query
      const filter: any = {};

      if (status) filter.status = status;
      if (category) filter.category = category;
      if (userType) filter.userType = userType;

      if (startDate && endDate) {
        filter.createdAt = {
          $gte: new Date(startDate as string),
          $lte: new Date(endDate as string)
        };
      }

      if (search) {
        filter.$or = [
          { ticketId: { $regex: search, $options: 'i' } },
          { fullName: { $regex: search, $options: 'i' } },
          { emailAddress: { $regex: search, $options: 'i' } },
          { message: { $regex: search, $options: 'i' } }
        ];
      }

      // Execute query
      const skip = (pageNum - 1) * limitNum;
      
      const tickets = await SupportTicket.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .select('-__v');

      const total = await SupportTicket.countDocuments(filter);

      res.status(200).json({
        success: true,
        data: {
          tickets,
          pagination: {
            page: pageNum,
            limit: limitNum,
            total,
            pages: Math.ceil(total / limitNum)
          }
        }
      });

    } catch (error: any) {
      console.error("Get tickets error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch tickets",
        error: error.message
      });
    }
  },

  // Get ticket by ID
  // getTicketById: async (req: Request, res: Response): Promise<void> => {
  //   try {
  //     const { id } = req.params;

  //     if (!id) {
  //       res.status(400).json({
  //         success: false,
  //         message: "Ticket ID is required"
  //       });
  //       return;
  //     }

  //     const ticket = await SupportTicket.findOne({
  //       $or: [
  //         { _id: id },
  //         { ticketId: id }
  //       ]
  //     }).select('-__v');

  //     if (!ticket) {
  //       res.status(404).json({
  //         success: false,
  //         message: "Ticket not found"
  //       });
  //       return;
  //     }

  //     res.status(200).json({
  //       success: true,
  //       data: ticket
  //     });

  //   } catch (error: any) {
  //     console.error("Get ticket by ID error:", error);
  //     res.status(500).json({
  //       success: false,
  //       message: "Failed to fetch ticket",
  //       error: error.message
  //     });
  //   }
  // },

  // Update ticket status
  updateTicketStatus: async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { status, notes } = req.body;

      const errors: { field: string; message: string }[] = [];

      if (!id) {
        errors.push({ field: "id", message: "Ticket ID is required" });
      }

      if (!status || !Object.values(TicketStatus).includes(status)) {
        errors.push({ field: "status", message: "Valid status is required" });
      }

      if (errors.length > 0) {
        res.status(400).json({ success: false, errors });
        return;
      }

      const updateData: any = { status };

      if (status === TicketStatus.CLOSED) {
        updateData.resolvedAt = new Date();
      }

      if (notes && typeof notes === 'string' && notes.trim()) {
        const ticket = await SupportTicket.findById(id);
        if (ticket) {
          ticket.notes = ticket.notes || [];
          ticket.notes.push(notes.trim());
          updateData.notes = ticket.notes;
        }
      }

      const updatedTicket = await SupportTicket.findByIdAndUpdate(
        id,
        updateData,
        { new: true, runValidators: true }
      ).select('-__v');

      if (!updatedTicket) {
        res.status(404).json({
          success: false,
          message: "Ticket not found"
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: "Ticket status updated successfully",
        data: updatedTicket
      });

    } catch (error: any) {
      console.error("Update ticket status error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to update ticket status",
        error: error.message
      });
    }
  },

  // Get ticket statistics
  getTicketStats: async (req: Request, res: Response): Promise<void> => {
    try {
      const { period = '30' } = req.query;
      const days = parseInt(period as string);

      if (isNaN(days) || days < 1) {
        res.status(400).json({
          success: false,
          message: "Valid period is required"
        });
        return;
      }

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Get basic stats
      const totalTickets = await SupportTicket.countDocuments({
        createdAt: { $gte: startDate }
      });

      const openTickets = await SupportTicket.countDocuments({
        status: { $in: [TicketStatus.NEW, TicketStatus.IN_PROGRESS, TicketStatus.WAITING, TicketStatus.ESCALATED, TicketStatus.REOPENED] },
        createdAt: { $gte: startDate }
      });

      // Get status breakdown
      const statusBreakdown = await SupportTicket.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate }
          }
        },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ]);

      // Get category breakdown
      const categoryBreakdown = await SupportTicket.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate }
          }
        },
        {
          $group: {
            _id: '$category',
            count: { $sum: 1 }
          }
        }
      ]);

      // Calculate average resolution time
      const resolvedTickets = await SupportTicket.find({
        status: TicketStatus.CLOSED,
        resolvedAt: { $exists: true },
        createdAt: { $gte: startDate }
      });

      let avgResolutionTime = 0;
      if (resolvedTickets.length > 0) {
        const totalTime = resolvedTickets.reduce((sum, ticket) => {
          const resolutionTime = ticket.resolvedAt!.getTime() - ticket.createdAt.getTime();
          return sum + resolutionTime;
        }, 0);
        avgResolutionTime = totalTime / resolvedTickets.length / (1000 * 60 * 60 * 24); // Convert to days
      }

      res.status(200).json({
        success: true,
        data: {
          totalTickets,
          openTickets,
          closedTickets: totalTickets - openTickets,
          avgResolutionTime: Math.round(avgResolutionTime * 10) / 10, // Round to 1 decimal
          statusBreakdown,
          categoryBreakdown
        }
      });

    } catch (error: any) {
      console.error("Get ticket stats error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch ticket statistics",
        error: error.message
      });
    }
  },

  // Delete ticket
  deleteTicket: async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      if (!id) {
        res.status(400).json({
          success: false,
          message: "Ticket ID is required"
        });
        return;
      }

      const ticket = await SupportTicket.findById(id);
      if (!ticket) {
        res.status(404).json({
          success: false,
          message: "Ticket not found"
        });
        return;
      }

      // Delete attachments from S3
    //   if (ticket.attachments.length > 0) {
    //     for (const attachmentUrl of ticket.attachments) {
    //       await S3Service.deleteFile(attachmentUrl);
    //     }
    //   }

      await SupportTicket.findByIdAndDelete(id);

      res.status(200).json({
        success: true,
        message: "Ticket deleted successfully"
      });

    } catch (error: any) {
      console.error("Delete ticket error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to delete ticket",
        error: error.message
      });
    }
  },

  getDashboardStats: async (req: Request, res: Response): Promise<void> => {
    try {
      const { period = 30 } = req.query; // Default to 30 days
      const daysAgo = parseInt(period as string);
      const now = new Date();
      const periodStartDate = new Date(now.getTime() - (daysAgo * 24 * 60 * 60 * 1000));

      // New tickets (created in the selected period)
      const newTicketsCount = await SupportTicket.countDocuments({
        createdAt: { $gte: periodStartDate }
      });

      // Escalated tickets (in the selected period)
      const escalatedTicketsCount = await SupportTicket.countDocuments({
        status: TicketStatus.ESCALATED,
        createdAt: { $gte: periodStartDate }
      });

      // Reopened tickets (in the selected period)
      const reopenedTicketsCount = await SupportTicket.countDocuments({
        status: TicketStatus.REOPENED,
        createdAt: { $gte: periodStartDate }
      });

      // Total tickets (in the selected period)
      const totalTicketsCount = await SupportTicket.countDocuments({
        createdAt: { $gte: periodStartDate }
      });

      // Open tickets (not closed, in the selected period)
      const openTicketsCount = await SupportTicket.countDocuments({
        status: { $ne: TicketStatus.CLOSED },
        createdAt: { $gte: periodStartDate }
      });

      // Closed tickets (in the selected period)
      const closedTicketsCount = await SupportTicket.countDocuments({
        status: TicketStatus.CLOSED,
        createdAt: { $gte: periodStartDate }
      });

      // Calculate average resolution time (for closed tickets in the selected period)
      const closedTickets = await SupportTicket.find({
        status: TicketStatus.CLOSED,
        resolvedAt: { $exists: true },
        createdAt: { $gte: periodStartDate }
      }).select('createdAt resolvedAt');

      let totalResolutionTime = 0;
      let resolvedTicketsCount = 0;

      closedTickets.forEach(ticket => {
        if (ticket.resolvedAt) {
          const resolutionTime = ticket.resolvedAt.getTime() - ticket.createdAt.getTime();
          totalResolutionTime += resolutionTime;
          resolvedTicketsCount++;
        }
      });

      const avgResolutionTimeDays = resolvedTicketsCount > 0 
        ? (totalResolutionTime / (1000 * 60 * 60 * 24) / resolvedTicketsCount).toFixed(1)
        : '0';

      // Calculate average response time (in the selected period)
      const ticketsWithStatusChanges = await SupportTicket.find({
        status: { $ne: TicketStatus.NEW },
        createdAt: { $gte: periodStartDate }
      }).select('createdAt status updatedAt');

      let totalResponseTime = 0;
      let ticketsWithResponse = 0;

      ticketsWithStatusChanges.forEach(ticket => {
        const responseTime = ticket.updatedAt.getTime() - ticket.createdAt.getTime();
        
        if (responseTime > 0 && responseTime < (7 * 24 * 60 * 60 * 1000)) {
          totalResponseTime += responseTime;
          ticketsWithResponse++;
        }
      });

      const avgResponseTimeMinutes = ticketsWithResponse > 0 
        ? Math.round(totalResponseTime / (1000 * 60) / ticketsWithResponse)
        : 0;

      res.status(200).json({
        success: true,
        data: {
          newTickets: newTicketsCount,
          escalatedTickets: escalatedTicketsCount,
          reopenedTickets: reopenedTicketsCount,
          totalTickets: totalTicketsCount,
          openTickets: openTicketsCount,
          closedTickets: closedTicketsCount,
          avgResolutionTimeDays: parseFloat(avgResolutionTimeDays),
          avgResponseTimeMinutes: avgResponseTimeMinutes,
          period: daysAgo
        }
      });

    } catch (error: any) {
      console.error("Get dashboard stats error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch dashboard statistics",
        error: error.message
      });
    }
  },

 
  getTicketsByUserType: async (req: Request, res: Response): Promise<void> => {
    try {
      const { userType } = req.params; // 'professionals' or 'petparents'
      const {
        page = 1,
        limit = 10,
        status,
        category,
        search,
        startDate,
        endDate
      } = req.query;

      const errors: { field: string; message: string }[] = [];

      // Validation
      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);

      if (isNaN(pageNum) || pageNum < 1) {
        errors.push({ field: "page", message: "Page must be a positive number" });
      }

      if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
        errors.push({ field: "limit", message: "Limit must be between 1 and 100" });
      }

      if (errors.length > 0) {
        res.status(400).json({ success: false, errors });
        return;
      }

      // Build filter query based on user type
      const filter: any = {};

      if (userType === 'professionals') {
        // Professionals: createdBy = Admin | Guest | Professional
        filter.createdBy = { $in: ['Admin', 'Guest', 'Professional'] };
      } else if (userType === 'petparents') {
        // Pet Parents: createdBy = User
        filter.createdBy = 'User';
      } else {
        res.status(400).json({
          success: false,
          message: "Invalid user type. Must be 'professionals' or 'petparents'"
        });
        return;
      }

      if (status) filter.status = status;
      if (category) filter.category = category;

      if (startDate && endDate) {
        filter.createdAt = {
          $gte: new Date(startDate as string),
          $lte: new Date(endDate as string)
        };
      }

      if (search) {
        filter.$or = [
          { ticketId: { $regex: search, $options: 'i' } },
          { fullName: { $regex: search, $options: 'i' } },
          { emailAddress: { $regex: search, $options: 'i' } },
          { message: { $regex: search, $options: 'i' } }
        ];
      }

      // Execute query
      const skip = (pageNum - 1) * limitNum;
      
      const tickets = await SupportTicket.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .select('-__v');

      const total = await SupportTicket.countDocuments(filter);

      res.status(200).json({
        success: true,
        data: {
          tickets,
          pagination: {
            page: pageNum,
            limit: limitNum,
            total,
            pages: Math.ceil(total / limitNum)
          }
        }
      });

    } catch (error: any) {
      console.error("Get tickets by user type error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch tickets",
        error: error.message
      });
    }
  },
  getUnresolvedTickets: async (req: Request, res: Response): Promise<void> => {
    try {
      const { limit = 5, period = 30 } = req.query;
      const daysAgo = parseInt(period as string);
      const periodStartDate = new Date(Date.now() - (daysAgo * 24 * 60 * 60 * 1000));
      
      // Get tickets that are not closed, created in the selected period, sorted by creation date (oldest first)
      const unresolvedTickets = await SupportTicket.find({
        status: { $ne: TicketStatus.CLOSED },
        createdAt: { $gte: periodStartDate }
      })
      .sort({ createdAt: 1 }) // Oldest first
      .limit(parseInt(limit as string))
      .select('ticketId status createdAt')
      .lean();

      // Calculate days since creation for each ticket
      const now = new Date();
      const ticketsWithDays = unresolvedTickets.map(ticket => {
        const daysSinceCreation = Math.floor(
          (now.getTime() - new Date(ticket.createdAt).getTime()) / (1000 * 60 * 60 * 24)
        );
        
        return {
          id: ticket.ticketId,
          status: ticket.status,
          days: daysSinceCreation
        };
      });

      res.status(200).json({
        success: true,
        data: ticketsWithDays,
        period: daysAgo
      });

    } catch (error: any) {
      console.error("Get unresolved tickets error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch unresolved tickets",
        error: error.message
      });
    }
  },

  // Get ticket counts by user type
  getTicketCountsByUserType: async (req: Request, res: Response): Promise<void> => {
    try {
      const professionalsCount = await SupportTicket.countDocuments({
        createdBy: { $in: ['Admin', 'Guest', 'Professional'] }
      });

      const petParentsCount = await SupportTicket.countDocuments({
        createdBy: 'User'
      });

      res.status(200).json({
        success: true,
        data: {
          professionals: professionalsCount,
          petParents: petParentsCount
        }
      });

    } catch (error: any) {
      console.error("Get ticket counts error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch ticket counts",
        error: error.message
      });
    }
  }
};

export default supportTicketController;