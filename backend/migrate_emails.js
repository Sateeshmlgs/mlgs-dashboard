const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

async function migrateEmails() {
    try {
        console.log('Connecting to MongoDB Atlas...');
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected!');

        const db = mongoose.connection.db;
        const users = await db.collection('users').find({}).toArray();
        
        console.log(`Found ${users.length} users. Normalizing emails to lowercase...`);

        for (const user of users) {
            if (user.email !== user.email.toLowerCase()) {
                console.log(`Updating ${user.email} -> ${user.email.toLowerCase()}`);
                await db.collection('users').updateOne(
                    { _id: user._id },
                    { $set: { email: user.email.toLowerCase() } }
                );
            }
        }

        console.log('--- EMAIL NORMALIZATION COMPLETE ---');
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
}

migrateEmails();
