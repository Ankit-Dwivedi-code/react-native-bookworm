import express from 'express'
import cloudinary from '../lib/cloudinary.js' 
import protectRoute from '../middlewares/auth.middleware.js'
import Book from '../models/Book.js'

const router = express.Router()

router.post('/', protectRoute , async (req, res) => {
    try {
        const { title, caption, rating, image} = req.body

        if (!image || !title || !caption || !rating) {          
            return res.status(400).json({ message : "Please provide all fields" })
        }

        // upload image to cloudinary
        const result = await cloudinary.uploader.upload(image, {
            folder: 'books',
        })

        const imageUrl = result.secure_url
        const newBook = {
            title,
            caption,
            rating,
            image: imageUrl,
            user: req.user._id,
        }

        await newBook.save()
        return res.status(201).json({ message: "Book created successfully", book: newBook })


    } catch (error) {
        console.error(error)
        return res.status(500).json({ message: "Server error" })
        
    }
})  

// pagination infinite scroll
router.get('/', protectRoute, async (req, res) => {
    try {

        const { page } = req.query.page || 1
        const {limit} = req.query.limit || 5
        const skip = (page - 1) * limit

        const books = await Book.find()
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('user', 'username profileImage')

        const totalBooks = await Book.countDocuments()

        return res.status(200).json({
            message: "Books fetched successfully",
            books,
            currentPage: page,
            totalBooks,
            totalPages: Math.ceil(totalBooks / limit),
            
        })
    } catch (error) {
        console.error(error)
        return res.status(500).json({ message: "Server error" })
    }
})

//get recommended books by the logged in user
router.get('/user', protectRoute, async (req, res) => {
    try {
        const books = await Book.find({ user: req.user._id })
            .sort({ createdAt: -1 })
        return res.status(200).json({
            message: "Recommended books fetched successfully",
            books,
        })
    } catch (error) {
        console.error(error)
        return res.status(500).json({ message: "Server error" })
    }
})

router.delete('/:id', protectRoute, async (req, res) => {
    try {
        const { id } = req.params

        const book = await Book.findById(id)

        if (!book) {
            return res.status(404).json({ message: "Book not found" })
        }

        if (book.user.toString() !== req.user._id.toString()) {
            return res.status(401).json({ message: "Unauthorized" })
        }

        //delete image from cloudinary
        if (book.image && book.image.includes('cloudinary')) {
            try {
                const publicId = book.image.split('/').pop().split('.')[0]
                await cloudinary.uploader.destroy(`books/${publicId}`)
            }
            catch (error) {
                console.error("Error deleting image from Cloudinary:", error)
                return res.status(500).json({ message: "Error deleting image from Cloudinary" })
            }
        }

        await book.deleteOne()

        return res.status(200).json({ message: "Book deleted successfully" })
    } catch (error) {
        console.error(error)
        return res.status(500).json({ message: "Server error" })
    }
})

export default router