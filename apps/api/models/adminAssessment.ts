import mongoose, { Schema, Document } from 'mongoose';

export interface IAssessment extends Document {
  name: string;
  type: 'questionnaire' | 'polarquestion';
  category: 'dog' | 'cat' | 'horse';
  description: string;
  questions: Array<{
    question: string;
    description?: string;
    imageOptions?: Array<{
      image?: string | null;
      description?: string;
      score?: number;
    }>;
  }>;
  painScores: Array<{
    title: string;
    description?: string;
    colorCode: string;
    selectedNumbers: number[];
  }>;
  isPublished: boolean;
  isDraft: boolean;
  isSchedule: {
    type?: 'scheduled' | 'work-in-progress' | 'pending' | 'none';
    date?: Date | null;
  };
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  timesUsed: number;
}

const AssessmentSchema: Schema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    type: { type: String, required: true, enum: ['questionnaire', 'polarquestion'] },
    category: { type: String, required: true, enum: ['dog', 'cat', 'horse'] },
    description: { type: String, trim: true },

    questions: [
      {
        question: { type: String, required: true, trim: true },
        description: { type: String, trim: true },
        imageOptions: [
          {
            image: { type: String, default: null },
            description: { type: String, trim: true },
            score: { type: Number, default: 0 }
          }
        ]
      }
    ],
    painScores: [
      {
        title: { type: String, required: true, trim: true },
        description: { type: String, trim: true },
        colorCode: { type: String, default: '#FF0000' },
        selectedNumbers: [{ type: Number, min: 1, max: 10 }]
      }
    ],

    isPublished: { type: Boolean, default: false },
    isDraft: { type: Boolean, default: false },

    isSchedule: {
      type: {
        type: String,
        enum: ['scheduled', 'work-in-progress', 'pending', 'none'],
        default: 'none'
      },
      date: { type: Date, default: null }
    },

    createdBy: { type: String, required: true },
    timesUsed: { type: Number, default: 0 }
  },
  { timestamps: true }
);

export const Assessment = mongoose.model<IAssessment>('adminassessments', AssessmentSchema);
