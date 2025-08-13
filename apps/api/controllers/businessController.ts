import { Request, Response } from "express";
import { WebUser } from "../models/webUser";
import { AppUser } from "../models/appUser";
import mongoose from "mongoose";
import moment from "moment";
import AWS from 'aws-sdk';
import fs from 'fs';
import path from 'path';
import fileUpload from 'express-fileupload';
import { sendApprovalEmail, sendRejectionEmail } from '../services/emailService';

// Configure AWS
AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || 'us-east-1',
});

const s3 = new AWS.S3();
const S3_BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME;

// S3 Upload function with correct callback signature
async function uploadToS3(fileName: string, contentType: string = 'image/jpeg'): Promise<string> {
  return new Promise((resolve, reject) => {
    // Read content from the file
    const fileContent = fs.readFileSync(fileName);

    // Setting up S3 upload parameters
    const params = {
      Bucket: S3_BUCKET_NAME!,
      Key: fileName,
      Body: fileContent,
      ContentType: contentType,
      ContentDisposition: 'inline',
    };

    s3.upload(params, function (err: Error | null, data: AWS.S3.ManagedUpload.SendData | undefined) {
      if (err) {
        reject(err);
      } else if (data) {
        resolve(data.Location);
      } else {
        reject(new Error('Upload failed - no data returned'));
      }
    });
  });
}

const roleMap: Record<string, string[]> = {
  hospitals: ["veterinaryBusiness"],
  breeders: ["breedingFacility"],
  sitters: ["petSitter"],
  groomers: ["groomerShop"],
};

// ✅ Calculates change and status
const getChangeInfo = (current: number, previous: number): { ratiotext: string, status: "Done" | "Error" } => {
  if (previous === 0) {
    return {
      ratiotext: current === 0 ? "0%" : "100%",
      status: current >= 0 ? "Done" : "Error",
    };
  }

  const change = ((current - previous) / previous) * 100;
  return {
    //ratiotext: `${change >= 0 ? "↑" : "↓"}${Math.abs(Math.round(change))}%`,
    ratiotext: `${change >= 0 ? "" : ""}${Math.abs(Math.round(change))}%`,
    status: change >= 0 ? "Done" : "Error",
  };
};

