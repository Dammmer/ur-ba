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

// Подключение к базе данных
mongoose.connect(process.env.MONGO_URI || '', {
    dbName: 'uyghur_connect',
}).then(async () => {
    console.log('MongoDB connected for seeding data');

    try {
        // Удаление существующих данных
        await User.deleteMany({});
        await Course.deleteMany({});
        await Lesson.deleteMany({});
        await Event.deleteMany({});
        await Post.deleteMany({});
        await Comment.deleteMany({});

        // Создание администратора (логин 111, пароль 123)
        const adminPasswordHash = await hashPassword('123');
        const admin = new User({
            username: '111',
            passwordHash: adminPasswordHash,
            firstName: 'Admin',
            lastName: 'User',
            phone: '111',
            country: 'Kazakhstan',
            language: 'ru',
            role: 'admin',
            active: true,
            email: 'admin@example.com',
            gender: 'male',
            createdAt: new Date(),
        });
        await admin.save();
        console.log('Admin user created');

        // Создание пользователей с разными ролями
        const roles = ['student', 'teacher', 'moderator'];
        const users = [];

        for (let i = 0; i < 5; i++) {
            const role = roles[i % roles.length];
            const user = new User({
                username: `user${i + 1}`,
                passwordHash: await hashPassword('password123'),
                firstName: `First${i + 1}`,
                lastName: `Last${i + 1}`,
                phone: `77777777${i + 1}1`,
                country: 'Kazakhstan',
                language: 'ru',
                role: role,
                active: true,
                email: `user${i + 1}@example.com`,
                gender: i % 2 === 0 ? 'male' : 'female',
                createdAt: new Date(),
            });
            await user.save();
            users.push(user);
            console.log(`${role} user${i + 1} created`);
        }

        // Создание курсов
        const courses = [];
        for (let i = 0; i < 3; i++) {
            const course = new Course({
                name: `Курс ${i + 1}`,
                image: `https://example.com/course${i + 1}.jpg`,
                level: ['beginner', 'intermediate', 'advanced'][i],
                duration: 30 + i * 10,
                content: `Описание курса ${i + 1} на уйгурском языке`,
                createdBy: admin._id,
            });
            await course.save();
            courses.push(course);
            console.log(`Course ${i + 1} created`);
        }

        // Создание уроков для каждого курса
        for (let i = 0; i < courses.length; i++) {
            for (let j = 0; j < 3; j++) {
                const lesson = new Lesson({
                    title: `Урок ${j + 1} курса ${i + 1}`,
                    description: `Описание урока ${j + 1} курса ${i + 1}`,
                    contentBlocks: [
                        {
                            type: 'text',
                            content: `Содержание урока ${j + 1} курса ${i + 1}`,
                            order: 1
                        },
                        {
                            type: 'image',
                            content: `https://example.com/image${j + 1}.jpg`,
                            order: 2,
                            caption: `Изображение для урока ${j + 1}`
                        }
                    ],
                    course: courses[i]._id,
                    order: j + 1
                });
                await lesson.save();
                console.log(`Lesson ${j + 1} for Course ${i + 1} created`);
            }
        }

        // Создание событий
        for (let i = 0; i < 4; i++) {
            const event = new Event({
                title: `Событие ${i + 1}`,
                description: `Описание события ${i + 1}`,
                date: new Date(Date.now() + (i + 1) * 24 * 60 * 60 * 1000), // На каждый день вперед
                location: `Место ${i + 1}`,
                image: `https://example.com/event${i + 1}.jpg`,
                createdBy: admin._id,
            });
            await event.save();
            console.log(`Event ${i + 1} created`);
        }

        // Создание постов
        const posts = [];
        for (let i = 0; i < 5; i++) {
            const post = new Post({
                title: `Пост ${i + 1}`,
                content: `Содержание поста ${i + 1} от пользователя`,
                category: ['question', 'discussion', 'news', 'history'][i % 4],
                author: users[i % users.length]._id,
            });
            await post.save();
            posts.push(post);
            console.log(`Post ${i + 1} created`);
        }

        // Создание комментариев под постами
        for (let i = 0; i < posts.length; i++) {
            for (let j = 0; j < 2; j++) {
                const comment = new Comment({
                    content: `Комментарий ${j + 1} к посту ${i + 1}`,
                    author: users[(i + j) % users.length]._id,
                    post: posts[i]._id,
                });
                await comment.save();
                console.log(`Comment ${j + 1} to Post ${i + 1} created`);
            }
        }

        console.log('Data seeding completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('Error during data seeding:', error);
        process.exit(1);
    }
}).catch((err) => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
});