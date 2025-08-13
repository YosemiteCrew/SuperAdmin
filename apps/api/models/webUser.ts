import mongoose, { Document, Schema, model } from "mongoose";

/**
 * WebUser Interface & Schema
 */
export interface IProfileData extends Document {
  userId?: string;
  businessName?: string;
  registrationNumber?: string;
  yearOfEstablishment?: string;
  phoneNumber?: string;
  website?: string;
 
    addressLine1?: string;
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    area?: string;
    latitude?: string;
    longitude?: string;
    country?: string;
 
  departmentFeatureActive?: string;
  selectedServices?: string[];
  image?: string;
  addDepartment:string[];
  prescription_upload?: { name: string; url: string; }[];
}
export interface IWebUser {
  cognitoId?: string;
  role?: string;
  bussinessId?: string;
  otp?: number;
  isVerified?: number;
  otpExpiry?: Date;
  subscribe?:boolean;
  department?:string
}


const WebUserSchema = new Schema<IWebUser>({
  cognitoId: { type: String, required: true },
  role: { type: String, required: true },
  bussinessId: { type: String },
  otp: { type: Number },
  isVerified: { type: Number },
  otpExpiry: { type: Date },
  subscribe:{type:Boolean},
  department:{type:String}
});

const WebUser = model<IWebUser>('WebUser', WebUserSchema);

/**
 * ProfileData Interface & Schema
 */

const ProfileDataSchema = new Schema<IProfileData>({
  userId: { type: String },
  businessName: { type: String, required: true },
  registrationNumber: { type: String, required: true },
  // yearOfEstablishment: { type: String, required: true },
  phoneNumber: { type: String, required: true },
  website: { type: String, required: true },
    addressLine1: { type: String, required: true },
    street: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    postalCode: { type: String, required: true },
    latitude: { type: String, required: true },
    longitude: { type: String, required: true },
    area: { type: String, required: true },
    country: { type: String, required: true },

  departmentFeatureActive: { type: String },
  selectedServices: { type: [String], required: true },
  image: { type: String },
  addDepartment:{type:[String], required:true},
  prescription_upload: { type: [{ name: String, url: String }] }
});

const ProfileData = model<IProfileData>('ProfileData', ProfileDataSchema);

export { WebUser, ProfileData };