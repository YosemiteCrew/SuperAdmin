import mongoose, { Document, Schema } from "mongoose";

// Define enum
export enum UserType {
  ADMIN = "admin",
  USER = "user",
}

export interface IAdminUser extends Document {
  email: string;
  password: string;
  userType: UserType;
  status?: number;
  twoFAEnabled?: boolean;
  twoFASecret?: string;
 
}

const AdminUserSchema = new Schema<IAdminUser>({
  email: { type: String, required: true },
  password: { type: String, required: true },
  userType: {
    type: String,
    enum: Object.values(UserType), // ["admin", "user"]
    required: true,
  },
  status: { type: Number, default: 0 },
  twoFAEnabled: { type: Boolean, default: false },
  twoFASecret: { type: String },
  
});

const AdminUser = mongoose.model<IAdminUser>("AdminUser", AdminUserSchema);

export default AdminUser;
