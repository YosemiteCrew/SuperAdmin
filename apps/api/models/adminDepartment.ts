import mongoose, { Document, Schema, Types } from "mongoose";

export interface IService {
  _id: Types.ObjectId;
  serviceName: string;
  isActive: number;
}

export interface IAdminDepartment extends Document {
  name: string;
  status: number;
  services: IService[];
  createdAt?: Date;
  updatedAt?: Date;
}

const ServiceSchema = new Schema<IService>({
  _id: { type: Schema.Types.ObjectId, default: () => new mongoose.Types.ObjectId() },
  serviceName: { type: String, required: true },
  isActive: { type: Number, enum: [0, 1], default: 1 },
});

const AdminDepartmentSchema = new Schema<IAdminDepartment>(
  {
    name: { type: String, required: true },
    status: { type: Number, default: 1 },
    services: { type: [ServiceSchema], default: [] },
  },
  { timestamps: true }
);

const AdminDepartment = mongoose.model<IAdminDepartment>(
  "adminDepartments",
  AdminDepartmentSchema
);

//export default AdminDepartment;
export { AdminDepartment };