const businessController = {
  allBusiness: async (req: Request, res: Response): Promise<void> => {
    try {
      const { businessType = "all", filter = "30" } = req.body || {};

      if (!["all", "hospitals", "breeders", "sitters", "groomers", "petparents"].includes(businessType)) {
        res.status(400).json({
          success: false,
          message: "Invalid business type provided.",
        });
      }

      const days = parseInt(filter);
      if (isNaN(days) || ![30, 60, 90].includes(days)) {
        res.status(400).json({
          success: false,
          message: "Invalid filter range. Use 30, 60, or 90.",
        });
      }

      const fromDate = moment().subtract(days, "days").toDate();
      const prevFromDate = moment(fromDate).subtract(days, "days").toDate();
      const prevToDate = fromDate;
      const todayStart = moment().startOf("day").toDate();

      console.log("Fetching data for businessType:", businessType, "fromDate:", fromDate, "prevFromDate:", prevFromDate, "prevToDate:", prevToDate);

      let totalUsers = 0;
      let currentNew = 0;
      let previousNew = 0;
      let dailyActive = 0;
      let dailyActivePrev = 0;

      if (businessType === "all") {
        const allowedRoles = Object.values(roleMap).flat();
        const [webTotal, appTotal] = await Promise.all([
          WebUser.countDocuments({ role: { $in: allowedRoles } }),
          AppUser.countDocuments(),
        ]);

        const [webCurrent, appCurrent] = await Promise.all([
          WebUser.countDocuments({ role: { $in: allowedRoles },createdAt: { $gte: fromDate } }),
          AppUser.countDocuments({ createdAt: { $gte: fromDate } }),
        ]);

        const [webPrevious, appPrevious] = await Promise.all([
          WebUser.countDocuments({ role: { $in: allowedRoles },createdAt: { $gte: prevFromDate, $lt: prevToDate } }),
          AppUser.countDocuments({ createdAt: { $gte: prevFromDate, $lt: prevToDate } }),
        ]);

        const [webActive, appActive] = await Promise.all([
          WebUser.countDocuments({ role: { $in: allowedRoles }, lastLogin: { $gte: todayStart } }),
          AppUser.countDocuments({ lastLogin: { $gte: todayStart } }),
        ]);

        const [webActivePrev, appActivePrev] = await Promise.all([
          WebUser.countDocuments({ role: { $in: allowedRoles }, lastLogin: { $gte: prevFromDate, $lt: prevToDate } }),
          AppUser.countDocuments({ lastLogin: { $gte: prevFromDate, $lt: prevToDate } }),
        ]);

        totalUsers = webTotal + appTotal;
        currentNew = webCurrent + appCurrent;
        previousNew = webPrevious + appPrevious;
        dailyActive = webActive + appActive;
        dailyActivePrev = webActivePrev + appActivePrev;
      } else if (businessType === "petparents") {
        totalUsers = await AppUser.countDocuments();
        currentNew = await AppUser.countDocuments({ createdAt: { $gte: fromDate } });
        previousNew = await AppUser.countDocuments({ createdAt: { $gte: prevFromDate, $lt: prevToDate } });
        dailyActive = await AppUser.countDocuments({ lastLogin: { $gte: todayStart } });
        dailyActivePrev = await AppUser.countDocuments({ lastLogin: { $gte: prevFromDate, $lt: prevToDate } });
      } else {
        const roles = roleMap[businessType] || [];
        const roleQuery = roles.length > 0 ? { role: { $in: roles } } : {};

        
        totalUsers = await WebUser.countDocuments(roleQuery);
        currentNew = await WebUser.countDocuments({ ...roleQuery, createdAt: { $gte: fromDate } });
        previousNew = await WebUser.countDocuments({
          ...roleQuery,
          createdAt: { $gte: prevFromDate, $lt: prevToDate },
        });
        dailyActive = await WebUser.countDocuments({ ...roleQuery, lastLogin: { $gte: todayStart } });
        dailyActivePrev = await WebUser.countDocuments({ ...roleQuery, lastLogin: { $gte: prevFromDate, $lt: prevToDate } });
      }

      console.log("Total Users:", totalUsers, "Current New:", currentNew, "Previous New:", previousNew);
      const newSignupInfo = getChangeInfo(currentNew, previousNew);
      const dailyActiveInfo = getChangeInfo(dailyActive, dailyActivePrev);

      res.status(200).json({
        success: true,
        data: [
          {
            label: "Total Users",
            value: totalUsers.toString(),
            status: newSignupInfo.status,
            ratiotext: newSignupInfo.ratiotext,
          },
          {
            label: "New Signups",
            value: currentNew.toString(),
            status: newSignupInfo.status,
            ratiotext: newSignupInfo.ratiotext,
          },
          {
            label: "Daily Active Users",
            value: dailyActive.toString(),
            status: dailyActiveInfo.status,
            ratiotext: dailyActiveInfo.ratiotext,
          },
          {
            label: "New Support Tickets",
            value: "40",
            status: "Done",
            ratiotext: "2%",
          },
          {
            label: "Profile Completion Rate",
            value: "40",
            status: "Done",
            ratiotext: "2%",
          },
          {
            label: "Pending Verifications",
            value: "40",
            status: "Done",
            ratiotext: "2%",
          },
          {
            label: "Inactive Practices",
            value: "40",
            status: "Done",
            ratiotext: "2%",
          },
          {
            label: "Monthly Recurring Revenue (MRR)",
            value: "40",
            status: "Done",
            ratiotext: "2%",
          },
        ],
      });
    } catch (err: any) {
      console.error("Dashboard fetch error:", err);
      res.status(500).json({
        success: false,
        message: "Dashboard fetch failed",
        error: err.message,
      });
    }
  },

  pendingVerifications: async (req: Request, res: Response): Promise<void> => {
    try {
      const { businessType = "all", countOnly = "no" } = req.body || {};
  
      const validBusinessTypes = ["all", "hospitals", "breeders", "sitters", "groomers", "petparents"];
  
      if (!validBusinessTypes.includes(businessType)) {
        res.status(400).json({
          success: false,
          message: "Invalid business type provided.",
        });
        return;
      }

      

      if(countOnly === "yes")
      {
        const allowedRolesByType = {
          hospitals: roleMap.hospitals,
          breeders: roleMap.breeders,
          groomers: roleMap.groomers,
          sitters: roleMap.sitters,
        };
  
        const countResults: Record<string, number> = {};
  
        for (const [type, roles] of Object.entries(allowedRolesByType)) {
          const count = await WebUser.countDocuments({
            role: { $in: roles },
            isVerified: 0,
          });
          countResults[type] = count;
        }
  
        res.status(200).json({
          success: true,
          counts: countResults,
        });
      }
      else
      {
        const allowedRoles =
        businessType === "all" ? Object.values(roleMap).flat() : roleMap[businessType] || [];

        const webUsers = await WebUser.aggregate([
          {
            $match: {
              role: { $in: allowedRoles },
              isVerified: 0,
            },
          },
          {
            $lookup: {
              from: "profiledatas",
              let: { userId: "$cognitoId" },
              pipeline: [
                {
                  $match: {
                    $expr: { $eq: ["$userId", "$$userId"] },
                  },
                },
                {
                  $project: {
                    _id: 1,
                    businessName: 1,
                    country: 1,
                    city: 1,
                    progress: 1,
                    createdAt: 1,
                  },
                },
              ],
              as: "profileData",
            },
          },
          {
            $unwind: {
              path: "$profileData",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $project: {
              _id: 1,
              role: 1,
              createdAt: 1,
              cognitoId: 1,
              profileData: 1,
            },
          },
        ]);
    
        res.status(200).json({
          success: true,
          data: webUsers,
        });
      }
    } catch (err: any) {
      console.error("Pending verifications fetch error:", err);
      res.status(500).json({
        success: false,
        message: "Pending verifications fetch failed",
        error: err.message,
      });
    }
  },
  getBusinessDetails: async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      
  
      const objectId = new mongoose.Types.ObjectId(id);
  
      const business = await WebUser.aggregate([
        {
          $match: { _id: objectId },
        },
        {
          $lookup: {
            from: "profiledatas",
            let: { userId: "$cognitoId" },
            pipeline: [
              {
                $match: {
                  $expr: { $eq: ["$userId", "$$userId"] },
                },
              },
              // Lookup department details
              {
                $lookup: {
                  from: "admindepartments",
                  let: { deptIds: "$addDepartment" },
                  pipeline: [
                    {
                      $match: {
                        $expr: { $in: ["$_id", { $map: { input: "$$deptIds", as: "id", in: { $toObjectId: "$$id" } } }] }
                      }
                    }
                  ],
                  as: "departmentData",
                },
              },
            ],
            as: "profileData",
          },
        },
        {
          $unwind: {
            path: "$profileData",
            preserveNullAndEmptyArrays: true,
          },
        },
      ]);
  
      if (!business || business.length === 0) {
        res.status(404).json({
          success: false,
          message: "Business not found",
        });
        return;
      }
  
      res.status(200).json({
        success: true,
        data: business[0],
      });
    } catch (error) {
      console.error("Error fetching business details:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  },
  
  
  approveBusiness: async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      
      // Convert string ID to ObjectId
      const objectId = new mongoose.Types.ObjectId(id);
  
      // Get business details before updating
      const business = await WebUser.aggregate([
        {
          $match: { _id: objectId },
        },
        {
          $lookup: {
            from: "profiledatas",
            let: { userId: "$cognitoId" },
            pipeline: [
              {
                $match: {
                  $expr: { $eq: ["$userId", "$$userId"] },
                },
              },
            ],
            as: "profileData",
          },
        },
        {
          $unwind: {
            path: "$profileData",
            preserveNullAndEmptyArrays: true,
          },
        },
      ]);

      if (!business || business.length === 0) {
        res.status(404).json({
          success: false,
          message: "Business not found",
        });
        return;
      }

      const businessData = business[0];

      // Update business status to approved
      const result = await WebUser.findByIdAndUpdate(
        objectId,
        { isVerified: 1 },
        { new: true }
      );

      if (!result) {
        res.status(404).json({
          success: false,
          message: "Business not found",
        });
        return;
      }

      // Send approval email
      try {
        await sendApprovalEmail({
          to: businessData?.email || '',
          businessName: businessData.profileData?.businessName || 'Business',
        });

        res.status(200).json({
          success: true,
          message: "Business approved and email sent successfully",
        });
      } catch (emailError) {
        console.error("Email sending failed:", emailError);
        res.status(200).json({
          success: true,
          message: "Business approved successfully, but email sending failed",
        });
      }

    } catch (error) {
      console.error("Error approving business:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  },
  
  rejectWithEmail: async (req: Request, res: Response): Promise<void> => {
    try {
      const { businessId, message, businessName, businessEmail } = req.body;
      
      // Access files from express-fileupload
      const files = (req as any).files;
      const uploadedFiles: any[] = [];

      // Convert string ID to ObjectId
      const objectId = new mongoose.Types.ObjectId(businessId);

      // Update business status to rejected
      const result = await WebUser.findByIdAndUpdate(
        objectId,
        { isVerified: -1 },
        { new: true }
      );

      if (!result) {
        res.status(404).json({
          success: false,
          message: "Business not found",
        });
        return;
      }

      // Handle file uploads to server then S3
      if (files && Object.keys(files).length > 0) {
        // Handle multiple files
        const fileArray = Array.isArray(files.files) ? files.files : [files.files];
        
        for (const file of fileArray) {
          try {
            const currentDate = Date.now();
            const originalName = file.name;
            const documentFileName = currentDate + "_" + originalName;
            const filePathEvent = `Uploads/Rejections/${documentFileName}`;
            
            // Ensure directory exists
            const dir = path.dirname(filePathEvent);
            if (!fs.existsSync(dir)) {
              fs.mkdirSync(dir, { recursive: true });
            }

            // Move file to server
            await file.mv(filePathEvent);

            // Upload to S3
            const contentType = file.mimetype || 'application/octet-stream';
            const imageUrl = await uploadToS3(filePathEvent, contentType);

            // Add file info for email attachment
            uploadedFiles.push({
              filename: originalName,
              size: file.size,
              mimetype: file.mimetype,
              url: imageUrl,
              path: filePathEvent, // Keep local path for email attachment
            });

            console.log(`File ${originalName} uploaded to S3 successfully: ${imageUrl}`);

          } catch (fileError) {
            console.error("Error uploading file:", fileError);
            // Continue with other files even if one fails
          }
        }
      }

      // Send rejection email with attachments
      try {
        console.log("Sending rejection email to:", businessEmail);
        console.log("Business:", businessName);
        console.log("Message:", message);
        console.log("Uploaded files:", uploadedFiles.length);

        await sendRejectionEmail({
          to: businessEmail,
          businessName,
          message,
          attachments: uploadedFiles,
        });

        // Clean up local files after email is sent
        uploadedFiles.forEach(file => {
          try {
            if (fs.existsSync(file.path)) {
              fs.unlinkSync(file.path);
            }
          } catch (cleanupError) {
            console.error("Error cleaning up file:", cleanupError);
          }
        });

        res.status(200).json({
          success: true,
          message: "Business rejected and email sent successfully",
          uploadedFiles: uploadedFiles.map(file => ({
            filename: file.filename,
            size: file.size,
            mimetype: file.mimetype,
            url: file.url
          }))
        });

      } catch (emailError) {
        console.error("Email sending failed:", emailError);
        
        // Clean up local files even if email fails
        uploadedFiles.forEach(file => {
          try {
            if (fs.existsSync(file.path)) {
              fs.unlinkSync(file.path);
            }
          } catch (cleanupError) {
            console.error("Error cleaning up file:", cleanupError);
          }
        });

        res.status(200).json({
          success: true,
          message: "Business rejected successfully, but email sending failed",
          uploadedFiles: uploadedFiles.map(file => ({
            filename: file.filename,
            size: file.size,
            mimetype: file.mimetype,
            url: file.url
          }))
        });
      }

    } catch (error) {
      console.error("Error rejecting business with email:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  },
  
};

export default businessController;
