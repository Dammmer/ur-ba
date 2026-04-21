import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { hashPassword } from './utils/hash';
import User from './models/Users';
import Course from './models/Course';
import Lesson from './models/Lesson';
import Event from './models/Event';
import Post from './models/Post';
import Comment from './models/Comment';

dotenv.config();

mongoose.connect(process.env.MONGO_URI || '', {
    dbName: 'uyghur_connect',
}).then(async () => {
    console.log('MongoDB connected for seeding data');

    try {
        await User.deleteMany({});
        await Course.deleteMany({});
        await Lesson.deleteMany({});
        await Event.deleteMany({});
        await Post.deleteMany({});
        await Comment.deleteMany({});

        // 1. Создание админа (user / password)
        const adminPasswordHash = await hashPassword('password');
        const admin = new User({
            username: 'user', // login = user
            passwordHash: adminPasswordHash,
            firstName: 'Super',
            lastName: 'Admin',
            phone: '0000000000',
            country: 'Kazakhstan',
            language: 'ru',
            role: 'admin',
            active: true,
            email: 'admin@example.com',
            gender: 'male',
            createdAt: new Date(),
        });
        await admin.save();
        console.log('Admin created: user / password');

        // 2. Создание учителей
        const teachers = [];
        for (let i = 1; i <= 3; i++) {
            const teacher = new User({
                username: `teacher${i}`,
                passwordHash: await hashPassword('password'),
                firstName: `Учитель`,
                lastName: `${i}`,
                phone: `111111111${i}`,
                country: 'Kazakhstan',
                language: 'ru',
                role: 'teacher',
                active: true,
                email: `teacher${i}@example.com`,
                gender: i % 2 === 0 ? 'male' : 'female',
                createdAt: new Date(),
            });
            await teacher.save();
            teachers.push(teacher);
            console.log(`Teacher created: teacher${i} / password`);
        }

        // 3. Создание пользователей с разной подпиской
        const users = [];
        const levels = ['none', 'beginner', 'intermediate', 'advanced', 'speaking'];
        for (let i = 0; i < 5; i++) {
            const userParams = {
                username: `student${i + 1}`,
                passwordHash: await hashPassword('password'),
                firstName: `Студент`,
                lastName: `${i + 1}`,
                phone: `222222222${i}`,
                country: 'Kazakhstan',
                language: 'ru',
                role: 'student',
                active: true,
                access: i > 1, // первые 2 без доступа (false), остальные с подпиской (true)
                level: levels[i],
                email: `student${i + 1}@example.com`,
                gender: i % 2 === 0 ? 'male' : 'female',
                createdAt: new Date(),
            };
            const user = new User(userParams);
            await user.save();
            users.push(user);
            console.log(`Student created: student${i + 1} / password (Access: ${userParams.access}, Level: ${userParams.level})`);
        }

        const allUsers = [admin, ...teachers, ...users];

        // 4. Создание курсов с разными уровнями
        const courses = [];
        for (let i = 0; i < 3; i++) {
            const courseLevel = ['beginner', 'intermediate', 'advanced'][i];
            const course = new Course({
                name: `Курс для уровня ${courseLevel}`,
                image: `https://example.com/course${i + 1}.jpg`,
                level: courseLevel,
                duration: 30 + i * 15,
                content: `Полный курс обучения для уровня ${courseLevel}`,
                createdBy: admin._id,
            });
            await course.save();
            courses.push(course);
            console.log(`Course created: ${courseLevel}`);
        }

        // Уроки
        for (let i = 0; i < courses.length; i++) {
            for (let j = 0; j < 3; j++) {
                const lesson = new Lesson({
                    title: `Урок ${j + 1} курса ${courses[i].name}`,
                    description: `Вводный материал по уроку ${j + 1}`,
                    contentBlocks: [
                        { type: 'text', content: `Приветствуем на уроке ${j + 1}! Разбираем важные темы.`, order: 1 },
                        { type: 'image', content: `https://example.com/image${j + 1}.jpg`, order: 2, caption: `Пример` }
                    ],
                    course: courses[i]._id,
                    order: j + 1
                });
                await lesson.save();
            }
        }

        // 5. Создание событий
        for (let i = 0; i < 3; i++) {
            const event = new Event({
                title: `Событие ${i + 1} - Разговорный клуб`,
                description: `Практика общения на уйгурском языке. Уровень свободный.`,
                date: new Date(Date.now() + (i + 1) * 24 * 60 * 60 * 1000),
                location: `Онлайн (Zoom)`,
                image: `https://example.com/event${i + 1}.jpg`,
                createdBy: admin._id,
            });
            await event.save();
        }

        // 6. Посты (Вопросы/Обсуждения)
        const posts = [];
        for (let i = 0; i < 4; i++) {
            const author = allUsers[Math.floor(Math.random() * allUsers.length)];
            const post = new Post({
                title: `Пост ${i + 1} - Как правильно произносить?`,
                content: `Вопрос к учителям и студентам. Как вы работаете над произношением?`,
                category: i % 2 === 0 ? 'question' : 'discussion',
                author: author._id,
            });
            await post.save();
            posts.push(post);
        }

        // 7. Комментарии
        for (let i = 0; i < posts.length; i++) {
            for (let j = 0; j < 3; j++) {
                const commentAuthor = allUsers[Math.floor(Math.random() * allUsers.length)];
                const comment = new Comment({
                    content: `Комментарий ${j + 1}: полностью согласен/согласна! Мой совет - больше практики.`,
                    author: commentAuthor._id,
                    post: posts[i]._id,
                });
                await comment.save();
            }
        }

        console.log('--- SEEDING COMPLETED SUCCESSFULLY ---');
        process.exit(0);
    } catch (error) {
        console.error('Error during data seeding:', error);
        process.exit(1);
    }
}).catch((err) => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
});