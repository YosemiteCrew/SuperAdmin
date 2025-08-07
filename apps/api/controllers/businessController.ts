import { Request, Response } from "express";
import { WebUser } from "../models/webUser";
import { AppUser } from "../models/appUser";
import moment from "moment";

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
  }
  
};

export default businessController;
