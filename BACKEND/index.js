const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const fs = require('fs'); // To handle file system operations
const path = require('path');
const bodyParser = require('body-parser');
const cors = require('cors');

// Initialize the app
const app = express();
// const port = 3000;
const port = process.env.PORT || 3000;


// Middleware
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors());
app.use(express.static(path.join(__dirname, 'FRONTEND'))); // Serve static files
app.use('/uploads', express.static('uploads')); // Serve uploaded files
// Serve static files from the FRONTEND directory
app.use(express.static(path.join(__dirname, '..', 'FRONTEND'))); // Navigate up one level to BACKEND, then into FRONTEND

// Serve index.html on the root path
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'FRONTEND', 'index.html')); // Same navigation as above
});


// MongoDB connection
mongoose.connect('mongodb://localhost:27017/combinedDB')
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Define comment schema
const commentSchema = new mongoose.Schema({
  user: String,
  comment: String,
});
const Comment = mongoose.model('Comment', commentSchema);

// Define image schema
const imageSchema = new mongoose.Schema({
  url: { type: String, required: true },
  statement: { type: String, required: true }
});
const Image = mongoose.model('Image', imageSchema);

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

// Upload image with statement
app.post('/upload', upload.single('image'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded' });
  }

  const image = new Image({
    url: req.file.path,
    statement: req.body.statement
  });

  try {
    await image.save();
    res.status(200).json({ message: 'Image uploaded successfully', file: req.file });
  } catch (error) {
    res.status(500).json({ message: 'Error saving image to database', error });
  }
});
// Fetch images
app.get('/images', async (req, res) => {
  try {
    const images = await Image.find();
    res.status(200).json(images);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching images', error });
  }
});
app.get('/', (req, res) => {
  res.send('Hello from Vercel!');
});

// Set up your other middleware and routes
// Example route
app.get('/api/data', (req, res) => {
  res.json({ message: 'Hello from the backend!' });
});


// Delete image
app.delete('/images/:id', async (req, res) => {
  const { id } = req.params;

  try {
    // Find the image by ID
    const image = await Image.findById(id);
    if (!image) {
      return res.status(404).json({ message: 'Image not found' });
    }

    // Check if the file exists
    fs.access(image.url, fs.constants.F_OK, (err) => {
      if (err) {
        return res.status(404).json({ message: 'File not found' });
      }

      // Delete the image file from the uploads folder
      fs.unlink(path.resolve(image.url), async (err) => {
        if (err) {
          return res.status(500).json({ message: 'Error deleting file', error: err });
        }

        // After the file is deleted, remove the entry from MongoDB using deleteOne()
        await Image.deleteOne({ _id: id });
        res.status(200).json({ message: 'Image deleted successfully' });
      });
    });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting image', error });
  }
});
// Delete a comment
app.delete('/comments/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const comment = await Comment.findById(id);
    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    await Comment.deleteOne({ _id: id });
    res.status(200).json({ message: 'Comment deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting comment', error });
  }
});


// Serve the display page
app.get('/display', (req, res) => {
  res.sendFile(path.join(__dirname, 'display.html'));
});

// Serve the upload page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});


// Routes for comments
// Get comments
app.get('/comments', async (req, res) => {
  try {
    const comments = await Comment.find();
    res.status(200).json(comments);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching comments', error });
  }
});

// Post a new comment
app.post('/comments', async (req, res) => {
  const { user, comment } = req.body;
  const newComment = new Comment({ user, comment });
  try {
    await newComment.save();
    res.status(201).json({ message: 'Comment added successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error saving comment', error });
  }
});

// Routes for images
// Upload image with statement
// app.post('/upload', upload.single('image'), async (req, res) => {
//   if (!req.file) {
//     return res.status(400).json({ message: 'No file uploaded' });
//   }

//   const image = new Image({
//     url: req.file.path,
//     statement: req.body.statement
//   });

//   try {
//     await image.save();
//     res.status(200).json({ message: 'Image uploaded successfully', file: req.file });
//   } catch (error) {
//     res.status(500).json({ message: 'Error saving image to database', error });
//   }
// });

// // Fetch images
// app.get('/images', async (req, res) => {
//   try {
//     const images = await Image.find();
//     res.status(200).json(images);
//   } catch (error) {
//     res.status(500).json({ message: 'Error fetching images', error });
//   }
// });

// Serve the display page
app.get('/display', (req, res) => {
  res.sendFile(path.join(__dirname, 'display.html'));
});

// Serve the upload page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
