import mongoose, { Document, Schema } from "mongoose";

// Define enums
export enum TicketStatus {
  NEW = "New Ticket",
  IN_PROGRESS = "In Progress",
  WAITING = "Waiting",
  ESCALATED = "Escalated",
  REOPENED = "Reopened",
  CLOSED = "Closed"
}

export enum TicketCategory {
  GENERAL = "General",
  TECHNICAL = "Technical",
  BILLING = "Billing",
  DSAR = "DSAR",
  FEATURE_REQUEST = "Feature Request"
}

export enum TicketPlatform {
  EMAIL = "Email",
  DISCORD = "Discord",
  PHONE = "Phone",
  WEB_FORM = "Web Form"
}

export enum UserType {
  REGISTERED = "Registered",
  NOT_REGISTERED = "Not Registered",
  GUEST = "Guest"
}

export enum UserStatus {
  ACTIVE = "Active",
  INACTIVE = "Inactive",
  PENDING = "Pending",
  SUSPENDED = "Suspended"
}

export interface ISupportTicket extends Document {
  ticketId: string;
  category: TicketCategory;
  platform: TicketPlatform;
  fullName: string;
  emailAddress: string;
  userType: UserType;
  userStatus: UserStatus;
  message: string;
  attachments: string[]; // S3 URLs
  status: TicketStatus;
  assignedTo?: string;
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  createdBy: 'Admin' | 'User' | 'Guest' | 'Professional';
  createdAt: Date;
  updatedAt: Date;
  resolvedAt?: Date;
  notes?: string[];
}

    // Counter schema for auto-increment ticketId
    interface ICounter extends Document {
        _id: string;
        seq: number;
    }
  
    const CounterSchema = new Schema<ICounter>({
        _id: { type: String, required: true },
        seq: { type: Number, default: 0 }
    });
    
    const Counter = mongoose.model<ICounter>("Counter", CounterSchema);

const SupportTicketSchema = new Schema<ISupportTicket>({
  ticketId: {
    type: String,
    unique: true,
  },
  category: {
    type: String,
    enum: Object.values(TicketCategory),
    required: true
  },
  platform: {
    type: String,
    enum: Object.values(TicketPlatform),
    required: true
  },
  fullName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  emailAddress: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  userType: {
    type: String,
    enum: Object.values(UserType),
    required: true
  },
  userStatus: {
    type: String,
    enum: Object.values(UserStatus),
    required: true
  },
  message: {
    type: String,
    required: true,
    trim: true,
    maxlength: 2000
  },
  attachments: [{
    type: String,
    trim: true
  }],
  status: {
    type: String,
    enum: Object.values(TicketStatus),
    default: TicketStatus.NEW
  },
  assignedTo: {
    type: String,
    trim: true
  },
  priority: {
    type: String,
    enum: ['Low', 'Medium', 'High', 'Critical'],
    default: 'Medium'
  },
  createdBy: {
    type: String,
    enum: ['Admin', 'User', 'Guest','Professional'],
    default: 'User'
  },
  notes: [{
    type: String,
    trim: true
  }],
  resolvedAt: {
    type: Date
  }
}, {
  timestamps: true
});

// 🔑 Pre-save hook to generate sequential ticketId
SupportTicketSchema.pre<ISupportTicket>("save", async function (next) {
    if (this.isNew) {
      const counter = await Counter.findByIdAndUpdate(
        { _id: "ticketId" },
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
      );
  
      this.ticketId = `T${counter.seq}`;
    }
    next();
  });

// Index for better query performance
SupportTicketSchema.index({ ticketId: 1 });
SupportTicketSchema.index({ emailAddress: 1 });
SupportTicketSchema.index({ status: 1 });
SupportTicketSchema.index({ category: 1 });
SupportTicketSchema.index({ createdAt: -1 });

const SupportTicket = mongoose.model<ISupportTicket>("SupportTicket", SupportTicketSchema);

export default SupportTicket;