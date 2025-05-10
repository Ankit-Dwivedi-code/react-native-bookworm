import express from 'express';
import User from '../models/User.js';
import jwt from 'jsonwebtoken';


const router = express.Router();

const generateToken = (userId) => {
    jwt.sign({ id: userId }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN, // Token expiration time
    }, (err, token) => {
        if (err) {
            console.error('Error generating token:', err.message);
            return null;
        }
        return token;
    });
}

router.post('/register', async(req, res) => {
    // Handle login logic here
    try {
        const { email, username, password } = req.body;

        if (!email || !username || !password) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        if(password.length < 6) {
            return res.status(400).json({ message: 'Password must be at least 6 characters long' });
        }

        if (username.length < 3) {
            return res.status(400).json({ message: 'Username must be at least 3 characters long' });
        }

        // Check if user already exists in the database
        const existingEmail = await User.findOne({ email });
        const existingUsername = await User.findOne({ username });
        if (existingEmail) {
            return res.status(400).json({ message: 'Email already exists' });
        }
        if (existingUsername) {
            return res.status(400).json({ message: 'Username already exists' });
        }

        const randomAvatar = `https://api.dicebear.com/9.x/personas/svg?seed=${username}`; // Generate a random avatar URL using the username

        // Create a new user
        const newUser = new User({
            email,
            username,
            password,
            profileImage: randomAvatar, // Default profile image URL
        });

        await newUser.save();

        const token = generateToken(newUser._id);
        if (!token) {
            return res.status(500).json({ message: 'Error generating token' });
        }

        res.status(201).json({
            token,
            user: {
                id: newUser._id,
                email: newUser.email,
                username: newUser.username,
                profileImage: newUser.profileImage,
            },
        });


    } catch (error) {
        console.error('Error during registration:', error.message);
        res.status(500).json({ message: 'Internal server error' });
        
    }
});

router.post('/login', async(req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        // Check if user exists in the database
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        // Compare password with hashed password
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        const token = generateToken(user._id);
        if (!token) {
            return res.status(500).json({ message: 'Error generating token' });
        }

        res.status(200).json({
            token,
            user: {
                id: user._id,
                email: user.email,
                username: user.username,
                profileImage: user.profileImage,
            },
        });
    }
    catch (error) {
        console.error('Error during login:', error.message);
        res.status(500).json({ message: 'Internal server error' });
    }
});

export default router;