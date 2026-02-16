import mongoose, { Schema, Document } from 'mongoose';
import { ILesson } from './Lesson';

// Интерфейс курса - переименованы поля для исключения путаницы
// COURSE - ЭТО КУРС, А НЕ УРОК
export interface ICourse extends Document {
  name: string;
  image?: string;
  level: string;
  duration: number;
  content: string;
  createdBy: mongoose.Types.ObjectId;
  // Отказ от поля lessonId в модели Course для исключения путаницы
  parentModuleId?: mongoose.Types.ObjectId; // Необязательное поле
  lessons?: ILesson[]; // Виртуальное поле для получения связанных уроков
}

// Схема MongoDB - Исправлена, чтобы совпадала с интерфейсом
const CourseSchema: Schema = new Schema({
  name: { type: String, required: true },
  image: { type: String, required: false, default: 'https://example.com/default-course.jpg' },
  level: { type: String, required: true },
  duration: { type: Number, required: true },
  content: { type: String, required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  // Удалено поле lessonId из схемы, т.к. оно вызывало путаницу
  parentModuleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lesson', required: false }, // Не обязательное поле
});

// Виртуальное поле для получения уроков курса
CourseSchema.virtual('lessons', {
  ref: 'Lesson',
  localField: '_id',
  foreignField: 'course',
});

// Обеспечиваем, чтобы при конвертации документов в JSON уроки тоже были включены
CourseSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    delete ret.__v;
    return ret;
  },
});

CourseSchema.set('toObject', { virtuals: true });

export default mongoose.model<ICourse>('Course', CourseSchema, 'courses');
